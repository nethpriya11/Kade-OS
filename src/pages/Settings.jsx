import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { User, Shield, Save, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const Settings = () => {
    const { profile, user, initialize } = useAuthStore();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [team, setTeam] = useState([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMember, setNewMember] = useState({ username: '', password: '', fullName: '' });
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
        }
        if (profile?.role === 'admin') {
            fetchTeam();
        }
    }, [profile]);

    const fetchTeam = async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at');
        if (data) setTeam(data);
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user.id);

        if (error) {
            toast.error('Failed to update profile');
        } else {
            toast.success('Profile updated successfully');
        }
        setLoading(false);
    };

    const addTeamMember = async (e) => {
        e.preventDefault();
        if (!newMember.username || !newMember.password) {
            toast.error('Username and password are required');
            return;
        }

        setAddingMember(true);

        try {
            // Create a temporary client to sign up the new user without affecting the current session
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY
            );

            // Create new user using the temp client
            const { data: newUser, error: signUpError } = await tempSupabase.auth.signUp({
                email: `${newMember.username.toLowerCase().replace(/\s+/g, '')}@kade.com`,
                password: newMember.password,
            });

            if (signUpError) throw signUpError;

            // Update profile with full name if provided
            if (newMember.fullName && newUser.user) {
                // Wait a moment for trigger to fire
                await new Promise(resolve => setTimeout(resolve, 1000));

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ full_name: newMember.fullName })
                    .eq('id', newUser.user.id);

                if (updateError) console.error('Error updating name:', updateError);
            }

            toast.success(`Team member '${newMember.username}' created successfully!`);
            setShowAddMember(false);
            setNewMember({ username: '', password: '', fullName: '' });
            fetchTeam();
        } catch (error) {
            console.error('Error adding member:', error);
            toast.error('Failed to create team member: ' + error.message);
        } finally {
            setAddingMember(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
                <p className="text-text-muted">Manage your profile and team settings.</p>
            </motion.header>

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold text-text mb-6">Add Team Member</h2>
                        <form onSubmit={addTeamMember} className="space-y-4">
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newMember.username}
                                    onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g. john"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newMember.password}
                                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="Minimum 6 characters"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Full Name (Optional)</label>
                                <input
                                    type="text"
                                    value={newMember.fullName}
                                    onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMember(false)}
                                    className="flex-1 py-3 font-bold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingMember}
                                    className="flex-1 py-3 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {addingMember ? 'Creating...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass p-6 rounded-3xl"
                >
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <User className="text-primary" size={24} />
                        <h2 className="text-xl font-bold text-text">My Profile</h2>
                    </div>

                    <form onSubmit={updateProfile} className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-text-muted ml-1">Username</label>
                            <input
                                type="text"
                                value={profile?.username || ''}
                                disabled
                                className="w-full bg-surface/50 border border-border rounded-xl py-3 px-4 text-text-muted cursor-not-allowed mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-text-muted ml-1">Role</label>
                            <div className="flex items-center gap-2 mt-1 px-4 py-3 bg-surface/50 border border-border rounded-xl text-text-muted">
                                <Shield size={16} />
                                <span className="capitalize">{profile?.role}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-text-muted ml-1">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all mt-1"
                                placeholder="Enter your name"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-bg font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all mt-4"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </motion.div>

                {/* Team Section (Admin Only) */}
                {profile?.role === 'admin' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass p-6 rounded-3xl"
                    >
                        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                            <div className="flex items-center gap-3">
                                <Users className="text-secondary" size={24} />
                                <h2 className="text-xl font-bold text-text">Team Members</h2>
                            </div>
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="bg-secondary text-bg p-2 rounded-lg hover:scale-105 transition-transform"
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {team.map((member) => (
                                <div key={member.id} className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {member.username?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-text">{member.full_name || member.username}</div>
                                            <div className="text-xs text-text-muted capitalize">{member.role}</div>
                                        </div>
                                    </div>
                                    {member.role === 'admin' && <Shield size={16} className="text-secondary" />}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Settings;
