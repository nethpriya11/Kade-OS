import React from 'react';
import { User, Shield, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileSectionProps {
    username: string;
    role: string;
    fullName: string;
    onFullNameChange: (val: string) => void;
    onSave: (e: React.FormEvent) => void;
    loading: boolean;
}

const ProfileSection = ({ username, role, fullName, onFullNameChange, onSave, loading }: ProfileSectionProps) => (
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

        <form onSubmit={onSave} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-text-muted ml-1">Username</label>
                <input
                    type="text"
                    value={username}
                    disabled
                    className="w-full bg-surface/50 border border-border rounded-xl py-3 px-4 text-text-muted cursor-not-allowed mt-1"
                />
            </div>
            <div>
                <label className="text-sm font-bold text-text-muted ml-1">Role</label>
                <div className="flex items-center gap-2 mt-1 px-4 py-3 bg-surface/50 border border-border rounded-xl text-text-muted">
                    <Shield size={16} />
                    <span className="capitalize">{role}</span>
                </div>
            </div>
            <div>
                <label className="text-sm font-bold text-text-muted ml-1">Full Name</label>
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => onFullNameChange(e.target.value)}
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
);

export default ProfileSection;
