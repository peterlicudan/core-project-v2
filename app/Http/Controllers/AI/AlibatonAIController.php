<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\Compliance;
use App\Models\Contract;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class AlibatonAIController extends Controller
{
    public function index()
    {
        return Inertia::render('AI/AlibatonAssistant', [
            'reports' => [],
        ]);
    }

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:10000'],
            'history' => ['nullable'],
            'reports' => ['nullable'],
            'report_summary' => ['nullable', 'string', 'max:10000'],
            'page' => ['nullable', 'string', 'max:255'],
            'module_context' => ['nullable'],
            'context' => ['nullable', 'array'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,txt,csv,json'],
        ]);

        $message = trim((string) ($validated['message'] ?? ''));

        $reportContext = $validated['context'] ?? $request->input('context', []);

        if (!is_array($reportContext)) {
            $reportContext = [];
        }

        $attachmentName = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');

            if (!$file->isValid()) {
                return response()->json([
                    'message' => 'The uploaded file could not be processed.',
                ], 422);
            }

            $attachmentName = $file->getClientOriginalName();
            $file->store('alibaton-ai-attachments', 'local');
        }

        if ($message === '' && !$attachmentName) {
            return response()->json([
                'message' => 'Please enter a question or attach a file.',
            ], 422);
        }

        $lower = Str::lower($message);

        /*
        |------------------------------------------------------------------
        | HIGHEST PRIORITY ROUTING (specific handlers first)
        |------------------------------------------------------------------
        */

        // 1. AI-generated reports — specific, dapat mauna
        if ($this->isAiReportsQuestion($lower)) {
            $response = $this->reportsSummary();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 2. Report management summary (report context specific)
        if ($this->isReportManagementSummaryQuestion($lower)) {
            $response = $this->reportManagementSummary($reportContext);
            return $this->appendAttachment($response, $attachmentName);
        }

        // 3. Generate report
        if ($this->isGenerateReportQuestion($lower)) {
            $response = $this->generateRequestedReport($lower);
            return $this->appendAttachment($response, $attachmentName);
        }

        // 4. Highest activity
        if ($this->isHighestActivityQuestion($lower)) {
            $response = $this->highestActivityReport();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 5. Financial
        if ($this->isFinancialQuestion($lower)) {
            $response = $this->financialSituationReport();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 6. Projection / forecast
        if ($this->isProjectionQuestion($lower)) {
            $response = $this->futureProjectionReport();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 7. Expiring
        if ($this->isExpiringQuestion($lower)) {
            $response = $this->expiringRecordsReport();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 8. Compliance
        if ($this->isComplianceQuestion($lower)) {
            $response = $this->complianceIssuesReport();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 9. Reports list / summary
        if ($this->isReportsQuestion($lower)) {
            $response = $this->reportsSummary();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 10. General / system summary — dapat huli, kasi general ito
        if ($this->isGeneralSummaryQuestion($lower)) {
            $response = $this->completeSystemSummary();
            return $this->appendAttachment($response, $attachmentName);
        }

        // 11. ✅ SYSTEM MODULES GUIDE (Local AI module knowledge base)
        //     Kapag may nag-ask kung ano ang mga modules, paano gamitin,
        //     o anong kaya ng system — sasagutin ito ng AI.
        if ($this->isSystemModulesQuestion($lower)) {
            $response = $this->systemModulesGuideResponse($lower);

            return $this->appendAttachment($response, $attachmentName);
        }

        /*
        |------------------------------------------------------------------
        | FREE DATABASE Q&A
        |------------------------------------------------------------------
        */

        if ($message !== '') {
            $databaseResponse = $this->answerDatabaseQuestion(
                $request,
                $message,
                $lower,
                $reportContext
            );

            if ($databaseResponse !== null) {
                return $this->appendAttachment($databaseResponse, $attachmentName);
            }
        }

        if ($message === '' && $attachmentName) {
            return response()->json([
                'message' => $this->fileAttachmentResponse($attachmentName),
                'records' => [],
                'visualData' => null,
                'report' => null,
            ]);
        }

        return response()->json([
            'message' =>
                "I could not confidently match that question to the available ALIBATON database records. "
                . "Please mention the record or module you want to check, such as Job Orders, Invoices, "
                . "Payments, Contracts, Documents, or Compliance. "
                . "You can ask naturally in English, Tagalog, or Taglish.",
            'records' => [],
            'visualData' => null,
            'report' => null,
        ]);
    }

    private function appendAttachment(JsonResponse $response, ?string $attachmentName): JsonResponse
    {
        if (!$attachmentName) {
            return $response;
        }

        $data = $response->getData(true);
        $data['attachment'] = ['name' => $attachmentName];

        return response()->json($data);
    }

    /*
    |--------------------------------------------------------------------------
    | QUESTION DETECTORS
    |--------------------------------------------------------------------------
    */

    private function isAiReportsQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'ai-generated report',
            'ai-generated reports',
            'ai generated report',
            'ai generated reports',
            'ai reports',
            'my ai reports',
            'show ai reports',
            'show my ai',
            'show me my ai',
            'ai report list',
            'list of ai reports',
            'generated reports',
            'show generated reports',
        ]);
    }

    private function isReportManagementSummaryQuestion(string $lower): bool
    {
        $patterns = [
            'give me a summary of this report',
            'give me the summary of this report',
            'summarize this report',
            'summarize the report',
            'summary of this report',
            'summary of the report',
            'report summary',
            'management summary',
            'management-level summary',
            'management level summary',
            'executive summary',
            'executive-level summary',
            'executive level summary',
            'overall report summary',
            'overall summary of this report',
            'analyze this report',
            'analyse this report',
            'analyze the report',
            'analyse the report',
            'give me an analysis of this report',
            'what does this report show',
            'what does this report tell us',
            'explain this report',
            'explain the report',
            'interpret this report',
            'interpret the report',
            'summarize these report results',
            'summary of these report results',
            'report overview',
            'overview of this report',
            'overall report analysis',
            'buod ng report',
            'ibuod ang report',
            'i-summarize ang report',
            'i summarize ang report',
            'ipaliwanag ang report',
            'ano ang laman ng report',
            'ano ang ibig sabihin ng report',
        ];

        return $this->containsAny($lower, $patterns);
    }

    private function isHighestActivityQuestion(string $lower): bool
    {
        $patterns = [
            'highest activity',
            'most activity',
            'highest active',
            'most active module',
            'most active',
            'highest number of records',
            'most records',
            'which module has the highest',
            'what module has the highest',
            'module with the highest',
            'module has the most',
            'which module is most active',
            'what module is most active',
            'highest activity module',
            'most active module',
            'pinaka active',
            'pinakamataas na activity',
            'pinakamalaking activity',
        ];

        return $this->containsAny($lower, $patterns);
    }

    private function isFinancialQuestion(string $lower): bool
    {
        $patterns = [
            'financial situation',
            'financial status',
            'financial health',
            'financial performance',
            'financial condition',
            'explain the financial',
            'explain financial',
            'financial overview',
            'financial summary',
            'money situation',
            'financial position',
            'revenue',
            'income',
            'expenses',
            'receivables',
            'outstanding balance',
            'amount due',
            'cash flow',
            'financial analysis',
            'kalagayang pinansyal',
            'pinansyal',
            'financial',
        ];

        return $this->containsAny($lower, $patterns);
    }

    private function isProjectionQuestion(string $lower): bool
    {
        $patterns = [
            'future projection',
            'future projections',
            'projection',
            'projections',
            'predictive',
            'prediction',
            'forecast',
            'forecasting',
            'future trend',
            'historical trends',
            'historical trend',
            'based on historical',
            'based on history',
            'what might happen',
            'possible future',
            'future financial',
            'projected revenue',
            'projected income',
            'predict future',
            'trend analysis',
            'historical analysis',
            'future outlook',
        ];

        return $this->containsAny($lower, $patterns);
    }

    private function isExpiringQuestion(string $lower): bool
    {
        $patterns = [
            'expiring',
            'expire',
            'expires',
            'expiration',
            'expiry',
            'expiring soon',
            'about to expire',
            'near expiration',
            'upcoming expiration',
            'upcoming expiry',
            'contracts expiring',
            'contract expiring',
            'permits expiring',
            'permit expiring',
            'documents expiring',
            'document expiring',
            'which contracts',
            'which permits',
            'which documents',
            'expiring contracts',
            'expiring permits',
            'expiring documents',
            'due to expire',
        ];

        return $this->containsAny($lower, $patterns);
    }

    private function isComplianceQuestion(string $lower): bool
    {
        $patterns = [
            'compliance issue',
            'compliance issues',
            'compliance problem',
            'compliance problems',
            'compliance risk',
            'compliance risks',
            'what compliance',
            'which compliance',
            'review compliance',
            'compliance review',
            'non-compliant',
            'non compliant',
            'noncompliant',
            'under review',
            'compliance status',
            'regulatory issue',
            'regulatory issues',
            'what should i review',
            'what should we review',
            'issues should i review',
        ];

        return $this->containsAny($lower, $patterns);
    }

    private function isGenerateReportQuestion(string $lower): bool
    {
        $patterns = [
            'generate this report',
            'generate report',
            'generate a report',
            'create this report',
            'create report',
            'create a report',
            'make this report',
            'make a report',
            'export this report',
            'export report',
            'export this',
            'download this report',
            'download report',
            'give me the report',
            'give me a report',
            'downloadable report',
            'generate csv',
            'export csv',
            'csv report',
        ];

        return $this->containsAny($lower, $patterns);
    }

    /**
     * ✅ FIXED: exact match para sa "Alibaton Summary"
     */
    private function isGeneralSummaryQuestion(string $lower): bool
    {
        $patterns = [
            'system overview',
            'system summary',
            'complete system summary',
            'complete summary',
            'complete report',
            'full report',
            'general report',
            'system report',
            'overall system',
            'overall system data',
            'all records',
            'all record',
            'all data',
            'all database',
            'database summary',
            'database records',
            'all modules',
            'entire system',
            'all information',
            'lahat ng records',
            'lahat ng record',
            'lahat ng data',
            'lahat ng database',
            'buong system',
            'buong database',
            'buong records',
            'give me a summary of the available alibaton system data',
            'show me the system',
            'system status',
            'system data',
        ];

        if ($this->containsAny($lower, $patterns)) {
            return true;
        }

        // Exact match para sa mga simpleng tanong
        $trimmed = trim($lower);

        return in_array($trimmed, [
            'alibaton',
            'alibaton summary',
            'alibaton overview',
            'alibaton report',
            'alibaton system',
            'summary',
            'overview',
            'system',
        ], true);
    }

    /**
     * ✅ FIXED: idinagdag ang 'show me my reports', 'reports list', etc.
     */
    private function isReportsQuestion(string $lower): bool
    {
        if (
            Str::contains($lower, [
                'available reports',
                'summary of the available reports',
                'show me my reports',
                'show me the reports',
                'my reports list',
                'list of reports',
                'show reports list',
                'reports list',
                'all reports',
                'reports summary',
                'summarize my reports',
                'summarize reports',
                'buod ng reports',
                'listahan ng reports',
            ])
        ) {
            return true;
        }

        return in_array(
            trim($lower),
            [
                'reports',
                'report',
                'show reports',
                'show me reports',
                'available reports',
                'show me my reports',
                'my reports',
                'list reports',
            ],
            true
        );
    }

    private function containsAny(string $text, array $patterns): bool
    {
        foreach ($patterns as $pattern) {
            if (Str::contains($text, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | FREE DATABASE INTELLIGENCE
    |--------------------------------------------------------------------------
    */

    private function answerDatabaseQuestion(
        Request $request,
        string $message,
        string $lower,
        array $context = []
    ): ?JsonResponse {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Please log in before asking about ALIBATON database records.',
                'records' => [],
                'visualData' => null,
                'report' => null,
            ], 401);
        }

        $modules = $this->detectDatabaseModules($lower);

        if (!$modules) {
            return $this->answerGeneralDatabaseQuestion($user, $message, $lower);
        }

        if (count($modules) > 1 || $this->looksLikeRelationshipQuestion($lower)) {
            $cross = $this->answerCrossModuleQuestion($user, $message, $lower, $modules);

            if ($cross !== null) {
                return $cross;
            }
        }

        foreach ($modules as $module) {
            $response = match ($module) {
                'job_orders' => $this->answerJobOrderQuestion($user, $message, $lower),
                'invoices' => $this->answerInvoiceQuestion($user, $message, $lower),
                'payments' => $this->answerPaymentQuestion($user, $message, $lower),
                'contracts' => $this->answerContractQuestion($user, $message, $lower),
                'documents' => $this->answerDocumentQuestion($user, $message, $lower),
                'compliance' => $this->answerComplianceQuestion($user, $message, $lower),
                default => null,
            };

            if ($response !== null) {
                return $response;
            }
        }

        return null;
    }

    private function detectDatabaseModules(string $lower): array
    {
        $modules = [];

        if (Str::contains($lower, [
            'job order', 'job orders', 'joborder', 'joborders',
            'work order', 'work orders', 'jo ', 'jo-', 'jos',
        ])) {
            $modules[] = 'job_orders';
        }

        if (Str::contains($lower, [
            'invoice', 'invoices', 'billing', 'bill ', 'bills',
        ])) {
            $modules[] = 'invoices';
        }

        if (Str::contains($lower, [
            'payment', 'payments', 'paid', 'partial payment',
            'unpaid', 'pay ', 'bayad', 'nabigay',
        ])) {
            $modules[] = 'payments';
        }

        if (Str::contains($lower, [
            'contract', 'contracts', 'permit', 'permits', 'kasunduan',
        ])) {
            $modules[] = 'contracts';
        }

        if (Str::contains($lower, [
            'document', 'documents', 'file', 'files', 'dokumento',
        ])) {
            $modules[] = 'documents';
        }

        if (Str::contains($lower, [
            'compliance', 'compliances', 'regulatory', 'regulation',
            'compliant', 'non-compliant', 'non compliant', 'noncompliant',
        ])) {
            $modules[] = 'compliance';
        }

        return array_values(array_unique($modules));
    }

    private function answerGeneralDatabaseQuestion(
        User $user,
        string $message,
        string $lower
    ): ?JsonResponse {
        $mine = $this->mentionsMine($lower);

        if ($mine || Str::contains($lower, [
            'how many records',
            'how many records do i have',
            'ilang records',
            'ilang record',
            'ilang data',
            'what records do i have',
            'show my records',
            'list my records',
            'my records',
            'records ko',
            'records ko ba',
            'total records',
            'total record',
            'show me my total',
            'show my total',
        ])) {
            $counts = $this->authorizedModuleCounts($user, $mine);
            $total = array_sum($counts);

            $lines = [
                "Based on the live ALIBATON database, "
                . ($mine ? 'your accessible records' : 'the accessible records')
                . " currently total {$total}.",
                '',
            ];

            foreach ($counts as $label => $count) {
                $lines[] = "- {$label}: {$count}";
            }

            return response()->json([
                'message' => implode("\n", $lines),
                'visual' => 'summary',
                'visualData' => [
                    'counts' => $counts,
                    'total' => $total,
                ],
                'records' => [],
                'report' => null,
            ]);
        }

        return null;
    }

    private function authorizedModuleCounts(User $user, bool $mine = false): array
    {
        return [
            'Job Orders' => $this->authorizedJobOrders($user, $mine)->count(),
            'Invoices' => $this->authorizedInvoices($user, $mine)->count(),
            'Payments' => $this->authorizedPayments($user, $mine)->count(),
            'Contracts & Permits' => $this->authorizedContracts($user, $mine)->count(),
            'Documents' => $this->authorizedDocuments($user, $mine)->count(),
            'Compliance' => $this->authorizedCompliance($user, $mine)->count(),
        ];
    }

    private function isAdminUser(?User $user): bool
    {
        return $user && strtolower((string) $user->role) === 'admin';
    }

    private function mentionsMine(string $lower): bool
    {
        return Str::contains($lower, [
            'my ', 'my records', 'mine', 'my job', 'my invoice',
            'my payment', 'my contract', 'my document', 'my compliance',
            'my data', 'ko ', ' ko', 'akin', 'sa akin', 'para sa akin',
            'para sakin', 'sa sarili ko',
        ]);
    }

    private function authorizedJobOrders(User $user, bool $mine = false)
    {
        $query = JobOrder::query();
        if ($mine && !$this->isAdminUser($user)) {
            $query->where('user_id', $user->id);
        }
        return $query;
    }

    private function authorizedInvoices(User $user, bool $mine = false)
    {
        $query = Invoice::query();
        if ($mine && !$this->isAdminUser($user)) {
            $query->where('user_id', $user->id);
        }
        return $query;
    }

    private function authorizedPayments(User $user, bool $mine = false)
    {
        $query = Payment::query();
        if ($mine && !$this->isAdminUser($user)) {
            $query->where('user_id', $user->id);
        }
        return $query;
    }

    private function authorizedContracts(User $user, bool $mine = false)
    {
        $query = Contract::query();
        if (!$mine || $this->isAdminUser($user)) {
            return $query;
        }
        $query->where(function ($q) use ($user) {
            $q->where('assigned_to', $user->id)
              ->orWhere('created_by', $user->id);
        });
        return $query;
    }

    private function authorizedDocuments(User $user, bool $mine = false)
    {
        $query = Document::query();
        if ($this->isAdminUser($user)) {
            return $query;
        }

        $records = $query->get()->filter(
            fn (Document $document) => $document->canBeAccessedBy($user)
        );

        if ($mine) {
            $records = $records->filter(
                fn (Document $document) =>
                    (int) $document->assigned_to === (int) $user->id
                    || (int) $document->uploaded_by === (int) $user->id
            );
        }

        return Document::query()->whereIn(
            'id',
            $records->pluck('id')->values()->all()
        );
    }

    private function authorizedCompliance(User $user, bool $mine = false)
    {
        $query = Compliance::query();
        if (!$mine || $this->isAdminUser($user)) {
            return $query;
        }
        return $query->where(function ($q) use ($user) {
            $q->where('assigned_to', $user->id)
              ->orWhere('created_by', $user->id);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | JOB ORDER Q&A
    |--------------------------------------------------------------------------
    */

    private function answerJobOrderQuestion(User $user, string $message, string $lower): ?JsonResponse
    {
        $mine = $this->mentionsMine($lower);
        $query = $this->authorizedJobOrders($user, $mine);
        $search = $this->extractSearchTerm($message, $lower, 'job_orders');

        if ($search !== null) {
            $this->applyJobOrderSearch($query, $search);
        }

        if ($this->isCountQuestion($lower)) {
            $count = $query->count();
            return response()->json([
                'message' => "Based on the live ALIBATON database, there are {$count} job order" . ($count === 1 ? '' : 's') . ($mine ? ' assigned to your account.' : '.'),
                'visual' => 'job_orders',
                'visualData' => ['total' => $count],
                'records' => ['job_orders' => []],
                'report' => null,
            ]);
        }

        if ($this->isExistenceQuestion($lower)) {
            $exists = $query->exists();
            return response()->json([
                'message' => $exists
                    ? "Yes. The live ALIBATON database contains " . ($mine ? 'job orders associated with your account.' : 'matching job orders.')
                    : "No. I could not find matching job orders in the accessible ALIBATON records.",
                'visual' => 'job_orders',
                'visualData' => ['exists' => $exists, 'total' => $query->count()],
                'records' => ['job_orders' => $this->cleanRecords($query->latest()->limit(20)->get())],
                'report' => null,
            ]);
        }

        if ($this->isStatusQuestion($lower)) {
            $records = $query->latest()->limit(50)->get();
            $statuses = $this->statusCounts($records, ['status']);
            return response()->json([
                'message' => $this->formatStatusMessage('job orders', $statuses),
                'visual' => 'job_orders',
                'visualData' => ['total' => $records->count(), 'statuses' => $statuses],
                'records' => ['job_orders' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        if ($this->isAmountQuestion($lower)) {
            $records = $query->get();
            $total = $records->sum(fn ($row) => $this->toNumber($row->amount));
            return response()->json([
                'message' => "The total amount of the matching job orders in the live ALIBATON database is " . $this->formatCurrency($total) . ".",
                'visual' => 'job_orders',
                'visualData' => ['total' => $records->count(), 'amount' => $total],
                'records' => ['job_orders' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        $records = $query->latest()->limit(20)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => "I could not find any matching job orders in the accessible ALIBATON database.",
                'visual' => 'job_orders',
                'visualData' => ['total' => 0],
                'records' => ['job_orders' => []],
                'report' => null,
            ]);
        }

        return response()->json([
            'message' => $this->formatJobOrderList($records, $mine),
            'visual' => 'job_orders',
            'visualData' => ['total' => $records->count()],
            'records' => ['job_orders' => $this->cleanRecords($records)],
            'report' => null,
        ]);
    }

    private function applyJobOrderSearch($query, string $term): void
    {
        $term = trim($term);
        if ($term === '') return;

        $query->where(function ($q) use ($term) {
            $like = '%' . $term . '%';
            $q->where('number', 'ILIKE', $like)
              ->orWhere('client', 'ILIKE', $like)
              ->orWhere('client_email', 'ILIKE', $like)
              ->orWhere('client_contact', 'ILIKE', $like)
              ->orWhere('client_address', 'ILIKE', $like)
              ->orWhere('project', 'ILIKE', $like)
              ->orWhere('location', 'ILIKE', $like)
              ->orWhere('equipment', 'ILIKE', $like)
              ->orWhere('operator', 'ILIKE', $like)
              ->orWhere('status', 'ILIKE', $like)
              ->orWhere('description', 'ILIKE', $like);
        });
    }

    private function formatJobOrderList($records, bool $mine): string
    {
        $lines = [
            "I found {$records->count()} matching job order" . ($records->count() === 1 ? '' : 's') . " in the live ALIBATON database.",
            '',
        ];

        foreach ($records as $record) {
            $number = $record->number ?: ('JO-' . $record->id);
            $client = $record->client ?: 'No client recorded';
            $project = $record->project ?: 'No project recorded';
            $status = $record->status ?: 'Unknown';
            $amount = $this->toNumber($record->amount);

            $lines[] = "- {$number} | Client: {$client} | Project: {$project} | Status: {$status} | Amount: {$this->formatCurrency($amount)}";
        }

        if ($records->count() >= 20) {
            $lines[] = '';
            $lines[] = 'The response displays the first 20 matching records. You can ask about a specific job order number, client, or project.';
        }

        return implode("\n", $lines);
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE Q&A
    |--------------------------------------------------------------------------
    */

    private function answerInvoiceQuestion(User $user, string $message, string $lower): ?JsonResponse
    {
        $mine = $this->mentionsMine($lower);
        $query = $this->authorizedInvoices($user, $mine);
        $search = $this->extractSearchTerm($message, $lower, 'invoices');

        if ($search !== null) {
            $this->applyInvoiceSearch($query, $search);
        }

        if (Str::contains($lower, [
            'unpaid', 'outstanding', 'amount due', 'due amount', 'not paid',
            'hindi pa bayad', 'di pa bayad', 'di pa nabayaran', 'hindi nabayaran',
            'magkano pa', 'magkano ang kulang', 'remaining balance', 'balance',
        ])) {
            return $this->invoiceOutstandingAnswer($query, $mine);
        }

        if ($this->isCountQuestion($lower)) {
            $count = $query->count();
            return response()->json([
                'message' => "Based on the live ALIBATON database, there are {$count} invoice" . ($count === 1 ? '' : 's') . ($mine ? ' associated with your account.' : '.'),
                'visual' => 'invoice',
                'visualData' => ['total' => $count],
                'records' => ['invoices' => []],
                'report' => null,
            ]);
        }

        if ($this->isExistenceQuestion($lower)) {
            $exists = $query->exists();
            return response()->json([
                'message' => $exists ? 'Yes. Matching invoices exist in the live ALIBATON database.' : 'No. I could not find matching invoices in the accessible ALIBATON records.',
                'visual' => 'invoice',
                'visualData' => ['exists' => $exists, 'total' => $query->count()],
                'records' => ['invoices' => $this->cleanRecords($query->latest()->limit(20)->get())],
                'report' => null,
            ]);
        }

        if ($this->isAmountQuestion($lower)) {
            $records = $query->get();
            $total = $this->invoiceAmountTotal($records);
            return response()->json([
                'message' => "The total invoice amount in the live ALIBATON database for the matching records is " . $this->formatCurrency($total) . ".",
                'visual' => 'invoice',
                'visualData' => ['total' => $records->count(), 'total_amount' => $total],
                'records' => ['invoices' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if ($this->isStatusQuestion($lower)) {
            $records = $query->latest()->limit(50)->get();
            $statuses = $this->statusCounts($records, ['status', 'invoice_status', 'payment_status']);
            return response()->json([
                'message' => $this->formatStatusMessage('invoices', $statuses),
                'visual' => 'invoice',
                'visualData' => ['total' => $records->count(), 'statuses' => $statuses],
                'records' => ['invoices' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        $records = $query->latest()->limit(20)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'I could not find matching invoices in the accessible ALIBATON database.',
                'visual' => 'invoice',
                'visualData' => ['total' => 0],
                'records' => ['invoices' => []],
                'report' => null,
            ]);
        }

        return response()->json([
            'message' => "I found {$records->count()} matching invoice" . ($records->count() === 1 ? '' : 's') . " in the live ALIBATON database.",
            'visual' => 'invoice',
            'visualData' => ['total' => $records->count()],
            'records' => ['invoices' => $this->cleanRecords($records)],
            'report' => null,
        ]);
    }

    private function applyInvoiceSearch($query, string $term): void
    {
        $like = '%' . trim($term) . '%';
        $query->where(function ($q) use ($like) {
            $q->where('number', 'ILIKE', $like)
              ->orWhere('client', 'ILIKE', $like)
              ->orWhere('client_email', 'ILIKE', $like)
              ->orWhere('project', 'ILIKE', $like)
              ->orWhere('status', 'ILIKE', $like)
              ->orWhere('description', 'ILIKE', $like);
        });
    }

    private function invoiceOutstandingAnswer($query, bool $mine): JsonResponse
    {
        $records = $query->get();
        $invoiceTotal = $this->invoiceAmountTotal($records);
        $paymentsQuery = Payment::query();
        $currentUser = Auth::user();

        if ($mine && $records->isNotEmpty()) {
            $invoiceIds = $records->pluck('id')->all();
            $paymentsQuery->whereIn('invoice_id', $invoiceIds);
        } elseif ($mine && $currentUser instanceof User && !$this->isAdminUser($currentUser)) {
            $paymentsQuery->where('user_id', $currentUser->getAuthIdentifier());
        }

        $paymentTotal = $this->paymentAmountTotal($paymentsQuery->get());
        $outstanding = max(0, $invoiceTotal - $paymentTotal);

        return response()->json([
            'message' => "Based on the live ALIBATON database:\n"
                . "• Invoice total: {$this->formatCurrency($invoiceTotal)}\n"
                . "• Payments recorded: {$this->formatCurrency($paymentTotal)}\n"
                . "• Estimated outstanding balance: {$this->formatCurrency($outstanding)}",
            'visual' => 'financial',
            'visualData' => [
                'invoice_total' => $invoiceTotal,
                'payment_total' => $paymentTotal,
                'outstanding' => $outstanding,
            ],
            'records' => ['invoices' => $this->cleanRecords($records->take(20))],
            'report' => null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT Q&A
    |--------------------------------------------------------------------------
    */

    private function answerPaymentQuestion(User $user, string $message, string $lower): ?JsonResponse
    {
        $mine = $this->mentionsMine($lower);
        $query = $this->authorizedPayments($user, $mine);
        $search = $this->extractSearchTerm($message, $lower, 'payments');

        if ($search !== null) {
            $this->applyPaymentSearch($query, $search);
        }

        if ($this->isCountQuestion($lower)) {
            $count = $query->count();
            return response()->json([
                'message' => "Based on the live ALIBATON database, there are {$count} payment" . ($count === 1 ? '' : 's') . ($mine ? ' associated with your account.' : '.'),
                'visual' => 'payment',
                'visualData' => ['total' => $count],
                'records' => ['payments' => []],
                'report' => null,
            ]);
        }

        if ($this->isAmountQuestion($lower)) {
            $records = $query->get();
            $total = $this->paymentAmountTotal($records);
            return response()->json([
                'message' => "The total recorded payment amount is " . $this->formatCurrency($total) . ".",
                'visual' => 'payment',
                'visualData' => ['total' => $records->count(), 'total_amount' => $total],
                'records' => ['payments' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if ($this->isStatusQuestion($lower)) {
            $records = $query->latest()->limit(50)->get();
            $statuses = $this->statusCounts($records, ['status', 'payment_status']);
            return response()->json([
                'message' => $this->formatStatusMessage('payments', $statuses),
                'visual' => 'payment',
                'visualData' => ['total' => $records->count(), 'statuses' => $statuses],
                'records' => ['payments' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        if (Str::contains($lower, ['partial payment', 'partial payments', 'partially paid', 'partial'])) {
            $records = $query->where(function ($q) {
                $q->where('status', 'ILIKE', '%partial%')
                  ->orWhere('payment_method', 'ILIKE', '%partial%');
            })->latest()->get();

            return response()->json([
                'message' => "I found {$records->count()} partial payment" . ($records->count() === 1 ? '' : 's') . " in the accessible ALIBATON records.",
                'visual' => 'payment',
                'visualData' => ['total' => $records->count(), 'total_amount' => $this->paymentAmountTotal($records)],
                'records' => ['payments' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        $records = $query->latest()->limit(20)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'I could not find matching payments in the accessible ALIBATON database.',
                'visual' => 'payment',
                'visualData' => ['total' => 0],
                'records' => ['payments' => []],
                'report' => null,
            ]);
        }

        return response()->json([
            'message' => "I found {$records->count()} matching payment" . ($records->count() === 1 ? '' : 's') . " in the live ALIBATON database.",
            'visual' => 'payment',
            'visualData' => ['total' => $records->count(), 'total_amount' => $this->paymentAmountTotal($records)],
            'records' => ['payments' => $this->cleanRecords($records)],
            'report' => null,
        ]);
    }

    private function applyPaymentSearch($query, string $term): void
    {
        $like = '%' . trim($term) . '%';
        $query->where(function ($q) use ($like) {
            $q->where('receipt_number', 'ILIKE', $like)
              ->orWhere('receipt', 'ILIKE', $like)
              ->orWhere('client', 'ILIKE', $like)
              ->orWhere('client_email', 'ILIKE', $like)
              ->orWhere('invoice_number', 'ILIKE', $like)
              ->orWhere('payment_method', 'ILIKE', $like)
              ->orWhere('status', 'ILIKE', $like)
              ->orWhere('notes', 'ILIKE', $like);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | CONTRACT Q&A
    |--------------------------------------------------------------------------
    */

    private function answerContractQuestion(User $user, string $message, string $lower): ?JsonResponse
    {
        $mine = $this->mentionsMine($lower);
        $query = $this->authorizedContracts($user, $mine);
        $search = $this->extractSearchTerm($message, $lower, 'contracts');

        if ($search !== null) {
            $this->applyContractSearch($query, $search);
        }

        if (Str::contains($lower, ['expiring', 'expire', 'expiration', 'expiry', 'expiring soon', 'due to expire'])) {
            $today = Carbon::today();
            $limit = $today->copy()->addDays(90);

            $records = $query->get()
                ->filter(function ($contract) use ($today, $limit) {
                    $date = $this->firstDateValue($contract, ['end_date', 'expiry_date', 'expiration_date']);
                    return $date && $date->betweenIncluded($today, $limit);
                })
                ->sortBy(function ($contract) {
                    $date = $this->firstDateValue($contract, ['end_date', 'expiry_date', 'expiration_date']);
                    return $date ? Carbon::today()->diffInDays($date, false) : PHP_INT_MAX;
                })
                ->values();

            return response()->json([
                'message' => "I found {$records->count()} contract" . ($records->count() === 1 ? '' : 's') . " expiring within the next 90 days.",
                'visual' => 'contracts',
                'visualData' => ['total' => $records->count(), 'expiring' => $records->count()],
                'records' => ['contracts' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if ($this->isCountQuestion($lower)) {
            $count = $query->count();
            return response()->json([
                'message' => "Based on the live ALIBATON database, there are {$count} contract" . ($count === 1 ? '' : 's') . ($mine ? ' associated with your account.' : '.'),
                'visual' => 'contracts',
                'visualData' => ['total' => $count],
                'records' => ['contracts' => []],
                'report' => null,
            ]);
        }

        if ($this->isStatusQuestion($lower)) {
            $records = $query->latest()->limit(50)->get();
            $statuses = $this->statusCounts($records, ['status', 'workflow_status']);
            return response()->json([
                'message' => $this->formatStatusMessage('contracts', $statuses),
                'visual' => 'contracts',
                'visualData' => ['total' => $records->count(), 'statuses' => $statuses],
                'records' => ['contracts' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        $records = $query->latest()->limit(20)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'I could not find matching contracts or permits in the accessible ALIBATON database.',
                'visual' => 'contracts',
                'visualData' => ['total' => 0],
                'records' => ['contracts' => []],
                'report' => null,
            ]);
        }

        return response()->json([
            'message' => "I found {$records->count()} matching contract" . ($records->count() === 1 ? '' : 's') . " in the live ALIBATON database.",
            'visual' => 'contracts',
            'visualData' => ['total' => $records->count()],
            'records' => ['contracts' => $this->cleanRecords($records)],
            'report' => null,
        ]);
    }

    private function applyContractSearch($query, string $term): void
    {
        $like = '%' . trim($term) . '%';
        $query->where(function ($q) use ($like) {
            $q->where('contract_no', 'ILIKE', $like)
              ->orWhere('client', 'ILIKE', $like)
              ->orWhere('email', 'ILIKE', $like)
              ->orWhere('project', 'ILIKE', $like)
              ->orWhere('location', 'ILIKE', $like)
              ->orWhere('type', 'ILIKE', $like)
              ->orWhere('contract_type', 'ILIKE', $like)
              ->orWhere('equipment', 'ILIKE', $like)
              ->orWhere('status', 'ILIKE', $like)
              ->orWhere('workflow_status', 'ILIKE', $like)
              ->orWhere('description', 'ILIKE', $like);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | DOCUMENT Q&A
    |--------------------------------------------------------------------------
    */

    private function answerDocumentQuestion(User $user, string $message, string $lower): ?JsonResponse
    {
        $mine = $this->mentionsMine($lower);
        $query = $this->authorizedDocuments($user, $mine);
        $search = $this->extractSearchTerm($message, $lower, 'documents');

        if ($search !== null) {
            $this->applyDocumentSearch($query, $search);
        }

        if (Str::contains($lower, ['expired documents', 'expired document', 'document expired'])) {
            $records = $query->get()
                ->filter(fn (Document $document) => (bool) $document->is_expired)
                ->values();

            return response()->json([
                'message' => "I found {$records->count()} expired document" . ($records->count() === 1 ? '' : 's') . " in the accessible ALIBATON records.",
                'visual' => 'documents',
                'visualData' => ['total' => $records->count(), 'expired' => $records->count()],
                'records' => ['documents' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if (Str::contains($lower, ['expiring documents', 'expiring document', 'documents expiring', 'document expiring'])) {
            $records = $query->get()
                ->filter(fn (Document $document) => (bool) $document->is_expiring_soon)
                ->values();

            return response()->json([
                'message' => "I found {$records->count()} document" . ($records->count() === 1 ? '' : 's') . " expiring soon.",
                'visual' => 'documents',
                'visualData' => ['total' => $records->count(), 'expiring' => $records->count()],
                'records' => ['documents' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if ($this->isCountQuestion($lower)) {
            $count = $query->count();
            return response()->json([
                'message' => "Based on the live ALIBATON database, there are {$count} accessible document" . ($count === 1 ? '' : 's') . ($mine ? ' associated with your account.' : '.'),
                'visual' => 'documents',
                'visualData' => ['total' => $count],
                'records' => ['documents' => []],
                'report' => null,
            ]);
        }

        if ($this->isStatusQuestion($lower)) {
            $records = $query->latest()->limit(50)->get();
            $statuses = $this->statusCounts($records, ['status', 'compliance_status']);
            return response()->json([
                'message' => $this->formatStatusMessage('documents', $statuses),
                'visual' => 'documents',
                'visualData' => ['total' => $records->count(), 'statuses' => $statuses],
                'records' => ['documents' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        $records = $query->latest()->limit(20)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'I could not find matching documents in the accessible ALIBATON database.',
                'visual' => 'documents',
                'visualData' => ['total' => 0],
                'records' => ['documents' => []],
                'report' => null,
            ]);
        }

        return response()->json([
            'message' => "I found {$records->count()} matching document" . ($records->count() === 1 ? '' : 's') . " in the accessible ALIBATON database.",
            'visual' => 'documents',
            'visualData' => ['total' => $records->count()],
            'records' => ['documents' => $this->cleanRecords($records)],
            'report' => null,
        ]);
    }

    private function applyDocumentSearch($query, string $term): void
    {
        $like = '%' . trim($term) . '%';
        $query->where(function ($q) use ($like) {
            $q->where('title', 'ILIKE', $like)
              ->orWhere('file_name', 'ILIKE', $like)
              ->orWhere('description', 'ILIKE', $like)
              ->orWhere('type', 'ILIKE', $like)
              ->orWhere('document_type', 'ILIKE', $like)
              ->orWhere('status', 'ILIKE', $like)
              ->orWhere('regulatory_body', 'ILIKE', $like)
              ->orWhere('reference_number', 'ILIKE', $like)
              ->orWhere('compliance_status', 'ILIKE', $like);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLIANCE Q&A
    |--------------------------------------------------------------------------
    */

    private function answerComplianceQuestion(User $user, string $message, string $lower): ?JsonResponse
    {
        $mine = $this->mentionsMine($lower);
        $query = $this->authorizedCompliance($user, $mine);
        $search = $this->extractSearchTerm($message, $lower, 'compliance');

        if ($search !== null) {
            $this->applyComplianceSearch($query, $search);
        }

        if (Str::contains($lower, ['non-compliant', 'non compliant', 'noncompliant', 'non compliant compliance', 'compliance issue', 'compliance issues'])) {
            $records = $query->get()
                ->filter(function ($record) {
                    $status = Str::lower(trim((string) ($record->status ?? $record->compliance_status ?? '')));
                    return Str::contains($status, ['non-compliant', 'non compliant', 'noncompliant', 'reject', 'expired']);
                })
                ->values();

            return response()->json([
                'message' => "I found {$records->count()} compliance record" . ($records->count() === 1 ? '' : 's') . " requiring attention based on their recorded status.",
                'visual' => 'compliance',
                'visualData' => ['total' => $records->count(), 'issues' => $records->count()],
                'records' => ['compliance' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if (Str::contains($lower, ['pending compliance', 'compliance pending', 'under review', 'compliance review'])) {
            $records = $query->get()
                ->filter(function ($record) {
                    $status = Str::lower(trim((string) ($record->status ?? $record->compliance_status ?? '')));
                    return Str::contains($status, ['pending', 'review']);
                })
                ->values();

            return response()->json([
                'message' => "I found {$records->count()} compliance record" . ($records->count() === 1 ? '' : 's') . " currently marked pending or under review.",
                'visual' => 'compliance',
                'visualData' => ['total' => $records->count()],
                'records' => ['compliance' => $this->cleanRecords($records->take(20))],
                'report' => null,
            ]);
        }

        if ($this->isCountQuestion($lower)) {
            $count = $query->count();
            return response()->json([
                'message' => "Based on the live ALIBATON database, there are {$count} compliance record" . ($count === 1 ? '' : 's') . ($mine ? ' associated with your account.' : '.'),
                'visual' => 'compliance',
                'visualData' => ['total' => $count],
                'records' => ['compliance' => []],
                'report' => null,
            ]);
        }

        if ($this->isStatusQuestion($lower)) {
            $records = $query->latest()->limit(50)->get();
            $statuses = $this->statusCounts($records, ['status', 'compliance_status', 'monitoring_status']);
            return response()->json([
                'message' => $this->formatStatusMessage('compliance records', $statuses),
                'visual' => 'compliance',
                'visualData' => ['total' => $records->count(), 'statuses' => $statuses],
                'records' => ['compliance' => $this->cleanRecords($records)],
                'report' => null,
            ]);
        }

        $records = $query->latest()->limit(20)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'I could not find matching compliance records in the accessible ALIBATON database.',
                'visual' => 'compliance',
                'visualData' => ['total' => 0],
                'records' => ['compliance' => []],
                'report' => null,
            ]);
        }

        return response()->json([
            'message' => "I found {$records->count()} matching compliance record" . ($records->count() === 1 ? '' : 's') . " in the live ALIBATON database.",
            'visual' => 'compliance',
            'visualData' => ['total' => $records->count()],
            'records' => ['compliance' => $this->cleanRecords($records)],
            'report' => null,
        ]);
    }

    private function applyComplianceSearch($query, string $term): void
    {
        $like = '%' . trim($term) . '%';
        $query->where(function ($q) use ($like) {
            $q->where('title', 'ILIKE', $like)
              ->orWhere('type', 'ILIKE', $like)
              ->orWhere('status', 'ILIKE', $like)
              ->orWhere('description', 'ILIKE', $like)
              ->orWhere('regulatory_body', 'ILIKE', $like)
              ->orWhere('reference_number', 'ILIKE', $like)
              ->orWhere('priority', 'ILIKE', $like)
              ->orWhere('monitoring_status', 'ILIKE', $like)
              ->orWhere('compliance_status', 'ILIKE', $like);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | CROSS-MODULE
    |--------------------------------------------------------------------------
    */

    private function looksLikeRelationshipQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'client of', 'client ng', 'client sa', 'linked', 'related',
            'connection', 'connected', 'associated', 'connected to',
            'invoice for', 'payment for', 'contract for', 'job order for',
            'job order ng', 'invoice ng', 'payment ng', 'contract ng',
            'ano ang client', 'sino ang client', 'sino client', 'what client',
            'which invoice', 'which payment', 'which contract',
            'anong invoice', 'anong payment', 'anong contract',
        ]);
    }

    private function answerCrossModuleQuestion(User $user, string $message, string $lower, array $modules): ?JsonResponse
    {
        $term = $this->extractCrossModuleIdentifier($message, $lower);
        if (!$term) return null;

        if (in_array('job_orders', $modules, true) || Str::contains($lower, ['job order', 'job orders', 'joborder'])) {
            $jobQuery = $this->authorizedJobOrders($user, $this->mentionsMine($lower));
            $this->applyJobOrderSearch($jobQuery, $term);
            $jobOrders = $jobQuery->latest()->limit(5)->get();

            if ($jobOrders->isNotEmpty()) {
                $invoiceIds = $jobOrders->pluck('id')->values();
                $invoices = Invoice::query()->whereIn('job_order_id', $invoiceIds)->get();
                $payments = Payment::query()->whereIn('invoice_id', $invoices->pluck('id')->all())->get();
                $contracts = Contract::query()->whereIn('job_order_id', $invoiceIds)->get();

                $lines = [
                    "I found {$jobOrders->count()} matching job order" . ($jobOrders->count() === 1 ? '' : 's') . " and checked its linked records.",
                    '',
                ];

                foreach ($jobOrders as $job) {
                    $number = $job->number ?: 'JO-' . $job->id;
                    $lines[] = "Job Order {$number}: Client = " . ($job->client ?: 'Not recorded')
                        . "; Project = " . ($job->project ?: 'Not recorded')
                        . "; Status = " . ($job->status ?: 'Unknown');

                    $relatedInvoices = $invoices->where('job_order_id', $job->id);
                    $lines[] = "  Invoices: " . $relatedInvoices->count();
                    $lines[] = "  Payments: " . $payments->filter(fn ($payment) => $relatedInvoices->pluck('id')->contains($payment->invoice_id))->count();
                    $lines[] = "  Contracts: " . $contracts->where('job_order_id', $job->id)->count();
                }

                return response()->json([
                    'message' => implode("\n", $lines),
                    'visual' => 'cross_module',
                    'visualData' => [
                        'job_orders' => $jobOrders->count(),
                        'invoices' => $invoices->count(),
                        'payments' => $payments->count(),
                        'contracts' => $contracts->count(),
                    ],
                    'records' => [
                        'job_orders' => $this->cleanRecords($jobOrders),
                        'invoices' => $this->cleanRecords($invoices),
                        'payments' => $this->cleanRecords($payments),
                        'contracts' => $this->cleanRecords($contracts),
                    ],
                    'report' => null,
                ]);
            }
        }

        if (in_array('invoices', $modules, true) || Str::contains($lower, 'invoice')) {
            $invoiceQuery = $this->authorizedInvoices($user, $this->mentionsMine($lower));
            $this->applyInvoiceSearch($invoiceQuery, $term);
            $invoices = $invoiceQuery->latest()->limit(5)->get();

            if ($invoices->isNotEmpty()) {
                $payments = Payment::query()->whereIn('invoice_id', $invoices->pluck('id')->all())->get();
                $jobOrders = JobOrder::query()->whereIn('id', $invoices->pluck('job_order_id')->filter()->all())->get();
                $contracts = Contract::query()->whereIn('invoice_id', $invoices->pluck('id')->all())->get();

                $lines = [
                    "I found {$invoices->count()} matching invoice" . ($invoices->count() === 1 ? '' : 's') . " and checked its related records.",
                    '',
                ];

                foreach ($invoices as $invoice) {
                    $lines[] = "Invoice " . ($invoice->number ?: $invoice->id)
                        . ": Client = " . ($invoice->client ?: 'Not recorded')
                        . "; Project = " . ($invoice->project ?: 'Not recorded')
                        . "; Status = " . ($invoice->status ?: 'Unknown')
                        . "; Amount = " . $this->formatCurrency($this->toNumber($invoice->amount));

                    $lines[] = "  Payments: " . $payments->where('invoice_id', $invoice->id)->count();
                    $lines[] = "  Job Order: " . ($jobOrders->where('id', $invoice->job_order_id)->first()?->number ?: 'Not linked');
                    $lines[] = "  Contract: " . ($contracts->where('invoice_id', $invoice->id)->first()?->contract_no ?: 'Not linked');
                }

                return response()->json([
                    'message' => implode("\n", $lines),
                    'visual' => 'cross_module',
                    'visualData' => [
                        'invoices' => $invoices->count(),
                        'payments' => $payments->count(),
                        'job_orders' => $jobOrders->count(),
                        'contracts' => $contracts->count(),
                    ],
                    'records' => [
                        'invoices' => $this->cleanRecords($invoices),
                        'payments' => $this->cleanRecords($payments),
                        'job_orders' => $this->cleanRecords($jobOrders),
                        'contracts' => $this->cleanRecords($contracts),
                    ],
                    'report' => null,
                ]);
            }
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | SEARCH TERM EXTRACTION
    |--------------------------------------------------------------------------
    */

    private function extractSearchTerm(string $message, string $lower, string $module): ?string
    {
        $message = trim($message);
        if ($message === '') return null;

        if (preg_match('/["\']([^"\']+)["\']/', $message, $matches)) {
            return trim($matches[1]);
        }

        if (preg_match('/\b(?:JO|INV|CON|CONT|PAY|RCPT)[-\s]?[A-Z0-9]+\b/i', $message, $matches)) {
            return trim($matches[0]);
        }

        $patterns = [
            '/\b(?:of|for|ng|ni|sa|about|regarding)\s+([A-Za-z0-9][A-Za-z0-9 ._\-@#\/]{1,80})/i',
            '/\b(?:client|project|contract|invoice|job order|document|compliance)\s+([A-Za-z0-9][A-Za-z0-9 ._\-@#\/]{1,80})/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $message, $matches)) {
                $candidate = trim($matches[1]);
                $candidate = preg_replace('/\b(?:status|amount|details?|information|record|records|please|show|me)\b.*$/i', '', $candidate);
                $candidate = trim($candidate, " \t\n\r\0\x0B?.!,;:");

                if ($candidate !== '' && !$this->isGenericSearchPhrase(Str::lower($candidate))) {
                    return $candidate;
                }
            }
        }

        if ($this->isDetailQuestion($lower) || $this->isStatusQuestion($lower)) {
            $stopWords = [
                'what', 'what is', 'what are', 'whats', 'what’s',
                'show', 'show me', 'tell me', 'give me',
                'details', 'detail', 'information', 'info', 'status',
                'the', 'of', 'for', 'my', 'ko', 'akin', 'is', 'are',
                'this', 'that', 'ng', 'ni', 'sa', 'ang',
                'ano', 'sino', 'anong', 'alin', 'ba', 'please',
            ];

            $words = preg_split('/\s+/', Str::lower($message));
            $filtered = [];

            foreach ($words as $word) {
                $word = trim($word, " \t\n\r\0\x0B?.!,;:");
                if ($word === '') continue;
                if (in_array($word, $stopWords, true)) continue;
                if (Str::contains($word, ['job', 'order', 'invoice', 'payment', 'contract', 'document', 'compliance', 'status', 'client'])) continue;
                $filtered[] = $word;
            }

            if ($filtered) {
                return trim(implode(' ', $filtered));
            }
        }

        return null;
    }

    private function extractCrossModuleIdentifier(string $message, string $lower): ?string
    {
        if (preg_match('/\b(?:JO|INV|CON|CONT|PAY|RCPT)[-\s]?[A-Z0-9]+\b/i', $message, $matches)) {
            return trim($matches[0]);
        }
        return $this->extractSearchTerm($message, $lower, 'cross');
    }

    private function isGenericSearchPhrase(string $value): bool
    {
        return in_array(trim($value), [
            'the database', 'database', 'records', 'record', 'data',
            'my records', 'my data', 'all records', 'all data',
            'this', 'that', 'it',
        ], true);
    }

    /*
    |--------------------------------------------------------------------------
    | QUESTION TYPE HELPERS
    |--------------------------------------------------------------------------
    */

    private function isCountQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'how many', 'how much', 'count', 'number of',
            'ilang', 'ilan', 'gaano karami', 'total number',
            'record count', 'ilang piraso',
        ]);
    }

    private function isExistenceQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'do i have', 'does it have', 'is there', 'are there',
            'any ', 'may ', 'meron', 'meron ba', 'mayroon',
            'mayroon ba', 'available ba', 'may existing',
        ]);
    }

    private function isStatusQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'status', 'state', 'standing', 'ano ang status',
            'anong status', 'kamusta ang status',
            'what is the status', 'what’s the status', "what's the status",
        ]);
    }

    private function isAmountQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'how much', 'amount', 'total amount', 'value',
            'magkano', 'magkano ang', 'magkano pa',
            'magkano lahat', 'magkano total',
            'peso', 'pesos', '₱', 'php',
            'revenue', 'income', 'bayad', 'bayaran',
        ]);
    }

    private function isDetailQuestion(string $lower): bool
    {
        return Str::contains($lower, [
            'details', 'detail', 'information', 'info',
            'tell me about', 'show me', 'what is', 'what are',
            'sino', 'ano ang', 'ano yung', 'anong', 'which',
            'who is', 'who are',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | REPORT MANAGEMENT SUMMARY
    |--------------------------------------------------------------------------
    */

    private function reportManagementSummary(array $context): JsonResponse
    {
        $actualReportData = is_array($context['actual_report_data'] ?? null) ? $context['actual_report_data'] : [];
        $moduleRecords = is_array($context['actual_module_records'] ?? null) ? $context['actual_module_records'] : [];
        $financialAnalytics = is_array($context['financial_analytics'] ?? null) ? $context['financial_analytics'] : [];
        $operationalAnalytics = is_array($context['operational_analytics'] ?? null) ? $context['operational_analytics'] : [];
        $historicalTrends = is_array($context['historical_trends'] ?? null) ? $context['historical_trends'] : [];
        $possibleProjections = is_array($context['possible_future_projections'] ?? null) ? $context['possible_future_projections'] : [];
        $upcomingExpirations = is_array($context['upcoming_expirations'] ?? null) ? $context['upcoming_expirations'] : [];
        $summary = is_array($context['summary'] ?? null) ? $context['summary'] : [];

        $moduleCounts = [
            'Billing / Invoices' => $this->contextNumber($context, ['invoice_total', 'invoices', 'billing', 'billing_total']),
            'Payments' => $this->contextNumber($context, ['payment_total', 'payments', 'payment_count']),
            'Job Orders' => $this->contextNumber($context, ['job_orders', 'job_order_total', 'job_order_count']),
            'Contracts & Permits' => $this->contextNumber($context, ['contracts', 'contract_total', 'permits', 'permit_count']),
            'Compliance' => $this->contextNumber($context, ['compliance', 'compliances', 'compliance_total']),
            'Documents' => $this->contextNumber($context, ['documents', 'document_total']),
        ];

        foreach ($moduleRecords as $module) {
            if (!is_array($module)) continue;
            $label = Str::lower((string) ($module['label'] ?? $module['module'] ?? ''));
            $value = $this->contextNumber($module, ['total', 'count', 'records']);

            if (Str::contains($label, ['invoice', 'billing'])) $moduleCounts['Billing / Invoices'] = $value;
            elseif (Str::contains($label, ['payment'])) $moduleCounts['Payments'] = $value;
            elseif (Str::contains($label, ['job'])) $moduleCounts['Job Orders'] = $value;
            elseif (Str::contains($label, ['contract', 'permit'])) $moduleCounts['Contracts & Permits'] = $value;
            elseif (Str::contains($label, ['compliance'])) $moduleCounts['Compliance'] = $value;
            elseif (Str::contains($label, ['document'])) $moduleCounts['Documents'] = $value;
        }

        $totalActivity = array_sum(array_map(fn ($value) => (float) $value, $moduleCounts));
        $positiveModules = array_filter($moduleCounts, fn ($value) => $value > 0);
        arsort($positiveModules);

        $strongestModule = $positiveModules ? array_key_first($positiveModules) : 'No activity';
        $weakestModule = $positiveModules ? array_key_last($positiveModules) : 'No activity';

        $invoiceTotal = $this->contextNumber($financialAnalytics, ['invoice_total', 'invoices_total', 'total_invoices']);
        $paymentTotal = $this->contextNumber($financialAnalytics, ['payment_total', 'payments_total', 'total_payments']);
        $outstanding = $this->contextNumber($financialAnalytics, ['outstanding', 'outstanding_balance', 'amount_due']);
        $paidPayments = $this->contextNumber($financialAnalytics, ['paid_payments', 'paid']);
        $partialPayments = $this->contextNumber($financialAnalytics, ['partial_payments', 'partial']);
        $pendingPayments = $this->contextNumber($financialAnalytics, ['pending_payments', 'pending']);
        $overdueInvoiceCount = $this->contextNumber($financialAnalytics, ['overdue_invoices', 'overdue_invoice_count']);

        $collectionRate = $invoiceTotal > 0 ? ($paymentTotal / $invoiceTotal) * 100 : 0;

        $activeContracts = $this->contextNumber($operationalAnalytics, ['active_contracts', 'contracts_active']);
        $expiringContracts = $this->contextNumber($operationalAnalytics, ['expiring_contracts', 'contracts_expiring']);
        $expiredContracts = $this->contextNumber($operationalAnalytics, ['expired_contracts', 'contracts_expired']);
        $contractTotal = $this->contextNumber($operationalAnalytics, ['contracts', 'contract_total']);
        $permitCount = $this->contextNumber($operationalAnalytics, ['permits', 'permit_count']);

        $compliant = $this->contextNumber($operationalAnalytics, ['compliant', 'compliant_records']);
        $nonCompliant = $this->contextNumber($operationalAnalytics, ['non_compliant', 'noncompliant', 'non_compliant_records']);
        $pendingCompliance = $this->contextNumber($operationalAnalytics, ['pending_compliance', 'pending']);
        $overdueCompliance = $this->contextNumber($operationalAnalytics, ['overdue_compliance', 'overdue']);

        $complianceTotal = $compliant + $nonCompliant + $pendingCompliance + $overdueCompliance;
        $complianceRate = $complianceTotal > 0 ? ($compliant / $complianceTotal) * 100 : 0;

        $documentTotal = $this->contextNumber($operationalAnalytics, ['documents', 'document_total']);
        $expiredDocuments = $this->contextNumber($operationalAnalytics, ['expired_documents', 'documents_expired']);
        $expiringDocuments = $this->contextNumber($operationalAnalytics, ['expiring_documents', 'documents_expiring']);
        $lockedDocuments = $this->contextNumber($operationalAnalytics, ['locked_documents', 'locked']);

        $trendAnalysis = $this->analyzeHistoricalTrends($historicalTrends);
        $projectionAnalysis = $this->analyzeContextProjections($possibleProjections);
        $expirationAnalysis = $this->analyzeContextExpirations($upcomingExpirations);

        $priorities = [];

        if ($outstanding > 0) $priorities[] = "Review outstanding receivables of " . $this->formatCurrency($outstanding) . ".";
        if ($overdueInvoiceCount > 0) $priorities[] = "Review {$overdueInvoiceCount} overdue invoice" . ($overdueInvoiceCount === 1 ? '' : 's') . ".";
        if ($expiringContracts > 0) $priorities[] = "Monitor {$expiringContracts} contract" . ($expiringContracts === 1 ? '' : 's') . " approaching expiration.";
        if ($expiredContracts > 0) $priorities[] = "Review {$expiredContracts} expired contract" . ($expiredContracts === 1 ? '' : 's') . ".";
        if ($nonCompliant > 0) $priorities[] = "Review {$nonCompliant} non-compliant record" . ($nonCompliant === 1 ? '' : 's') . ".";
        if ($pendingCompliance > 0) $priorities[] = "Follow up on {$pendingCompliance} pending compliance record" . ($pendingCompliance === 1 ? '' : 's') . ".";
        if ($overdueCompliance > 0) $priorities[] = "Review {$overdueCompliance} overdue compliance item" . ($overdueCompliance === 1 ? '' : 's') . ".";
        if ($expiredDocuments > 0) $priorities[] = "Review {$expiredDocuments} expired document" . ($expiredDocuments === 1 ? '' : 's') . ".";
        if ($expiringDocuments > 0) $priorities[] = "Monitor {$expiringDocuments} document" . ($expiringDocuments === 1 ? '' : 's') . " approaching expiration.";
        if ($lockedDocuments > 0) $priorities[] = "{$lockedDocuments} document" . ($lockedDocuments === 1 ? ' is' : 's are') . " currently locked.";

        $lines = [];
        $lines[] = 'EXECUTIVE OVERVIEW';
        $lines[] = "The report contains {$totalActivity} total module activities across the supplied ALIBATON reporting data.";
        $lines[] = "Highest recorded activity: {$strongestModule}.";
        $lines[] = "Lowest positive activity: {$weakestModule}.";
        $lines[] = '';
        $lines[] = 'FINANCIAL POSITION';
        $lines[] = "Invoice total: " . $this->formatCurrency($invoiceTotal);
        $lines[] = "Payment total: " . $this->formatCurrency($paymentTotal);
        $lines[] = "Outstanding: " . $this->formatCurrency($outstanding);
        $lines[] = "Collection rate: " . number_format($collectionRate, 2) . '%';
        $lines[] = "Paid payments: {$paidPayments}; Partial payments: {$partialPayments}; Pending payments: {$pendingPayments}.";
        $lines[] = '';
        $lines[] = 'OPERATIONAL ACTIVITY';
        foreach ($moduleCounts as $label => $count) $lines[] = "- {$label}: " . $this->formatNumber($count);
        $lines[] = '';
        $lines[] = 'CONTRACTS & PERMITS';
        $lines[] = "Total contracts: {$contractTotal}.";
        $lines[] = "Active contracts: {$activeContracts}.";
        $lines[] = "Expiring contracts: {$expiringContracts}.";
        $lines[] = "Expired contracts: {$expiredContracts}.";
        $lines[] = "Permits: {$permitCount}.";
        $lines[] = '';
        $lines[] = 'COMPLIANCE STATUS';
        $lines[] = "Compliant: {$compliant}.";
        $lines[] = "Non-compliant: {$nonCompliant}.";
        $lines[] = "Pending: {$pendingCompliance}.";
        $lines[] = "Overdue: {$overdueCompliance}.";
        $lines[] = "Compliance rate: " . number_format($complianceRate, 2) . '%.';
        $lines[] = '';
        $lines[] = 'DOCUMENT STATUS';
        $lines[] = "Total documents: {$documentTotal}.";
        $lines[] = "Expired documents: {$expiredDocuments}.";
        $lines[] = "Expiring documents: {$expiringDocuments}.";
        $lines[] = "Locked documents: {$lockedDocuments}.";
        $lines[] = '';
        $lines[] = 'HISTORICAL TREND ANALYSIS';

        if ($trendAnalysis['items']) {
            foreach ($trendAnalysis['items'] as $trend) {
                $lines[] = "- {$trend['label']}: {$trend['direction']} ({$trend['change']}%).";
            }
        } else {
            $lines[] = 'No sufficient historical trend data was supplied.';
        }

        $lines[] = '';
        $lines[] = 'POSSIBLE FUTURE PROJECTIONS';

        if ($projectionAnalysis['items']) {
            foreach ($projectionAnalysis['items'] as $projection) {
                $lines[] = "- {$projection['label']}: {$projection['value']}"
                    . ($projection['growth'] !== null ? " ({$projection['growth']}% growth)" : '') . '.';
            }
            $lines[] = 'These are estimates based on historical data, not guaranteed future results.';
        } else {
            $lines[] = 'No sufficient projection data was supplied.';
        }

        $lines[] = '';
        $lines[] = 'UPCOMING EXPIRATIONS';

        if ($expirationAnalysis['items']) {
            foreach ($expirationAnalysis['items'] as $expiration) {
                $days = $expiration['days'];
                $dayText = $days === null ? 'date not available'
                    : ($days < 0 ? abs($days) . ' day(s) overdue' : $days . ' day(s) remaining');
                $lines[] = "- {$expiration['module']}: {$expiration['title']} — {$expiration['status']} — {$dayText}.";
            }
        } else {
            $lines[] = 'No upcoming expiration records were supplied.';
        }

        $lines[] = '';
        $lines[] = 'MANAGEMENT PRIORITIES';

        if ($priorities) {
            foreach ($priorities as $priority) $lines[] = "- {$priority}";
        } else {
            $lines[] = 'No priority issue was identified from the supplied report context.';
        }

        $lines[] = '';
        $lines[] = 'MANAGEMENT CONCLUSION';
        $lines[] = 'This summary is based on the database-backed report context provided by the ALIBATON Reports module. Historical and projection sections should be treated as analytical estimates rather than guaranteed future outcomes.';

        return response()->json([
            'message' => implode("\n", $lines),
            'visual' => 'management_summary',
            'visualData' => [
                'modules' => $moduleCounts,
                'total' => $totalActivity,
                'highest' => $strongestModule,
                'lowest' => $weakestModule,
                'financial' => [
                    'invoice_total' => $invoiceTotal,
                    'payment_total' => $paymentTotal,
                    'outstanding' => $outstanding,
                    'collection_rate' => $collectionRate,
                ],
                'contracts' => [
                    'total' => $contractTotal,
                    'active' => $activeContracts,
                    'expiring' => $expiringContracts,
                    'expired' => $expiredContracts,
                ],
                'compliance' => [
                    'compliant' => $compliant,
                    'non_compliant' => $nonCompliant,
                    'pending' => $pendingCompliance,
                    'overdue' => $overdueCompliance,
                    'rate' => $complianceRate,
                ],
                'documents' => [
                    'total' => $documentTotal,
                    'expired' => $expiredDocuments,
                    'expiring' => $expiringDocuments,
                    'locked' => $lockedDocuments,
                ],
                'trend_count' => count($trendAnalysis['items']),
                'projection_count' => count($projectionAnalysis['items']),
                'expiration_count' => count($expirationAnalysis['items']),
            ],
            'records' => [
                'modules' => $moduleRecords,
                'historical_trends' => $historicalTrends,
                'projections' => $possibleProjections,
                'expirations' => $upcomingExpirations,
            ],
            'report' => null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | HIGHEST ACTIVITY
    |--------------------------------------------------------------------------
    */

    private function highestActivityReport(): JsonResponse
    {
        $modules = [
            'Billing / Invoices' => Invoice::query()->count(),
            'Payments' => Payment::query()->count(),
            'Documents' => Document::query()->count(),
            'Compliance' => Compliance::query()->count(),
            'Contracts / Permits' => Contract::query()->count(),
            'Job Orders' => JobOrder::query()->count(),
            'Staff' => User::where('role', 'staff')->count(),
            'Clients' => User::where('role', 'client')->count(),
        ];

        arsort($modules);

        $highestValue = max($modules);
        $highest = array_keys(array_filter($modules, fn ($value) => $value === $highestValue));
        $ranking = [];

        foreach ($modules as $label => $count) {
            $ranking[] = ['module' => $label, 'count' => $count];
        }

        $csv = $this->createReportFile(['module_activity' => $ranking], 'ALIBATON Module Activity Report');

        if ($highestValue === 0) {
            return response()->json([
                'message' => 'The live ALIBATON database currently contains no records across the checked modules.',
                'visual' => 'module_activity',
                'visualData' => ['modules' => $modules, 'highest' => []],
                'records' => ['module_activity' => $ranking],
                'report' => $csv,
            ]);
        }

        return response()->json([
            'message' => "Based on the live ALIBATON database, the highest recorded activity is {$highestValue} record"
                . ($highestValue === 1 ? '' : 's') . " in: " . implode(', ', $highest) . ".\n\n"
                . "Module activity ranking:\n"
                . collect($ranking)->map(fn ($item, $index) => ($index + 1) . ". " . $item['module'] . " — " . $item['count'])->implode("\n"),
            'visual' => 'module_activity',
            'visualData' => [
                'modules' => $modules,
                'highest' => $highest,
                'highest_value' => $highestValue,
            ],
            'records' => ['module_activity' => $ranking],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL SITUATION
    |--------------------------------------------------------------------------
    */

    private function financialSituationReport(): JsonResponse
    {
        $invoices = Invoice::query()->get();
        $payments = Payment::query()->get();

        $invoiceTotal = $this->invoiceAmountTotal($invoices);
        $paymentTotal = $this->paymentAmountTotal($payments);

        $outstanding = max(0, $invoiceTotal - $paymentTotal);
        $collectionRate = $invoiceTotal > 0 ? ($paymentTotal / $invoiceTotal) * 100 : 0;

        $invoiceStatuses = $this->statusCounts($invoices, ['status', 'invoice_status', 'payment_status']);
        $paymentStatuses = $this->statusCounts($payments, ['status', 'payment_status']);

        if ($invoiceTotal == 0 && $paymentTotal == 0 && $invoices->isEmpty() && $payments->isEmpty()) {
            return response()->json([
                'message' => 'There is not enough financial data in the live ALIBATON database to produce a financial situation analysis.',
                'visual' => 'financial',
                'visualData' => [
                    'invoice_total' => 0,
                    'payment_total' => 0,
                    'outstanding' => 0,
                    'collection_rate' => 0,
                ],
                'records' => [],
                'report' => null,
            ]);
        }

        $statusText = $outstanding <= 0
            ? 'Recorded invoice amounts are fully covered by recorded payments.'
            : ($collectionRate >= 75
                ? 'The recorded payment coverage is relatively high, but an outstanding balance remains.'
                : ($collectionRate >= 50
                    ? 'The records show moderate payment coverage with an outstanding balance.'
                    : 'A significant portion of recorded invoice value remains outstanding.'));

        $csv = $this->createReportFile([
            'invoices' => $this->cleanRecords($invoices),
            'payments' => $this->cleanRecords($payments),
        ], 'ALIBATON Financial Situation Report');

        return response()->json([
            'message' => "FINANCIAL SITUATION\n\n"
                . "Invoice total: " . $this->formatCurrency($invoiceTotal) . "\n"
                . "Payment total: " . $this->formatCurrency($paymentTotal) . "\n"
                . "Outstanding balance: " . $this->formatCurrency($outstanding) . "\n"
                . "Collection rate: " . number_format($collectionRate, 2) . "%\n\n"
                . $statusText,
            'visual' => 'financial',
            'visualData' => [
                'invoice_total' => $invoiceTotal,
                'payment_total' => $paymentTotal,
                'outstanding' => $outstanding,
                'collection_rate' => $collectionRate,
                'invoice_statuses' => $invoiceStatuses,
                'payment_statuses' => $paymentStatuses,
            ],
            'records' => [
                'invoices' => $this->cleanRecords($invoices),
                'payments' => $this->cleanRecords($payments),
            ],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | FUTURE PROJECTION
    |--------------------------------------------------------------------------
    */

    private function futureProjectionReport(): JsonResponse
    {
        $invoices = Invoice::query()->get();
        $payments = Payment::query()->get();

        $invoiceMonthly = $this->monthlyAmounts($invoices, ['total_amount', 'amount', 'grand_total']);
        $paymentMonthly = $this->monthlyAmounts($payments, ['amount', 'paid_amount', 'total_amount']);

        $invoiceValues = array_values($invoiceMonthly);
        $paymentValues = array_values($paymentMonthly);

        if (count($invoiceValues) < 1 && count($paymentValues) < 1) {
            return response()->json([
                'message' => 'There is not enough historical financial data to calculate a projection.',
                'visual' => 'projection',
                'visualData' => ['available' => false],
                'records' => [],
                'report' => null,
            ]);
        }

        $averageInvoice = count($invoiceValues) ? array_sum($invoiceValues) / count($invoiceValues) : 0;
        $averagePayment = count($paymentValues) ? array_sum($paymentValues) / count($paymentValues) : 0;

        $invoiceGrowth = $this->calculateGrowthRate($invoiceValues);
        $paymentGrowth = $this->calculateGrowthRate($paymentValues);

        $projectedInvoice = $averageInvoice * (1 + ($invoiceGrowth / 100));
        $projectedPayment = $averagePayment * (1 + ($paymentGrowth / 100));

        $csv = $this->createReportFile([
            'invoice_monthly' => $this->monthlyRows($invoiceMonthly),
            'payment_monthly' => $this->monthlyRows($paymentMonthly),
            'projection' => [
                ['metric' => 'Invoice Amount', 'average_monthly' => $averageInvoice, 'growth_rate' => $invoiceGrowth, 'projected_next_period' => $projectedInvoice],
                ['metric' => 'Payment Amount', 'average_monthly' => $averagePayment, 'growth_rate' => $paymentGrowth, 'projected_next_period' => $projectedPayment],
            ],
        ], 'ALIBATON Future Projection Report');

        $invoiceTrend = $invoiceGrowth > 5 ? 'rising' : ($invoiceGrowth < -5 ? 'declining' : 'stable');
        $paymentTrend = $paymentGrowth > 5 ? 'rising' : ($paymentGrowth < -5 ? 'declining' : 'stable');

        return response()->json([
            'message' => "FUTURE PROJECTION\n\n"
                . "Historical invoice trend: " . $invoiceTrend . " (" . number_format($invoiceGrowth, 2) . "%).\n"
                . "Historical payment trend: " . $paymentTrend . " (" . number_format($paymentGrowth, 2) . "%).\n\n"
                . "Estimated next-period invoice amount: " . $this->formatCurrency($projectedInvoice) . "\n"
                . "Estimated next-period payment amount: " . $this->formatCurrency($projectedPayment) . "\n\n"
                . "These figures are historical-data-based estimates and are not guaranteed future results.",
            'visual' => 'projection',
            'visualData' => [
                'available' => true,
                'average_invoice' => $averageInvoice,
                'average_payment' => $averagePayment,
                'invoice_growth' => $invoiceGrowth,
                'payment_growth' => $paymentGrowth,
                'projected_invoice' => $projectedInvoice,
                'projected_payment' => $projectedPayment,
                'invoice_trend' => $invoiceTrend,
                'payment_trend' => $paymentTrend,
            ],
            'records' => [
                'invoice_monthly' => $this->monthlyRows($invoiceMonthly),
                'payment_monthly' => $this->monthlyRows($paymentMonthly),
            ],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | EXPIRING RECORDS
    |--------------------------------------------------------------------------
    */

    private function expiringRecordsReport(): JsonResponse
    {
        $today = Carbon::today();
        $limit = $today->copy()->addDays(90);

        $records = collect();

        $contracts = Contract::query()->get();

        foreach ($contracts as $contract) {
            $date = $this->firstDateValue($contract, ['expiry_date', 'expiration_date', 'end_date', 'contract_expiry']);

            if ($date && $date->betweenIncluded($today, $limit)) {
                $records->push([
                    'module' => 'Contract',
                    'id' => $contract->id,
                    'title' => $contract->contract_no ?: 'Contract #' . $contract->id,
                    'expiry_date' => $date->toDateString(),
                    'days_until_expiry' => $today->diffInDays($date, false),
                ]);
            }
        }

        $documents = Document::query()->get();

        foreach ($documents as $document) {
            $date = $this->firstDateValue($document, ['expiry_date', 'expiration_date', 'expires_at']);

            if ($date && $date->betweenIncluded($today, $limit)) {
                $records->push([
                    'module' => 'Document',
                    'id' => $document->id,
                    'title' => $document->title ?: $document->file_name ?: 'Document #' . $document->id,
                    'expiry_date' => $date->toDateString(),
                    'days_until_expiry' => $today->diffInDays($date, false),
                ]);
            }
        }

        $records = $records->sortBy('days_until_expiry')->values();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => 'No contracts, permits, or documents were found with an expiration date within the next 90 days.',
                'visual' => 'expiration',
                'visualData' => ['total' => 0, 'contracts' => 0, 'documents' => 0],
                'records' => ['expirations' => []],
                'report' => null,
            ]);
        }

        $clean = $records->map(function ($record) {
            $days = $record['days_until_expiry'];
            $status = $days < 0 ? 'Expired'
                : ($days <= 30 ? 'Critical — within 30 days'
                    : ($days <= 90 ? 'Expiring soon' : 'Upcoming'));
            return [...$record, 'status' => $status];
        })->values();

        $csv = $this->createReportFile(['expirations' => $clean->all()], 'ALIBATON Expiring Records Report');

        return response()->json([
            'message' => "I found {$clean->count()} contract/document record"
                . ($clean->count() === 1 ? '' : 's')
                . " with an expiration date within the next 90 days.\n\n"
                . $clean->map(fn ($record) => "- " . $record['module'] . ": " . $record['title']
                    . " — " . $record['status'] . " — " . $record['expiry_date'])->implode("\n"),
            'visual' => 'expiration',
            'visualData' => [
                'total' => $clean->count(),
                'contracts' => $clean->where('module', 'Contract')->count(),
                'documents' => $clean->where('module', 'Document')->count(),
            ],
            'records' => ['expirations' => $clean->all()],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLIANCE ISSUES REPORT
    |--------------------------------------------------------------------------
    */

    private function complianceIssuesReport(): JsonResponse
    {
        $compliances = Compliance::query()->get();

        $issues = $compliances->filter(function ($compliance) {
            $status = Str::lower(trim((string) ($compliance->compliance_status ?? $compliance->status ?? '')));
            return Str::contains($status, ['non-compliant', 'non compliant', 'noncompliant', 'pending', 'review', 'expired', 'reject']);
        })->values();

        $statuses = $this->statusCounts($compliances, ['compliance_status', 'status', 'monitoring_status']);

        if ($issues->isEmpty()) {
            return response()->json([
                'message' => 'No obvious compliance issues were identified from the current recorded compliance statuses.',
                'visual' => 'compliance',
                'visualData' => ['total' => $compliances->count(), 'issues' => 0, 'statuses' => $statuses],
                'records' => ['compliance' => $this->cleanRecords($compliances)],
                'report' => null,
            ]);
        }

        $cleanIssues = $this->cleanRecords($issues);
        $csv = $this->createReportFile(['compliance_issues' => $cleanIssues], 'ALIBATON Compliance Issues Report');

        return response()->json([
            'message' => "I found {$issues->count()} compliance record"
                . ($issues->count() === 1 ? '' : 's')
                . " requiring review based on their recorded status.\n\n"
                . $issues->map(fn ($item) => "- " . ($item->title ?: 'Compliance #' . $item->id)
                    . " — " . ($item->status ?: $item->compliance_status ?: 'Unknown'))->implode("\n"),
            'visual' => 'compliance',
            'visualData' => ['total' => $compliances->count(), 'issues' => $issues->count(), 'statuses' => $statuses],
            'records' => ['compliance' => $cleanIssues],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE REQUESTED REPORT
    |--------------------------------------------------------------------------
    */

    private function generateRequestedReport(string $lower): JsonResponse
    {
        if ($this->isFinancialQuestion($lower)) return $this->financialSituationReport();
        if ($this->isProjectionQuestion($lower)) return $this->futureProjectionReport();
        if ($this->isExpiringQuestion($lower)) return $this->expiringRecordsReport();
        if ($this->isComplianceQuestion($lower)) return $this->complianceIssuesReport();
        if ($this->isHighestActivityQuestion($lower)) return $this->highestActivityReport();

        if (Str::contains($lower, 'payment')) return $this->paymentReport();
        if (Str::contains($lower, ['invoice', 'billing'])) return $this->invoiceReport();
        if ($this->isReportsQuestion($lower)) return $this->reportsSummary();

        return $this->completeSystemSummary();
    }

    /*
    |--------------------------------------------------------------------------
    | REPORTS SUMMARY
    |--------------------------------------------------------------------------
    */

    private function reportsSummary(): JsonResponse
    {
        $disk = Storage::disk('public');
        $directory = 'alibaton-ai-reports';

        if (!$disk->exists($directory)) {
            return response()->json([
                'message' => 'No ALIBATON AI-generated reports have been created yet.',
                'visual' => 'reports',
                'visualData' => ['count' => 0, 'types' => []],
                'records' => ['reports' => []],
                'report' => null,
            ]);
        }

        $files = $disk->files($directory);

        $records = collect($files)->map(function ($path) {
            $name = basename($path);
            $lower = Str::lower($name);

            $type = match (true) {
                Str::contains($lower, 'invoice') => 'Invoice',
                Str::contains($lower, 'payment') => 'Payment',
                Str::contains($lower, 'financial') => 'Financial',
                Str::contains($lower, 'projection') => 'Projection',
                Str::contains($lower, 'expiring') => 'Expiring',
                Str::contains($lower, 'compliance') => 'Compliance',
                Str::contains($lower, 'module-activity') => 'Module Activity',
                Str::contains($lower, 'complete-database') => 'Complete Database',
                Str::contains($lower, 'staff') => 'Staff',
                Str::contains($lower, 'client') => 'Client',
                Str::contains($lower, 'document') => 'Document',
                Str::contains($lower, 'contract') => 'Contract',
                Str::contains($lower, 'job-order') => 'Job Order',
                default => 'Other',
            };

            $reportDisk = Storage::disk('public');

            return [
                'name' => $name,
                'path' => $path,
                'url' => asset('storage/' . $path),
                'type' => $type,
                'size' => $reportDisk->size($path),
                'last_modified' => Carbon::createFromTimestamp($reportDisk->lastModified($path))->toDateTimeString(),
            ];
        })->sortByDesc('last_modified')->values();

        $types = $records->groupBy('type')->map->count()->all();

        return response()->json([
            'message' => "There are {$records->count()} generated ALIBATON AI report file"
                . ($records->count() === 1 ? '' : 's') . " available.",
            'visual' => 'reports',
            'visualData' => ['count' => $records->count(), 'types' => $types],
            'records' => ['reports' => $records->all()],
            'report' => null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE REPORT
    |--------------------------------------------------------------------------
    */

    private function invoiceReport(): JsonResponse
    {
        $invoices = Invoice::query()->get();
        $total = $this->invoiceAmountTotal($invoices);
        $records = $this->cleanRecords($invoices);
        $csv = $this->createReportFile(['invoices' => $records], 'ALIBATON Invoice Report');

        return response()->json([
            'message' => "ALIBATON Invoice Report\n\n"
                . "Total invoice records: " . $invoices->count() . "\n"
                . "Total invoice amount: " . $this->formatCurrency($total),
            'visual' => 'invoice',
            'visualData' => [
                'total' => $invoices->count(),
                'total_amount' => $total,
                'statuses' => $this->statusCounts($invoices, ['status', 'invoice_status', 'payment_status']),
            ],
            'records' => ['invoices' => $records],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT REPORT
    |--------------------------------------------------------------------------
    */

    private function paymentReport(): JsonResponse
    {
        $payments = Payment::query()->get();
        $total = $this->paymentAmountTotal($payments);
        $records = $this->cleanRecords($payments);
        $csv = $this->createReportFile(['payments' => $records], 'ALIBATON Payment Report');

        return response()->json([
            'message' => "ALIBATON Payment Report\n\n"
                . "Total payment records: " . $payments->count() . "\n"
                . "Total payment amount: " . $this->formatCurrency($total),
            'visual' => 'payment',
            'visualData' => [
                'total' => $payments->count(),
                'total_amount' => $total,
                'statuses' => $this->statusCounts($payments, ['status', 'payment_status']),
            ],
            'records' => ['payments' => $records],
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLETE SYSTEM SUMMARY
    |--------------------------------------------------------------------------
    */

    private function completeSystemSummary(): JsonResponse
    {
        $staff = User::where('role', 'staff')->get();
        $clients = User::where('role', 'client')->get();

        $invoices = Invoice::query()->get();
        $payments = Payment::query()->get();
        $documents = Document::query()->get();
        $compliances = Compliance::query()->get();
        $contracts = Contract::query()->get();
        $jobOrders = JobOrder::query()->get();

        $invoiceTotal = $this->invoiceAmountTotal($invoices);
        $paymentTotal = $this->paymentAmountTotal($payments);

        $records = [
            'staff' => $this->cleanRecords($staff),
            'clients' => $this->cleanRecords($clients),
            'invoices' => $this->cleanRecords($invoices),
            'payments' => $this->cleanRecords($payments),
            'documents' => $this->cleanRecords($documents),
            'compliance' => $this->cleanRecords($compliances),
            'contracts' => $this->cleanRecords($contracts),
            'job_orders' => $this->cleanRecords($jobOrders),
        ];

        $csv = $this->createReportFile($records, 'ALIBATON Complete Database Summary');

        return response()->json([
            'message' => "ALIBATON SYSTEM SUMMARY\n\n"
                . "Staff: {$staff->count()}\n"
                . "Clients: {$clients->count()}\n"
                . "Invoices: {$invoices->count()}\n"
                . "Payments: {$payments->count()}\n"
                . "Documents: {$documents->count()}\n"
                . "Compliance: {$compliances->count()}\n"
                . "Contracts: {$contracts->count()}\n"
                . "Job Orders: {$jobOrders->count()}\n\n"
                . "Invoice total: " . $this->formatCurrency($invoiceTotal) . "\n"
                . "Payment total: " . $this->formatCurrency($paymentTotal),
            'visual' => 'summary',
            'visualData' => [
                'staff' => $staff->count(),
                'clients' => $clients->count(),
                'invoices' => $invoices->count(),
                'payments' => $payments->count(),
                'documents' => $documents->count(),
                'compliance' => $compliances->count(),
                'contracts' => $contracts->count(),
                'job_orders' => $jobOrders->count(),
                'financial' => [
                    'invoice_total' => $invoiceTotal,
                    'payment_total' => $paymentTotal,
                    'outstanding' => max(0, $invoiceTotal - $paymentTotal),
                ],
                'invoice_statuses' => $this->statusCounts($invoices, ['status', 'invoice_status', 'payment_status']),
                'payment_statuses' => $this->statusCounts($payments, ['status', 'payment_status']),
                'document_statuses' => $this->statusCounts($documents, ['status', 'compliance_status']),
                'compliance_statuses' => $this->statusCounts($compliances, ['status', 'compliance_status', 'monitoring_status']),
                'contract_statuses' => $this->statusCounts($contracts, ['status', 'workflow_status']),
                'job_order_statuses' => $this->statusCounts($jobOrders, ['status']),
            ],
            'records' => $records,
            'report' => $csv,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | NUMERIC HELPERS
    |--------------------------------------------------------------------------
    */

    private function contextNumber(array $data, array $keys): float
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                return $this->toNumber($data[$key]);
            }
        }
        return 0;
    }

    private function toNumber($value): float
    {
        if ($value === null || $value === '' || is_bool($value)) return 0;
        if (is_numeric($value)) return (float) $value;
        $clean = preg_replace('/[^0-9.\-]/', '', (string) $value);
        return is_numeric($clean) ? (float) $clean : 0;
    }

    private function formatCurrency($value): string
    {
        return '₱' . number_format($this->toNumber($value), 2);
    }

    private function formatNumber($value): string
    {
        return number_format($this->toNumber($value), 0);
    }

    /*
    |--------------------------------------------------------------------------
    | HISTORICAL TREND
    |--------------------------------------------------------------------------
    */

    private function analyzeHistoricalTrends(array $trends): array
    {
        $metrics = [
            'invoices' => 'Invoices',
            'payments' => 'Payments',
            'job_orders' => 'Job Orders',
            'contracts' => 'Contracts',
            'permits' => 'Permits',
            'documents' => 'Documents',
            'compliance' => 'Compliance',
            'compliances' => 'Compliance',
        ];

        $items = [];

        foreach ($metrics as $key => $label) {
            $values = [];

            foreach ($trends as $row) {
                if (is_array($row) && array_key_exists($key, $row) && is_numeric($row[$key])) {
                    $values[] = (float) $row[$key];
                }
            }

            if (count($values) < 2) continue;

            $first = $values[0];
            $last = $values[count($values) - 1];
            $change = $first == 0
                ? ($last > 0 ? 100 : 0)
                : ((($last - $first) / abs($first)) * 100);

            $direction = $change > 5 ? 'Rising' : ($change < -5 ? 'Declining' : 'Stable');

            $items[] = [
                'label' => $label,
                'direction' => $direction,
                'change' => round($change, 2),
            ];
        }

        return ['items' => $items];
    }

    /*
    |--------------------------------------------------------------------------
    | PROJECTION CONTEXT
    |--------------------------------------------------------------------------
    */

    private function analyzeContextProjections(array $projections): array
    {
        $items = [];

        foreach ($projections as $projection) {
            if (!is_array($projection)) continue;

            $label = $projection['label']
                ?? $projection['module']
                ?? $projection['metric']
                ?? 'Projection';

            $value = null;

            foreach (['projected_amount', 'projected_value', 'possible_projection', 'current_value', 'actual_value'] as $key) {
                if (array_key_exists($key, $projection) && $projection[$key] !== null) {
                    $value = $this->toNumber($projection[$key]);
                    break;
                }
            }

            if ($value === null) continue;

            $growth = null;

            if (array_key_exists('growth_rate', $projection)) {
                $growth = round($this->toNumber($projection['growth_rate']), 2);
            }

            $items[] = [
                'label' => (string) $label,
                'value' => $this->projectionLooksCurrency($projection, $label)
                    ? $this->formatCurrency($value)
                    : $this->formatNumber($value),
                'growth' => $growth,
            ];
        }

        return ['items' => $items];
    }

    private function projectionLooksCurrency(array $projection, string $label): bool
    {
        $text = Str::lower($label . ' ' . implode(' ', array_map('strval', array_keys($projection))));

        return Str::contains($text, [
            'amount', 'revenue', 'payment', 'invoice', 'income', 'peso', '₱', 'php',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | EXPIRATION CONTEXT
    |--------------------------------------------------------------------------
    */

    private function analyzeContextExpirations(array $expirations): array
    {
        if (!$expirations) return ['items' => []];

        $normalized = [];

        foreach ($expirations as $expiration) {
            if (!is_array($expiration)) continue;

            $title = $expiration['title'] ?? $expiration['name'] ?? $expiration['document_name'] ?? 'Unnamed Record';
            $module = $expiration['module'] ?? $expiration['record_type'] ?? $expiration['type'] ?? 'Record';
            $expiry = $expiration['expiry_date'] ?? $expiration['expires_at'] ?? $expiration['end_date'] ?? null;

            $days = null;

            if (array_key_exists('days_remaining', $expiration)) {
                $days = (int) $expiration['days_remaining'];
            } elseif (array_key_exists('days_until_expiry', $expiration)) {
                $days = (int) $expiration['days_until_expiry'];
            } elseif ($expiry) {
                try {
                    $days = Carbon::today()->diffInDays(Carbon::parse($expiry), false);
                } catch (\Throwable) {
                    $days = null;
                }
            }

            $status = $days === null
                ? ($expiration['status'] ?? 'Review')
                : ($days < 0 ? 'Expired'
                    : ($days <= 30 ? 'Critical — within 30 days'
                        : ($days <= 90 ? 'Expiring soon' : 'Upcoming')));

            $normalized[] = [
                'title' => (string) $title,
                'module' => (string) $module,
                'expiry_date' => $expiry,
                'days' => $days,
                'status' => (string) $status,
            ];
        }

        usort($normalized, function ($a, $b) {
            $aDays = $a['days'] ?? PHP_INT_MAX;
            $bDays = $b['days'] ?? PHP_INT_MAX;
            return $aDays <=> $bDays;
        });

        return ['items' => array_slice($normalized, 0, 10)];
    }

    /*
    |--------------------------------------------------------------------------
    | AMOUNT HELPERS
    |--------------------------------------------------------------------------
    */

    private function invoiceAmountTotal($invoices): float
    {
        $total = 0;

        foreach ($invoices as $invoice) {
            $value = null;

            foreach (['total_amount', 'amount', 'grand_total'] as $field) {
                $candidate = data_get($invoice, $field);
                if ($candidate !== null && $candidate !== '') {
                    $value = $candidate;
                    break;
                }
            }

            $total += $this->toNumber($value);
        }

        return $total;
    }

    private function paymentAmountTotal($payments): float
    {
        $total = 0;

        foreach ($payments as $payment) {
            $value = null;

            foreach (['amount', 'paid_amount', 'total_amount'] as $field) {
                $candidate = data_get($payment, $field);
                if ($candidate !== null && $candidate !== '') {
                    $value = $candidate;
                    break;
                }
            }

            $total += $this->toNumber($value);
        }

        return $total;
    }

    /*
    |--------------------------------------------------------------------------
    | MONTHLY HELPERS
    |--------------------------------------------------------------------------
    */

    private function monthlyAmounts($records, array $amountFields): array
    {
        $monthly = [];

        foreach ($records as $record) {
            $date = $this->firstDateValue($record, ['created_at', 'invoice_date', 'payment_date', 'date', 'issued_at']);
            if (!$date) continue;

            $month = $date->format('Y-m');
            $amount = null;

            foreach ($amountFields as $field) {
                $candidate = data_get($record, $field);
                if ($candidate !== null && $candidate !== '') {
                    $amount = $candidate;
                    break;
                }
            }

            $monthly[$month] = ($monthly[$month] ?? 0) + $this->toNumber($amount);
        }

        ksort($monthly);

        return $monthly;
    }

    private function monthlyRows(array $monthly): array
    {
        $rows = [];

        foreach ($monthly as $month => $amount) {
            $rows[] = ['month' => $month, 'amount' => round($amount, 2)];
        }

        return $rows;
    }

    private function calculateGrowthRate(array $values): float
    {
        if (count($values) < 2) return 0;

        $first = (float) $values[0];
        $last = (float) $values[count($values) - 1];

        if ($first == 0) return $last > 0 ? 100 : 0;

        return (($last - $first) / abs($first)) * 100;
    }

    /*
    |--------------------------------------------------------------------------
    | DATE HELPER
    |--------------------------------------------------------------------------
    */

    private function firstDateValue($record, array $fields): ?Carbon
    {
        foreach ($fields as $field) {
            $value = data_get($record, $field);
            if (!$value) continue;

            try {
                return Carbon::parse($value);
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS COUNTS
    |--------------------------------------------------------------------------
    */

    private function statusCounts($records, array $possibleColumns = []): array
    {
        $counts = [];

        if (!$possibleColumns) $possibleColumns = ['status'];

        foreach ($records as $record) {
            $status = null;

            foreach ($possibleColumns as $column) {
                $value = data_get($record, $column);

                if ($value !== null && trim((string) $value) !== '') {
                    $status = trim((string) $value);
                    break;
                }
            }

            if (!$status) $status = 'Unknown';

            $counts[$status] = ($counts[$status] ?? 0) + 1;
        }

        ksort($counts);

        return $counts;
    }

    private function formatStatusMessage(string $label, array $statuses): string
    {
        if (!$statuses) return "There are no {$label} records available.";

        $lines = ["Current {$label} status breakdown:", ''];

        foreach ($statuses as $status => $count) {
            $lines[] = "- {$status}: {$count}";
        }

        return implode("\n", $lines);
    }

    /*
    |--------------------------------------------------------------------------
    | CLEAN RECORDS
    |--------------------------------------------------------------------------
    */

    private function cleanRecords($records): array
    {
        $sensitiveFields = [
            'password', 'remember_token', 'email_verified_at',
            'otp', 'otp_code', 'otp_hash', 'otp_expires_at',
            'verification_code', 'verification_code_hash',
            'verification_code_expires_at', 'login_pin',
            'login_pin_hash', 'login_pin_expires_at',
            'two_factor_secret', 'two_factor_recovery_codes',
            'two_factor_confirmed_at', 'api_token', 'access_token',
            'refresh_token', 'token', 'secret', 'password_reset_token',
        ];

        $array = [];

        foreach ($records as $record) {
            if (is_object($record)) {
                $record = method_exists($record, 'toArray') ? $record->toArray() : (array) $record;
            }

            if (!is_array($record)) {
                $array[] = $record;
                continue;
            }

            $array[] = $this->cleanNestedArray($record, $sensitiveFields);
        }

        return $array;
    }

    private function cleanNestedArray(array $data, array $sensitiveFields): array
    {
        $sensitiveLookup = [];

        foreach ($sensitiveFields as $field) {
            $sensitiveLookup[Str::lower($field)] = true;
        }

        $clean = [];

        foreach ($data as $key => $value) {
            if (isset($sensitiveLookup[Str::lower((string) $key)])) continue;

            if (is_array($value)) {
                $clean[$key] = $this->cleanNestedArray($value, $sensitiveFields);
                continue;
            }

            if (is_object($value)) {
                $objectArray = method_exists($value, 'toArray') ? $value->toArray() : (array) $value;
                $clean[$key] = $this->cleanNestedArray($objectArray, $sensitiveFields);
                continue;
            }

            $clean[$key] = $value;
        }

        return $clean;
    }

    /*
    |--------------------------------------------------------------------------
    | CSV REPORT GENERATION
    |--------------------------------------------------------------------------
    */

    private function createReportFile(array $modules, string $fileName): array
    {
        $disk = Storage::disk('public');
        $directory = 'alibaton-ai-reports';

        if (!$disk->exists($directory)) {
            $disk->makeDirectory($directory);
        }

        $safeName = Str::slug($fileName);
        $filename = $safeName . '-' . now()->format('Ymd-His') . '-' . Str::random(6) . '.csv';
        $path = $directory . '/' . $filename;

        $content = $this->generateRecordsCsv($modules);

        $disk->put($path, $content);

        return [
            'name' => $filename,
            'path' => $path,
            'url' => asset('storage/' . $path),
            'content' => $content,
        ];
    }

    private function generateRecordsCsv(array $modules): string
    {
        $headers = [];

        foreach ($modules as $moduleRecords) {
            if (!is_array($moduleRecords)) continue;

            foreach ($moduleRecords as $record) {
                if (!is_array($record)) continue;

                foreach (array_keys($record) as $key) {
                    if (!in_array($key, $headers, true)) {
                        $headers[] = $key;
                    }
                }
            }
        }

        if (!$headers) $headers = ['message'];

        $handle = fopen('php://temp', 'r+');

        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, array_merge(['module'], $headers));

        foreach ($modules as $module => $moduleRecords) {
            if (!is_array($moduleRecords)) continue;

            if (!$moduleRecords) {
                $row = array_fill(0, count($headers), '');
                fputcsv($handle, array_merge([$module], $row));
                continue;
            }

            foreach ($moduleRecords as $record) {
                if (!is_array($record)) {
                    $record = ['message' => $record];
                }

                $row = [];

                foreach ($headers as $header) {
                    $value = $record[$header] ?? '';

                    if (is_array($value) || is_object($value)) {
                        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    }

                    $row[] = $value;
                }

                fputcsv($handle, array_merge([$module], $row));
            }
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return $content ?: '';
    }

    /*
    |--------------------------------------------------------------------------
    | FILE ATTACHMENT
    |--------------------------------------------------------------------------
    */

    private function fileAttachmentResponse(string $attachmentName): string
    {
        $extension = Str::lower(pathinfo($attachmentName, PATHINFO_EXTENSION));

        return "Received the attached {$extension} file \"{$attachmentName}\". "
            . "You can ask me to review, summarize, compare, "
            . "or relate the file's available information to "
            . "the authorized ALIBATON database records.";
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ SYSTEM MODULES GUIDE (Local AI — module knowledge base)
    |--------------------------------------------------------------------------
    |
    | Kapag tinanong ng user kung ano ang mga modules ng system,
    | paano gamitin ang isang module, o ano ang kaya ng sistema,
    | dito galing ang sagot ng AI.
    |
    */

    private function isSystemModulesQuestion(string $lower): bool
    {
        if (Str::contains($lower, [
            'what are the modules',
            'what modules',
            'list of modules',
            'system modules',
            'module list',
            'available modules',
            'what can you do',
            'what can you help',
            'ano ang kaya mo',
            'anong kaya mo',
            'ano ang ginagawa mo',
            'paano gamitin',
            'paano gumamit',
            'paano ko gamitin',
            'how to use',
            'how do i use',
            'how can i use',
            'how to use the system',
            'help me with the system',
            'module guide',
            'modules of the system',
            'ano ang mga module',
            'ano-ano ang module',
            'ano ano ang module',
            'anong mga module',
            'mga module ng system',
            'mga modules ng system',
            'ano ang system',
            'what is this system',
            'ano ang alibaton',
            'what is alibaton',
            'tutorial',
            'gabay',
            'ano ang billing module',
            'ano ang invoice module',
            'ano ang payment module',
            'ano ang job order module',
            'ano ang contract module',
            'ano ang permit module',
            'ano ang document module',
            'ano ang compliance module',
            'ano ang report module',
            'ano ang forecasting module',
            'ano ang forecast module',
            'ano ang user module',
            'what is the billing module',
            'what is the payment module',
            'what is the job order module',
            'what is the contract module',
            'what is the document module',
            'what is the compliance module',
            'what is the report module',
            'what is the forecasting module',
            'how does the billing module work',
            'how does the payment module work',
            'how does the job order module work',
            'how does the contract module work',
            'how does the document module work',
            'how does the compliance module work',
        ])) {
            return true;
        }

        // Bilang huling safety check: kung may "module" at "ano"/"paano"/"what"/"how"
        // ang tanong — module guide ito, hindi database query.
        if (Str::contains($lower, ['module', 'gabay', 'feature'])) {
            if (Str::contains($lower, ['ano', 'paano', 'what', 'how', 'help', 'list', 'gamitin', 'guide', 'kaya mo'])) {
                return true;
            }
        }

        return false;
    }

    private function systemModulesGuideResponse(string $lower): JsonResponse
    {
        $module = $this->detectRequestedModule($lower);

        $modules = [
            'billing' => [
                'name' => 'Billing / Invoices',
                'purpose' => 'Gumagawa ang staff ng Billing Records (Billing No. + Job Order No.) para sa mga client. Kapag na-submit, makakakita ang admin sa Billing Management at ia-approve ito. Sa approval pa lang nag-ge-generate ang Invoice Number (INV-YYYY-NNNN).',
                'flow' => "Staff → Create Billing Record (Billing No. + JO No.) → Admin approves → Invoice No. ayusin + Service Invoice makikita.\n\nSa Billing tab may 3 views: Pending Verification (hindi pa approve), Service Invoice (approved lang), at Rejected. Ang Approved lang ang may Invoice Number.",
                'ask' => 'Pwede mong i-ask: "ilang pending billing?", "ipakita ang mga approved invoice", "ano ang total ng billing ngayong buwan?"',
            ],
            'payment' => [
                'name' => 'Payment Management',
                'purpose' => 'Nirerecord ng staff ang mga bayad ng client. Ang bawat payment ay naka-link sa Billing No. at Job Order No. para malinaw kung anong billing ang binabayaran.',
                'flow' => "Staff records payment (may receipt ref + Billing No. + JO No.) → Admin makikita sa Payments → status: Partial / Fully Paid.\n\nSa Payment Management may option din na mag-print ng SOA, official receipt, at payment history.",
                'ask' => 'Pwede mong i-ask: "magkano ang nakolekta ngayong buwan?", "sino ang may unpaid balance?", "ipakita ang payments ni client X."',
            ],
            'job_order' => [
                'name' => 'Job Orders',
                'purpose' => 'Ang Job Order ang pinagmumulan ng trabaho — may Job Order No. at client info. Ito ang basehan ng Billing Record (Billing No. + JO No.).',
                'flow' => "Staff creates Job Order → puwedeng i-approve ng admin → nagiging reference ng Billing at Contracts.",
                'ask' => 'Pwede mong i-ask: "ilang job order ngayong buwan?", "ipakita ang mga job order ni client X."',
            ],
            'contract' => [
                'name' => 'Contracts / Permits',
                'purpose' => 'Naka-monitor dito ang mga kontrata at permits ng mga project: contract no, client, dates, status, at mga attachment.',
                'flow' => "Staff creates / submits contract o permit → review ng admin → approved status para sa final copy.",
                'ask' => 'Pwede mong i-ask: "ilang contract ang active?", "may expired na permit ba?", "ipakita ang contracts ni client X."',
            ],
            'document' => [
                'name' => 'Documents',
                'purpose' => 'Upload at management ng mga dokumento ng company at project files. May access request din ang staff kung kailangan ng dokumento.',
                'flow' => "Upload ng dokumento (with title/type) → puwedeng i-assign o i-archive. Staff ay pwedeng mag-request ng access sa document.",
                'ask' => 'Pwede mong i-ask: "ilan ang documents?", "ipakita ang mga uploaded documents.", "may access request ba na pending?"',
            ],
            'compliance' => [
                'name' => 'Compliance',
                'purpose' => 'Track ng mga regulatory at company compliance requirements — may title, status, due date, at assigned staff.',
                'flow' => "Staff creates compliance record → pwede ma-assign sa staff → i-monitor hanggang sa maging compliant.",
                'ask' => 'Pwede mong i-ask: "ano ang compliance status?", "may due ba na compliance ngayong buwan?"',
            ],
            'report' => [
                'name' => 'Reports / Forecasting',
                'purpose' => 'Gumagawa ng management reports ang staff at may FORECASTING pa para makita ang projected na income at activity base sa historical data.',
                'flow' => "Staff generates report (billing summary, collections, compliance, atbp.) → makikita sa Report Management ng admin.\n\nForecasting: may graphs at key insights na nag-e-explain ng trend — kung tataas o bababa ang projected na kita o activity.",
                'ask' => 'Pwede mong i-ask: "gumawa ng summary report ng billing", "ano ang forecast ngayong buwan?", "anong trend ng payments?"',
            ],
            'user' => [
                'name' => 'User Roles / Staff Accounts',
                'purpose' => 'Admin lang ang may access dito. Ginagawa ang staff accounts, naka-monitor ang online status, at may AUDIT LOG — kapag pinindot ang staff account, makikita ang buong activity history nila sa lahat ng modules.',
                'flow' => "Admin creates staff account → staff logs in → admin pwede i-view activity log ng staff (billing, payments, job orders, contracts, documents, atbp.) at i-delete o i-restore kung kinakailangan.",
                'ask' => 'Admin lang ang may access sa module na ito.',
            ],
        ];

        // Kung may partikular na module na tinatanong — detailed guide para dito.
        if ($module !== null && isset($modules[$module])) {
            $info = $modules[$module];

            return response()->json([
                'message' => "{$info['name']} MODULE\n\n"
                    . "📌 Ano ito:\n{$info['purpose']}\n\n"
                    . "🔄 Paano gumagana:\n{$info['flow']}\n\n"
                    . "🤖 Pwede mong i-ask sa akin:\n{$info['ask']}",
                'records' => [],
                'visualData' => null,
                'report' => null,
            ]);
        }

        // Walang specific module — buong gabay ng system modules.
        $lines = [
            "ALIBATON SYSTEM MODULES (Gabay)\n",
            "Ang ALIBATON ay may mga sumusunod na modules para sa billing, payments, job orders, contracts, documents, compliance, reports, at forecasting:",
            '',
        ];

        foreach ($modules as $key => $info) {
            $lines[] = "• {$info['name']} — {$info['purpose']}";
        }

        $lines[] = '';
        $lines[] = "Para sa detalyadong gabay ng isang module, itanong mo lang, halimbawa:";
        $lines[] = "• \"Paano gamitin ang Billing module?\"";
        $lines[] = "• \"Ano ang ginagawa sa Payment Management?\"";
        $lines[] = "• \"Paano gumagana ang Job Orders?\"";
        $lines[] = "• \"Ano ang Contracts/Permits module?\"";
        $lines[] = "• \"Paano gumawa ng report o i-forecast?\"";
        $lines[] = '';
        $lines[] = "Pwede mo rin akong tanungin tungkol sa records — halimbawa \"ilang pending billing?\", \"magkano ang nakolekta ngayong buwan?\", o \"ano ang forecast?\" at magbibigay ako ng totoong data mula sa database.";

        return response()->json([
            'message' => implode("\n", $lines),
            'records' => [],
            'visualData' => null,
            'report' => null,
        ]);
    }

    private function detectRequestedModule(string $lower): ?string
    {
        $pairs = [
            'billing' => ['billing', 'invoice', 'invoices', 'service invoice', 'official receipt'],
            'payment' => ['payment', 'payments', 'bayad', 'receivable'],
            'job_order' => ['job order', 'job orders', 'work order', 'jo module'],
            'contract' => ['contract', 'contracts', 'permit', 'permits', 'kasunduan'],
            'compliance' => ['compliance', 'regulatory', 'compliances'],
            'document' => ['document', 'documents', 'files', 'dokumento'],
            'report' => ['report', 'reports', 'forecasting', 'forecast', 'projection', 'pagtataya'],
            'user' => ['user', 'users', 'staff account', 'user roles', 'staff'],
        ];

        foreach ($pairs as $module => $keywords) {
            foreach ($keywords as $keyword) {
                if (Str::contains($lower, $keyword)) {
                    return $module;
                }
            }
        }

        return null;
    }
}
