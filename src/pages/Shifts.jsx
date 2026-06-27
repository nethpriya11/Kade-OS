import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Clock, LogIn, LogOut, Users, Calendar, Timer, ChevronDown, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const formatDuration = (minutes) => {
    if (!minutes) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

const formatTime = (ts) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (ts) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const Shifts = () => {
    const { profile, user } = useAuthStore();
    const [activeShift, setActiveShift] = useState(null);
    const [allShifts, setAllShifts] = useState([]);
    const [teamShifts, setTeamShifts] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [clockingOut, setClockingOut] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState('my');

    useEffect(() => {
        fetchData();

        const sub = supabase
            .channel('shifts_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, fetchData)
            .subscribe();

        return () => sub.unsubscribe();
    }, [user]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        // Fetch my active shift
        const { data: active } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', user.id)
            .is('clock_out', null)
            .maybeSingle();

        setActiveShift(active);

        // Fetch my shift history
        const { data: myShifts } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', user.id)
            .order('clock_in', { ascending: false })
            .limit(30);

        setAllShifts(myShifts || []);

        // Admin: fetch all team shifts
        if (profile?.role === 'admin') {
            const start = new Date(filterDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filterDate);
            end.setHours(23, 59, 59, 999);

            const { data: team } = await supabase
                .from('shifts')
                .select('*')
                .gte('clock_in', start.toISOString())
                .lte('clock_in', end.toISOString())
                .order('clock_in', { ascending: false });

            setTeamShifts(team || []);

            // Fetch profiles for display
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, username, role');

            if (profilesData) {
                const map = {};
                profilesData.forEach(p => (map[p.id] = p));
                setProfiles(map);
            }
        }

        setLoading(false);
    };

    useEffect(() => {
        if (profile?.role === 'admin') fetchData();
    }, [filterDate]);

    const handleClockIn = async () => {
        const { data, error } = await supabase
            .from('shifts')
            .insert({ user_id: user.id, clock_in: new Date().toISOString() })
            .select()
            .single();

        if (error) {
            toast.error('Failed to clock in');
        } else {
            setActiveShift(data);
            toast.success('Clocked in successfully!');
        }
    };

    const handleClockOut = async () => {
        if (!activeShift) return;
        setClockingOut(true);

        const { error } = await supabase
            .from('shifts')
            .update({ clock_out: new Date().toISOString() })
            .eq('id', activeShift.id);

        if (error) {
            toast.error('Failed to clock out');
        } else {
            setActiveShift(null);
            toast.success('Clocked out successfully!');
            fetchData();
        }
        setClockingOut(false);
    };

    // Live elapsed time
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        if (!activeShift) return;
        const interval = setInterval(() => {
            const diff = new Date() - new Date(activeShift.clock_in);
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [activeShift]);

    const totalHoursThisWeek = allShifts
        .filter(s => {
            const d = new Date(s.clock_in);
            const now = new Date();
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return d >= weekAgo;
        })
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    return (
        <div className="max-w-5xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-4"
            >
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Clock size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-text">Shifts</h1>
                    <p className="text-text-muted">Track staff attendance and working hours.</p>
                </div>
            </motion.header>

            {/* Clock In/Out Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`glass p-8 rounded-3xl mb-8 relative overflow-hidden border-2 transition-colors ${activeShift ? 'border-green-500/30' : 'border-border'}`}
            >
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-5 blur-3xl bg-primary" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${activeShift ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                            <span className="font-bold text-text-muted uppercase tracking-wider text-sm">
                                {activeShift ? 'On Shift' : 'Off Duty'}
                            </span>
                        </div>
                        <p className="text-text-muted text-sm">
                            {activeShift
                                ? `Started at ${formatTime(activeShift.clock_in)}`
                                : 'You are not clocked in'}
                        </p>
                        {activeShift && (
                            <div className="text-5xl font-mono font-bold text-primary mt-3 tracking-widest">
                                {elapsed}
                            </div>
                        )}
                    </div>

                    {activeShift ? (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleClockOut}
                            disabled={clockingOut}
                            className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all"
                        >
                            <LogOut size={22} />
                            {clockingOut ? 'Clocking Out...' : 'Clock Out'}
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleClockIn}
                            className="flex items-center gap-3 bg-primary text-bg px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                        >
                            <LogIn size={22} />
                            Clock In
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="glass p-5 rounded-2xl">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-bold mb-1">This Week</p>
                    <p className="text-2xl font-bold text-text">{formatDuration(totalHoursThisWeek)}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="glass p-5 rounded-2xl">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-bold mb-1">Total Shifts</p>
                    <p className="text-2xl font-bold text-text">{allShifts.length}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="glass p-5 rounded-2xl col-span-2 md:col-span-1">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-bold mb-1">Avg Shift</p>
                    <p className="text-2xl font-bold text-text">
                        {allShifts.filter(s => s.duration_minutes).length > 0
                            ? formatDuration(Math.round(allShifts.filter(s => s.duration_minutes).reduce((a, s) => a + s.duration_minutes, 0) / allShifts.filter(s => s.duration_minutes).length))
                            : '--'}
                    </p>
                </motion.div>
            </div>

            {/* Tabs – Admin sees team view */}
            {profile?.role === 'admin' && (
                <div className="flex gap-2 mb-6">
                    {['my', 'team'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-xl font-bold text-sm capitalize transition-colors ${activeTab === tab ? 'bg-primary text-bg' : 'text-text-muted hover:text-text bg-surface border border-border'}`}
                        >
                            {tab === 'my' ? 'My Shifts' : 'Team View'}
                        </button>
                    ))}
                </div>
            )}

            {/* My Shift History */}
            {activeTab === 'my' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center gap-3">
                        <Calendar size={20} className="text-primary" />
                        <h2 className="font-bold text-text text-lg">My Shift History</h2>
                    </div>
                    <div className="divide-y divide-border/50">
                        {loading ? (
                            <div className="p-8 text-center text-text-muted">Loading...</div>
                        ) : allShifts.length === 0 ? (
                            <div className="p-8 text-center text-text-muted">No shifts recorded yet.</div>
                        ) : allShifts.map((shift, i) => (
                            <motion.div
                                key={shift.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
                            >
                                <div>
                                    <p className="font-bold text-text">{formatDate(shift.clock_in)}</p>
                                    <p className="text-sm text-text-muted mt-0.5">
                                        {formatTime(shift.clock_in)} → {formatTime(shift.clock_out) || <span className="text-green-400">Active</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {shift.clock_out ? (
                                        <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg text-sm">
                                            {formatDuration(shift.duration_minutes)}
                                        </span>
                                    ) : (
                                        <span className="font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-lg text-sm animate-pulse">Active</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Admin Team View */}
            {activeTab === 'team' && profile?.role === 'admin' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="text-text-muted text-sm font-bold">Date:</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-surface border border-border rounded-xl px-4 py-2 text-text focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <div className="glass rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center gap-3">
                            <Users size={20} className="text-secondary" />
                            <h2 className="font-bold text-text text-lg">Team Shifts – {new Date(filterDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                        </div>
                        {teamShifts.length === 0 ? (
                            <div className="p-8 text-center text-text-muted">No shifts for this date.</div>
                        ) : teamShifts.map((shift, i) => {
                            const member = profiles[shift.user_id];
                            return (
                                <motion.div
                                    key={shift.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-center justify-between p-5 border-b border-border/50 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {member?.username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-text">{member?.full_name || member?.username || 'Unknown'}</p>
                                            <p className="text-sm text-text-muted">
                                                {formatTime(shift.clock_in)} → {formatTime(shift.clock_out) || <span className="text-green-400">Active</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-bold px-3 py-1 rounded-lg text-sm ${shift.clock_out ? 'bg-primary/10 text-primary' : 'bg-green-400/10 text-green-400 animate-pulse'}`}>
                                        {shift.clock_out ? formatDuration(shift.duration_minutes) : 'Active'}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Shifts;
