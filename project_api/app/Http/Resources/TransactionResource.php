<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Request;

class TransactionResource extends JsonResource
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
            'type' => $this->type,
            'transaction_datetime' => $this->transaction_datetime,
            'user_id' => $this->user_id,
            'game_id' => $this->game_id,
            'euros' => $this->euros,
            'payment_type' => $this->payment_type,
            'payment_reference' => $this->payment_reference,
            'brain_coins' => $this->brain_coins,
            'custom' => $this->custom,
        ];
    }

    
}