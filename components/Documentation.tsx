import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DOCUMENTATION, DocBlock } from '../data/documentationData.ts';

const allPages = DOCUMENTATION.flatMap((category) =>
  category.pages.map((page) => ({
    ...page,
    categoryId: category.id,
    categoryTitle: category.title,
  }))
);

const getPageText = (blocks: DocBlock[]): string =>
  blocks
    .map((block) => (Array.isArray(block.content) ? block.content.join(' ') : block.content))
    .join(' ');

const normalize = (value: string): string => value.toLowerCase().trim();

const getInitialPageId = (): string => allPages[0]?.id ?? 'introduction';

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative my-6 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-900 px-4 py-2">
        <span className="font-mono text-xs text-slate-400">{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const AlertBlock: React.FC<{ content: string; variant?: 'info' | 'warning' | 'success' | 'danger' }> = ({
  content,
  variant = 'info',
}) => {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      label: 'Важно',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      label: 'Обратите внимание',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      label: 'Рекомендация',
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      label: 'Критично',
    },
  };
  const style = variants[variant];

  return (
    <aside className={`my-6 rounded-xl border ${style.bg} ${style.border} ${style.text} p-4`}>
      <div className="mb-1 text-xs font-bold uppercase tracking-wider opacity-75">{style.label}</div>
      <div className="prose prose-sm max-w-none text-inherit prose-p:my-0 prose-strong:text-inherit">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </aside>
  );
};

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-4" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-slate-950" {...props} />,
  code: ({ node, ...props }: any) => (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-indigo-700" {...props} />
  ),
  a: ({ node, ...props }: any) => (
    <a className="font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900" {...props} />
  ),
};

const ContentRenderer: React.FC<{ blocks: DocBlock[] }> = ({ blocks }) => (
  <div className="space-y-4">
    {blocks.map((block, index) => {
      const content = Array.isArray(block.content) ? block.content.join('\n') : block.content;

      switch (block.type) {
        case 'heading':
          return (
            <h2 key={index} className="mt-10 font-manrope text-2xl font-bold text-slate-950">
              {content}
            </h2>
          );
        case 'subheading':
          return (
            <h3 key={index} className="mt-8 font-manrope text-xl font-semibold text-slate-900">
              {content}
            </h3>
          );
        case 'text':
          return (
            <div key={index} className="prose prose-slate max-w-none text-[15px] leading-7 text-slate-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          );
        case 'code':
          return <CodeBlock key={index} code={content} language={block.language} />;
        case 'alert':
          return <AlertBlock key={index} content={content} variant={block.variant} />;
        case 'list':
          return (
            <ul key={index} className="my-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-600 marker:text-indigo-500">
              {(block.content as string[]).map((item, itemIndex) => (
                <li key={itemIndex}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ...markdownComponents,
                      p: ({ node, ...props }: any) => <span {...props} />,
                    }}
                  >
                    {item}
                  </ReactMarkdown>
                </li>
              ))}
            </ul>
          );
        case 'image':
          return (
            <figure key={index} className="my-8">
              <img
                src={block.url}
                alt={block.caption || 'Иллюстрация'}
                className="w-full rounded-xl border border-slate-200 shadow-sm"
              />
              {block.caption && <figcaption className="mt-2 text-center text-xs text-slate-500">{block.caption}</figcaption>}
            </figure>
          );
        case 'video':
          return (
            <div key={index} className="my-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <iframe
                src={block.url}
                title={block.caption || 'Видео'}
                className="aspect-video w-full"
                allow="clipboard-write; autoplay"
                allowFullScreen
              />
              {block.caption && <div className="px-4 py-3 text-sm text-slate-600">{block.caption}</div>}
            </div>
          );
        default:
          return null;
      }
    })}
  </div>
);

