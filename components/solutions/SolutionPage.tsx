import { Link } from '@tanstack/react-router';
import type { SeoPage } from '../../src/seo/seoCatalog';
import { solutionPages } from '../../src/seo/seoCatalog';

interface SolutionPageProps {
  page: SeoPage;
}

const capabilityCards = [
  ['Визуальный граф', 'Размещайте этапы на холсте и сразу видьте весь маршрут человека.'],
  ['Условия и переменные', 'Меняйте дальнейшие шаги в зависимости от ответов и накопленного состояния.'],
  ['Формулы и баллы', 'Рассчитывайте стоимость, уровень, категорию или персональный результат.'],
  ['Сбор информации', 'Добавляйте формы и используйте введённые данные в следующих экранах.'],
  ['Оформление', 'Настраивайте фон, цвета, типографику и визуальный стиль сценария.'],
  ['Публикация', 'Делитесь ссылкой или экспортируйте автономную HTML-версию.'],
] as const;

export default function SolutionPage({ page }: SolutionPageProps) {
  return (
    <div className="min-h-screen bg-[#f5efe3] text-stone-950">
      <header className="border-b border-stone-900/10 bg-[#fffaf0]/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-serif text-lg">П</span>
            <span className="text-xl">Поток</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex" aria-label="Основная навигация">
            <Link to="/templates">Шаблоны</Link>
            <Link to="/docs">Документация</Link>
            <Link to="/public">Примеры</Link>
          </nav>
          <Link
            to="/"
            search={{ authModal: 'open' }}
            className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-amber-50 transition hover:bg-stone-800"
          >
            {page.cta ?? 'Создать сценарий'}
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-stone-900/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(251,191,36,0.24),transparent_36%),radial-gradient(circle_at_90%_70%,rgba(244,63,94,0.10),transparent_34%)]" />
          <div className="container relative mx-auto grid gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
            <div>
              <div className="mb-6 text-xs font-bold uppercase tracking-[0.24em] text-amber-800">{page.eyebrow}</div>
              <h1 className="max-w-4xl font-serif text-[clamp(2.6rem,6vw,5.4rem)] font-bold leading-[0.98] tracking-[-0.045em]">
                {page.heading}
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-relaxed text-stone-600">{page.intro}</p>
              {page.audience && <p className="mt-5 max-w-2xl text-sm font-semibold text-stone-700">Подходит: {page.audience}</p>}
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/"
                  search={{ authModal: 'open' }}
                  className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-4 font-bold text-stone-950 shadow-lg shadow-amber-700/15 transition hover:-translate-y-0.5"
                >
                  {page.cta ?? 'Создать сценарий'}
                </Link>
                <Link to="/public" className="rounded-full border border-stone-900/15 bg-white/55 px-7 py-4 font-semibold text-stone-700 transition hover:bg-white">
                  Посмотреть примеры
                </Link>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-stone-900/10 bg-white/58 p-6 shadow-[0_30px_100px_rgba(120,53,15,0.14)]">
              <div className="mb-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
                <span>Логика сценария</span><span className="text-emerald-700">● готово без кода</span>
              </div>
              <div className="space-y-4">
                {['Вводные данные', 'Условие или расчёт', 'Персональный результат'].map((label, index) => (
                  <div key={label} className="relative rounded-2xl border border-stone-900/10 bg-[#fffaf0] p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">0{index + 1}</div>
                    <div className="mt-1 text-lg font-bold">{label}</div>
                    {index < 2 && <div className="absolute -bottom-5 left-1/2 h-5 w-px bg-amber-700/35" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-800">Use cases</div>
            <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">Где использовать этот сценарий</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {(page.useCases ?? []).map((useCase, index) => (
              <article key={useCase} className="rounded-3xl border border-stone-900/10 bg-white/55 p-7">
                <div className="font-mono text-sm font-bold text-amber-800">0{index + 1}</div>
                <h3 className="mt-5 text-xl font-bold leading-tight">{useCase}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-800">Результат</div>
            <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">Что даёт такой сценарий</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {(page.benefits ?? []).map((benefit, index) => (
              <article key={benefit} className="rounded-3xl border border-stone-900/10 bg-white/55 p-7">
                <div className="font-mono text-sm font-bold text-amber-800">0{index + 1}</div>
                <h3 className="mt-5 text-xl font-bold leading-tight">{benefit}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-stone-900/10 bg-white/50">
          <div className="container mx-auto px-6 py-20">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-800">Шаблоны</div>
              <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">С чего начать быстрее</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(page.templates ?? []).map((template) => (
                <article key={template} className="rounded-2xl border border-stone-900/10 bg-[#fffaf0] p-6">
                  <h3 className="text-lg font-bold">{template}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Готовая структура, которую можно адаптировать под свой контент, дизайн и маршрут.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-stone-900/10 bg-[#fffaf0]/70">
          <div className="container mx-auto px-6 py-20">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-800">Возможности платформы</div>
              <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">Один движок для разных задач</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilityCards.map(([title, description]) => (
                <article key={title} className="rounded-3xl border border-stone-900/10 bg-white/65 p-7">
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-3 leading-relaxed text-stone-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <h2 className="font-serif text-4xl font-bold">Другие сценарии</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {solutionPages.filter((item) => item.path !== page.path).slice(0, 4).map((item) => (
              <a
                key={item.slug}
                href={item.path}
                className="rounded-2xl border border-stone-900/10 bg-white/48 p-5 transition hover:-translate-y-1 hover:bg-white/75"
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">{item.eyebrow}</div>
                <div className="mt-2 font-bold leading-tight">{item.heading}</div>
              </a>
            ))}
          </div>
        </section>

        {page.faq?.length ? (
          <section className="border-t border-stone-900/10 bg-[#fffaf0]/70">
            <div className="container mx-auto px-6 py-20">
              <div className="max-w-3xl">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-800">FAQ</div>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">Частые вопросы</h2>
              </div>
              <div className="mt-10 grid gap-4 lg:grid-cols-3">
                {page.faq.map((item) => (
                  <article key={item.question} className="rounded-3xl border border-stone-900/10 bg-white/70 p-7">
                    <h3 className="text-lg font-bold">{item.question}</h3>
                    <p className="mt-3 leading-relaxed text-stone-600">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-stone-900/10 px-6 py-8 text-center text-sm text-stone-500">
        © 2026 Поток · Конструктор интерактивных сценариев
      </footer>
    </div>
  );
}
