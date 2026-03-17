import React from 'react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm p-6 flex flex-col gap-4 scale-100 transition-transform">
        <h3 className="text-xl font-bold text-textPrimary">{title}</h3>
        <p className="text-textSecondary">{message}</p>
        <div className="flex gap-3 mt-2">
          <button onClick={onCancel} className="btn btn-ghost flex-1">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`btn flex-1 ${isDanger ? 'bg-red text-primary hover:bg-opacity-90' : 'btn-blue'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
