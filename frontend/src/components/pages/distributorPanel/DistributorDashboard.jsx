import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, Users } from 'lucide-react'; // Removed CheckCircle
import DashboardSummaryLayout from '../../global/DashboardSummaryLayout';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributors`;

export default function DistributorDashboard() {
    const { user } = useContext(AuthContext);
    const [productCount, setProductCount] = useState(0); // This will now store available products
    const [soldCount, setSoldCount] = useState(0);
    const [dealerCount, setDealerCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.distributor) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch products and filter for available ones
                const productsResponse = await axios.get(`${API_URL}/${user.distributor._id}/products`);
                const products = productsResponse.data;
                const availableProducts = products.filter(p => !p.sold && !p.assignedTo);
                setProductCount(availableProducts.length); // Set productCount to available products
                
                // Count sold products
                const soldProductsCount = products.filter(p => p.sold).length;
                setSoldCount(soldProductsCount);

                // Fetch dealer count
                const dealersResponse = await axios.get(`${API_URL}/${user.distributor._id}/dealers`);
                setDealerCount(dealersResponse.data.length);

            } catch (error) {
                toast.error('Error fetching dashboard data');
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const cardData = [
        { title: 'Available Products', count: productCount, icon: <Package className="w-5 h-5" />, bg: '#EF4444', path: '/distributor/products' },
        { title: 'Sold Products', count: soldCount, icon: <Package className="w-5 h-5" />, bg: '#10B981', path: '/distributor/dealer-sales' },
        { title: 'Total Dealers', count: dealerCount, icon: <Users className="w-5 h-5" />, bg: '#FB923C', path: '/distributor/dealers' },
    ];

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Distributor Dashboard</h1>
            <DashboardSummaryLayout
                greetingTitle="Good to see you"
                greetingName={user?.distributor?.name || user?.username || 'Distributor'}
                greetingMessage="Your distributor workspace is ready. Track available stock, sold products, and your dealer network from one place."
                cards={cardData}
                loading={loading}
            />
        </div>
    );
}
