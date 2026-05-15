import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  showCloseButton = true,
  details = null,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
            {title}
          </h3>
          {showCloseButton && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <p className="text-sm text-gray-700 mb-4">{message}</p>

        {details && (
          <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm text-gray-800">
            {Object.entries(details).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {value}</p>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${confirmButtonClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}