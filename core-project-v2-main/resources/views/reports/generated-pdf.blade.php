<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ $title ?? 'ALIBATON Report' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; line-height: 1.5; }

        .header {
            background: #0f172a;
            color: #fff;
            padding: 20px 25px;
            border-bottom: 4px solid #facc15;
            margin-bottom: 18px;
        }
        .brand { font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #facc15; text-transform: uppercase; }
        .brand-sub { font-size: 9px; color: #94a3b8; margin-top: 2px; }
        .header h1 { font-size: 18px; font-weight: bold; margin-top: 10px; color: #fff; }
        .header .subtitle { font-size: 10px; color: #94a3b8; margin-top: 3px; }

        .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; margin-bottom: 18px; }
        .meta table { width: 100%; border-collapse: collapse; }
        .meta td { padding: 4px 0; font-size: 10px; }
        .meta-label { color: #64748b; font-weight: bold; width: 90px; }
        .meta-value { color: #0f172a; font-weight: bold; }

        .section { margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
        .section-title { background: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; border-left: 4px solid #facc15; }
        .section-table { width: 100%; border-collapse: collapse; }
        .section-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; vertical-align: top; width: 50%; }
        .section-table td:last-child { border-right: none; }

        .value-label { font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .value-text { font-size: 12px; font-weight: bold; color: #0f172a; word-break: break-word; }
        .value-text.currency { color: #059669; }

        .empty { padding: 12px; color: #94a3b8; font-style: italic; font-size: 10px; }

        .footer { margin-top: 20px; padding-top: 12px; border-top: 2px solid #facc15; text-align: center; font-size: 9px; color: #64748b; }
        .footer strong { color: #facc15; }

        @page { margin: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">ALIBATON</div>
        <div class="brand-sub">System Reports</div>
        <h1>{{ $title ?? ($report->name ?? 'Report') }}</h1>
        <div class="subtitle">{{ $report->type ?? 'Report' }}</div>
    </div>

    <div class="meta">
        <table>
            <tr>
                <td class="meta-label">Date Range:</td>
                <td class="meta-value">{{ $report->date_range ?? '' }}</td>
                <td class="meta-label">Generated:</td>
                <td class="meta-value">{{ $report->created_at?->format('F d, Y h:i A') ?? now()->format('F d, Y h:i A') }}</td>
            </tr>
            <tr>
                <td class="meta-label">Created By:</td>
                <td class="meta-value">{{ $report->user?->name ?? 'System' }}</td>
                <td class="meta-label">AI Generated:</td>
                <td class="meta-value">{{ ($report->ai_generated ?? false) ? 'Yes' : 'No' }}</td>
            </tr>
        </table>
    </div>

    @php
        $content = is_string($report->content ?? null)
            ? json_decode($report->content, true)
            : ($report->content ?? []);
    @endphp

    @if (is_array($content) && count($content) > 0)
        @foreach ($content as $sectionKey => $sectionValue)
            @if (is_array($sectionValue))
                @php
                    $isNumeric = array_keys($sectionValue) === range(0, count($sectionValue) - 1);
                @endphp

                <div class="section">
                    <div class="section-title">
                        {{ ucwords(str_replace(['_', '-'], ' ', $sectionKey)) }}
                        @if ($isNumeric) ({{ count($sectionValue) }}) @endif
                    </div>

                    @if ($isNumeric)
                        <table class="section-table">
                            @foreach ($sectionValue as $index => $item)
                                <tr>
                                    <td colspan="2">
                                        <div class="value-label">Item {{ $index + 1 }}</div>
                                        <div class="value-text">{{ is_array($item) ? json_encode($item) : $item }}</div>
                                    </td>
                                </tr>
                            @endforeach
                        </table>
                    @else
                        <table class="section-table">
                            <tr>
                                @php $colCount = 0; @endphp
                                @foreach ($sectionValue as $key => $value)
                                    @if (!is_array($value))
                                        @php
                                            $k = strtolower($key);
                                            $isCurrency = str_contains($k, 'amount')
                                                || str_contains($k, 'total')
                                                || str_contains($k, 'payment')
                                                || str_contains($k, 'outstanding')
                                                || str_contains($k, 'receivable')
                                                || str_contains($k, 'invoice')
                                                || str_contains($k, 'paid')
                                                || str_contains($k, 'partial')
                                                || str_contains($k, 'pending')
                                                || str_contains($k, 'overdue');
                                        @endphp

                                        <td>
                                            <div class="value-label">{{ ucwords(str_replace(['_', '-'], ' ', $key)) }}</div>
                                            <div class="value-text {{ $isCurrency ? 'currency' : '' }}">
                                                @if ($isCurrency && is_numeric($value))
                                                    PHP {{ number_format((float) $value, 2) }}
                                                @elseif (is_numeric($value))
                                                    {{ number_format((float) $value) }}
                                                @else
                                                    {{ $value ?? '—' }}
                                                @endif
                                            </div>
                                        </td>

                                        @php $colCount++; @endphp
                                        @if ($colCount % 2 == 0)
                                            </tr><tr>
                                        @endif
                                    @endif
                                @endforeach
                            </tr>
                        </table>
                    @endif
                </div>
            @endif
        @endforeach
    @else
        <div class="section">
            <div class="section-title">Report Content</div>
            <div class="empty">No content available for this report.</div>
        </div>
    @endif

    <div class="footer">
        Generated by <strong>ALIBATON System</strong> • {{ now()->format('F d, Y h:i A') }}<br>
        End of Report
    </div>
</body>
</html>
