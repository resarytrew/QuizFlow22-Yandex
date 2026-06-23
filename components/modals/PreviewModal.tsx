import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
}

const PreviewModal: React.FC<Props> = ({ isOpen, onClose, htmlContent }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-200/75 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-manrope font-semibold text-gray-800">Предпросмотр квиза</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
        </div>
        <div className="flex-grow bg-gray-100 border border-gray-200 rounded-lg overflow-hidden relative">
            <iframe
              srcDoc={htmlContent}
              title="Quiz Preview"
              className="w-full h-full border-0"
              // allow-same-origin matches the other quiz iframes so
              // postMessage + supabase auth work the same way. See
              // QuizPlayer.tsx for the full rationale.
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
            />
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;