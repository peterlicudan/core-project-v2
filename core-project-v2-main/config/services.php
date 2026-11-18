<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | Here you may configure the third-party services used by your application.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env(
                'SLACK_BOT_USER_OAUTH_TOKEN'
            ),

            'channel' => env(
                'SLACK_BOT_USER_DEFAULT_CHANNEL'
            ),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | ALIBATON AI
    |--------------------------------------------------------------------------
    */
'alibaton_ai' => [
    'api_key' => env('ALIBATON_AI_API_KEY'),
    'model' => env(
        'ALIBATON_AI_MODEL',
        'gpt-4o-mini'
    ),
    'url' => env(
        'ALIBATON_AI_URL',
        'https://api.openai.com/v1/responses'
    ),
    'name' => 'ALIBATON AI',
    'scope' => 'ALIBATON_SYSTEM_ONLY',
],

];
