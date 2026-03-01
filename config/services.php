<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook' => [
            'secret' => env('STRIPE_WEBHOOK_SECRET'),
            'tolerance' => env('STRIPE_WEBHOOK_TOLERANCE', 300),
        ],
        'currency' => env('STRIPE_CURRENCY', 'php'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-3.5-turbo'),
    ],

    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
        'model' => env('OPENROUTER_MODEL', 'meta-llama/llama-4-scout:free'),
        'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    ],

    /*
    | Groq API - used by AI Recommendations (/ai-recommendations/gig-worker and /ai-recommendations/employer).
    | Set GROQ_API_KEY in .env for AI-powered recommendation insights.
    */
    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'base_url' => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    /*
    | BIR (Philippines) - Optional. Set in .env for VAT/Tax invoice PDFs.
    | BIR_COMPANY_ADDRESS=..., BIR_TIN=...
    */
    'bir' => [
        'company_address' => env('BIR_COMPANY_ADDRESS'),
        'tin' => env('BIR_TIN'),
    ],

    /*
    | IP Geolocation for fraud detection (Philippines-only platform).
    | FRAUD_SKIP_IP_COUNTRY_CHECK=true to treat all IPs as Philippines (e.g. local/VPN testing).
    */
    'ip_geolocation' => [
        'skip_check' => env('FRAUD_SKIP_IP_COUNTRY_CHECK', false),
        'default_country' => 'Philippines',
        'api_url' => env('IP_GEOLOCATION_API_URL', 'http://ip-api.com/json'),
    ],

];
