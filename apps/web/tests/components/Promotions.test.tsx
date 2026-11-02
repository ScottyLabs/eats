import { fireEvent, render, screen } from '@testing-library/react';
import { DateTime } from 'luxon';
import { describe, expect, test, vi } from 'vitest';
import DrawerTabContent from '../../src/components/DrawerTabContent';
import EateryCardContent from '../../src/components/EateryCardContent';
import { DrawerTabsContextProvider } from '../../src/contexts/DrawerTabsContext';
import { ILocation_Full, LocationState, Promotion } from '../../src/types/locationTypes';

vi.mock('../../src/components/ReviewPage', () => ({ default: () => null }));
vi.mock('../../src/contexts/DrawerAPIContext', () => ({ useDrawerAPIContext: () => ({ activeTab: 'overview' }) }));
vi.mock('../../src/contexts/NowContext', () => ({ useCurrentTime: () => DateTime.fromISO('2026-11-01T12:00:00Z') }));
vi.mock('../../src/ThemeProvider', () => ({ useThemeContext: () => ({ theme: 'dark' }) }));

const emptyOffer: Promotion = {
    id: 1,
    placeId: 'cafe',
    status: 'published',
    promotionText: null,
    promotionTagText: null,
    promotionGraphic: null,
    startsAt: null,
    endsAt: null,
};
const location: ILocation_Full = {
    id: 'cafe',
    name: 'Cafe',
    promotions: [
        emptyOffer,
        {
            ...emptyOffer,
            id: 2,
            promotionTagText: 'Free coffee',
            promotionText: 'Coffee with breakfast',
            promotionGraphic: '/coffee.png',
        },
        {
            ...emptyOffer,
            id: 3,
            promotionTagText: 'Lunch deal',
            promotionText: 'Discounted lunch',
            promotionGraphic: '/lunch.png',
        },
        { ...emptyOffer, id: 4, promotionTagText: 'Tag-only offer' },
    ],
    description: '',
    shortDescription: null,
    location: '',
    url: '',
    menu: null,
    times: null,
    todaysSpecials: [],
    todaysSoups: [],
    conceptId: null,
    coordinateLat: null,
    coordinateLng: null,
    acceptsOnlineOrders: false,
    ratingsAvg: null,
    ratingsCount: 0,
    cardViewPreference: 'normal',
    distanceFromUserMeters: null,
    closedLongTerm: true,
    locationState: LocationState.UNKNOWN,
    statusMsg: { shortStatus: ['', ''], longStatus: '' },
};

describe('multiple promotions', () => {
    test('renders every offer in the drawer and opens the selected graphic', () => {
        const open = vi.fn();
        render(
            <DrawerTabsContextProvider location={location}>
                <DrawerTabContent onOpenPromotion={open} />
            </DrawerTabsContextProvider>,
        );
        expect(screen.getByText('Coffee with breakfast')).toBeInTheDocument();
        expect(screen.getByText('Discounted lunch')).toBeInTheDocument();
        expect(screen.getByText('Tag-only offer')).toBeInTheDocument();
        const buttons = screen.getAllByRole('button', { name: 'View promotion' });
        expect(buttons).toHaveLength(2);
        fireEvent.click(buttons[1]!);
        expect(open).toHaveBeenCalledWith(3);
    });

    test('renders all nonempty card tags even when the first offer is empty', () => {
        render(<EateryCardContent location={location} />);
        for (const tag of ['Free coffee', 'Lunch deal', 'Tag-only offer']) {
            expect(screen.getByText(tag)).toBeInTheDocument();
        }
    });
});
