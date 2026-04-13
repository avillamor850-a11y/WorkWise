<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'employer_id',
        'gig_worker_id',
        'job_id',
        'bid_id',
        'contract_id',
        'status',
        'started_at',
        'completed_at',
        'completion_notes',
        'employer_approved',
        'approved_at',
        'payment_released',
        'payment_released_at',
        'agreed_amount',
        'agreed_duration_days',
        'deadline',
        'platform_fee',
        'net_amount',
        'contract_signed',
        'contract_signed_at',
        'admin_review_requested_at',
        'admin_review_request_notes',
        'milestones',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'approved_at' => 'datetime',
        'payment_released_at' => 'datetime',
        'contract_signed_at' => 'datetime',
        'admin_review_requested_at' => 'datetime',
        'deadline' => 'datetime',
        'payment_released' => 'boolean',
        'employer_approved' => 'boolean',
        'contract_signed' => 'boolean',
        'milestones' => 'array',
        'agreed_amount' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'net_amount' => 'decimal:2',
    ];

    /**
     * Get the employer (client) who posted this project
     *
     * This is the primary relationship for accessing the employer/client user.
     * Use this instead of the deprecated client() method.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<User, Project>
     */
    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    /**
     * Get the client (deprecated - use employer)
     *
     * @deprecated Use employer() instead. This method is maintained for backward compatibility.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<User, Project>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    /**
     * Get the gig worker assigned to this project
     *
     * This is the primary relationship for accessing the gig worker user.
     * Use this instead of the deprecated freelancer() method.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<User, Project>
     */
    public function gigWorker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gig_worker_id');
    }

    /**
     * Get the freelancer (deprecated - use gigWorker)
     *
     * @deprecated Use gigWorker() instead. This method is maintained for backward compatibility.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<User, Project>
     */
    public function freelancer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gig_worker_id');
    }

    /**
     * Get the job/gig that this project is based on
     *
     * This relationship provides access to the original job posting details
     * including title, description, budget, and requirements.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<GigJob, Project>
     */
    public function job(): BelongsTo
    {
        return $this->belongsTo(GigJob::class, 'job_id');
    }

    /**
     * Get the bid that was accepted to create this project
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<Bid, Project>
     */
    public function bid(): BelongsTo
    {
        return $this->belongsTo(Bid::class, 'bid_id');
    }

    /**
     * Get all transactions associated with this project
     *
     * Includes escrow deposits, payment releases, and platform fees.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<Transaction>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function contractDeadlines(): HasMany
    {
        return $this->hasMany(ContractDeadline::class, 'contract_id');
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed' && $this->completed_at !== null;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isPendingContract(): bool
    {
        return $this->status === 'pending_contract';
    }

    public function hasSignedContract(): bool
    {
        return $this->contract_signed && $this->contract_signed_at !== null;
    }

    public function isDisputed(): bool
    {
        return $this->status === 'disputed';
    }

    public function getDaysRemainingAttribute(): int
    {
        if (! $this->deadline) {
            return 0;
        }

        return max(0, now()->diffInDays($this->deadline, false));
    }

    public function getProgressPercentageAttribute(): int
    {
        if (! $this->contractDeadlines) {
            return 0;
        }

        $completed = $this->contractDeadlines->where('status', 'completed')->count();
        $total = $this->contractDeadlines->count();

        return $total > 0 ? round(($completed / $total) * 100) : 0;
    }
}
