import { useState, useEffect, useContext } from 'react';
import { LayoutDashboard, Clock, CheckCircle, Briefcase } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';
import DashboardSummaryLayout from '../../global/DashboardSummaryLayout';

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

    const cardData = [
        { title: 'Total Jobs', count: stats.total, icon: <Briefcase className="w-5 h-5" />, bg: '#3B82F6', path: '/technician/requests' },
        { title: 'New Jobs', count: stats.assigned, icon: <Clock className="w-5 h-5" />, bg: '#6366F1', path: '/technician/requests?status=Assigned' },
        { title: 'In Progress', count: stats.inProgress, icon: <LayoutDashboard className="w-5 h-5" />, bg: '#FFA000', path: '/technician/requests?status=In Progress' },
        { title: 'Completed Jobs', count: stats.completed, icon: <CheckCircle className="w-5 h-5" />, bg: '#10B981', path: '/technician/requests?status=Completed' },
    ];

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Technician Dashboard</h1>
            <DashboardSummaryLayout
                greetingTitle="Welcome back"
                greetingName={user?.name || user?.username || 'Technician'}
                greetingMessage="Your service queue is ready. Review new assignments, jobs in progress, and completed work before heading into the next task."
                cards={cardData}
                loading={loading}
            />
        </div>
    );
}
