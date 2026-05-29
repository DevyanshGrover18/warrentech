import { Search } from 'lucide-react';

export default function ListSearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}
