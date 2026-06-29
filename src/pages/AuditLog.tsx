import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { History, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

interface AuditEntry {
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
    profile?: { username: string; full_name: string } | null;
}

const PAGE_SIZE = 50;

const ENTITY_TYPE_COLORS: Record<string, string> = {
    auth: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    order: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ingredient: 'bg-green-500/10 text-green-400 border-green-500/20',
    wastage: 'bg-red-500/10 text-red-400 border-red-500/20',
    procurement: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const AuditLog = () => {
    const { profile } = useAuthStore();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filterEntity, setFilterEntity] = useState('All');
    const [filterAction, setFilterAction] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLogs = async (pageNum: number) => {
        setLoading(true);
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
            .from('audit_logs')
            .select('*, profile:user_id(username, full_name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (filterEntity !== 'All') {
            query = query.eq('entity_type', filterEntity);
        }
        if (filterAction) {
            query = query.ilike('action', `%${filterAction}%`);
        }

        const { data, count } = await query;
        if (data) setEntries(data as unknown as AuditEntry[]);
        setHasMore(count !== null && from + PAGE_SIZE < count);
        setLoading(false);
    };

    useEffect(() => {
        setPage(0);
        fetchLogs(0);
    }, [filterEntity, filterAction]);

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const filteredEntries = searchQuery
        ? entries.filter(e =>
            (e.entity_id?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (e.action?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (e.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : entries;

    const entityTypes = ['All', 'auth', 'order', 'ingredient', 'wastage', 'procurement'];

    if (profile?.role !== 'admin') {
        return (
            <div className="h-[calc(100vh-40px)] flex items-center justify-center text-text-muted">
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-4"
            >
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <History size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-text">Audit Log</h1>
                    <p className="text-text-muted">Track all actions across the system.</p>
                </div>
            </motion.header>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2">
                    <Search size={16} className="text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search entity ID, action, user..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent text-text focus:outline-none text-sm w-52"
                    />
                </div>
                <div className="flex bg-surface border border-border rounded-xl p-1">
                    {entityTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterEntity(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors capitalize ${
                                filterEntity === type ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'
                            }`}
                        >
                            {type === 'All' ? 'All' : type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold text-text">Activity Log</h2>
                    <span className="text-xs text-text-muted">
                        {loading ? 'Loading...' : `${filteredEntries.length} entries`}
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-text-muted">Loading...</div>
                ) : filteredEntries.length === 0 ? (
                    <div className="p-10 text-center text-text-muted">No audit log entries found.</div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {filteredEntries.map((entry) => (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-5 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ENTITY_TYPE_COLORS[entry.entity_type] || 'bg-surface text-text-muted border-border'}`}>
                                                {entry.entity_type}
                                            </span>
                                            <span className="text-sm font-bold text-text">{entry.action.replace(/_/g, ' ')}</span>
                                            {entry.entity_id && (
                                                <span className="text-xs text-text-muted font-mono">#{entry.entity_id.slice(0, 8)}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-text-muted">
                                            <span>{entry.profile?.full_name || entry.profile?.username || 'System'}</span>
                                            <span>&middot;</span>
                                            <span>{new Date(entry.created_at).toLocaleString()}</span>
                                        </div>
                                        {entry.details && Object.keys(entry.details).length > 0 && (
                                            <pre className="mt-2 text-xs text-text-muted bg-bg rounded-lg p-2 overflow-x-auto max-h-20">
                                                {JSON.stringify(entry.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="p-4 border-t border-border flex items-center justify-between">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-xs text-text-muted">Page {page + 1}</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={!hasMore}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditLog;
