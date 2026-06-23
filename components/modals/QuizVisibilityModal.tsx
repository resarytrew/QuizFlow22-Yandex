import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Quiz, QuizVisibility } from '../../types.ts';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { Link } from '@tanstack/react-router';

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

const QuizVisibilityModal: React.FC<Props> = ({ isOpen, onClose, quiz }) => {
    const updateQuizVisibility = useQuizDataStore((s) => s.updateQuizVisibility);
    const isPro = useEntitlementStore((s) => s.isPro());

    const [visibility, setVisibility] = useState<QuizVisibility>(
        (quiz.visibility as QuizVisibility) ?? (quiz.is_published ? 'public' : 'private')
    );
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (quiz) {
            setVisibility((quiz.visibility as QuizVisibility) ?? (quiz.is_published ? 'public' : 'private'));
            setDescription(quiz.quiz_data?.description || '');
            setCoverImageUrl(quiz.quiz_data?.cover_image_url || '');
            setImageError(false);
            setCopied(false);
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
        try {
            await updateQuizVisibility(quiz.id, {
                visibility,
                description,
                cover_image_url: coverImageUrl,
            });
            onClose();
        } catch {
            // toast already shown by store
        } finally {
            setIsSaving(false);
        }
    };

    const shareUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const url = new URL(window.location.origin);
        url.pathname = '/play.html';
        url.search = `?play=${encodeURIComponent(quiz.id)}`;
        url.hash = '';
        return url.toString();
    }, [quiz.id]);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    if (!isOpen) return null;

    const options: Array<{
        id: QuizVisibility;
        icon: React.ReactNode;
        title: string;
        description: string;
        proOnly: boolean;
        badge: string;
    }> = [
        {
            id: 'private',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
                </svg>
            ),
            title: 'Только мне',
            description: 'Виден только вам',
            proOnly: true,
            badge: 'PRO',
        },
        {
            id: 'unlisted',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            title: 'По ссылке',
            description: 'Доступен по прямой ссылке',
            proOnly: true,
            badge: 'PRO',
        },
        {
            id: 'public',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'В галерее',
            description: 'Виден всем в общей галерее',
            proOnly: false,
            badge: 'FREE',
        },
    ];

    const isLocked = (id: QuizVisibility): boolean => {
        const opt = options.find((o) => o.id === id);
        if (!opt?.proOnly) return false;
        if (isPro) return false;
        // Grandfathering: keep the existing visibility
        if (visibility === id) return false;
        return true;
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

            <div
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in border border-slate-200/50"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white rounded-t-3xl shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Настройки доступа</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Управление видимостью квиза «{quiz.name}»</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                        aria-label="Закрыть"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* Info banner */}
                        <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 mb-1">Об уровнях доступа</h3>
                                <p className="text-sm text-blue-700 leading-relaxed">
                                    Выберите, кто сможет найти и пройти квиз. Изменить уровень можно в любой момент. PRO-уровни («Только мне» и «По ссылке») доступны по подписке.
                                </p>
                            </div>
                        </div>

                        {/* Visibility selector */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Уровень доступа</h3>
                            <div className="space-y-2">
                                {options.map((opt) => {
                                    const active = visibility === opt.id;
                                    const locked = isLocked(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => !locked && setVisibility(opt.id)}
                                            disabled={locked}
                                            className={`w-full text-left relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
                                                locked
                                                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                                                    : active
                                                        ? 'border-indigo-500 bg-indigo-50/40 cursor-pointer shadow-sm'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                                            }`}
                                        >
                                            <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                                                active ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {opt.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-sm font-bold ${active ? 'text-indigo-900' : 'text-slate-900'}`}>
                                                        {opt.title}
                                                    </span>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                        opt.proOnly
                                                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                                                            : 'bg-slate-200 text-slate-600'
                                                    }`}>
                                                        {opt.badge}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">{opt.description}</p>
                                                {locked && (
                                                    <Link
                                                        to="/billing"
                                                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                                                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
                                                        </svg>
                                                        Оформить PRO →
                                                    </Link>
                                                )}
                                            </div>
                                            <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                active ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                                            }`}>
                                                {active && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Shareable URL — only for unlisted and public */}
                        {visibility !== 'private' && (
                            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200/60 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <h3 className="text-sm font-bold text-slate-900">Прямая ссылка</h3>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareUrl}
                                        className="flex-1 bg-white border-2 border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 font-mono select-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyUrl}
                                        className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            copied
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                    >
                                        {copied ? '✓ Скопировано' : 'Копировать'}
                                    </button>
                                </div>
                                {visibility === 'unlisted' && (
                                    <p className="mt-2 text-xs text-slate-600">
                                        Эта ссылка открывает квиз в режиме прохождения. В общей галерее он не отображается — делитесь ссылкой вручную.
                                    </p>
                                )}
                                {visibility === 'public' && (
                                    <p className="mt-2 text-xs text-slate-600">
                                        Квиз также попадёт в общую галерею. Эту ссылку можно встраивать в посты и рассылки.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Description + cover — only when visible to others */}
                        {visibility !== 'private' && (
                            <>
                                <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
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

                                <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                        }
                                    />
                                    {coverImageUrl && !imageError && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Предпросмотр</label>
                                            <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 aspect-video">
                                                <img
                                                    src={coverImageUrl}
                                                    alt="Предпросмотр обложки"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setImageError(true)}
                                                />
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
                            </>
                        )}

                        {/* Private note */}
                        {visibility === 'private' && (
                            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-1">Приватный квиз</h4>
                                    <p className="text-sm text-slate-600">Квиз виден только вам. Описание и обложка для галереи не нужны. Чтобы поделиться, переключите уровень на «По ссылке» или «В галерее».</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200/80 bg-gradient-to-r from-white to-slate-50 rounded-b-3xl shrink-0">
                    <div className="flex gap-4 max-w-3xl mx-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl bg-white border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLocked(visibility)}
                            className="flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Сохранение...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                .animate-scale-in { animation: scale-in 0.3s ease-out; }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default QuizVisibilityModal;