const Documentation: React.FC = () => {
  const [activePageId, setActivePageId] = useState(getInitialPageId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activePage = useMemo(
    () => allPages.find((page) => page.id === activePageId) || allPages[0],
    [activePageId]
  );

  const navLinks = useMemo(() => {
    const currentIndex = allPages.findIndex((page) => page.id === activePageId);
    return {
      prev: currentIndex > 0 ? allPages[currentIndex - 1] : null,
      next: currentIndex >= 0 && currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null,
    };
  }, [activePageId]);

  const searchResults = useMemo(() => {
    const query = normalize(searchQuery);
    if (!query) return [];

    return allPages
      .filter((page) => {
        const haystack = normalize(`${page.title} ${page.description} ${getPageText(page.blocks)}`);
        return haystack.includes(query);
      })
      .slice(0, 12);
  }, [searchQuery]);

  const setPage = (pageId: string) => {
    setActivePageId(pageId);
    setSearchQuery('');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsSidebarOpen(false);
  }, [activePageId]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-inter text-slate-950">
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen((value) => !value)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Открыть навигацию"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        <span className="font-bold text-slate-950">Документация</span>
        <Link to="/" className="text-sm font-semibold text-indigo-700">
          В редактор
        </Link>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Закрыть навигацию"
          className="fixed inset-0 z-20 bg-slate-950/30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-80 max-w-[86vw] transform border-r border-slate-200 bg-slate-50 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200/70 p-6">
              <Link to="/" className="mb-6 flex items-center gap-3 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 font-bold text-white shadow-md transition-transform group-hover:scale-105">
                  П
                </div>
                <div>
                  <div className="font-manrope text-lg font-bold text-slate-950">Поток Docs</div>
                  <div className="text-xs font-medium text-slate-500">Руководство автора</div>
                </div>
              </Link>

              <div className="relative">
                <input
                  id="documentation-search"
                  name="documentation-search"
                  type="search"
                  placeholder="Поиск по документации"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
                </svg>

                {searchQuery && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {searchResults.length > 0 ? (
                      searchResults.map((page) => (
                        <button
                          type="button"
                          key={page.id}
                          onClick={() => setPage(page.id)}
                          className="w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-indigo-50"
                        >
                          <div className="text-sm font-semibold text-slate-950">{page.title}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{page.categoryTitle}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500">Ничего не найдено</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <nav className="flex-1 space-y-8 overflow-y-auto p-6">
              {DOCUMENTATION.map((category) => (
                <section key={category.id}>
                  <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {category.title}
                  </h3>
                  <div className="space-y-1">
                    {category.pages.map((page) => (
                      <button
                        type="button"
                        key={page.id}
                        onClick={() => setPage(page.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                          activePageId === page.id
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        {page.title}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </nav>

            <div className="border-t border-slate-200 bg-slate-50/70 p-6">
              <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Вернуться в редактор
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-12 md:px-12 lg:py-16">
          <article className="mx-auto max-w-3xl">
            <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>Документация</span>
              <span className="text-slate-300">/</span>
              <span>{activePage.categoryTitle}</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-indigo-700">{activePage.title}</span>
            </div>

            <header className="mb-12">
              <h1 className="mb-4 font-manrope text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                {activePage.title}
              </h1>
              <p className="text-xl font-light leading-relaxed text-slate-600">{activePage.description}</p>
            </header>

            <ContentRenderer blocks={activePage.blocks} />

            <div className="mt-16 grid grid-cols-1 gap-6 border-t border-slate-200 pt-8 sm:grid-cols-2">
              {navLinks.prev ? (
                <button
                  type="button"
                  onClick={() => setPage(navLinks.prev!.id)}
                  className="group flex flex-col items-start rounded-2xl border border-slate-200 p-6 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <span className="mb-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-indigo-500">
                    Назад
                  </span>
                  <span className="text-lg font-bold text-slate-800 transition-colors group-hover:text-indigo-700">
                    {navLinks.prev.title}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {navLinks.next && (
                <button
                  type="button"
                  onClick={() => setPage(navLinks.next!.id)}
                  className="group flex flex-col items-end rounded-2xl border border-slate-200 p-6 text-right transition-all hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <span className="mb-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-indigo-500">
                    Далее
                  </span>
                  <span className="text-lg font-bold text-slate-800 transition-colors group-hover:text-indigo-700">
                    {navLinks.next.title}
                  </span>
                </button>
              )}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
};

export default Documentation;
