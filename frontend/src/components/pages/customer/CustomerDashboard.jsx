import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, RefreshCw } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import DashboardSummaryLayout from '../../global/DashboardSummaryLayout';

export default function CustomerDashboard() {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ productsBought: 0, replacementRequests: 0 });

    useEffect(() => {
        const fetchCounts = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const [salesRes, requestsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/sales/customer`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/replacement-requests/customer`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

                setCounts({
                    productsBought: Array.isArray(salesRes.data) ? salesRes.data.length : 0,
                    replacementRequests: Array.isArray(requestsRes.data) ? requestsRes.data.length : 0
                });
            } catch (err) {
                console.error('Error fetching customer dashboard counts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCounts();
    }, []);

    const cards = [
        { title: 'Products Bought', count: counts.productsBought, icon: <ShoppingCart className="w-5 h-5" />, bg: '#0EA5E9', path: '/customer/purchases' },
        { title: 'Replacement Requests', count: counts.replacementRequests, icon: <RefreshCw className="w-5 h-5" />, bg: '#FB923C', path: '/customer/requests' }
    ];

    return (
        <div className="p-4">
            <div className="p-1 bg-white min-h-50 mt-3 rounded-xl">
                <div className="p-3 sm:p-6">
                    <h1 className="mb-5 font-bold text-lg">My Dashboard</h1>
                    <DashboardSummaryLayout
                        greetingTitle="Welcome back"
                        greetingName={user?.name || user?.username || 'Customer'}
                        greetingMessage="Your product space is ready. Check your purchases and replacement requests whenever you need them."
                        cards={cards}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
