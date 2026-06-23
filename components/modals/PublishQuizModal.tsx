import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Quiz } from '../../types.ts';
import { useQuizDataStore } from '../../store/useQuizDataStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

const Input = ({ label, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {icon}
                </div>
            )}
            <input 
                className={`w-full bg-white border-2 border-slate-200/80 rounded-xl py-3 ${icon ? 'pl-10 pr-4' : 'px-4'} text-sm text-slate-900 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none hover:border-slate-300`} 
                {...props} 
            />
        </div>
    </div>
);

const Textarea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
        <textarea 
            className="w-full bg-white border-2 border-slate-200/80 rounded-xl py-3 px-4 text-sm text-slate-900 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none hover:border-slate-300 resize-none" 
            {...props} 
        />
    </div>
);

const PublishQuizModal: React.FC<Props> = ({ isOpen, onClose, quiz }) => {
    const updateQuizPublication = useQuizDataStore(s => s.updateQuizPublication);
    const [isPublished, setIsPublished] = useState(quiz.is_published || false);
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    useEffect(() => {
        if (quiz) {
            setIsPublished(quiz.is_published || false);
            setDescription(quiz.quiz_data?.description || '');
            setCoverImageUrl(quiz.quiz_data?.cover_image_url || '');
            setImageError(false);
        }
    }, [quiz]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        await updateQuizPublication(quiz.id, {
            is_published: isPublished,
            description: description,
            cover_image_url: coverImageUrl,
        });
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            
            {/* Modal */}
            <div
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col animate-scale-in border border-slate-200/50"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Настройки публикации</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Управление видимостью квиза</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Info Banner */}
                        <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 mb-1">О публикации</h3>
                                <p className="text-sm text-blue-700 leading-relaxed">
                                    Опубликованные квизы будут видны всем пользователям в общественной галерее. Вы можете в любой момент снять квиз с публикации или изменить его настройки.
                                </p>
                            </div>
                        </div>

                        {/* Publishing Status */}
                        <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200/80 rounded-2xl p-6 hover:border-indigo-300 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${isPublished ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {isPublished ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            )}
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            {isPublished ? 'Опубликовано' : 'Черновик'}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {isPublished ? 'Квиз доступен всем пользователям' : 'Квиз виден только вам'}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={isPublished} 
                                        onChange={() => setIsPublished(!isPublished)} 
                                    />
                                    <div className="w-16 h-8 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600 shadow-inner"></div>
                                </label>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6 hover:border-indigo-300 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                <h3 className="text-lg font-bold text-slate-900">Описание квиза</h3>
                            </div>
                            <Textarea 
                                label="Краткое описание (до 200 символов)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Расскажите потенциальным участникам, о чем ваш квиз и что они узнают..."
                                rows={4}
                                maxLength={200}
                            />
                            <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Хорошее описание увеличивает интерес к квизу</span>
                                <span className={`font-semibold ${description.length > 180 ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {description.length}/200
                                </span>
                            </div>
                        </div>

                        {/* Cover Image */}
                        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6 hover:border-indigo-300 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-lg font-bold text-slate-900">Обложка</h3>
                            </div>
                            <Input 
                                label="URL изображения обложки"
                                value={coverImageUrl}
                                onChange={(e) => {
                                    setCoverImageUrl(e.target.value);
                                    setImageError(false);
                                }}
                                placeholder="https://example.com/image.jpg (рекомендуется 1200x630px)"
                                icon={
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                }
                            />
                            {coverImageUrl && !imageError && (
                                <div className="mt-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Предпросмотр обложки</label>
                                    <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 aspect-video">
                                        <img 
                                            src={coverImageUrl} 
                                            alt="Предпросмотр обложки" 
                                            className="w-full h-full object-cover" 
                                            onError={() => setImageError(true)}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                                            <div className="text-white">
                                                <p className="text-sm font-semibold">16:9 соотношение</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {imageError && (
                                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-red-700">Не удалось загрузить изображение. Проверьте URL.</p>
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-purple-900 mb-1">Привлекательность</h4>
                                <p className="text-xs text-purple-700">Используйте яркую обложку</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-blue-900 mb-1">Описание</h4>
                                <p className="text-xs text-blue-700">Четко опишите тему</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-emerald-900 mb-1">Качество</h4>
                                <p className="text-xs text-emerald-700">Проверьте перед публикацией</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200/80 bg-gradient-to-r from-white to-slate-50 rounded-b-3xl">
                    <div className="flex gap-4 max-w-4xl mx-auto">
                        <button 
                            onClick={onClose} 
                            className="flex-1 px-6 py-3.5 rounded-xl bg-white border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Отмена
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Сохранение...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Сохранить настройки
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

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

                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }

                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PublishQuizModal;