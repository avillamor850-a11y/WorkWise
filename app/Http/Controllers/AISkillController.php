<?php

namespace App\Http\Controllers;

use App\Services\SkillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AISkillController extends Controller
{
    public function __construct(private SkillService $skillService) {}

    /**
     * GET /api/skills/suggestions
     * Query params: q (optional), category (optional), limit (optional, default 50)
     */
    public function suggestions(Request $request): JsonResponse
    {
        $query    = $request->input('q');
        $category = $request->input('category');
        $limit    = (int) $request->input('limit', 50);

        if ($category) {
            $skills = $this->skillService->getSkillsForCategory($category, min($limit, 15));
        } else {
            $skills = $this->skillService->getVerifiedSkills($query, $limit);
        }

        return response()->json([
            'skills'     => $skills,
            'categories' => $category ? [] : $this->skillService->getCategories(),
        ]);
    }

    /**
     * POST /api/skills/validate
     * Body: { "skill": "..." }
     */
    public function validate(Request $request): JsonResponse
    {
        $request->validate(['skill' => 'required|string|max:100']);

        $result = $this->skillService->validateWithAI($request->input('skill'));

        return response()->json($result);
    }

    /**
     * POST /api/onboarding/validate-hiring-need
     * Body: { "description": "..." }
     */
    public function validateHiringNeed(Request $request): JsonResponse
    {
        $request->validate(['description' => 'required|string|max:255']);

        $result = $this->skillService->validateHiringNeedWithAI($request->input('description'));

        return response()->json($result);
    }

    /**
     * POST /api/skills/suggest-match
     * Body: { "skill": "..." }
     */
    public function suggestMatch(Request $request): JsonResponse
    {
        $request->validate(['skill' => 'required|string|max:100']);

        $result = $this->skillService->fuzzyMatch($request->input('skill'));

        return response()->json($result);
    }

    /**
     * POST /api/skills/ensure
     * Body: { "skill": "..." }
     * Creates or finds the skill row and runs promotion check.
     */
    public function ensure(Request $request): JsonResponse
    {
        $request->validate(['skill' => 'required|string|max:100']);

        $skill = $this->skillService->ensureSkill($request->input('skill'));
        $this->skillService->checkPromotion($skill);

        return response()->json([
            'id'       => $skill->id,
            'skill'    => $skill->name,
            'source'   => $skill->source,
            'verified' => $skill->isVerified(),
        ]);
    }

    /**
     * Legacy endpoint kept for backward compatibility.
     * POST /api/ai-skills/correct
     */
    public function correct(Request $request): JsonResponse
    {
        $request->validate(['skill' => 'required|string|max:100']);

        $skill = trim($request->input('skill'));
        $fuzzy = $this->skillService->fuzzyMatch($skill);

        $corrected = $fuzzy['match'] && $fuzzy['confidence'] >= 80
            ? $fuzzy['match']
            : ucwords(strtolower($skill));

        return response()->json([
            'original'  => $skill,
            'corrected' => $corrected,
        ]);
    }
}
