<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'start_date',
        'end_date',
        'project',
        'client',
        'created_by',
        'ai_generated',
        'content',
    ];

    protected $casts = [
        'start_date'   => 'date',
        'end_date'     => 'date',
        'ai_generated' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESSORS
    |--------------------------------------------------------------------------
    */

    public function getDateRangeAttribute(): string
    {
        return $this->start_date->format('M Y') . ' – ' . $this->end_date->format('M Y');
    }
}
