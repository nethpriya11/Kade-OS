import React from 'react';
import { Building2, MapPin, Phone, Percent, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface BusinessSettings {
    business_name: string;
    business_address: string;
    business_phone: string;
    tax_rate: string;
}

interface BusinessSettingsSectionProps {
    settings: BusinessSettings;
    onSettingsChange: (s: BusinessSettings) => void;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
}

const BusinessSettingsSection = ({ settings, onSettingsChange, onSave, saving }: BusinessSettingsSectionProps) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="glass p-6 rounded-3xl"
    >
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <Building2 className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-text">Business Settings</h2>
        </div>

        <form onSubmit={onSave} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-text-muted ml-1 flex items-center gap-1">
                    <Building2 size={14} /> Business Name
                </label>
                <input
                    type="text"
                    value={settings.business_name}
                    onChange={e => onSettingsChange({ ...settings, business_name: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-primary/50 transition-all mt-1"
                />
            </div>
            <div>
                <label className="text-sm font-bold text-text-muted ml-1 flex items-center gap-1">
                    <MapPin size={14} /> Address
                </label>
                <input
                    type="text"
                    value={settings.business_address}
                    onChange={e => onSettingsChange({ ...settings, business_address: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-primary/50 transition-all mt-1"
                    placeholder="Business address for receipts"
                />
            </div>
            <div>
                <label className="text-sm font-bold text-text-muted ml-1 flex items-center gap-1">
                    <Phone size={14} /> Phone
                </label>
                <input
                    type="text"
                    value={settings.business_phone}
                    onChange={e => onSettingsChange({ ...settings, business_phone: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-primary/50 transition-all mt-1"
                    placeholder="Phone number for receipts"
                />
            </div>
            <div>
                <label className="text-sm font-bold text-text-muted ml-1 flex items-center gap-1">
                    <Percent size={14} /> Tax Rate (%)
                </label>
                <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.tax_rate}
                    onChange={e => onSettingsChange({ ...settings, tax_rate: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-primary/50 transition-all mt-1"
                    placeholder="e.g. 10"
                />
                <p className="text-xs text-text-muted mt-1">Applied to all POS orders. Set to 0 to disable tax.</p>
            </div>
            <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-bg font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all mt-4"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Business Settings'}
            </button>
        </form>
    </motion.div>
);

export default BusinessSettingsSection;
