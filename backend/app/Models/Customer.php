<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone_number',
        'name',
        'total_stamps',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function stamps(): HasMany
    {
        return $this->hasMany(Stamp::class);
    }
}
