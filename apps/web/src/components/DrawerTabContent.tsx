import { ExternalLink } from 'lucide-react';
import { next7DaysReadableString } from '../util/time';
import { useCurrentTime } from '../contexts/NowContext';
import css from './DrawerTabContent.module.css';
import { useDrawerTabsContext } from '../contexts/DrawerTabsContext';
import ReviewPage from './ReviewPage';
import { useDrawerAPIContext } from '../contexts/DrawerAPIContext';

function DrawerTabContent({ onOpenPromotion }: { onOpenPromotion: (promotionId: number) => void }) {
    const now = useCurrentTime();
    const dayOffsetFromSunday = now.weekday % 7;
    const daysStartingFromSunday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const { location } = useDrawerTabsContext();
    const { activeTab } = useDrawerAPIContext();

    const timeSlots = location.times === null ? null : next7DaysReadableString(location.times, now);
    const specials = location.todaysSpecials ?? [];
    const soups = location.todaysSoups ?? [];
    const menu = location.menu ?? '';

    function renderDescription() {
        return <div className={css.description}>{location.description}</div>;
    }

    function renderHours() {
        return (
            <>
                <h4 className={css['section-header']}>Hours</h4>

                <div className={css['hours-list']}>
                    {timeSlots === null && <p>Hours unavailable</p>}
                    {timeSlots?.map((slot, index) => {
                        const label = daysStartingFromSunday[(index + dayOffsetFromSunday) % 7];
                        const isToday = index === 0;
                        return (
                            <div
                                key={label}
                                className={`${css['hours-row']} ${isToday ? css['hours-row-active'] : ''}`}
                            >
                                <span className={css['hours-day']}>{label}</span>
                                <div className={css['hours-line']} />
                                <span className={css['hours-times']}>{slot}</span>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    }

    function renderTodaysSpecials() {
        return (
            <>
                <h4 className={css['section-header']}>Today&apos;s Specials</h4>
                <div>
                    {specials.concat(soups).map((item) => (
                        <div className={css.special} key={item.name}>
                            <div className={css.special__title}>{item.name}</div>
                            <div className={css.special__desc}>{item.description}</div>
                        </div>
                    ))}
                </div>
            </>
        );
    }

    function renderPromotions() {
        return location.promotions.map((promotion) => {
            const text = promotion.promotionText || promotion.promotionTagText;
            if (!text && !promotion.promotionGraphic) return null;
            return (
                <div className={css.promotion} key={promotion.id}>
                    {text && <p className={css['promotion-text']}>{text}</p>}
                    {promotion.promotionGraphic && (
                        <button
                            type="button"
                            className={css['promotion-button']}
                            aria-haspopup="dialog"
                            onClick={() => onOpenPromotion(promotion.id)}
                        >
                            View promotion
                        </button>
                    )}
                </div>
            );
        });
    }

    function renderMenu() {
        return (
            <>
                <h4 className={css['section-header']}>Menu</h4>
                <div>
                    {menu ? (
                        <a className={css['inline-link']} href={menu} target="_blank" rel="noreferrer">
                            <span>View menu online</span>
                            <ExternalLink size={14} aria-hidden />
                        </a>
                    ) : (
                        <div>
                            We are working on publishing an online menu for this location!
                            <br /> <br />
                            In the meantime, let us know what you think via{' '}
                            <a
                                className={css['inline-link']}
                                href="https://forms.gle/7JxgdgDhWMznQJdk9"
                                target="_blank"
                                rel="noreferrer"
                            >
                                our feedback form
                            </a>
                            .
                        </div>
                    )}
                </div>
            </>
        );
    }

    return (
        <div className={css.container}>
            {activeTab === 'overview' && (
                <>
                    {renderDescription()}
                    {renderHours()}
                    {renderPromotions()}
                    {location.onCampus === false && location.googlePlaceID && (
                        <div className={css.attribution}>
                            View in{' '}
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}&query_place_id=${encodeURIComponent(location.googlePlaceID)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                            >
                                Google Maps
                            </a>
                        </div>
                    )}
                    {(specials.length > 0 || soups.length > 0) && renderTodaysSpecials()}
                </>
            )}
            {activeTab === 'menu' && renderMenu()}
            {activeTab === 'reviews' && <ReviewPage locationId={location.id} />}
        </div>
    );
}

export default DrawerTabContent;
