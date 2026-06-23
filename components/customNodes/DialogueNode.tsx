
import React from 'react';
import BaseNode from './BaseNode.tsx';
import { DialogueNodeData } from '../../types.ts';
import { parseMarkdown } from '../../utils/parseText.ts';

type NodeProps<T = any> = any;

const MOOD_LABELS: Record<string, string> = {
  neutral: 'Нейтральный',
  excited: 'Восторженный',
  serious: 'Серьёзный',
  sad: 'Печальный',
  mysterious: 'Таинственный',
};

const MOOD_COLORS: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  excited: 'bg-yellow-100 text-yellow-700',
  serious: 'bg-blue-100 text-blue-700',
  sad: 'bg-indigo-100 text-indigo-700',
  mysterious: 'bg-purple-100 text-purple-700',
};

const DialogueNode: React.FC<NodeProps<DialogueNodeData>> = (props) => {
  const { data } = props;
  const { characterName, characterRole, characterAvatar, dialogueText, mood } = data;

  const Icon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  return (
    <BaseNode title="Диалог" icon={Icon} nodeProps={props} color="orange">
      <div className="flex gap-3 items-start">
        {characterAvatar && (
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-orange-200">
            <img
              src={characterAvatar}
              alt={characterName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-orange-800 truncate">
            {characterName || 'Персонаж'}
          </div>
          {characterRole && (
            <div className="text-xs text-orange-500 truncate">
              {characterRole}
            </div>
          )}
        </div>
        {mood && mood !== 'neutral' && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${MOOD_COLORS[mood] || ''}`}>
            {MOOD_LABELS[mood]}
          </span>
        )}
      </div>
      {dialogueText && (
        <div className="mt-2 text-gray-600 text-xs line-clamp-3 italic border-l-2 border-orange-200 pl-2 prose prose-sm max-w-none prose-p:my-0" 
          dangerouslySetInnerHTML={{ __html: parseMarkdown(dialogueText) }}
        />
      )}
    </BaseNode>
  );
};

export default React.memo(DialogueNode);
