import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { usePromotionPopup } from '../../src/util/usePromotionPopup';
import type { Promotion } from '../../src/types/locationTypes';

function makePromotions(graphic: string | null): Promotion[] {
    return [
        {
            id: 1,
            placeId: 'cafe',
            status: 'published',
            promotionTagText: null,
            promotionText: null,
            promotionGraphic: graphic,
            startsAt: null,
            endsAt: null,
        },
    ];
}
const promotions = makePromotions('/promotion.png');

describe('promotion first-open behavior', () => {
    test('skips offers without graphics, opens a chosen offer, and closes when it expires', () => {
        const offers = [
            ...makePromotions(null),
            { ...promotions[0]!, id: 2 },
            { ...promotions[0]!, id: 3, promotionGraphic: '/second.png' },
        ];
        const { result, rerender } = renderHook(({ active }) => usePromotionPopup('multiple', active), {
            initialProps: { active: offers },
        });
        expect(result.current.promotion?.id).toBe(2);
        act(() => result.current.openPopup(3));
        expect(result.current.promotion?.promotionGraphic).toBe('/second.png');
        rerender({ active: offers.filter((offer) => offer.id !== 3) });
        expect(result.current.promotion).toBeUndefined();
        act(() => result.current.openPopup(2));
        expect(result.current.promotion?.id).toBe(2);
    });

    test('auto-opens once per card, supports manual reopening, and handles card switches', () => {
        const { result, rerender } = renderHook(({ id }) => usePromotionPopup(id, promotions), {
            initialProps: { id: 'first' as string | null },
            wrapper: StrictMode,
        });

        expect(result.current.promotion).toBeDefined();
        act(() => result.current.closePopup());
        expect(result.current.promotion).toBeUndefined();
        act(() => result.current.openPopup(1));
        expect(result.current.promotion).toBeDefined();

        rerender({ id: null });
        expect(result.current.promotion).toBeUndefined();
        rerender({ id: 'first' });
        expect(result.current.promotion).toBeUndefined();
        rerender({ id: 'second' });
        expect(result.current.promotion).toBeDefined();
        rerender({ id: 'first' });
        expect(result.current.promotion).toBeUndefined();
    });

    test('resets opened cards after remounting', () => {
        const first = renderHook(() => usePromotionPopup('remounted', promotions));
        expect(first.result.current.promotion).toBeDefined();
        act(() => first.result.current.closePopup());
        expect(first.result.current.promotion).toBeUndefined();
        first.unmount();

        const second = renderHook(() => usePromotionPopup('remounted', promotions));
        expect(second.result.current.promotion).toBeDefined();
    });

    test('waits for location data before recording a direct-link opening', () => {
        const { result, rerender } = renderHook(({ id }) => usePromotionPopup(id, promotions), {
            initialProps: { id: null as string | null },
        });
        expect(result.current.promotion).toBeUndefined();
        rerender({ id: 'direct-link' });
        expect(result.current.promotion).toBeDefined();
    });

    test('records cards without graphics without opening an empty popup', () => {
        const { result, rerender } = renderHook(
            ({ graphic }) => usePromotionPopup('no-graphic', makePromotions(graphic)),
            {
                initialProps: { graphic: null as string | null },
            },
        );
        expect(result.current.promotion).toBeUndefined();
        rerender({ graphic: '/added-later.png' });
        expect(result.current.promotion).toBeUndefined();
        act(() => result.current.openPopup(1));
        expect(result.current.promotion).toBeDefined();
    });

    test('keeps opened-card history independent between hook instances', () => {
        const first = renderHook(() => usePromotionPopup('shared-card', promotions));
        expect(first.result.current.promotion).toBeDefined();
        act(() => first.result.current.closePopup());
        const second = renderHook(() => usePromotionPopup('shared-card', promotions));
        expect(second.result.current.promotion).toBeDefined();
        expect(first.result.current.promotion).toBeUndefined();
    });
});
