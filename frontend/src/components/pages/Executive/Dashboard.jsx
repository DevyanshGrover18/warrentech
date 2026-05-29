import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, Users, RefreshCw, BarChart2 } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import DashboardSummaryLayout from '../../global/DashboardSummaryLayout';

export default function ExecutiveDashboard() {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({
        products: 0,
        distributors: 0,
        dealers: 0,
        customers: 0,
        replacementRequests: 0,
        sales: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/executive-stats`);
                setStats(data);
            } catch (error) {
                toast.error('Error fetching dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const cardData = [
        { title: 'Assigned Products', count: stats.products, icon: <Package className="w-5 h-5" />, bg: '#EF4444', path: '/executive/inventory' },
        { title: 'Assigned Distributors', count: stats.distributors, icon: <Users className="w-5 h-5" />, bg: '#F59E0B', path: '/executive/distributors' },
        { title: 'Total Dealers', count: stats.dealers, icon: <Users className="w-5 h-5" />, bg: '#FB923C', path: '/executive/dealers' },
        { title: 'Total Customers', count: stats.customers, icon: <Users className="w-5 h-5" />, bg: '#0EA5E9', path: '/executive/customers' },
        { title: 'Sold Products', count: stats.sales, icon: <BarChart2 className="w-5 h-5" />, bg: '#10B981', path: '/executive/sales' },
        { title: 'Replacement Requests', count: stats.replacementRequests, icon: <RefreshCw className="w-5 h-5" />, bg: '#8B5CF6', path: '/executive/replacement' },
    ];

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Executive Dashboard</h1>
            <DashboardSummaryLayout
                greetingTitle="Good to see you"
                greetingName={user?.executive?.name || user?.username || 'Executive'}
                greetingMessage="Your assigned territory is ready. Review products, distributors, dealers, customers, sales, and replacement work at a glance."
                cards={cardData}
                loading={loading}
            />
        </div>
    );
}
