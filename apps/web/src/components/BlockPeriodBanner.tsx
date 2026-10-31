
import { useState, useEffect, useRef } from 'react';
import css from './BlockPeriodBanner.module.css';
import { BLOCK_PERIODS, type BlockPeriod } from '../util/blockPeriod';

type BlockPeriodBannerProps = {
    blockPeriod: BlockPeriod;
};

export default function BlockPeriodBanner({
    blockPeriod,
}: BlockPeriodBannerProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const bannerRef = useRef<HTMLDivElement>(null);

    // Close the dropdown when clicking outside the banner.
    useEffect(() => {
        if (!isExpanded) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (
                bannerRef.current &&
                !bannerRef.current.contains(event.target as Node)
            ) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    // Close the dropdown whenever the user scrolls.
    useEffect(() => {
        if (!isExpanded) {
            return;
        }

        const handleScroll = () => {
            setIsExpanded(false);
        };

        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isExpanded]);

    return (
        <div
            className={`${css['block-period-banner']} ${
                isExpanded ? css['block-period-banner--expanded'] : ''
            }`}
            ref={bannerRef}
        >
            <div className={css['block-period-banner__header']}>
                <div className={css['block-period-banner__header-period']}>
                    <span className={css['block-period-banner__label']}>
                        Block Period:
                    </span>

                    <span className={css['block-period-banner__name']}>
                        {blockPeriod.name}
                    </span>
                </div>

                <span className={css['block-period-banner__time']}>
                    ({blockPeriod.startTime} - {blockPeriod.endTime})
                </span>

                <button
                    className={`${css['block-period-banner__expand-button']} ${
                        isExpanded
                            ? css['block-period-banner__expand-button--hidden']
                            : ''
                    }`}
                    onClick={() => setIsExpanded(true)}
                    aria-label="Expand block periods"
                >
                    ›
                </button>
            </div>

            {isExpanded && (
                <div
                    className={css['block-period-banner__dropdown']}
                    onClick={() => setIsExpanded(false)}
                >
                    {BLOCK_PERIODS.map((period) => (
                        <div
                            key={period.name}
                            className={`${css['block-period-banner__period']} ${
                                period.name === blockPeriod.name
                                    ? css['block-period-banner__period--current']
                                    : ''
                            }`}
                        >
                            <span className={css['block-period-banner__period-name']}>
                                {period.name}
                            </span>

                            <span className={css['block-period-banner__period-time']}>
                                {period.startTime} - {period.endTime}
                            </span>

                            <span className={css['block-period-banner__price']}>
                                ${period.price.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
