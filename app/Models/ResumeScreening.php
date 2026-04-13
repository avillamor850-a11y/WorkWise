<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeScreening extends Model
{
    use HasFactory;

    protected $fillable = [
        'gig_worker_id',
        'resume_hash',
        'resume_path',
        'status',
        'screening_result',
        'extracted_skills',
        'experience_summary',
        'strengths',
        'gaps',
        'confidence',
        'error_message',
        'screened_at',
    ];

    protected function casts(): array
    {
        return [
            'screening_result' => 'array',
            'extracted_skills' => 'array',
            'confidence' => 'decimal:2',
            'screened_at' => 'datetime',
        ];
    }

    public function gigWorker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gig_worker_id');
    }
}
