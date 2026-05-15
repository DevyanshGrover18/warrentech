import { useState, useEffect, useContext } from 'react';
import { LayoutDashboard, Clock, CheckCircle, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';

export default function TechnicianDashboard() {
    const [stats, setStats] = useState({ total: 0, assigned: 0, inProgress: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const { user, refreshDashboardTrigger } = useContext(AuthContext);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user, refreshDashboardTrigger]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/technician-stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching technician stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
                <p className="text-gray-600 mt-2">Welcome back, {user?.username}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/technician/requests">
                    <div className="rounded-xl shadow-card p-6 text-white transition-transform hover:scale-102 h-full" style={{ background: '#3B82F6' }}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
                                    <Briefcase className="w-5 h-5" style={{ color: '#3B82F6' }} />
                                </div>
                                <h3 className="text-sm font-semibold mb-1 text-white/90">Total Jobs</h3>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link to="/technician/requests?status=Assigned">
                    <div className="rounded-xl shadow-card p-6 text-white transition-transform hover:scale-102 h-full" style={{ background: '#6366F1' }}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
                                    <Clock className="w-5 h-5" style={{ color: '#6366F1' }} />
                                </div>
                                <h3 className="text-sm font-semibold mb-1 text-white/90">New Jobs</h3>
                                <p className="text-2xl font-bold">{stats.assigned}</p>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link to="/technician/requests?status=In Progress">
                    <div className="rounded-xl shadow-card p-6 text-white transition-transform hover:scale-102 h-full" style={{ background: '#FFA000' }}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
                                    <LayoutDashboard className="w-5 h-5" style={{ color: '#FFA000' }} />
                                </div>
                                <h3 className="text-sm font-semibold mb-1 text-white/90">In Progress</h3>
                                <p className="text-2xl font-bold">{stats.inProgress}</p>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link to="/technician/requests?status=Completed">
                    <div className="rounded-xl shadow-card p-6 text-white transition-transform hover:scale-102 h-full" style={{ background: '#10B981' }}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
                                    <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                                </div>
                                <h3 className="text-sm font-semibold mb-1 text-white/90">Completed Jobs</h3>
                                <p className="text-2xl font-bold">{stats.completed}</p>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
