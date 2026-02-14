import React from 'react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>
          &times;
        </button>
        <img 
          src={imageUrl} 
          alt="Enlarged view" 
          className="image-modal-image"
        />
      </div>
      <style jsx>{`
        .image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          cursor: pointer;
        }

        .image-modal-content {
          position: relative;
          max-width: 90%;
          max-height: 90%;
          cursor: default;
        }

        .image-modal-close {
          position: absolute;
          top: -30px;
          right: -30px;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        .image-modal-image {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default ImageModal;