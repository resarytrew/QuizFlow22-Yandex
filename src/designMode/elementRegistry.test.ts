import { describe, expect, it } from 'vitest';
import {
  DESIGN_ELEMENT_REGISTRY,
  DESIGN_ELEMENT_ROLES,
  getDesignElementEntry,
  isDesignElementRole,
  sanitizeDesignElementId,
} from './elementRegistry';

describe('design element registry', () => {
  it('contains every supported semantic role', () => {
    expect(DESIGN_ELEMENT_ROLES).toContain('question-card');
    expect(DESIGN_ELEMENT_ROLES).toContain('answer-card');
    expect(DESIGN_ELEMENT_ROLES).toContain('result-action');
    expect(Object.keys(DESIGN_ELEMENT_REGISTRY)).toHaveLength(DESIGN_ELEMENT_ROLES.length);
  });

  it('describes editable capabilities for roles', () => {
    const answer = getDesignElementEntry('answer-card');
    expect(answer.label).toBe('Карточка ответа');
    expect(answer.resizable).toBe(true);
    expect(answer.required).toBe(false);
    expect(answer.properties).toContain('radius');
  });

  it('validates role and serialized element ids', () => {
    expect(isDesignElementRole('question-title')).toBe(true);
    expect(isDesignElementRole('questionTitle')).toBe(false);
    expect(sanitizeDesignElementId('answer-card:a1')).toBe('answer-card:a1');
    expect(sanitizeDesignElementId('answer card')).toBeNull();
    expect(sanitizeDesignElementId('<script>')).toBeNull();
  });
});
