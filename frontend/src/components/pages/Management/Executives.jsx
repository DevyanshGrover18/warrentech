import { useEffect, useMemo, useState, useRef } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import {
  Box,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ExportToExcelButton from "../../global/ExportToExcelButton";
import ExportToPdfButton from "../../global/ExportToPdfButton";
import { confirmDelete } from "../../global/deleteConfirm";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  username: "",
  password: "",
  state: "",
  city: "",
  gstNumber: "",
  contactPerson: "",
  status: "Active",
  assignedDistributors: [],
};

const executiveColumns = [
  { header: "ID", accessor: "ID" },
  { header: "Name", accessor: "Name" },
  { header: "City", accessor: "City" },
  { header: "State", accessor: "State" },
  { header: "Contact Phone", accessor: "Contact Phone" },
  { header: "Distributors Count", accessor: "Distributors Count" },
  { header: "Dealers Count", accessor: "Dealers Count" },
];

// ─── Multi-select Dealers Dropdown (portal so it escapes modal overflow) ────
function DealerMultiSelect({
  dealers,
  selectedIds,
  onChange,
  disabled,
  loading,
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const openDropdown = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(dealers.length * 40 + 8, 200);
    const openUpward =
      spaceBelow < estimatedHeight + 8 && rect.top > estimatedHeight + 8;
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      )
        setOpen(false);
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const selectedNames = dealers
    .filter((d) => selectedIds.includes(d._id))
    .map((d) => d.name);

  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <>
      <div ref={triggerRef} className="w-full">
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => {
            if (!disabled && !loading) {
              open ? setOpen(false) : openDropdown();
            }
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm text-left transition-colors ${
            disabled
              ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
              : loading
                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-wait"
                : open
                  ? "bg-white border-[#4d55f5] text-gray-700 ring-2 ring-[#4d55f5] ring-opacity-20"
                  : "bg-white border-gray-300 text-gray-700 hover:border-[#4d55f5] cursor-pointer"
          }`}
        >
          <span className="truncate">
            {disabled
              ? "Select a distributor first"
              : loading
                ? "Loading dealers..."
                : selectedNames.length > 0
                  ? `Dealers (${selectedNames.length})`
                  : dealers.length === 0
                    ? "No dealers available"
                    : "Select dealers"}
          </span>
          {loading ? (
            <div className="h-4 w-4 flex-shrink-0 ml-2 animate-spin rounded-full border-2 border-gray-300 border-t-[#4d55f5]" />
          ) : (
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 ml-2 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>
      </div>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto"
          >
            {dealers.length > 0 ? (
              dealers.map((dealer) => (
                <div
                  key={dealer._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggle(dealer._id);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 select-none"
                >
                  <div
                    className={`h-4 w-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                      selectedIds.includes(dealer._id)
                        ? "bg-[#4d55f5] border-[#4d55f5]"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedIds.includes(dealer._id) && (
                      <Check
                        className="h-2.5 w-2.5 text-white"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                  <span>{dealer.name}</span>
                  {dealer.dealerId && (
                    <span className="ml-auto text-xs text-gray-400">
                      {dealer.dealerId}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="px-3 py-2.5 text-sm text-gray-400">
                No dealers available
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── Distributor Row ──────────────────────────────────────────────────────────
function DistributorRow({
  row,
  index,
  availableDistributors,
  onDistributorChange,
  onDealersChange,
  onRemove,
}) {
  const [dealers, setDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(false);

  useEffect(() => {
    if (!row.distributorId) {
      setDealers([]);
      return;
    }
    const fetchDealers = async () => {
      setLoadingDealers(true);
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/distributors/${row.distributorId}/dealers`,
        );
        setDealers(data || []);
      } catch {
        setDealers([]);
      } finally {
        setLoadingDealers(false);
      }
    };
    fetchDealers();
  }, [row.distributorId]);

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
      <select
        value={row.distributorId}
        onChange={(e) => onDistributorChange(index, e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
      >
        <option value="">Select distributor</option>
        {availableDistributors.map((dist) => (
          <option key={dist._id} value={dist._id}>
            {dist.name} {dist.distributorId ? `(${dist.distributorId})` : ""}
          </option>
        ))}
      </select>

      <DealerMultiSelect
        dealers={dealers}
        selectedIds={row.dealerIds}
        onChange={(ids) => onDealersChange(index, ids)}
        disabled={!row.distributorId}
        loading={loadingDealers}
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Executives() {
  const [executives, setExecutives] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDistributorsModal, setShowDistributorsModal] = useState(false);
  const [showDealersModal, setShowDealersModal] = useState(false);
  const [selectedExecutiveDetails, setSelectedExecutiveDetails] =
    useState(null);

  // Each row: { distributorId: string, dealerIds: string[] }
  const [distributorRows, setDistributorRows] = useState([
    { distributorId: "", dealerIds: [] },
  ]);

  const fetchExecutives = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/executive${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      );
      setExecutives(data);
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch executives",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceSearch = setTimeout(() => {
      fetchExecutives();
    }, 300);
    return () => clearTimeout(debounceSearch);
  }, [search]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/distributors`)
      .then(({ data }) => setDistributors(data));
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/locations/states`,
        );
        setStates(data);
      } catch (error) {
        toast.error("Failed to fetch states");
      }
    };
    fetchStates();
  }, []);

  const fetchCities = async (state) => {
    if (!state) {
      setCities([]);
      return;
    }
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/locations/cities/${state}`,
      );
      setCities(data);
    } catch (error) {
      toast.error("Failed to fetch cities");
      setCities([]);
    }
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(executives.length / itemsPerPage)),
    [executives.length, itemsPerPage],
  );
  const paginatedExecutives = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return executives.slice(startIndex, startIndex + itemsPerPage);
  }, [executives, currentPage, itemsPerPage]);

  // IDs already assigned in any row (to exclude from other rows' dropdowns)
  const assignedDistributorIds = useMemo(
    () => new Set(distributorRows.map((r) => r.distributorId).filter(Boolean)),
    [distributorRows],
  );

  // For a given row index, the distributors available = all distributors MINUS those
  // assigned in OTHER rows
  const getAvailableDistributors = (rowIndex) => {
    return distributors.filter(
      (d) =>
        !assignedDistributorIds.has(d._id) ||
        d._id === distributorRows[rowIndex].distributorId,
    );
  };

  const handleDistributorChange = (index, distributorId) => {
    setDistributorRows((rows) =>
      rows.map((r, i) => (i === index ? { distributorId, dealerIds: [] } : r)),
    );
  };

  const handleDealersChange = (index, dealerIds) => {
    setDistributorRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, dealerIds } : r)),
    );
  };

  const addRow = () => {
    setDistributorRows((rows) => [
      ...rows,
      { distributorId: "", dealerIds: [] },
    ]);
  };

  const removeRow = (index) => {
    setDistributorRows((rows) => rows.filter((_, i) => i !== index));
  };

  const getExportData = () => {
    return executives.map((executive) => ({
      ID: executive.executiveId || "-",
      Name: executive.name || "-",
      City: executive.city || "-",
      State: executive.state || "-",
      "Contact Phone": executive.contactPhone || "-",
      "Distributors Count": executive.distributorCount || 0,
      "Dealers Count": executive.dealerCount || 0,
    }));
  };

  const handleViewDistributors = (executive) => {
    setSelectedExecutiveDetails(executive);
    setShowDistributorsModal(true);
  };

  const handleViewDealers = (executive) => {
    setSelectedExecutiveDetails(executive);
    setShowDealersModal(true);
  };

  const selectedExecutiveDealers = useMemo(() => {
    if (!selectedExecutiveDetails?.distributors?.length) return [];
    return selectedExecutiveDetails.distributors.flatMap((distributor) =>
      (distributor.dealers || []).map((dealer) => ({
        ...dealer,
        distributorName: distributor.name,
        distributorId: distributor.distributorId,
      })),
    );
  }, [selectedExecutiveDetails]);

  const resetForm = () => {
    setForm(emptyForm);
    setCities([]);
    setIsEditing(false);
    setSelectedExecutive(null);
    setDistributorRows([{ distributorId: "", dealerIds: [] }]);
  };

  const openEdit = (executive) => {
    setSelectedExecutive(executive);
    setIsEditing(true);
    setForm({
      name: executive.name || "",
      email: executive.email || "",
      phone: executive.contactPhone || "",
      address: executive.address || "",
      username: executive.username || "",
      password: "",
      state: executive.state || "",
      city: executive.city || "",
      gstNumber: executive.gstNumber || "",
      contactPerson: executive.contactPerson || "",
      status: executive.status || "Active",
      assignedDistributors: [],
    });

    // Rebuild rows from the executive's distributors (which now include populated dealers)
    const rows = (executive.distributors || []).map((dist) => ({
      distributorId: dist._id,
      dealerIds: (dist.dealers || []).map((d) => d._id),
    }));
    setDistributorRows(
      rows.length > 0 ? rows : [{ distributorId: "", dealerIds: [] }],
    );

    fetchCities(executive.state || "");
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();

    // Build assignedDistributors payload from rows
    const assignedDistributors = distributorRows
      .filter((r) => r.distributorId)
      .map((r) => ({ distributorId: r.distributorId, dealerIds: r.dealerIds }));

    const payload = { ...form, assignedDistributors };
    if (!payload.password) delete payload.password;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/executive/${selectedExecutive._id}`,
          payload,
        );
        toast.success("Executive updated successfully");
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/executive`,
          payload,
        );
        toast.success("Executive created successfully");
      }
      setShowModal(false);
      resetForm();
      fetchExecutives();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save executive");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExecutive = async (executiveId) => {
    const executive = executives.find((item) => item._id === executiveId);
    const confirmed = await confirmDelete({
      entityLabel: "executive",
      itemName: executive?.name,
    });
    if (!confirmed) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/executive/${executiveId}`,
      );
      toast.success("Executive deleted successfully");
      fetchExecutives();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete executive",
      );
    }
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="p-2">
      <div className="p-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 lg:p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Executive List
                </h2>
                <p className="text-sm text-gray-600">
                  Total {executives.length}
                </p>
              </div>
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full lg:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <ExportToExcelButton
                    getData={getExportData}
                    filename="executives-export"
                  />
                  <ExportToPdfButton
                    getData={getExportData}
                    columns={executiveColumns}
                    filename="executives-export"
                  />
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="flex items-center justify-center space-x-2 bg-[#4d55f5] text-white px-4 py-2 rounded-lg hover:bg-[#3d45e5] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Executive</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading executives...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Distributors
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dealers
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedExecutives.length > 0 ? (
                        paginatedExecutives.map((executive) => (
                          <tr key={executive._id}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {executive.executiveId}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {executive.name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <p>{executive.city || "-"}</p>
                                <p className="text-gray-500">
                                  {executive.state || "-"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <p>{executive.contactPerson || "-"}</p>
                                <p className="text-gray-500">
                                  {executive.contactPhone || "-"}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() =>
                                  handleViewDistributors(executive)
                                }
                                className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                              >
                                <Box className="h-4 w-4 mr-1" />
                                {executive.distributorCount || 0} Distributors
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleViewDealers(executive)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                              >
                                <Box className="h-4 w-4 mr-1" />
                                {executive.dealerCount || 0} Dealers
                              </button>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEdit(executive)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <Edit className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => removeExecutive(executive._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            No executives found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {paginatedExecutives.length > 0 ? (
                    paginatedExecutives.map((executive) => (
                      <div
                        key={executive._id}
                        className="border border-gray-200 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {executive.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {executive.executiveId}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(executive)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => removeExecutive(executive._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">City</p>
                            <p className="text-gray-900">
                              {executive.city || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">State</p>
                            <p className="text-gray-900">
                              {executive.state || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Distributors</p>
                            <button
                              onClick={() => handleViewDistributors(executive)}
                              className="inline-flex items-center px-2.5 py-1.5 mt-1 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                            >
                              <Box className="h-4 w-4 mr-1" />
                              {executive.distributorCount || 0} Distributors
                            </button>
                          </div>
                          <div>
                            <p className="text-gray-500">Dealers</p>
                            <button
                              onClick={() => handleViewDealers(executive)}
                              className="inline-flex items-center px-2.5 py-1.5 mt-1 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                            >
                              <Box className="h-4 w-4 mr-1" />
                              {executive.dealerCount || 0} Dealers
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500">
                      No executives found
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {executives.length > 0 && (
                  <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="text-sm text-gray-700">entries</span>
                    </div>
                    <div className="w-full md:w-auto flex items-center justify-between md:justify-end space-x-2">
                      <div className="text-sm text-gray-700 md:hidden">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-700 hidden md:inline">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-4 w-full max-w-md lg:max-w-5xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Edit Executive" : "Add New Executive"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, name: e.target.value }))
                    }
                    placeholder="Enter executive name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    required
                    value={form.state}
                    onChange={(e) => {
                      setForm((c) => ({
                        ...c,
                        state: e.target.value,
                        city: "",
                      }));
                      fetchCities(e.target.value);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <select
                    required
                    value={form.city}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, city: e.target.value }))
                    }
                    disabled={!form.state}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, address: e.target.value }))
                    }
                    placeholder="Enter address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.gstNumber}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, gstNumber: e.target.value }))
                    }
                    placeholder="Enter GST Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contactPerson}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, contactPerson: e.target.value }))
                    }
                    placeholder="Enter contact person name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, phone: e.target.value }))
                    }
                    placeholder="Enter phone"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, email: e.target.value }))
                    }
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, username: e.target.value }))
                    }
                    placeholder="Enter username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password {isEditing ? "" : "*"}
                  </label>
                  <input
                    type="password"
                    required={!isEditing}
                    value={form.password}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, password: e.target.value }))
                    }
                    placeholder={
                      isEditing
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={form.status}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, status: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* ── Assigned Distributors (row-wise) ── */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Assigned Distributors
                  </label>
                  <button
                    type="button"
                    onClick={addRow}
                    disabled={
                      assignedDistributorIds.size >= distributors.length
                    }
                    className="flex items-center gap-1.5 text-sm text-[#4d55f5] hover:text-[#3d45e5] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Distributor
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2 px-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Distributor
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Dealers{" "}
                    {distributorRows.some((r) => r.dealerIds.length > 0)
                      ? `(${distributorRows.reduce((sum, r) => sum + r.dealerIds.length, 0)})`
                      : ""}
                  </span>
                  <span className="w-8" />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {distributorRows.map((row, index) => (
                    <DistributorRow
                      key={index}
                      row={row}
                      index={index}
                      availableDistributors={getAvailableDistributors(index)}
                      onDistributorChange={handleDistributorChange}
                      onDealersChange={handleDealersChange}
                      onRemove={removeRow}
                    />
                  ))}
                </div>

                {distributorRows.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                    No distributors assigned. Click "Add Distributor" to begin.
                  </div>
                )}
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-[#8B8FFF] text-white rounded-xl hover:bg-[#7B7FFF] transition-colors font-medium flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : isEditing ? (
                    "Update Executive"
                  ) : (
                    "Add Executive"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Distributors Modal ── */}
      {showDistributorsModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg lg:max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Distributors for {selectedExecutiveDetails?.name}
              </h3>
              <button
                onClick={() => {
                  setShowDistributorsModal(false);
                  setSelectedExecutiveDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4">
              {selectedExecutiveDetails?.distributors?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Distributor ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Dealers
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedExecutiveDetails.distributors.map(
                        (distributor) => (
                          <tr key={distributor._id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {distributor.distributorId}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {distributor.name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {distributor.city || "-"},{" "}
                              {distributor.state || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {distributor.dealers?.length || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${distributor.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {distributor.status}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No assigned distributors found for this executive
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dealers Modal ── */}
      {showDealersModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg lg:max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Dealers for {selectedExecutiveDetails?.name}
              </h3>
              <button
                onClick={() => {
                  setShowDealersModal(false);
                  setSelectedExecutiveDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4">
              {selectedExecutiveDealers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Dealer ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Distributor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedExecutiveDealers.map((dealer) => (
                        <tr key={dealer._id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {dealer.dealerId}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {dealer.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <p>{dealer.distributorName}</p>
                              <p className="text-gray-500">
                                {dealer.distributorId}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {dealer.city || "-"}, {dealer.state || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <p>{dealer.contactPerson || "-"}</p>
                              <p className="text-gray-500">
                                {dealer.contactPhone || "-"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${dealer.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              {dealer.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No dealers found for this executive
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
