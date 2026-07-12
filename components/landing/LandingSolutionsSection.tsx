import { Link } from '@tanstack/react-router';
import { solutionPages } from '../../src/seo/seoCatalog';

const featuredSlugs = [
  'business-brief',
  'product-finder',
  'employee-assessment',
  'interactive-learning',
  'lead-qualification',
  'branching-scenarios',
];

export default function LandingSolutionsSection() {
  const featured = featuredSlugs
    .map((slug) => solutionPages.find((page) => page.slug === slug))
    .filter((page): page is (typeof solutionPages)[number] => Boolean(page));

  return (
    <section id="solutions" className="scroll-mt-24 border-y border-stone-900/10 bg-[#fffaf0]/58 py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-800/70">Что можно создать</div>
            <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight text-stone-950">
              Один редактор — разные задачи бизнеса и образования
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-stone-600 lg:ml-auto">
            Начните с готовой задачи: соберите бриф, подборщик, аттестацию, квалификацию заявки или интерактивный урок, а затем измените логику под себя.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((page, index) => (
            <Link
              key={page.slug}
              to="/solutions/$solutionId"
              params={{ solutionId: page.slug }}
              className="group relative min-h-[250px] overflow-hidden rounded-[2rem_0.8rem_2rem_0.8rem] border border-stone-900/10 bg-white/65 p-7 shadow-[0_18px_55px_rgba(120,53,15,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-amber-800/25 hover:bg-white"
            >
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-300/20 blur-3xl transition group-hover:bg-orange-300/30" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-800">0{index + 1}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">{page.eyebrow}</span>
                </div>
                <h3 className="mt-10 font-serif text-2xl font-bold leading-tight text-stone-950">{page.heading}</h3>
                <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-stone-600">{page.intro}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-800">
                  Подробнее <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
