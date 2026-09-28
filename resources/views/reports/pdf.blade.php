<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'ALIBATON Report' }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #facc15;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #facc15;
            font-size: 28px;
            margin: 0;
        }
        .header p {
            color: #666;
            font-size: 12px;
            margin-top: 5px;
        }
        .info {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            line-height: 1.8;
        }
        .info strong {
            color: #555;
            display: inline-block;
            width: 130px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
            font-size: 18px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            color: #333;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #999;
            font-size: 11px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .total-row {
            font-weight: bold;
            background-color: #facc15 !important;
        }
        .text-center {
            text-align: center;
        }
        .no-data {
            text-align: center;
            color: #999;
            padding: 20px;
        }
        .badge-success { color: #28a745; }
        .badge-warning { color: #ffc107; }
        .badge-danger { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 ALIBATON Report</h1>
        <p>Generated: {{ now()->format('F d, Y H:i:s') }}</p>
    </div>

    <div class="info">
        <strong>Report Type:</strong> {{ $report['report_type'] ?? 'All' }}<br>
        <strong>Period:</strong> {{ $startDate ?? 'N/A' }} - {{ $endDate ?? 'N/A' }}
    </div>

    <!-- MODULE SUMMARY -->
    <h2>📋 Module Summary</h2>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Module</th>
                <th>Record Count</th>
                <th>Percentage</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $modules = $report['modules'] ?? [];
                $total = 0;
                foreach ($modules as $module) {
                    $total += $module['value'] ?? 0;
                }
                $rowNumber = 1;
            @endphp

            @forelse($modules as $module)
                @php 
                    $count = $module['value'] ?? 0;
                    $percentage = $total > 0 ? round(($count / $total) * 100, 1) : 0;
                    $label = $module['label'] ?? $module['module'] ?? 'Unknown';
                @endphp
                <tr>
                    <td>{{ $rowNumber++ }}</td>
                    <td><strong>{{ $label }}</strong></td>
                    <td>{{ number_format($count) }}</td>
                    <td>{{ $percentage }}%</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="no-data">No data available for the selected period.</td>
                </tr>
            @endforelse

            @if($total > 0)
            <tr class="total-row">
                <td colspan="2"><strong>TOTAL</strong></td>
                <td><strong>{{ number_format($total) }}</strong></td>
                <td><strong>100%</strong></td>
            </tr>
            @endif
        </tbody>
    </table>

    <!-- FINANCIAL SUMMARY -->
    @php 
        $financial = $report['financial'] ?? [];
        $summary = $report['summary'] ?? [];
    @endphp

    @if(!empty($financial) || !empty($summary))
    <h2>💰 Financial Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Metric</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Total Invoices</td>
                <td>₱{{ number_format($financial['invoice_total'] ?? $summary['total_invoices'] ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td>Total Payments</td>
                <td>₱{{ number_format($financial['payment_total'] ?? $summary['total_payments'] ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td><strong>Outstanding Balance</strong></td>
                <td><strong>₱{{ number_format($financial['outstanding'] ?? 0, 2) }}</strong></td>
            </tr>
            <tr>
                <td>Paid Amount</td>
                <td>₱{{ number_format($financial['paid'] ?? $summary['paid'] ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td>Pending Amount</td>
                <td>₱{{ number_format($financial['pending'] ?? $summary['pending'] ?? 0, 2) }}</td>
            </tr>
            <tr>
                <td>Overdue Count</td>
                <td>{{ number_format($financial['overdue'] ?? $summary['overdue'] ?? 0) }}</td>
            </tr>
        </tbody>
    </table>
    @endif

    <!-- HISTORICAL TRENDS -->
    @php 
        $trends = $report['historical_trends'] ?? $report['trends'] ?? [];
    @endphp

    @if(!empty($trends))
    <h2>📈 Historical Trends (Last 6 Months)</h2>
    <table>
        <thead>
            <tr>
                <th>Period</th>
                <th>Invoices</th>
                <th>Payments</th>
                <th>Contracts</th>
            </tr>
        </thead>
        <tbody>
            @foreach($trends as $trend)
            <tr>
                <td><strong>{{ $trend['period'] ?? $trend['month'] ?? 'N/A' }}</strong></td>
                <td>{{ number_format($trend['invoices'] ?? $trend['invoice_count'] ?? 0) }}</td>
                <td>{{ number_format($trend['payments'] ?? $trend['payment_count'] ?? 0) }}</td>
                <td>{{ number_format($trend['contracts'] ?? $trend['contract_count'] ?? 0) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <!-- UPCOMING EXPIRATIONS -->
    @php 
        $expirations = $report['expirations'] ?? [];
    @endphp

    @if(!empty($expirations))
    <h2>⚠️ Upcoming Expirations</h2>
    <table>
        <thead>
            <tr>
                <th>Record</th>
                <th>Type</th>
                <th>Expiry Date</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($expirations as $expiration)
            <tr>
                <td>{{ $expiration['title'] ?? $expiration['name'] ?? 'N/A' }}</td>
                <td>{{ $expiration['type'] ?? $expiration['module'] ?? 'N/A' }}</td>
                <td>{{ $expiration['expiry_date'] ?? $expiration['expires_at'] ?? 'N/A' }}</td>
                <td>
                    @php
                        $status = strtolower($expiration['status'] ?? 'active');
                    @endphp
                    @if($status === 'expired' || $status === 'overdue')
                        <span style="color: #dc3545;">⚠️ {{ ucfirst($status) }}</span>
                    @elseif($status === 'expiring' || $status === 'warning')
                        <span style="color: #ffc107;">⚡ {{ ucfirst($status) }}</span>
                    @else
                        <span style="color: #28a745;">✅ {{ ucfirst($status) }}</span>
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <div class="footer">
        <p>This report was automatically generated from ALIBATON system data.</p>
        <p>© {{ date('Y') }} ALIBATON. All rights reserved.</p>
    </div>
</body>
</html>