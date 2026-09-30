<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],

            // ✅ Shared notifications — available sa LAHAT ng pages
            'notifications' => function () use ($user) {
                if (! $user) return [];

                return DatabaseNotification::where('notifiable_type', get_class($user))
                    ->where('notifiable_id', $user->id)
                    ->latest()
                    ->take(15)
                    ->get()
                    ->map(function ($n) {
                        return [
                            'id' => $n->id,
                            'type' => $n->type,
                            'data' => is_array($n->data)
                                ? $n->data
                                : (json_decode($n->data, true) ?? []),
                            'read_at' => $n->read_at,
                            'created_at' => $n->created_at,
                        ];
                    })
                    ->values()
                    ->toArray();
            },
        ];
    }
}
