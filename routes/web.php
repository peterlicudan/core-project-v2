<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

use Illuminate\Support\Facades\DB;

use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| CONTROLLERS
|--------------------------------------------------------------------------
*/

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\AdminBillingController;
use App\Http\Controllers\Admin\AdminPaymentController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\UserRolesController;
use App\Http\Controllers\Admin\DocumentController as AdminDocumentController;
use App\Http\Controllers\DocumentController;

use App\Http\Controllers\Admin\AdminComplianceController;
use App\Http\Controllers\ComplianceController;
use App\Http\Controllers\Admin\AdminContractController;

use App\Http\Controllers\Staff\ContractPermitController;

use App\Http\Controllers\AI\AlibatonAIController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;

use App\Models\Document;
use App\Models\DocumentAccessRequest;
use App\Models\Compliance;
use App\Models\User;

use App\Http\Controllers\JobOrderController;


use App\Http\Controllers\ReportExportController;
use App\Http\Controllers\ReportController;


use App\Http\Controllers\ForecastingController;
use App\Http\Controllers\Admin\AdminForecastingController;


use App\Http\Controllers\Admin\SettingsController;

Route::get('/__migration-status', function () {
    \Illuminate\Support\Facades\Artisan::call('migrate:status');
    return response()->json([
        'status' => 'OK',
        'output' => \Illuminate\Support\Facades\Artisan::output(),
    ], 200, [], JSON_PRETTY_PRINT);
});

Route::get('/__run-migrations-now', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return response()->json([
            'status' => 'SUCCESS',
            'output' => \Illuminate\Support\Facades\Artisan::output(),
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'ERROR',
            'message' => $e->getMessage(),
        ], 500, [], JSON_PRETTY_PRINT);
    }
});


Route::get('/__fix-login-now', function () {
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    \Illuminate\Support\Facades\Artisan::call('view:clear');
    \Illuminate\Support\Facades\Artisan::call('optimize');

    $user = \App\Models\User::where('email', 'adminalibatonconstruction@gmail.com')->first();

    if ($user) {
        $user->password = \Illuminate\Support\Facades\Hash::make('password');
        $user->role = 'admin';
        $user->save();

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'Admin password reset to: password',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'db' => config('database.connections.' . config('database.default') . '.database'),
        ], 200, [], JSON_PRETTY_PRINT);
    }

    return response()->json([
        'status' => 'User not found',
        'email_searched' => 'adminalibatonconstruction@gmail.com',
    ], 404);
});


Route::get('/solutions/heavy-hauling', function () {
    return Inertia::render('Solutions/HeavyHauling');
});

Route::get('/solutions/crane-operations', function () {
    return Inertia::render('Solutions/CraneOperations');
});

Route::get('/solutions/billing-invoicing', function () {
    return Inertia::render('Solutions/BillingInvoicing');
});

Route::get('/solutions/payment-management', function () {
    return Inertia::render('Solutions/PaymentManagement');
});

Route::get('/solutions/contract-permit', function () {
    return Inertia::render('Solutions/ContractPermit');
});

/*
|--------------------------------------------------------------------------
| PUBLIC WEBSITE
|--------------------------------------------------------------------------
*/

Route::get('/', function () {

    if (Auth::check()) {

        if (Auth::user()->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return redirect()->route('dashboard');
    }

    return Inertia::render('Home');
})->name('home');


/*
|--------------------------------------------------------------------------
| PUBLIC PAGES
|--------------------------------------------------------------------------
*/

Route::get('/about', function () {
    return Inertia::render('About');
})->name('about');

Route::get('/services', function () {
    return Inertia::render('Services');
})->name('services');

Route::get('/features', function () {
    return Inertia::render('Features');
})->name('features');

Route::get('/contact', function () {
    return Inertia::render('Contact');
})->name('contact');





/*
|--------------------------------------------------------------------------
| ADMIN AUTHENTICATION
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {

    Route::get('/admin/login', [
        AdminAuthController::class,
        'create',
    ])->name('admin.login');

    Route::post('/admin/login', [
        AdminAuthController::class,
        'store',
    ])->name('admin.login.store');

    /*
    |--------------------------------------------------------------------------
    | ADMIN OTP VERIFICATION
    |--------------------------------------------------------------------------
    */

    Route::get('/admin/verify-otp', [
        AdminAuthController::class,
        'showOtp',
    ])->name('admin.otp.show');

    Route::post('/admin/verify-otp', [
        AdminAuthController::class,
        'verifyOtp',
    ])->name('admin.otp.verify');

    Route::post('/admin/resend-otp', [
        AdminAuthController::class,
        'resendOtp',
    ])->name('admin.otp.resend');
});


/*
|--------------------------------------------------------------------------
| AUTHENTICATED GENERAL ROUTES
|--------------------------------------------------------------------------
|
| Routes available after normal authentication.
|
*/

Route::middleware(['auth'])->group(function () {





    /*
    |--------------------------------------------------------------------------
    | BILLING
    |--------------------------------------------------------------------------
    */

    Route::get('/billing-invoicing', [
        InvoiceController::class,
        'index',
    ])->name('billing.invoicing');

    Route::get('/billing-invoicing/{invoice}', [
        InvoiceController::class,
        'show',
    ])->name('billing.invoicing.show');

    Route::put('/billing-invoicing/{invoice}', [
        InvoiceController::class,
        'update',
    ])->name('billing.invoicing.update');

    Route::delete('/billing-invoicing/{invoice}', [
        InvoiceController::class,
        'destroy',
    ])->name('billing.invoicing.destroy');


    /*
    |--------------------------------------------------------------------------
    | JOB ORDERS
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | LIST JOB ORDERS
    |--------------------------------------------------------------------------
    */

    Route::get('/job-orders', [
        JobOrderController::class,
        'index',
    ])->name('job-orders.index');


    /*
    |--------------------------------------------------------------------------
    | CREATE JOB ORDER
    |--------------------------------------------------------------------------
    */

    Route::post('/job-orders', [
        JobOrderController::class,
        'store',
    ])->name('job-orders.store');


    /*
    |--------------------------------------------------------------------------
    | VIEW JOB ORDER
    |--------------------------------------------------------------------------
    */

    Route::get('/job-orders/{jobOrder}', [
        JobOrderController::class,
        'show',
    ])->name('job-orders.show');


    /*
    |--------------------------------------------------------------------------
    | UPDATE JOB ORDER
    |--------------------------------------------------------------------------
    */

    Route::put('/job-orders/{jobOrder}', [
        JobOrderController::class,
        'update',
    ])->name('job-orders.update');



    /*
    |--------------------------------------------------------------------------
    | GENERATE JOB ORDER
    |--------------------------------------------------------------------------
    |
    | Approved -> Generated
    |
    */

    Route::post('/job-orders/{jobOrder}/generate', [
        JobOrderController::class,
        'generate',
    ])->name('job-orders.generate');




    /*
    |--------------------------------------------------------------------------
    | DELETE JOB ORDER
    |--------------------------------------------------------------------------
    */

    Route::delete('/job-orders/{jobOrder}', [
        JobOrderController::class,
        'destroy',
    ])->name('job-orders.destroy');
});


