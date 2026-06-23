import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmClearModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-200/75 rounded-xl shadow-2xl w-full max-w-md flex flex-col p-6 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 mb-4">
             <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
        </div>
        <div className="text-center">
            <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                Очистить холст?
            </h3>
            <div className="mt-2">
                <p className="text-sm text-gray-500">
                    Это действие удалит все узлы и связи с текущего холста. Данные будут стерты безвозвратно. Вы уверены?
                </p>
            </div>
        </div>
        <div className="mt-6 flex gap-3 w-full">
             <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
                Отмена
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
                Да, очистить
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmClearModal;
