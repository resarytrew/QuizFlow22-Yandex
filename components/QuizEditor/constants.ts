import { CustomNodeType } from '../../types';
import type { FitViewOptions } from 'reactflow';

export const DS = {
    colors: {
        primary: '#6366f1',
        primaryHover: '#818cf8',
        edge: '#94a3b8',
        edgeActive: '#6366f1',
        grid: '#e2e8f0',
        canvasBg: '#f8fafc',
    },
    nodeColors: {
        [CustomNodeType.Start]: '#22c55e',
        [CustomNodeType.Question]: '#6366f1',
        [CustomNodeType.MultipleChoice]: '#a855f7',
        [CustomNodeType.Result]: '#10b981',
        [CustomNodeType.Info]: '#64748b',
        [CustomNodeType.Condition]: '#f97316',
        [CustomNodeType.Score]: '#eab308',
        [CustomNodeType.Variable]: '#f59e0b',
        [CustomNodeType.Formula]: '#ec4899',
        [CustomNodeType.Timeline]: '#f59e0b',
        [CustomNodeType.Matching]: '#14b8a6',
        [CustomNodeType.TextInput]: '#8b5cf6',
        [CustomNodeType.Achievement]: '#fbbf24',
        [CustomNodeType.CollectInfo]: '#06b6d4',
        [CustomNodeType.Feedback]: '#f472b6',
        [CustomNodeType.Timer]: '#818cf8',
        [CustomNodeType.GoTo]: '#94a3b8',
        [CustomNodeType.Group]: '#475569',
        [CustomNodeType.Allocator]: '#2dd4bf',
        [CustomNodeType.Progression]: '#a855f7',
        [CustomNodeType.Dialogue]: '#f97316',
    } as Record<CustomNodeType, string>,
};

export const ZOOM = {
    MIN: 0.1,
    MAX: 2,
    DEFAULT: 1,
    FIT_MAX: 1,
};

export const DEFAULT_W = 208;
export const DEFAULT_H = 150;

export const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.2,
  maxZoom: ZOOM.FIT_MAX,
};

