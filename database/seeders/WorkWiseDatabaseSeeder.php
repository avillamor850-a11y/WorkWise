<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\GigJob;
use App\Models\Bid;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WorkWiseDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Safe to run multiple times (idempotent).
     */
    public function run(): void
    {
        // ---------------------------------------------------------------
        // 1. Admin
        // ---------------------------------------------------------------
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

        // ---------------------------------------------------------------
        // 2. Gig Workers
        // ---------------------------------------------------------------
        $gigWorkers = [
            [
                'first_name'            => 'Carlos',
                'last_name'             => 'Mendoza',
                'email'                 => 'carlos.dev@workwise.ph',
                'professional_title'    => 'Senior Full-Stack Developer',
                'bio'                   => 'Passionate about building scalable web applications with 8+ years of experience in Laravel and React.',
                'hourly_rate'           => 850,
                'skills_with_experience' => json_encode([
                    ['skill' => 'Laravel',  'level' => 'expert'],
                    ['skill' => 'React',    'level' => 'expert'],
                    ['skill' => 'Node.js',  'level' => 'intermediate'],
                    ['skill' => 'MySQL',    'level' => 'expert'],
                ]),
                'country'        => 'Philippines',
                'city'           => 'Makati City',
                'street_address' => '123 Ayala Ave',
                'postal_code'    => '1200',
            ],
            [
                'first_name'            => 'Maria',
                'last_name'             => 'Santos',
                'email'                 => 'maria.design@workwise.ph',
                'professional_title'    => 'UI/UX Designer & Brand Specialist',
                'bio'                   => 'Creating beautiful and intuitive user experiences is my mission. Over 5 years of experience in Figma and Adobe Suite.',
                'hourly_rate'           => 550,
                'skills_with_experience' => json_encode([
                    ['skill' => 'Figma',      'level' => 'expert'],
                    ['skill' => 'UI/UX Design','level' => 'expert'],
                    ['skill' => 'Adobe XD',   'level' => 'intermediate'],
                    ['skill' => 'Branding',   'level' => 'expert'],
                ]),
                'country'        => 'Philippines',
                'city'           => 'Quezon City',
                'street_address' => '456 Katipunan Ave',
                'postal_code'    => '1100',
            ],
            [
                'first_name'            => 'Juan',
                'last_name'             => 'Dela Cruz',
                'email'                 => 'juan.writer@workwise.ph',
                'professional_title'    => 'Content Writer & SEO Specialist',
                'bio'                   => 'Crafting compelling stories and optimizing content for search engines. I help brands find their voice.',
                'hourly_rate'           => 450,
                'skills_with_experience' => json_encode([
                    ['skill' => 'SEO Writing',      'level' => 'expert'],
                    ['skill' => 'Copywriting',       'level' => 'expert'],
                    ['skill' => 'Technical Writing', 'level' => 'intermediate'],
                    ['skill' => 'Markdown',          'level' => 'expert'],
                ]),
                'country'        => 'Philippines',
                'city'           => 'Cebu City',
                'street_address' => '789 IT Park',
                'postal_code'    => '6000',
            ],
        ];

        foreach ($gigWorkers as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                array_merge($data, [
                    'password'          => Hash::make('password123'),
                    'user_type'         => 'gig_worker',
                    'email_verified_at' => now(),
                    'profile_completed' => true,
                    'profile_status'    => 'active',
                ])
            );
        }

        // ---------------------------------------------------------------
        // 3. Employers
        // ---------------------------------------------------------------
        $employers = [
            [
                'first_name'         => 'Robert',
                'last_name'          => 'Tan',
                'email'              => 'tech.startup@workwise.ph',
                'company_name'       => 'InnovateTech Solutions',
                'industry'           => 'Technology',
                'company_size'       => '11-50',
                'company_description'=> 'A fast-growing tech startup focused on building the next generation of SaaS products.',
                'primary_hiring_needs' => json_encode(['Web Development', 'Mobile App Development', 'Software Development']),
                'country'        => 'Philippines',
                'city'           => 'Taguig City',
                'street_address' => 'BGC Corporate Center',
                'postal_code'    => '1634',
                'escrow_balance' => 250000,
            ],
            [
                'first_name'         => 'Sofia',
                'last_name'          => 'Reyes',
                'email'              => 'creative.agency@workwise.ph',
                'company_name'       => 'Creative Minds Agency',
                'industry'           => 'Marketing & Advertising',
                'company_size'       => '2-10',
                'company_description'=> 'A boutique creative agency specializing in brand identity and social media strategy.',
                'primary_hiring_needs' => json_encode(['Graphic Design', 'UI/UX Design', 'Video Editing']),
                'country'        => 'Philippines',
                'city'           => 'Pasig City',
                'street_address' => 'Ortigas Center',
                'postal_code'    => '1605',
                'escrow_balance' => 150000,
            ],
        ];

        foreach ($employers as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                array_merge($data, [
                    'password'          => Hash::make('password123'),
                    'user_type'         => 'employer',
                    'email_verified_at' => now(),
                    'profile_completed' => true,
                    'profile_status'    => 'active',
                ])
            );
        }

        // ---------------------------------------------------------------
        // 4. Jobs  (delete existing seed jobs first so re-runs are safe)
        // ---------------------------------------------------------------
        $innovateTech  = User::where('email', 'tech.startup@workwise.ph')->first();
        $creativeMinds = User::where('email', 'creative.agency@workwise.ph')->first();

        $jobTitles = [
            'Laravel Backend Developer for API Optimization',
            'UI/UX Designer for Brand Re-launch',
        ];
        GigJob::whereIn('title', $jobTitles)->delete();

        $backendJob = GigJob::create([
            'employer_id'           => $innovateTech->id,
            'title'                 => 'Laravel Backend Developer for API Optimization',
            'description'           => 'We need an expert Laravel developer to help optimize our existing REST APIs and implement new features for our SaaS platform.',
            'project_category'      => 'Programming & Tech',
            'skills_requirements'   => json_encode([
                ['skill' => 'Laravel',   'importance' => 'required'],
                ['skill' => 'REST API',  'importance' => 'required'],
                ['skill' => 'MySQL',     'importance' => 'preferred'],
            ]),
            'budget_type'            => 'fixed',
            'budget_min'             => 50000,
            'budget_max'             => 80000,
            'experience_level'       => 'expert',
            'estimated_duration_days'=> 30,
            'status'                 => 'open',
            'deadline'               => Carbon::now()->addDays(14),
            'is_remote'              => true,
        ]);

        $designJob = GigJob::create([
            'employer_id'           => $creativeMinds->id,
            'title'                 => 'UI/UX Designer for Brand Re-launch',
            'description'           => "Help us redesign our client's brand identity and create a modern, user-friendly website. Figma expertise is a must.",
            'project_category'      => 'Creative & Design Services',
            'skills_requirements'   => json_encode([
                ['skill' => 'Figma',       'importance' => 'required'],
                ['skill' => 'UI/UX Design','importance' => 'required'],
                ['skill' => 'Branding',    'importance' => 'preferred'],
            ]),
            'budget_type'            => 'fixed',
            'budget_min'             => 40000,
            'budget_max'             => 60000,
            'experience_level'       => 'intermediate',
            'estimated_duration_days'=> 20,
            'status'                 => 'open',
            'deadline'               => Carbon::now()->addDays(10),
            'is_remote'              => true,
        ]);

        // ---------------------------------------------------------------
        // 5. Bids  (delete first to avoid unique constraint on job+worker)
        // ---------------------------------------------------------------
        $carlos = User::where('email', 'carlos.dev@workwise.ph')->first();
        $maria  = User::where('email', 'maria.design@workwise.ph')->first();

        Bid::where('job_id', $backendJob->id)->where('gig_worker_id', $carlos->id)->delete();
        Bid::create([
            'job_id'           => $backendJob->id,
            'gig_worker_id'    => $carlos->id,
            'bid_amount'       => 75000,
            'proposal_message' => 'I have extensive experience with Laravel API optimization. I have worked on similar projects and can deliver high-quality results within the deadline.',
            'estimated_days'   => 25,
            'status'           => 'pending',
            'submitted_at'     => now(),
        ]);

        Bid::where('job_id', $designJob->id)->where('gig_worker_id', $maria->id)->delete();
        Bid::create([
            'job_id'           => $designJob->id,
            'gig_worker_id'    => $maria->id,
            'bid_amount'       => 55000,
            'proposal_message' => 'I love the creative direction of this project. My portfolio shows my strength in Figma and branding. I can start immediately.',
            'estimated_days'   => 18,
            'status'           => 'pending',
            'submitted_at'     => now(),
        ]);
    }
}
