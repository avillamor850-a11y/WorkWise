<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Earnings Transparency (Gross vs. Net) - {{ $user->first_name }} {{ $user->last_name }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 15px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
        }

        .logo {
            font-size: 20px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 8px;
        }

        .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .report-subtitle {
            color: #666;
            font-size: 12px;
        }

        .summary-section {
            background-color: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
        }

        .summary-grid {
            display: table;
            width: 100%;
        }

        .summary-item {
            display: table-cell;
            text-align: center;
            padding: 8px;
            vertical-align: top;
        }

        .summary-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .summary-value {
            font-size: 14px;
            font-weight: bold;
            color: #059669;
        }

        .table-container {
            margin-top: 15px;
        }

        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #374151;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 3px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: bold;
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #d1d5db;
            font-size: 9px;
        }

        td {
            padding: 6px 6px;
            border: 1px solid #e5e7eb;
            font-size: 9px;
        }

        tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .amount {
            text-align: right;
            font-weight: bold;
        }

        .positive {
            color: #059669;
        }

        .negative {
            color: #dc2626;
        }

        .status {
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-completed {
            background-color: #d1fae5;
            color: #065f46;
        }

        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }

        .status-failed {
            background-color: #fee2e2;
            color: #991b1b;
        }

        .footer {
            margin-top: 25px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">WorkWise</div>
        <div class="report-title">Earnings Transparency (Gross vs. Net)</div>
        <div class="report-subtitle">
            {{ $user->first_name }} {{ $user->last_name }} • Gig Worker •
            Generated on {{ $generatedAt->format('F j, Y \a\t g:i A') }}
        </div>
    </div>

    <div class="summary-section">
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Total Amount (client paid)</div>
                <div class="summary-value">₱{{ number_format($summary['total_gross'], 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Platform Fee</div>
                <div class="summary-value">₱{{ number_format($summary['total_platform_fee'], 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Net Amount (you received)</div>
                <div class="summary-value">₱{{ number_format($summary['total_net'], 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Transactions</div>
                <div class="summary-value">{{ $summary['total_transactions'] }}</div>
            </div>
        </div>
    </div>

    <div class="table-container">
        <div class="section-title">Transaction Details</div>

        @if($data->isNotEmpty())
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Project</th>
                        <th>Counterparty</th>
                        <th>Amount (client paid)</th>
                        <th>Platform Fee</th>
                        <th>Net Amount (you received)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($data as $transaction)
                        <tr>
                            <td>{{ $transaction['Date'] }}</td>
                            <td>{{ $transaction['Type'] }}</td>
                            <td>{{ $transaction['Description'] }}</td>
                            <td>{{ $transaction['Project'] }}</td>
                            <td>{{ $transaction['Counterparty'] }}</td>
                            <td class="amount positive">₱{{ number_format($transaction['Amount'], 2) }}</td>
                            <td class="amount negative">₱{{ number_format($transaction['Platform_Fee'], 2) }}</td>
                            <td class="amount positive">₱{{ number_format($transaction['Net_Amount'], 2) }}</td>
                            <td>
                                <span class="status status-{{ strtolower($transaction['Status']) }}">
                                    {{ $transaction['Status'] }}
                                </span>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p style="text-align: center; color: #666; font-style: italic; padding: 15px;">
                No transaction data found for the selected period.
            </p>
        @endif
    </div>

    <div class="footer">
        <p>This report was generated by WorkWise on {{ $generatedAt->format('F j, Y \a\t g:i A') }}</p>
        <p>© {{ date('Y') }} WorkWise. All rights reserved.</p>
    </div>
</body>
</html>
