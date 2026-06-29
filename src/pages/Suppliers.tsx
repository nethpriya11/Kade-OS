import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Plus, X, Save, Phone, Mail, MapPin, User, Trash2, Package } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Supplier {
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    [key: string]: unknown;
}

interface Ingredient {
    id: string;
    name: string;
    unit: string;
    purchase_price: number;
    [key: string]: unknown;
}

interface SupplierPrice {
    id: string;
    supplier_id: string;
    ingredient_id: string;
    price: number;
    min_order_qty: number;
    unit: string;
    [key: string]: unknown;
}

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);

    useEffect(() => {
        fetchSuppliers();
        fetchIngredients();
    }, []);

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('*').order('name');
        if (data) setSuppliers(data as Supplier[]);
        setLoading(false);
    };

    const fetchIngredients = async () => {
        const { data } = await supabase.from('ingredients').select('id, name, unit, purchase_price');
        if (data) setIngredients(data as Ingredient[]);
    };

    const fetchSupplierPrices = async (supplierId: string) => {
        const { data } = await supabase.from('supplier_prices').select('*').eq('supplier_id', supplierId);
        if (data) setSupplierPrices(data as SupplierPrice[]);
    };

    const openEdit = (supplier: Supplier) => {
        setEditingId(supplier.id);
        setForm({
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            notes: supplier.notes || '',
        });
        setShowForm(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
        setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Supplier name is required');
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                const { error } = await supabase.from('suppliers').update(form).eq('id', editingId);
                if (error) throw error;
                toast.success('Supplier updated');
            } else {
                const { error } = await supabase.from('suppliers').insert([form]);
                if (error) throw error;
                toast.success('Supplier created');
            }
            setShowForm(false);
            fetchSuppliers();
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Save supplier error:', error);
            toast.error(error.message || 'Failed to save supplier');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this supplier? This will also remove their pricing.')) return;
        try {
            await supabase.from('supplier_prices').delete().eq('supplier_id', id);
            await supabase.from('suppliers').delete().eq('id', id);
            toast.success('Supplier deleted');
            setSelectedSupplier(null);
            fetchSuppliers();
        } catch (err: unknown) {
            console.error('Delete error:', err);
            toast.error('Failed to delete supplier');
        }
    };

    const viewSupplier = async (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        await fetchSupplierPrices(supplier.id);
    };

    const updatePrice = async (ingredientId: string, field: string, value: string) => {
        if (!selectedSupplier) return;
        const existing = supplierPrices.find(p => p.ingredient_id === ingredientId);
        const newVal = parseFloat(value);

        try {
            if (existing) {
                await supabase.from('supplier_prices').update({ [field]: isNaN(newVal) ? 0 : newVal }).eq('id', existing.id);
            } else {
                await supabase.from('supplier_prices').insert([{
                    supplier_id: selectedSupplier.id,
                    ingredient_id: ingredientId,
                    price: field === 'price' ? (isNaN(newVal) ? 0 : newVal) : 0,
                    min_order_qty: field === 'min_order_qty' ? (isNaN(newVal) ? 0 : newVal) : 0,
                    unit: ingredients.find(i => i.id === ingredientId)?.unit || '',
                }]);
            }
            fetchSupplierPrices(selectedSupplier.id);
        } catch (err: unknown) {
            console.error('Price update error:', err);
            toast.error('Failed to update price');
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Building2 size={28} /></div>
                    <div>
                        <h1 className="text-3xl font-bold text-text">Suppliers</h1>
                        <p className="text-text-muted">Manage your ingredient suppliers and pricing.</p>
                    </div>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-bg font-bold px-5 py-2.5 rounded-xl hover:brightness-110 transition-all">
                    <Plus size={18} /> Add Supplier
                </button>
            </motion.header>

            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text">{editingId ? 'Edit Supplier' : 'New Supplier'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div><label className="text-sm font-bold text-text-muted mb-1 block">Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-bold text-text-muted mb-1 block flex items-center gap-1"><User size={14} /> Contact Person</label><input type="text" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none" /></div>
                                <div><label className="text-sm font-bold text-text-muted mb-1 block flex items-center gap-1"><Phone size={14} /> Phone</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none" /></div>
                            </div>
                            <div><label className="text-sm font-bold text-text-muted mb-1 block flex items-center gap-1"><Mail size={14} /> Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none" /></div>
                            <div><label className="text-sm font-bold text-text-muted mb-1 block flex items-center gap-1"><MapPin size={14} /> Address</label><input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none" /></div>
                            <div><label className="text-sm font-bold text-text-muted mb-1 block">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none" /></div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-text-muted hover:text-text rounded-xl font-medium">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-bg font-bold rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                                    <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 glass rounded-3xl p-4">
                    <h2 className="font-bold text-text mb-4 px-2">All Suppliers</h2>
                    {loading ? (
                        <div className="text-center py-8 text-text-muted">Loading...</div>
                    ) : suppliers.length === 0 ? (
                        <div className="text-center py-8 text-text-muted">No suppliers yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {suppliers.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => viewSupplier(s)}
                                    className={`w-full text-left p-3 rounded-xl transition-colors ${selectedSupplier?.id === s.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface-hover border border-transparent'}`}
                                >
                                    <div className="font-bold text-text">{s.name}</div>
                                    {s.contact_person && <div className="text-xs text-text-muted">{s.contact_person}</div>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 glass rounded-3xl p-6">
                    {!selectedSupplier ? (
                        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                            <Building2 size={48} className="mb-4 opacity-30" />
                            <p className="text-lg font-medium">Select a supplier to view details</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-text">{selectedSupplier.name}</h2>
                                    {selectedSupplier.contact_person && <p className="text-text-muted">{selectedSupplier.contact_person}</p>}
                                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-muted">
                                        {selectedSupplier.phone && <span className="flex items-center gap-1"><Phone size={14} /> {selectedSupplier.phone}</span>}
                                        {selectedSupplier.email && <span className="flex items-center gap-1"><Mail size={14} /> {selectedSupplier.email}</span>}
                                        {selectedSupplier.address && <span className="flex items-center gap-1"><MapPin size={14} /> {selectedSupplier.address}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(selectedSupplier)} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors" title="Edit"><Save size={16} /></button>
                                    <button onClick={() => handleDelete(selectedSupplier.id)} className="p-2 bg-red-400/10 text-red-400 rounded-xl hover:bg-red-400/20 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            {selectedSupplier.notes && (
                                <div className="bg-bg rounded-xl p-3 mb-6 text-sm text-text-muted border border-border">
                                    {selectedSupplier.notes}
                                </div>
                            )}

                            <h3 className="font-bold text-text mb-3 flex items-center gap-2"><Package size={16} /> Ingredient Pricing</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-text-muted text-sm border-b border-border">
                                            <th className="pb-3 font-bold">Ingredient</th>
                                            <th className="pb-3 font-bold">Unit</th>
                                            <th className="pb-3 font-bold">Price ({selectedSupplier.name})</th>
                                            <th className="pb-3 font-bold">Min Order</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map(ing => {
                                            const price = supplierPrices.find(p => p.ingredient_id === ing.id);
                                            return (
                                                <tr key={ing.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                                                    <td className="py-3 text-text font-medium">{ing.name}</td>
                                                    <td className="py-3 text-text-muted text-sm">{ing.unit}</td>
                                                    <td className="py-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={price?.price ?? ''}
                                                            placeholder={String(ing.purchase_price)}
                                                            onChange={e => updatePrice(ing.id, 'price', e.target.value)}
                                                            className="w-24 bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm focus:border-primary focus:outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={price?.min_order_qty ?? ''}
                                                            onChange={e => updatePrice(ing.id, 'min_order_qty', e.target.value)}
                                                            className="w-20 bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm focus:border-primary focus:outline-none"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Suppliers;
