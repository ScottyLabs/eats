import { useRef } from 'react';
import { SortDesc } from 'lucide-react';
import css from './SelectDropdown.module.css';
import type { SortOption } from '../util/useFilteredLocations';

type SelectSortProps = {
    setSortBy: React.Dispatch<SortOption>;
    sortBy: SortOption;
};

const sortOptionLabels: Record<SortOption, string> = {
    open: 'Sort by Open Status',
    distance: 'Sort by Distance',
    'ra-highest-open': 'Sort by Highest Rating (Open First)',
    'ra-highest': 'Sort by Highest Rating (All)',
    'ra-lowest': 'Sort by Lowest Rating (All)',
};

function SelectSort({ setSortBy, sortBy }: SelectSortProps) {
    const selectRef = useRef<HTMLSelectElement>(null);

    const handleClick = () => {
        const select = selectRef.current;
        if (!select) return;
        if (typeof select.showPicker === 'function') {
            select.showPicker();
        } else {
            select.click();
        }
    };

    return (
        <div className={css.container}>
            <button className={css.button} onClick={handleClick}>
                <SortDesc />
            </button>
            <select
                ref={selectRef}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={css.select}
            >
                {(Object.keys(sortOptionLabels) as SortOption[]).map((option) => (
                    <option key={option} value={option}>
                        {sortOptionLabels[option]}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default SelectSort;
