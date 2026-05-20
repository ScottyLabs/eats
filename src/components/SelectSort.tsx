import css from './SelectSort.module.css';
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
    return (
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className={css.select}>
            {(Object.keys(sortOptionLabels) as SortOption[]).map((option) => (
                <option key={option} value={option}>
                    {sortOptionLabels[option]}
                </option>
            ))}
        </select>
    );
}

export default SelectSort;
