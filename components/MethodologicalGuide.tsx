import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore.ts';

const ICONS: Record<string, React.ReactNode> = {
    'intro': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.45 4.93L6 9.35l5.52 1.45L13 18l1.45-5.52L20 10.65l-5.52-1.45Z"></path></svg>,
    'basics': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    'patterns': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
    'advanced': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
    'ai': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9Z"></path></svg>,
    'analytics': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>,
};

const SECTIONS = [
    { id: 'intro', title: 'Введение: Философия Потока', icon: ICONS.intro, color: 'from-violet-500 to-purple-500' },
    { id: 'basics', title: 'Основы конструирования', icon: ICONS.basics, color: 'from-blue-500 to-cyan-500' },
    { id: 'patterns', title: 'Педагогические приемы', icon: ICONS.patterns, color: 'from-orange-500 to-pink-500' },
    { id: 'advanced', title: 'Продвинутые техники', icon: ICONS.advanced, color: 'from-amber-500 to-orange-500' },
    { id: 'ai', title: 'AI-Ассистент: Ваш партнер', icon: ICONS.ai, color: 'from-cyan-500 to-blue-500' },
    { id: 'analytics', title: 'Анализ результатов', icon: ICONS.analytics, color: 'from-green-500 to-emerald-500' },
];

const COLOR_SCHEMES = {
    orange: {
        border: 'border-orange-400',
        badge: 'text-orange-800 bg-orange-50',
        hover: 'hover:border-orange-500 hover:shadow-orange-100',
        gradient: 'from-orange-50 to-orange-100'
    },
    purple: {
        border: 'border-purple-400',
        badge: 'text-purple-800 bg-purple-50',
        hover: 'hover:border-purple-500 hover:shadow-purple-100',
        gradient: 'from-purple-50 to-purple-100'
    },
    teal: {
        border: 'border-teal-400',
        badge: 'text-teal-800 bg-teal-50',
        hover: 'hover:border-teal-500 hover:shadow-teal-100',
        gradient: 'from-teal-50 to-teal-100'
    },
    pink: {
        border: 'border-pink-400',
        badge: 'text-pink-800 bg-pink-50',
        hover: 'hover:border-pink-500 hover:shadow-pink-100',
        gradient: 'from-pink-50 to-pink-100'
    }
};

