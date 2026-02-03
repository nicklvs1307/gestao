import React, { useEffect } from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const ICONS = {
  success: 'fas fa-check',
  error: 'fas fa-times',
  info: 'fas fa-info-circle',
};

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, message, type = 'info' }) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setTimeout(() => {
        onClose();
      }, 3000); // Fecha automaticamente após 3 segundos
    }
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  return (
    <div className={`modal-overlay simple-feedback-modal ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="feedback-content" onClick={(e) => e.stopPropagation()}>
        <div className={`feedback-icon-wrapper icon-${type}`}>
          <i className={ICONS[type]}></i>
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default InfoModal;
