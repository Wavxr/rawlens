import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const RENTAL_STATUS_REJECTED = 'rejected';
const PAYMENT_BUCKET = 'payment-receipts';
const CONTRACT_BUCKET = 'contracts';

console.log('[cleanup-rejected-rentals] function initializing');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const summary = {
    startedAt,
    processed: 0,
    deleted: 0,
    skipped: 0,
    errors: [] as Array<{ rentalId: string; message: string }>,
  };

  try {
    const nowIso = new Date().toISOString();

    const { data: rentals, error: rentalsError } = await supabaseAdmin
      .from('rentals')
      .select(
        `id, contract_pdf_url, rejection_expires_at, rental_status,
         payments ( id, payment_receipt_url )`
      )
      .eq('rental_status', RENTAL_STATUS_REJECTED)
      .lte('rejection_expires_at', nowIso);

    if (rentalsError) {
      throw new Error(`Failed to fetch expired rejections: ${rentalsError.message}`);
    }

    if (!rentals || rentals.length === 0) {
      console.log('[cleanup-rejected-rentals] No expired rejected rentals found.');
      return new Response(
        JSON.stringify({
          message: 'No expired rejected rentals found',
          ...summary,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    for (const rental of rentals) {
      summary.processed += 1;

      if (rental.rental_status !== RENTAL_STATUS_REJECTED) {
        summary.skipped += 1;
        continue;
      }

      try {
        // Delete payment receipts first to avoid orphaned storage objects.
        const payments = Array.isArray(rental.payments) ? rental.payments : [];
        for (const payment of payments) {
          if (payment.payment_receipt_url) {
            const { error: receiptError } = await supabaseAdmin
              .storage
              .from(PAYMENT_BUCKET)
              .remove([payment.payment_receipt_url]);

            if (receiptError && !/not found/i.test(receiptError.message ?? '')) {
              throw new Error(`Failed to delete receipt for payment ${payment.id}: ${receiptError.message}`);
            }
          }
        }

        if (payments.length > 0) {
          const { error: deletePaymentsError } = await supabaseAdmin
            .from('payments')
            .delete()
            .eq('rental_id', rental.id);

          if (deletePaymentsError) {
            throw new Error(`Failed to delete payments: ${deletePaymentsError.message}`);
          }
        }

        const { error: deleteExtensionsError } = await supabaseAdmin
          .from('rental_extensions')
          .delete()
          .eq('rental_id', rental.id);

        if (deleteExtensionsError) {
          throw new Error(`Failed to delete extensions: ${deleteExtensionsError.message}`);
        }

        if (rental.contract_pdf_url) {
          const { error: contractError } = await supabaseAdmin
            .storage
            .from(CONTRACT_BUCKET)
            .remove([rental.contract_pdf_url]);

          if (contractError && !/not found/i.test(contractError.message ?? '')) {
            throw new Error(`Failed to delete contract file: ${contractError.message}`);
          }
        }

        const { error: deleteRentalError } = await supabaseAdmin
          .from('rentals')
          .delete()
          .eq('id', rental.id);

        if (deleteRentalError) {
          throw new Error(`Failed to delete rental record: ${deleteRentalError.message}`);
        }

        summary.deleted += 1;
      } catch (innerError) {
        const message = innerError instanceof Error ? innerError.message : String(innerError);
        summary.errors.push({ rentalId: rental.id, message });
        console.error(`[cleanup-rejected-rentals] Failed to cleanup rental ${rental.id}:`, innerError);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Expired rejected rentals cleanup completed',
        ...summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cleanup-rejected-rentals] Unexpected failure:', error);
    return new Response(
      JSON.stringify({
        message: 'Failed to cleanup expired rejected rentals',
        error: message,
        ...summary,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
