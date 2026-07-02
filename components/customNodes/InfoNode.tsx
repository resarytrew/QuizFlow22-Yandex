
import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode.tsx';
import { InfoNodeData } from '../../types.ts';
import { getRutubeId, getRutubeEmbedUrl } from '../../utils/videoUtils.ts';
import { parseMarkdown } from '../../utils/parseText.ts';

const InfoNode: React.FC<NodeProps<InfoNodeData>> = (props) => {
  const { data } = props;
  const { title, videoUrl } = data;
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const rutubeId = getRutubeId(videoUrl || '');
  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

  return (
    <>
    <BaseNode title="Информация" icon={Icon} nodeProps={props} color="gray">
        {/* Video Preview Facade */}
        {rutubeId && (
            <div 
                className="relative mb-3 group/video cursor-pointer overflow-hidden rounded-xl bg-slate-900 aspect-video flex items-center justify-center border-2 border-slate-200/80 hover:border-rose-400 transition-colors"
                onClick={() => setIsVideoModalOpen(true)}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
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

        <div className="text-gray-800 text-sm truncate font-medium" title={title}>{title || 'Заголовок...'}</div>
        <div className="text-gray-500 text-xs mt-1 truncate prose prose-sm max-w-none prose-p:my-0" title={data.description} dangerouslySetInnerHTML={{ __html: parseMarkdown(data.description || 'Нет описания') }} />
    </BaseNode>

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

export default React.memo(InfoNode);
