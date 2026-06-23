import React, { useState } from 'react';
import { PublicQuiz } from '../../types.ts';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import GalleryCard from '../ui/GalleryCard.tsx';

interface Props {
  quiz: PublicQuiz;
}

const fallbackCovers = [
  'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559757175-5700dde675bc?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
];

const templateLabels: Record<string, string> = {
  default: 'Классический', ww2: 'ВОВ', economic: 'Экономика', yandex: 'Яндекс',
  army: 'Армия', science: 'Наука', math: 'Математика', history: 'История', newyear: 'Новый год',
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

const PublicQuizCard: React.FC<Props> = ({ quiz }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const session = useAuthStore(s => s.session);
  const setAuthModalOpen = useUIStore(s => s.setAuthModalOpen);
  const cloneAndEditPublicQuiz = useQuizDataStore(s => s.cloneAndEditPublicQuiz);

  const getPlayUrl = (quizId: string) => {
    // See ShareModal.tsx for why ?play=<id> is preferred over #/play/<id>.
    const url = new URL(window.location.origin);
    url.pathname = '/play.html';
    url.search = `?play=${encodeURIComponent(quizId)}`;
    url.hash = '';
    return url.toString();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      setAuthModalOpen(true);
      return;
    }
    cloneAndEditPublicQuiz(quiz);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const description = quiz.quiz_data?.description || '';
  const hasCustomCover = !!quiz.quiz_data?.cover_image_url;
  const coverImageUrl = quiz.quiz_data?.cover_image_url || fallbackCovers[hashStr(quiz.name || 'quiz') % fallbackCovers.length];

  const nodes = quiz.quiz_data?.nodes || [];
  const questionCount = nodes.filter((n: any) =>
    ['questionNode', 'multipleChoiceNode', 'textInputNode', 'matchingNode', 'timelineNode'].includes(n.type)
  ).length;
  const hasTimer = !!quiz.quiz_data?.globalTimer?.enabled;
  const timerMinutes = quiz.quiz_data?.globalTimer?.duration
    ? Math.round(quiz.quiz_data.globalTimer.duration / 60)
    : 0;
  const author = quiz.quiz_data?.passport?.authors?.trim() || null;
  const templateId = quiz.quiz_data?.templateId as string | undefined;
  const publishedDate = formatDate(quiz.published_at);

  return (
    <GalleryCard className="flex flex-col h-full">
      <a
        href={getPlayUrl(quiz.id)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="relative block overflow-hidden shrink-0"
      >
        <div className="aspect-[4/3] relative bg-gray-50">
          <div className={`absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-violet-100/50 transition-opacity duration-500 pointer-events-none ${!hasCustomCover || imageLoaded ? 'opacity-0' : 'opacity-100'}`} />
          <img
            src={coverImageUrl}
            alt={quiz.name}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => { setImageError(true); setImageLoaded(true); }}
          />
        </div>

        {/* Floating play button */}
        <div className="absolute bottom-2 right-2">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900/85 hover:bg-gray-900 text-white text-[11px] font-semibold rounded-lg backdrop-blur-sm shadow-lg cursor-pointer transition-all duration-200 hover:scale-105">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Пройти
          </span>
        </div>
      </a>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-[13px] font-semibold text-gray-900 leading-snug">
            {quiz.name}
          </h3>
          {publishedDate && (
            <span className="shrink-0 text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{publishedDate}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {questionCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {questionCount}
            </span>
          )}
          {hasTimer && timerMinutes > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timerMinutes} мин
            </span>
          )}
          {templateId && templateLabels[templateId] && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-indigo-600 bg-indigo-50">
              {templateLabels[templateId]}
            </span>
          )}
        </div>

        {description && (
          <div>
            <p className={`text-[11px] text-gray-400 leading-relaxed ${descExpanded ? '' : 'line-clamp-2'}`}>
              {description}
            </p>
            {description.length > 100 && (
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors mt-0.5"
              >
                {descExpanded ? 'Свернуть' : 'Развернуть'}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-0.5 mt-auto">
          {author ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-[8px] font-bold text-indigo-500 shrink-0" style={{ width: 18, height: 18 }}>
                {author.charAt(0).toUpperCase()}
              </div>
              <span className="text-[11px] text-gray-400 truncate">{author}</span>
            </div>
          ) : (
            <div />
          )}
          <button
            onClick={handleCopy}
            className={`shrink-0 text-[10px] font-medium transition-all duration-200 ${
              copied
                ? 'text-emerald-600 scale-105'
                : 'text-gray-400 hover:text-indigo-600'
            }`}
            title="Копировать в редактор"
          >
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>
      </div>
    </GalleryCard>
  );
};

export default React.memo(PublicQuizCard);