// Floating Particles Background
const FloatingParticles: React.FC = () => {
    const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 5
    }));

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full bg-gradient-to-br from-indigo-300/20 to-purple-300/20 blur-sm"
                    style={{
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        animation: `float ${p.duration}s infinite ease-in-out ${p.delay}s`
                    }}
                />
            ))}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(20px, -20px) rotate(90deg); }
                    50% { transform: translate(0, -40px) rotate(180deg); }
                    75% { transform: translate(-20px, -20px) rotate(270deg); }
                }
            `}</style>
        </div>
    );
};

// Interactive Tooltip
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 animate-fadeIn shadow-xl">
                    {text}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
};

// Animated Component with advanced effects
const AnimatedComponent: React.FC<{ 
    children: React.ReactNode; 
    className?: string; 
    delay?: number;
    variant?: 'fadeUp' | 'fadeIn' | 'slideRight' | 'scale';
}> = ({ children, className = '', delay = 0, variant = 'fadeUp' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
  
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setTimeout(() => {
                        setIsVisible(true);
                        setHasAnimated(true);
                    }, delay);
                }
            }, 
            { threshold: 0.1 }
        );
  
        const el = ref.current;
        if (el) observer.observe(el);
  
        return () => { if (el) observer.unobserve(el); };
    }, [delay, hasAnimated]);

    const variants = {
        fadeUp: isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        fadeIn: isVisible ? 'opacity-100' : 'opacity-0',
        slideRight: isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8',
        scale: isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
    };
  
    return (
        <div 
            ref={ref} 
            className={`transition-all duration-700 ease-out ${className} ${variants[variant]}`}
        >
            {children}
        </div>
    );
};

// Interactive Pattern Card with animations
const PatternCard: React.FC<{ 
    title: string; 
    discipline: string; 
    description: string; 
    implementation: string; 
    color: keyof typeof COLOR_SCHEMES;
    delay?: number;
}> = ({ title, discipline, description, implementation, color, delay = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [likes, setLikes] = useState(Math.floor(Math.random() * 50) + 10);
    const colorScheme = COLOR_SCHEMES[color];

    const handleCopy = () => {
        navigator.clipboard.writeText(implementation);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleLike = () => {
        if (!isLiked) {
            setLikes(prev => prev + 1);
            setIsLiked(true);
        }
    };

    return (
        <AnimatedComponent 
            delay={delay}
            className={`group relative border-l-4 ${colorScheme.border} bg-white rounded-r-2xl rounded-bl-2xl shadow-md hover:shadow-2xl ${colorScheme.hover} transition-all duration-500 overflow-hidden`}
        >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
            
            <div className="relative p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <span className={`text-xs font-bold uppercase ${colorScheme.badge} px-3 py-1.5 rounded-full tracking-wide shadow-sm`}>
                        {discipline}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Like button */}
                        <Tooltip text={isLiked ? "Вам понравилось!" : "Нравится"}>
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 ${
                                    isLiked 
                                        ? 'bg-red-50 text-red-600 scale-110' 
                                        : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'
                                }`}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill={isLiked ? "currentColor" : "none"}
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className={`transition-transform duration-300 ${isLiked ? 'scale-125' : ''}`}
                                >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <span className="text-xs font-semibold">{likes}</span>
                            </button>
                        </Tooltip>

                        {/* Expand button */}
                        <Tooltip text={isExpanded ? "Свернуть" : "Развернуть"}>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-gray-400 hover:text-gray-700 transition-all duration-300 p-1.5 hover:bg-gray-100 rounded-lg"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className={`transform transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}
                                >
                                    <path d="m6 9 6 6 6-6"/>
                                </svg>
                            </button>
                        </Tooltip>
                    </div>
                </div>
                
                <h4 className="text-xl font-bold font-manrope text-gray-900 mt-3 group-hover:text-indigo-700 transition-colors duration-300">
                    {title}
                </h4>
                
                <p className="text-gray-700 mt-3 leading-relaxed">
                    {description}
                </p>

                {/* Expandable implementation section */}
                <div 
                    className={`transition-all duration-500 ease-in-out ${
                        isExpanded ? 'max-h-96 opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0'
                    } overflow-hidden`}
                >
                    <div className="relative p-5 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💡</span>
                                <strong className="font-semibold text-gray-900 text-sm">
                                    Как реализовать:
                                </strong>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 transition-all duration-300 flex items-center gap-2 group/copy shadow-sm hover:shadow"
                            >
                                {isCopied ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        <span className="text-green-600 font-semibold">Скопировано!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover/copy:text-indigo-600 transition-colors">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                        <span className="text-gray-600 font-medium group-hover/copy:text-indigo-600 transition-colors">Копировать</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed font-mono bg-white/60 p-4 rounded-lg border border-gray-100">
                            {implementation}
                        </p>
                    </div>
                </div>
            </div>

            {/* Animated bottom border */}
            <div className={`h-1 bg-gradient-to-r ${colorScheme.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
        </AnimatedComponent>
    );
};

// Reading Progress Bar
const ReadingProgress: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = ({ containerRef }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            if (!containerRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
            setProgress(Math.min(scrolled, 100));
        };

        const container = containerRef.current;
        container?.addEventListener('scroll', updateProgress);
        return () => container?.removeEventListener('scroll', updateProgress);
    }, [containerRef]);

    return (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
            <div 
                className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
            >
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
            {progress > 0 && (
                <div 
                    className="absolute bottom-2 bg-gray-900 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg transition-all duration-300"
                    style={{ left: `calc(${progress}% - 20px)` }}
                >
                    {Math.round(progress)}%
                </div>
            )}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    );
};

// Interactive Back to Top Button
const BackToTop: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = ({ containerRef }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (containerRef.current && containerRef.current.scrollTop > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        const container = containerRef.current;
        container?.addEventListener('scroll', toggleVisibility);
        return () => container?.removeEventListener('scroll', toggleVisibility);
    }, [containerRef]);

    const scrollToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            onClick={scrollToTop}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed bottom-8 right-8 p-4 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 z-30 group ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90 pointer-events-none'
            }`}
            aria-label="Наверх"
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={`transition-all duration-500 ${isHovered ? '-translate-y-2 scale-110' : ''}`}
            >
                <path d="m18 15-6-6-6 6"/>
            </svg>
            {isHovered && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fadeIn">
                    Наверх
                </span>
            )}
        </button>
    );
};

