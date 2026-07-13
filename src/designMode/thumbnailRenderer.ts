import type { DesignSettings, QuizTemplateId } from '../../types';
import {
  DEFAULT_DESIGN_SETTINGS,
  getTemplateDesignBase,
  resolveDesign,
  type DeepPartial,
  type DesignBrandKit,
} from '../design/designResolver';

export interface DesignThumbnailInput {
  templateId: QuizTemplateId;
  stylePreset?: DeepPartial<DesignSettings>;
  brandKit?: DesignBrandKit;
  overrides?: DeepPartial<DesignSettings>;
}

export interface DesignThumbnailModel {
  templateId: QuizTemplateId;
  background: string;
  cardBackground: string;
  cardBorder: string;
  headingColor: string;
  bodyColor: string;
  buttonBackground: string;
  buttonText: string;
  answerBackground: string;
  answerBorder: string;
  progressColor: string;
  radius: number;
  fontFamily: string;
  displayFontFamily: string;
  mediaPosition: string;
}

export function createDesignThumbnailModel(input: DesignThumbnailInput): DesignThumbnailModel {
  const resolved = resolveDesign({
    defaults: DEFAULT_DESIGN_SETTINGS,
    template: getTemplateDesignBase(input.templateId),
    stylePreset: input.stylePreset,
    brandKit: input.brandKit,
    overrides: input.overrides,
  });
  const background = resolved.background.mode === 'gradient'
    ? `linear-gradient(135deg, ${resolved.background.gradientFrom || resolved.background.color}, ${resolved.background.gradientTo || resolved.background.color})`
    : resolved.background.color;

  return {
    templateId: input.templateId,
    background,
    cardBackground: resolved.questionCard?.backgroundColor ?? '#ffffff',
    cardBorder: resolved.questionCard?.borderColor ?? '#d4d4d8',
    headingColor: resolved.typography.headingColor,
    bodyColor: resolved.typography.bodyTextColor,
    buttonBackground: resolved.buttons.backgroundColor,
    buttonText: resolved.buttons.textColor,
    answerBackground: resolved.answerCards.backgroundColor,
    answerBorder: resolved.answerCards.borderColor ?? resolved.answerCards.selectedBorderColor ?? resolved.buttons.backgroundColor,
    progressColor: resolved.progress?.color ?? resolved.buttons.backgroundColor,
    radius: resolved.questionCard?.radius ?? resolved.layout?.cardRadius ?? 18,
    fontFamily: resolved.typography.fontFamily,
    displayFontFamily: resolved.typography.displayFontFamily ?? resolved.typography.fontFamily,
    mediaPosition: resolved.questionCard?.mediaPosition ?? resolved.layout?.mediaPosition ?? 'top',
  };
}
