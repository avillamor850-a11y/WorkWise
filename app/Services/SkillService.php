<?php

namespace App\Services;

use App\Models\GigJob;
use App\Models\Skill;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SkillService
{
    private const PROMOTION_THRESHOLD = 5;
    private const FUZZY_THRESHOLD = 80; // percent via similar_text
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Return verified (global) skills, optionally filtered by search query.
     */
    public function getVerifiedSkills(?string $query = null, int $limit = 200): array
    {
        $skills = Cache::remember('verified_skills_list', self::CACHE_TTL, function () {
            return Skill::verified()->orderBy('name')->pluck('name')->toArray();
        });

        if ($query) {
            $q = strtolower(trim($query));
            $skills = array_values(array_filter($skills, fn ($s) => str_contains(strtolower($s), $q)));
        }

        return array_slice($skills, 0, $limit);
    }

    /**
     * Return top 10-15 skills for a specific taxonomy category.
     */
    public function getSkillsForCategory(string $category, int $limit = 15): array
    {
        $cacheKey = 'category_skills_' . md5($category);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($category, $limit) {
            $taxonomy = $this->loadTaxonomy();
            $skills = [];

            foreach ($taxonomy['services'] ?? [] as $service) {
                foreach ($service['categories'] ?? [] as $cat) {
                    if (strcasecmp($cat['name'] ?? '', $category) === 0) {
                        $skills = array_merge($skills, $cat['skills'] ?? []);
                    }
                }
            }

            // Merge with promoted skills that might not be in taxonomy
            $promoted = Skill::where('source', 'user')
                ->whereNotNull('promoted_at')
                ->orderBy('name')
                ->pluck('name')
                ->toArray();

            $combined = array_unique(array_merge($skills, $promoted));
            sort($combined);

            return array_slice($combined, 0, $limit);
        });
    }

    /**
     * Return taxonomy categories (for the category dropdown).
     */
    public function getCategories(): array
    {
        return Cache::remember('taxonomy_categories', 3600, function () {
            $taxonomy = $this->loadTaxonomy();
            $categories = [];
            foreach ($taxonomy['services'] ?? [] as $service) {
                foreach ($service['categories'] ?? [] as $cat) {
                    $categories[] = $cat['name'] ?? '';
                }
            }
            return array_values(array_filter(array_unique($categories)));
        });
    }

    /**
     * Fuzzy-match input against all known skill names.
     * Returns ['match' => 'Python', 'confidence' => 92] or ['match' => null].
     */
    public function fuzzyMatch(string $input): array
    {
        $input = trim($input);
        if ($input === '') {
            return ['match' => null, 'confidence' => 0];
        }

        $allSkills = $this->getAllSkillNames();
        $inputLower = strtolower($input);

        // Exact match (case-insensitive) → no fuzzy needed
        foreach ($allSkills as $name) {
            if (strtolower($name) === $inputLower) {
                return ['match' => $name, 'confidence' => 100];
            }
        }

        $bestMatch = null;
        $bestScore = 0;

        foreach ($allSkills as $name) {
            similar_text($inputLower, strtolower($name), $percent);
            if ($percent > $bestScore) {
                $bestScore = $percent;
                $bestMatch = $name;
            }
        }

        if ($bestScore >= self::FUZZY_THRESHOLD) {
            return ['match' => $bestMatch, 'confidence' => round($bestScore)];
        }

        return ['match' => null, 'confidence' => round($bestScore)];
    }

    /**
     * Ensure a skill row exists in the DB.
     * Returns the Skill model (created or existing).
     */
    public function ensureSkill(string $name): Skill
    {
        $name = trim($name);

        // Case-insensitive lookup
        $existing = Skill::whereRaw('LOWER(TRIM(name)) = ?', [strtolower($name)])->first();
        if ($existing) {
            return $existing;
        }

        $skill = Skill::create([
            'name'   => $name,
            'source' => 'user',
        ]);

        Cache::forget('verified_skills_list');

        return $skill;
    }

    /**
     * Check whether a user-added skill should be promoted to global.
     * Promotes when distinct-user count >= PROMOTION_THRESHOLD.
     */
    public function checkPromotion(Skill $skill): bool
    {
        if ($skill->source === 'taxonomy' && $skill->promoted_at === null) {
            return false; // already global from taxonomy, not user-added → nothing to promote
        }
        if ($skill->promoted_at !== null) {
            return true; // already promoted
        }
        if ($skill->source !== 'user') {
            return false;
        }

        $count = $this->countDistinctUsers($skill);

        if ($count >= self::PROMOTION_THRESHOLD) {
            $skill->update([
                'source'      => 'taxonomy',
                'promoted_at' => now(),
            ]);
            Cache::forget('verified_skills_list');
            Log::info('Skill promoted to global', ['skill_id' => $skill->id, 'name' => $skill->name, 'users' => $count]);
            return true;
        }

        return false;
    }

    /**
     * Count distinct users who have this skill attached (gig workers via skill_user + employers via job skills_requirements).
     */
    public function countDistinctUsers(Skill $skill): int
    {
        // A: distinct gig-worker user_ids via skill_user pivot
        $gigWorkerIds = DB::table('skill_user')
            ->where('skill_id', $skill->id)
            ->distinct()
            ->pluck('user_id')
            ->toArray();

        // B: distinct employer_ids from gig_jobs whose skills_requirements JSON contains this skill name
        $skillName = $skill->name;
        $employerIds = GigJob::whereNotNull('skills_requirements')
            ->get(['employer_id', 'skills_requirements'])
            ->filter(function ($job) use ($skillName) {
                $reqs = $job->skills_requirements;
                if (!is_array($reqs)) {
                    return false;
                }
                foreach ($reqs as $req) {
                    if (is_array($req) && strcasecmp(trim($req['skill'] ?? ''), $skillName) === 0) {
                        return true;
                    }
                }
                return false;
            })
            ->pluck('employer_id')
            ->unique()
            ->toArray();

        // Union of both sets
        $all = array_unique(array_merge($gigWorkerIds, $employerIds));

        return count($all);
    }

    /**
     * Validate a skill name using Groq AI (llama-3.1-8b-instant).
     * Returns ['valid' => bool, 'message' => string].
     */
    public function validateWithAI(string $skill): array
    {
        $skill = trim($skill);
        if ($skill === '') {
            return ['valid' => false, 'message' => 'Skill name cannot be empty.'];
        }

        // Skip AI for very short strings
        if (strlen($skill) < 2) {
            return ['valid' => false, 'message' => 'Please enter a valid professional skill to maintain profile quality.'];
        }

        // If skill already exists in DB as verified, skip AI call
        $existing = Skill::whereRaw('LOWER(TRIM(name)) = ?', [strtolower($skill)])->first();
        if ($existing && $existing->isVerified()) {
            return ['valid' => true, 'message' => 'Known verified skill.'];
        }

        $apiKey = env('GROQ_API_KEY');
        if (empty($apiKey)) {
            // Fallback: accept any reasonably-formatted string
            Log::warning('GROQ_API_KEY not set; skipping AI skill validation.');
            return ['valid' => true, 'message' => 'AI validation unavailable; accepted.'];
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])->timeout(10)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'    => 'llama-3.1-8b-instant',
                'messages' => [
                    [
                        'role'    => 'system',
                        'content' => 'You decide if a given string is a real professional or work-related skill. Answer ONLY "yes" or "no". Nothing else.',
                    ],
                    [
                        'role'    => 'user',
                        'content' => "Is this a real professional skill? \"{$skill}\"",
                    ],
                ],
                'max_tokens'  => 5,
                'temperature' => 0,
            ]);

            if ($response->successful()) {
                $answer = strtolower(trim($response->json('choices.0.message.content') ?? ''));
                $valid = str_starts_with($answer, 'yes');

                return [
                    'valid'   => $valid,
                    'message' => $valid
                        ? 'Validated as a professional skill.'
                        : 'Please enter a valid professional skill to maintain profile quality.',
                ];
            }

            Log::warning('Groq skill validation non-200', ['status' => $response->status()]);
        } catch (\Exception $e) {
            Log::error('Groq skill validation failed', ['error' => $e->getMessage()]);
        }

        // Fallback: accept to avoid blocking onboarding
        return ['valid' => true, 'message' => 'AI validation unavailable; accepted.'];
    }

    /**
     * Validate a free-text hiring need / service description for employers (Groq).
     * Returns ['valid' => bool, 'message' => string].
     */
    public function validateHiringNeedWithAI(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return ['valid' => false, 'message' => 'Description cannot be empty.'];
        }

        if (strlen($text) < 2) {
            return ['valid' => false, 'message' => 'Please describe a real professional or freelance service you hire for.'];
        }

        if (strlen($text) > 255) {
            return ['valid' => false, 'message' => 'Description must be 255 characters or less.'];
        }

        $apiKey = env('GROQ_API_KEY');
        if (empty($apiKey)) {
            Log::warning('GROQ_API_KEY not set; skipping AI hiring-need validation.');

            return ['valid' => true, 'message' => 'AI validation unavailable; accepted.'];
        }

        $safe = str_replace(["\r", "\n"], ' ', $text);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])->timeout(10)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'    => 'llama-3.1-8b-instant',
                'messages' => [
                    [
                        'role'    => 'system',
                        'content' => 'You decide if a string describes a plausible professional or freelance service or type of work an employer would hire someone for on a gig platform (not spam, jokes, or unrelated text). Answer ONLY "yes" or "no". Nothing else.',
                    ],
                    [
                        'role'    => 'user',
                        'content' => "Is this a plausible service or hiring need for a freelance platform? \"{$safe}\"",
                    ],
                ],
                'max_tokens'  => 5,
                'temperature' => 0,
            ]);

            if ($response->successful()) {
                $answer = strtolower(trim($response->json('choices.0.message.content') ?? ''));
                $valid = str_starts_with($answer, 'yes');

                return [
                    'valid'   => $valid,
                    'message' => $valid
                        ? 'Validated as a hiring need.'
                        : 'Please describe a real professional or freelance service you hire for.',
                ];
            }

            Log::warning('Groq hiring-need validation non-200', ['status' => $response->status()]);
        } catch (\Exception $e) {
            Log::error('Groq hiring-need validation failed', ['error' => $e->getMessage()]);
        }

        return ['valid' => true, 'message' => 'AI validation unavailable; accepted.'];
    }

    /**
     * Map a free-text "Other" project category to the taxonomy, using exact/fuzzy match, Groq, then heuristics.
     *
     * @return array{valid: bool, canonical_category: ?string, suggestions: list<string>, message: string}
     */
    public function validateProjectCategoryForJob(string $customLabel, ?string $title = null, ?string $description = null): array
    {
        $label = trim($customLabel);
        if ($label === '') {
            return [
                'valid' => false,
                'canonical_category' => null,
                'suggestions' => [],
                'message' => 'Please describe your project category.',
            ];
        }

        if (strlen($label) > 255) {
            return [
                'valid' => false,
                'canonical_category' => null,
                'suggestions' => [],
                'message' => 'Category description must be 255 characters or less.',
            ];
        }

        $allowed = $this->getCategories();
        if ($allowed === []) {
            return [
                'valid' => true,
                'canonical_category' => $label,
                'suggestions' => [],
                'message' => 'Taxonomy unavailable; using your text as-is.',
            ];
        }

        $lowerToCanonical = [];
        foreach ($allowed as $name) {
            $lowerToCanonical[strtolower(trim($name))] = $name;
        }

        $labelKey = strtolower($label);
        if (isset($lowerToCanonical[$labelKey])) {
            return [
                'valid' => true,
                'canonical_category' => $lowerToCanonical[$labelKey],
                'suggestions' => [],
                'message' => 'Matched an existing category.',
            ];
        }

        $bestCat = null;
        $bestPct = 0;
        foreach ($allowed as $name) {
            similar_text(strtolower($label), strtolower($name), $pct);
            if ($pct > $bestPct) {
                $bestPct = $pct;
                $bestCat = $name;
            }
        }
        if ($bestCat !== null && $bestPct >= 88) {
            return [
                'valid' => true,
                'canonical_category' => $bestCat,
                'suggestions' => [],
                'message' => 'Close match to an existing category.',
            ];
        }

        $jobTitleDescriptionLine = trim(($title ?? '') . ' ' . ($description ?? ''));
        $fromJobTitleDescription = [];
        if ($jobTitleDescriptionLine !== '') {
            $fromJobTitleDescription = array_values(array_filter(
                app(\App\Services\AIJobMatchingService::class)->suggestCategoryNamesFromText($jobTitleDescriptionLine, 6),
                fn ($c) => in_array($c, $allowed, true)
            ));
        }

        $context = trim($label . ' ' . ($title ?? '') . ' ' . ($description ?? ''));
        $heuristicSuggestions = app(\App\Services\AIJobMatchingService::class)->suggestCategoryNamesFromText($context, 5);
        $heuristicSuggestions = array_values(array_filter($heuristicSuggestions, fn ($c) => in_array($c, $allowed, true)));

        $mergeSuggestionLists = static function (array ...$lists) use ($allowed): array {
            $out = [];
            foreach ($lists as $list) {
                foreach ($list as $c) {
                    if (in_array($c, $allowed, true) && ! in_array($c, $out, true)) {
                        $out[] = $c;
                    }
                }
            }

            return array_slice($out, 0, 3);
        };

        $apiKey = env('GROQ_API_KEY');
        if (empty($apiKey)) {
            if ($bestCat !== null && $bestPct >= 72) {
                return [
                    'valid' => true,
                    'canonical_category' => $bestCat,
                    'suggestions' => [],
                    'message' => 'AI unavailable; accepted as closest taxonomy match.',
                ];
            }

            return [
                'valid' => false,
                'canonical_category' => null,
                'suggestions' => $mergeSuggestionLists($fromJobTitleDescription, $heuristicSuggestions),
                'message' => 'Pick a suggested category or refine your description.',
            ];
        }

        $categoriesJson = json_encode($allowed, JSON_UNESCAPED_UNICODE);
        $safeLabel = str_replace(["\r", "\n"], ' ', $label);
        $safeTitle = str_replace(["\r", "\n"], ' ', (string) ($title ?? ''));
        $safeDesc = str_replace(["\r", "\n"], ' ', mb_substr((string) ($description ?? ''), 0, 2000));

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => 'llama-3.1-8b-instant',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You map a user-written project category to a freelance marketplace taxonomy. '
                            . 'Reply with ONE JSON object only, no markdown. Keys: '
                            . '"valid" (boolean): true if the user text clearly describes work that fits one taxonomy name; '
                            . '"match" (string|null): if valid, the EXACT string from the allowed list; '
                            . '"suggestions" (array of strings): if valid is false, 1-3 EXACT strings from the allowed list that best fit the job title and job description (and the user category text if helpful). '
                            . 'Every string in match or suggestions MUST be copied verbatim from the allowed list.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Allowed categories (JSON array):\n{$categoriesJson}\n\n"
                            . "User category text: \"{$safeLabel}\"\n"
                            . "Job title (context): \"{$safeTitle}\"\n"
                            . "Job description excerpt (context): \"{$safeDesc}\"",
                    ],
                ],
                'max_tokens' => 200,
                'temperature' => 0,
            ]);

            if ($response->successful()) {
                $raw = trim($response->json('choices.0.message.content') ?? '');
                $raw = preg_replace('/^```(?:json)?\s*/i', '', $raw);
                $raw = preg_replace('/\s*```\s*$/', '', $raw);
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $allowedSet = array_flip($allowed);
                    if (! empty($decoded['valid']) && ! empty($decoded['match']) && isset($allowedSet[$decoded['match']])) {
                        return [
                            'valid' => true,
                            'canonical_category' => $decoded['match'],
                            'suggestions' => [],
                            'message' => 'AI matched your category to the taxonomy.',
                        ];
                    }
                    $sug = [];
                    if (! empty($decoded['suggestions']) && is_array($decoded['suggestions'])) {
                        foreach ($decoded['suggestions'] as $s) {
                            if (is_string($s) && isset($allowedSet[$s])) {
                                $sug[] = $s;
                            }
                        }
                    }
                    $sug = $mergeSuggestionLists($sug, $fromJobTitleDescription, $heuristicSuggestions);
                    if ($sug !== []) {
                        return [
                            'valid' => false,
                            'canonical_category' => null,
                            'suggestions' => $sug,
                            'message' => 'Pick a suggested category or refine your description.',
                        ];
                    }
                }
            } else {
                Log::warning('Groq project category validation non-200', ['status' => $response->status()]);
            }
        } catch (\Exception $e) {
            Log::error('Groq project category validation failed', ['error' => $e->getMessage()]);
        }

        if ($bestCat !== null && $bestPct >= 72) {
            return [
                'valid' => true,
                'canonical_category' => $bestCat,
                'suggestions' => [],
                'message' => 'AI response unclear; using closest taxonomy match.',
            ];
        }

        return [
            'valid' => false,
            'canonical_category' => null,
            'suggestions' => $mergeSuggestionLists($fromJobTitleDescription, $heuristicSuggestions),
            'message' => 'Pick a suggested category or refine your description.',
        ];
    }

    // ─── Helpers ──────────────────────────────────────────────

    private function getAllSkillNames(): array
    {
        return Cache::remember('all_skill_names', self::CACHE_TTL, function () {
            return Skill::orderBy('name')->pluck('name')->toArray();
        });
    }

    private function loadTaxonomy(): array
    {
        return Cache::rememberForever('full_taxonomy_parsed', function () {
            $path = base_path('full_freelance_services_taxonomy.json');
            if (!file_exists($path)) {
                return [];
            }
            return json_decode(file_get_contents($path), true) ?: [];
        });
    }
}
