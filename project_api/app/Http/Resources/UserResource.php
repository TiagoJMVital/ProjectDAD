<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\User;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'nickname' => $this->nickname,
            'type' => $this->type,
            'photoFileName' => $this->photo_filename ? '/storage/photos/' . $this->photo_filename : null,
            'brain_coins_balance' => $this->brain_coins_balance,
            'blocked' => $this->blocked,
            ];
    }
}
