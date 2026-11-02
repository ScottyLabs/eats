import type { Promotion } from '../types/locationTypes';

export function getActivePromotions(promotions: Promotion[], now: number): Promotion[] {
    return promotions.filter(
        (promotion) =>
            promotion.status === 'published' &&
            (promotion.startsAt === null || Date.parse(promotion.startsAt) <= now) &&
            (promotion.endsAt === null || now < Date.parse(promotion.endsAt)),
    );
}
