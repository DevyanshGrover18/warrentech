import { MapPin } from 'lucide-react';
import { FilterGroup, FilterItem, FilterSelector } from '../../../global/FilterGroup';
import ListSearchInput from '../../../global/ListSearchInput';

export function DistributorFilters({
  searchTerm,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  states,
  onClearFilters,
}) {
  return (
    <FilterGroup>
      <FilterItem>
        <ListSearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search by distributor, ID, city..."
          className="w-full sm:w-80"
        />
      </FilterItem>
      <FilterItem>
        <FilterSelector
          value={stateFilter}
          onChange={onStateFilterChange}
          options={states.map((state) => ({ _id: state, name: state }))}
          placeholder="All States"
          icon={MapPin}
        />
      </FilterItem>
      <FilterItem>
        <button
          onClick={onClearFilters}
          className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
        >
          Clear Filters
        </button>
      </FilterItem>
    </FilterGroup>
  );
}
