import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import PromotionPopup from '../../src/components/PromotionPopup';

describe('PromotionPopup', () => {
    beforeEach(() => {
        // jsdom does not implement the native dialog lifecycle.
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
            configurable: true,
            value() {
                this.setAttribute('open', '');
            },
        });
        Object.defineProperty(HTMLDialogElement.prototype, 'close', {
            configurable: true,
            value() {
                this.removeAttribute('open');
            },
        });
    });
    afterEach(() => vi.restoreAllMocks());

    function renderPopup() {
        const onClose = vi.fn();
        render(<PromotionPopup graphic="/promotion.png" alt="Special offer" locationName="Cafe" onClose={onClose} />);
        return onClose;
    }

    test('keeps image clicks open and supports close button and backdrop dismissal', () => {
        const onClose = renderPopup();
        fireEvent.click(screen.getByAltText('Special offer'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Close promotion' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('dialog', { name: 'Cafe promotion' }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    test('contains Escape and handles native cancel without reaching the drawer listener', () => {
        const onClose = renderPopup();
        const drawerKeyDown = vi.fn();
        document.addEventListener('keydown', drawerKeyDown);
        try {
            fireEvent.keyDown(screen.getByRole('button', { name: 'Close promotion' }), { key: 'Escape' });
            expect(drawerKeyDown).not.toHaveBeenCalled();
            fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
            expect(onClose).toHaveBeenCalledTimes(1);
        } finally {
            document.removeEventListener('keydown', drawerKeyDown);
        }
    });

    test('shows a recoverable message when the graphic fails to load', () => {
        renderPopup();
        fireEvent.error(screen.getByAltText('Special offer'));
        expect(screen.getByRole('status').textContent).toContain('couldn’t be loaded');
        expect(screen.getByRole('button', { name: 'Close promotion' })).toBeTruthy();
    });
});
