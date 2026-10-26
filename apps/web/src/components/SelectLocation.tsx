import { Filter } from 'lucide-react';
import { ILocation_Full } from '../types/locationTypes';
import { LOCATION_DEFAULT } from '../util/useLocationList';
import css from './SelectDropdown.module.css';
import clsx from 'clsx';

type SelectLocationProps = {
    locationFilterQuery: string;
    setLocationFilterQuery: React.Dispatch<string>;
    locations: ILocation_Full[] | undefined;
};

function getPrimaryLocation(locationString: string) {
    return locationString.split(',', 1)[0];
}

function SelectLocation({ locationFilterQuery, setLocationFilterQuery, locations }: SelectLocationProps) {
    const deduplicatedBuildingNames = locations
        ? [...new Set(locations.map((loc) => getPrimaryLocation(loc.location)))]
        : [];

    return (
        <div className={css.container}>
            <div className={clsx(css['icon-div'], locationFilterQuery !== LOCATION_DEFAULT && css['icon-div--active'])}>
                <Filter />
            </div>
            <select
                value={locationFilterQuery}
                onChange={(e) => setLocationFilterQuery(e.target.value)}
                className={css.select}
            >
                <option value={LOCATION_DEFAULT} key="All Buildings" label="All Buildings" />
                {deduplicatedBuildingNames.map((location) => (
                    <option key={location} value={location}>
                        {location}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default SelectLocation;
