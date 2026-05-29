import React, { useMemo, useState } from 'react';
import { Box, X } from 'lucide-react';

export default function DistributorProductGroupList({ products }) {
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [activeModelId, setActiveModelId] = useState(null);

    const modelGroups = useMemo(() => {
        const map = {};
        products.forEach(p => {
            const mid = p.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: p.model || { name: 'Unknown' }, count: 0, items: [] };
            map[mid].count += 1;
            map[mid].items.push(p);
        });
        return Object.values(map);
    }, [products]);

    const openModelModal = (modelId) => {
        setActiveModelId(modelId);
        setIsModelModalOpen(true);
    };

    if (!modelGroups || modelGroups.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No products found for this distributor
            </div>
        );
    }

    const modalProducts = products.filter(p => p.model?._id === activeModelId);

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Products</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {modelGroups.map((mg) => (
                            <tr key={mg.model?._id || mg.model.name} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mg.model?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button
                                        onClick={() => openModelModal(mg.model?._id)}
                                        className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                                    >
                                        <Box className="h-4 w-4 mr-1" />
                                        {mg.count || 0} Total Products
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModelModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsModelModalOpen(false)}></div>
                    <div className="relative z-10 flex h-[calc(100vh-4rem)] w-[calc(100vw-4rem)] max-w-[90vw] flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
                        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Model Details: {modelGroups.find(m => m.model?._id === activeModelId)?.model?.name || 'Details'}
                            </h3>
                            <button onClick={() => setIsModelModalOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Box Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {modalProducts.map((p) => (
                                            <tr key={p._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.productName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.serialNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.unitsPerBox}N</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.factory?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.sold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        {p.sold ? 'Sold' : 'In Stock'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
