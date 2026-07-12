
import React, { useState, useMemo, useEffect } from 'react';
import { DOCUMENTATION, DocPage, DocCategory, DocBlock } from '../data/documentationData.ts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';

// --- Helper Components for Content Rendering ---

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-6 rounded-xl overflow-hidden border border-slate-700/50 bg-[#1e293b]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
                <span className="text-xs font-mono text-slate-400">{language || 'text'}</span>
                <button 
                    onClick={handleCopy}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                    {copied ? 'Скопировано!' : 'Копировать'}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const AlertBlock: React.FC<{ content: string; variant?: 'info' | 'warning' | 'success' | 'danger' }> = ({ content, variant = 'info' }) => {
    const variants = {
        info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ️' },
        warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠️' },
        success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: '✅' },
        danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '🚨' },
    };
    const style = variants[variant || 'info'];

    return (
        <div className={`my-6 p-4 rounded-xl border ${style.bg} ${style.border} ${style.text} flex gap-3 items-start`}>
            <span className="text-xl flex-shrink-0">{style.icon}</span>
            <div className="text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

const ContentRenderer = ({ blocks }: { blocks: DocBlock[] }) => {
    return (
        <div className="space-y-4">
            {blocks.map((block, index) => {
                switch (block.type) {
                    case 'heading':
                        return <h2 key={index} className="text-2xl font-bold text-slate-900 mt-10 mb-4 font-manrope">{block.content}</h2>;
                    case 'subheading':
                        return <h3 key={index} className="text-xl font-semibold text-slate-800 mt-8 mb-3 font-manrope">{block.content}</h3>;
                    case 'text':
                        return (
                            <div key={index} className="text-slate-600 leading-7 text-[15px] prose prose-slate max-w-none">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-4" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                                        code: ({node, ...props}) => <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono text-pink-600" {...props} />
                                    }}
                                >
                                    {block.content as string}
                                </ReactMarkdown>
                            </div>
                        );
                    case 'code':
                        return <CodeBlock key={index} code={Array.isArray(block.content) ? block.content.join('\n') : block.content} language={block.language} />;
                    case 'alert':
                        return <AlertBlock key={index} content={block.content as string} variant={block.variant} />;
                    case 'list':
                        return (
                             <div key={index} className="my-4">
                                <ul className="list-disc pl-6 space-y-2 text-slate-600 marker:text-indigo-500">
                                    {(block.content as string[]).map((item, i) => (
                                        <li key={i}>
                                             <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({node, ...props}) => <span {...props} />, // Render list items inline
                                                    strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />
                                                }}
                                             >
                                                {item}
                                            </ReactMarkdown>
                                        </li>
                                    ))}
                                </ul>
                             </div>
                        );
                    case 'image':
                        return (
                            <figure key={index} className="my-8">
                                <img 
                                    src={block.url} 
                                    alt={block.caption || 'Illustration'} 
                                    className="w-full rounded-xl border border-slate-200 shadow-sm"
                                />
                                {block.caption && (
                                    <figcaption className="text-center text-xs text-slate-500 mt-2">{block.caption}</figcaption>
                                )}
                            </figure>
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
};

// --- Main Documentation Component ---

const Documentation: React.FC = () => {
    const navigate = useNavigate();
    const pathname = useRouterState({ select: state => state.location.pathname });
    const routePageId = pathname.match(/^\/docs\/([^/]+)\/?$/)?.[1] ?? 'introduction';
    const [activePageId, setActivePageId] = useState<string>(routePageId);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile state

    const openPage = (pageId: string) => {
        setActivePageId(pageId);
        void navigate({ to: '/docs/$docId', params: { docId: pageId } });
    };

    useEffect(() => {
        setActivePageId(routePageId);
    }, [routePageId]);

    // Determine active page data
    const activePage = useMemo(() => {
        for (const cat of DOCUMENTATION) {
            const page = cat.pages.find(p => p.id === activePageId);
            if (page) return page;
        }
        return DOCUMENTATION[0].pages[0];
    }, [activePageId]);

    // Determine Next/Prev links
    const navLinks = useMemo(() => {
        const allPages = DOCUMENTATION.flatMap(cat => cat.pages);
        const currentIndex = allPages.findIndex(p => p.id === activePageId);
        return {
            prev: currentIndex > 0 ? allPages[currentIndex - 1] : null,
            next: currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null,
        };
    }, [activePageId]);

    // Search functionality
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const results: { pageId: string, title: string, category: string }[] = [];
        DOCUMENTATION.forEach(cat => {
            cat.pages.forEach(page => {
                if (page.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    page.description.toLowerCase().includes(searchQuery.toLowerCase())) {
                    results.push({ pageId: page.id, title: page.title, category: cat.title });
                }
            });
        });
        return results;
    }, [searchQuery]);

    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo(0, 0);
        setIsSidebarOpen(false); // Close mobile sidebar on navigation
    }, [activePageId]);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-inter flex flex-col">
            {/* Top Bar (Mobile/Tablet) */}
            <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <span className="font-bold text-slate-900">Документация</span>
                <Link to="/" className="text-sm font-medium text-indigo-600">В приложение</Link>
            </div>

            <div className="flex flex-1 max-w-[1440px] mx-auto w-full">
                {/* Sidebar Navigation */}
                <aside className={`
                    fixed inset-y-0 left-0 z-30 w-72 bg-slate-50 border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh)] lg:sticky lg:top-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="h-full flex flex-col">
                        <div className="p-6 border-b border-slate-200/50">
                            <Link to="/" className="flex items-center gap-2 mb-6 group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                                    П
                                </div>
                                <span className="font-bold text-lg text-slate-900">Поток Docs</span>
                            </Link>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Поиск..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>

                                {searchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50">
                                        {searchResults.length > 0 ? (
                                            searchResults.map((res, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { openPage(res.pageId); setSearchQuery(''); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="text-sm font-medium text-slate-900">{res.title}</div>
                                                    <div className="text-xs text-slate-500">{res.category}</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-sm text-slate-500 text-center">Ничего не найдено</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <nav className="flex-1 overflow-y-auto p-6 space-y-8">
                            {DOCUMENTATION.map(category => (
                                <div key={category.id}>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                                        {category.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {category.pages.map(page => (
                                            <button
                                                key={page.id}
                                                onClick={() => openPage(page.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    activePageId === page.id 
                                                        ? 'bg-indigo-50 text-indigo-700' 
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                }`}
                                            >
                                                {page.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                        
                        <div className="p-6 border-t border-slate-200 bg-slate-50/50">
                            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                                Вернуться в редактор
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 px-4 py-12 md:px-12 lg:py-16">
                    <div className="max-w-3xl mx-auto">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
                            <span>Документация</span>
                            <span className="text-slate-300">/</span>
                            <span>{DOCUMENTATION.find(c => c.pages.some(p => p.id === activePageId))?.title}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-indigo-600 font-medium">{activePage.title}</span>
                        </div>

                        <header className="mb-12">
                            <h1 className="text-4xl md:text-5xl font-extrabold font-manrope text-slate-900 mb-4 tracking-tight">
                                {activePage.title}
                            </h1>
                            <p className="text-xl text-slate-600 leading-relaxed font-light">
                                {activePage.description}
                            </p>
                        </header>

                        <div className="prose prose-slate max-w-none">
                            <ContentRenderer blocks={activePage.blocks} />
                        </div>

                        {/* Page Navigation */}
                        <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {navLinks.prev ? (
                                <button
                                    onClick={() => openPage(navLinks.prev!.id)}
                                    className="group flex flex-col items-start p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
                                >
                                    <span className="text-xs font-semibold text-slate-400 mb-1 group-hover:text-indigo-500 transition-colors">← Назад</span>
                                    <span className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{navLinks.prev.title}</span>
                                </button>
                            ) : <div />}

                            {navLinks.next && (
                                <button
                                    onClick={() => openPage(navLinks.next!.id)}
                                    className="group flex flex-col items-end p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-right"
                                >
                                    <span className="text-xs font-semibold text-slate-400 mb-1 group-hover:text-indigo-500 transition-colors">Далее →</span>
                                    <span className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{navLinks.next.title}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </main>
                
                {/* On This Page (Optional right sidebar) - Could be added here for larger screens */}
            </div>
        </div>
    );
};

export default Documentation;
