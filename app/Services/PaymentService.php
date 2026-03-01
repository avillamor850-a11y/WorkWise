<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Transaction;
use Stripe\StripeClient;
use Stripe\Exception\ApiErrorException;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    private StripeClient $stripe;
    private float $platformFeePercentage = 0.05; // 5% platform fee

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    /**
     * Create a payment intent for escrow
     */
    public function createEscrowPayment(Project $project): array
    {
        try {
            // Check if payment already exists
            $existingTransaction = $project->transactions()
                ->where('type', 'escrow')
                ->where('status', 'completed')
                ->first();

            if ($existingTransaction) {
                return [
                    'success' => false,
                    'error' => 'Payment already completed for this project'
                ];
            }

            // Create payment intent
            $paymentIntent = $this->stripe->paymentIntents->create([
                'amount' => $this->convertToStripeAmount($project->agreed_amount),
                'currency' => config('services.stripe.currency', 'php'),
                'customer' => $project->employer->stripe_customer_id,
                'metadata' => [
                    'project_id' => $project->id,
                    'type' => 'escrow',
                    'platform_fee' => $project->platform_fee,
                ],
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ]);

            // Create transaction record
            Transaction::create([
                'project_id' => $project->id,
                'payer_id' => $project->employer_id,
                'payee_id' => $project->gig_worker_id,
                'amount' => $project->agreed_amount,
                'platform_fee' => $project->platform_fee,
                'net_amount' => $project->net_amount,
                'type' => 'escrow',
                'status' => 'pending',
                'stripe_payment_intent_id' => $paymentIntent->id,
                'description' => 'Escrow payment for project #' . $project->id,
            ]);

            return [
                'success' => true,
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id
            ];
        } catch (\Exception $e) {
            Log::error('Error creating payment intent', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Failed to create payment intent'
            ];
        }
    }

    /**
     * Confirm and process payment
     */
    public function confirmPayment(string $paymentIntentId): array
    {
        try {
            $paymentIntent = $this->stripe->paymentIntents->retrieve($paymentIntentId);
            
            if ($paymentIntent->status !== 'succeeded') {
                return ['success' => false, 'error' => 'Payment not successful'];
            }

            // Update transaction status
                $transaction = Transaction::where('stripe_payment_intent_id', $paymentIntentId)->first();
                
            if (!$transaction) {
                return ['success' => false, 'error' => 'Transaction not found'];
            }

                    $transaction->update([
                        'status' => 'completed',
                'stripe_charge_id' => $paymentIntent->charges->data[0]->id ?? null,
                'processed_at' => now(),
            ]);

            return ['success' => true];

        } catch (ApiErrorException $e) {
            Log::error('Payment confirmation failed', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage()
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Release payment from escrow to freelancer
     */
    public function releasePayment(Project $project): array
    {
        try {
            $escrowTransaction = $project->transactions()
                ->where('type', 'escrow')
                ->where('status', 'completed')
                ->first();

            if (!$escrowTransaction) {
                return [
                    'success' => false,
                    'error' => 'No completed escrow payment found'
                ];
            }

            // Check if payment is already released
            if ($project->payment_released) {
                return [
                    'success' => true,
                    'message' => 'Payment already released'
                ];
            }

            // For demo purposes, skip Stripe transfer if gig worker doesn't have stripe_account_id
            $transferId = 'demo_transfer_' . time();

            if ($project->gigWorker->stripe_account_id && config('services.stripe.secret')) {
                // Create transfer to gig worker's connected account
                $transfer = $this->stripe->transfers->create([
                    'amount' => $this->convertToStripeAmount($project->net_amount),
                    'currency' => config('services.stripe.currency', 'php'),
                    'destination' => $project->gigWorker->stripe_account_id,
                    'source_transaction' => $escrowTransaction->stripe_charge_id,
                    'metadata' => [
                        'project_id' => $project->id,
                        'escrow_transaction_id' => $escrowTransaction->id
                    ]
                ]);
                $transferId = $transfer->id;
            }

            // Add payment to gig worker's earnings balance
            $gigWorker = $project->gigWorker;
            $gigWorker->increment('escrow_balance', $project->net_amount);

            // Create release transaction record
            Transaction::create([
                'project_id' => $project->id,
                'payer_id' => $project->employer_id,
                'payee_id' => $project->gig_worker_id,
                'amount' => $project->net_amount,
                'platform_fee' => 0,
                'net_amount' => $project->net_amount,
                'type' => 'release',
                'status' => 'completed',
                'stripe_payment_intent_id' => $transferId,
                'description' => 'Payment release for project #' . $project->id,
                'processed_at' => now()
            ]);

            // Update project status
            $project->update([
                'payment_released' => true,
                'payment_released_at' => now()
            ]);

            // Notify both parties that payment has been released
            try {
                $notificationService = app(\App\Services\NotificationService::class);
                $project->loadMissing(['employer', 'gigWorker', 'job']);
                $jobTitle = $project->job ? $project->job->title : 'the project';

                if ($project->employer) {
                    $notificationService->createEscrowStatusNotification($project->employer, [
                        'project_id' => $project->id,
                        'project_title' => $jobTitle,
                        'status' => 'payment_released'
                    ]);
                }

                if ($project->gigWorker) {
                    $notificationService->createEscrowStatusNotification($project->gigWorker, [
                        'project_id' => $project->id,
                        'project_title' => $jobTitle,
                        'status' => 'payment_released'
                    ]);
                }
            } catch (\Throwable $notifyError) {
                \Log::warning('Failed to send payment release notifications', [
                    'project_id' => $project->id,
                    'error' => $notifyError->getMessage()
                ]);
            }

            \Log::info('Payment released successfully', [
                'project_id' => $project->id,
                'gig_worker_id' => $gigWorker->id,
                'amount' => $project->net_amount,
                'new_balance' => $gigWorker->fresh()->escrow_balance
            ]);

            return ['success' => true];
        } catch (\Exception $e) {
            Log::error('Error releasing payment', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Failed to release payment'
            ];
        }
    }

    /**
     * Process refund
     */
    public function refundPayment(Project $project, string $reason): array
    {
        try {
            $escrowTransaction = $project->transactions()
                ->where('type', 'escrow')
                ->where('status', 'completed')
                ->first();

            if (!$escrowTransaction) {
                return [
                    'success' => false,
                    'error' => 'No completed escrow payment found'
                ];
            }

            // Create refund
            $refund = $this->stripe->refunds->create([
                'charge' => $escrowTransaction->stripe_charge_id,
                'reason' => $reason,
                'metadata' => [
                    'project_id' => $project->id,
                    'escrow_transaction_id' => $escrowTransaction->id
                ]
            ]);

            // Create refund transaction record
            Transaction::create([
                'project_id' => $project->id,
                'payer_id' => $project->gig_worker_id,
                'payee_id' => $project->employer_id,
                'amount' => $project->agreed_amount,
                'platform_fee' => 0,
                'net_amount' => $project->agreed_amount,
                'type' => 'refund',
                'status' => 'completed',
                'stripe_payment_intent_id' => $refund->id,
                'description' => 'Refund for project #' . $project->id,
                'metadata' => ['reason' => $reason],
                'processed_at' => now()
            ]);

            return ['success' => true];
        } catch (\Exception $e) {
            Log::error('Error refunding payment', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Failed to refund payment'
            ];
        }
    }

    /**
     * Get payment history for user
     */
    public function getPaymentHistory(int $userId, int $limit = 50): array
    {
        $transactions = Transaction::where(function($query) use ($userId) {
            $query->where('payer_id', $userId)
                  ->orWhere('payee_id', $userId);
        })
        ->with(['project.job', 'payer', 'payee'])
        ->orderBy('created_at', 'desc')
        ->limit($limit)
        ->get();

        return $transactions->map(function($transaction) use ($userId) {
            $projectTitle = $transaction->project?->job?->title ?? 'N/A';
            return [
                'id' => $transaction->id,
                'project_title' => $projectTitle,
                'project' => ['title' => $projectTitle],
                'amount' => (float) $transaction->amount,
                'net_amount' => (float) $transaction->net_amount,
                'platform_fee' => (float) $transaction->platform_fee,
                'type' => $transaction->type,
                'status' => $transaction->status,
                'description' => $transaction->description,
                'is_incoming' => $transaction->payee_id === $userId,
                'other_party' => $transaction->payee_id === $userId
                    ? (trim(($transaction->payer?->first_name ?? '') . ' ' . ($transaction->payer?->last_name ?? '')) ?: 'N/A')
                    : (trim(($transaction->payee?->first_name ?? '') . ' ' . ($transaction->payee?->last_name ?? '')) ?: 'N/A'),
                'date' => $transaction->created_at->format('M d, Y'),
                'created_at' => $transaction->created_at->toIso8601String(),
                'processed_at' => $transaction->processed_at?->format('M d, Y H:i')
            ];
        })->toArray();
    }

    /**
     * Get demo test cards for presentation
     */
    public function getTestCards(): array
    {
        return [
            [
                'number' => '4242424242424242',
                'description' => 'Succeeds and immediately processes the payment',
            ],
            [
                'number' => '4000002500003155',
                'description' => 'Requires authentication',
            ],
            [
                'number' => '4000000000009995',
                'description' => 'Declined payment',
            ],
        ];
    }

    /**
     * Calculate platform fee
     */
    private function calculatePlatformFee(float $amount): float
    {
        return round($amount * $this->platformFeePercentage, 2);
    }

    /**
     * Convert amount to Stripe format (cents)
     */
    private function convertToStripeAmount(float $amount): int
    {
        return (int) ($amount * 100);
    }
}
