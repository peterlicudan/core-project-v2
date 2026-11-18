<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Compliance;
use App\Models\Contract;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Payment;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminDashboardController extends Controller
{
    public function index(): Response
    {
        /*
        |----------------------------------------------------------------------
        | USER COUNTS
        |----------------------------------------------------------------------
        */
        $totalUsers = User::count();
        $adminCount = User::where('role', 'admin')->count();
        $staffCount = User::where('role', 'staff')->count();
        $clientCount = User::where('role', 'client')->count();
        $superadminCount = User::where('role', 'superadmin')->count();

        $activeUsers = User::whereNotNull('last_login_at')
            ->where('last_login_at', '>=', now()->subDays(30))
            ->count();

        /*
        |----------------------------------------------------------------------
        | JOB ORDERS
        |----------------------------------------------------------------------
        */
        $totalJobOrders = JobOrder::count();
        $pendingJobOrders = JobOrder::where('status', 'pending')->count();
        $ongoingJobOrders = JobOrder::where('status', 'ongoing')->count();
        $completedJobOrders = JobOrder::where('status', 'completed')->count();

        /*
        |----------------------------------------------------------------------
        | FINANCIAL — Revenue & Payments
        |----------------------------------------------------------------------
        */
        $paidStatuses = ['paid', 'fully paid', 'fully_paid', 'completed'];

        $totalRevenue = (float) Payment::whereIn('status', $paidStatuses)
            ->sum('amount');

        $outstandingPayments = (float) Invoice::where(function ($q) {
            $q->whereNull('status')
                ->orWhereRaw("LOWER(status) NOT IN (?, ?)", ['paid', 'rejected']);
        })->sum('amount');

        $monthlyRevenue = (float) Payment::whereIn('status', $paidStatuses)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        /*
        |----------------------------------------------------------------------
        | CONTRACTS
        |----------------------------------------------------------------------
        */
        $activeContracts = Contract::where(function ($q) {
            $q->where('status', 'active')
                ->orWhere('status', 'Active');
        })->where(function ($q) {
            $q->whereNull('archived')->orWhere('archived', false);
        })->count();

        /*
        |----------------------------------------------------------------------
        | COMPLIANCE
        |----------------------------------------------------------------------
        */
        $expiringCompliance = Compliance::whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [today(), today()->copy()->addDays(30)])
            ->count();

        $overdueCompliance = Compliance::whereNotNull('due_date')
            ->whereDate('due_date', '<', today())
            ->whereNull('completed_at')
            ->count();

        $expiringDocuments = Document::whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [today(), today()->copy()->addDays(30)])
            ->count();

        /*
        |----------------------------------------------------------------------
        | ✅ USER LISTS (for chart tooltips)
        |----------------------------------------------------------------------
        */
        $adminsList = User::where('role', 'admin')
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->take(20)
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])
            ->values();

        $staffList = User::where('role', 'staff')
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->take(20)
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])
            ->values();

        $clientsList = User::where('role', 'client')
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->take(20)
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])
            ->values();

        $superadminsList = User::where('role', 'superadmin')
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->take(20)
            ->get(['id', 'name', 'email'])
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])
            ->values();

        /*
        |----------------------------------------------------------------------
        | RECENT ACTIVITY
        |----------------------------------------------------------------------
        */
        $recentUsers = User::whereNotNull('last_login_at')
            ->latest('last_login_at')
            ->take(5)
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'last_login_at' => $user->last_login_at?->diffForHumans(),
            ])
            ->values();

        $recentJobOrders = JobOrder::latest('created_at')
            ->take(5)
            ->get()
            ->map(fn ($jo) => [
                'id' => $jo->id,
                'number' => $jo->number ?? $jo->job_order_no ?? "JO-{$jo->id}",
                'client' => $jo->client ?? '—',
                'status' => $jo->status,
                'amount' => (float) ($jo->amount ?? 0),
                'created_at' => $jo->created_at?->format('M d, Y'),
            ])
            ->values();

        $recentPayments = Payment::latest('created_at')
            ->take(5)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'receipt_number' => $p->receipt_number ?? "RCPT-{$p->id}",
                'client' => $p->client ?? '—',
                'amount' => (float) ($p->amount ?? 0),
                'status' => $p->status,
                'created_at' => $p->created_at?->format('M d, Y'),
            ])
            ->values();

        /*
        |----------------------------------------------------------------------
        | RETURN DASHBOARD
        |----------------------------------------------------------------------
        */
        return Inertia::render('SuperAdmin/Dashboard', [
            'stats' => [
                'users' => [
                    'total' => $totalUsers,
                    'admins' => $adminCount,
                    'staff' => $staffCount,
                    'clients' => $clientCount,
                    'superadmins' => $superadminCount,
                    'active' => $activeUsers,
                ],
                'job_orders' => [
                    'total' => $totalJobOrders,
                    'pending' => $pendingJobOrders,
                    'ongoing' => $ongoingJobOrders,
                    'completed' => $completedJobOrders,
                ],
                'financial' => [
                    'total_revenue' => round($totalRevenue, 2),
                    'outstanding' => round($outstandingPayments, 2),
                    'monthly_revenue' => round($monthlyRevenue, 2),
                ],
                'contracts' => [
                    'active' => $activeContracts,
                ],
                'alerts' => [
                    'expiring_compliance' => $expiringCompliance,
                    'overdue_compliance' => $overdueCompliance,
                    'expiring_documents' => $expiringDocuments,
                ],
            ],
            'recentUsers' => $recentUsers,
            'recentJobOrders' => $recentJobOrders,
            'recentPayments' => $recentPayments,
            'userLists' => [
                'admins' => $adminsList,
                'staff' => $staffList,
                'clients' => $clientsList,
                'superadmins' => $superadminsList,
            ],
            'generatedAt' => now()->format('M d, Y h:i A'),
        ]);
    }
}