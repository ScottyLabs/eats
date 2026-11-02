import { describe, expect, test } from 'vitest';
import { getActivePromotions } from '../../src/util/promotions';
import type { Promotion } from '../../src/types/locationTypes';

const offer: Promotion = {
    id: 1,
    placeId: 'cafe',
    status: 'published',
    promotionTagText: 'Discount',
    promotionText: null,
    promotionGraphic: null,
    startsAt: null,
    endsAt: null,
};
const now = Date.parse('2026-11-01T12:00:00Z');

describe('active promotions', () => {
    test('keeps every published offer within inclusive start and exclusive end boundaries', () => {
        const offers: Promotion[] = [
            offer,
            { ...offer, id: 2, startsAt: new Date(now).toISOString() },
            { ...offer, id: 3, startsAt: new Date(now + 1).toISOString() },
            { ...offer, id: 4, endsAt: new Date(now).toISOString() },
            { ...offer, id: 5, endsAt: new Date(now + 1).toISOString() },
            { ...offer, id: 6, status: 'draft' },
            { ...offer, id: 7, status: 'archived' },
        ];
        expect(getActivePromotions(offers, now).map((item) => item.id)).toEqual([1, 2, 5]);
    });

    test('expires cached offers as time advances without mutating the response', () => {
        const offers = [{ ...offer, endsAt: new Date(now + 1000).toISOString() }];
        expect(getActivePromotions(offers, now)).toHaveLength(1);
        expect(getActivePromotions(offers, now + 1000)).toEqual([]);
        expect(offers).toHaveLength(1);
    });
});
