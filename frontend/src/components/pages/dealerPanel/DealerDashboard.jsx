import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package } from 'lucide-react';
import DashboardSummaryLayout from '../../global/DashboardSummaryLayout';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributor-dealer-products/dealer`;
const SUB_DEALER_API_URL = `${import.meta.env.VITE_API_URL}/api/dealer-sub-dealer-products`;

export default function DealerDashboard() {
    const { user } = useContext(AuthContext);
    const [productCount, setProductCount] = useState(0);
    const [soldCount, setSoldCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const isSubDealer = user?.role === 'sub_dealer';
    const entityId = isSubDealer ? (user?.subDealer?._id || user?.subDealer) : (user?.dealer?._id || user?.dealer);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !entityId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const url = isSubDealer 
                    ? `${SUB_DEALER_API_URL}/${entityId}`
                    : `${API_URL}/${entityId}/products`;
                
                const response = await axios.get(url);
                const products = Array.isArray(response.data) ? response.data : [];
                
                // Count available (not sold) products
                const availableCount = products.filter(p => isSubDealer ? !p.product?.sold : !p.sold).length;
                setProductCount(availableCount);
                
                // Count sold products
                const soldCount = products.filter(p => isSubDealer ? p.product?.sold : p.sold).length;
                setSoldCount(soldCount);

            } catch (error) {
                toast.error('Error fetching dashboard data');
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, entityId, isSubDealer]);

    const basePath = isSubDealer ? '/sub-dealer' : '/dealer';

    const cardData = [
        { title: 'Available Products', count: productCount, icon: <Package className="w-5 h-5" />, bg: '#EF4444', path: `${basePath}/products` },
        { title: 'Sold Products', count: soldCount, icon: <Package className="w-5 h-5" />, bg: '#10B981', path: `${basePath}/sales` },
    ];

    return (
        <div className="p-4">
            <DashboardSummaryLayout
                greetingTitle="Welcome back"
                greetingName={
                    isSubDealer
                        ? user?.subDealer?.name || user?.username || 'Sub Dealer'
                        : user?.dealer?.name || user?.username || 'Dealer'
                }
                greetingMessage="Your sales desk is ready. Keep an eye on available inventory and recently sold products before you move to the next order."
                cards={cardData}
                loading={loading}
            />
        </div>
    );
}
