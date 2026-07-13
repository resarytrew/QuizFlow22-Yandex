import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesignOverviewPanel from './DesignOverviewPanel';
import { useDesignAssetsStore } from '../../store/useDesignAssetsStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { LAYOUT_MEASURED_EVENT, REQUEST_LAYOUT_MEASUREMENT_EVENT } from '../LivePreview';
import { getLayoutMode } from '../../src/designMode/layoutDocument';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe('DesignOverviewPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useQuizDataStore.getState().reset();
    useDesignAssetsStore.getState().reset();
  });

  it('shows quick start by default', () => {
    render(<DesignOverviewPanel />);

    expect(screen.getByText('Быстрый старт')).toBeTruthy();
    expect(screen.getByText('Выбрать шаблон')).toBeTruthy();
    expect(screen.getByText('Применить стиль')).toBeTruthy();
  });

  it('previews a style without applying it, then applies after confirmation', () => {
    render(<DesignOverviewPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Стиль' }));
    fireEvent.click(screen.getByText('Бриф / Lead form'));

    expect(screen.getByText('Предпросмотр: Бриф / Lead form')).toBeTruthy();
    expect(useQuizDataStore.getState().activeDesignStyleId).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    expect(useQuizDataStore.getState().activeDesignStyleId).toBe('lead-form');
    expect(useQuizDataStore.getState().designStatus).toBe('applied');
  });

  it('cancels style preview without changing design', () => {
    render(<DesignOverviewPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Стиль' }));
    fireEvent.click(screen.getByText('Аттестация'));
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByText('Предпросмотр: Аттестация')).toBeNull();
    expect(useQuizDataStore.getState().activeDesignStyleId).toBeNull();
  });

  it('previews and confirms a template change', () => {
    render(<DesignOverviewPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Шаблон' }));
    fireEvent.click(screen.getByText('Экранная викторина'));

    expect(useQuizDataStore.getState().templateId).toBe('default');

    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    expect(useQuizDataStore.getState().templateId).toBe('screenQuiz');
  });

  it('applies Brand Kit without replacing layout or element overrides', () => {
    useQuizDataStore.getState().updateDesignSettings({
      layout: { cardRadius: 0 },
      elementOverrides: {
        global: {
          'question-card': { questionCard: { radius: 12 } },
        },
      },
    } as never);
    const kit = useDesignAssetsStore.getState().saveBrandKit({
      name: 'Acme',
      primaryColor: '#123456',
      accentColor: '#654321',
      neutralColor: '#111111',
      fontFamily: 'Inter',
      displayFontFamily: 'Lora',
    });

    render(<DesignOverviewPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Brand Kit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Применить Brand Kit' }));

    const design = useQuizDataStore.getState().designSettings as any;
    expect(useDesignAssetsStore.getState().activeBrandKitName).toBe(kit.name);
    expect(design.brand.primaryColor).toBe('#123456');
    expect(design.layout.cardRadius).toBe(0);
    expect(design.elementOverrides.global['question-card'].questionCard.radius).toBe(12);
  });

  it('saves current design as a custom style', () => {
    render(<DesignOverviewPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Стиль' }));
    fireEvent.change(screen.getByLabelText('Название пользовательского стиля'), { target: { value: 'My custom style' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить дизайн как стиль' }));

    expect(useDesignAssetsStore.getState().customStyles[0].name).toBe('My custom style');
  });

  it('switches automatic layout to free layout through measured preview data', async () => {
    window.addEventListener(REQUEST_LAYOUT_MEASUREMENT_EVENT, () => {
      window.dispatchEvent(new CustomEvent(LAYOUT_MEASURED_EVENT, {
        detail: {
          viewport: { width: 1000, height: 500 },
          elements: [
            {
              id: 'question-card',
              role: 'question-card',
              nodeId: null,
              rect: { x: 100, y: 50, width: 500, height: 200 },
            },
          ],
        },
      }));
    }, { once: true });

    render(<DesignOverviewPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Общие параметры' }));
    fireEvent.click(screen.getByRole('button', { name: 'Свободный' }));

    await waitFor(() => expect(getLayoutMode(useQuizDataStore.getState().designSettings)).toBe('free'));
    expect(useQuizDataStore.getState().canUndoDesign).toBe(true);
  });
});
