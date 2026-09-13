
import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { Answer, QuestionNodeData } from '../../types';
import { getRutubeId, getRutubeEmbedUrl } from '../../utils/videoUtils';

const ANSWER_COLORS = [
    { bg: 'bg-blue-50/80', border: 'border-blue-200/60', text: 'text-blue-700', hover: 'hover:bg-blue-100/80 hover:border-blue-300', handle: 'bg-gradient-to-br from-blue-400 to-blue-600' },
    { bg: 'bg-emerald-50/80', border: 'border-emerald-200/60', text: 'text-emerald-700', hover: 'hover:bg-emerald-100/80 hover:border-emerald-300', handle: 'bg-gradient-to-br from-emerald-400 to-emerald-600' },
    { bg: 'bg-purple-50/80', border: 'border-purple-200/60', text: 'text-purple-700', hover: 'hover:bg-purple-100/80 hover:border-purple-300', handle: 'bg-gradient-to-br from-purple-400 to-purple-600' },
    { bg: 'bg-amber-50/80', border: 'border-amber-200/60', text: 'text-amber-700', hover: 'hover:bg-amber-100/80 hover:border-amber-300', handle: 'bg-gradient-to-br from-amber-400 to-amber-600' },
];

const QUESTION_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);

const formatDuration = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return '0 сек';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const parts = [];
    if (mins > 0) parts.push(`${mins} мин`);
    if (secs > 0) parts.push(`${secs} сек`);
    return parts.join(' ');
};

