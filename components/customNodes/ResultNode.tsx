
import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { ResultNodeData } from '../../types';
import { getRutubeId, getRutubeEmbedUrl } from '../../utils/videoUtils';

const ResultNode: React.FC<NodeProps<ResultNodeData>> = (props) => {
  const { data } = props;
  const { title, imageUrl, videoUrl } = data;
  const [isZoomed, setIsZoomed] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  const rutubeId = getRutubeId(videoUrl || '');
  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

  return (
    <>
        <BaseNode title="Результат" icon={Icon} nodeProps={props} hasOutput={false} color="green">
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

            {imageUrl && !rutubeId && (
                <div className="mb-2 p-1 bg-gray-100 rounded-md">
                    <img
                        src={imageUrl}
                        alt="Node content"
                        className="w-full h-auto object-cover rounded-md cursor-pointer"
                        onClick={() => setIsZoomed(true)}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                </div>
            )}
            <div className="text-gray-800 text-sm truncate font-medium" title={title}>{title}</div>
            <div className="text-gray-500 text-xs mt-1 truncate" title={data.description}>{data.description || 'Нет описания'}</div>
        </BaseNode>
        
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

export default React.memo(ResultNode);
