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
        if (! Schema::hasColumn('projects', 'milestones')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->json('milestones')->nullable()->after('completion_notes');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('projects', 'milestones')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropColumn('milestones');
            });
        }
    }
};
