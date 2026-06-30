import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Quiz } from '../../types.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

const InputWithCopy = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                {icon}
                {label}
            </label>
            <div className="relative">
                <input name="components-modals-sharemodal-27-input" 
                    type="text" 
                    readOnly 
                    value={value}
                    className="w-full bg-white border-2 border-slate-200/80 rounded-xl py-3 pl-4 pr-32 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono select-all" 
                />
                <button 
                    onClick={handleCopy}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        copied 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {copied ? (
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Скопировано!
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Копировать
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

const ShareModal: React.FC<Props> = ({ isOpen, onClose, quiz }) => {
    const visibility = (quiz.visibility === 'private' || quiz.visibility === 'unlisted' || quiz.visibility === 'public')
        ? quiz.visibility
        : (quiz.is_published ? 'public' : 'private');
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

    if (!isOpen) return null;

    const getPlayUrl = () => {
        // Use ?play=<id> (query string) rather than #/play/<id> (hash):
        //   * works at any static host (Yandex Object Storage) without
        //     needing an SPA fallback rewrite;
        //   * is detected by some link-preview crawlers (Telegram,
        //     Slack) which read og:meta from the initial document;
        //   * is preserved on copy/paste without losing the path;
        // The landing route keeps this legacy query format compatible.
        // internally so the SPA still routes correctly.
        const url = new URL(window.location.origin);
        url.pathname = '/play.html';
        url.search = `?play=${encodeURIComponent(quiz.id)}`;
        url.hash = '';
        return url.toString();
    };

    const shareUrl = getPlayUrl();
    const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

    const shareToSocial = (platform: 'telegram' | 'whatsapp' | 'vk') => {
        const text = `Попробуйте пройти квиз: ${quiz.name}`;
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(text);
        
        const urls = {
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
            whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
            vk: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`,
        };
        
        window.open(urls[platform], '_blank', 'width=600,height=400');
    };

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
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Поделиться квизом</h2>
                            <p className="text-sm text-slate-500 mt-0.5">"{quiz.name}"</p>
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

                {/* Visibility banner */}
                {visibility === 'unlisted' && (
                    <div className="px-8 py-3 bg-indigo-50 border-b border-indigo-100/80 flex items-center gap-2 text-indigo-800">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-xs font-medium">Квиз доступен только по этой ссылке. В общей галерее он не отображается.</span>
                    </div>
                )}
                {visibility === 'public' && (
                    <div className="px-8 py-3 bg-emerald-50 border-b border-emerald-100/80 flex items-center gap-2 text-emerald-800">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium">Квиз опубликован в общей галерее. Этой ссылкой можно делиться.</span>
                    </div>
                )}
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Direct Link */}
                        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6 hover:border-blue-300 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <h3 className="text-lg font-bold text-slate-900">Прямая ссылка</h3>
                            </div>
                            <InputWithCopy 
                                label="URL для прохождения квиза" 
                                value={shareUrl}
                                icon={
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                }
                            />
                            <p className="mt-3 text-xs text-slate-500">
                                Эта ссылка открывает квиз в режиме прохождения. Поделитесь ей с участниками.
                            </p>
                        </div>

                        {/* Embed Code */}
                        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6 hover:border-purple-300 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <h3 className="text-lg font-bold text-slate-900">Код для встраивания</h3>
                            </div>
                            <InputWithCopy 
                                label="HTML код (iframe)" 
                                value={embedCode}
                                icon={
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                }
                            />
                            <p className="mt-3 text-xs text-slate-500">
                                Вставьте этот код на ваш сайт для встраивания квиза. Рекомендуемая высота: 600px.
                            </p>
                        </div>

                        {/* Social Sharing */}
                        <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200/80 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                                <h3 className="text-lg font-bold text-slate-900">Поделиться в мессенджерах</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => shareToSocial('telegram')}
                                    className="flex items-center justify-center gap-3 px-6 py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                    </svg>
                                    <span className="text-base">Telegram</span>
                                </button>
                                <button
                                    onClick={() => shareToSocial('whatsapp')}
                                    className="flex items-center justify-center gap-3 px-6 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span className="text-base">WhatsApp</span>
                                </button>
                                <button
                                    onClick={() => shareToSocial('vk')}
                                    className="flex items-center justify-center gap-3 px-6 py-4 bg-[#0077FF] hover:bg-[#0066dd] text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-.996-.94-1.137-.94-.271 0-.345.074-.345.434v1.571c0 .424-.135.682-1.252.682-1.847 0-3.895-1.122-5.335-3.206-2.162-3.079-2.76-5.405-2.76-5.888 0-.16.074-.308.434-.308h1.744c.323 0 .445.147.571.481.657 1.899 1.776 3.564 2.234 3.564.172 0 .249-.074.249-.485v-1.909c-.051-.996-.582-1.084-.582-1.435 0-.127.106-.258.274-.258h2.738c.271 0 .372.146.372.468v2.589c0 .271.122.369.197.369.16 0 .294-.099.6-.403 1.382-1.507 2.322-3.843 2.322-3.843.123-.271.294-.525.62-.525h1.744c.347 0 .422.179.347.469-.174.989-1.891 4.033-1.891 4.033-.147.246-.197.356 0 .644.147.221.633.619 1.033 1.084.64.571 1.184 1.049 1.333 1.383.149.333-.074.507-.421.507z"/>
                                    </svg>
                                    <span className="text-base">VK</span>
                                </button>
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-blue-900 mb-1">Безопасность</h4>
                                <p className="text-xs text-blue-700">Проверьте настройки приватности перед публикацией</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h4 className="font-semibold text-purple-900 mb-1">Быстрый доступ</h4>
                                <p className="text-xs text-purple-700">Ссылка открывает квиз сразу в режиме прохождения</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200/80 bg-gradient-to-r from-white to-slate-50 rounded-b-3xl">
                    <div className="max-w-4xl mx-auto">
                        <button 
                            onClick={onClose} 
                            className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Готово
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

export default ShareModal;
