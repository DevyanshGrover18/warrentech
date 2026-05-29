import { MapPin, User } from 'lucide-react';
import { FilterGroup, FilterItem, FilterSelector } from '../../../global/FilterGroup';
import ListSearchInput from '../../../global/ListSearchInput';

export const DealerFilters = ({
    searchTerm,
    onSearchChange,
    stateFilter,
    onStateFilterChange,
    distributorFilter,
    onDistributorFilterChange,
    states,
    distributors,
    onClearFilters
}) => {
    return (
        <FilterGroup>
            <FilterItem>
                <ListSearchInput
                    value={searchTerm}
                    onChange={onSearchChange}
                    placeholder="Search by dealer, ID, city..."
                    className="w-full sm:w-80"
                />
            </FilterItem>
            <FilterItem>
                <FilterSelector
                    value={stateFilter}
                    onChange={onStateFilterChange}
                    options={states.map(s => ({ _id: s, name: s }))}
                    placeholder="All States"
                    icon={MapPin}
                />
            </FilterItem>
            <FilterItem>
                <FilterSelector
                    value={distributorFilter}
                    onChange={onDistributorFilterChange}
                    options={distributors}
                    placeholder="All Distributors"
                    icon={User}
                />
            </FilterItem>
            <FilterItem>
                <button
                    onClick={onClearFilters}
                    className="flex items-center justify-center bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                    <span>Clear Filters</span>
                </button>
            </FilterItem>
        </FilterGroup>
    );
};
