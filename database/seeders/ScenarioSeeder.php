<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\GigJob;
use App\Models\Project;
use App\Models\Bid;
use App\Models\Review;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ScenarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Veteran Employer (with active jobs and recent projects)
        $vetEmployer = User::updateOrCreate(
            ['email' => 'veteran.employer@example.com'],
            [
                'first_name' => 'Robert',
                'last_name' => 'Tan',
                'company_name' => 'BGC Tech Ventures',
                'user_type' => 'employer',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'profile_completed' => true,
                'profile_status' => 'approved',
                'industry' => 'Technology',
                'company_size' => '51-200',
                'company_description' => 'A premier venture capital and technology incubator based in BGC.',
                'escrow_balance' => 500000.00,
            ]
        );

        // 2. Veteran Gig Worker (with rich work history)
        $vetWorker = User::updateOrCreate(
            ['email' => 'veteran.worker@example.com'],
            [
                'first_name' => 'Antonio',
                'last_name' => 'Luna',
                'professional_title' => 'Senior Full-Stack Architect',
                'user_type' => 'gig_worker',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'profile_completed' => true,
                'profile_status' => 'approved',
                'bio' => 'Over 15 years of software engineering experience. Specializing in high-performance web systems and cloud architecture.',
                'hourly_rate' => 1200.00,
                'skills_with_experience' => [
                    ['skill' => 'Cloud Architecture', 'level' => 'expert'],
                    ['skill' => 'Laravel', 'level' => 'expert'],
                    ['skill' => 'System Design', 'level' => 'expert'],
                    ['skill' => 'PostgreSQL', 'level' => 'expert'],
                ],
            ]
        );

        // 3. Intermediate Gig Worker
        $midWorker = User::updateOrCreate(
            ['email' => 'mid.worker@example.com'],
            [
                'first_name' => 'Liza',
                'last_name' => 'Soberano',
                'professional_title' => 'Graphic Designer',
                'user_type' => 'gig_worker',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'profile_completed' => true,
                'profile_status' => 'approved',
                'bio' => 'Creative designer focused on brand identity and modern UI/UX patterns.',
                'hourly_rate' => 600.00,
                'skills_with_experience' => [
                    ['skill' => 'Figma', 'level' => 'expert'],
                    ['skill' => 'Branding', 'level' => 'expert'],
                    ['skill' => 'Illustrator', 'level' => 'intermediate'],
                ],
            ]
        );

        // 4. New Users (No history)
        User::updateOrCreate(
            ['email' => 'new.employer@example.com'],
            [
                'first_name' => 'Mark',
                'last_name' => 'Villanueva',
                'company_name' => 'Mark Ventures',
                'user_type' => 'employer',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'profile_completed' => true,
                'profile_status' => 'approved',
            ]
        );

        User::updateOrCreate(
            ['email' => 'new.worker@example.com'],
            [
                'first_name' => 'Sarah',
                'last_name' => 'Gerard',
                'professional_title' => 'Junior Web Developer',
                'user_type' => 'gig_worker',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'profile_completed' => true,
                'profile_status' => 'approved',
                'hourly_rate' => 300.00,
            ]
        );

        // --- SEEDING DATA FOR VETERANS ---

        // A. Veteran Employer's Active Jobs
        $activeJobTitles = [
            'SaaS Platform Migration to AWS',
            'React Native Developer for Fintech App',
            'Lead UI/UX Designer for Enterprise Portal'
        ];

        foreach ($activeJobTitles as $title) {
            GigJob::create([
                'employer_id' => $vetEmployer->id,
                'title' => $title,
                'description' => "Looking for a specialist to help us with $title. Long-term opportunity.",
                'project_category' => 'Programming & Tech',
                'skills_requirements' => [['skill' => 'Cloud', 'importance' => 'required']],
                'budget_type' => 'fixed',
                'budget_min' => 100000,
                'budget_max' => 200000,
                'experience_level' => 'expert',
                'estimated_duration_days' => 60,
                'status' => 'open',
                'deadline' => Carbon::now()->addDays(30),
                'is_remote' => true,
            ]);
        }

        // B. Veteran Gig Worker's Work History (and Veteran Employer's Past Projects)
        // 10 Completed Projects for Vet Worker
        for ($i = 1; $i <= 10; $i++) {
            $isOdd = $i % 2 !== 0;
            $employer = $isOdd ? $vetEmployer : User::factory()->create([
                'user_type' => 'employer', 
                'profile_completed' => true, 
                'profile_status' => 'approved'
            ]);
            
            $job = GigJob::create([
                'employer_id' => $employer->id,
                'title' => "Past Project $i for Architect",
                'description' => 'Description for past project.',
                'skills_requirements' => [['skill' => 'Laravel', 'importance' => 'required']],
                'status' => 'closed',
                'budget_type' => 'fixed',
                'budget_min' => 5000 * $i,
                'budget_max' => 6000 * $i,
                'experience_level' => 'expert',
                'estimated_duration_days' => 15,
            ]);

            $bid = Bid::create([
                'job_id' => $job->id,
                'gig_worker_id' => $vetWorker->id,
                'bid_amount' => 5500 * $i,
                'proposal_message' => "My proposal for project $i.",
                'estimated_days' => 12,
                'status' => 'accepted',
                'submitted_at' => Carbon::now()->subMonths($i + 1),
            ]);

            $agreedAmount = 5500 * $i;
            $platformFee = $agreedAmount * 0.1;
            $netAmount = $agreedAmount - $platformFee;

            $project = Project::create([
                'employer_id' => $employer->id,
                'gig_worker_id' => $vetWorker->id,
                'job_id' => $job->id,
                'bid_id' => $bid->id,
                'status' => 'completed',
                'agreed_amount' => $agreedAmount,
                'platform_fee' => $platformFee,
                'net_amount' => $netAmount,
                'started_at' => Carbon::now()->subMonths($i + 1),
                'completed_at' => Carbon::now()->subMonths($i),
                'payment_released' => true,
                'payment_released_at' => Carbon::now()->subMonths($i),
                'employer_approved' => true,
                'approved_at' => Carbon::now()->subMonths($i),
            ]);

            // Add reviews
            Review::create([
                'project_id' => $project->id,
                'reviewer_id' => $employer->id,
                'reviewee_id' => $vetWorker->id,
                'rating' => 5,
                'comment' => "Excellent work on project $i. Top-tier professional.",
                'criteria_ratings' => ['quality' => 5, 'communication' => 5, 'professionalism' => 5],
            ]);

            Review::create([
                'project_id' => $project->id,
                'reviewer_id' => $vetWorker->id,
                'reviewee_id' => $employer->id,
                'rating' => 5,
                'comment' => "Great client to work with.",
                'criteria_ratings' => ['quality' => 5, 'communication' => 5, 'professionalism' => 5],
            ]);
        }

        // C. Active Projects
        // Vet Employer + Mid Worker
        $activeJob = GigJob::create([
            'employer_id' => $vetEmployer->id,
            'title' => 'Ongoing Brand Identity Design',
            'description' => 'Creative design project.',
            'skills_requirements' => [['skill' => 'Figma', 'importance' => 'required']],
            'status' => 'in_progress',
            'budget_type' => 'fixed',
            'budget_min' => 20000,
            'budget_max' => 30000,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 30,
        ]);
        $activeBid = Bid::create([
            'job_id' => $activeJob->id,
            'gig_worker_id' => $midWorker->id,
            'bid_amount' => 25000,
            'proposal_message' => 'I can handle your brand identity perfectly.',
            'estimated_days' => 20,
            'status' => 'accepted',
        ]);
        Project::create([
            'employer_id' => $vetEmployer->id,
            'gig_worker_id' => $midWorker->id,
            'job_id' => $activeJob->id,
            'bid_id' => $activeBid->id,
            'status' => 'active',
            'agreed_amount' => 25000,
            'platform_fee' => 2500,
            'net_amount' => 22500,
            'started_at' => Carbon::now()->subDays(10),
        ]);

        // Vet Employer + Vet Worker
        $activeJob2 = GigJob::create([
            'employer_id' => $vetEmployer->id,
            'title' => 'Critical Infrastructure Security Audit',
            'description' => 'Security audit for cloud systems.',
            'skills_requirements' => [['skill' => 'Security', 'importance' => 'required']],
            'status' => 'in_progress',
            'budget_type' => 'fixed',
            'budget_min' => 100000,
            'budget_max' => 200000,
            'experience_level' => 'expert',
            'estimated_duration_days' => 45,
        ]);
        $activeBid2 = Bid::create([
            'job_id' => $activeJob2->id,
            'gig_worker_id' => $vetWorker->id,
            'bid_amount' => 150000,
            'proposal_message' => 'Security expert here. Ready to audit.',
            'estimated_days' => 40,
            'status' => 'accepted',
        ]);
        Project::create([
            'employer_id' => $vetEmployer->id,
            'gig_worker_id' => $vetWorker->id,
            'job_id' => $activeJob2->id,
            'bid_id' => $activeBid2->id,
            'status' => 'active',
            'agreed_amount' => 150000,
            'platform_fee' => 15000,
            'net_amount' => 135000,
            'started_at' => Carbon::now()->subDays(5),
        ]);
    }
}
