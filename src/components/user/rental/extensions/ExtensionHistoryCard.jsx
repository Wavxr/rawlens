import { useMemo } from 'react';
import {
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const STATUS_META = {
  pending: {
    label: 'Pending Review',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    dotClass: 'bg-amber-500',
    description: 'Our admin team is checking availability for your requested dates.',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: 'Great news! Your extension has been approved. Complete payment to lock in the new schedule.',
  },
  rejected: {
    label: 'Declined',
    badgeClass: 'bg-red-100 text-red-800 border border-red-200',
    dotClass: 'bg-red-500',
    description: 'This request was declined. Reach out if you need a hand or have questions.',
  },
};

const PAYMENT_META = {
  pending: {
    label: 'Payment Required',
    containerClass: 'bg-amber-50 border border-amber-200 text-amber-900',
    icon: CreditCard,
    description: 'Upload your payment receipt so we can process the extension.',
    canUpload: true,
  },
  submitted: {
    label: 'Under Review',
    containerClass: 'bg-blue-50 border border-blue-200 text-blue-900',
    icon: Clock,
    description: 'We’re verifying your payment. This usually takes up to 24 hours.',
    canUpload: false,
  },
  verified: {
    label: 'Payment Verified',
    containerClass: 'bg-emerald-50 border border-emerald-200 text-emerald-900',
    icon: CheckCircle2,
    description: 'Everything is set. Enjoy the extra time with your gear!',
    canUpload: false,
  },
  rejected: {
    label: 'Receipt Rejected',
    containerClass: 'bg-red-50 border border-red-200 text-red-900',
    icon: XCircle,
    description: 'We couldn’t verify that receipt. Please upload a clearer copy.',
    canUpload: true,
  },
};

const defaultStatusMeta = {
  label: 'Extension',
  badgeClass: 'bg-gray-100 text-gray-800 border border-gray-200',
  dotClass: 'bg-gray-400',
  description: null,
};

const actionIconClass = 'h-3 w-3 rounded-full';

function ExtensionHistoryCard({ extension, onUploadReceipt, uploadingPayment }) {
  const statusMeta = STATUS_META[extension.extension_status] || defaultStatusMeta;
  const extensionPayment = extension.payments?.[0] || null;
  const paymentMeta = extension.extension_status === 'approved' && extensionPayment
    ? PAYMENT_META[extensionPayment.payment_status] || null
    : null;
  const PaymentIcon = paymentMeta?.icon || null;

  const uploadDisabled = extensionPayment
    ? Boolean(uploadingPayment[extensionPayment.id])
    : false;

  const statusDetails = useMemo(() => {
    if (extension.extension_status === 'rejected' && extension.admin_notes) {
      return extension.admin_notes;
    }
    return statusMeta.description;
  }, [extension.extension_status, extension.admin_notes, statusMeta.description]);

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide sm:text-xs ${statusMeta.badgeClass}`}>
            <span className={`inline-block ${actionIconClass} ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </span>
          <span className="text-[11px] text-gray-500 sm:text-xs">
            Requested {formatDate(extension.requested_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-500 sm:text-xs">
          <Calendar className="h-3.5 w-3.5" />
          <span>Original {formatDate(extension.original_end_date)}</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-3 sm:gap-3">
        <div className="col-span-2 rounded-md bg-gray-50 p-2.5 sm:col-span-1 sm:p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">New End Date</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 sm:mt-1 sm:text-base">{formatDate(extension.requested_end_date)}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-2.5 sm:p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">Additional Days</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 sm:mt-1 sm:text-base">{extension.extension_days || '—'}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-2.5 sm:p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">Extension Cost</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 sm:mt-1 sm:text-base">₱{Number(extension.additional_price || 0).toFixed(2)}</p>
        </div>
      </div>

      {statusDetails && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-600 sm:mt-3 sm:gap-2 sm:text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
          <p className="leading-relaxed">{statusDetails}</p>
        </div>
      )}

      {paymentMeta && (
        <div className={`mt-2 rounded-lg p-3 sm:mt-3 sm:p-4 ${paymentMeta.containerClass}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-1.5 sm:gap-2">
              {PaymentIcon && <PaymentIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />}
              <div>
                <p className="text-sm font-semibold sm:text-base">{paymentMeta.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed opacity-80 sm:text-xs">{paymentMeta.description}</p>
              </div>
            </div>
            {paymentMeta.canUpload && (
              <div className="w-full sm:w-auto">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                  Upload Receipt
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={uploadDisabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && extensionPayment) {
                      onUploadReceipt(extensionPayment.id, file);
                    }
                  }}
                  className="mt-1 block w-full cursor-pointer rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                />
                {uploadDisabled && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-700 sm:text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default ExtensionHistoryCard;
