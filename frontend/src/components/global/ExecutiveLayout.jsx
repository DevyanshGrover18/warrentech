import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import { ExecutiveSideBar } from '../sideBar/ExecutiveSideBar';

export default function ExecutiveLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <ErrorBoundary>
            <div className="flex h-full">
                <ExecutiveSideBar
                    sidebarOpen={sidebarOpen}
                    toggleSidebar={() => setSidebarOpen((open) => !open)}
                />
                <div className={`flex-grow overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-16'}`}>
                    <div className="p-4">
                        <Outlet />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
