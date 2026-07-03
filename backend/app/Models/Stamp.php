<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stamp extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'order_id',
        'stamp_count',
        'redeemed',
    ];

    protected $casts = [
        'redeemed' => 'boolean',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
