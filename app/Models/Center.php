<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Center extends Model
{
    use HasFactory;

    protected $table = 'medical_centers';

    protected $fillable = [
        'center_name',
        'center_code',
        'type',
        'is_online',
        'description',
        'display_name',
        'province',
        'city',
        'phone',
        'postal_code',
        'fax',
        'address',
        'longitude',
        'latitude',
        'code',
        'economic_code',
        'center_register_no',
        'is_active',
        'user_code',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'longitude' => 'float',
        'latitude' => 'float',
        'code' => 'integer',
        'user_code' => 'integer',
    ];

    public function audits(): HasMany
    {
        return $this->hasMany(Audit::class, 'center_id');
    }
}