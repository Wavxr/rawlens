import React, { useEffect, useMemo, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import FileUploadZone from './FileUploadZone';
import {
  uploadAdminContract,
  uploadAdminPaymentReceipt,
  deleteAdminDocument,
  getAdminDocumentUrls
} from '../../services/bookingService';

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
        const result = await getAdminDocumentUrls(rentalId);
        if (!isMounted) return;
        setCurrentDocument(result?.[documentType] || null);
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
        await uploadAdminContract(rentalId, file);
      } else {
        await uploadAdminPaymentReceipt(rentalId, file);
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
    if (!currentDocument?.storagePath) {
      setError('No document found to remove.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteAdminDocument(rentalId, documentType, currentDocument.paymentId || null);
      setRefreshKey((prev) => prev + 1);
      onSuccess?.();
    } catch (deleteError) {
      console.error('Failed to delete document:', deleteError);
      setError(deleteError.message || 'Failed to delete document.');
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
