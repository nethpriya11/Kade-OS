import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X, AlertTriangle, ShoppingBag, Package, Clock } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const NOTIF_KEY = 'kade_notifications';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
}

const saveNotifs = (notifs: Notification[]) => {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs)); } catch { /* ignore */ }
};
const loadNotifs = (): Notification[] => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
};

const NOTIF_ICONS: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string; bg: string }> = {
    low_stock: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
    new_order: { icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
    restock: { icon: Package, color: 'text-green-400', bg: 'bg-green-400/10' },
    shift: { icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
};

let globalAddNotif: ((notif: Omit<Notification, 'id' | 'time' | 'read'>) => void) | null = null;

export const addNotification = (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    if (globalAddNotif) globalAddNotif(notif);
};

const NotificationsPanel = () => {
    const [open, setOpen] = useState(false);
    const [notifs, setNotifs] = useState<Notification[]>(loadNotifs);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        globalAddNotif = (notif) => {
            const n: Notification = { ...notif, id: Date.now(), time: new Date().toISOString(), read: false };
            setNotifs(prev => {
                const updated = [n, ...prev].slice(0, 50);
                saveNotifs(updated);
                return updated;
            });
        };
        return () => { globalAddNotif = null; };
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel('notif_watcher')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                addNotification({
                    type: 'new_order',
                    title: 'New Order',
                    message: `Order #${(payload.new as { id?: string }).id?.slice(0, 4)} placed • LKR ${(payload.new as { total_amount?: number }).total_amount}`,
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ingredients' }, (payload) => {
                const newData = payload.new as { current_stock?: number; low_stock_threshold?: number; name?: string; unit?: string };
                if ((newData.current_stock ?? 0) < (newData.low_stock_threshold || 5)) {
                    addNotification({
                        type: 'low_stock',
                        title: 'Low Stock Alert',
                        message: `${newData.name} is low (${newData.current_stock} ${newData.unit} remaining)`,
                    });
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shifts' }, () => {
                addNotification({
                    type: 'shift',
                    title: 'Staff Clocked In',
                    message: 'A team member just started their shift.',
                });
            })
            .subscribe((_status: string) => { /* noop */ });

        return () => { channel.unsubscribe(); };
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = notifs.filter(n => !n.read).length;

    const markAllRead = useCallback(() => {
        const updated = notifs.map(n => ({ ...n, read: true }));
        setNotifs(updated);
        saveNotifs(updated);
    }, [notifs]);

    const dismiss = useCallback((id: number) => {
        const updated = notifs.filter(n => n.id !== id);
        setNotifs(updated);
        saveNotifs(updated);
    }, [notifs]);

    const clearAll = useCallback(() => {
        setNotifs([]);
        saveNotifs([]);
    }, []);

    const markRead = useCallback((id: number) => {
        const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifs(updated);
        saveNotifs(updated);
    }, [notifs]);

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-colors text-text-muted hover:text-text"
                title="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="font-bold text-text">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {notifs.length > 0 && (
                                    <button onClick={clearAll} className="text-xs text-text-muted hover:text-red-400 transition-colors">Clear all</button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notifs.length === 0 ? (
                                <div className="py-10 text-center text-text-muted text-sm">
                                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                                    No notifications
                                </div>
                            ) : notifs.map(notif => {
                                const cfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.new_order;
                                const Icon = cfg.icon;
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex items-start gap-3 px-5 py-3.5 border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-white/3' : ''}`}
                                        onClick={() => markRead(notif.id)}
                                    >
                                        <div className={`p-2 rounded-xl ${cfg.bg} ${cfg.color} flex-shrink-0 mt-0.5`}>
                                            <Icon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-text text-sm">{notif.title}</p>
                                                {!notif.read && <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />}
                                            </div>
                                            <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{notif.message}</p>
                                            <p className="text-text-muted text-xs mt-1 opacity-50">
                                                {new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                                            className="flex-shrink-0 p-1 text-text-muted hover:text-text rounded-lg transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationsPanel;
