import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Quiz, QuizVisibility } from '../../types.ts';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { Link } from '@tanstack/react-router';
import { MAX_QUIZ_KEYWORDS, normalizeQuizKeywords, quizKeywordsToInput } from '../../utils/quizKeywords';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

const Input = ({ label, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }) => (
    <div>
        <label className="mb-2 block text-sm font-semibold text-stone-700">{label}</label>
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                    {icon}
                </div>
            )}
            <input name="components-modals-quizvisibilitymodal-24-input"
                className={`w-full rounded-xl border border-stone-200 bg-[#fffaf0] py-3 ${icon ? 'pl-10 pr-4' : 'px-4'} text-sm font-medium text-stone-900 placeholder-stone-400 transition-all duration-200 hover:border-amber-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/25`}
                {...props}
            />
        </div>
    </div>
);

const Textarea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
    <div>
        <label className="mb-2 block text-sm font-semibold text-stone-700">{label}</label>
        <textarea name="components-modals-quizvisibilitymodal-35-textarea"
            className="w-full resize-none rounded-xl border border-stone-200 bg-[#fffaf0] px-4 py-3 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all duration-200 hover:border-amber-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/25"
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
    const [keywordsText, setKeywordsText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (quiz) {
            setVisibility((quiz.visibility as QuizVisibility) ?? (quiz.is_published ? 'public' : 'private'));
            setDescription(quiz.quiz_data?.description || '');
            setCoverImageUrl(quiz.quiz_data?.cover_image_url || '');
            setKeywordsText(quizKeywordsToInput(quiz.quiz_data?.keywords));
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
                keywords: normalizeQuizKeywords(keywordsText),
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

    const keywords = normalizeQuizKeywords(keywordsText);

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
            <div className="absolute inset-0 bg-stone-950/45 backdrop-blur-md" />

            <div
                className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-stone-200/90 bg-[#f8f7f2] shadow-[0_36px_120px_rgba(68,64,60,0.22)] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    aria-hidden="true"
                    style={{
                        backgroundImage: [
                            'linear-gradient(rgba(68,64,60,0.045) 1px, transparent 1px)',
                            'linear-gradient(90deg, rgba(68,64,60,0.045) 1px, transparent 1px)',
                        ].join(', '),
                        backgroundSize: '44px 44px',
                    }}
                />
                {/* Header */}
                <div className="relative flex items-center justify-between border-b border-stone-900/10 bg-[#fffaf0]/82 px-8 py-6 backdrop-blur shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem_0.35rem_1rem_0.35rem] border border-amber-200 bg-amber-50 text-amber-700">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">публикация сценария</p>
                            <h2 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-stone-950">Доступ</h2>
                            <p className="mt-1 text-sm font-medium text-stone-500">Управление видимостью квиза «{quiz.name}»</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-700"
                        aria-label="Закрыть"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="relative flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* Info banner */}
                        <div className="flex items-start gap-4 rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-5 shadow-[0_12px_36px_rgba(68,64,60,0.06)]">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[0.9rem_0.3rem_0.9rem_0.3rem] border border-amber-200 bg-amber-50 text-amber-700">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="mb-1 font-serif text-xl font-semibold tracking-[-0.035em] text-stone-950">Об уровнях доступа</h3>
                                <p className="text-sm leading-relaxed text-stone-600">
                                    Выберите, кто сможет найти и пройти квиз. Изменить уровень можно в любой момент. PRO-уровни («Только мне» и «По ссылке») доступны по подписке.
                                </p>
                            </div>
                        </div>

                        {/* Visibility selector */}
                        <div>
                            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">Уровень доступа</h3>
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
                                            className={`relative flex w-full items-start gap-4 rounded-[1.15rem_0.4rem_1.15rem_0.4rem] border p-4 text-left transition-all ${
                                                locked
                                                    ? 'border-stone-200 bg-stone-100/70 opacity-60 cursor-not-allowed'
                                                    : active
                                                        ? 'border-amber-300 bg-amber-50/70 cursor-pointer shadow-[0_14px_38px_rgba(180,83,9,0.09)]'
                                                        : 'border-stone-200 bg-[#fffaf0] hover:border-amber-200 cursor-pointer'
                                            }`}
                                        >
                                            <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                                                active ? 'border border-amber-200 bg-amber-100 text-amber-800' : 'border border-stone-200 bg-stone-100 text-stone-500'
                                            }`}>
                                                {opt.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-sm font-bold ${active ? 'text-stone-950' : 'text-stone-900'}`}>
                                                        {opt.title}
                                                    </span>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                        opt.proOnly
                                                            ? 'border border-amber-200 bg-amber-100 text-amber-800'
                                                            : 'border border-stone-200 bg-stone-100 text-stone-600'
                                                    }`}>
                                                        {opt.badge}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-stone-600">{opt.description}</p>
                                                {locked && (
                                                    <Link
                                                        to="/billing"
                                                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                                                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-stone-950"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
                                                        </svg>
                                                        Оформить PRO →
                                                    </Link>
                                                )}
                                            </div>
                                            <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                active ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
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
                            <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-5 shadow-[0_12px_36px_rgba(68,64,60,0.06)]">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <h3 className="font-serif text-xl font-semibold tracking-[-0.035em] text-stone-950">Прямая ссылка</h3>
                                </div>
                                <div className="flex gap-2">
                                    <input name="components-modals-quizvisibilitymodal-311-input"
                                        type="text"
                                        readOnly
                                        value={shareUrl}
                                        className="flex-1 select-all rounded-xl border border-stone-200 bg-[#f8f7f2] px-3 py-2.5 font-mono text-xs text-stone-700 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/25"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyUrl}
                                        className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            copied
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-stone-950 text-amber-50 hover:bg-stone-800'
                                        }`}
                                    >
                                        {copied ? '✓ Скопировано' : 'Копировать'}
                                    </button>
                                </div>
                                {visibility === 'unlisted' && (
                                    <p className="mt-2 text-xs text-stone-600">
                                        Эта ссылка открывает квиз в режиме прохождения. В общей галерее он не отображается — делитесь ссылкой вручную.
                                    </p>
                                )}
                                {visibility === 'public' && (
                                    <p className="mt-2 text-xs text-stone-600">
                                        Квиз также попадёт в общую галерею. Эту ссылку можно встраивать в посты и рассылки.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Description + cover — only when visible to others */}
                        {visibility !== 'private' && (
                            <>
                                <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-6 shadow-[0_12px_36px_rgba(68,64,60,0.06)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                        </svg>
                                        <h3 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Описание квиза</h3>
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
                                        <span className="text-stone-500">Хорошее описание увеличивает интерес к квизу</span>
                                        <span className={`font-semibold ${description.length > 180 ? 'text-amber-700' : 'text-stone-400'}`}>
                                            {description.length}/200
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-6 shadow-[0_12px_36px_rgba(68,64,60,0.06)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.023.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        <h3 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Ключевые слова</h3>
                                    </div>
                                    <Textarea
                                        label={`До ${MAX_QUIZ_KEYWORDS} слов или коротких фраз, через запятую`}
                                        value={keywordsText}
                                        onChange={(e) => setKeywordsText(e.target.value)}
                                        placeholder="обучение, диагностика, продажи, мероприятие"
                                        rows={2}
                                        maxLength={240}
                                    />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {keywords.length > 0 ? (
                                            keywords.map((keyword) => (
                                                <span
                                                    key={keyword.toLocaleLowerCase('ru-RU')}
                                                    className="inline-flex items-center rounded-[0.8rem_0.25rem_0.8rem_0.25rem] border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900"
                                                >
                                                    {keyword}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs leading-relaxed text-stone-500">
                                                Эти слова появятся на карточке квиза и помогут найти его в галерее.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-6 shadow-[0_12px_36px_rgba(68,64,60,0.06)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <h3 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Обложка</h3>
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
                                            <label className="mb-2 block text-sm font-semibold text-stone-700">Предпросмотр</label>
                                            <div className="relative aspect-video overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
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
                                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
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
                            <div className="flex items-start gap-3 rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-100">
                                    <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="mb-1 font-serif text-xl font-semibold tracking-[-0.035em] text-stone-950">Приватный квиз</h4>
                                    <p className="text-sm text-stone-600">Квиз виден только вам. Описание и обложка для галереи не нужны. Чтобы поделиться, переключите уровень на «По ссылке» или «В галерее».</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative border-t border-stone-900/10 bg-[#fffaf0]/82 px-8 py-6 backdrop-blur shrink-0">
                    <div className="flex gap-4 max-w-3xl mx-auto">
                        <button
                            onClick={onClose}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-[#fffaf0] px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:border-amber-200 hover:bg-stone-50"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLocked(visibility)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3.5 text-sm font-semibold text-amber-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
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
