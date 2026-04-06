<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminTransactionReportsController extends Controller
{
    /**
     * Apply optional date range to a query.
     */
    private function applyDateRange($query, Request $request): void
    {
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
    }

    /**
     * Compute Platform Revenue & Take-Rate metrics (optionally scoped by date).
     */
    private function getRevenueTakeRateData(Request $request): array
    {
        $baseCompleted = Transaction::where('status', 'completed');
        $this->applyDateRange($baseCompleted, $request);

        $platformFeeQuery = Transaction::whereIn('type', ['escrow', 'fee'])
            ->where('status', 'completed');
        $this->applyDateRange($platformFeeQuery, $request);

        $platformRevenue = (float) (clone $platformFeeQuery)->sum('platform_fee');
        $totalVolume = (float) (clone $baseCompleted)->sum('amount');
        $takeRate = $totalVolume > 0 ? round(($platformRevenue / $totalVolume) * 100, 2) : 0;

        return [
            'platform_revenue' => $platformRevenue,
            'total_volume' => $totalVolume,
            'take_rate_percent' => $takeRate,
        ];
    }

    /**
     * Compute Escrow Liability metrics (optionally scoped by date).
     */
    private function getEscrowLiabilityData(Request $request): array
    {
        $escrowQuery = Transaction::where('type', 'escrow')->where('status', 'completed');
        $releaseQuery = Transaction::where('type', 'release')->where('status', 'completed');
        $refundQuery = Transaction::where('type', 'refund')->where('status', 'completed');

        $this->applyDateRange($escrowQuery, $request);
        $this->applyDateRange($releaseQuery, $request);
        $this->applyDateRange($refundQuery, $request);

        $escrowTotal = (float) (clone $escrowQuery)->sum('amount');
        $releasedTotal = (float) (clone $releaseQuery)->sum('amount');
        $refundedTotal = (float) (clone $refundQuery)->sum('amount');
        $escrowLiability = $escrowTotal - $releasedTotal - $refundedTotal;

        return [
            'escrow_total' => $escrowTotal,
            'released_total' => $releasedTotal,
            'refunded_total' => $refundedTotal,
            'escrow_liability' => max(0, $escrowLiability),
        ];
    }

    /**
     * Transaction Reports page: Platform Revenue & Take-Rate + Escrow Liability.
     */
    public function index(Request $request): Response
    {
        // #region agent log
        file_put_contents(base_path('debug-6fa68d.log'), json_encode(['sessionId' => '6fa68d', 'hypothesisId' => 'H4', 'location' => 'AdminTransactionReportsController.php:index', 'message' => 'transaction escrow reports page', 'data' => ['inertia_component' => 'Admin/Reports/TransactionReports'], 'timestamp' => round(microtime(true) * 1000)])."\n", FILE_APPEND | LOCK_EX);
        // #endregion
        $revenue = $this->getRevenueTakeRateData($request);
        $escrow = $this->getEscrowLiabilityData($request);

        return Inertia::render('Admin/Reports/TransactionReports', [
            'revenue' => $revenue,
            'escrow' => $escrow,
            'filters' => $request->only(['date_from', 'date_to']),
        ]);
    }

    /**
     * Export Platform Revenue & Take-Rate report as CSV or PDF.
     */
    public function exportRevenueTakeRate(Request $request): StreamedResponse|\Illuminate\Http\Response
    {
        $data = $this->getRevenueTakeRateData($request);
        $format = $request->get('format', 'csv');

        if ($format === 'pdf') {
            return $this->exportRevenueTakeRatePdf($data, $request);
        }

        $filename = 'platform_revenue_take_rate_' . now()->format('Y-m-d') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($data, $request) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Platform Revenue & Take-Rate Report']);
            fputcsv($file, ['Generated', now()->format('Y-m-d H:i:s')]);
            if ($request->filled('date_from') || $request->filled('date_to')) {
                fputcsv($file, ['Date From', $request->get('date_from', '—')]);
                fputcsv($file, ['Date To', $request->get('date_to', '—')]);
            }
            fputcsv($file, []);
            fputcsv($file, ['Metric', 'Value']);
            fputcsv($file, ['Total Platform Revenue', number_format($data['platform_revenue'], 2)]);
            fputcsv($file, ['Total Transaction Volume', number_format($data['total_volume'], 2)]);
            fputcsv($file, ['Take Rate (%)', number_format($data['take_rate_percent'], 2) . '%']);
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export Escrow Liability report as CSV or PDF.
     */
    public function exportEscrowLiability(Request $request): StreamedResponse|\Illuminate\Http\Response
    {
        $data = $this->getEscrowLiabilityData($request);
        $format = $request->get('format', 'csv');

        if ($format === 'pdf') {
            return $this->exportEscrowLiabilityPdf($data, $request);
        }

        $filename = 'escrow_liability_' . now()->format('Y-m-d') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($data, $request) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Escrow Liability Report']);
            fputcsv($file, ['Generated', now()->format('Y-m-d H:i:s')]);
            if ($request->filled('date_from') || $request->filled('date_to')) {
                fputcsv($file, ['Date From', $request->get('date_from', '—')]);
                fputcsv($file, ['Date To', $request->get('date_to', '—')]);
            }
            fputcsv($file, []);
            fputcsv($file, ['Metric', 'Value']);
            fputcsv($file, ['Escrow Total', number_format($data['escrow_total'], 2)]);
            fputcsv($file, ['Released Total', number_format($data['released_total'], 2)]);
            fputcsv($file, ['Refunded Total', number_format($data['refunded_total'], 2)]);
            fputcsv($file, ['Escrow Liability (Locked)', number_format($data['escrow_liability'], 2)]);
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * PDF export for Revenue & Take-Rate (simple HTML-based PDF if DomPDF available).
     */
    private function exportRevenueTakeRatePdf(array $data, Request $request): \Illuminate\Http\Response
    {
        try {
            $pdf = Pdf::loadView('admin.reports.revenue-take-rate-pdf', [
                'data' => $data,
                'dateFrom' => $request->get('date_from'),
                'dateTo' => $request->get('date_to'),
            ]);
            return $pdf->download('platform_revenue_take_rate_' . now()->format('Y-m-d') . '.pdf');
        } catch (\Throwable $e) {
            return response()->streamDownload(function () use ($data) {
                echo "Platform Revenue & Take-Rate Report\n";
                echo "Generated: " . now()->format('Y-m-d H:i:s') . "\n";
                echo "Total Platform Revenue: " . number_format($data['platform_revenue'], 2) . "\n";
                echo "Total Volume: " . number_format($data['total_volume'], 2) . "\n";
                echo "Take Rate: " . number_format($data['take_rate_percent'], 2) . "%\n";
            }, 'platform_revenue_take_rate_' . now()->format('Y-m-d') . '.txt', ['Content-Type' => 'text/plain']);
        }
    }

    /**
     * PDF export for Escrow Liability.
     */
    private function exportEscrowLiabilityPdf(array $data, Request $request): \Illuminate\Http\Response
    {
        try {
            $pdf = Pdf::loadView('admin.reports.escrow-liability-pdf', [
                'data' => $data,
                'dateFrom' => $request->get('date_from'),
                'dateTo' => $request->get('date_to'),
            ]);
            return $pdf->download('escrow_liability_' . now()->format('Y-m-d') . '.pdf');
        } catch (\Throwable $e) {
            return response()->streamDownload(function () use ($data) {
                echo "Escrow Liability Report\n";
                echo "Generated: " . now()->format('Y-m-d H:i:s') . "\n";
                echo "Escrow Total: " . number_format($data['escrow_total'], 2) . "\n";
                echo "Released Total: " . number_format($data['released_total'], 2) . "\n";
                echo "Refunded Total: " . number_format($data['refunded_total'], 2) . "\n";
                echo "Escrow Liability: " . number_format($data['escrow_liability'], 2) . "\n";
            }, 'escrow_liability_' . now()->format('Y-m-d') . '.txt', ['Content-Type' => 'text/plain']);
        }
    }
}
