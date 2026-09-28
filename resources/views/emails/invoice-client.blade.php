<!DOCTYPE html>
<html>
<head>
    <title>Invoice {{ $invoice->number }}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #f59e0b; padding-bottom: 15px; margin-bottom: 20px; }
        .status-approved { color: #10b981; font-weight: bold; }
        .status-rejected { color: #ef4444; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #f59e0b; color: #000; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .rejection-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0;color:#1a1a2e;">ALIBATON</h1>
            <p style="margin:5px 0 0;color:#666;">Heavy Equipment & Logistics Management System</p>
        </div>

        <h2 style="margin-top:0;">Invoice #{{ $invoice->number }}</h2>

        @if($customMessage)
            <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:15px 0;">
                {!! nl2br(e($customMessage)) !!}
            </div>
        @endif

        <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:15px 0;">
            <p><strong>Status:</strong> <span class="status-{{ strtolower($status) }}">{{ $status }}</span></p>
            <div class="detail-row"><span><strong>Client:</strong></span> <span>{{ $client }}</span></div>
            <div class="detail-row"><span><strong>Amount:</strong></span> <span>₱{{ number_format($invoice->amount, 2) }}</span></div>
            <div class="detail-row"><span><strong>Due Date:</strong></span> <span>{{ $dueDate }}</span></div>
            @if($project)
            <div class="detail-row"><span><strong>Project:</strong></span> <span>{{ $project }}</span></div>
            @endif
        </div>

        @if($status === 'Rejected' && $rejectionReason)
            <div class="rejection-box">
                <p style="margin:0;font-weight:bold;color:#ef4444;">Rejection Reason:</p>
                <p style="margin:5px 0 0;color:#333;">{{ $rejectionReason }}</p>
            </div>
        @endif

        <div style="margin:25px 0;">
            <a href="{{ route('billing.invoicing') }}" class="btn">View Invoice</a>
        </div>

        <div class="footer">
            <p>This is an automated notification from ALIBATON System.</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
