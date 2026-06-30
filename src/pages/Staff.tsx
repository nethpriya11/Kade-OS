import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Users, UserPlus, Shield, Trash2, Save, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface TeamMember {
    id: string;
    username: string;
    full_name: string;
    role: string;
    created_at: string;
    [key: string]: unknown;
}

const Staff = () => {
    const { profile } = useAuthStore();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMember, setNewMember] = useState({ username: '', password: '', fullName: '' });
    const [addingMember, setAddingMember] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ full_name: '', role: '' });

    const fetchTeam = async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at');
        if (data) setTeam(data as TeamMember[]);
    };

    useEffect(() => {
        fetchTeam();
        const channel = supabase
            .channel('staff_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchTeam)
            .subscribe((_status: string) => { /* noop */ });
        return () => { channel.unsubscribe(); };
    }, []);

    const addTeamMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMember.username || !newMember.password) {
            toast.error('Username and password are required');
            return;
        }
        setAddingMember(true);
        try {
            const { data: newUser, error: signUpError } = await supabase.auth.signUp({
                email: `${newMember.username.toLowerCase().replace(/\s+/g, '')}@kade.com`,
                password: newMember.password,
            });

            if (signUpError) throw signUpError;

            if (newMember.fullName && newUser.user) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await supabase.from('profiles').update({ full_name: newMember.fullName }).eq('id', newUser.user.id);
            }

            toast.success(`Team member '${newMember.username}' created!`);
            setShowAddMember(false);
            setNewMember({ username: '', password: '', fullName: '' });
            fetchTeam();
        } catch (error: unknown) {
            const err = error as Error;
            toast.error('Failed to create team member: ' + err.message);
        } finally {
            setAddingMember(false);
        }
    };

    const startEdit = (member: TeamMember) => {
        setEditId(member.id);
        setEditValues({ full_name: member.full_name || '', role: member.role });
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditValues({ full_name: '', role: '' });
    };

    const saveEdit = async (id: string) => {
        const { error } = await supabase.from('profiles').update(editValues).eq('id', id);
        if (error) {
            toast.error('Failed to update: ' + error.message);
        } else {
            toast.success('Staff updated');
            setEditId(null);
            fetchTeam();
        }
    };

    const deleteMember = async (id: string, username?: string) => {
        if (!confirm(`Remove ${username || 'this staff member'}? This cannot be undone.`)) return;

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
            toast.error('Failed to delete: ' + error.message);
        } else {
            toast.success('Staff member removed');
            fetchTeam();
        }
    };

    if (!profile || profile.role !== 'admin') {
        return (
            <div className="h-[calc(100vh-40px)] flex items-center justify-center text-text-muted">
                You need admin access to manage staff.
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 overflow-y-auto pb-20">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between bg-surface p-6 rounded-3xl border border-border shadow-sm"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/20 rounded-2xl text-secondary"><Users size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Staff Management</h1>
                        <p className="text-text-muted text-sm">{team.length} team member{team.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-bg rounded-xl font-bold hover:brightness-110 transition-all">
                    <UserPlus size={18} /> Add Staff
                </button>
            </motion.div>

            {showAddMember && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text">Add Staff Member</h2>
                            <button onClick={() => setShowAddMember(false)} className="p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={addTeamMember} className="space-y-4">
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Username</label>
                                <input type="text" value={newMember.username}
                                    onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g. john" required />
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Password</label>
                                <input type="password" value={newMember.password}
                                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="Min 6 characters" required minLength={6} />
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Full Name</label>
                                <input type="text" value={newMember.fullName}
                                    onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g. John Doe" />
                            </div>
                            <button type="submit" disabled={addingMember}
                                className="w-full bg-secondary text-bg font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50">
                                {addingMember ? 'Creating...' : 'Create Staff Member'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="bg-surface border border-border rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-text-muted text-sm border-b border-border">
                                <th className="p-4 font-bold">User</th>
                                <th className="p-4 font-bold">Username</th>
                                <th className="p-4 font-bold">Role</th>
                                <th className="p-4 font-bold">Joined</th>
                                <th className="p-4 font-bold"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {team.map(member => (
                                <tr key={member.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                                {member.username?.[0]?.toUpperCase()}
                                            </div>
                                            {editId === member.id ? (
                                                <input type="text" value={editValues.full_name}
                                                    onChange={e => setEditValues({ ...editValues, full_name: e.target.value })}
                                                    className="bg-bg border border-border rounded-lg px-3 py-1.5 text-text text-sm focus:border-primary focus:outline-none w-36" />
                                            ) : (
                                                <span className="font-bold text-text">{member.full_name || member.username}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-text-muted">{member.username}</td>
                                    <td className="p-4">
                                        {editId === member.id ? (
                                            <div className="relative inline-block">
                                                <select value={editValues.role}
                                                    onChange={e => setEditValues({ ...editValues, role: e.target.value })}
                                                    className="bg-bg border border-border rounded-lg px-3 py-1.5 text-text text-sm focus:border-primary focus:outline-none appearance-none pr-8">
                                                    <option value="staff">Staff</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                            </div>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${member.role === 'admin' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                                {member.role === 'admin' && <Shield size={12} />}
                                                {member.role || 'staff'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-text-muted text-sm">
                                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : '\u2014'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 justify-end">
                                            {editId === member.id ? (
                                                <>
                                                    <button onClick={() => saveEdit(member.id)}
                                                        className="p-2 bg-green-400/10 text-green-400 rounded-lg hover:bg-green-400/20 transition-colors" title="Save">
                                                        <Save size={14} />
                                                    </button>
                                                    <button onClick={cancelEdit}
                                                        className="p-2 bg-surface-hover text-text-muted rounded-lg hover:text-text transition-colors" title="Cancel">
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(member)}
                                                        className="p-2 bg-bg rounded-lg hover:bg-primary hover:text-bg transition-colors text-text-muted" title="Edit">
                                                        <Save size={14} />
                                                    </button>
                                                    {member.id !== profile?.id && (
                                                        <button onClick={() => deleteMember(member.id, member.username)}
                                                            className="p-2 bg-red-400/5 text-red-400 rounded-lg hover:bg-red-400/20 transition-colors" title="Remove">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {team.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-text-muted">No team members found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Staff;
