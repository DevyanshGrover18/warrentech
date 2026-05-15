import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, Users, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ExecutiveDashboard() {
    const [stats, setStats] = useState({
        products: 0,
        distributors: 0,
        dealers: 0,
        customers: 0,
        replacementRequests: 0,
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
        { title: 'Replacement Requests', count: stats.replacementRequests, icon: <RefreshCw className="w-5 h-5" />, bg: '#10B981', path: '/executive/replacement' },
    ];

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Executive Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardData.map((card, index) => (
                    <Link to={card.path} key={index}>
                        <div className="rounded-xl shadow-card p-4 sm:p-6 text-white transition-transform hover:scale-102" style={{ background: card.bg }}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
                                        <span style={{ color: card.bg }}>{card.icon}</span>
                                    </div>
                                    <h3 className="text-sm font-semibold mb-1 text-white/90">{card.title}</h3>
                                    {loading ? (
                                        <div className="animate-pulse bg-white/20 h-8 w-16 rounded-md"></div>
                                    ) : (
                                        <p className="text-2xl sm:text-2xl font-bold">{card.count}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