const QuestionNode: React.FC<NodeProps<QuestionNodeData>> = (props) => {
  const { data, selected } = props;
  const { question, answers = [], timer, imageUrl, videoUrl } = data;
  const [isZoomed, setIsZoomed] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const rutubeId = getRutubeId(videoUrl || '');

  return (
    <>
      <BaseNode title="Вопрос" icon={QUESTION_ICON} nodeProps={props} hasOutput={false} color="blue">
        {/* Video Preview Facade */}
        {rutubeId && (
            <div 
                className="relative mb-3 group/video cursor-pointer overflow-hidden rounded-xl bg-slate-900 aspect-video flex items-center justify-center border-2 border-slate-200/80 hover:border-rose-400 transition-colors"
                onClick={() => setIsVideoModalOpen(true)}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                
                {/* Play Button */}
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover/video:scale-110 transition-transform z-20">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-rose-600 ml-1">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
                
                <div className="absolute bottom-2 left-3 z-20 flex items-center gap-2">
                     <div className="w-4 h-4 bg-rose-600 rounded flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                     </div>
                     <span className="text-white text-xs font-bold">RuTube</span>
                </div>
            </div>
        )}

        {/* Image Preview with Enhanced Design */}
        {imageUrl && !rutubeId && (
          <div 
            className="relative mb-3 group/image cursor-pointer overflow-hidden rounded-xl"
            onClick={() => setIsZoomed(true)}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"></div>
            
            {/* Image */}
            <img
              src={imageUrl}
              alt="Question content"
              className="w-full h-32 object-cover rounded-xl border-2 border-slate-200/80 transition-all duration-300 group-hover/image:scale-105 group-hover/image:border-blue-300"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            
            {/* Zoom indicator */}
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover/image:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/image:translate-y-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              <span className="text-xs font-semibold text-slate-700">Увеличить</span>
            </div>
          </div>
        )}

        {/* Question Text */}
        <div className="relative mb-4 p-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-100/50">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-50 rounded-l-xl"></div>
          <p className="text-slate-800 text-sm font-semibold leading-relaxed pl-2" title={question}>
            {question}
          </p>
        </div>

        {/* Answers Section */}
        <div className="space-y-2 mb-3">
          {answers.map((ans: Answer, index: number) => {
            const colorScheme = ANSWER_COLORS[index % ANSWER_COLORS.length];

            return (
              <div 
                key={ans.id} 
                className={`
                  group/answer relative flex items-center justify-between 
                  ${ans.isCorrect ? 'bg-green-50/90 border-green-300/80 hover:bg-green-100/90' : `${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover}`}
                  p-3 rounded-xl border-2 
                  transition-all duration-300 ease-out
                  hover:shadow-md hover:-translate-y-0.5
                `}
              >
                {/* Answer letter badge */}
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-lg 
                  ${colorScheme.handle}
                  flex items-center justify-center 
                  text-white text-xs font-bold
                  shadow-sm
                `}>
                  {String.fromCharCode(65 + index)}
                </div>

                {/* Answer text */}
                <div className={`flex-1 ${colorScheme.text} text-sm font-medium ml-2.5 truncate`} title={ans.text}>
                  {ans.text}
                </div>

                {ans.isCorrect && (
                  <div className="mr-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    верно
                  </div>
                )}

                {/* Connection Handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={ans.id}
                  style={{ right: '-32px' }}
                  className={`
                    !w-4 !h-4 !border-[3px] !border-white 
                    ${colorScheme.handle}
                    !rounded-full !shadow-lg
                    transition-all duration-300
                    group-hover/answer:!scale-125 group-hover/answer:!shadow-xl
                    ${selected ? '!ring-2 !ring-white !ring-offset-2 !ring-offset-blue-400' : ''}
                  `}
                >
                  {/* Pulse effect for selected */}
                  {selected && (
                    <div className={`absolute inset-0 ${colorScheme.handle} rounded-full animate-ping opacity-75`}></div>
                  )}
                </Handle>

                {/* Hover arrow indicator */}
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/answer:opacity-100 group-hover/answer:-right-2 transition-all duration-300 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={colorScheme.text}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timer Section with Enhanced Design */}
        {timer && timer > 0 && (
          <div className="relative mt-4">
            {/* Timer info box */}
            <div className="relative overflow-hidden bg-gradient-to-br from-rose-50/90 to-red-50/90 border-2 border-rose-200/60 rounded-xl p-3 shadow-sm">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-400 rounded-full blur-2xl"></div>
              </div>

              <div className="relative flex items-center justify-between">
                {/* Timer icon and text */}
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    {/* Animated ring */}
                    <svg className="absolute inset-0 w-8 h-8 -rotate-90">
                      <circle 
                        cx="16" 
                        cy="16" 
                        r="14" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        className="text-rose-200"
                      />
                      <circle 
                        cx="16" 
                        cy="16" 
                        r="14" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeDasharray="88" 
                        strokeDashoffset="22"
                        className="text-rose-500 animate-pulse"
                      />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 relative z-10">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-rose-700">
                      {formatDuration(timer)}
                    </span>
                    <span className="text-[10px] text-rose-500 font-medium">
                      на ответ
                    </span>
                  </div>
                </div>

                {/* Timeout badge */}
                <div className="flex items-center gap-1.5 bg-red-100/80 px-2.5 py-1 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">
                    Timeout
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-400 via-red-500 to-rose-600 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
            </div>

            {/* Enhanced Timeout Handle */}
            <Handle
              type="source"
              position={Position.Bottom}
              id="timeout"
              style={{ bottom: '-32px' }}
              className={`
                !w-5 !h-5 !border-[3px] !border-white 
                !bg-gradient-to-br !from-red-400 !to-red-600
                !rounded-full !shadow-lg !shadow-red-500/50
                transition-all duration-300
                hover:!scale-125 hover:!shadow-xl hover:!shadow-red-500/60
                ${selected ? '!ring-2 !ring-white !ring-offset-2 !ring-offset-red-400' : ''}
              `}
            >
              {/* Pulse effect */}
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
              
              {/* Inner icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </Handle>
          </div>
        )}
      </BaseNode>
      
      {/* Zoom Image Modal */}
      {isZoomed && imageUrl && !rutubeId && (
        <div 
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={imageUrl} 
            alt="Node content zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video Modal */}
      {isVideoModalOpen && rutubeId && (
         <div 
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setIsVideoModalOpen(false)}
        >
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                 <button 
                    onClick={() => setIsVideoModalOpen(false)}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl font-bold"
                >
                    &times;
                </button>
                 <iframe 
                    src={getRutubeEmbedUrl(rutubeId)} 
                    frameBorder="0" 
                    allow="clipboard-write; autoplay" 
                    allowFullScreen 
                    className="w-full h-full"
                ></iframe>
            </div>
        </div>
      )}
    </>
  );
};

export default React.memo(QuestionNode);
