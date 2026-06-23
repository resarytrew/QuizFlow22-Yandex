import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
}

const GeneratedHtmlModal: React.FC<Props> = ({ isOpen, onClose, htmlContent }) => {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlContent);
    alert('Код скопирован в буфер обмена!');
  };
  
  const downloadHtml = () => {
    const element = document.createElement("a");
    const file = new Blob([htmlContent], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = "my_quiz.html";
    document.body.appendChild(element);
    element.click();
    element.remove();
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-200/75 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-manrope font-semibold text-gray-800">Сгенерированный HTML</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
        </div>
        <div className="flex-grow bg-[#1e293b] border border-gray-700 rounded-lg p-4 overflow-auto relative">
          <pre><code className="text-sm font-mono text-gray-300 whitespace-pre-wrap selection:bg-blue-500/30">{htmlContent}</code></pre>
        </div>
        {htmlContent && (
             <div className="mt-6 flex gap-4">
                <button onClick={copyToClipboard} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                    Копировать код
                </button>
                <button onClick={downloadHtml} className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Скачать .html файл
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default GeneratedHtmlModal;