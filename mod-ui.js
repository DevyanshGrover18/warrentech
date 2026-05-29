const fs = require('fs');
const file = 'frontend/src/components/pages/Management/Executives.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Sub Dealers Count to columns
content = content.replace(
  '{ header: "Dealers Count", accessor: "Dealers Count" },',
  '{ header: "Dealers Count", accessor: "Dealers Count" },\n  { header: "Sub Dealers Count", accessor: "Sub Dealers Count" },'
);

// 2. Clone DealerMultiSelect to create SubDealerMultiSelect
const dmsStart = content.indexOf('function DealerMultiSelect(');
const dmsEnd = content.indexOf('// ─── Distributor Row');
if (dmsStart !== -1 && dmsEnd !== -1) {
  let subDms = content.substring(dmsStart, dmsEnd);
  subDms = subDms.replace(/DealerMultiSelect/g, 'SubDealerMultiSelect');
  subDms = subDms.replace(/dealers/g, 'subDealers');
  subDms = subDms.replace(/dealer\./g, 'subDealer.');
  subDms = subDms.replace(/Dealers \(/g, 'Sub Dealers (');
  subDms = subDms.replace(/No dealers/g, 'No sub dealers');
  subDms = subDms.replace(/Loading dealers/g, 'Loading sub dealers');
  subDms = subDms.replace(/Select dealers/g, 'Select sub dealers');
  subDms = subDms.replace(/dealerId/g, 'subDealerId');
  
  content = content.slice(0, dmsEnd) + subDms + '\n' + content.slice(dmsEnd);
}

// 3. Update DistributorRow props
content = content.replace(
  'onDealersChange,\n  onRemove,',
  'onDealersChange,\n  onSubDealersChange,\n  onRemove,'
);

// 4. Update DistributorRow State & Fetch
const drUseEffect = `
  const [subDealers, setSubDealers] = useState([]);
  const [loadingSubDealers, setLoadingSubDealers] = useState(false);

  useEffect(() => {
    if (!row.dealerIds || row.dealerIds.length === 0) {
      setSubDealers([]);
      return;
    }
    const fetchSubDealers = async () => {
      setLoadingSubDealers(true);
      try {
        const { data } = await axios.get(
          \`\${import.meta.env.VITE_API_URL}/api/sub-dealers?dealerIds=\${row.dealerIds.join(',')}\`
        );
        setSubDealers(data || []);
      } catch {
        setSubDealers([]);
      } finally {
        setLoadingSubDealers(false);
      }
    };
    fetchSubDealers();
  }, [row.dealerIds]);
`;
content = content.replace(
  'const [loadingDealers, setLoadingDealers] = useState(false);',
  'const [loadingDealers, setLoadingDealers] = useState(false);\n' + drUseEffect
);

// 5. Update grid columns in DistributorRow
content = content.replace(
  'className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"',
  'className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center"'
);

// 6. Add SubDealerMultiSelect inside DistributorRow
const sdmJSX = `
      <SubDealerMultiSelect
        subDealers={subDealers}
        selectedIds={row.subDealerIds || []}
        onChange={(ids) => onSubDealersChange(index, ids)}
        disabled={!row.dealerIds?.length}
        loading={loadingSubDealers}
      />
`;
content = content.replace(
  'loading={loadingDealers}\n      />\n\n      <button',
  'loading={loadingDealers}\n      />\n' + sdmJSX + '\n      <button'
);

// 7. Update initial rows
content = content.replace(
  'const [distributorRows, setDistributorRows] = useState([\n    { distributorId: "", dealerIds: [] },\n  ]);',
  'const [distributorRows, setDistributorRows] = useState([\n    { distributorId: "", dealerIds: [], subDealerIds: [] },\n  ]);'
);

content = content.replace(
  'rows.map((r, i) => (i === index ? { distributorId, dealerIds: [] } : r))',
  'rows.map((r, i) => (i === index ? { distributorId, dealerIds: [], subDealerIds: [] } : r))'
);

content = content.replace(
  'rows.map((r, i) => (i === index ? { ...r, dealerIds } : r))',
  'rows.map((r, i) => (i === index ? { ...r, dealerIds, subDealerIds: [] } : r))'
);

// Add handleSubDealersChange
const hsdc = `
  const handleSubDealersChange = (index, subDealerIds) => {
    setDistributorRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, subDealerIds } : r))
    );
  };
`;
content = content.replace(
  'const addRow = () => {',
  hsdc + '\n  const addRow = () => {'
);

// Update addRow
content = content.replace(
  '{ distributorId: "", dealerIds: [] },',
  '{ distributorId: "", dealerIds: [], subDealerIds: [] },'
);
content = content.replace(
  '{ distributorId: "", dealerIds: [] }',
  '{ distributorId: "", dealerIds: [], subDealerIds: [] }'
);
content = content.replace(
  'setDistributorRows([{ distributorId: "", dealerIds: [] }]);',
  'setDistributorRows([{ distributorId: "", dealerIds: [], subDealerIds: [] }]);'
);

// 8. Update payload submission
content = content.replace(
  '.map((r) => ({ distributorId: r.distributorId, dealerIds: r.dealerIds }));',
  '.map((r) => ({ distributorId: r.distributorId, dealerIds: r.dealerIds, subDealers: r.subDealerIds }));'
);

// 9. Fix getExportData
content = content.replace(
  '"Dealers Count": executive.dealerCount || 0,',
  '"Dealers Count": executive.dealerCount || 0,\n      "Sub Dealers Count": executive.subDealerCount || 0,'
);

// 10. Fix openEdit rows rebuild
content = content.replace(
  'dealerIds: (dist.dealers || []).map((d) => d._id),',
  'dealerIds: (dist.dealers || []).map((d) => d._id),\n      subDealerIds: (dist.subDealers || []).map((d) => d._id),'
);

// 11. Fix Headers in Modal
content = content.replace(
  '<div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2 px-1">',
  '<div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2 px-1">'
);
content = content.replace(
  ' : ""}\n                  </span>\n                  <span className="w-8" />',
  ' : ""}\n                  </span>\n                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">\n                    Sub Dealers{" "}\n                    {distributorRows.some((r) => r.subDealerIds && r.subDealerIds.length > 0)\n                      ? `(${distributorRows.reduce((sum, r) => sum + ((r.subDealerIds && r.subDealerIds.length) || 0), 0)})`\n                      : ""}\n                  </span>\n                  <span className="w-8" />'
);

// 12. Add onSubDealersChange to DistributorRow component props inside JSX
content = content.replace(
  'onDealersChange={handleDealersChange}',
  'onDealersChange={handleDealersChange}\n                      onSubDealersChange={handleSubDealersChange}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Modifications applied');
