<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'name',
        'email',
        'password',
        'user_type',
        'profile_completed',
        'profile_status',
        'bio',
        'phone',
        'profile_photo',
        'profile_picture',
        'company_name',
        'work_type_needed',
        'budget_range',
        'project_intent',
        // Enhanced employer fields
        'company_size',
        'industry',
        'company_website',
        'company_description',
        'primary_hiring_needs',
        'primary_hiring_skills',
        'typical_project_budget',
        'typical_project_duration',
        'preferred_experience_level',
        'hiring_frequency',
        'business_registration_document',
        'tax_id',
        'stripe_customer_id',
        'stripe_account_id',
        'stripe_account_details',
        'stripe_onboarded_at',
        'escrow_balance',
        'is_admin',
        'google_id',
        'avatar',
        'tutorial_completed',
        // Gig worker onboarding fields
        'professional_title',
        'hourly_rate',
        'skills_with_experience',
        'portfolio_link',
        'resume_file',
        'onboarding_step',
        // Location hierarchy fields
        'country',
        'registration_ip_country',
        'city',
        'street_address',
        'postal_code',
        'address_verified_at',
        // ID verification fields (admin approval)
        'id_verification_status',
        'id_verified_at',
        'id_verification_notes',
        'id_verification_required_by_admin',
        'id_front_image',
        'id_back_image',
        'id_type',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get profile picture URL with fallback
     * Returns profile_picture if set, otherwise profile_photo
     */
    public function getProfilePictureUrlAttribute(): ?string
    {
        return $this->profile_picture ?? $this->profile_photo ?? $this->avatar;
    }

    /**
     * Set profile picture and sync with profile_photo for backward compatibility
     */
    public function setProfilePictureAttribute($value): void
    {
        $this->attributes['profile_picture'] = $value;
        // Sync to profile_photo for backward compatibility
        if ($value) {
            $this->attributes['profile_photo'] = $value;
        }
    }

    /**
     * Set profile photo and sync with profile_picture for forward compatibility
     */
    public function setProfilePhotoAttribute($value): void
    {
        $this->attributes['profile_photo'] = $value;
        // Sync to profile_picture for forward compatibility
        if ($value) {
            $this->attributes['profile_picture'] = $value;
        }
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'profile_completed' => 'boolean',
            'stripe_account_details' => 'array',
            'stripe_onboarded_at' => 'datetime',
            'escrow_balance' => 'decimal:2',
            'is_admin' => 'boolean',
            'primary_hiring_needs' => 'array',
            'primary_hiring_skills' => 'array',
            'tutorial_completed' => 'boolean',
            'address_verified_at' => 'datetime',
            'id_verified_at' => 'datetime',
            // Gig worker casts
            'skills_with_experience' => 'array',
            'hourly_rate' => 'decimal:2',
            'onboarding_step' => 'integer',
        ];
    }

    /**
     * Get the user's full name
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Get the user's name (for backward compatibility)
     */
    public function getNameAttribute(): string
    {
        return $this->getFullNameAttribute();
    }


    /**
     * Check if user is an employer
     */
    public function isEmployer(): bool
    {
        return $this->user_type === 'employer';
    }

    /**
     * Check if user is a client (deprecated - use isEmployer)
     */
    public function isClient(): bool
    {
        return $this->user_type === 'client';
    }

    /**
     * Check if user is a gig worker
     */
    public function isGigWorker(): bool
    {
        return $this->user_type === 'gig_worker';
    }

    /**
     * Check if user is a freelancer (deprecated - use isGigWorker)
     */
    public function isFreelancer(): bool
    {
        return $this->user_type === 'gig_worker';
    }

    /**
     * Check if user is an admin
     */
    public function isAdmin(): bool
    {
        return $this->is_admin || $this->user_type === 'admin';
    }

    /**
     * Jobs posted by this employer
     */
    public function postedJobs(): HasMany
    {
        return $this->hasMany(GigJob::class, 'employer_id');
    }


    // Project relationships
    
    /**
     * Get all projects where this user is the employer/client
     * 
     * This is the primary relationship for accessing projects posted by this employer.
     * Use this instead of the deprecated clientProjects() method.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Project>
     */
    public function employerProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'employer_id');
    }

    /**
     * Get freelancer projects (deprecated - use gigWorkerProjects)
     *
     * @deprecated Use gigWorkerProjects() instead. This method is maintained for backward compatibility.
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Project>
     */
    public function freelancerProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'gig_worker_id');
    }

    /**
     * Get gig worker projects (projects where this user is the worker)
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Project>
     */
    public function gigWorkerProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'gig_worker_id');
    }

    // Review relationships
    public function givenReviews(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function receivedReviews(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewee_id');
    }

    // Message relationships
    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    /**
     * Bids submitted by this gig worker
     */
    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class, 'gig_worker_id');
    }

    public function receivedMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    // Transaction relationships
    public function paymentsMade(): HasMany
    {
        return $this->hasMany(Transaction::class, 'payer_id');
    }

    public function paymentsReceived(): HasMany
    {
        return $this->hasMany(Transaction::class, 'payee_id');
    }

    // Report relationships
    public function reportsSubmitted(): HasMany
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    public function reportsReceived(): HasMany
    {
        return $this->hasMany(Report::class, 'reported_user_id');
    }

    /**
     * Get average rating for this user
     */
    public function getAverageRatingAttribute(): float
    {
        return $this->receivedReviews()->avg('rating') ?? 0.0;
    }


    /**
     * Get all deposits made by this user (employer)
     * 
     * This relationship provides access to all escrow deposits made by the employer
     * for funding projects. Used in the wallet page to display deposit history.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Deposit>
     */
    public function deposits(): HasMany
    {
        return $this->hasMany(Deposit::class);
    }


    /**
     * Get job templates created by this employer
     */
    public function jobTemplates(): HasMany
    {
        return $this->hasMany(JobTemplate::class, 'employer_id');
    }

    /**
     * Skills (for gig workers) - many-to-many via skill_user pivot
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'skill_user')
            ->withTimestamps();
    }

    /**
     * Get skill names for display (from skills relation or skills_with_experience JSON)
     */
    public function getDisplaySkillNamesAttribute(): array
    {
        if ($this->relationLoaded('skills') && $this->skills->isNotEmpty()) {
            return $this->skills->pluck('name')->map(fn ($n) => (string) $n)->values()->all();
        }
        $raw = $this->skills_with_experience ?? [];
        if (!is_array($raw)) {
            return [];
        }
        return array_values(array_filter(array_map(function ($item) {
            $name = is_array($item) ? ($item['skill'] ?? $item['name'] ?? null) : $item;
            return $name ? trim((string) $name) : null;
        }, $raw)));
    }

    /**
     * Sync skill_user pivot from skills_with_experience (call after saving gig worker profile).
     * Uses SkillService to ensure skills are created with proper source and promotion is checked.
     */
    public function syncSkillsFromExperience(): void
    {
        if ($this->user_type !== 'gig_worker') {
            return;
        }
        $names = $this->getDisplaySkillNamesAttribute();
        if (empty($names)) {
            $this->skills()->detach();
            return;
        }

        $skillService = app(\App\Services\SkillService::class);
        $ids = collect($names)->map(function ($name) use ($skillService) {
            $skill = $skillService->ensureSkill($name);
            $skillService->checkPromotion($skill);
            return $skill->id;
        })->all();

        $this->skills()->sync(array_unique($ids));
    }

    /**
     * Check if user's address is verified
     */
    public function isAddressVerified(): bool
    {
        return $this->address_verified_at !== null;
    }

    /**
     * Check if user's ID is verified (id_verification_status === 'verified')
     */
    public function isIDVerified(): bool
    {
        return ($this->id_verification_status ?? '') === 'verified';
    }
}
