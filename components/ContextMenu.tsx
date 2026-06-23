import React, { useEffect } from 'react';

type ContextMenuProps = {
  id: string;
  top: number;
  left: number;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
};

const ContextMenu: React.FC<ContextMenuProps> = ({ id, top, left, onClose, onEdit, onDuplicate, onPreview, onDelete }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  const handleAction = (action: (id: string) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action(id);
    onClose();
  };

  return (
    <div
      style={{ top, left }}
      className="absolute z-50 w-52 bg-white rounded-md shadow-xl border border-gray-200/75 py-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleAction(onEdit)}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        <span>Редактировать</span>
      </button>
      <button
        onClick={handleAction(onPreview)}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5v14l11-7z"></path></svg>
        <span>Предпросмотр отсюда</span>
      </button>
      <button
        onClick={handleAction(onDuplicate)}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Дублировать</span>
      </button>
      <div className="my-1 h-px bg-gray-200/75"></div>
      <button
        onClick={handleAction(onDelete)}
        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        <span>Удалить</span>
      </button>
    </div>
  );
};

export default ContextMenu;