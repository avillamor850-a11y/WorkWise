<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ResumeTextExtractionService
{
    private ?string $groqApiKey;
    private string $groqBaseUrl;
    private string $groqVisionModel;

    public function __construct()
    {
        $this->groqApiKey = config('services.groq.api_key', env('GROQ_API_KEY'));
        $this->groqBaseUrl = rtrim((string) config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
        $this->groqVisionModel = (string) config('services.groq.resume_model', 'meta-llama/llama-4-scout-17b-16e-instruct');
    }

    public function extractFromStoredPath(string $storedPath): string
    {
        $runId = (string) (request()?->header('X-Debug-Run-Id') ?? 'run1');
        if (trim($storedPath) === '') {
            return '';
        }

        [$disk, $relativePath] = $this->resolveDiskAndPath($storedPath);
        if ($relativePath === '' || ! Storage::disk($disk)->exists($relativePath)) {
            return '';
        }

        $raw = (string) Storage::disk($disk)->get($relativePath);
        $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
        // #region agent log
        $this->debugLog($runId, 'H1', 'ResumeTextExtractionService::extractFromStoredPath', 'extract_start', [
            'ext' => $ext,
            'disk' => $disk,
            'raw_bytes' => strlen($raw),
        ]);
        // #endregion
        // #region agent log
        @file_put_contents(base_path('debug-2e90a4.log'), json_encode([
            'sessionId' => '2e90a4',
            'runId' => 'initial',
            'hypothesisId' => 'H3',
            'location' => 'ResumeTextExtractionService::extractFromStoredPath',
            'message' => 'resume_text_extraction_start',
            'data' => [
                'disk' => $disk,
                'ext' => $ext,
                'stored_path' => $storedPath,
                'relative_path' => $relativePath,
                'raw_bytes' => strlen($raw),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion

        $extracted = match ($ext) {
            'docx' => $this->extractDocxText($raw),
            'pdf' => $this->extractPdfText($raw),
            'doc' => $this->extractDocText($raw),
            default => $this->sanitizeText($raw),
        };
        // #region agent log
        @file_put_contents(base_path('debug-2e90a4.log'), json_encode([
            'sessionId' => '2e90a4',
            'runId' => 'initial',
            'hypothesisId' => 'H3',
            'location' => 'ResumeTextExtractionService::extractFromStoredPath',
            'message' => 'resume_text_extraction_done',
            'data' => [
                'ext' => $ext,
                'extracted_len' => mb_strlen((string) $extracted),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion

        // #region agent log
        $this->debugLog($runId, 'H1', 'ResumeTextExtractionService::extractFromStoredPath', 'extract_done', [
            'ext' => $ext,
            'extracted_len' => mb_strlen((string) $extracted),
        ]);
        // #endregion

        return $extracted;
    }

    private function resolveDiskAndPath(string $storedPath): array
    {
        if (str_starts_with($storedPath, '/supabase/')) {
            return ['supabase', ltrim(substr($storedPath, strlen('/supabase/')), '/')];
        }
        if (str_starts_with($storedPath, '/storage/')) {
            return ['public', ltrim(substr($storedPath, strlen('/storage/')), '/')];
        }

        return ['public', ltrim($storedPath, '/')];
    }

    private function extractDocxText(string $raw): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'docx_');
        if ($tmp === false) {
            return '';
        }

        file_put_contents($tmp, $raw);
        $zip = new ZipArchive();
        $text = '';
        if ($zip->open($tmp) === true) {
            $xml = $zip->getFromName('word/document.xml');
            if (is_string($xml)) {
                $text = strip_tags($xml);
            }
            $zip->close();
        }
        @unlink($tmp);

        return $this->sanitizeText($text);
    }

    private function extractPdfText(string $raw): string
    {
        $visionText = $this->extractPdfTextWithGroqVision($raw);
        if ($visionText !== '') {
            return $visionText;
        }

        // Lightweight fallback extraction; for production accuracy prefer a PDF parser package.
        if (preg_match_all('/\((.*?)\)\s*Tj/s', $raw, $matches) === 1 && !empty($matches[1])) {
            return $this->sanitizeText(implode(' ', $matches[1]));
        }

        return '';
    }

    private function extractPdfTextWithGroqVision(string $raw): string
    {
        $runId = (string) (request()?->header('X-Debug-Run-Id') ?? 'run1');
        if (empty($this->groqApiKey)) {
            // #region agent log
            $this->debugLog($runId, 'H2', 'ResumeTextExtractionService::extractPdfTextWithGroqVision', 'skip_no_api_key', []);
            // #endregion
            return '';
        }

        if (! class_exists(\Imagick::class)) {
            // #region agent log
            $this->debugLog($runId, 'H6', 'ResumeTextExtractionService::extractPdfTextWithGroqVision', 'using_python_fallback', []);
            // #endregion
            return $this->extractPdfTextWithPythonGroq($raw, $runId);
        }

        $imageDataUrls = $this->renderPdfToImageDataUrls($raw, 2);
        // #region agent log
        $this->debugLog($runId, 'H2', 'ResumeTextExtractionService::extractPdfTextWithGroqVision', 'rendered_pages', [
            'pages_count' => count($imageDataUrls),
        ]);
        // #endregion
        if (empty($imageDataUrls)) {
            return '';
        }

        $content = [[
            'type' => 'text',
            'text' => 'Transcribe all visible text from this resume image. Output plain text only, preserve line breaks and reading order. Do not summarize.',
        ]];

        foreach ($imageDataUrls as $index => $dataUrl) {
            $content[] = ['type' => 'text', 'text' => '--- Page '.($index + 1).' ---'];
            $content[] = [
                'type' => 'image_url',
                'image_url' => ['url' => $dataUrl],
            ];
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->groqApiKey,
                'Content-Type' => 'application/json',
            ])->timeout(60)->post("{$this->groqBaseUrl}/chat/completions", [
                'model' => $this->groqVisionModel,
                'messages' => [[
                    'role' => 'user',
                    'content' => $content,
                ]],
                'temperature' => 0.2,
                'max_tokens' => 4096,
                'top_p' => 1,
                'stream' => false,
            ]);

            if (! $response->successful()) {
                // #region agent log
                $this->debugLog($runId, 'H3', 'ResumeTextExtractionService::extractPdfTextWithGroqVision', 'groq_http_failed', [
                    'status' => $response->status(),
                ]);
                // #endregion
                Log::warning('Groq vision OCR failed', [
                    'status' => $response->status(),
                ]);

                return '';
            }

            $text = (string) ($response->json()['choices'][0]['message']['content'] ?? '');
            // #region agent log
            $this->debugLog($runId, 'H3', 'ResumeTextExtractionService::extractPdfTextWithGroqVision', 'groq_http_ok', [
                'text_len' => mb_strlen($text),
            ]);
            // #endregion

            return $this->sanitizeText($text);
        } catch (\Throwable $e) {
            // #region agent log
            $this->debugLog($runId, 'H3', 'ResumeTextExtractionService::extractPdfTextWithGroqVision', 'groq_exception', [
                'error' => $e->getMessage(),
            ]);
            // #endregion
            Log::warning('Groq vision OCR exception', [
                'error' => $e->getMessage(),
            ]);

            return '';
        }
    }

    private function renderPdfToImageDataUrls(string $raw, int $maxPages = 2): array
    {
        $runId = (string) (request()?->header('X-Debug-Run-Id') ?? 'run1');
        if (! class_exists(\Imagick::class)) {
            // #region agent log
            $this->debugLog($runId, 'H2', 'ResumeTextExtractionService::renderPdfToImageDataUrls', 'imagick_missing', []);
            // #endregion
            return [];
        }

        $tmp = tempnam(sys_get_temp_dir(), 'pdf_');
        if ($tmp === false) {
            return [];
        }

        try {
            file_put_contents($tmp, $raw);
            $imagick = new \Imagick();
            $imagick->setResolution(180, 180);
            $imagick->readImage($tmp.'[0-'.max(0, $maxPages - 1).']');

            $dataUrls = [];
            foreach ($imagick as $page) {
                /** @var \Imagick $page */
                $page->setImageFormat('png');
                $png = (string) $page->getImageBlob();
                if ($png !== '') {
                    $dataUrls[] = 'data:image/png;base64,'.base64_encode($png);
                }
            }

            $imagick->clear();
            $imagick->destroy();

            return $dataUrls;
        } catch (\Throwable $e) {
            Log::warning('PDF render to image failed', [
                'error' => $e->getMessage(),
            ]);

            return [];
        } finally {
            @unlink($tmp);
        }
    }

    private function extractPdfTextWithPythonGroq(string $raw, string $runId): string
    {
        $tmpPdf = tempnam(sys_get_temp_dir(), 'resume_pdf_');
        if ($tmpPdf === false) {
            return '';
        }

        try {
            file_put_contents($tmpPdf, $raw);
            $script = base_path('playwright/OCR/extract_pdf_text_groq.py');
            if (!is_file($script)) {
                // #region agent log
                $this->debugLog($runId, 'H6', 'ResumeTextExtractionService::extractPdfTextWithPythonGroq', 'script_missing', [
                    'script' => $script,
                ]);
                // #endregion
                return '';
            }

            $commands = [
                'python '.escapeshellarg($script).' '.escapeshellarg($tmpPdf).' --pages 2 --model '.escapeshellarg($this->groqVisionModel).' 2>&1',
                'py -3 '.escapeshellarg($script).' '.escapeshellarg($tmpPdf).' --pages 2 --model '.escapeshellarg($this->groqVisionModel).' 2>&1',
            ];

            foreach ($commands as $cmd) {
                $output = @shell_exec($cmd);
                if (!is_string($output) || trim($output) === '') {
                    continue;
                }

                if (preg_match('/--- Groq response ---\s*(.*?)\s*--- end ---/s', $output, $m) === 1) {
                    $text = $this->sanitizeText((string) ($m[1] ?? ''));
                    // #region agent log
                    $this->debugLog($runId, 'H6', 'ResumeTextExtractionService::extractPdfTextWithPythonGroq', 'python_fallback_success', [
                        'text_len' => mb_strlen($text),
                    ]);
                    // #endregion
                    if ($text !== '') {
                        return $text;
                    }
                }

                // #region agent log
                $this->debugLog($runId, 'H6', 'ResumeTextExtractionService::extractPdfTextWithPythonGroq', 'python_fallback_output_unparsed', [
                    'sample' => mb_substr($output, 0, 240),
                ]);
                // #endregion
            }
        } catch (\Throwable $e) {
            // #region agent log
            $this->debugLog($runId, 'H6', 'ResumeTextExtractionService::extractPdfTextWithPythonGroq', 'python_fallback_exception', [
                'error' => $e->getMessage(),
            ]);
            // #endregion
        } finally {
            @unlink($tmpPdf);
        }

        return '';
    }

    private function extractDocText(string $raw): string
    {
        return $this->sanitizeText($raw);
    }

    private function sanitizeText(string $text): string
    {
        $utf8 = @mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        $clean = preg_replace('/[^\P{C}\n\t]+/u', ' ', (string) $utf8);
        $clean = preg_replace('/\s+/', ' ', (string) $clean);

        return trim((string) $clean);
    }

    private function debugLog(string $runId, string $hypothesisId, string $location, string $message, array $data): void
    {
        @file_put_contents(base_path('debug-11082d.log'), json_encode([
            'sessionId' => '11082d',
            'runId' => $runId,
            'hypothesisId' => $hypothesisId,
            'location' => $location,
            'message' => $message,
            'data' => $data,
            'timestamp' => round(microtime(true) * 1000),
        ])."\n", FILE_APPEND | LOCK_EX);
    }
}
