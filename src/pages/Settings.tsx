import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ProfileSection from '../components/ProfileSection';
import BusinessSettingsSection from '../components/BusinessSettingsSection';
import TeamMembersSection from '../components/TeamMembersSection';

interface BusinessSettings {
    business_name: string;
    business_address: string;
    business_phone: string;
    tax_rate: string;
    [key: string]: unknown;
}

interface TeamMember {
    id: string;
    username: string;
    full_name: string | null;
    role: string;
    created_at: string;
    [key: string]: unknown;
}

const Settings = () => {
    const { profile, user } = useAuthStore();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMember, setNewMember] = useState({ username: '', password: '', fullName: '' });
    const [addingMember, setAddingMember] = useState(false);

    const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
        business_name: 'Kadé',
        business_address: '',
        business_phone: '',
        tax_rate: '0',
    });
    const [savingBusiness, setSavingBusiness] = useState(false);

    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*');
        if (data) {
            const map: Record<string, string> = {};
            data.forEach(s => { map[s.key] = s.value; });
            setBusinessSettings(prev => ({ ...prev, ...map }));
        }
    };

    const fetchTeam = async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at');
        if (data) setTeam(data as TeamMember[]);
    };

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
        }
        if (profile?.role === 'admin') {
            fetchTeam();
            fetchSettings();
        }
    }, [profile]);

    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingBusiness(true);
        try {
            for (const [key, value] of Object.entries(businessSettings)) {
                await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            }
            toast.success('Business settings saved');
        } catch (err) {
            console.error('Save settings error:', err);
            toast.error('Failed to save settings');
        }
        setSavingBusiness(false);
    };

    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', user!.id);

        if (error) {
            toast.error('Failed to update profile');
        } else {
            toast.success('Profile updated successfully');
        }
        setLoading(false);
    };

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
            toast.error('Failed to create team member: ' + (error as Error).message);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProfileSection
                    username={profile?.username || ''}
                    role={profile?.role || ''}
                    fullName={fullName}
                    onFullNameChange={setFullName}
                    onSave={updateProfile}
                    loading={loading}
                />

                {profile?.role === 'admin' && (
                    <BusinessSettingsSection
                        settings={businessSettings}
                        onSettingsChange={(s) => setBusinessSettings({ ...businessSettings, ...s })}
                        onSave={saveSettings}
                        saving={savingBusiness}
                    />
                )}

                {profile?.role === 'admin' && (
                    <TeamMembersSection
                        team={team}
                        showAddMember={showAddMember}
                        onShowAddMember={setShowAddMember}
                        newMember={newMember}
                        onNewMemberChange={setNewMember}
                        onAddMember={addTeamMember}
                        addingMember={addingMember}
                    />
                )}
            </div>
        </div>
    );
};

export default Settings;
