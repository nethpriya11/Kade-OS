import React, { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, ShoppingBag, Settings as SettingsIcon, Utensils, FileText, TrendingUp, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Layout = () => {
    const { profile, signOut } = useAuthStore();

    // Define all items with their required roles
    const allNavItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
        { to: '/pos', icon: ShoppingCart, label: 'POS', roles: ['admin', 'staff'] },
        { to: '/orders', icon: FileText, label: 'Orders', roles: ['admin', 'staff'] },
        { to: '/analytics', icon: TrendingUp, label: 'Analytics', roles: ['admin'] },
        { to: '/menu', icon: Utensils, label: 'Menu & Recipes', roles: ['admin'] },
        { to: '/inventory', icon: Package, label: 'Inventory', roles: ['admin'] },
        { to: '/procurement', icon: ShoppingBag, label: 'Procurement', roles: ['admin'] },
    ];

    // Filter items based on current user role
    const navItems = allNavItems.filter(item =>
        profile?.role && item.roles.includes(profile.role)
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-bg text-text font-sans flex-col md:flex-row">
            {/* Sidebar / Bottom Nav */}
            <aside className="w-full md:w-64 h-20 md:h-full bg-surface border-b md:border-b-0 md:border-r border-border flex flex-row md:flex-col items-center justify-between md:justify-start px-6 md:px-0 md:py-8 z-20 order-2 md:order-1 shadow-2xl shadow-black/50">
                <div className="hidden md:flex flex-col items-center mb-12 px-6 w-full">
                    <div className="flex items-center gap-3 w-full mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">K</div>
                        <div>
                            <h1 className="font-bold text-lg leading-none">Kadé</h1>
                            <span className="text-xs text-text-muted">Fast-Casual</span>
                        </div>
                    </div>
                    {profile && (
                        <div className="mt-4 px-3 py-1 bg-surface-hover rounded-full text-xs font-bold text-primary border border-primary/20 uppercase tracking-wider">
                            {profile.role}
                        </div>
                    )}
                </div>

                <nav className="flex flex-row md:flex-col gap-2 md:gap-2 w-full justify-around md:justify-start items-center md:px-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all duration-300
                ${isActive
                                    ? 'bg-primary text-bg font-bold shadow-lg shadow-primary/20'
                                    : 'text-text-muted hover:bg-surface-hover hover:text-text'}
              `}
                        >
                            <item.icon size={20} strokeWidth={2} />
                            <span className="hidden md:block">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden md:block mt-auto px-4 w-full space-y-2">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `
                            flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-colors
                            ${isActive ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text hover:bg-surface-hover'}
                        `}
                    >
                        <SettingsIcon size={20} />
                        <span className="font-medium">Settings</span>
                    </NavLink>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-4 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 relative order-1 md:order-2">
                {/* Background Gradient Blob for premium feel */}
                <div className="fixed top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary opacity-5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />
                <div className="fixed bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-secondary opacity-5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto pb-20 md:pb-0">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
