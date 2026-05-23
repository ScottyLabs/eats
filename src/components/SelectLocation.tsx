import { useRef } from 'react';
import { Filter } from 'lucide-react';
import { ILocation_Full } from '../types/locationTypes';
import css from './SelectLocation.module.css';

type SelectLocationProps = {
    setLocationFilterQuery: React.Dispatch<string>;
    locations: ILocation_Full[] | undefined;
};

function getPrimaryLocation(locationString: string) {
    return locationString.indexOf(',') === -1 ? locationString : locationString.slice(0, locationString.indexOf(','));
}

function SelectLocation({ setLocationFilterQuery, locations }: SelectLocationProps) {
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

    const dedeupedLocationStrings = locations
        ? [...new Set(locations.map((loc) => getPrimaryLocation(loc.location)))]
        : [];

    return (
        <div className={css.container}>
            <button className={css.button} onClick={handleClick}>
                <Filter />
            </button>
            <select ref={selectRef} onChange={(e) => setLocationFilterQuery(e.target.value)} className={css.select}>
                <option value="" key="All Buildings" label="All Buildings" />
                {dedeupedLocationStrings.map((location) => (
                    <option key={location} value={location}>
                        {location}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default SelectLocation;
