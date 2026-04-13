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
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->unique();
            $table->unsignedSmallInteger('completeness_score')->default(0);
            $table->unsignedSmallInteger('activity_score_30d')->default(0);
            $table->unsignedSmallInteger('intent_score')->default(0);
            $table->json('traits')->nullable();
            $table->json('segments')->nullable();
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->index('computed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
