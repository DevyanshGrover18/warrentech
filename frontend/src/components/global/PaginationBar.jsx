const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 75, 100];

export default function PaginationBar({
  page,
  totalPages,
  totalItems,
  limit,
  itemLabel = 'items',
  onPageChange,
  onLimitChange,
}) {
  const startItem = totalItems > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = totalItems > 0 ? Math.min(page * limit, totalItems) : 0;

  return (
    <div className="border-t border-gray-200 px-6 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="whitespace-nowrap">Rows per page:</span>
          <select
            className="rounded border border-gray-300 px-2 py-1"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {ROWS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="hidden md:inline">
            Showing {startItem} to {endItem} of {totalItems} {itemLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
