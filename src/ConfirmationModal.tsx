import React from 'react';

interface ConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm, onCancel, title, message }) => {
  return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="flex flex-col gap-4 p-6 rounded-lg shadow-lg max-w-lg w-full text-center bg-neutral-800 text-white">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mb-2 text-neutral-200">{message}</p>
          <div className="flex justify-around">
            <button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white py-2 px-9 rounded">
              Ja
            </button>
            <button onClick={onCancel} className="bg-red-600 hover:bg-red-700 text-white py-2 px-8 rounded">
              Nej
            </button>
          </div>
        </div>
      </div>
  );
};

export default ConfirmationModal;