// Interactive Section Indicator
const SectionIndicator: React.FC<{ sections: typeof SECTIONS; activeSection: string; onSectionClick: (id: string) => void }> = ({ sections, activeSection, onSectionClick }) => {
    return (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 z-30 hidden xl:block">
            <div className="space-y-3">
                {sections.map((section) => (
                    <Tooltip key={section.id} text={section.title}>
                        <button
                            onClick={() => onSectionClick(section.id)}
                            className="block group relative"
                        >
                            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                activeSection === section.id 
                                    ? 'bg-indigo-600 scale-150 ring-4 ring-indigo-200' 
                                    : 'bg-gray-300 hover:bg-indigo-400 hover:scale-125'
                            }`} />
                            {activeSection === section.id && (
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap">
                                    <div className={`bg-gradient-to-r ${section.color} text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow-lg animate-fadeIn`}>
                                        {section.title}
                                    </div>
                                </div>
                            )}
                        </button>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
};

// Interactive Stats Badge
const StatsBadge: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
            className={`relative p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-${color}-200 transition-all duration-300 hover:shadow-lg cursor-default group`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-3xl transform group-hover:scale-125 transition-transform duration-300">{icon}</span>
                <span className={`text-2xl font-bold text-gray-900 group-hover:text-${color}-600 transition-colors`}>
                    {value}
                </span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{label}</p>
            {isHovered && (
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50 rounded-2xl pointer-events-none" />
            )}
        </div>
    );
};

const MethodologicalGuide: React.FC = () => {
    const setGuideVisible = useUIStore(s => s.setGuideVisible);
    const [activeSection, setActiveSection] = useState('intro');
    const [readingTime, setReadingTime] = useState(0);
    const [achievements, setAchievements] = useState<string[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    // Reading time tracker
    useEffect(() => {
        const interval = setInterval(() => {
            setReadingTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Achievement system
    useEffect(() => {
        if (readingTime === 30 && !achievements.includes('reader')) {
            setAchievements(prev => [...prev, 'reader']);
        }
        if (readingTime === 120 && !achievements.includes('dedicated')) {
            setAchievements(prev => [...prev, 'dedicated']);
        }
    }, [readingTime, achievements]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { root: contentRef.current, threshold: 0.5, rootMargin: '-20% 0px -50% 0px' }
        );

        Object.values(sectionRefs.current).forEach(el => {
            // FIX: Added a check to ensure `el` is an instance of HTMLElement before observing.
            if (el instanceof HTMLElement) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-screen h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col font-inter antialiased relative overflow-hidden">
            <FloatingParticles />
            
            {/* Header */}
            <header className="relative bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shrink-0 sticky top-0 z-20 shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-lg font-bold font-manrope text-gray-900 flex items-center gap-3">
                        <div className="relative p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform duration-300">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 bg-clip-text text-transparent">
                            Методическое руководство
                        </span>
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        {/* Reading time */}
                        <Tooltip text="Время чтения">
                            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span className="text-sm font-semibold text-purple-900">{formatTime(readingTime)}</span>
                            </div>
                        </Tooltip>

                        {/* Achievements */}
                        {achievements.length > 0 && (
                            <Tooltip text="Достижения разблокированы!">
                                <div className="flex items-center gap-1">
                                    {achievements.map(ach => (
                                        <div key={ach} className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                            <span className="text-lg">🏆</span>
                                        </div>
                                    ))}
                                </div>
                            </Tooltip>
                        )}

                        <button 
                            onClick={() => setGuideVisible(false)} 
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform duration-300">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                            Вернуться в редактор
                        </button>
                    </div>
                </div>
                <ReadingProgress containerRef={contentRef} />
            </header>

            <div className="flex flex-grow min-h-0 relative z-10">
                {/* Sidebar Navigation */}
                <aside className="relative w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200/80 p-6 shrink-0 overflow-y-auto hidden md:block">
                    <nav className="sticky top-6">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                                Содержание
                            </p>
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full shadow-sm">
                                {SECTIONS.findIndex(s => s.id === activeSection) + 1}/{SECTIONS.length}
                            </span>
                        </div>
                        
                        <div className="relative space-y-2">
                            {SECTIONS.map((section) => (
                                <button 
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full text-left text-sm font-semibold flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-500 relative overflow-hidden group ${
                                        activeSection === section.id 
                                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-900 shadow-md scale-105' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-102'
                                    }`}
                                >
                                    {activeSection === section.id && (
                                        <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-5`} />
                                    )}
                                    
                                    <span className={`relative flex items-center justify-center w-10 h-10 rounded-xl shadow-sm border transition-all duration-300 ${
                                        activeSection === section.id 
                                            ? 'bg-white text-indigo-600 border-indigo-200 shadow-indigo-100 scale-110' 
                                            : 'bg-white text-gray-500 border-gray-200 group-hover:border-indigo-200 group-hover:text-indigo-500'
                                    }`}>
                                        {section.icon}
                                    </span>
                                    
                                    <span className="flex-1 relative">{section.title}</span>
                                    
                                    {activeSection === section.id && (
                                        <span className="relative w-2 h-2 bg-indigo-600 rounded-full">
                                            <span className="absolute inset-0 bg-indigo-600 rounded-full animate-ping" />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Tips */}
                        <AnimatedComponent delay={500} className="mt-8">
                            <div className="p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 rounded-2xl border-2 border-orange-200/50 shadow-sm">
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="text-2xl">💡</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 mb-1">Быстрая навигация</p>
                                        <p className="text-xs text-gray-700 leading-relaxed">
                                            Используйте точки слева для мгновенного перехода между разделами
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </AnimatedComponent>

                        {/* Progress Stats */}
                        <AnimatedComponent delay={700} className="mt-6">
                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                                <p className="text-xs font-semibold text-gray-700 mb-3">Ваш прогресс</p>
                                <div className="space-y-2">
                                    {SECTIONS.map((section, index) => {
                                        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
                                        const isCompleted = index < currentIndex;
                                        const isCurrent = index === currentIndex;
                                        
                                        return (
                                            <div key={section.id} className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                                    isCompleted 
                                                        ? 'bg-green-500 border-green-500' 
                                                        : isCurrent 
                                                        ? 'bg-indigo-500 border-indigo-500 animate-pulse' 
                                                        : 'bg-white border-gray-300'
                                                }`}>
                                                    {isCompleted && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className={`text-xs ${isCompleted || isCurrent ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                                    {section.title}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </AnimatedComponent>
                    </nav>
                </aside>

                {/* Main Content */}
                <main ref={contentRef} className="flex-grow p-8 md:p-12 overflow-y-auto scroll-smooth">
                    <div className="max-w-4xl mx-auto space-y-24 pb-20">
                        {/* Intro Section */}
                        <section id="intro" ref={el => { sectionRefs.current['intro'] = el; }}>
                            <AnimatedComponent>
                                <div className="relative mb-8">
                                    <div className="absolute -left-6 top-0 w-2 h-20 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full" />
                                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full text-xs font-bold text-violet-800 uppercase tracking-wider mb-4">
                                        ✨ Начало путешествия
                                    </div>
                                    <h2 className="text-5xl md:text-6xl font-bold font-manrope text-gray-900 leading-tight mb-6">
                                        Философия «Потока»
                                    </h2>
                                    <div className="w-24 h-1.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                                </div>
                            </AnimatedComponent>

                            <AnimatedComponent delay={100}>
                                <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-light mb-8">
                                    «Поток» — это не просто конструктор тестов. Это инструмент для создания{' '}
                                    <span className="relative inline-block group cursor-pointer">
                                        <span className="relative z-10 font-semibold text-indigo-900">образовательного опыта</span>
                                        <span className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-purple-100 transform -skew-x-12 group-hover:skew-x-0 transition-transform duration-300" />
                                    </span>.
                                </p>
                            </AnimatedComponent>

                            <AnimatedComponent delay={200}>
                                <div className="relative p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl border-2 border-indigo-200/50 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:scale-150 transition-transform duration-1000" />
                                    <div className="relative">
                                        <div className="flex items-start gap-4 mb-4">
                                            <span className="text-5xl">🎯</span>
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Наша миссия</h3>
                                                <p className="text-lg text-gray-800 leading-relaxed">
                                                    Мы верим, что настоящее обучение происходит не в момент ответа на вопрос, а в процессе принятия решений и анализа их последствий. Превратите любой урок в увлекательную историю, где ученик — главный герой!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AnimatedComponent>

                            {/* Interactive Stats */}
                            <div className="grid md:grid-cols-3 gap-6 mt-12">
                                <AnimatedComponent delay={300}>
                                    <StatsBadge icon="👥" label="Активных пользователей" value="10K+" color="indigo" />
                                </AnimatedComponent>
                                <AnimatedComponent delay={400}>
                                    <StatsBadge icon="📚" label="Созданных квизов" value="50K+" color="purple" />
                                </AnimatedComponent>
                                <AnimatedComponent delay={500}>
                                    <StatsBadge icon="⭐" label="Средний рейтинг" value="4.9" color="amber" />
                                </AnimatedComponent>
                            </div>
                        </section>

                        {/* Basics Section */}
                        <section id="basics" ref={el => { sectionRefs.current['basics'] = el; }}>
                            <AnimatedComponent>
                                <div className="relative mb-8">
                                    <div className="absolute -left-6 top-0 w-2 h-20 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
                                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full text-xs font-bold text-blue-800 uppercase tracking-wider mb-4">
                                        🎨 Основы
                                    </div>
                                    <h2 className="text-5xl font-bold font-manrope text-gray-900 leading-tight mb-6">
                                        Основы конструирования
                                    </h2>
                                    <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                                </div>
                            </AnimatedComponent>

                            <AnimatedComponent delay={100}>
                                <p className="text-xl text-gray-800 leading-relaxed mb-10">
                                    Ваш квиз состоит из двух типов элементов:{' '}
                                    <strong className="text-gray-900 font-bold">Узлов</strong> (экраны и действия) и{' '}
                                    <strong className="text-gray-900 font-bold">Связей</strong> (логика переходов).
                                </p>
                            </AnimatedComponent>

                            <div className="grid md:grid-cols-2 gap-8">
                                <AnimatedComponent delay={200} variant="slideRight">
                                    <div className="group relative p-8 bg-white rounded-3xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-teal-300 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-200/30 to-cyan-200/30 rounded-full blur-2xl transform translate-x-20 -translate-y-20 group-hover:scale-150 transition-transform duration-1000" />
                                        
                                        <div className="relative flex items-center gap-4 mb-5">
                                            <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="7" height="7"></rect>
                                                    <rect x="14" y="3" width="7" height="7"></rect>
                                                    <rect x="14" y="14" width="7" height="7"></rect>
                                                    <rect x="3" y="14" width="7" height="7"></rect>
                                                </svg>
                                            </div>
                                            <h4 className="font-bold text-2xl text-gray-900">Узлы</h4>
                                        </div>
                                        
                                        <p className="relative text-gray-700 leading-relaxed mb-4">
                                            Это кирпичики вашего урока. Каждый узел представляет собой шаг в сценарии: вопрос, информационный блок, проверка условия или результат.
                                        </p>

                                        <div className="relative flex flex-wrap gap-2">
                                            {['Вопрос', 'Инфо', 'Условие', 'Результат'].map((tag, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </AnimatedComponent>

                                <AnimatedComponent delay={300} variant="slideRight">
                                    <div className="group relative p-8 bg-white rounded-3xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-purple-300 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl transform translate-x-20 -translate-y-20 group-hover:scale-150 transition-transform duration-1000" />
                                        
                                        <div className="relative flex items-center gap-4 mb-5">
                                            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14"></path>
                                                    <path d="m12 5 7 7-7 7"></path>
                                                </svg>
                                            </div>
                                            <h4 className="font-bold text-2xl text-gray-900">Связи</h4>
                                        </div>
                                        
                                        <p className="relative text-gray-700 leading-relaxed mb-4">
                                            Это пути, по которым пойдет ученик. Потяните за кружок на узле и соедините с другим узлом для создания логической цепочки.
                                        </p>

                                        <div className="relative p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                                            <p className="text-sm text-gray-700 font-mono">
                                                Узел A → Узел B → Узел C
                                            </p>
                                        </div>
                                    </div>
                                </AnimatedComponent>
                            </div>
                        </section>

                        {/* Patterns Section */}
                        <section id="patterns" ref={el => { sectionRefs.current['patterns'] = el; }}>
                            <AnimatedComponent>
                                <div className="relative mb-8">
                                    <div className="absolute -left-6 top-0 w-2 h-20 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full" />
                                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full text-xs font-bold text-orange-800 uppercase tracking-wider mb-4">
                                        🎓 Методики
                                    </div>
                                    <h2 className="text-5xl font-bold font-manrope text-gray-900 leading-tight mb-6">
                                        Педагогические приемы
                                    </h2>
                                    <div className="w-24 h-1.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" />
                                </div>
                            </AnimatedComponent>

                            <AnimatedComponent delay={100}>
                                <p className="text-xl text-gray-800 leading-relaxed mb-10">
                                    «Поток» позволяет реализовать множество проверенных методик. Вот несколько идей для вашего предмета:
                                </p>
                            </AnimatedComponent>

                            <div className="space-y-8">
                                <PatternCard 
                                    title="Историческая развилка" 
                                    discipline="История / Обществознание" 
                                    color="orange" 
                                    description="Поставьте ученика на место исторической личности и предложите принять ключевое решение. Это развивает критическое мышление и понимание контекста эпохи." 
                                    implementation="QuestionNode (выбор решения) ➞ несколько FeedbackNode (немедленные последствия) ➞ ConditionNode (проверка накопленных очков 'влияния') ➞ разные ResultNode (исторические итоги)."
                                    delay={0}
                                />
                                <PatternCard 
                                    title="Литературный выбор" 
                                    discipline="Литература" 
                                    color="purple" 
                                    description="Исследуйте мотивы персонажа, давая ученику сделать выбор за него. Это помогает глубже понять характер и авторский замысел." 
                                    implementation="QuestionNode (моральная дилемма героя) ➞ FeedbackNode ('Как бы на это отреагировал другой персонаж?') ➞ ResultNode (описание дальнейшей судьбы героя)."
                                    delay={100}
                                />
                                <PatternCard 
                                    title="Виртуальный эксперимент" 
                                    discipline="Химия / Физика / Биология" 
                                    color="teal" 
                                    description="Симулируйте простую лабораторную работу, где от выбора 'реагентов' зависит исход опыта. Это безопасно и наглядно." 
                                    implementation="QuestionNode ('Что добавим в колбу?') ➞ ResultNode ('Успех! Вы получили нужное вещество.') или ResultNode ('Неудача! Произошла неожиданная реакция, потому что...')."
                                    delay={200}
                                />
                                <PatternCard 
                                    title="Диалоговый тренажер" 
                                    discipline="Иностранные языки" 
                                    color="pink" 
                                    description="Создайте симуляцию диалога, например, в магазине или кафе. Ученик выбирает реплики, а система реагирует, как 'носитель языка'." 
                                    implementation="Цепочка из QuestionNode (выбор реплики) и InfoNode (ответ собеседника). Неправильные ветки могут вести к 'недопониманию' и необходимости начать заново."
                                    delay={300}
                                />
                            </div>
                        </section>

                        {/* Advanced Section */}
                        <section id="advanced" ref={el => { sectionRefs.current['advanced'] = el; }}>
                            <AnimatedComponent>
                                <div className="relative mb-8">
                                    <div className="absolute -left-6 top-0 w-2 h-20 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
                                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full text-xs font-bold text-amber-800 uppercase tracking-wider mb-4">
                                        ⚡ Продвинутый уровень
                                    </div>
                                    <h2 className="text-5xl font-bold font-manrope text-gray-900 leading-tight mb-6">
                                        Продвинутые техники
                                    </h2>
                                    <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                                </div>
                            </AnimatedComponent>

                            <div className="space-y-8 mt-10">
                                <AnimatedComponent delay={100}>
                                    <div className="group relative p-10 bg-white rounded-3xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-amber-300 transition-all duration-500 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:scale-150 transition-transform duration-1000" />
                                        
                                        <div className="relative flex items-start gap-6">
                                            <div className="shrink-0 p-5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                                                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                                                    <path d="M4 22h16"></path>
                                                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                                                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                                                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                                    🎮 Геймификация
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">HOT</span>
                                                </h4>
                                                <p className="text-lg text-gray-800 leading-relaxed mb-6">
                                                    Используйте узел <code className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 rounded-lg font-mono text-sm font-semibold border border-amber-200">«Очки»</code> для начисления баллов. Затем с помощью узла <code className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 rounded-lg font-mono text-sm font-semibold border border-amber-200">«Условие»</code> открывайте секретные уровни!
                                                </p>
                                                <div className="p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border-2 border-amber-200 shadow-inner">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-2xl">🎯</span>
                                                        <code className="text-base text-gray-900 font-mono font-semibold">
                                                            score &gt; 50 → Секретный уровень разблокирован!
                                                        </code>
                                                    </div>
                                                    <div className="flex gap-2 mt-4">
                                                        <span className="px-3 py-1.5 bg-yellow-200 text-yellow-900 text-xs font-bold rounded-full">🏆 Достижение</span>
                                                        <span className="px-3 py-1.5 bg-green-200 text-green-900 text-xs font-bold rounded-full">+100 XP</span>
                                                        <span className="px-3 py-1.5 bg-blue-200 text-blue-900 text-xs font-bold rounded-full">🎁 Награда</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedComponent>

                                <AnimatedComponent delay={200}>
                                    <div className="group relative p-10 bg-white rounded-3xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-purple-300 transition-all duration-500 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:scale-150 transition-transform duration-1000" />
                                        
                                        <div className="relative flex items-start gap-6">
                                            <div className="shrink-0 p-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="9" cy="7" r="4"></circle>
                                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                                    👤 Персонализация
                                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">NEW</span>
                                                </h4>
                                                <p className="text-lg text-gray-800 leading-relaxed mb-6">
                                                    Узел <code className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 rounded-lg font-mono text-sm font-semibold border border-purple-200">«Сбор инфо»</code> позволяет узнать имя ученика. Затем используйте переменные для создания персонального обращения!
                                                </p>
                                                <div className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 rounded-2xl border-2 border-purple-200 shadow-inner">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-2xl">✨</span>
                                                        <code className="text-base text-gray-900 font-mono font-semibold">
                                                            Привет, {`{{username}}`}! Готов к приключениям?
                                                        </code>
                                                    </div>
                                                    <p className="text-sm text-gray-700 mt-4 p-3 bg-white/60 rounded-lg">
                                                        <strong className="text-purple-800">Совет:</strong> Создавайте переменные для отслеживания репутации, золота и других параметров!
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedComponent>
                            </div>
                        </section>

                        {/* AI Section */}
                        <section id="ai" ref={el => { sectionRefs.current['ai'] = el; }}>
                            <AnimatedComponent>
                                <div className="relative mb-8">
                                    <div className="absolute -left-6 top-0 w-2 h-20 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full" />
                                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-full text-xs font-bold text-cyan-800 uppercase tracking-wider mb-4">
                                        🤖 Искусственный интеллект
                                    </div>
                                    <h2 className="text-5xl font-bold font-manrope text-gray-900 leading-tight mb-6">
                                        AI-Ассистент: Ваш творческий партнер
                                    </h2>
                                    <div className="w-24 h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                                </div>
                            </AnimatedComponent>

                            <AnimatedComponent delay={100}>
                                <p className="text-xl text-gray-800 leading-relaxed mb-10">
                                    Не знаете, с чего начать или как продолжить ветку? AI-Ассистент всегда готов помочь! 🚀
                                </p>
                            </AnimatedComponent>

                            <div className="space-y-6">
                                {[
                                    { 
                                        icon: '💡', 
                                        title: 'Генератор идей', 
                                        desc: 'Введите тему (например, "Реформы Петра I"), и ИИ предложит 5 уникальных концепций для вашего квиза, каждая с креативной механикой.',
                                        color: 'from-yellow-400 to-orange-500',
                                        bgColor: 'from-yellow-50 to-orange-50',
                                        borderColor: 'border-yellow-300'
                                    },
                                    { 
                                        icon: '🔗', 
                                        title: 'Продолжение ветки', 
                                        desc: 'Выберите любой узел на холсте, и ассистент предложит логичные следующие шаги с уже готовым контентом. Экономьте время!',
                                        color: 'from-blue-400 to-cyan-500',
                                        bgColor: 'from-blue-50 to-cyan-50',
                                        borderColor: 'border-blue-300'
                                    },
                                    { 
                                        icon: '📊', 
                                        title: 'Анализ сложности', 
                                        desc: 'Запустите анализ всего квиза, и ИИ найдет несбалансированные ветки, тупики и даст рекомендации по улучшению структуры.',
                                        color: 'from-purple-400 to-pink-500',
                                        bgColor: 'from-purple-50 to-pink-50',
                                        borderColor: 'border-purple-300'
                                    }
                                ].map((item, index) => (
                                    <AnimatedComponent key={index} delay={index * 100}>
                                        <div className={`group relative p-8 bg-white rounded-3xl border-2 ${item.borderColor} shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden`}>
                                            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${item.bgColor} opacity-30 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:scale-150 transition-transform duration-1000`} />
                                            
                                            <div className="relative flex items-start gap-6">
                                                <div className={`shrink-0 w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl shadow-xl flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                                                    {item.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-2xl text-gray-900 mb-3">{item.title}</h4>
                                                    <p className="text-gray-700 leading-relaxed text-lg">{item.desc}</p>
                                                    <button className="mt-5 px-5 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 group/btn">
                                                        Попробовать
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:translate-x-1 transition-transform duration-300">
                                                            <path d="M5 12h14"></path>
                                                            <path d="m12 5 7 7-7 7"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </AnimatedComponent>
                                ))}
                            </div>
                        </section>

                        {/* Analytics Section */}
                        <section id="analytics" ref={el => { sectionRefs.current['analytics'] = el; }}>
                            <AnimatedComponent>
                                <div className="relative mb-8">
                                    <div className="absolute -left-6 top-0 w-2 h-20 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
                                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full text-xs font-bold text-green-800 uppercase tracking-wider mb-4">
                                        📈 Аналитика
                                    </div>
                                    <h2 className="text-5xl font-bold font-manrope text-gray-900 leading-tight mb-6">
                                        Анализ результатов
                                    </h2>
                                    <div className="w-24 h-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                                </div>
                            </AnimatedComponent>

                            <AnimatedComponent delay={100}>
                                <p className="text-xl text-gray-800 leading-relaxed mb-10">
                                    Обучение не заканчивается на прохождении квиза. Глубокая аналитика — ваш ключ к постоянному улучшению! 📊
                                </p>
                            </AnimatedComponent>

                            <AnimatedComponent delay={200}>
                                <div className="relative p-10 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl border-2 border-green-300 shadow-2xl overflow-hidden group hover:shadow-3xl transition-all duration-500">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-300/30 to-emerald-300/30 rounded-full blur-3xl transform translate-x-48 -translate-y-48 group-hover:scale-150 transition-transform duration-1000" />
                                    
                                    <div className="relative">
                                        <div className="flex items-start gap-6 mb-8">
                                            <div className="shrink-0 p-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 3v18h18"></path>
                                                    <path d="m19 9-5 5-4-4-3 3"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-bold text-gray-900 mb-4">Полная картина обучения</h3>
                                                <p className="text-lg text-gray-800 leading-relaxed">
                                                    Просматривайте не только баллы, но и <strong className="text-green-800">полный путь</strong> каждого ученика: какие ответы давал, где ошибался, сколько времени потратил. Эта информация бесценна!
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-5">
                                            {[
                                                { icon: '📍', label: 'Карта путешествия', desc: 'Визуализация пути' },
                                                { icon: '⏱️', label: 'Временные метрики', desc: 'Анализ времени' },
                                                { icon: '🎯', label: 'Точки роста', desc: 'Зоны развития' }
                                            ].map((stat, i) => (
                                                <div key={i} className="p-5 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-green-200 text-center group/stat hover:scale-105 transition-all duration-300 cursor-pointer">
                                                    <div className="text-4xl mb-3 group-hover/stat:scale-125 transition-transform duration-300">{stat.icon}</div>
                                                    <p className="font-bold text-gray-900 mb-1">{stat.label}</p>
                                                    <p className="text-sm text-gray-600">{stat.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </AnimatedComponent>
                        </section>

                        {/* Final CTA */}
                        <AnimatedComponent>
                            <div className="relative my-20 p-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl text-white text-center overflow-hidden group hover:shadow-3xl transition-all duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                                
                                <div className="relative">
                                    <div className="text-6xl mb-6 animate-bounce">🚀</div>
                                    <h3 className="text-4xl md:text-5xl font-bold font-manrope mb-6 leading-tight">
                                        Готовы создать свой первый «Поток»?
                                    </h3>
                                    <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                                        Начните с простого сценария и постепенно добавляйте сложность. Помните: каждый великий квиз начинался с одного узла! ✨
                                    </p>
                                    <button 
                                        onClick={() => setGuideVisible(false)}
                                        className="px-10 py-5 bg-white text-indigo-700 font-bold text-lg rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 inline-flex items-center gap-3 group/btn"
                                    >
                                        <span>Начать творить</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:translate-x-2 transition-transform duration-300">
                                            <path d="M5 12h14"></path>
                                            <path d="m12 5 7 7-7 7"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </AnimatedComponent>
                    </div>
                </main>
            </div>

            <SectionIndicator 
                sections={SECTIONS} 
                activeSection={activeSection} 
                onSectionClick={scrollToSection} 
            />
            <BackToTop containerRef={contentRef} />

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default MethodologicalGuide;
