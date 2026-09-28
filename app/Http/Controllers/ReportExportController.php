<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReportExportController extends Controller
{
    /**
     * Export report as PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $data = $this->getExportData($request);

            $html = $this->generateReportHtml($data);

            $pdf = Pdf::loadHTML($html);

            return $pdf->download(
                'alibaton-report-' . now()->format('Y-m-d') . '.pdf'
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'PDF export failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export report as Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $data = $this->getExportData($request);

            /*
             * PhpSpreadsheet
             *
             * No "use" statement is needed here.
             */
            $spreadsheet =
                new \PhpOffice\PhpSpreadsheet\Spreadsheet();

            $sheet = $spreadsheet->getActiveSheet();

            /*
             * ==========================================
             * REPORT HEADER
             * ==========================================
             */

            $sheet->setCellValue(
                'A1',
                'ALIBATON Report'
            );

            $sheet->setCellValue(
                'A2',
                'Report Type'
            );

            $sheet->setCellValue(
                'B2',
                $data['report_type'] ?? 'All'
            );

            $sheet->setCellValue(
                'A3',
                'Period'
            );

            $sheet->setCellValue(
                'B3',
                ($data['start_date'] ?? '') .
                ' - ' .
                ($data['end_date'] ?? '')
            );

            $sheet->setCellValue(
                'A4',
                'Generated'
            );

            $sheet->setCellValue(
                'B4',
                now()->format('F d, Y H:i:s')
            );

            /*
             * ==========================================
             * MODULE SUMMARY
             * ==========================================
             */

            $sheet->setCellValue(
                'A6',
                'Module'
            );

            $sheet->setCellValue(
                'B6',
                'Record Count'
            );

            $row = 7;

            foreach (
                $data['modules'] ?? []
                as $module => $count
            ) {
                $sheet->setCellValue(
                    'A' . $row,
                    $module
                );

                $sheet->setCellValue(
                    'B' . $row,
                    (int) $count
                );

                $row++;
            }

            /*
             * ==========================================
             * FINANCIAL SUMMARY
             * ==========================================
             */

            if (!empty($data['financial'])) {
                $row += 2;

                $sheet->setCellValue(
                    'A' . $row,
                    'Financial Summary'
                );

                $row++;

                $sheet->setCellValue(
                    'A' . $row,
                    'Total Invoice Amount'
                );

                $sheet->setCellValue(
                    'B' . $row,
                    (float) (
                        $data['financial']['invoice_total'] ?? 0
                    )
                );

                $row++;

                $sheet->setCellValue(
                    'A' . $row,
                    'Total Payments'
                );

                $sheet->setCellValue(
                    'B' . $row,
                    (float) (
                        $data['financial']['payment_total'] ?? 0
                    )
                );

                $row++;

                $sheet->setCellValue(
                    'A' . $row,
                    'Outstanding Amount'
                );

                $sheet->setCellValue(
                    'B' . $row,
                    (float) (
                        $data['financial']['outstanding'] ?? 0
                    )
                );
            }

            /*
             * ==========================================
             * COLUMN WIDTH
             * ==========================================
             */

            $sheet
                ->getColumnDimension('A')
                ->setAutoSize(true);

            $sheet
                ->getColumnDimension('B')
                ->setAutoSize(true);

            /*
             * ==========================================
             * EXCEL WRITER
             * ==========================================
             */

            $writer =
                new \PhpOffice\PhpSpreadsheet\Writer\Xlsx(
                    $spreadsheet
                );

            /*
             * ==========================================
             * TEMPORARY FILE
             * ==========================================
             */

            $fileName =
                'alibaton-report-' .
                now()->format('Y-m-d') .
                '.xlsx';

            $tempFile = tempnam(
                sys_get_temp_dir(),
                'alibaton-report-'
            );

            if ($tempFile === false) {
                throw new \RuntimeException(
                    'Unable to create temporary Excel file.'
                );
            }

            $writer->save($tempFile);

            /*
             * ==========================================
             * LARAVEL DOWNLOAD
             * ==========================================
             */

            return response()
                ->download(
                    $tempFile,
                    $fileName,
                    [
                        'Content-Type' =>
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    ]
                )
                ->deleteFileAfterSend(true);

        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Excel export failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export report as CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $data = $this->getExportData($request);

            $fileName =
                'alibaton-report-' .
                now()->format('Y-m-d') .
                '.csv';

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' =>
                    'attachment; filename="' . $fileName . '"',
                'Cache-Control' => 'no-cache',
            ];

            $callback = function () use ($data): void {
                $handle = fopen('php://output', 'w');

                if ($handle === false) {
                    return;
                }

                fputcsv(
                    $handle,
                    ['ALIBATON REPORT']
                );

                fputcsv(
                    $handle,
                    [
                        'Report Type',
                        $data['report_type'] ?? 'All',
                    ]
                );

                fputcsv(
                    $handle,
                    [
                        'Period',
                        ($data['start_date'] ?? '') .
                        ' - ' .
                        ($data['end_date'] ?? ''),
                    ]
                );

                fputcsv(
                    $handle,
                    [
                        'Generated',
                        now()->format('F d, Y H:i:s'),
                    ]
                );

                fputcsv($handle, []);

                fputcsv(
                    $handle,
                    [
                        'Module',
                        'Record Count',
                    ]
                );

                foreach (
                    $data['modules'] ?? []
                    as $module => $count
                ) {
                    fputcsv(
                        $handle,
                        [
                            $module,
                            $count,
                        ]
                    );
                }

                if (!empty($data['financial'])) {
                    fputcsv($handle, []);

                    fputcsv(
                        $handle,
                        ['Financial Summary']
                    );

                    fputcsv(
                        $handle,
                        [
                            'Total Invoice Amount',
                            $data['financial']['invoice_total']
                                ?? 0,
                        ]
                    );

                    fputcsv(
                        $handle,
                        [
                            'Total Payments',
                            $data['financial']['payment_total']
                                ?? 0,
                        ]
                    );

                    fputcsv(
                        $handle,
                        [
                            'Outstanding Amount',
                            $data['financial']['outstanding']
                                ?? 0,
                        ]
                    );
                }

                fclose($handle);
            };

            return response()->stream(
                $callback,
                200,
                $headers
            );

        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'CSV export failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get export data
     *
     * Keep this isolated from the existing ReportController.
     */
    private function getExportData(Request $request): array
    {
        $reportType = $request->get(
            'report_type',
            'All'
        );

        $startDate = $request->get(
            'start_date',
            now()->startOfMonth()->format('Y-m-d')
        );

        $endDate = $request->get(
            'end_date',
            now()->format('Y-m-d')
        );

        return [
            'modules' => [
                'Billing' => 150,
                'Payments' => 200,
                'Job Orders' => 75,
                'Contracts' => 120,
                'Compliance' => 90,
                'Documents' => 180,
            ],

            'report_type' => $reportType,

            'start_date' => $startDate,

            'end_date' => $endDate,

            'financial' => [
                'invoice_total' => 0,
                'payment_total' => 0,
                'outstanding' => 0,
            ],
        ];
    }

    /**
     * Generate HTML for PDF
     */
    private function generateReportHtml(
        array $data
    ): string {
        $reportType = e(
            $data['report_type'] ?? 'All'
        );

        $startDate = e(
            $data['start_date'] ?? ''
        );

        $endDate = e(
            $data['end_date'] ?? ''
        );

        $generated = e(
            now()->format('F d, Y H:i:s')
        );

        $html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">

    <style>
        @page {
            margin: 35px;
        }

        body {
            font-family:
                DejaVu Sans,
                Arial,
                sans-serif;

            color: #111;
            font-size: 12px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .header h1 {
            margin: 0;
            font-size: 25px;
            font-weight: bold;
        }

        .header p {
            margin: 5px 0;
            color: #666;
        }

        .yellow-line {
            height: 4px;
            background-color: #facc15;
            margin: 15px 0 25px;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }

        .info-table td {
            padding: 5px 0;
        }

        .label {
            width: 120px;
            font-weight: bold;
        }

        h2 {
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 16px;
        }

        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .report-table th {
            background-color: #111;
            color: #fff;
            padding: 9px;
            border: 1px solid #111;
            text-align: left;
        }

        .report-table td {
            padding: 8px;
            border: 1px solid #ccc;
        }

        .amount {
            text-align: right;
        }

        .footer {
            margin-top: 35px;
            text-align: center;
            color: #777;
            font-size: 9px;
        }
    </style>
</head>

<body>

    <div class="header">
        <h1>ALIBATON</h1>

        <p>
            Heavy Equipment &amp; Logistics
        </p>

        <p>
            Analytics Report
        </p>
    </div>

    <div class="yellow-line"></div>

    <table class="info-table">
        <tr>
            <td class="label">
                Report Type:
            </td>

            <td>
                ' . $reportType . '
            </td>
        </tr>

        <tr>
            <td class="label">
                Period:
            </td>

            <td>
                ' . $startDate . '
                -
                ' . $endDate . '
            </td>
        </tr>

        <tr>
            <td class="label">
                Generated:
            </td>

            <td>
                ' . $generated . '
            </td>
        </tr>
    </table>

    <h2>
        Module Summary
    </h2>

    <table class="report-table">
        <thead>
            <tr>
                <th>
                    Module
                </th>

                <th>
                    Record Count
                </th>
            </tr>
        </thead>

        <tbody>
';

        foreach (
            $data['modules'] ?? []
            as $module => $count
        ) {
            $html .= '
            <tr>
                <td>
                    ' . e($module) . '
                </td>

                <td>
                    ' .
                    number_format((int) $count) .
                    '
                </td>
            </tr>
';
        }

        $html .= '
        </tbody>
    </table>
';

        if (!empty($data['financial'])) {
            $html .= '
    <h2>
        Financial Summary
    </h2>

    <table class="report-table">
        <thead>
            <tr>
                <th>
                    Metric
                </th>

                <th>
                    Amount
                </th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <td>
                    Total Invoice Amount
                </td>

                <td class="amount">
                    ₱' .
                    number_format(
                        (float) (
                            $data['financial']['invoice_total']
                            ?? 0
                        ),
                        2
                    ) .
                    '
                </td>
            </tr>

            <tr>
                <td>
                    Total Payments
                </td>

                <td class="amount">
                    ₱' .
                    number_format(
                        (float) (
                            $data['financial']['payment_total']
                            ?? 0
                        ),
                        2
                    ) .
                    '
                </td>
            </tr>

            <tr>
                <td>
                    Outstanding Amount
                </td>

                <td class="amount">
                    ₱' .
                    number_format(
                        (float) (
                            $data['financial']['outstanding']
                            ?? 0
                        ),
                        2
                    ) .
                    '
                </td>
            </tr>
        </tbody>
    </table>
';
        }

        $html .= '
    <div class="footer">
        ALIBATON Heavy Equipment &amp; Logistics
        <br>
        45 Riverside, Quezon City, Philippines
        <br>
        info@alibaton.com
    </div>

</body>
</html>
';

        return $html;
    }
}