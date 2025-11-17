import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

const MIME_IMAGE_PREFIX = 'image/';

const FileUploadZone = ({
  label,
  accept,
  maxSize,
  file,
  preview,
  onFileSelect,
  onFileRemove,
  error,
  disabled,
  isDarkMode,
  helperText
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const maxSizeBytes = useMemo(() => (maxSize ? maxSize * 1024 * 1024 : null), [maxSize]);

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile || disabled) return;
    if (maxSizeBytes && selectedFile.size > maxSizeBytes) {
      onFileSelect(null, {
        type: 'size',
        message: `File must be smaller than ${maxSize}MB.`
      });
      return;
    }
    onFileSelect(selectedFile, null);
  }, [disabled, maxSize, maxSizeBytes, onFileSelect]);

  const handleInputChange = (event) => {
    const selected = event.target.files?.[0];
    handleFile(selected);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFile = event.dataTransfer.files?.[0];
    handleFile(droppedFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const openFilePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const removeFile = (event) => {
    event.stopPropagation();
    onFileRemove?.();
  };

  const displayIcon = () => {
    if (file?.type?.startsWith(MIME_IMAGE_PREFIX)) {
      return <ImageIcon className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  const borderColor = isDarkMode ? 'border-gray-600' : 'border-slate-300';
  const activeBorder = isDarkMode ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50';
  const errorBorder = isDarkMode ? 'border-red-500 bg-red-500/10' : 'border-red-500 bg-red-50';
  const baseBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-slate-500';

  const zoneClasses = [
    'relative border-2 border-dashed rounded-lg transition-colors duration-150 cursor-pointer p-4',
    baseBg,
    borderColor
  ];

  if (error) {
    zoneClasses.push(errorBorder);
  } else if (isDragging) {
    zoneClasses.push(activeBorder);
  }

  return (
    <div className="space-y-2">
      {label && <label className={`block text-sm font-medium ${textPrimary}`}>{label}</label>}

      <div
        className={zoneClasses.join(' ')}
        onClick={openFilePicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {!file && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Upload className={`w-8 h-8 mb-3 ${textSecondary}`} />
            <p className={`text-sm font-medium ${textPrimary}`}>Click or drag a file to upload</p>
            {helperText && <p className={`text-xs mt-1 ${textSecondary}`}>{helperText}</p>}
            {maxSize && (
              <p className={`text-xs mt-1 ${textSecondary}`}>Max file size: {maxSize}MB</p>
            )}
          </div>
        )}

        {file && (
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center gap-3 ${textPrimary}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-slate-100'}`}>
                {preview && file.type?.startsWith(MIME_IMAGE_PREFIX) ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  displayIcon()
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[220px]">
                  {file.name}
                </span>
                <span className={`text-xs ${textSecondary}`}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-200 text-slate-600'}`}
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
      )}
    </div>
  );
};

export default FileUploadZone;
