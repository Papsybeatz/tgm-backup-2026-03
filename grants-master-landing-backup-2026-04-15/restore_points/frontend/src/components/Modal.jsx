import React from "react";

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative transition-all duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold transition duration-200"
          aria-label="Close"
        >
          ×
        </button>
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
