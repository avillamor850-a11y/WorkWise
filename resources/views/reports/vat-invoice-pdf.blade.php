<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>VAT Invoice {{ $invoiceNumber }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
        }

        .header {
            margin-bottom: 24px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 12px;
        }

        .logo {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 4px;
        }

        .invoice-title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0 4px 0;
        }

        .invoice-number {
            text-align: center;
            font-size: 12px;
            color: #374151;
        }

        .two-col {
            width: 100%;
            margin-top: 16px;
        }

        .two-col td {
            width: 50%;
            vertical-align: top;
            padding: 8px 12px;
        }

        .label {
            font-size: 8px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .seller-box, .buyer-box {
            border: 1px solid #e5e7eb;
            padding: 10px;
            background: #f9fafb;
        }

        .buyer-box {
            background: #fff;
        }

        .table-details {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 20px;
        }

        .table-details th {
            background: #f3f4f6;
            padding: 10px 8px;
            text-align: left;
            border: 1px solid #d1d5db;
            font-size: 9px;
        }

        .table-details td {
            padding: 10px 8px;
            border: 1px solid #e5e7eb;
        }

        .amount-right {
            text-align: right;
            font-weight: bold;
        }

        .total-row {
            font-weight: bold;
            background: #f0f9ff;
        }

        .footer-note {
            margin-top: 24px;
            font-size: 8px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }

        .tin-placeholder {
            color: #9ca3af;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">WorkWise</div>
        <div class="invoice-title">VAT INVOICE / OFFICIAL RECEIPT</div>
        <div class="invoice-number">{{ $invoiceNumber }}</div>
    </div>

    <table class="two-col">
        <tr>
            <td>
                <div class="label">Issued by (Platform)</div>
                <div class="seller-box">
                    <strong>WorkWise</strong><br>
                    @if(config('services.bir.company_address'))
                        {{ config('services.bir.company_address') }}<br>
                    @else
                        <span class="tin-placeholder">Company address (configure in config)</span><br>
                    @endif
                    @if(config('services.bir.tin'))
                        TIN: {{ config('services.bir.tin') }}<br>
                    @else
                        <span class="tin-placeholder">TIN: (configure in config)</span><br>
                    @endif
                    Date: {{ $generatedAt->format('F j, Y') }}
                </div>
            </td>
            <td>
                <div class="label">Bill to (Employer / Payer)</div>
                <div class="buyer-box">
                    <strong>{{ $transaction->payer->first_name ?? '' }} {{ $transaction->payer->last_name ?? '' }}</strong><br>
                    {{ $transaction->payer->email ?? 'N/A' }}
                </div>
                <div class="label" style="margin-top: 10px;">Payee (Service Provider)</div>
                <div class="buyer-box">
                    <strong>{{ $transaction->payee->first_name ?? '' }} {{ $transaction->payee->last_name ?? '' }}</strong><br>
                    {{ $transaction->payee->email ?? 'N/A' }}
                </div>
            </td>
        </tr>
    </table>

    <table class="table-details">
        <thead>
            <tr>
                <th>Date</th>
                <th>Description (Service / Project)</th>
                <th class="amount-right">Amount (PHP)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $transaction->created_at->format('M j, Y H:i') }}</td>
                <td>
                    Payment release – {{ $transaction->project?->job?->title ?? 'Project' }}<br>
                    <span style="font-size: 9px; color: #6b7280;">Transaction #{{ $transaction->id }}</span>
                </td>
                <td class="amount-right">₱{{ number_format($transaction->amount, 2) }}</td>
            </tr>
            @if(($transaction->platform_fee ?? 0) > 0)
            <tr>
                <td></td>
                <td>Platform fee</td>
                <td class="amount-right">-₱{{ number_format($transaction->platform_fee, 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td colspan="2" style="text-align: right;">Total amount (release to payee):</td>
                <td class="amount-right">₱{{ number_format($transaction->net_amount ?? $transaction->amount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-note">
        <p>This document is generated for business accounting purposes and may be used as supporting documentation for release transactions. Configure company TIN and address in config/services.php (bir key) for full BIR compliance.</p>
        <p>Generated on {{ $generatedAt->format('F j, Y \a\t g:i A') }} by WorkWise.</p>
    </div>
</body>
</html>
