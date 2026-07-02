import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { DS } from './constants';
import { shouldAnimateEdges } from './performanceMode';

export const FlowEdge: React.FC<EdgeProps> = React.memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
    selected,
    data,
}) => {
    const edgeAnimations = usePreferencesStore((state) => state.preferences.edgeAnimations);
    const reduceMotion = usePreferencesStore((state) => state.preferences.reduceMotion);
    const simplified = usePreferencesStore((state) => state.preferences.simplified);
    const animateEdge = shouldAnimateEdges({ edgeAnimations, reduceMotion, simplified });
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.25,
    });

    const edgeLabel = data?.label !== undefined ? data.label : label;

    const glowStyle = React.useMemo(() => ({
        strokeWidth: selected ? 12 : 0,
        stroke: DS.colors.primary,
        opacity: 0.1,
        filter: 'blur(4px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }), [selected]);

    const pathStyle = React.useMemo(() => ({
        strokeWidth: selected ? 2.5 : 1.5,
        stroke: selected ? DS.colors.edgeActive : DS.colors.edge,
        transition: 'all 0.2s ease',
        ...style,
    }), [selected, style]);

    const labelContainerStyle = React.useMemo(() => ({
        position: 'absolute' as const,
        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
        pointerEvents: 'all' as const,
    }), [labelX, labelY]);

    return (
        <>
            <BaseEdge
                id={`${id}-glow`}
                path={edgePath}
                style={glowStyle}
            />
            <path
                id={id}
                d={edgePath}
                fill="none"
                markerEnd={markerEnd}
                className="flow-edge-path"
                style={pathStyle}
            />
            {animateEdge && (
                <circle r="4" fill={DS.colors.primary} className="flow-edge-dot">
                    <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
                    <animate attributeName="opacity" values="0;0.8;0.8;0" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
                </circle>
            )}
            {edgeLabel && (
                <EdgeLabelRenderer>
                    <div
                        style={labelContainerStyle}
                    >
                        <div
                            className={`
                                px-2.5 py-1 text-xs font-medium rounded-full
                                backdrop-blur-sm border transition-all duration-200
                                ${selected
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-md'
                                    : 'bg-white/90 border-gray-200 text-gray-600 shadow-sm'
                                }
                            `}
                        >
                            {edgeLabel}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
});

export const edgeTypes = { default: FlowEdge };
