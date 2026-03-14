<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Seed only the admin user. Safe to run multiple times (idempotent).
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@workwise.com'],
            [
                'first_name'        => 'WorkWise',
                'last_name'         => 'Admin',
                'password'          => Hash::make('password'),
                'user_type'         => 'admin',
                'is_admin'          => true,
                'email_verified_at' => now(),
                'profile_completed' => true,
            ]
        );
    }
}
