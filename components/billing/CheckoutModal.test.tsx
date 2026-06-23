import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CheckoutModal from './CheckoutModal';
import { deriveProPlan, HARDCODED_PRO_PLANS } from './featureLabels';
import { LEGAL_DOCUMENT_HREFS } from './legalDocuments';

const monthlyPlan = deriveProPlan(HARDCODED_PRO_PLANS[0]);

function getPaymentButtons() {
  const sbpConfirm = screen.getByRole('button', { name: /СБП/ }) as HTMLButtonElement;
  const otherConfirm = screen.getByRole('button', { name: /Другие способы оплаты/ }) as HTMLButtonElement;
  return { sbpConfirm, otherConfirm };
}

describe('CheckoutModal', () => {
  it('requires accepting both legal terms and project rules', () => {
    const onConfirm = vi.fn();
    render(
      <CheckoutModal
        plan={monthlyPlan}
        busy={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('heading', { name: /PRO/ })).toBeTruthy();
    const { sbpConfirm, otherConfirm } = getPaymentButtons();
    expect(sbpConfirm.disabled).toBe(true);
    expect(otherConfirm.disabled).toBe(true);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);

    fireEvent.click(checkboxes[0]);
    expect(sbpConfirm.disabled).toBe(true);
    expect(otherConfirm.disabled).toBe(true);

    fireEvent.click(checkboxes[1]);
    expect(sbpConfirm.disabled).toBe(false);
    expect(otherConfirm.disabled).toBe(false);

    fireEvent.click(sbpConfirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('sbp');

    fireEvent.click(otherConfirm);
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onConfirm).toHaveBeenLastCalledWith('any');

    expect(screen.getByRole('link', { name: /оферт/i }).getAttribute('href'))
      .toBe(LEGAL_DOCUMENT_HREFS.offer);
    expect(screen.getAllByRole('link', { name: /правил/i })[0].getAttribute('href'))
      .toBe(LEGAL_DOCUMENT_HREFS.rules);
  });

  it('closes with Escape when payment is not being created', () => {
    const onClose = vi.fn();
    render(
      <CheckoutModal
        plan={monthlyPlan}
        busy={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when no plan is selected', () => {
    render(
      <CheckoutModal
        plan={null}
        busy={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
