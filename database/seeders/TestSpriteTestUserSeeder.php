<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds a dedicated user for TestSprite / E2E tests.
 * Email: example@gmail.com, Password: password123
 * Run: php artisan db:seed --class=TestSpriteTestUserSeeder
 */
class TestSpriteTestUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'example@gmail.com'],
            [
                'first_name'         => 'Test',
                'last_name'          => 'User',
                'user_type'          => 'gig_worker',
                'password'           => Hash::make('password123'),
                'email_verified_at'  => now(),
                'profile_completed'  => true,
                'profile_status'     => 'active',
                'professional_title' => 'E2E Test User',
                'bio'                => 'User for automated tests.',
            ]
        );

        // Second user for employer-dashboard tests (TC006)
        User::updateOrCreate(
            ['email' => 'example.employer@gmail.com'],
            [
                'first_name'          => 'Test',
                'last_name'           => 'Employer',
                'company_name'        => 'Test Employer Co',
                'user_type'           => 'employer',
                'password'            => Hash::make('password123'),
                'email_verified_at'   => now(),
                'profile_completed'   => true,
                'profile_status'      => 'active',
                'industry'            => 'Technology',
                'company_size'        => '2-10',
            ]
        );
    }
}