/*
|--------------------------------------------------------------------------
| ADMIN MODULE
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth',
    'check.idle',
    'admin',
])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {





        /*
|--------------------------------------------------------------------------
| ADMIN ARCHIVE & RESTORE DOCUMENT
|--------------------------------------------------------------------------
*/
        Route::put('/documents/{document}/archive', [
            AdminDocumentController::class,
            'archive',
        ])->name('documents.archive');

        Route::put('/documents/{document}/restore', [
            AdminDocumentController::class,
            'restore',
        ])->name('documents.restore');

        Route::get('/dashboard', function () {

            /*
    |--------------------------------------------------------------------------
    | COUNTS
    |--------------------------------------------------------------------------
    */

            $staffCount = User::query()
                ->where('role', 'staff')
                ->count();

            $clientCount = User::query()
                ->where('role', 'client')
                ->count();

            $invoiceCount = \App\Models\Invoice::query()
                ->count();

            $paymentCount = \App\Models\Payment::query()
                ->count();

            $jobOrderCount = \App\Models\JobOrder::query()
                ->count();

            $contractCount = \App\Models\Contract::query()
                ->count();

            $permitCount = \App\Models\ContractPermit::query()
                ->count();

            $documentCount = Document::query()
                ->count();

            $complianceCount = Compliance::query()
                ->count();


            /*
    |--------------------------------------------------------------------------
    | FINANCIAL TOTALS
    |--------------------------------------------------------------------------
    */

            $paymentTotal = (float) \App\Models\Payment::query()
                ->sum('amount');

            $invoiceTotal = (float) \App\Models\Invoice::query()
                ->sum('amount');


            /*
    |--------------------------------------------------------------------------
    | SYSTEM INDICATORS
    |--------------------------------------------------------------------------
    */

            $onlineStaffCount = User::query()
                ->where('role', 'staff')
                ->whereNotNull('last_login_at')
                ->where(
                    'last_login_at',
                    '>=',
                    now()->subMinutes(2)
                )
                ->count();

            $overdueInvoices = \App\Models\Invoice::query()
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', today())
                ->where(function ($query) {
                    $query
                        ->whereNull('status')
                        ->orWhereRaw(
                            'LOWER(status) NOT IN (?, ?)',
                            [
                                'paid',
                                'rejected',
                            ]
                        );
                })
                ->count();

            $expiringDocuments = Document::query()
                ->whereNotNull('expiry_date')
                ->whereBetween(
                    'expiry_date',
                    [
                        today(),
                        today()->copy()->addDays(30),
                    ]
                )
                ->count();

            $expiredDocuments = Document::query()
                ->whereNotNull('expiry_date')
                ->whereDate(
                    'expiry_date',
                    '<',
                    today()
                )
                ->count();

            $overdueCompliance = Compliance::query()
                ->whereNotNull('due_date')
                ->whereDate(
                    'due_date',
                    '<',
                    today()
                )
                ->whereNull('completed_at')
                ->count();


            /*
    |--------------------------------------------------------------------------
    | STAFF + CLIENT RECORDS
    |--------------------------------------------------------------------------
    */

            $recentUsers = User::query()
                ->whereIn('role', ['staff', 'client'])
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($user) {

                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,

                        'last_login_at' => optional(
                            $user->last_login_at
                        )->format('M d, Y h:i A'),

                        'created_at' => optional(
                            $user->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | INVOICES
    |--------------------------------------------------------------------------
    */

            $recentInvoices = \App\Models\Invoice::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($invoice) {

                    return [
                        'id' => $invoice->id,
                        'number' => $invoice->number,
                        'client' => $invoice->client,
                        'project' => $invoice->project,

                        'amount' => (float) (
                            $invoice->amount ?? 0
                        ),

                        'status' => $invoice->status,

                        'due_date' => optional(
                            $invoice->due_date
                        )->format('Y-m-d'),

                        'client_email' => $invoice->client_email,

                        'created_at' => optional(
                            $invoice->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    */

            $recentPayments = \App\Models\Payment::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($payment) {

                    return [
                        'id' => $payment->id,

                        'receipt_number' =>
                        $payment->receipt_number,

                        'invoice_number' =>
                        $payment->invoice_number,

                        'client' =>
                        $payment->client,

                        'client_email' =>
                        $payment->client_email,

                        'amount' => (float) (
                            $payment->amount ?? 0
                        ),

                        'status' =>
                        $payment->status,

                        'payment_method' =>
                        $payment->payment_method,

                        'payment_date' => optional(
                            $payment->payment_date
                        )->format('Y-m-d'),

                        'partial_date' => optional(
                            $payment->partial_date
                        )->format('Y-m-d'),

                        'due_date' => optional(
                            $payment->due_date
                        )->format('Y-m-d'),

                        'created_at' => optional(
                            $payment->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | JOB ORDERS
    |--------------------------------------------------------------------------
    */

            $recentJobOrders = \App\Models\JobOrder::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($jobOrder) {

                    return [
                        'id' => $jobOrder->id,

                        'number' =>
                        $jobOrder->number,

                        'client' =>
                        $jobOrder->client,

                        'client_email' =>
                        $jobOrder->client_email,

                        'project' =>
                        $jobOrder->project,

                        'location' =>
                        $jobOrder->location,

                        'equipment' =>
                        $jobOrder->equipment,

                        'operator' =>
                        $jobOrder->operator,

                        'amount' => (float) (
                            $jobOrder->amount ?? 0
                        ),

                        'status' =>
                        $jobOrder->status,

                        'start_date' => optional(
                            $jobOrder->start_date
                        )->format('Y-m-d'),

                        'end_date' => optional(
                            $jobOrder->end_date
                        )->format('Y-m-d'),

                        'created_at' => optional(
                            $jobOrder->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | CONTRACTS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Contract has its own table/schema.
    |
    */

            $recentContracts = \App\Models\Contract::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($contract) {

                    return [
                        'id' => $contract->id,

                        'contract_no' =>
                        $contract->contract_no,

                        'client' =>
                        $contract->client,

                        'email' =>
                        $contract->email,

                        'project' =>
                        $contract->project,

                        'location' =>
                        $contract->location,

                        'type' =>
                        $contract->type,

                        'contract_type' =>
                        $contract->contract_type,

                        'equipment' =>
                        $contract->equipment,

                        'status' =>
                        $contract->status,

                        'workflow_status' =>
                        $contract->workflow_status,

                        'start_date' => optional(
                            $contract->start_date
                        )->format('Y-m-d'),

                        'end_date' => optional(
                            $contract->end_date
                        )->format('Y-m-d'),

                        'invoice_id' =>
                        $contract->invoice_id,

                        'invoice_approved' =>
                        $contract->isInvoiceApproved(),

                        'archived' =>
                        (bool) $contract->archived,

                        'created_at' => optional(
                            $contract->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | PERMITS / CONTRACT-PERMIT RECORDS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | ContractPermit has several possible field aliases.
    | Use the model helpers so the dashboard reflects the
    | actual saved record.
    |
    */

            $recentContractPermits = \App\Models\ContractPermit::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($permit) {

                    return [
                        'id' => $permit->id,

                        'number' =>
                        $permit->getNumber(),

                        'title' =>
                        $permit->title
                            ?? $permit->name
                            ?? 'Untitled Record',

                        'type' =>
                        $permit->type,

                        'contract_type' =>
                        $permit->contract_type,

                        'client' =>
                        $permit->getClient(),

                        'client_email' =>
                        $permit->client_email
                            ?? $permit->email,

                        'project' =>
                        $permit->project
                            ?? $permit->project_name,

                        'location' =>
                        $permit->location,

                        'status' =>
                        $permit->status,

                        'workflow_status' =>
                        $permit->workflow_status,

                        'start_date' => optional(
                            $permit->start_date
                        )->format('Y-m-d'),

                        'issue_date' => optional(
                            $permit->issue_date
                        )->format('Y-m-d'),

                        'end_date' => optional(
                            $permit->end_date
                        )->format('Y-m-d'),

                        'expiry_date' => optional(
                            $permit->expiry_date
                        )->format('Y-m-d'),

                        'invoice_id' =>
                        $permit->invoice_id,

                        'invoice_approved' =>
                        $permit->isInvoiceApproved(),

                        'archived' =>
                        $permit->isArchived(),

                        'created_at' => optional(
                            $permit->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | DOCUMENTS
    |--------------------------------------------------------------------------
    */

            $recentDocuments = Document::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($document) {

                    return [
                        'id' =>
                        $document->id,

                        'title' =>
                        $document->title,

                        'file_name' =>
                        $document->file_name,

                        'document_type' =>
                        $document->document_type,

                        'type' =>
                        $document->type,

                        'status' =>
                        $document->status,

                        'expiry_date' => optional(
                            $document->expiry_date
                        )->format('Y-m-d'),

                        'compliance_status' =>
                        $document->compliance_status,

                        'created_at' => optional(
                            $document->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | COMPLIANCE
    |--------------------------------------------------------------------------
    */

            $recentCompliance = Compliance::query()
                ->latest('created_at')
                ->take(8)
                ->get()
                ->map(function ($record) {

                    return [
                        'id' =>
                        $record->id,

                        'title' =>
                        $record->title,

                        'type' =>
                        $record->type,

                        'status' =>
                        $record->status,

                        'due_date' => optional(
                            $record->due_date
                        )->format('Y-m-d'),

                        'expiry_date' => optional(
                            $record->expiry_date
                        )->format('Y-m-d'),

                        'priority' =>
                        $record->priority,

                        'progress_percentage' =>
                        (int) (
                            $record->progress_percentage ?? 0
                        ),

                        'regulatory_body' =>
                        $record->regulatory_body,

                        'reference_number' =>
                        $record->reference_number,

                        'created_at' => optional(
                            $record->created_at
                        )->format('M d, Y h:i A'),
                    ];
                })
                ->values();


            /*
    |--------------------------------------------------------------------------
    | RETURN DASHBOARD
    |--------------------------------------------------------------------------
    */

            return Inertia::render(
                'Admin/AdminDashboard',
                [

                    'stats' => [

                        'staff' =>
                        $staffCount,

                        'clients' =>
                        $clientCount,

                        'invoices' =>
                        $invoiceCount,

                        'payments' =>
                        $paymentCount,

                        'payment_total' =>
                        $paymentTotal,

                        'invoice_total' =>
                        $invoiceTotal,

                        'job_orders' =>
                        $jobOrderCount,

                        'contracts' =>
                        $contractCount,

                        'contract_permits' =>
                        $permitCount,

                        'documents' =>
                        $documentCount,

                        'compliance' =>
                        $complianceCount,

                        'online_staff' =>
                        $onlineStaffCount,

                        'overdue_invoices' =>
                        $overdueInvoices,

                        'expiring_documents' =>
                        $expiringDocuments,

                        'expired_documents' =>
                        $expiredDocuments,

                        'overdue_compliance' =>
                        $overdueCompliance,
                    ],

                    'details' => [

                        'staff' =>
                        $recentUsers
                            ->where('role', 'staff')
                            ->values(),

                        'clients' =>
                        $recentUsers
                            ->where('role', 'client')
                            ->values(),

                        'invoices' =>
                        $recentInvoices,

                        'payments' =>
                        $recentPayments,

                        'job_orders' =>
                        $recentJobOrders,

                        'contracts' =>
                        $recentContracts,

                        'contract_permits' =>
                        $recentContractPermits,

                        'documents' =>
                        $recentDocuments,

                        'compliance' =>
                        $recentCompliance,
                    ],

                    'generatedAt' =>
                    now()->format('M d, Y h:i A'),
                ]
            );
        })->name('dashboard');

        /*
        |--------------------------------------------------------------------------
        | CLIENT ACCOUNTS
        |--------------------------------------------------------------------------
        */

        Route::get('/client-accounts', [
            UserManagementController::class,
            'index',
        ])->name('client.accounts');

        Route::post('/client-accounts', [
            UserManagementController::class,
            'store',
        ])->name('client.accounts.store');

        Route::put('/client-accounts/{user}', [
            UserManagementController::class,
            'update',
        ])->name('client.accounts.update');

        Route::delete('/client-accounts/{user}', [
            UserManagementController::class,
            'destroy',
        ])->name('client.accounts.destroy');


        /*
          /*
        |--------------------------------------------------------------------------
        | USER ROLES / STAFF
        |--------------------------------------------------------------------------
        */

        Route::get('/user-roles', [
            UserRolesController::class,
            'index',
        ])->name('user.roles');

        Route::post('/create-user', [
            UserRolesController::class,
            'store',
        ])->name('create.user');

        Route::put('/create-user/{user}', [
            UserRolesController::class,
            'update',
        ])->name('update.user');

        // ✅ IDAGDAG MO ITO — DELETE STAFF
        Route::delete('/create-user/{user}', [
            UserRolesController::class,
            'destroy',
        ])->name('destroy.user');

        // ✅ IDAGDAG MO ITO — RESTORE STAFF (para gumana yung "Restore" sa Deleted Staff modal)
        Route::post('/create-user/{user}/restore', [
            UserRolesController::class,
            'restore',
        ])->name('restore.user');

      /*
        |--------------------------------------------------------------------------
        | ADMIN DOCUMENTS + COMPLIANCE
        |--------------------------------------------------------------------------
        */

        /* ============ SPECIFIC ROUTES (UNA) ============ */

        Route::post('/documents', [
            AdminDocumentController::class,
            'store',
        ])->name('documents.store');

        Route::get('/documents/{document}/download', [
            AdminDocumentController::class,
            'download',
        ])->name('documents.download');

        Route::get('/documents/{document}/attachments/{attachment}/download', [
            AdminDocumentController::class,
            'downloadAttachment',
        ])->name('documents.download-attachment');

        Route::get('/documents/{document}/download-all', [
            AdminDocumentController::class,
            'downloadAll',
        ])->name('documents.download-all');

        Route::put('/documents/{document}/archive', [
            AdminDocumentController::class,
            'archive',
        ])->name('documents.archive');

        Route::put('/documents/{document}/restore', [
            AdminDocumentController::class,
            'restore',
        ])->name('documents.restore');

        Route::post('/documents/{document}/grant-permission', [
            AdminDocumentController::class,
            'grantPermission',
        ])->name('documents.grant-permission');

        Route::delete('/documents/{document}/revoke-permission/{staffId}', [
            AdminDocumentController::class,
            'revokePermission',
        ])->name('documents.revoke-permission');

        Route::patch('/document-access-requests/{accessRequest}/reject', [
            AdminDocumentController::class,
            'rejectAccessRequest',
        ])->name('documents.access-requests.reject');

        /* ============ GENERIC ROUTES (HULI) ============ */

   Route::put('/documents/{document}', [
    AdminDocumentController::class,
    'update',
])->name('documents.update');

/* ✅ RESTORE DELETED — IDAGDAG MO ITO */
Route::put('/documents/{id}/restore-deleted', [
    AdminDocumentController::class,
    'restoreDeleted',
])->name('documents.restore-deleted');

/* ✅ FORCE DELETE — IDAGDAG MO ITO */
Route::delete('/documents/{id}/force-delete', [
    AdminDocumentController::class,
    'forceDelete',
])->name('documents.force-delete');

Route::delete('/documents/{document}', [
    AdminDocumentController::class,
    'destroy',
])->name('documents.destroy');

        /* ============ COMPLIANCE PAGE ============ */

        Route::get('/documents-compliance', [
            AdminDocumentController::class,
            'index',
        ])->name('documents.compliance');

        Route::get('/documents', function () {
            return redirect()->route('admin.documents.compliance');
        })->name('documents');


        /*
        |--------------------------------------------------------------------------
        | ADMIN DOCUMENTS ALIAS
        |--------------------------------------------------------------------------
        */

        Route::get('/documents', function () {

            return redirect()->route(
                'admin.documents.compliance'
            );
        })->name('documents');




        /*
|--------------------------------------------------------------------------
| ADMIN COMPLIANCE - FULL CRUD
|--------------------------------------------------------------------------
*/

        // ✅ LAHAT NG CRUD - AdminComplianceController (may file handling)
        Route::post('/compliance', [AdminComplianceController::class, 'store'])->name('compliance.store');
        Route::put('/compliance/{compliance}', [AdminComplianceController::class, 'update'])->name('compliance.update');
        Route::delete('/compliance/{compliance}', [AdminComplianceController::class, 'destroy'])->name('compliance.destroy');

        // Additional Actions (keep as is kung may ibang controller)
        Route::post('/compliance/{compliance}/complete', [ComplianceController::class, 'complete'])->name('compliance.complete');
        Route::post('/compliance/{compliance}/progress', [ComplianceController::class, 'updateProgress'])->name('compliance.progress');
        Route::post('/compliance/{compliance}/review', [ComplianceController::class, 'review'])->name('compliance.review');
        Route::post('/compliance/{compliance}/archive', [ComplianceController::class, 'archive'])->name('compliance.archive');
        Route::post('/compliance/{compliance}/restore', [ComplianceController::class, 'restore'])->name('compliance.restore');

        // Statistics & Bulk Operations (keep as is)
        Route::get('/compliance/statistics', [ComplianceController::class, 'statistics'])->name('compliance.statistics');
        Route::post('/compliance/bulk-archive', [ComplianceController::class, 'bulkArchive'])->name('compliance.bulk-archive');
        Route::post('/compliance/bulk-delete', [ComplianceController::class, 'bulkDelete'])->name('compliance.bulk-delete');
        /*
        |--------------------------------------------------------------------------
        | ADMIN BILLING
        |--------------------------------------------------------------------------
        */

        Route::get('/billing', [
            AdminBillingController::class,
            'index',
        ])->name('billing');

        Route::post('/billing', [
            AdminBillingController::class,
            'store',
        ])->name('billing.store');

        Route::put('/billing/{invoice}', [
            AdminBillingController::class,
            'update',
        ])->name('billing.update');

        Route::put('/billing/{invoice}/status', [
            AdminBillingController::class,
            'updateStatus',
        ])->name('billing.status');

        Route::delete('/billing/{invoice}', [
            AdminBillingController::class,
            'destroy',
        ])->name('billing.destroy');




        /*
        |--------------------------------------------------------------------------
        | ADMIN BILLING - APPROVE & REJECT
        |--------------------------------------------------------------------------
        */

        Route::post('/billing/{invoice}/approve', [
            AdminBillingController::class,
            'approve',
        ])->name('billing.approve');

        Route::post('/billing/{invoice}/reject', [
            AdminBillingController::class,
            'reject',
        ])->name('billing.reject');

        Route::post('/billing/{invoice}/send-email', [
            AdminBillingController::class,
            'sendEmail',
        ])->name('billing.send-email');

        /*
        |--------------------------------------------------------------------------
        | ADMIN NOTIFICATIONS
        |--------------------------------------------------------------------------
        */

        Route::post('/notifications/{notification}/read', [
            AdminBillingController::class,
            'markNotificationAsRead',
        ])->name('notifications.read');

        Route::post('/notifications/mark-all-read', [
            AdminBillingController::class,
            'markAllNotificationsAsRead',
        ])->name('notifications.mark-all-read');


        /*
        |--------------------------------------------------------------------------
        | ADMIN PAYMENTS
        |--------------------------------------------------------------------------
        */

        Route::get('/payments', [
            AdminPaymentController::class,
            'index',
        ])->name('payments');

        Route::get('/payments/{payment}/balance', [
            AdminPaymentController::class,
            'balance',
        ])->name('payments.balance');

        Route::put('/payments/{payment}/verify', [
            AdminPaymentController::class,
            'verify',
        ])->name('payments.verify');

        Route::put('/payments/{payment}/partial', [
            AdminPaymentController::class,
            'partial',
        ])->name('payments.partial');

        Route::put('/payments/{payment}/reject', [
            AdminPaymentController::class,
            'reject',
        ])->name('payments.reject');

        Route::post('/payments/{payment}/notify', [
            AdminPaymentController::class,
            'notify',
        ])->name('payments.notify');

        Route::put('/payments/{payment}', [
            AdminPaymentController::class,
            'update',
        ])->name('payments.update');

        Route::put('/payments/{payment}/archive', [
            AdminPaymentController::class,
            'archive',
        ])->name('payments.archive');

        Route::put('/payments/{payment}/unarchive', [
            AdminPaymentController::class,
            'unarchive',
        ])->name('payments.unarchive');

        Route::delete('/payments/{payment}', [
            AdminPaymentController::class,
            'destroy',
        ])->name('payments.destroy');


        /*
|--------------------------------------------------------------------------
| ADMIN CONTRACTS & PERMITS
|--------------------------------------------------------------------------
*/

        Route::get('/contracts', [
            AdminContractController::class,
            'index',
        ])->name('contracts.index');  // <-- IDAGDAG ANG .index

        // UPDATE - Update contract
        Route::put('/contracts/{contract}', [
            AdminContractController::class,
            'update',
        ])->name('contracts.update');

        // APPROVE INVOICE - Approve invoice for contract
        Route::put('/contracts/{contract}/approve-invoice', [
            AdminContractController::class,
            'approveInvoice',
        ])->name('contracts.approve-invoice');

        // UPDATE STATUS - Change status
        Route::put('/contracts/{contract}/status', [
            AdminContractController::class,
            'updateStatus',
        ])->name('contracts.status');

        // APPROVE - Approve contract
        Route::put('/contracts/{contract}/approve', [
            AdminContractController::class,
            'approve',
        ])->name('contracts.approve');


        Route::put(
            '/contracts/{contract}/return-correction',
            [AdminContractController::class, 'returnForCorrection']
        )->name('contracts.return-correction');


         // ✅ ADMIN CONTRACT DOWNLOAD ROUTES
        Route::get('/contracts/{contract}/download-contract', [
            AdminContractController::class,
            'downloadContract',
        ])->name('contracts.download.contract');

        Route::get('/contracts/{contract}/download-signed', [
            AdminContractController::class,
            'downloadSignedContract',
        ])->name('contracts.download.signed');


        // ARCHIVE - Archive contract
        Route::put('/contracts/{contract}/archive', [
            AdminContractController::class,
            'archive',
        ])->name('contracts.archive');

        // RESTORE - Restore contract
        Route::put('/contracts/{contract}/restore', [
            AdminContractController::class,
            'restore',
        ])->name('contracts.restore');

        // NOTIFY - Send email to client
        Route::post('/contracts/{contract}/notify', [
            AdminContractController::class,
            'notify',
        ])->name('contracts.notify');

        // DELETE - Permanently delete
        Route::delete('/contracts/{contract}', [
            AdminContractController::class,
            'destroy',
        ])->name('contracts.destroy');

        Route::get('/reports/export/csv', [ReportController::class, 'exportCsv'])
            ->name('reports.export.csv');

        Route::get('/reports/export/pdf', [ReportController::class, 'exportPdf'])
            ->name('reports.export.pdf');

        Route::get('/reports/export/excel', [ReportController::class, 'exportExcel'])
            ->name('reports.export.excel');






     /*
|--------------------------------------------------------------------------
| ADMIN REPORTS
|--------------------------------------------------------------------------
*/

// Inertia page — nagre-render ng Admin/ReportManagement.tsx
Route::get('/reports', function () {
    return Inertia::render('Admin/ReportManagement');
})->name('reports');

// JSON API — kinokonsumo ng Admin/ReportManagement.tsx
Route::get('/reports/list',             [\App\Http\Controllers\Admin\AdminReportController::class, 'index'])->name('reports.list');
Route::get('/reports/filter-options',   [\App\Http\Controllers\Admin\AdminReportController::class, 'filterOptions'])->name('reports.filter-options');
Route::post('/reports/save',            [\App\Http\Controllers\Admin\AdminReportController::class, 'save'])->name('reports.save');
Route::delete('/reports/{id}',          [\App\Http\Controllers\Admin\AdminReportController::class, 'destroy'])->name('reports.destroy');

// Company-wide summary breakdowns
Route::get('/reports/summary/by-user',   [\App\Http\Controllers\Admin\AdminReportController::class, 'summaryByUser'])->name('reports.summary.by-user');
Route::get('/reports/summary/by-type',   [\App\Http\Controllers\Admin\AdminReportController::class, 'summaryByType'])->name('reports.summary.by-type');
Route::get('/reports/summary/by-client', [\App\Http\Controllers\Admin\AdminReportController::class, 'summaryByClient'])->name('reports.summary.by-client');


      /*
|--------------------------------------------------------------------------
| ADMIN SETTINGS
|--------------------------------------------------------------------------
*/

Route::get('/settings', [
    SettingsController::class,
    'index',
])->name('settings');

Route::put('/settings/profile', [
    SettingsController::class,
    'updateProfile',
])->name('settings.profile');

Route::put('/settings/password', [
    SettingsController::class,
    'updatePassword',
])->name('settings.password');

/*
|--------------------------------------------------------------------------
| ADMIN LOGOUT
|--------------------------------------------------------------------------
*/

Route::post('/logout', [
    AdminAuthController::class,
    'destroy',
])->middleware('auth')->name('logout');
              /*
        |--------------------------------------------------------------------------
        | ADMIN FORECASTING
        |--------------------------------------------------------------------------
        */

        Route::get('/forecasting', [
            AdminForecastingController::class,
            'index',
        ])->name('forecasting');

        Route::get('/forecasting/data', [
            AdminForecastingController::class,
            'data',
        ])->name('forecasting.data');

      /*
        |--------------------------------------------------------------------------
        | ADMIN JOB ORDER APPROVAL
        |--------------------------------------------------------------------------
        */

        Route::post('/job-orders/{jobOrder}/approve', [
            \App\Http\Controllers\JobOrderController::class,
            'approve',
        ])->name('job-orders.approve');

        Route::post('/job-orders/{jobOrder}/reject', [
            \App\Http\Controllers\JobOrderController::class,
            'reject',
        ])->name('job-orders.reject');
    });



/*
|--------------------------------------------------------------------------
| AUTHENTICATED USER / STAFF / CLIENT
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth',
    'check.idle',
    'login.pin',
])->group(function () {

    Route::get('/dashboard', function () {

        /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */

        $user = Auth::user();

        $userId = (int) $user->id;

        $today = now()->startOfDay();


        /*
    |--------------------------------------------------------------------------
    | INVOICES
    |--------------------------------------------------------------------------
    */

        $invoices = \App\Models\Invoice::query()
            ->where('user_id', $userId)
            ->latest('updated_at')
            ->get();


        /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    |
    | Archived payments are excluded from the active dashboard.
    |
    */

        $payments = \App\Models\Payment::query()
            ->where('user_id', $userId)
            ->where(function ($query) {

                $query
                    ->where('archived', false)
                    ->orWhereNull('archived');
            })
            ->latest('updated_at')
            ->get();


        /*
    |--------------------------------------------------------------------------
    | CONTRACTS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Your actual assignment column is assigned_to.
    | NOT assigned_staff.
    |
    */

        $contracts = \App\Models\Contract::query()
            ->where(function ($query) use ($userId) {
                $query
                    ->where('assigned_to', $userId)
                    ->orWhere('submitted_by', $userId);
            })
            ->where(function ($query) {
                $query
                    ->where('archived', false)
                    ->orWhereNull('archived');
            })
            ->latest('updated_at')
            ->get();

        /*
    |--------------------------------------------------------------------------
    | DOCUMENTS
    |--------------------------------------------------------------------------
    |
    | Use the same access rules as the Staff Documents page.
    | This prevents locked/inaccessible company documents from
    | being counted on the dashboard.
    |
    */

        $documents = Document::query()
            ->latest('updated_at')
            ->get()
            ->filter(function (Document $document) use ($user) {

                return $document->canBeAccessedBy($user);
            })
            ->values();


        /*
    |--------------------------------------------------------------------------
    | COMPLIANCE
    |--------------------------------------------------------------------------
    |
    | Staff can see:
    | - Records assigned to them
    | - Records assigned to everyone
    |
    */

        $compliances = Compliance::query()
            ->where(function ($query) use ($userId) {

                $query
                    ->where('assigned_to', $userId)
                    ->orWhereNull('assigned_to');
            })
            ->latest('updated_at')
            ->get();


        /*
    |--------------------------------------------------------------------------
    | JOB ORDERS
    |--------------------------------------------------------------------------
    |
    | Included in Recent Activity so Job Orders are also connected
    | to the Staff Dashboard.
    |
    */

        $jobOrders = \App\Models\JobOrder::query()
            ->where('user_id', $userId)
            ->latest('updated_at')
            ->get();


        /*
    |--------------------------------------------------------------------------
    | PERSONAL KPI
    |--------------------------------------------------------------------------
    */

        $invoiceCount = $invoices->count();

        $paymentCount = $payments->count();

        $contractCount = $contracts->count();

        $documentCount = $documents->count();


        /*
    |--------------------------------------------------------------------------
    | PAYMENT SUMMARY
    |--------------------------------------------------------------------------
    |
    | The actual amounts are calculated from the database.
    | Your React dashboard still masks them as **** for privacy.
    |
    */

        $totalBilled = (float) $invoices->sum(function ($invoice) {

            return (float) ($invoice->amount ?? 0);
        });


        $paidAmount = (float) $payments
            ->filter(function ($payment) {

                $status = strtolower(
                    trim((string) $payment->status)
                );

                return in_array($status, [
                    'paid',
                    'fully paid',
                    'fully_paid',
                    'completed',
                ], true);
            })
            ->sum(function ($payment) {

                return (float) ($payment->amount ?? 0);
            });


        $partialAmount = (float) $payments
            ->filter(function ($payment) {

                $status = strtolower(
                    trim((string) $payment->status)
                );

                return in_array($status, [
                    'partial',
                    'partially paid',
                    'partially_paid',
                ], true);
            })
            ->sum(function ($payment) {

                return (float) ($payment->amount ?? 0);
            });


        $pendingAmount = max(
            0,
            $totalBilled -
                $paidAmount -
                $partialAmount
        );


        /*
    |--------------------------------------------------------------------------
    | OVERDUE INVOICES
    |--------------------------------------------------------------------------
    */

        $overdueAmount = (float) $invoices
            ->filter(function ($invoice) use ($today) {

                if (!$invoice->due_date) {
                    return false;
                }

                $status = strtolower(
                    trim((string) $invoice->status)
                );

                $isPaid = in_array($status, [
                    'paid',
                    'fully paid',
                    'fully_paid',
                    'completed',
                ], true);

                return
                    !$isPaid &&
                    $invoice->due_date->lt($today);
            })
            ->sum(function ($invoice) {

                return (float) ($invoice->amount ?? 0);
            });


        /*
    |--------------------------------------------------------------------------
    | COMPLIANCE SUMMARY
    |--------------------------------------------------------------------------
    */

        $verifiedCount = 0;

        $pendingComplianceCount = 0;

        $expiredComplianceCount = 0;


        foreach ($compliances as $compliance) {

            $status = strtolower(
                trim((string) $compliance->status)
            );


            $isExpiredByDate =
                $compliance->expiry_date &&
                $compliance->expiry_date->lt($today);


            $isExpiredByStatus =
                $status === 'expired';


            if (
                $isExpiredByDate ||
                $isExpiredByStatus
            ) {

                $expiredComplianceCount++;

                continue;
            }


            if (in_array($status, [
                'verified',
                'approved',
                'complete',
                'completed',
                'compliant',
                'valid',
                'active',
            ], true)) {

                $verifiedCount++;

                continue;
            }


            /*
        | Unknown/non-final statuses are treated as pending
        | instead of incorrectly marking them as verified.
        */

            $pendingComplianceCount++;
        }


        $complianceTotal =
            $compliances->count();


        $compliancePercentage =
            $complianceTotal > 0
            ? (int) round(
                ($verifiedCount / $complianceTotal) * 100
            )
            : 0;


        /*
    |--------------------------------------------------------------------------
    | COMPLIANCE STANDING
    |--------------------------------------------------------------------------
    */

        if ($expiredComplianceCount > 0) {

            $complianceStanding =
                'Action Required';
        } elseif ($pendingComplianceCount > 0) {

            $complianceStanding =
                'Needs Attention';
        } else {

            $complianceStanding =
                'Good Standing';
        }


        /*
    |--------------------------------------------------------------------------
    | RECENT ACTIVITY
    |--------------------------------------------------------------------------
    */

        $recentActivities = collect();


        /*
    | INVOICES
    */

        foreach (
            $invoices->take(8)
            as $invoice
        ) {

            $recentActivities->push([

                'id' =>
                'invoice-' . $invoice->id,

                'icon' =>
                'invoice',

                'title' =>
                'Invoice activity',

                'description' =>
                'Billing & Invoicing' .
                    (
                        $invoice->number
                        ? ' • ' . $invoice->number
                        : ''
                    ),

                'time' =>
                optional(
                    $invoice->updated_at
                )->diffForHumans(),

                'type' =>
                'yellow',

                'sort_date' =>
                optional(
                    $invoice->updated_at
                )->timestamp ?? 0,
            ]);
        }


        /*
    | PAYMENTS
    */

        foreach (
            $payments->take(8)
            as $payment
        ) {

            $paymentReference =
                $payment->receipt_number
                ?: $payment->receipt
                ?: $payment->invoice_number;


            $recentActivities->push([

                'id' =>
                'payment-' . $payment->id,

                'icon' =>
                'payment',

                'title' =>
                'Payment status updated',

                'description' =>
                'Payment record' .
                    (
                        $paymentReference
                        ? ' • ' . $paymentReference
                        : ''
                    ),

                'time' =>
                optional(
                    $payment->updated_at
                )->diffForHumans(),

                'type' =>
                'green',

                'sort_date' =>
                optional(
                    $payment->updated_at
                )->timestamp ?? 0,
            ]);
        }


        /*
    | COMPLIANCE
    */

        foreach (
            $compliances->take(8)
            as $compliance
        ) {

            $status = strtolower(
                trim((string) $compliance->status)
            );


            $isVerified = in_array($status, [
                'verified',
                'approved',
                'complete',
                'completed',
                'compliant',
                'valid',
                'active',
            ], true);


            $recentActivities->push([

                'id' =>
                'compliance-' . $compliance->id,

                'icon' =>
                'compliance',

                'title' =>
                $isVerified
                    ? 'Compliance document verified'
                    : 'Compliance updated',

                'description' =>
                $compliance->title
                    ?: ($compliance->type ?: 'Compliance record'),

                'time' =>
                optional(
                    $compliance->updated_at
                )->diffForHumans(),

                'type' =>
                'blue',

                'sort_date' =>
                optional(
                    $compliance->updated_at
                )->timestamp ?? 0,
            ]);
        }


        /*
    | CONTRACTS
    */

        foreach (
            $contracts->take(8)
            as $contract
        ) {

            $contractReference =
                $contract->contract_no
                ?: $contract->project
                ?: $contract->client;


            $recentActivities->push([

                'id' =>
                'contract-' . $contract->id,

                'icon' =>
                'contract',

                'title' =>
                'Contract updated',

                'description' =>
                $contractReference
                    ?: 'Contract record',

                'time' =>
                optional(
                    $contract->updated_at
                )->diffForHumans(),

                'type' =>
                'purple',

                'sort_date' =>
                optional(
                    $contract->updated_at
                )->timestamp ?? 0,
            ]);
        }


        /*
    | JOB ORDERS
    */

        foreach (
            $jobOrders->take(8)
            as $jobOrder
        ) {

            $recentActivities->push([

                'id' =>
                'job-order-' . $jobOrder->id,

                'icon' =>
                'invoice',

                'title' =>
                'Job Order updated',

                'description' => (
                    $jobOrder->job_order_no
                    ?? $jobOrder->number
                    ?? (
                        $jobOrder->project
                        ?: 'Job Order record'
                    )
                ),

                'time' =>
                optional(
                    $jobOrder->updated_at
                )->diffForHumans(),

                'type' =>
                'yellow',

                'sort_date' =>
                optional(
                    $jobOrder->updated_at
                )->timestamp ?? 0,
            ]);
        }


        /*
    |--------------------------------------------------------------------------
    | SORT RECENT ACTIVITY
    |--------------------------------------------------------------------------
    */

        $recentActivities = $recentActivities
            ->sortByDesc('sort_date')
            ->take(4)
            ->map(function ($activity) {

                unset($activity['sort_date']);

                return $activity;
            })
            ->values();


        /*
    |--------------------------------------------------------------------------
    | UPCOMING DEADLINES
    |--------------------------------------------------------------------------
    */

        $upcomingDeadlines = collect();


        /*
    | INVOICE DEADLINES
    */

        foreach (
            $invoices
                ->filter(function ($invoice) use ($today) {

                    return
                        $invoice->due_date &&
                        $invoice->due_date->gte($today);
                })
                ->sortBy('due_date')
                ->take(5)
            as $invoice
        ) {

            $daysRemaining =
                $today->diffInDays(
                    $invoice->due_date,
                    false
                );


            $upcomingDeadlines->push([

                'id' =>
                'invoice-deadline-' . $invoice->id,

                'title' =>
                'Invoice #' .
                    (
                        $invoice->number
                        ?: $invoice->id
                    ),

                'date' =>
                $invoice->due_date->format('Y-m-d'),

                'type' =>
                'Payment due',

                'status' =>
                $daysRemaining <= 7
                    ? 'warning'
                    : 'normal',

                'sort_date' =>
                $invoice->due_date->timestamp,
            ]);
        }


        /*
    | CONTRACT DEADLINES
    */

        foreach (
            $contracts
                ->filter(function ($contract) use ($today) {

                    return
                        $contract->end_date &&
                        $contract->end_date->gte($today);
                })
                ->sortBy('end_date')
                ->take(5)
            as $contract
        ) {

            $daysRemaining =
                $today->diffInDays(
                    $contract->end_date,
                    false
                );


            $upcomingDeadlines->push([

                'id' =>
                'contract-deadline-' . $contract->id,

                'title' =>
                $contract->contract_no
                    ?: (
                        $contract->project
                        ?: 'Service Contract'
                    ),

                'date' =>
                $contract->end_date->format('Y-m-d'),

                'type' =>
                'Contract renewal',

                'status' =>
                $daysRemaining <= 30
                    ? 'warning'
                    : 'normal',

                'sort_date' =>
                $contract->end_date->timestamp,
            ]);
        }


        /*
    | COMPLIANCE DEADLINES
    */

        foreach (
            $compliances
            as $compliance
        ) {

            $deadlineDate = null;

            $deadlineType = 'Compliance deadline';


            if (
                $compliance->due_date &&
                $compliance->due_date->gte($today)
            ) {

                $deadlineDate =
                    $compliance->due_date;

                $deadlineType =
                    'Compliance deadline';
            } elseif (
                $compliance->expiry_date &&
                $compliance->expiry_date->gte($today)
            ) {

                $deadlineDate =
                    $compliance->expiry_date;

                $deadlineType =
                    'Document renewal';
            }


            if (!$deadlineDate) {
                continue;
            }


            $daysRemaining =
                $today->diffInDays(
                    $deadlineDate,
                    false
                );


            $upcomingDeadlines->push([

                'id' =>
                'compliance-deadline-' .
                    $compliance->id,

                'title' =>
                $compliance->title
                    ?: (
                        $compliance->type
                        ?: 'Compliance Requirement'
                    ),

                'date' =>
                $deadlineDate->format('Y-m-d'),

                'type' =>
                $deadlineType,

                'status' =>
                $daysRemaining <= 30
                    ? 'warning'
                    : 'normal',

                'sort_date' =>
                $deadlineDate->timestamp,
            ]);
        }


        /*
    |--------------------------------------------------------------------------
    | SORT DEADLINES
    |--------------------------------------------------------------------------
    */

        $upcomingDeadlines = $upcomingDeadlines
            ->sortBy('sort_date')
            ->take(3)
            ->map(function ($deadline) {

                unset($deadline['sort_date']);

                return $deadline;
            })
            ->values();


        /*
|--------------------------------------------------------------------------
| RETURN DASHBOARD
|--------------------------------------------------------------------------
*/

        return Inertia::render(
            'User/Dashboard',
            [

                /*
        |------------------------------------------------------------------
        | RAW MODULE RECORDS
        |------------------------------------------------------------------
        | These are the actual DB records used by the User Dashboard.
        */

                'invoices' =>
                $invoices->values(),

                'payments' =>
                $payments->values(),

                'contracts' =>
                $contracts->values(),

                'documents' =>
                $documents->values(),

                'compliances' =>
                $compliances->values(),

                'jobOrders' =>
                $jobOrders->values(),


                /*
        |------------------------------------------------------------------
        | PERSONAL KPI
        |------------------------------------------------------------------
        */

                'stats' => [

                    'invoices' =>
                    $invoices->count(),

                    'payments' =>
                    $payments->count(),

                    'contracts' =>
                    $contracts->count(),

                    'documents' =>
                    $documents->count(),

                    'compliances' =>
                    $compliances->count(),

                    'job_orders' =>
                    $jobOrders->count(),

                    'contract_permits' =>
                    $contracts->count(),
                ],


                /*
        |------------------------------------------------------------------
        | PAYMENT SUMMARY
        |------------------------------------------------------------------
        */

                'paymentSummary' => [

                    'total_billed' =>
                    round(
                        $totalBilled,
                        2
                    ),

                    'paid' =>
                    round(
                        $paidAmount,
                        2
                    ),

                    'partial' =>
                    round(
                        $partialAmount,
                        2
                    ),

                    'pending' =>
                    round(
                        $pendingAmount,
                        2
                    ),

                    'overdue' =>
                    round(
                        $overdueAmount,
                        2
                    ),
                ],


                /*
        |------------------------------------------------------------------
        | COMPLIANCE
        |------------------------------------------------------------------
        */

                'compliance' => [

                    'percentage' =>
                    $compliancePercentage,

                    'verified' =>
                    $verifiedCount,

                    'pending' =>
                    $pendingComplianceCount,

                    'expired' =>
                    $expiredComplianceCount,

                    'standing' =>
                    $complianceStanding,
                ],


                /*
        |------------------------------------------------------------------
        | RECENT ACTIVITY
        |------------------------------------------------------------------
        */

                'recentActivities' =>
                $recentActivities,


                /*
        |------------------------------------------------------------------
        | UPCOMING DEADLINES
        |------------------------------------------------------------------
        */

                'upcomingDeadlines' =>
                $upcomingDeadlines,
            ]
        );
    })->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | STAFF HEARTBEAT
    |--------------------------------------------------------------------------
    */

    Route::post('/staff/heartbeat', [
        AuthenticatedSessionController::class,
        'heartbeat',
    ])->name('staff.heartbeat');


    /*
    |--------------------------------------------------------------------------
    | BILLING
    |--------------------------------------------------------------------------
    */

    Route::get('/billing-invoicing', [
        InvoiceController::class,
        'index',
    ])->name('billing.invoicing');

    Route::post('/billing-invoicing', [
        InvoiceController::class,
        'store',
    ])->name('billing.invoicing.store');

    Route::get('/billing-invoicing/{invoice}', [
        InvoiceController::class,
        'show',
    ])->name('billing.invoicing.show');

    Route::put('/billing-invoicing/{invoice}', [
        InvoiceController::class,
        'update',
    ])->name('billing.invoicing.update');

    Route::delete('/billing-invoicing/{invoice}', [
        InvoiceController::class,
        'destroy',
    ])->name('billing.invoicing.destroy');


    // ✅ IDAGDAG MO ITO SA ILALIM:
    /*
|--------------------------------------------------------------------------
| INVOICE SEND EMAIL & RESUBMIT
|--------------------------------------------------------------------------
*/

    Route::post('/billing-invoicing/{invoice}/send-email', [
        InvoiceController::class,
        'sendEmail',
    ])->name('billing.invoicing.send-email');

    Route::post('/billing-invoicing/{invoice}/resubmit', [
        InvoiceController::class,
        'resubmit',
    ])->name('billing.invoicing.resubmit');

    /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    */

    Route::get('/payment-management', [
        PaymentController::class,
        'index',
    ])->name('payment.management');

    Route::post('/payment-management', [
        PaymentController::class,
        'store',
    ])->name('payment.management.store');

    Route::put('/payment-management/{payment}', [
        PaymentController::class,
        'staffUpdate',
    ])->name('payment.management.update');

    Route::put('/payment-management/{payment}/archive', [
        PaymentController::class,
        'archive',
    ])->name('payment.management.archive');

    Route::patch('/payment-management/{payment}/restore', [
        PaymentController::class,
        'restore',
    ])->name('payment.management.restore');

    Route::patch('/payment-management/{payment}/unarchive', [
        PaymentController::class,
        'restore',
    ])->name('payment.management.unarchive');

    Route::post('/payment-management/{payment}/send-email', [
        PaymentController::class,
        'sendRecordEmail',
    ])->name('payment.management.send.email');


/*
|--------------------------------------------------------------------------
| STAFF CONTRACT & PERMIT
|--------------------------------------------------------------------------
*/

Route::get('/contract-permit', [
    ContractPermitController::class,
    'index',
])->name('contract.permit');

/* ✅ STAFF CREATE CONTRACT (from approved invoice) */
Route::post('/contract-permit', [
    ContractPermitController::class,
    'store',
])->name('contract.permit.store');

/* ✅ STAFF CREATE PERMIT (direct, walang invoice) */
Route::post('/contract-permit/create-permit', [
    ContractPermitController::class,
    'storePermit',
])->name('contract.permit.store.permit');

/* ✅ MULTI-FILE UPLOAD */
Route::post('/contract-permit/{contract}/upload-contract-files', [
    ContractPermitController::class,
    'uploadContractFiles',
])->name('contract.permit.upload.contract.files');

Route::post('/contract-permit/{contract}/upload-signed-files', [
    ContractPermitController::class,
    'uploadSignedFiles',
])->name('contract.permit.upload.signed.files');

/* ✅ LEGACY SINGLE-FILE UPLOAD (backward compatibility) */
Route::post('/contract-permit/{contract}/upload-contract', [
    ContractPermitController::class,
    'uploadContractFile',
])->name('contract.permit.upload.contract');

Route::post('/contract-permit/{contract}/upload-signed', [
    ContractPermitController::class,
    'uploadSignedContract',
])->name('contract.permit.upload.signed');

/* ✅ FILE DOWNLOAD & DELETE (per individual file) */
Route::get('/contract-permit/files/{file}/download', [
    ContractPermitController::class,
    'downloadFile',
])->name('contract.permit.file.download');

Route::delete('/contract-permit/files/{file}', [
    ContractPermitController::class,
    'deleteFile',
])->name('contract.permit.file.delete');

/* ✅ STAFF ACTIONS */
Route::post('/contract-permit/{contract}/send-email', [
    ContractPermitController::class,
    'sendEmail',
])->name('contract.permit.send.email');

Route::post('/contract-permit/{contract}/submit-review', [
    ContractPermitController::class,
    'submitForReview',
])->name('contract.permit.submit.review');

Route::post('/contract-permit/{contract}/return-correction', [
    ContractPermitController::class,
    'returnForCorrection',
])->name('contract.permit.return.correction');

Route::put('/contract-permit/{contract}/archive', [
    ContractPermitController::class,
    'archive',
])->name('contract.permit.archive');

Route::patch('/contract-permit/{contract}/restore', [
    ContractPermitController::class,
    'restore',
])->name('contract.permit.restore');

/* ✅ LEGACY DOWNLOAD (single file, backward compatibility) */
Route::get('/contract-permit/{contract}/download-contract', [
    ContractPermitController::class,
    'downloadContract',
])->name('contract.permit.download.contract');

Route::get('/contract-permit/{contract}/download-signed', [
    ContractPermitController::class,
    'downloadSignedContract',
])->name('contract.permit.download.signed');
  /*
|--------------------------------------------------------------------------
| STAFF DOCUMENTS (redirect to compliance)
|--------------------------------------------------------------------------
*/

Route::get('/documents', function () {
    return redirect()->route('compliance');
})->name('documents');

    /*
    |--------------------------------------------------------------------------
    | STAFF REQUEST DOCUMENT ACCESS
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/documents/{document}/request-access',
        [
            DocumentController::class,
            'requestAccess',
        ]
    )->name('documents.request-access');



    /*
|--------------------------------------------------------------------------
| STAFF FORWARD DOCUMENT VIA EMAIL
|--------------------------------------------------------------------------
*/

    Route::post('/documents/forward', [
        DocumentController::class,
        'forward',
    ])->name('documents.forward');

    /*
    |--------------------------------------------------------------------------
    | STAFF DOCUMENT DOWNLOAD
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/documents/{document}/download',
        [
            DocumentController::class,
            'download',
        ]
    )->name('documents.download');


    /*
    |--------------------------------------------------------------------------
    | STAFF COMPLIANCE + DOCUMENTS
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/compliance/{compliance}/forward',
        [ComplianceController::class, 'forward']
    )->name('compliance.forward');

    Route::get('/compliance', function () {


        $user = Auth::user();


        /*
        |--------------------------------------------------------------------------
        | DOCUMENTS
        |--------------------------------------------------------------------------
        */

      $documents = Document::query()
    ->with([
        'uploader:id,name,email,role',
        'assignee:id,name,email,role',
        'attachments',
    ])
            ->where(function ($query) use ($user) {

                $query
                    ->where(function ($q) use ($user) {

                        $q->where(
                            'document_type',
                            'client'
                        )
                            ->where(function ($q2) use ($user) {

                                $q2->whereNull(
                                    'assigned_to'
                                )
                                    ->orWhere(
                                        'assigned_to',
                                        $user->id
                                    );
                            });
                    })
                    ->orWhere(function ($q) {

                        $q->where(
                            'document_type',
                            'company'
                        );
                    });
            })
            ->latest()
            ->get()
            ->map(function (
                Document $document
            ) use ($user) {

                $canAccess =
                    $document->canBeAccessedBy(
                        $user
                    );

                $fileUrl = null;

                $downloadUrl = null;

                if (
                    $canAccess &&
                    !empty($document->file_path)
                ) {

                    $fileUrl = asset(
                        'storage/' .
                            ltrim(
                                $document->file_path,
                                '/'
                            )
                    );

                    $downloadUrl = route(
                        'documents.download',
                        [
                            'document' =>
                            $document->id,
                        ]
                    );
                }


                $pendingRequest =
                    DocumentAccessRequest::query()
                    ->where(
                        'document_id',
                        $document->id
                    )
                    ->where(
                        'staff_id',
                        $user->id
                    )
                    ->where(
                        'status',
                        'pending'
                    )
                    ->exists();


                $requestStatus =
                    DocumentAccessRequest::query()
                    ->where(
                        'document_id',
                        $document->id
                    )
                    ->where(
                        'staff_id',
                        $user->id
                    )
                    ->latest('id')
                    ->value('status');


                return [

                    'id' =>
                    $document->id,

                    'title' =>
                    $document->title,

                    'file_name' =>
                    $document->file_name,

                    'file_path' =>
                    $canAccess
                        ? $document->file_path
                        : null,

                    'file_url' =>
                    $fileUrl,

                    'download_url' =>
                    $downloadUrl,

                    'assigned_to' =>
                    $document->assigned_to,

                    'assigned_to_name' =>
                    $document->assignee?->name,

                    'assigned_name' =>
                    $document->assignee?->name,

                    'assigned_email' =>
                    $document->assignee?->email,

                    'uploaded_by' =>
                    $document->uploaded_by,

                    'uploaded_by_name' =>
                    $document->uploader?->name,

                    'type' =>
                    $document->type,

                    'description' =>
                    $document->description,

                    'status' =>
                    $document->status,

                    'file_size' =>
                    $document->file_size,

                    'formatted_file_size' =>
                    $document->formatted_file_size,

                    'mime_type' =>
                    $document->mime_type,

                    'document_type' =>
                    $document->document_type,

                    'is_locked' =>
                    (bool) (
                        $document->is_locked ?? false
                    ),

                    'granted_staff_ids' =>
                    $document->granted_staff_ids ?? [],

                    'can_access' =>
                    $canAccess,

                    'access_requested' =>
                    $pendingRequest,

                    'access_request_status' =>
                    $requestStatus,

                                        'attachments' =>
                    $document->attachments->map(function ($att) {
                        return [
                            'id' => $att->id,
                            'file_name' => $att->file_name,
                            'file_path' => $att->file_path,
                            'file_url' => asset('storage/' . ltrim($att->file_path, '/')),
                            'mime_type' => $att->mime_type,
                            'file_size' => $att->file_size,
                            'formatted_file_size' => $att->formatted_file_size,
                            'is_primary' => (bool) $att->is_primary,
                        ];
                    })->values()->toArray(),

                    'attachment_count' =>
                    $document->attachments->count(),

                    'uploaded_at' =>
                    optional(
                        $document->created_at
                    )->format(
                        'M d, Y h:i A'
                    ),

                    'created_at' =>
                    optional(
                        $document->created_at
                    )->format(
                        'M d, Y h:i A'
                    ),
                ];
            })
            ->values();


        /*
        |--------------------------------------------------------------------------
        | COMPLIANCE
        |--------------------------------------------------------------------------
        */

        $compliance = \App\Models\Compliance::query()
            ->with([
                'assignee:id,name,email,role',
                'creator:id,name,email,role',
            ])
            ->where(function ($query) use ($user) {

                $query
                    ->where(
                        'assigned_to',
                        $user->id
                    )
                    ->orWhereNull(
                        'assigned_to'
                    );
            })
            ->latest()
            ->get()
            ->map(function (
                Compliance $record
            ) {

                return [

                    'id' =>
                    $record->id,

                    'title' =>
                    $record->title,

                    'type' =>
                    $record->type,

                    'status' =>
                    $record->status,

                    'assigned_to' =>
                    $record->assigned_to,

                    'assigned_to_name' =>
                    $record->assignee?->name,

                    'assigned_name' =>
                    $record->assignee?->name,

                    'assigned_email' =>
                    $record->assignee?->email,

                    'due_date' =>
                    optional(
                        $record->due_date
                    )->format(
                        'Y-m-d'
                    ),

                    'expiry_date' =>
                    optional(
                        $record->expiry_date
                    )->format(
                        'Y-m-d'
                    ),

                    'description' =>
                    $record->description,

                    'created_by' =>
                    $record->created_by,

                    'created_by_name' =>
                    $record->creator?->name,

                    'created_at' =>
                    optional(
                        $record->created_at
                    )->format(
                        'M d, Y h:i A'
                    ),

                    'updated_at' =>
                    optional(
                        $record->updated_at
                    )->format(
                        'M d, Y h:i A'
                    ),

                    'file_path' => $record->file_path,
                    'file_name' => $record->file_name,
                    'file_url' => $record->file_url,
                    'file_size' => $record->file_size,
                    'formatted_file_size' => $record->formatted_file_size,
                    'mime_type' => $record->mime_type,
                ];
            })
            ->values();


        return Inertia::render(
            'User/Compliance',
            [
                'documents' =>
                $documents,

                'compliance' =>
                $compliance,
            ]
        );
    })->name('compliance');


    /*
|--------------------------------------------------------------------------
| STAFF REPORTS
|--------------------------------------------------------------------------
*/

    Route::get('/reports', [ReportController::class, 'index'])
        ->name('reports');

    Route::get('/reports/data', [ReportController::class, 'data'])
        ->name('reports.data');

    Route::post('/reports/generate', [ReportController::class, 'generate'])
        ->name('reports.generate');

    Route::get('/reports/monthly', [ReportController::class, 'monthly'])
        ->name('reports.monthly');

    Route::get('/reports/expirations', [ReportController::class, 'expirations'])
        ->name('reports.expirations');

    Route::post('/reports/ai-summary-data', [ReportController::class, 'aiSummaryData'])
        ->name('reports.ai-summary-data');

    Route::get('/reports/export/csv', [ReportController::class, 'exportCsv'])
        ->name('reports.export.csv');

    Route::get('/reports/export/pdf', [ReportController::class, 'exportPdf'])
        ->name('reports.export.pdf');

    Route::get('/reports/export/excel', [ReportController::class, 'exportExcel'])
        ->name('reports.export.excel');


    /*
    |--------------------------------------------------------------------------
    | REPORTS — BAGONG ROUTES (All Reports + Filter + Save + Download + Delete)
    |--------------------------------------------------------------------------
    */

    // IMPORTANTE: filter-options BAGO ang {report}/download
    Route::get('/reports/filter-options', [ReportController::class, 'filterOptions'])
        ->name('reports.filter-options');

    Route::get('/reports/list', [ReportController::class, 'list'])
        ->name('reports.list');

    Route::post('/reports/save', [ReportController::class, 'save'])
        ->name('reports.save');

    Route::get('/reports/{report}/download', [ReportController::class, 'downloadSaved'])
        ->name('reports.download');

    // ✅ BAGONG DAGDAG — DELETE
    Route::delete('/reports/{report}', [ReportController::class, 'destroy'])
        ->name('reports.destroy');
    /*
|--------------------------------------------------------------------------
| STAFF FORECASTING
|--------------------------------------------------------------------------
*/

    Route::get('/forecasting', [ForecastingController::class, 'index'])
        ->name('forecasting');

    Route::get('/forecasting/data', [ForecastingController::class, 'data'])
        ->name('forecasting.data');


    /*
    |--------------------------------------------------------------------------
    | STAFF SETTINGS
    |--------------------------------------------------------------------------
    */

    Route::get('/settings', function () {

        return Inertia::render(
            'User/Settings'
        );
    })->name('settings');


    /*
    |--------------------------------------------------------------------------
    | STAFF PASSWORD
    |--------------------------------------------------------------------------
    */

    Route::put('/settings/password', [
        ProfileController::class,
        'updatePassword',
    ])->name('settings.password.update');


    /*
    |--------------------------------------------------------------------------
    | ALIBATON AI
    |--------------------------------------------------------------------------
    */

    Route::post('/ai/alibaton/chat', [
        AlibatonAIController::class,
        'chat',
    ])->name('ai.alibaton.chat');


    /*
    |--------------------------------------------------------------------------
    | PROFILE
    |--------------------------------------------------------------------------
    */

    Route::get('/profile', [
        ProfileController::class,
        'edit',
    ])->name('profile.edit');

    Route::patch('/profile', [
        ProfileController::class,
        'update',
    ])->name('profile.update');

    Route::delete('/profile', [
        ProfileController::class,
        'destroy',
    ])->name('profile.destroy');
});


/*
|--------------------------------------------------------------------------
| AUTHENTICATION ROUTES
|--------------------------------------------------------------------------
*/

require __DIR__ . '/auth.php';
