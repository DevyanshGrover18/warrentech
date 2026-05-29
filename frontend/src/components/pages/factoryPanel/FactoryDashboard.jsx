import { useState, useEffect, useContext } from 'react';
import { ShoppingCart, Bell, Clock } from 'lucide-react'; // Changed TrendingUp to Clock icon
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';
import { getNewOrdersCount } from '../FactoryManagement/services/factoryService'; // Import the new service
import DashboardSummaryLayout from '../../global/DashboardSummaryLayout';

export default function FactoryDashboard() {
    const [stats, setStats] = useState({ orders: 0, pendingOrders: 0, newOrders: 0 }); // Changed sales to pendingOrders
    const [loading, setLoading] = useState(true);
    const { user, refreshDashboardTrigger } = useContext(AuthContext); // Get user and refreshDashboardTrigger

    useEffect(() => {
        if (user?.factory?._id) {
            fetchStats();
        }
    }, [user, refreshDashboardTrigger]); // Added user and refreshDashboardTrigger to dependency array

    const fetchStats = async () => {
        try {
            setLoading(true);
            const factoryId = user.factory._id;

            const [ordersResponse, newOrdersCountResponse] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/factories/${factoryId}/orders`),
                getNewOrdersCount(factoryId) // Fetch new orders count
            ]);
            
            const orders = ordersResponse.data.length;
            const pendingOrders = ordersResponse.data.filter(order => order.status === 'Pending').length; // Calculate pending orders
            
            setStats({ orders, pendingOrders, newOrders: newOrdersCountResponse }); // Set pendingOrders
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Changed to 3 columns */}
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const cardData = [
        { title: 'Total Orders', count: stats.orders, icon: <ShoppingCart className="w-5 h-5" />, bg: '#3B82F6', path: '/factory/orders' },
        { title: 'New Orders', count: stats.newOrders, icon: <Bell className="w-5 h-5" />, bg: '#EF4444', path: '/factory/orders' },
        { title: 'Pending Orders', count: stats.pendingOrders, icon: <Clock className="w-5 h-5" />, bg: '#FFA000', path: '/factory/orders' },
    ];

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Factory Dashboard</h1>
            <DashboardSummaryLayout
                greetingTitle="Welcome back"
                greetingName={user?.factory?.name || user?.username || 'Factory'}
                greetingMessage="Your production desk is ready. Review incoming orders, new demand, and pending work before planning the next dispatch."
                cards={cardData}
                loading={loading}
            />
        </div>
    );
}
