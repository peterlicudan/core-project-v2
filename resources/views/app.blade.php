<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>

    <meta charset="utf-8">

    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- Laravel CSRF Token --}}
    <meta
        name="csrf-token"
        content="{{ csrf_token() }}"
    >

    <title inertia>
        {{ config('app.name', 'Crane Trucking') }}
    </title>

    {{-- Browser Tab Logo / Favicon --}}
    <link
        rel="icon"
        type="image/jpeg"
        href="/images/logo.jpg"
    >

    {{-- Optional: Apple Device Icon --}}
    <link
        rel="apple-touch-icon"
        href="/images/logo.jpg"
    >

    {{-- Fonts --}}
    <link rel="preconnect" href="https://fonts.bunny.net">

    <link
        href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap"
        rel="stylesheet"
    >

    {{-- ✅ THEME INIT — DAPAT NASA TAAS ITO PARA WALANG FLASH --}}
    <script>
        (function () {
            try {
                var stored = localStorage.getItem('alibaton-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored || (prefersDark ? 'dark' : 'light');
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } catch (e) {}
        })();
    </script>

    {{-- Vite React --}}
    @viteReactRefresh

    @vite([
        'resources/css/app.css',
        'resources/js/app.tsx'
    ])

    {{-- Inertia Head --}}
    @inertiaHead

</head>

<body class="font-sans antialiased">

    @inertia

</body>

</html>
