<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class GroqBatchJsonClient
{
    private ?string $apiKey;

    private string $baseUrl;

    private string $certPath;

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key');
        $this->baseUrl = rtrim(config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
        $this->certPath = base_path('cacert.pem');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    /**
     * @param  array<int, array{name: string, temperature: float, max_completion_tokens: int, top_p: float}>  $modelConfigs
     */
    public function postChatContent(
        string $systemPrompt,
        string $userPrompt,
        array $modelConfigs,
        int $timeoutSeconds,
        ?int $maxCompletionTokensOverride = null,
        int $totalAttemptBudgetSeconds = 120
    ): ?string {
        if (! $this->isConfigured()) {
            return null;
        }

        $callStart = microtime(true);

        foreach ($modelConfigs as $modelConfig) {
            if (microtime(true) - $callStart > $totalAttemptBudgetSeconds) {
                Log::warning('GroqBatchJsonClient: attempt budget exhausted');

                return null;
            }

            $maxTokens = $maxCompletionTokensOverride ?? $modelConfig['max_completion_tokens'];

            try {
                $response = Http::withToken($this->apiKey)
                    ->withOptions(['verify' => file_exists($this->certPath) ? $this->certPath : true])
                    ->timeout($timeoutSeconds)
                    ->post($this->baseUrl.'/chat/completions', [
                        'model' => $modelConfig['name'],
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $userPrompt],
                        ],
                        'temperature' => $modelConfig['temperature'],
                        'max_completion_tokens' => $maxTokens,
                        'top_p' => $modelConfig['top_p'],
                        'stream' => false,
                    ]);

                if (! $response->successful()) {
                    if (in_array($response->status(), [429, 503], true)) {
                        Log::warning("Groq batch model {$modelConfig['name']} rate limited or unavailable");
                    }

                    continue;
                }

                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';
                if ($content !== '') {
                    return $content;
                }
            } catch (\Throwable $e) {
                Log::error('GroqBatchJsonClient request failed', [
                    'model' => $modelConfig['name'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return null;
    }

    /**
     * Parse a JSON array of worker scores from model output.
     *
     * @return array<int, array{score: int, reason: string, success: true}>
     */
    public static function parseWorkerScoreArray(string $content): array
    {
        $json = self::extractJsonArray($content);
        if ($json === null) {
            return [];
        }

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        $out = [];
        foreach ($decoded as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = $row['gig_worker_id'] ?? $row['worker_id'] ?? null;
            if ($id === null || ! is_numeric($id)) {
                continue;
            }
            $id = (int) $id;
            if (! isset($row['score']) || ! is_numeric($row['score'])) {
                continue;
            }
            $score = max(0, min(100, (int) $row['score']));
            $reason = isset($row['reason']) ? trim((string) $row['reason']) : '';
            if ($reason === '') {
                continue;
            }
            $out[$id] = ['score' => $score, 'reason' => $reason, 'success' => true];
        }

        return $out;
    }

    /**
     * Parse a JSON array of job scores (gig worker recommendations) from model output.
     *
     * @return array<int, array{score: int, reason: string, success: true}>
     */
    public static function parseJobScoreArray(string $content): array
    {
        $json = self::extractJsonArray($content);
        if ($json === null) {
            return [];
        }

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        $out = [];
        foreach ($decoded as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = $row['job_id'] ?? $row['gig_job_id'] ?? null;
            if ($id === null || ! is_numeric($id)) {
                continue;
            }
            $id = (int) $id;
            if (! isset($row['score']) || ! is_numeric($row['score'])) {
                continue;
            }
            $score = max(0, min(100, (int) $row['score']));
            $reason = isset($row['reason']) ? trim((string) $row['reason']) : '';
            if ($reason === '') {
                continue;
            }
            $out[$id] = ['score' => $score, 'reason' => $reason, 'success' => true];
        }

        return $out;
    }

    private static function extractJsonArray(string $content): ?string
    {
        $content = trim($content);
        if (preg_match('/```(?:json)?\s*\R?([\s\S]*?)\R?```/mi', $content, $m)) {
            $fromFence = self::extractBalancedArray(trim($m[1]));
            if ($fromFence !== null) {
                return $fromFence;
            }
        }

        return self::extractBalancedArray($content);
    }

    private static function extractBalancedArray(string $content): ?string
    {
        $start = strpos($content, '[');
        if ($start === false) {
            return null;
        }
        $depth = 0;
        $len = strlen($content);
        for ($i = $start; $i < $len; $i++) {
            $c = $content[$i];
            if ($c === '[') {
                $depth++;
            } elseif ($c === ']') {
                $depth--;
                if ($depth === 0) {
                    return substr($content, $start, $i - $start + 1);
                }
            }
        }

        return null;
    }
}
