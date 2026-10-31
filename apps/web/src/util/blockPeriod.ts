import type { DateTime } from 'luxon';

export type BlockPeriod = {
    name: string;
    startTime: string;
    endTime: string;
    price: number;
};

export const BLOCK_PERIODS: BlockPeriod[] = [
    {
        name: 'Breakfast',
        startTime: '3:30 AM',
        endTime: '10:29 AM',
        price: 9.75,
    },
    {
        name: 'Lunch',
        startTime: '10:30 AM',
        endTime: '4:29 PM',
        price: 12.50,
    },
    {
        name: 'Dinner',
        startTime: '4:30 PM',
        endTime: '8:59 PM',
        price: 14.15,
    },
    {
        name: 'Late Night',
        startTime: '9:00 PM',
        endTime: '3:29 AM',
        price: 12.50,
    },
];

export function getBlockPeriod(time: DateTime): BlockPeriod {
    const minutes = time.hour * 60 + time.minute;

    if (minutes >= 210 && minutes < 630) {
        return BLOCK_PERIODS[0]!;
    }

    if (minutes >= 630 && minutes < 990) {
        return BLOCK_PERIODS[1]!;
    }

    if (minutes >= 990 && minutes < 1260) {
        return BLOCK_PERIODS[2]!;
    }

    return BLOCK_PERIODS[3]!;
}