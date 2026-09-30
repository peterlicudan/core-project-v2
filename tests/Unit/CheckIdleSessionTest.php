<?php

namespace Tests\Unit;

use App\Http\Middleware\CheckIdleSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class CheckIdleSessionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['session.driver' => 'array']);
    }

    private function makeRequest(array $sessionData, ?string $routeName = null, bool $asGuest = false): Request
    {
        $session = app('session')->driver();

        $request = Request::create('/dashboard', 'GET');
        $request->setLaravelSession($session);

        foreach ($sessionData as $key => $value) {
            $session->put($key, $value);
        }

        if ($routeName) {
            $route = new RoutingRoute(['POST'], 'staff/heartbeat', fn () => null);
            $route->name($routeName);
            $request->setRouteResolver(fn () => $route);
        }

        $this->app->instance('session.store', $session);
        Auth::forgetGuards();
        Auth::shouldUse('web');

        if ($asGuest) {
            Auth::forgetUser();

            return $request;
        }

        $user = new User(['name' => 'Idle Staff', 'email' => 'idle@example.com', 'role' => 'staff']);
        $user->id = 1;
        $user->exists = true;

        Auth::setUser($user);

        return $request;
    }

    /** @test */
    public function it_logs_out_after_the_idle_window(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 300,
            'session_started_at' => time() - 300,
        ]);

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame(url('/login'), $response->headers->get('Location'));
    }

    /** @test */
    public function it_keeps_the_session_when_activity_is_recent(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 60,
            'session_started_at' => time() - 60,
        ]);

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('OK', $response->getContent());
    }

    /** @test */
    public function the_heartbeat_does_not_count_as_activity(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 300,
            'session_started_at' => time() - 300,
        ], 'staff.heartbeat');

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame(url('/login'), $response->headers->get('Location'));
    }

    /** @test */
    public function a_real_page_request_refreshes_the_idle_window(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 60,
            'session_started_at' => time() - 60,
        ]);

        (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertGreaterThanOrEqual(time() - 5, $request->session()->get('last_activity_at'));
    }

    /** @test */
    public function it_logs_out_after_the_absolute_maximum_lifetime_even_while_active(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time(),
            'session_started_at' => time() - 28900,
        ]);

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(302, $response->getStatusCode());
    }

    /** @test */
    public function the_admin_notification_poll_does_not_count_as_activity(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 300,
            'session_started_at' => time() - 300,
        ], 'admin.notifications.list');

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame(url('/login'), $response->headers->get('Location'));
    }

    /** @test */
    public function it_keeps_the_session_just_under_the_backstop_window(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 200,
            'session_started_at' => time() - 200,
        ]);

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(200, $response->getStatusCode());
    }

    /** @test */
    public function it_logs_out_just_over_the_backstop_window(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 260,
            'session_started_at' => time() - 260,
        ]);

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(302, $response->getStatusCode());
    }

    /** @test */
    public function it_returns_401_for_xhr_requests_instead_of_redirecting(): void
    {
        $request = $this->makeRequest([
            'last_activity_at' => time() - 300,
            'session_started_at' => time() - 300,
        ]);

        $request->headers->set('X-Requested-With', 'XMLHttpRequest');

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(401, $response->getStatusCode());
        $this->assertNull($response->headers->get('Location'));
        $this->assertStringContainsString(
            'inactivity',
            $response->getContent() ?: '',
        );
    }

    /** @test */
    public function it_skips_guests(): void
    {
        $request = $this->makeRequest([], null, true);

        $response = (new CheckIdleSession())->handle($request, fn () => response('OK'));

        $this->assertSame(200, $response->getStatusCode());
    }
}
