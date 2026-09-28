<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AdminForecastingController extends Controller
{
    private const HISTORICAL_MONTHS = 36;
    private const BACKTEST_MONTHS = 12;
    private const MIN_TRAINING_MONTHS = 6;
    private const SEASONAL_MIN_MONTHS = 24;
    private const DEFAULT_FORECAST_MONTHS = 6;

    public function index(Request $request): Response
    {
        $this->authorizeAdminOnly();

        $type = $this->normalizeType($request->query('type', 'revenue'));
        $period = $this->normalizePeriod(
            $request->query('period', self::DEFAULT_FORECAST_MONTHS)
        );

        return Inertia::render(
            'Admin/AdminForecasting',
            [
                'forecasting' => $this->buildForecastResponse($type, $period),
            ]
        );
    }

    public function data(Request $request): JsonResponse
    {
        $this->authorizeAdminOnly();

        $type = $this->normalizeType($request->query('type', 'revenue'));
        $period = $this->normalizePeriod(
            $request->query('period', self::DEFAULT_FORECAST_MONTHS)
        );

        return response()
            ->json($this->buildForecastResponse($type, $period))
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    private function buildForecastResponse(string $type, int $period): array
    {
        $currentMonth = now()->startOfMonth();

        $historyStart = $currentMonth->copy()
            ->subMonths(self::HISTORICAL_MONTHS - 1)
            ->startOfMonth();

        $historyEnd = $currentMonth->copy()->endOfMonth();

        // ✅ FIX #1: Kasama na yung current month sa training data
        $completedHistoryEnd = $currentMonth->copy()->endOfMonth();

        $monthlySeries = [];

        foreach (['revenue', 'payments', 'invoices', 'contracts', 'job_orders'] as $metric) {
            $monthlySeries[$metric] = $this->buildMonthlySeries(
                $metric,
                $historyStart,
                $historyEnd
            );
        }

        $selectedSeries = $monthlySeries[$type] ?? $monthlySeries['revenue'];

        $trainingSeries = array_values(
            array_filter(
                $selectedSeries,
                fn (array $point) => Carbon::parse($point['date'])->lte($completedHistoryEnd)
            )
        );

        $forecastResult = $this->forecastSeries($trainingSeries, $period);
        $forecastValues = $forecastResult['forecast'] ?? array_fill(0, $period, 0);

        $forecastPoints = [];

        for ($i = 0; $i < $period; $i++) {
            $date = $currentMonth->copy()->addMonths($i + 1)->startOfMonth();
            $value = max(0, (float) ($forecastValues[$i] ?? 0));

            $forecastPoints[] = [
                'date' => $date->format('Y-m-d'),
                'month' => $date->format('Y-m'),
                'label' => $date->format('M Y'),
                'value' => round($value, 2),
                'forecast' => round($value, 2),
                'actual' => null,
                'isForecast' => true,
            ];
        }

        $historicalPoints = array_map(function (array $point) {
            $value = max(0, (float) ($point['value'] ?? 0));

            return [
                'date' => $point['date'],
                'month' => $point['month'],
                'label' => $point['label'],
                'value' => round($value, 2),
                'actual' => round($value, 2),
                'forecast' => null,
                'isForecast' => false,
            ];
        }, $selectedSeries);

        $combined = array_merge($historicalPoints, $forecastPoints);

        $projectedTotal = array_sum(array_map(
            fn (array $point) => (float) ($point['value'] ?? 0),
            $forecastPoints
        ));

        $averageForecast = count($forecastValues) > 0
            ? $projectedTotal / count($forecastValues)
            : 0;

        $growth = $this->calculateGrowth($trainingSeries, $forecastValues);
        $trend = $this->calculateTrend($trainingSeries, $forecastValues);
        $dataQuality = $this->calculateDataQuality($trainingSeries, $forecastResult);

        $insights = $this->buildInsights(
            $type,
            $trainingSeries,
            $forecastValues,
            $forecastResult,
            $growth,
            $trend,
            $dataQuality
        );

        $risks = $this->buildRisks(
            $type,
            $trainingSeries,
            $forecastValues,
            $forecastResult,
            $dataQuality
        );

        $outlook = $this->buildOutlook($forecastPoints, $forecastResult);

        $latestActual = null;

        for ($i = count($selectedSeries) - 1; $i >= 0; $i--) {
            $point = $selectedSeries[$i] ?? null;
            if (!$point) continue;

            $date = Carbon::parse($point['date']);
            if ($date->lte($completedHistoryEnd)) {
                $latestActual = round(max(0, (float) ($point['value'] ?? 0)), 2);
                break;
            }
        }

        $currentMonthActual = 0;

        foreach ($selectedSeries as $point) {
            if (Carbon::parse($point['date'])->format('Y-m') === $currentMonth->format('Y-m')) {
                $currentMonthActual = round(max(0, (float) ($point['value'] ?? 0)), 2);
                break;
            }
        }

        $recordCounts = $this->getRecordCounts($type, $historyStart, $historyEnd);

        $composition = [
            'metric' => $this->metricLabel($type),
            'historical_months' => count($trainingSeries),
            'forecast_months' => $period,
            'historical_source' => 'ALIBATON database (company-wide)',
            'future_source' => 'Selected model trained on completed historical data',
            'current_month_excluded_from_training' => false,
        ];

        return [
            'type' => $type,
            'period' => $period,
            'forecast_period' => $period,
            'forecastMonths' => $period,
            'generated_at' => now()->toIso8601String(),
            'generatedAt' => now()->toIso8601String(),
            'last_updated_at' => now()->toIso8601String(),
            'lastUpdatedAt' => now()->toIso8601String(),
            'is_live' => true,
            'isLive' => true,
            'data_source' => 'Live ALIBATON database (company-wide)',
            'dataSource' => 'Live ALIBATON database (company-wide)',

            'historical' => $historicalPoints,
            'history' => $historicalPoints,
            'actuals' => $historicalPoints,
            'forecast' => $forecastPoints,
            'forecasted_period' => $forecastPoints,
            'forecastedPeriod' => $forecastPoints,
            'data' => $combined,
            'chart_data' => $combined,
            'chartData' => $combined,

            'latest_actual' => $latestActual,
            'latestActual' => $latestActual,
            'current_month_actual' => $currentMonthActual,

            'projected_total' => round($projectedTotal, 2),
            'projectedTotal' => round($projectedTotal, 2),
            'forecast_total' => round($projectedTotal, 2),
            'forecastTotal' => round($projectedTotal, 2),
            'average_forecast' => round($averageForecast, 2),
            'averageForecast' => round($averageForecast, 2),

            'growth' => $growth,
            'trend' => $trend,
            'trend_direction' => $trend,
            'trendDirection' => $trend,

            'model' => $forecastResult['model'] ?? null,
            'model_name' => $forecastResult['model_name'] ?? null,
            'modelName' => $forecastResult['model_name'] ?? null,
            'model_description' => $forecastResult['model_description'] ?? null,
            'modelDescription' => $forecastResult['model_description'] ?? null,

            'backtest' => $forecastResult['backtest'] ?? [],
            'backtest_results' => $forecastResult['backtest'] ?? [],
            'backtestResults' => $forecastResult['backtest'] ?? [],
            'mae' => $forecastResult['backtest']['mae'] ?? 0,
            'rmse' => $forecastResult['backtest']['rmse'] ?? 0,
            'wape' => $forecastResult['backtest']['wape'] ?? 0,
            'smape' => $forecastResult['backtest']['smape'] ?? 0,

            'confidence' => $dataQuality['confidence'] ?? 'low',
            'confidence_score' => $dataQuality['score'] ?? 0,
            'confidenceScore' => $dataQuality['score'] ?? 0,

            // ✅ FIX: forecast_quality dapat OBJECT, hindi string
            'forecast_quality' => $dataQuality,
            'forecastQuality' => $dataQuality,

            'r_squared' => $forecastResult['r_squared'] ?? 0,
            'rSquared' => $forecastResult['r_squared'] ?? 0,

            'data_quality' => $dataQuality,
            'dataQuality' => $dataQuality,

            'insights' => $insights,
            'forecast_insights' => $insights,
            'forecastInsights' => $insights,
            'risks' => $risks,
            'forecast_risks' => $risks,
            'forecastRisks' => $risks,
            'outlook' => $outlook,
            'forecast_outlook' => $outlook,
            'forecastOutlook' => $outlook,
            'composition' => $composition,
            'forecast_composition' => $composition,
            'forecastComposition' => $composition,

            'records' => $recordCounts,
            'record_counts' => $recordCounts,
            'recordCounts' => $recordCounts,

            'staff_id' => null,
            'staffId' => null,
            'role' => 'admin',
            'system_status' => 'Live',
            'systemStatus' => 'Live',
            'scope' => 'company-wide',
            'is_admin_view' => true,
        ];
    }

    private function buildMonthlySeries(string $metric, Carbon $historyStart, Carbon $historyEnd): array
    {
        $months = [];
        $cursor = $historyStart->copy()->startOfMonth();

        while ($cursor->lte($historyEnd)) {
            $key = $cursor->format('Y-m');
            $months[$key] = [
                'date' => $cursor->format('Y-m-d'),
                'month' => $key,
                'label' => $cursor->format('M Y'),
                'value' => 0,
                'records' => 0,
            ];
            $cursor->addMonth();
        }

        // ✅ NO SCOPE FILTERS — company-wide
        // ✅ FIX #3: Revenue fallback sa created_at kung walang approved_at

        if ($metric === 'revenue') {
            $hasApprovedAt = Invoice::query()->whereNotNull('approved_at')->exists();

            if ($hasApprovedAt) {
                $records = Invoice::query()
                    ->whereNotNull('approved_at')
                    ->whereBetween('approved_at', [
                        $historyStart->copy()->startOfDay(),
                        $historyEnd->copy()->endOfDay(),
                    ])
                    ->select(['id', 'user_id', 'amount', 'approved_at'])
                    ->get();

                foreach ($records as $record) {
                    if (!$record->approved_at) continue;

                    $key = Carbon::parse($record->approved_at)->format('Y-m');
                    if (!isset($months[$key])) continue;

                    $amount = max(0, (float) ($record->amount ?? 0));
                    $months[$key]['value'] += $amount;
                    $months[$key]['records']++;
                }
            } else {
                // Fallback: status + created_at
                $records = Invoice::query()
                    ->whereIn('status', ['Approved', 'Paid', 'Partial'])
                    ->whereBetween('created_at', [
                        $historyStart->copy()->startOfDay(),
                        $historyEnd->copy()->endOfDay(),
                    ])
                    ->select(['id', 'user_id', 'amount', 'created_at'])
                    ->get();

                foreach ($records as $record) {
                    if (!$record->created_at) continue;

                    $key = Carbon::parse($record->created_at)->format('Y-m');
                    if (!isset($months[$key])) continue;

                    $amount = max(0, (float) ($record->amount ?? 0));
                    $months[$key]['value'] += $amount;
                    $months[$key]['records']++;
                }
            }
        } elseif ($metric === 'payments') {
            $paymentData = $this->getPaymentEvents($historyStart, $historyEnd);

            foreach ($paymentData['events'] as $event) {
                $key = Carbon::parse($event['date'])->format('Y-m');
                if (!isset($months[$key])) continue;
                $months[$key]['value'] += max(0, (float) ($event['amount'] ?? 0));
                $months[$key]['records']++;
            }
        } elseif ($metric === 'invoices') {
            $records = Invoice::query()
                ->whereBetween('created_at', [
                    $historyStart->copy()->startOfDay(),
                    $historyEnd->copy()->endOfDay(),
                ])
                ->whereNotIn('status', ['Rejected', 'Cancelled', 'Canceled'])
                ->select(['id', 'created_at'])
                ->get();

            foreach ($records as $record) {
                $key = Carbon::parse($record->created_at)->format('Y-m');
                if (!isset($months[$key])) continue;
                $months[$key]['value']++;
                $months[$key]['records']++;
            }
        } elseif ($metric === 'contracts') {
            $records = Contract::query()
                ->whereNotNull('approved_at')
                ->whereBetween('approved_at', [
                    $historyStart->copy()->startOfDay(),
                    $historyEnd->copy()->endOfDay(),
                ])
                ->select(['id', 'approved_at'])
                ->get();

            foreach ($records as $record) {
                $key = Carbon::parse($record->approved_at)->format('Y-m');
                if (!isset($months[$key])) continue;
                $months[$key]['value']++;
                $months[$key]['records']++;
            }
        } elseif ($metric === 'job_orders') {
            $records = JobOrder::query()
                ->whereNotNull('generated_at')
                ->whereBetween('generated_at', [
                    $historyStart->copy()->startOfDay(),
                    $historyEnd->copy()->endOfDay(),
                ])
                ->select(['id', 'generated_at'])
                ->get();

            foreach ($records as $record) {
                $key = Carbon::parse($record->generated_at)->format('Y-m');
                if (!isset($months[$key])) continue;
                $months[$key]['value']++;
                $months[$key]['records']++;
            }
        }

        return array_values(array_map(function (array $point) {
            $point['value'] = max(0, (float) ($point['value'] ?? 0));
            $point['records'] = (int) ($point['records'] ?? 0);
            return $point;
        }, $months));
    }

    private function getPaymentEvents(Carbon $historyStart, Carbon $historyEnd): array
    {
        $payments = Payment::query()
            ->with(['invoice:id,amount'])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();

        $latestByInvoice = [];

        foreach ($payments as $payment) {
            $groupKey = $payment->invoice_id
                ? 'invoice:' . $payment->invoice_id
                : 'payment:' . $payment->id;

            if (!isset($latestByInvoice[$groupKey])) {
                $latestByInvoice[$groupKey] = $payment;
            }
        }

        $events = [];

        foreach ($latestByInvoice as $payment) {
            $status = strtolower(trim((string) ($payment->status ?? '')));

            if (in_array($status, ['pending', 'rejected', 'cancelled', 'canceled'], true)) {
                continue;
            }

            $paymentAmount = max(0, (float) ($payment->amount ?? 0));
            if ($paymentAmount <= 0) continue;

            if ($status === 'partial') {
                if (!$payment->partial_date) continue;

                $partialDate = Carbon::parse($payment->partial_date);
                if ($partialDate->lt($historyStart) || $partialDate->gt($historyEnd)) continue;

                $events[] = [
                    'payment_id' => $payment->id,
                    'invoice_id' => $payment->invoice_id,
                    'date' => $partialDate->format('Y-m-d'),
                    'amount' => round($paymentAmount, 2),
                    'type' => 'partial',
                ];
                continue;
            }

            if ($status === 'paid') {
                $invoiceAmount = $payment->invoice
                    ? max(0, (float) ($payment->invoice->amount ?? 0))
                    : $paymentAmount;

                if ($payment->partial_date) {
                    $partialAmount = $invoiceAmount > 0
                        ? $invoiceAmount * 0.50
                        : $paymentAmount * 0.50;
                    $partialAmount = max(0, min($partialAmount, $paymentAmount));
                    $finalAmount = max(0, $paymentAmount - $partialAmount);

                    $partialDate = Carbon::parse($payment->partial_date);

                    if ($partialDate->gte($historyStart) && $partialDate->lte($historyEnd) && $partialAmount > 0) {
                        $events[] = [
                            'payment_id' => $payment->id,
                            'invoice_id' => $payment->invoice_id,
                            'date' => $partialDate->format('Y-m-d'),
                            'amount' => round($partialAmount, 2),
                            'type' => 'partial',
                        ];
                    }

                    if ($finalAmount > 0 && $payment->payment_date) {
                        $paymentDate = Carbon::parse($payment->payment_date);
                        if ($paymentDate->gte($historyStart) && $paymentDate->lte($historyEnd)) {
                            $events[] = [
                                'payment_id' => $payment->id,
                                'invoice_id' => $payment->invoice_id,
                                'date' => $paymentDate->format('Y-m-d'),
                                'amount' => round($finalAmount, 2),
                                'type' => 'final',
                            ];
                        }
                    }
                    continue;
                }

                if (!$payment->payment_date) continue;

                $paymentDate = Carbon::parse($payment->payment_date);
                if ($paymentDate->lt($historyStart) || $paymentDate->gt($historyEnd)) continue;

                $events[] = [
                    'payment_id' => $payment->id,
                    'invoice_id' => $payment->invoice_id,
                    'date' => $paymentDate->format('Y-m-d'),
                    'amount' => round($paymentAmount, 2),
                    'type' => 'paid',
                ];
            }
        }

        return [
            'events' => $events,
            'duplicate_groups' => max(0, $payments->count() - count($latestByInvoice)),
        ];
    }

    private function forecastSeries(array $trainingSeries, int $horizon): array
    {
        $values = array_values(array_map(
            fn (array $point) => max(0, (float) ($point['value'] ?? 0)),
            $trainingSeries
        ));

        $n = count($values);

        if ($n === 0) {
            return [
                'forecast' => array_fill(0, $horizon, 0),
                'model' => 'insufficient_data',
                'model_name' => 'Insufficient Data',
                'model_description' => 'There is not enough completed historical data to build a statistically supported forecast.',
                'backtest' => ['mae' => 0, 'rmse' => 0, 'wape' => 0, 'smape' => 0, 'folds' => 0, 'residuals' => []],
                'backtest_models' => [],
                'r_squared' => 0,
                'trend_direction' => 'stable',
            ];
        }

        // ✅ FIX #2: Handle n < 3 — gamitin yung naive baseline
        if ($n < 3) {
            $lastValue = $values[$n - 1] ?? 0;

            return [
                'forecast' => array_fill(0, $horizon, max(0, $lastValue)),
                'model' => 'naive',
                'model_name' => 'Naive Baseline',
                'model_description' => 'Insufficient history — using the latest actual value as the baseline forecast.',
                'backtest' => ['mae' => 0, 'rmse' => 0, 'wape' => 0, 'smape' => 0, 'folds' => 0, 'residuals' => []],
                'backtest_models' => [],
                'r_squared' => 0,
                'trend_direction' => 'stable',
            ];
        }

        $models = [
            'naive',
            'moving_average',
            'weighted_moving_average',
            'linear_trend',
            'damped_trend',
            'exponential_smoothing',
        ];

        if ($n >= self::SEASONAL_MIN_MONTHS) {
            $models[] = 'seasonal_naive';
        }

        $results = [];

        foreach ($models as $model) {
            $results[$model] = $this->backtestModel($values, $model);
        }

        $bestModel = null;
        $bestScore = INF;

        foreach ($results as $model => $result) {
            $folds = (int) ($result['folds'] ?? 0);
            if ($folds <= 0) continue;

            $smape = (float) ($result['smape'] ?? 100);
            $wape = (float) ($result['wape'] ?? 100);
            $mae = (float) ($result['mae'] ?? 0);
            $normalizedMae = $this->normalizeError($mae, $values);

            $score = ($smape * 0.50) + ($wape * 0.30) + ($normalizedMae * 0.20);

            if ($score < $bestScore) {
                $bestScore = $score;
                $bestModel = $model;
            }
        }

        if (!$bestModel) {
            $bestModel = $n >= 3 ? 'moving_average' : 'naive';
        }

        $forecast = $this->predict($values, $bestModel, $horizon);
        $selectedBacktest = $results[$bestModel] ?? [
            'mae' => 0, 'rmse' => 0, 'wape' => 0, 'smape' => 0, 'folds' => 0, 'residuals' => [],
        ];

        return [
            'forecast' => array_values(array_map(
                fn ($value) => round(max(0, (float) $value), 2),
                $forecast
            )),
            'model' => $bestModel,
            'model_name' => $this->humanModelName($bestModel),
            'model_description' => $this->modelDescription($bestModel),
            'backtest' => $selectedBacktest,
            'backtest_models' => $this->formatBacktestModels($results),
            'r_squared' => round($this->calculateRSquared($values), 4),
            'trend_direction' => $this->determineTrendDirection($values, $forecast),
        ];
    }

    private function backtestModel(array $values, string $model): array
    {
        $n = count($values);
        $minimumTraining = max(self::MIN_TRAINING_MONTHS, 6);
        $start = max($minimumTraining, $n - self::BACKTEST_MONTHS);

        $actuals = [];
        $predictions = [];
        $residuals = [];

        for ($index = $start; $index < $n; $index++) {
            $train = array_slice($values, 0, $index);

            if ($model === 'seasonal_naive' && count($train) < 12) {
                continue;
            }

            $prediction = $this->predict($train, $model, 1)[0] ?? 0;
            $actual = max(0, (float) ($values[$index] ?? 0));
            $prediction = max(0, (float) $prediction);

            $actuals[] = $actual;
            $predictions[] = $prediction;
            $residuals[] = $actual - $prediction;
        }

        if (empty($actuals)) {
            return ['mae' => 0, 'rmse' => 0, 'wape' => 0, 'smape' => 0, 'folds' => 0, 'residuals' => []];
        }

        $absoluteErrors = [];
        $squaredErrors = [];
        $smapeValues = [];

        foreach ($actuals as $i => $actual) {
            $prediction = $predictions[$i] ?? 0;
            $error = $actual - $prediction;
            $absoluteError = abs($error);

            $absoluteErrors[] = $absoluteError;
            $squaredErrors[] = $error * $error;

            $denominator = abs($actual) + abs($prediction);

            if ($denominator <= 0) {
                $smapeValues[] = 0;
            } else {
                $smapeValues[] = ((2 * $absoluteError) / $denominator) * 100;
            }
        }

        $mae = array_sum($absoluteErrors) / count($absoluteErrors);
        $rmse = sqrt(array_sum($squaredErrors) / count($squaredErrors));

        $actualTotal = array_sum($actuals);
        $absoluteErrorTotal = array_sum($absoluteErrors);

        $wape = $actualTotal > 0
            ? ($absoluteErrorTotal / $actualTotal) * 100
            : ($mae > 0 ? 100 : 0);

        $smape = array_sum($smapeValues) / count($smapeValues);

        return [
            'mae' => round($mae, 2),
            'rmse' => round($rmse, 2),
            'wape' => round($wape, 2),
            'smape' => round($smape, 2),
            'folds' => count($actuals),
            'residuals' => array_values(array_map(fn ($v) => round((float) $v, 2), $residuals)),
        ];
    }

    private function predict(array $values, string $model, int $horizon): array
    {
        $values = array_values(array_map(fn ($v) => max(0, (float) $v), $values));
        $n = count($values);

        if ($n === 0) return array_fill(0, $horizon, 0);

        if ($model === 'naive') {
            return array_fill(0, $horizon, $values[$n - 1]);
        }

        if ($model === 'moving_average') {
            $window = min(3, $n);
            $recent = array_slice($values, -$window);
            $average = count($recent) > 0 ? array_sum($recent) / count($recent) : 0;
            return array_fill(0, $horizon, max(0, $average));
        }

        if ($model === 'weighted_moving_average') {
            $window = min(3, $n);
            $recent = array_slice($values, -$window);
            $weights = [];
            for ($i = 1; $i <= count($recent); $i++) $weights[] = $i;
            $weightTotal = array_sum($weights);
            $weighted = 0;
            foreach ($recent as $i => $value) $weighted += $value * $weights[$i];
            $weighted = $weightTotal > 0 ? $weighted / $weightTotal : 0;
            return array_fill(0, $horizon, max(0, $weighted));
        }

        if ($model === 'linear_trend') {
            return $this->linearTrendForecast($values, $horizon);
        }

        if ($model === 'damped_trend') {
            return $this->dampedTrendForecast($values, $horizon);
        }

        if ($model === 'exponential_smoothing') {
            return $this->exponentialSmoothingForecast($values, $horizon);
        }

        if ($model === 'seasonal_naive') {
            if ($n < 12) return array_fill(0, $horizon, $values[$n - 1]);
            $forecast = [];
            for ($i = 0; $i < $horizon; $i++) {
                $sourceIndex = $n - 12 + ($i % 12);
                $forecast[] = max(0, $values[$sourceIndex]);
            }
            return $forecast;
        }

        return array_fill(0, $horizon, $values[$n - 1]);
    }

    private function linearTrendForecast(array $values, int $horizon): array
    {
        $n = count($values);
        if ($n === 1) return array_fill(0, $horizon, $values[0]);

        $window = min(18, $n);
        $data = array_slice($values, -$window);
        $m = count($data);
        $xMean = ($m - 1) / 2;
        $yMean = array_sum($data) / $m;

        $numerator = 0;
        $denominator = 0;

        foreach ($data as $i => $value) {
            $dx = $i - $xMean;
            $dy = $value - $yMean;
            $numerator += $dx * $dy;
            $denominator += $dx * $dx;
        }

        $slope = $denominator > 0 ? $numerator / $denominator : 0;
        $intercept = $yMean - ($slope * $xMean);

        $forecast = [];
        for ($step = 1; $step <= $horizon; $step++) {
            $x = ($m - 1) + $step;
            $prediction = $intercept + ($slope * $x);
            $forecast[] = max(0, $prediction);
        }
        return $forecast;
    }

    private function dampedTrendForecast(array $values, int $horizon): array
    {
        $n = count($values);
        if ($n === 1) return array_fill(0, $horizon, $values[0]);

        $window = min(18, $n);
        $data = array_slice($values, -$window);
        $m = count($data);
        $xMean = ($m - 1) / 2;
        $yMean = array_sum($data) / $m;

        $numerator = 0;
        $denominator = 0;
        foreach ($data as $i => $value) {
            $dx = $i - $xMean;
            $dy = $value - $yMean;
            $numerator += $dx * $dy;
            $denominator += $dx * $dx;
        }

        $slope = $denominator > 0 ? $numerator / $denominator : 0;
        $phi = 0.80;
        $level = $data[$m - 1];
        $forecast = [];
        $cumulativePhi = 0;

        for ($step = 1; $step <= $horizon; $step++) {
            $cumulativePhi += pow($phi, $step);
            $prediction = $level + ($slope * $cumulativePhi);
            $forecast[] = max(0, $prediction);
        }
        return $forecast;
    }

    private function exponentialSmoothingForecast(array $values, int $horizon): array
    {
        $alpha = 0.40;
        $level = $values[0];

        foreach (array_slice($values, 1) as $value) {
            $level = ($alpha * $value) + ((1 - $alpha) * $level);
        }

        return array_fill(0, $horizon, max(0, $level));
    }

    private function calculateGrowth(array $trainingSeries, array $forecastValues): float
    {
        if (empty($trainingSeries) || empty($forecastValues)) return 0;

        $horizon = count($forecastValues);
        $recent = array_slice(
            array_map(fn (array $p) => max(0, (float) ($p['value'] ?? 0)), $trainingSeries),
            -min($horizon, count($trainingSeries))
        );

        if (empty($recent)) return 0;

        $historicalAverage = array_sum($recent) / count($recent);
        $forecastAverage = array_sum($forecastValues) / count($forecastValues);

        if ($historicalAverage <= 0) {
            if ($forecastAverage <= 0) return 0;
            return 100;
        }

        return round((($forecastAverage - $historicalAverage) / $historicalAverage) * 100, 2);
    }

    private function calculateTrend(array $trainingSeries, array $forecastValues): string
    {
        if (empty($forecastValues)) return 'stable';

        $historicalValues = array_map(fn (array $p) => max(0, (float) ($p['value'] ?? 0)), $trainingSeries);
        $recent = array_slice($historicalValues, -min(3, count($historicalValues)));

        if (empty($recent)) return 'stable';

        $historicalAverage = array_sum($recent) / count($recent);
        $forecastAverage = array_sum($forecastValues) / count($forecastValues);

        if ($historicalAverage <= 0) {
            return $forecastAverage > 0 ? 'up' : 'stable';
        }

        $change = ($forecastAverage - $historicalAverage) / $historicalAverage;

        if ($change > 0.05) return 'up';
        if ($change < -0.05) return 'down';
        return 'stable';
    }

    private function determineTrendDirection(array $values, array $forecast): string
    {
        if (empty($values) || empty($forecast)) return 'stable';

        $recent = array_slice($values, -min(3, count($values)));
        $recentAverage = array_sum($recent) / max(1, count($recent));
        $forecastAverage = array_sum($forecast) / max(1, count($forecast));

        if ($recentAverage <= 0) {
            return $forecastAverage > 0 ? 'up' : 'stable';
        }

        $change = ($forecastAverage - $recentAverage) / $recentAverage;
        if ($change > 0.05) return 'up';
        if ($change < -0.05) return 'down';
        return 'stable';
    }

    private function calculateDataQuality(array $trainingSeries, array $forecastResult): array
    {
        $count = count($trainingSeries);
        $nonZero = count(array_filter(
            $trainingSeries,
            fn (array $p) => (float) ($p['value'] ?? 0) > 0
        ));

        $coverageScore = min(40, ($count / 24) * 40);
        $activityScore = min(30, ($nonZero / max(1, $count)) * 30);

        $backtest = $forecastResult['backtest'] ?? [];
        $smape = (float) ($backtest['smape'] ?? 100);

        if ($smape <= 10) $errorScore = 30;
        elseif ($smape <= 20) $errorScore = 24;
        elseif ($smape <= 30) $errorScore = 18;
        elseif ($smape <= 40) $errorScore = 12;
        elseif ($smape <= 60) $errorScore = 6;
        else $errorScore = 0;

        $score = (int) round(min(100, $coverageScore + $activityScore + $errorScore));

        if ($score >= 75 && $count >= 12) $confidence = 'high';
        elseif ($score >= 50 && $count >= 6) $confidence = 'medium';
        else $confidence = 'low';

        return [
            'score' => $score,
            'confidence' => $confidence,
            'historical_months' => $count,
            'active_months' => $nonZero,
            'inactive_months' => max(0, $count - $nonZero),
            'backtest_smape' => round($smape, 2),
            'backtest_wape' => round((float) ($backtest['wape'] ?? 0), 2),
            'backtest_mae' => round((float) ($backtest['mae'] ?? 0), 2),
            'backtest_folds' => (int) ($backtest['folds'] ?? 0),
            'message' => $this->qualityMessage($confidence, $count, $nonZero, $smape),
        ];
    }

    private function qualityMessage(string $confidence, int $months, int $activeMonths, float $smape): string
    {
        if ($confidence === 'high') {
            return 'Strong historical coverage and acceptable rolling-backtest error support the selected forecast model.';
        }
        if ($confidence === 'medium') {
            return 'The forecast has usable historical coverage, but additional completed records can improve model stability.';
        }
        if ($months < self::MIN_TRAINING_MONTHS) {
            return 'Limited completed historical data is available. The forecast should be treated as an early estimate.';
        }
        if ($activeMonths < 3) {
            return 'Most historical months contain no activity. Forecast reliability is limited until more actual records accumulate.';
        }
        if ($smape > 60) {
            return 'Historical forecast error is high. More consistent actual records are needed before the forecast becomes stable.';
        }
        return 'Historical data is available, but the forecast has limited statistical support.';
    }

    private function buildInsights(string $type, array $trainingSeries, array $forecastValues, array $forecastResult, float $growth, string $trend, array $dataQuality): array
    {
        $metricLabel = $this->metricLabel($type);
        $insights = [];

        $insights[] = "{$metricLabel} forecasting is based on live ALIBATON database records and finalized business events.";
        $insights[] = 'The system evaluates multiple forecasting models using rolling historical backtesting instead of relying on a fixed formula.';

        if ($trend === 'up') {
            $insights[] = "The selected model indicates an upward {$metricLabel} direction over the forecast horizon.";
        } elseif ($trend === 'down') {
            $insights[] = "The selected model indicates a downward {$metricLabel} direction over the forecast horizon.";
        } else {
            $insights[] = "The selected model indicates a relatively stable {$metricLabel} direction over the forecast horizon.";
        }

        if ($growth > 5) {
            $insights[] = 'Projected average activity is above the latest comparable historical period.';
        } elseif ($growth < -5) {
            $insights[] = 'Projected average activity is below the latest comparable historical period.';
        } else {
            $insights[] = 'Projected average activity remains close to the latest comparable historical period.';
        }

        if (($dataQuality['confidence'] ?? 'low') === 'high') {
            $insights[] = 'Historical coverage and backtesting provide relatively strong support for the selected model.';
        } else {
            $insights[] = 'Additional completed historical records will improve forecast stability.';
        }

        return $insights;
    }

    private function buildRisks(string $type, array $trainingSeries, array $forecastValues, array $forecastResult, array $dataQuality): array
    {
        $risks = [];
        $smape = (float) ($forecastResult['backtest']['smape'] ?? 0);

        if ($smape > 40) {
            $risks[] = 'Historical forecast error is relatively high.';
        }

        if (($dataQuality['inactive_months'] ?? 0) > (($dataQuality['historical_months'] ?? 0) * 0.50)) {
            $risks[] = 'A large portion of historical months contain zero activity, which reduces model stability.';
        }

        if (count($trainingSeries) < 12) {
            $risks[] = 'Less than 12 completed historical months are available for the selected metric.';
        }

        if ($this->hasHighVolatility($trainingSeries)) {
            $risks[] = 'Historical activity is volatile, so future values may deviate materially from the forecast.';
        }

        if (empty($risks)) {
            $risks[] = 'No major statistical data-quality risk was detected in the available historical series.';
        }

        return $risks;
    }

    private function buildOutlook(array $forecastPoints, array $forecastResult): array
    {
        $residuals = $forecastResult['backtest']['residuals'] ?? [];
        $errorMargin = $this->calculateForecastErrorMargin($residuals);

        return array_map(function (array $point) use ($errorMargin) {
            $value = max(0, (float) ($point['value'] ?? 0));
            $margin = max(0, $errorMargin);

            return [
                'date' => $point['date'],
                'month' => $point['month'],
                'forecast' => round($value, 2),
                'lower' => round(max(0, $value - $margin), 2),
                'upper' => round($value + $margin, 2),
                'interval_type' => 'backtest_error_range',
            ];
        }, $forecastPoints);
    }

    private function calculateForecastErrorMargin(array $residuals): float
    {
        if (empty($residuals)) return 0;

        $absolute = array_map(fn ($v) => abs((float) $v), $residuals);
        return round(array_sum($absolute) / count($absolute), 2);
    }

    private function calculateRSquared(array $values): float
    {
        $n = count($values);
        if ($n < 2) return 0;

        $window = min(18, $n);
        $data = array_slice($values, -$window);
        $m = count($data);
        $yMean = array_sum($data) / $m;

        $ssTotal = 0;
        $ssResidual = 0;
        $xMean = ($m - 1) / 2;
        $numerator = 0;
        $denominator = 0;

        foreach ($data as $i => $value) {
            $dx = $i - $xMean;
            $dy = $value - $yMean;
            $numerator += $dx * $dy;
            $denominator += $dx * $dx;
        }

        $slope = $denominator > 0 ? $numerator / $denominator : 0;
        $intercept = $yMean - ($slope * $xMean);

        foreach ($data as $i => $value) {
            $predicted = $intercept + ($slope * $i);
            $ssTotal += pow($value - $yMean, 2);
            $ssResidual += pow($value - $predicted, 2);
        }

        if ($ssTotal <= 0) return 0;

        return max(0, min(1, 1 - ($ssResidual / $ssTotal)));
    }

    private function hasHighVolatility(array $series): bool
    {
        $values = array_values(array_map(
            fn (array $p) => max(0, (float) ($p['value'] ?? 0)),
            $series
        ));

        if (count($values) < 4) return false;

        $mean = array_sum($values) / count($values);
        if ($mean <= 0) return false;

        $variance = 0;
        foreach ($values as $value) $variance += pow($value - $mean, 2);
        $variance /= count($values);

        $standardDeviation = sqrt($variance);
        $cv = $standardDeviation / $mean;

        return $cv > 0.75;
    }

    private function normalizeError(float $mae, array $values): float
    {
        $mean = count($values) > 0 ? array_sum($values) / count($values) : 0;
        if ($mean <= 0) return $mae > 0 ? 100 : 0;
        return ($mae / $mean) * 100;
    }

    private function formatBacktestModels(array $results): array
    {
        $formatted = [];

        foreach ($results as $key => $result) {
            $formatted[] = [
                'key' => $key,
                'name' => $this->humanModelName($key),
                'description' => $this->modelDescription($key),
                'mae' => round((float) ($result['mae'] ?? 0), 2),
                'rmse' => round((float) ($result['rmse'] ?? 0), 2),
                'wape' => round((float) ($result['wape'] ?? 0), 2),
                'smape' => round((float) ($result['smape'] ?? 0), 2),
                'folds' => (int) ($result['folds'] ?? 0),
            ];
        }

        usort($formatted, function (array $a, array $b) {
            if ($a['smape'] === $b['smape']) return $a['mae'] <=> $b['mae'];
            return $a['smape'] <=> $b['smape'];
        });

        return $formatted;
    }

    private function humanModelName(string $model): string
    {
        return match ($model) {
            'naive' => 'Naive Baseline',
            'moving_average' => '3-Month Moving Average',
            'weighted_moving_average' => 'Weighted Moving Average',
            'linear_trend' => 'Linear Trend',
            'damped_trend' => 'Damped Trend',
            'exponential_smoothing' => 'Exponential Smoothing',
            'seasonal_naive' => 'Seasonal Naive',
            'insufficient_data' => 'Insufficient Data',
            default => 'Forecast Model',
        };
    }

    private function modelDescription(string $model): string
    {
        return match ($model) {
            'naive' => 'Uses the latest completed actual value as the baseline forecast.',
            'moving_average' => 'Uses the average of the latest three completed months.',
            'weighted_moving_average' => 'Gives more weight to the most recent completed months.',
            'linear_trend' => 'Projects the recent historical trend using linear regression.',
            'damped_trend' => 'Projects the recent trend while gradually reducing long-range trend influence.',
            'exponential_smoothing' => 'Smooths historical observations with greater emphasis on recent activity.',
            'seasonal_naive' => 'Uses the corresponding month from the previous seasonal cycle.',
            'insufficient_data' => 'There is not enough completed historical data to produce a statistically supported forecast.',
            default => 'Data-driven forecasting model.',
        };
    }

    private function getRecordCounts(string $type, Carbon $historyStart, Carbon $historyEnd): array
    {
        $counts = [
            'job_orders' => 0,
            'invoices' => 0,
            'payments' => 0,
            'contracts' => 0,
            'revenue_records' => 0,
            'payment_events' => 0,
        ];

        $jobQuery = JobOrder::query()
            ->whereBetween('generated_at', [$historyStart->copy()->startOfDay(), $historyEnd->copy()->endOfDay()])
            ->whereNotNull('generated_at');
        $counts['job_orders'] = $jobQuery->count();

        $invoiceQuery = Invoice::query()
            ->whereBetween('created_at', [$historyStart->copy()->startOfDay(), $historyEnd->copy()->endOfDay()]);
        $counts['invoices'] = $invoiceQuery->whereNotIn('status', ['Rejected', 'Cancelled', 'Canceled'])->count();

        $revenueQuery = Invoice::query()
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$historyStart->copy()->startOfDay(), $historyEnd->copy()->endOfDay()]);
        $counts['revenue_records'] = $revenueQuery->count();

        $paymentEvents = $this->getPaymentEvents($historyStart, $historyEnd);
        $counts['payment_events'] = count($paymentEvents['events']);

        $paymentQuery = Payment::query();
        $counts['payments'] = $paymentQuery->whereIn('status', ['Partial', 'Paid'])->count();

        $contractQuery = Contract::query()
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$historyStart->copy()->startOfDay(), $historyEnd->copy()->endOfDay()]);
        $counts['contracts'] = $contractQuery->count();

        return $counts;
    }

    private function normalizeType(mixed $type): string
    {
        $type = strtolower(trim((string) $type));

        return match ($type) {
            'revenue', 'revenues', 'sales' => 'revenue',
            'payment', 'payments', 'cash' => 'payments',
            'invoice', 'invoices' => 'invoices',
            'contract', 'contracts' => 'contracts',
            'job_order', 'job-orders', 'joborders', 'job orders' => 'job_orders',
            default => 'revenue',
        };
    }

    private function normalizePeriod(mixed $period): int
    {
        $value = strtolower(trim((string) $period));

        return match ($value) {
            '3', '3m', '3 month', '3 months', 'quarter' => 3,
            '6', '6m', '6 month', '6 months', 'half-year', 'half year' => 6,
            '12', '12m', '12 month', '12 months', '1 year', 'year' => 12,
            default => self::DEFAULT_FORECAST_MONTHS,
        };
    }

    private function metricLabel(string $type): string
    {
        return match ($type) {
            'revenue' => 'revenue',
            'payments' => 'payment activity',
            'invoices' => 'invoice volume',
            'contracts' => 'contract activity',
            'job_orders' => 'Job Order activity',
            default => 'business activity',
        };
    }

    private function authorizeAdminOnly(): void
    {
        $user = Auth::user();

        abort_unless(
            $user && $user->role === 'admin',
            403,
            'You are not authorized to access Admin Forecasting.'
        );
    }
}
