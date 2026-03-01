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
        Schema::table('gig_jobs', function (Blueprint $table) {
            // Make required_skills nullable (deprecated in favor of skills_requirements)
            $table->json('required_skills')->nullable()->change();
            
            // Note: project_category and job_complexity are already nullable from previous migrations.
            // Calling ->change() on them here causes syntax errors in PostgreSQL/Supabase.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gig_jobs', function (Blueprint $table) {
            // Note: Reverting these changes may fail if there are existing NULL values
            // This is intentional as we want to maintain data integrity
            
            // Revert required_skills to not nullable (with default empty array)
            $table->json('required_skills')->nullable(false)->default('[]')->change();
            
            // Revert project_category to not nullable (with default empty string)
            $table->string('project_category')->nullable(false)->default('')->change();
            
            // Revert job_complexity to not nullable (with default 'moderate')
            $table->enum('job_complexity', ['simple', 'moderate', 'complex', 'expert'])
                  ->nullable(false)
                  ->default('moderate')
                  ->change();
        });
    }
};
