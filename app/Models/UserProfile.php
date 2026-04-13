<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'completeness_score',
        'activity_score_30d',
        'intent_score',
        'traits',
        'segments',
        'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'traits' => 'array',
            'segments' => 'array',
            'computed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
