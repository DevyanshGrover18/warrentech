import PropTypes from "prop-types";
import { X } from "lucide-react";

const defaultColumns = [
  "MODEL",
  "BOX TYPE",
  "SERIAL NUMBER",
  "MRP(PRICE)",
  "FACTORY",
  "DISTRIBUTOR",
  "ACTIONS",
];

export default function InventoryManagementModal({
  isOpen,
  onClose,
  modelName = "2.0HP 15STAGE OIL",
  factoryFilter = "all",
  onFactoryFilterChange = () => {},
  factories = [],
  boxTypeFilter = "all",
  onBoxTypeFilterChange = () => {},
  boxTypeOptions = ["All", "1N", "2N", "3N"],
  startSerial = "",
  onStartSerialChange = () => {},
  endSerial = "",
  onEndSerialChange = () => {},
  onSelectRange = () => {},
  onUnselectRange = () => {},
  onClearAll = () => {},
  rowsPerPage = 10,
  onRowsPerPageChange = () => {},
  currentPage = 1,
  totalPages = 1,
  onPreviousPage = () => {},
  onNextPage = () => {},
  transferCount = 0,
  transferDisabled = true,
  onTransfer = () => {},
  transferLabel = "Transfer to Distributor",
  subDealers = [],
  onAssignToSubDealer = null,
  rows = [
    {
      id: "sample-1",
      checked: false,
      model: "2.0HP 15STAGE OIL",
      boxType: "1N",
      serialNumber: "0226SV1510005",
      mrp: "15250 /- Each",
      factory: "Sharp Motors",
      distributor: "N/A",
    },
  ],
  allRowsSelected = false,
  onToggleAllRows = () => {},
  onRowToggle = () => {},
  onEdit = () => {},
  showingFrom = 1,
  showingTo = 1,
  totalItems = 1,
  showEdit = true,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[96vw] flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">
            Model: {modelName}
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTransfer}
              disabled={transferDisabled}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                transferDisabled
                  ? "cursor-not-allowed bg-gray-200 text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {transferLabel} ({transferCount})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-hidden px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Factory
              </label>
              <select
                value={factoryFilter}
                onChange={(e) => onFactoryFilterChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Factories</option>
                {factories.map((factory) => (
                  <option key={factory._id} value={factory._id}>
                    {factory.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Box Type
              </label>
              <select
                value={boxTypeFilter}
                onChange={(e) => onBoxTypeFilterChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {boxTypeOptions.map((option) => {
                  const normalizedValue = option.toLowerCase() === "all" ? "all" : option;
                  return (
                    <option key={option} value={normalizedValue}>
                      {option === "All" ? "All" : option}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Start Serial
                </label>
                <input
                  type="text"
                  value={startSerial}
                  onChange={(e) => onStartSerialChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  End Serial
                </label>
                <input
                  type="text"
                  value={endSerial}
                  onChange={(e) => onEndSerialChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid min-w-[240px] grid-cols-2 gap-2 self-end">
              <button
                type="button"
                onClick={onSelectRange}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Select Range
              </button>
              <button
                type="button"
                onClick={onUnselectRange}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Unselect Range
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="col-span-2 rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="h-full overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allRowsSelected}
                      onChange={(e) => onToggleAllRows(e.target.checked)}
                      aria-label="Select all rows"
                    />
                  </th>
                  {defaultColumns.map((column) => (
                    <th key={column} className="px-4 py-3 text-left">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(e) => onRowToggle(row.id, e.target.checked)}
                        aria-label={`Select ${row.serialNumber}`}
                      />
                    </td>
                    <td className="px-4 py-3">{row.model}</td>
                    <td className="px-4 py-3">{row.boxType}</td>
                    <td className="px-4 py-3">{row.serialNumber}</td>
                    <td className="px-4 py-3">{row.mrp}</td>
                    <td className="px-4 py-3">{row.factory}</td>
                    <td className="px-4 py-3">{row.distributor}</td>
                    <td className="px-4 py-3">
                      {showEdit && (
                        <button
                          onClick={() => onEdit(row.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span>
              Showing {showingFrom} to {showingTo} of {totalItems} products
            </span>
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={currentPage <= 1}
              className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

InventoryManagementModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  modelName: PropTypes.string,
  factoryFilter: PropTypes.string,
  onFactoryFilterChange: PropTypes.func,
  factories: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
  boxTypeFilter: PropTypes.string,
  onBoxTypeFilterChange: PropTypes.func,
  boxTypeOptions: PropTypes.arrayOf(PropTypes.string),
  startSerial: PropTypes.string,
  onStartSerialChange: PropTypes.func,
  endSerial: PropTypes.string,
  onEndSerialChange: PropTypes.func,
  onSelectRange: PropTypes.func,
  onUnselectRange: PropTypes.func,
  onClearAll: PropTypes.func,
  rowsPerPage: PropTypes.number,
  onRowsPerPageChange: PropTypes.func,
  currentPage: PropTypes.number,
  totalPages: PropTypes.number,
  onPreviousPage: PropTypes.func,
  onNextPage: PropTypes.func,
  transferCount: PropTypes.number,
  transferDisabled: PropTypes.bool,
  onTransfer: PropTypes.func,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      checked: PropTypes.bool,
      model: PropTypes.string.isRequired,
      boxType: PropTypes.string.isRequired,
      serialNumber: PropTypes.string.isRequired,
      mrp: PropTypes.string.isRequired,
      factory: PropTypes.string.isRequired,
      distributor: PropTypes.string.isRequired,
    }),
  ),
  onRowToggle: PropTypes.func,
  allRowsSelected: PropTypes.bool,
  onToggleAllRows: PropTypes.func,
  showingFrom: PropTypes.number,
  showingTo: PropTypes.number,
  totalItems: PropTypes.number,
};
