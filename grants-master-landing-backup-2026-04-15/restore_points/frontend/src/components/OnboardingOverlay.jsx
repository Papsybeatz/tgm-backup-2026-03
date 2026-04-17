import React from "react";

export default function OnboardingOverlay({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center relative transition-all duration-200">
        <h2 className="text-2xl font-bold mb-4">Welcome to The Grants Master</h2>
        <p className="text-gray-700 mb-6">
          Start by typing your grant idea — then click <span className="font-semibold text-blue-600">‘Improve Writing’</span> to polish it.
        </p>
        <button
          onClick={onDismiss}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
        >
          Got it — Start Writing
        </button>
      </div>
    </div>
  );
}
