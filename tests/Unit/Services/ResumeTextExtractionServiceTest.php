<?php

namespace Tests\Unit\Services;

use App\Services\ResumeTextExtractionService;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeTextExtractionServiceTest extends TestCase
{
    public function test_extracts_plain_text_file_from_public_storage(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('resumes/test/plain.txt', "Jane Developer\nLaravel PHP");

        $service = $this->app->make(ResumeTextExtractionService::class);
        $text = $service->extractFromStoredPath('/storage/resumes/test/plain.txt');

        $this->assertStringContainsString('Jane Developer', $text);
        $this->assertStringContainsString('Laravel PHP', $text);
    }

    public function test_pdf_falls_back_to_legacy_text_pattern_when_vision_unavailable(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('resumes/test/sample.pdf', '%PDF-1.4 (Jane Developer) Tj');

        config([
            'services.groq.api_key' => null,
        ]);

        $service = $this->app->make(ResumeTextExtractionService::class);
        $text = $service->extractFromStoredPath('/storage/resumes/test/sample.pdf');

        $this->assertStringContainsString('Jane Developer', $text);
    }
}
