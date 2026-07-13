import React from 'react';
import type { DesignSettings, QuizTemplateId } from '../../types';
import type { DeepPartial, DesignBrandKit } from '../../src/design/designResolver';
import { createDesignThumbnailModel } from '../../src/designMode/thumbnailRenderer';

interface DesignThumbnailProps {
  templateId: QuizTemplateId;
  stylePreset?: DeepPartial<DesignSettings>;
  brandKit?: DesignBrandKit;
  overrides?: DeepPartial<DesignSettings>;
  label?: string;
}

const DesignThumbnail: React.FC<DesignThumbnailProps> = ({
  templateId,
  stylePreset,
  brandKit,
  overrides,
  label = 'Дизайн',
}) => {
  const model = createDesignThumbnailModel({ templateId, stylePreset, brandKit, overrides });

  return (
    <div
      aria-label={`Миниатюра: ${label}`}
      className="overflow-hidden rounded-xl border border-slate-200 shadow-sm"
      style={{
        background: model.background,
        fontFamily: model.fontFamily,
      }}
    >
      <div className="p-3">
        <div
          className="space-y-2 border p-3"
          style={{
            background: model.cardBackground,
            borderColor: model.cardBorder,
            borderRadius: Math.min(22, model.radius),
          }}
        >
          <div className="h-1.5 w-20 rounded-full" style={{ background: model.progressColor }} />
          <div
            className="h-4 w-28 rounded"
            style={{ background: model.headingColor, opacity: 0.9 }}
          />
          <div className="flex gap-2">
            <div
              className="h-10 flex-1 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${model.progressColor}, ${model.buttonBackground})`,
                opacity: 0.24,
              }}
            />
            <div className="flex flex-[1.25] flex-col gap-1.5">
              <div className="h-3 rounded" style={{ background: model.bodyColor, opacity: 0.35 }} />
              <div className="h-3 w-2/3 rounded" style={{ background: model.bodyColor, opacity: 0.22 }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-6 rounded-md border"
                style={{
                  background: model.answerBackground,
                  borderColor: index === 1 ? model.progressColor : model.answerBorder,
                }}
              />
            ))}
          </div>
          <div
            className="grid h-7 place-items-center rounded-md text-[9px] font-black"
            style={{ background: model.buttonBackground, color: model.buttonText }}
          >
            CTA
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignThumbnail;
