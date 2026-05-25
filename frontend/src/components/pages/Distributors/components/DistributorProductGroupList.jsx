import React, { useState } from 'react';
import { X } from 'lucide-react';
import { groupProductsByConfiguration, getOrderTypeDisplay } from '../utils';
import { distributorDealerProductService } from '../../../../services/distributorDealerProductService';
import { distributorSalesService } from '../../../../services/distributorSalesService';
import SaleModal from '../../Dealers/components/SaleModal'; // Import SaleModal
import { toast } from 'react-hot-toast';
import './TableList.css';

export default function DistributorProductGroupList({ products, dealers, distributor, selectedProductGroups = [], setSelectedProductGroups, onSaleSuccess }) {
    const groupedProducts = groupProductsByConfiguration(products);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState('');
    // customerDetails state is no longer needed here as SaleModal manages its own state
    // const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '' });

    const handleAssignClick = () => {
        setShowAssignModal(true);
    };

    const handleSellClick = () => {
        setShowSellModal(true);
    };

    const handleAssign = async () => {
        if (!selectedDealer) {
            toast.error('Please select a dealer');
            return;
        }

        try {
            for (const group of selectedProductGroups) {
                for (const product of group.productsInBox) {
                    await distributorDealerProductService.assignProductToDealer({
                        distributorId: distributor._id,
                        dealerId: selectedDealer,
                        productId: product._id
                    });
                }
            }
            toast.success('Products assigned successfully');
            setShowAssignModal(false);
            if (setSelectedProductGroups) setSelectedProductGroups([]);
            setSelectedDealer('');
            if (onSaleSuccess) onSaleSuccess(); // Trigger re-fetch in parent
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning products');
            console.error('Error:', error);
        }
    };

    const handleSellToCustomer = async (saleData) => {
        const { customerName, customerPhone, customerEmail, customerAddress, customerState, customerCity, plumberName, plumberPhone, productSelection: groupsToSell } = saleData;

        if (!customerName || !customerPhone) {
            toast.error('Customer name and phone are required.');
            return;
        }

        if (!groupsToSell || (Array.isArray(groupsToSell) && groupsToSell.length === 0)) {
            toast.error('No products selected for sale.');
            return;
        }

        const productIdsToSell = (Array.isArray(groupsToSell) ? groupsToSell : [groupsToSell]).flatMap(group =>
            group.productsInBox.map(product => product._id)
        );

        try {
            await distributorSalesService.sellToCustomer({
                productIds: productIdsToSell,
                distributorId: distributor._id,
                customerName,
                customerPhone,
                customerEmail,
                customerAddress,
                customerState,
                customerCity,
                plumberName,
                plumberPhone
            });
            toast.success(`${productIdsToSell.length} products sold successfully!`);
            setShowSellModal(false);
            if (setSelectedProductGroups) setSelectedProductGroups([]);
            if (onSaleSuccess) onSaleSuccess(); // Trigger re-fetch in parent
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error selling products.');
            console.error('Error selling products:', error);
        }
    };

    const handleSelectAll = (e) => {
        if (!setSelectedProductGroups) return;
        if (e.target.checked) {
            setSelectedProductGroups(groupedProducts);
        } else {
            setSelectedProductGroups([]);
        }
    };

    const handleSelectRow = (e, productGroup) => {
        if (!setSelectedProductGroups) return;
        if (e.target.checked) {
            setSelectedProductGroups([...selectedProductGroups, productGroup]);
        } else {
            setSelectedProductGroups(selectedProductGroups.filter(group => group._id !== productGroup._id));
        }
    };

    if (groupedProducts.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No products found for this distributor
            </div>
        );
    }

    return (
        <>
            {selectedProductGroups && selectedProductGroups.length > 0 && (
                <div className="mb-4 flex space-x-2">
                    <button
                        onClick={handleAssignClick}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#4d55f5] hover:bg-[#3d45e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4d55f5]"
                    >
                        Assign to Dealer ({selectedProductGroups.length})
                    </button>
                    <button
                        onClick={handleSellClick}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        Sell to Customer ({selectedProductGroups.length})
                    </button>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 responsive-table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input type="checkbox" onChange={handleSelectAll} />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Box Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Numbers</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned to</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {groupedProducts.map((group) => {
                            const isAssigned = group.productsInBox.some(p => p.assignedTo);
                            const isSold = group.productsInBox.every(p => p.sold);
                            return (
                                <tr
                                    key={group._id}
                                    className={`hover:bg-gray-50 ${(isAssigned || isSold) ? 'bg-gray-100 text-gray-500' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Select">
                                        <input type="checkbox" onChange={(e) => handleSelectRow(e, group)} checked={selectedProductGroups && selectedProductGroups.some(g => g._id === group._id)} disabled={isAssigned} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" data-label="Product Name">{group.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Box Type">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderTypeDisplay(group.orderType).bgColor} ${getOrderTypeDisplay(group.orderType).textColor}`}>
                                            {getOrderTypeDisplay(group.orderType).label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Serial Numbers">
                                        {group.productsInBox.map(product => (
                                            <div key={product._id}>{product.serialNumber}</div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Model">{group.model?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Factory">{group.factory?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap" data-label="Status">
                                        {(() => {
                                            const allSold = group.productsInBox.every(p => p.sold);
                                            const partiallySold = group.productsInBox.some(p => p.sold) && !allSold;
                                            const firstStatus = group.productsInBox[0]?.status;
                                            const pillClass = allSold
                                                ? 'bg-red-100 text-red-800'
                                                : partiallySold
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : firstStatus === 'Active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800';
                                            const label = allSold ? 'Sold' : partiallySold ? 'Partially Sold' : firstStatus || 'Not Sold';

                                            return (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${pillClass}`}>
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Assigned to">
                                        {isAssigned ? group.productsInBox[0].assignedTo : 'Not Assigned'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {showAssignModal && (
                <div className="fixed inset-0 bg-black/70 bg-opacity-20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Assign {selectedProductGroups.length} Product Groups to Dealer
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    if (setSelectedProductGroups) setSelectedProductGroups([]);
                                    setSelectedDealer('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="mt-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Dealer</label>
                                <select
                                    value={selectedDealer}
                                    onChange={(e) => setSelectedDealer(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                >
                                    <option value="">Select a dealer</option>
                                    {dealers.map(dealer => (
                                        <option key={dealer._id} value={dealer._id}>{dealer.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAssign}
                                className="w-full px-6 py-3 bg-[#8B8FFF] text-white rounded-xl hover:bg-[#7B7FFF] transition-colors font-medium"
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SaleModal
                isOpen={showSellModal}
                onClose={() => setShowSellModal(false)}
                productSelection={selectedProductGroups}
                onSale={handleSellToCustomer}
            />
        </>
    );
}
