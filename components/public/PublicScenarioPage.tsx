import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import type { PublicQuiz } from '../../types';
import { applySeoMetadata } from '../../src/seo/SeoRouteHead';
import type { SeoPage } from '../../src/seo/seoCatalog';

interface PublicScenarioPageProps {
  quiz: PublicQuiz;
}

const questionTypes = new Set([
  'questionNode',
  'multipleChoiceNode',
  'textInputNode',
  'matchingNode',
  'timelineNode',
  'allocatorNode',
]);

function getDescription(quiz: PublicQuiz): string {
  return quiz.quiz_data?.description?.trim()
    || quiz.quiz_data?.passport?.scenarioDescription?.trim()
    || `Интерактивный сценарий «${quiz.name}», созданный в визуальном конструкторе Поток.`;
}

function formatDate(value?: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PublicScenarioPage({ quiz }: PublicScenarioPageProps) {
  const description = getDescription(quiz);
  const nodes = quiz.quiz_data?.nodes ?? [];
  const questionCount = nodes.filter((node) => typeof node.type === 'string' && questionTypes.has(node.type)).length;
  const author = quiz.quiz_data?.passport?.authors?.trim();
  const cover = quiz.quiz_data?.cover_image_url;
  const publishedAt = formatDate(quiz.published_at);

  useEffect(() => {
    const seoPage: SeoPage = {
      path: `/scenarios/${quiz.id}/`,
      kind: 'scenario',
      title: `${quiz.name} — интерактивный сценарий в Потоке`,
      description,
      heading: quiz.name,
      intro: description,
    };
    applySeoMetadata(seoPage);
  }, [description, quiz.id, quiz.name]);

  return (
    <div className="min-h-screen bg-[#f5efe3] text-stone-950">
      <header className="border-b border-stone-900/10 bg-[#fffaf0]/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-serif">П</span>
            <span className="text-xl">Поток</span>
          </Link>
          <Link to="/public" className="text-sm font-semibold text-stone-600 hover:text-stone-950">Все сценарии</Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-14 lg:py-20">
        <nav className="mb-8 flex items-center gap-2 text-sm text-stone-500" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link><span>/</span><Link to="/public">Сценарии</Link><span>/</span><span className="text-stone-800">{quiz.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
          <article>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">Публичный интерактивный сценарий</div>
            <h1 className="mt-5 font-serif text-[clamp(2.7rem,6vw,5.4rem)] font-bold leading-[0.98] tracking-[-0.04em]">{quiz.name}</h1>
            <p className="mt-7 max-w-3xl text-xl leading-relaxed text-stone-600">{description}</p>

            <dl className="mt-9 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-900/10 bg-white/55 p-5">
                <dt className="text-xs text-stone-500">Этапов</dt><dd className="mt-1 text-2xl font-bold">{nodes.length}</dd>
              </div>
              <div className="rounded-2xl border border-stone-900/10 bg-white/55 p-5">
                <dt className="text-xs text-stone-500">Заданий</dt><dd className="mt-1 text-2xl font-bold">{questionCount}</dd>
              </div>
              <div className="rounded-2xl border border-stone-900/10 bg-white/55 p-5">
                <dt className="text-xs text-stone-500">Опубликован</dt><dd className="mt-1 text-sm font-bold">{publishedAt || 'Недавно'}</dd>
              </div>
            </dl>

            {author && <p className="mt-6 text-sm text-stone-600"><strong className="text-stone-900">Автор:</strong> {author}</p>}

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/play/$quizId"
                params={{ quizId: quiz.id }}
                className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-4 font-bold shadow-lg shadow-amber-700/15 transition hover:-translate-y-0.5"
              >
                Запустить сценарий
              </Link>
              <Link to="/" search={{ authModal: 'open' }} className="rounded-full border border-stone-900/15 bg-white/55 px-7 py-4 font-semibold text-stone-700 hover:bg-white">
                Создать свой
              </Link>
            </div>
          </article>

          <aside className="overflow-hidden rounded-[2.5rem_0.9rem_2.5rem_0.9rem] border border-stone-900/10 bg-white/58 p-4 shadow-[0_30px_100px_rgba(120,53,15,0.14)]">
            {cover ? (
              <img src={cover} alt={`Обложка сценария «${quiz.name}»`} className="aspect-[16/10] w-full rounded-[2rem_0.7rem_2rem_0.7rem] object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center rounded-[2rem_0.7rem_2rem_0.7rem] bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.75),transparent_38%),linear-gradient(135deg,#292524,#57534e)] px-8 text-center font-serif text-3xl font-bold text-amber-50">
                {quiz.name}
              </div>
            )}
            <div className="p-5">
              <h2 className="text-lg font-bold">Как это работает</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">Отвечайте на вопросы и принимайте решения. Следующий этап может зависеть от ваших ответов, баллов и переменных сценария.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
