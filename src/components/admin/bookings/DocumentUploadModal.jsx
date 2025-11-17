import { useEffect, useMemo, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import FileUploadZone from './FileUploadZone';
import {
  uploadPaymentReceipt,
  deletePaymentReceipt,
  getPaymentReceiptUrl,
  createAdminBookingPayment
} from '@services/paymentService';
import { uploadContractPdf, getSignedContractUrl, deleteContractFile } from '@services/pdfService';
import { supabase } from '@lib/supabaseClient';

const DOCUMENT_CONFIG = {
  contract: {
    label: 'Contract (PDF)',
    accept: 'application/pdf',
    maxSize: 5,
    validate: (file) => file.type === 'application/pdf',
    helperText: 'Upload a signed contract in PDF format. Max size 5MB.'
  },
  receipt: {
    label: 'Payment Receipt (Image)',
    accept: 'image/*',
    maxSize: 3,
    validate: (file) => file.type.startsWith('image/'),
    helperText: 'Upload a payment receipt image (JPG, PNG). Max size 3MB.'
  }
};

const DocumentUploadModal = ({
  isOpen,
  onClose,
  rentalId,
  documentType,
  onSuccess,
  isDarkMode
}) => {
  const config = useMemo(() => DOCUMENT_CONFIG[documentType] || DOCUMENT_CONFIG.contract, [documentType]);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setPreviewUrl(null);
    setError('');
    setLoading(false);
    setRefreshKey((prev) => prev + 1);
  }, [isOpen, documentType]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadExistingDocument = async () => {
      try {
        if (documentType === 'receipt') {
          // Fetch most recent admin-created or existing payment for this rental
          const { data: payments, error: payErr } = await supabase
            .from('payments')
            .select('id, payment_receipt_url, payment_status, payment_type, rental_id')
            .eq('rental_id', rentalId)
            .eq('payment_type', 'rental')
            .order('created_at', { ascending: false })
            .limit(1);

          if (payErr) throw payErr;

            const payment = payments?.[0];
          if (payment) {
            setPaymentId(payment.id);
            if (payment.payment_receipt_url) {
              const { success, url } = await getPaymentReceiptUrl(payment.id, { expiresIn: 3600 });
              if (success) {
                setCurrentDocument({
                  signedUrl: url,
                  storagePath: payment.payment_receipt_url,
                  paymentId: payment.id
                });
              } else {
                setCurrentDocument(null);
              }
            } else {
              setCurrentDocument(null);
            }
          } else {
            setCurrentDocument(null);
          }
        } else {
          // CONTRACT: fetch rental to see if contract path exists
          const { data: rental, error: rentalErr } = await supabase
            .from('rentals')
            .select('id, contract_pdf_url')
            .eq('id', rentalId)
            .maybeSingle();
          if (rentalErr) throw rentalErr;
          if (rental?.contract_pdf_url) {
            try {
              const signed = await getSignedContractUrl(rental.contract_pdf_url);
              setCurrentDocument({
                signedUrl: signed,
                storagePath: rental.contract_pdf_url,
                paymentId: null
              });
            } catch (sigErr) {
              console.warn('Failed to sign contract URL:', sigErr);
              setCurrentDocument({
                signedUrl: null,
                storagePath: rental.contract_pdf_url,
                paymentId: null
              });
            }
          } else {
            setCurrentDocument(null);
          }
        }
      } catch (loadError) {
        if (!isMounted) return;
        console.error('Failed to load document info:', loadError);
        setCurrentDocument(null);
      }
    };

    loadExistingDocument();

    return () => {
      isMounted = false;
    };
  }, [isOpen, rentalId, documentType, refreshKey]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    if (config.accept.startsWith('image/') && file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [file, config.accept]);

  const handleFileSelect = (selectedFile, validationError) => {
    if (validationError) {
      setError(validationError.message);
      setFile(null);
      return;
    }

    if (!selectedFile) {
      setFile(null);
      setError('');
      return;
    }

    if (!config.validate(selectedFile)) {
      setError(documentType === 'contract'
        ? 'Contract must be a PDF file.'
        : 'Receipt must be an image file.');
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  };

  const handleFileRemove = () => {
    setFile(null);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (documentType === 'contract') {
        const buffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(buffer);
        // Fetch rental (need customer_name & existing contract path)
        const { data: rentalRow, error: rentalErr } = await supabase
          .from('rentals')
          .select('id, customer_name, contract_pdf_url')
          .eq('id', rentalId)
          .maybeSingle();
        if (rentalErr || !rentalRow) throw new Error('Rental not found');

        if (currentDocument?.storagePath) {
          const del = await deleteContractFile(currentDocument.storagePath, rentalId);
          if (!del.success) throw new Error(`Failed to delete existing contract: ${del.error}`);
        }

        const { success, filePath, error: upErr } = await uploadContractPdf(pdfBytes, rentalId, {
          scope: 'admin',
          customerName: rentalRow.customer_name
        });
        if (!success) throw new Error(upErr || 'Failed to upload contract');

        const { error: updateErr } = await supabase
          .from('rentals')
          .update({ contract_pdf_url: filePath })
          .eq('id', rentalId);
        if (updateErr) throw new Error(updateErr.message);
      } else {
        // If a receipt already exists, delete it (file + reset DB) before uploading new
        if (currentDocument?.storagePath && paymentId) {
          const delResult = await deletePaymentReceipt({ paymentId, scope: 'admin' });
          if (!delResult.success) {
            throw new Error(delResult.error || 'Failed to delete existing receipt');
          }
        }
        let effectivePaymentId = paymentId;
        if (!effectivePaymentId) {
          // Create a placeholder admin payment record to attach receipt
            const { data: rentalRow, error: rentErr } = await supabase
              .from('rentals')
              .select('id, total_price, user_id')
              .eq('id', rentalId)
              .maybeSingle();
            if (rentErr || !rentalRow) throw new Error('Rental not found');
          const amount = rentalRow.total_price || 0;
          const created = await createAdminBookingPayment({ rentalId, amount, createdBy: rentalRow.user_id || (await supabase.auth.getUser()).data?.user?.id });
          effectivePaymentId = created.id;
          setPaymentId(effectivePaymentId);
        }

        const result = await uploadPaymentReceipt({ paymentId: effectivePaymentId, rentalId, file, scope: 'admin' });
        if (!result.success) throw new Error(result.error || 'Failed to upload receipt');
      }

      setFile(null);
      setRefreshKey((prev) => prev + 1);
      onSuccess?.();
      onClose?.();
    } catch (uploadError) {
      console.error('Document upload failed:', uploadError);
      setError(uploadError.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCurrent = async () => {
    if (documentType === 'contract') {
      if (!currentDocument?.storagePath) {
        setError('No contract to delete.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const del = await deleteContractFile(currentDocument.storagePath, rentalId);
        if (!del.success) throw new Error(del.error || 'Failed to delete contract');
        setCurrentDocument(null);
        setRefreshKey((prev) => prev + 1);
        onSuccess?.();
      } catch (deleteErr) {
        console.error('Failed to delete contract:', deleteErr);
        setError(deleteErr.message || 'Failed to delete contract.');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!paymentId) {
      setError('No payment record found for this receipt.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await deletePaymentReceipt({ paymentId, scope: 'admin' });
      if (!result.success) throw new Error(result.error || 'Failed to delete receipt');
      setCurrentDocument(null);
      setRefreshKey((prev) => prev + 1);
      onSuccess?.();
    } catch (deleteError) {
      console.error('Failed to delete receipt:', deleteError);
      setError(deleteError.message || 'Failed to delete receipt.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalBg = isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-slate-200 text-slate-900';
  const secondaryText = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const buttonPrimary = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed';
  const buttonSecondary = isDarkMode
    ? 'px-4 py-2 border border-gray-600 rounded-lg text-gray-200 hover:bg-gray-800'
    : 'px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-lg mx-4 rounded-lg border shadow-xl ${modalBg}`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-inherit">
          <h3 className="text-lg font-semibold">
            {documentType === 'contract' ? 'Upload Contract' : 'Upload Payment Receipt'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <FileUploadZone
            label={config.label}
            accept={config.accept}
            maxSize={config.maxSize}
            file={file}
            preview={previewUrl}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            error={error}
            disabled={loading}
            isDarkMode={isDarkMode}
            helperText={config.helperText}
          />

          {currentDocument?.signedUrl && (
            <div className={`rounded-md px-3 py-2 ${isDarkMode ? 'bg-gray-800' : 'bg-slate-100'}`}>
              <p className={`text-sm font-medium ${secondaryText}`}>Current Document</p>
              <a
                href={currentDocument.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
              >
                View Document
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={handleRemoveCurrent}
                disabled={loading}
                className="mt-3 inline-flex text-xs text-red-500 hover:text-red-600"
              >
                Remove current file
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-inherit">
          <button type="button" className={buttonSecondary} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={buttonPrimary} onClick={handleUpload} disabled={loading}>
            {loading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
