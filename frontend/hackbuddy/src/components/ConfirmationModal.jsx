import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  loading = false,
  danger = false,
  loadingText
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-blur">
      <style>{`
        .modal-backdrop-blur {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 1.2rem;
          color: var(--text-primary);
        }

        .modal-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: var(--radius-default);
        }

        .modal-icon-box.danger {
          background: var(--danger-glow);
          color: var(--danger);
        }

        .modal-icon-box.primary {
          background: var(--primary-glow);
          color: var(--primary);
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.15s;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 50%;
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-deep);
        }

        .modal-message {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 0.5rem;
        }

        .modal-btn {
          padding: 0.55rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 700;
          border-radius: var(--radius-default);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-btn-cancel {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }

        .modal-btn-cancel:hover:not(:disabled) {
          background: var(--bg-deep);
          color: var(--text-primary);
        }

        .modal-btn-confirm {
          border: none;
          color: #ffffff;
        }

        .modal-btn-confirm.primary {
          background: var(--primary);
        }

        .modal-btn-confirm.primary:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .modal-btn-confirm.danger {
          background: var(--danger);
        }

        .modal-btn-confirm.danger:hover:not(:disabled) {
          opacity: 0.9;
        }

        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className={`modal-icon-box ${danger ? 'danger' : 'primary'}`}>
              <AlertTriangle size={18} />
            </div>
            <span>{title}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={loading} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          <button 
            type="button" 
            className="modal-btn modal-btn-cancel" 
            onClick={onClose} 
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`modal-btn modal-btn-confirm ${danger ? 'danger' : 'primary'}`} 
            onClick={onConfirm} 
            disabled={loading}
          >
            {loading ? (loadingText || 'Processing...') : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
