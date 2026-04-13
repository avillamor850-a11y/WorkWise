<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('resume_screenings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gig_worker_id')->constrained('users')->cascadeOnDelete();
            $table->string('resume_hash', 64)->nullable()->index();
            $table->string('resume_path')->nullable();
            $table->string('status', 24)->default('pending')->index(); // pending|processing|success|failed
            $table->json('screening_result')->nullable();
            $table->json('extracted_skills')->nullable();
            $table->text('experience_summary')->nullable();
            $table->text('strengths')->nullable();
            $table->text('gaps')->nullable();
            $table->decimal('confidence', 5, 2)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('screened_at')->nullable();
            $table->timestamps();

            $table->index(['gig_worker_id', 'created_at']);
            $table->unique(['gig_worker_id', 'resume_hash']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resume_screenings');
    }
};
