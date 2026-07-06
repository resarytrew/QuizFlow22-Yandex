import React from 'react';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { RangeInput } from '../ui/RangeInput';
import { UrlInput } from '../ui/UrlInput';

const CLICK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);
const SUCCESS_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const ERROR_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const ACHIEVEMENT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

export const SoundSection: React.FC = () => {
  const designSettings = useQuizDataStore((s) => s.designSettings);
  const updateDesignSettings = useQuizDataStore((s) => s.updateDesignSettings);

  const sound = designSettings.sound ?? {};
  const volume = sound.volume ?? 0.5;
  const musicVolume = sound.musicVolume ?? 0.3;
  const voiceVolume = sound.voiceVolume ?? 1;
  const sfxVolume = sound.sfxVolume ?? 1;
  const tickVolume = sound.tickVolume ?? 0.85;

  const setSound = (field: string, value: unknown) => {
    updateDesignSettings({
      sound: { ...sound, [field]: value } as typeof sound,
    });
  };

  return (
    <Section
      title="Аудио оформление"
      description="Настройте фоновую музыку и звуковые эффекты."
    >
      <SettingRow label="Общая громкость" description="Громкость всех звуков квиза.">
        <div className="space-y-1">
          <RangeInput
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(v) => setSound('volume', v)}
            aria-label="Громкость"
          />
          <div className="text-right text-xs text-slate-500">
            {Math.round(volume * 100)}%
          </div>
        </div>
      </SettingRow>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingRow label="Музыка" description="Отдельная громкость фоновой музыки.">
          <LayerVolume value={musicVolume} onChange={(v) => setSound('musicVolume', v)} />
        </SettingRow>
        <SettingRow label="Диктор" description="Громкость озвучки сцен.">
          <LayerVolume value={voiceVolume} onChange={(v) => setSound('voiceVolume', v)} />
        </SettingRow>
        <SettingRow label="Эффекты" description="Громкость переходов, появления и раскрытия ответа.">
          <LayerVolume value={sfxVolume} onChange={(v) => setSound('sfxVolume', v)} />
        </SettingRow>
        <SettingRow label="Таймер" description="Громкость тиков таймера экранной викторины.">
          <LayerVolume value={tickVolume} onChange={(v) => setSound('tickVolume', v)} />
        </SettingRow>
      </div>

      <div className="space-y-4 pt-2">
        <UrlInput
          label="Фоновая музыка"
          value={sound.backgroundMusic || ''}
          onChange={(v) => setSound('backgroundMusic', v)}
          placeholder="https://example.com/music.mp3"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <UrlInput
            label="Звук клика"
            value={sound.buttonClick || ''}
            onChange={(v) => setSound('buttonClick', v)}
            placeholder="Click.mp3"
            icon={CLICK_ICON}
          />
          <UrlInput
            label="Звук успеха"
            value={sound.correctAnswer || ''}
            onChange={(v) => setSound('correctAnswer', v)}
            placeholder="Success.mp3"
            icon={SUCCESS_ICON}
          />
          <UrlInput
            label="Звук ошибки"
            value={sound.incorrectAnswer || ''}
            onChange={(v) => setSound('incorrectAnswer', v)}
            placeholder="Error.mp3"
            icon={ERROR_ICON}
          />
          <UrlInput
            label="Звук достижения"
            value={sound.achievementUnlock || ''}
            onChange={(v) => setSound('achievementUnlock', v)}
            placeholder="Tada.mp3"
            icon={ACHIEVEMENT_ICON}
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-800">Экранная викторина</h4>
            <p className="mt-1 text-xs text-slate-500">
              Звуки для автоматического YouTube-режима: заставка, таймер, раскрытие ответа и переходы.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <UrlInput
              label="Звук заставки"
              value={sound.screenQuizIntro || ''}
              onChange={(v) => setSound('screenQuizIntro', v)}
              placeholder="Intro-sting.mp3"
            />
            <UrlInput
              label="Тик таймера"
              value={sound.screenQuizTick || ''}
              onChange={(v) => setSound('screenQuizTick', v)}
              placeholder="Tick.mp3"
            />
            <UrlInput
              label="Раскрытие ответа"
              value={sound.screenQuizReveal || ''}
              onChange={(v) => setSound('screenQuizReveal', v)}
              placeholder="Reveal.mp3"
            />
            <UrlInput
              label="Переход между сценами"
              value={sound.screenQuizTransition || ''}
              onChange={(v) => setSound('screenQuizTransition', v)}
              placeholder="Whoosh.mp3"
            />
          </div>
        </div>
      </div>
    </Section>
  );
};

const LayerVolume: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => (
  <div className="space-y-1">
    <RangeInput
      min={0}
      max={1}
      step={0.05}
      value={value}
      onChange={onChange}
      aria-label="Громкость слоя"
    />
    <div className="text-right text-xs text-slate-500">
      {Math.round(value * 100)}%
    </div>
  </div>
);
