import { useEffect, useRef, useState } from 'react';
import type { Promotion } from '../types/locationTypes';

export function usePromotionPopup(locationId: string | null, promotions: Promotion[]) {
    const openedCardIds = useRef(new Set<string>());
    const lastOpenedId = useRef<string | null>(null);
    const [selection, setSelection] = useState<{ locationId: string; promotionId: number } | null>(null);
    const firstGraphicId = promotions.find((promotion) => promotion.promotionGraphic)?.id;

    useEffect(() => {
        if (lastOpenedId.current === locationId) return;
        lastOpenedId.current = locationId;
        const firstOpen = locationId !== null && !openedCardIds.current.has(locationId);
        if (locationId !== null) openedCardIds.current.add(locationId);
        setSelection(firstOpen && firstGraphicId !== undefined ? { locationId, promotionId: firstGraphicId } : null);
    }, [locationId, firstGraphicId]);

    const promotion =
        selection?.locationId === locationId
            ? promotions.find((item) => item.id === selection?.promotionId && item.promotionGraphic)
            : undefined;

    return {
        promotion,
        openPopup: (promotionId: number) => {
            if (locationId !== null) setSelection({ locationId, promotionId });
        },
        closePopup: () => setSelection(null),
    };
}
