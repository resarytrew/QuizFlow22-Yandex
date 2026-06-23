import React from 'react';
import { useUIStore } from '../../store/useUIStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const setGuideVisible = useUIStore(s => s.setGuideVisible);

  if (!isOpen) return null;

  const openFullGuide = () => {
    setGuideVisible(true);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200/75 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'scale-in 0.3s ease-out' }}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-manrope font-semibold text-gray-800 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            Методическое руководство
          </h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
        </div>

        <div className="space-y-4 text-gray-600">
            <p>
                Добро пожаловать в «Поток»! Это не просто конструктор, а инструмент для создания увлекательного образовательного опыта.
            </p>
            <p>
                Мы подготовили подробное руководство, которое поможет вам освоить все возможности платформы: от базовых принципов до продвинутых педагогических приемов.
            </p>
        </div>

        <div className="mt-8">
            <button
                onClick={openFullGuide}
                className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                Открыть полное руководство
            </button>
        </div>

        <style>{`
            @keyframes scale-in {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `}</style>
      </div>
    </div>
  );
};

export default GuideModal;
