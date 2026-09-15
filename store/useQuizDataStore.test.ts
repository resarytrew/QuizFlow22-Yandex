import {api} from '../services/apiClient';
import {useAuthStore} from './useAuthStore';
import type {PublicQuiz} from '../types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quiz } from '../types';
import { useQuizDataStore } from './useQuizDataStore';

describe('useQuizDataStore quiz settings compatibility', () => {
  beforeEach(() => {
    useQuizDataStore.getState().reset();
  });

  it('merges partial legacy design settings with current defaults', () => {
    const quiz = {
      id: 'quiz-1',
      user_id: 'user-1',
      name: 'Legacy quiz',
      created_at: '',
      updated_at: '',
      visibility: 'private',
      quiz_data: {
        nodes: [],
        edges: [],
        designSettings: {
          background: { color: '#abcdef' },
        },
        globalTimer: { enabled: true },
        templateId: 'science',
      },
    } as unknown as Quiz;

    useQuizDataStore.getState().loadQuiz(quiz);

    const state = useQuizDataStore.getState();
    expect(state.designSettings.background.color).toBe('#abcdef');
    expect(state.designSettings.background.overlayOpacity).toBe(0);
    expect(state.designSettings.buttons.backgroundColor).toBe('#2f5d50');
    expect(state.designSettings.answerCards.borderRadius).toBe(18);
    expect(state.designSettings.sound.volume).toBe(0.5);
    expect(state.globalTimer).toEqual({
      enabled: true,
      duration: 0,
      onTimeoutNodeId: null,
    });
  });

  it('falls back to the default template for invalid database values', () => {
    const quiz = {
      id: 'quiz-2',
      user_id: 'user-1',
      name: 'Invalid template',
      created_at: '',
      updated_at: '',
      quiz_data: {
        nodes: [],
        edges: [],
        templateId: 'unknown-template',
      },
    } as unknown as Quiz;

    useQuizDataStore.getState().loadQuiz(quiz);
    expect(useQuizDataStore.getState().templateId).toBe('default');
  });
});

it('fetches the full source before copying a gallery summary',async()=>{
 const state=useAuthStore.getState();
 const auth=vi.spyOn(useAuthStore,'getState').mockReturnValue({...state,session:{user:{id:'test-user'}}} as ReturnType<typeof useAuthStore.getState>);
 const full={id:'source',name:'Source',visibility:'public',is_favorite:false,created_at:'',updated_at:'',quiz_data:{nodes:[],edges:[],templateId:'default',description:'Full content',globalTimer:useQuizDataStore.getState().globalTimer,designSettings:useQuizDataStore.getState().designSettings}};
 const get=vi.spyOn(api,'getQuiz').mockResolvedValue(full as Awaited<ReturnType<typeof api.getQuiz>>);
 const create=vi.spyOn(api,'createQuiz').mockResolvedValue({...full,id:'copy'} as Awaited<ReturnType<typeof api.createQuiz>>);
 try{
  await useQuizDataStore.getState().cloneAndEditPublicQuiz({id:'source',name:'Source',is_summary:true,quiz_data:{nodes:[],edges:[]}} as unknown as PublicQuiz);
  expect(get).toHaveBeenCalledWith('source');
  expect(create).toHaveBeenCalledWith(expect.objectContaining({quiz_data:full.quiz_data,visibility:'private'}));
 }finally{auth.mockRestore();get.mockRestore();create.mockRestore();}
});

it('keeps pending public quizzes unpublished in the user list', async () => {
  const { createQuizSummary } = await import('./useQuizDataStore');
  const row = { id: 'pending', name: 'Pending', created_at: '', updated_at: '', visibility: 'public' };
  expect(createQuizSummary({ ...row, moderation_status: 'unreviewed' }).is_published).toBe(false);
  expect(createQuizSummary({ ...row, moderation_status: 'approved' }).is_published).toBe(true);
  expect(createQuizSummary(row).is_published).toBe(false);
});
