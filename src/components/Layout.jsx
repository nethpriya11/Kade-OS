import React, { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, ShoppingBag, Settings as SettingsIcon, Utensils, FileText, TrendingUp, LogOut, Menu } from 'lucide-react';
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

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-bg text-text font-sans flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border z-30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">K</div>
                    <span className="font-bold text-lg">Kadé</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-text">
                    {isMobileMenuOpen ? <LogOut className="rotate-180" /> : <Menu />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full p-6">
                    {/* Logo (Desktop) */}
                    <div className="hidden md:flex flex-col items-center mb-10">
                        <div className="flex items-center gap-3 w-full mb-2">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">K</div>
                            <div>
                                <h1 className="font-bold text-lg leading-none">Kadé</h1>
                                <span className="text-xs text-text-muted">Fast-Casual</span>
                            </div>
                        </div>
                        {profile && (
                            <div className="mt-4 px-3 py-1 bg-surface-hover rounded-full text-xs font-bold text-primary border border-primary/20 uppercase tracking-wider w-full text-center">
                                {profile.role}
                            </div>
                        )}
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 space-y-2 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => `
                                    flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all duration-300
                                    ${isActive
                                        ? 'bg-primary text-bg font-bold shadow-lg shadow-primary/20'
                                        : 'text-text-muted hover:bg-surface-hover hover:text-text'}
                                `}
                            >
                                <item.icon size={20} strokeWidth={2} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Bottom Actions */}
                    <div className="mt-auto pt-6 border-t border-border space-y-2">
                        <NavLink
                            to="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
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
                </div>
            </aside>

            {/* Overlay for mobile */}
            {
                isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )
            }

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 relative w-full">
                {/* Background Gradient Blob */}
                <div className="fixed top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary opacity-5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />
                <div className="fixed bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-secondary opacity-5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto pb-20 md:pb-0">
                    <Outlet />
                </div>
            </main>
        </div >
    );
};

export default Layout;
