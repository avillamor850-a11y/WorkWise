<?php

namespace Tests\Unit\Services;

use App\Services\GroqBatchJsonClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GroqBatchJsonClientTest extends TestCase
{
    public function test_parse_worker_score_array_decodes_flat_json(): void
    {
        $input = '[{"gig_worker_id":5,"score":82,"reason":"Strong skills match for the role."}]';
        $out = GroqBatchJsonClient::parseWorkerScoreArray($input);

        $this->assertArrayHasKey(5, $out);
        $this->assertSame(82, $out[5]['score']);
        $this->assertStringContainsString('Strong skills', $out[5]['reason']);
        $this->assertTrue($out[5]['success']);
    }

    public function test_parse_worker_score_array_accepts_worker_id_alias(): void
    {
        $input = '[{"worker_id":9,"score":40,"reason":"Partial overlap."}]';
        $out = GroqBatchJsonClient::parseWorkerScoreArray($input);

        $this->assertSame(40, $out[9]['score']);
    }

    public function test_parse_worker_score_array_strips_markdown_fence(): void
    {
        $inner = '[{"gig_worker_id":1,"score":10,"reason":"Brief."}]';
        $content = "```json\n{$inner}\n```";
        $out = GroqBatchJsonClient::parseWorkerScoreArray($content);

        $this->assertSame(10, $out[1]['score']);
    }

    public function test_parse_worker_score_array_extracts_array_from_prose(): void
    {
        $content = "Here is the evaluation:\n[{\"gig_worker_id\":2,\"score\":100,\"reason\":\"Perfect fit.\"}]\nDone.";
        $out = GroqBatchJsonClient::parseWorkerScoreArray($content);

        $this->assertSame(100, $out[2]['score']);
    }

    public function test_parse_worker_score_array_clamps_score(): void
    {
        $input = '[{"gig_worker_id":3,"score":150,"reason":"High"},{"gig_worker_id":4,"score":-5,"reason":"Low"}]';
        $out = GroqBatchJsonClient::parseWorkerScoreArray($input);

        $this->assertSame(100, $out[3]['score']);
        $this->assertSame(0, $out[4]['score']);
    }

    public function test_parse_worker_score_array_skips_empty_reason(): void
    {
        $input = '[{"gig_worker_id":6,"score":50,"reason":""}]';
        $out = GroqBatchJsonClient::parseWorkerScoreArray($input);

        $this->assertSame([], $out);
    }

    public function test_post_chat_content_returns_assistant_content_when_groq_succeeds(): void
    {
        config(['services.groq.api_key' => 'test-key', 'services.groq.base_url' => 'https://api.groq.com/openai/v1']);

        $payload = [['gig_worker_id' => 1, 'score' => 77, 'reason' => 'Good fit.']];
        Http::fake([
            'api.groq.com/*' => Http::response([
                'choices' => [['message' => ['content' => json_encode($payload)]]],
            ], 200),
        ]);

        $client = new GroqBatchJsonClient;
        $raw = $client->postChatContent(
            'system',
            'user',
            [[
                'name' => 'llama-3.1-8b-instant',
                'temperature' => 0.5,
                'max_completion_tokens' => 256,
                'top_p' => 1.0,
            ]],
            10,
            512
        );

        $this->assertIsString($raw);
        $parsed = GroqBatchJsonClient::parseWorkerScoreArray($raw);
        $this->assertSame(77, $parsed[1]['score']);
    }
}
