import React from 'react';
import { Users, UserPlus, Shield, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface TeamMember {
    id: string;
    username: string;
    full_name: string | null;
    role: string;
    [key: string]: unknown;
}

interface TeamMembersSectionProps {
    team: TeamMember[];
    showAddMember: boolean;
    onShowAddMember: (show: boolean) => void;
    newMember: { username: string; password: string; fullName: string };
    onNewMemberChange: (m: { username: string; password: string; fullName: string }) => void;
    onAddMember: (e: React.FormEvent) => void;
    addingMember: boolean;
}

const TeamMembersSection = ({ team, showAddMember, onShowAddMember, newMember, onNewMemberChange, onAddMember, addingMember }: TeamMembersSectionProps) => (
    <>
        {showAddMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-text">Add Team Member</h2>
                        <button onClick={() => onShowAddMember(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={onAddMember} className="space-y-4">
                        <div>
                            <label className="block text-text-muted text-sm font-bold mb-1">Username</label>
                            <input
                                type="text"
                                value={newMember.username}
                                onChange={(e) => onNewMemberChange({ ...newMember, username: e.target.value })}
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
                                onChange={(e) => onNewMemberChange({ ...newMember, password: e.target.value })}
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
                                onChange={(e) => onNewMemberChange({ ...newMember, fullName: e.target.value })}
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => onShowAddMember(false)}
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
                    onClick={() => onShowAddMember(true)}
                    className="bg-secondary text-bg p-2 rounded-lg hover:scale-105 transition-transform"
                >
                    <UserPlus size={20} />
                </button>
            </div>

            <div className="space-y-3">
                {team.map((member: TeamMember) => (
                    <div key={member.id} className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {(member.username as string)?.[0]?.toUpperCase()}
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
    </>
);

export default TeamMembersSection;
