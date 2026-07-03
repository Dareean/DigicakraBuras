<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_type',
        'period_value',
        'total_revenue',
        'generated_at',
        'file_url',
    ];

    protected $casts = [
        'total_revenue' => 'decimal:2',
        'generated_at' => 'datetime',
    ];
}
