import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, ChefHat, X, Printer, Search, History } from 'lucide-react';
import { printReceipt } from '../utils/printReceipt';
import { motion, AnimatePresence } from 'framer-motion';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const deductedOrders = React.useRef(new Set());
  const [view, setView] = useState('active'); // 'active' | 'history'

  // History filters
  const [searchQuery, setSearchQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all'); // 'all' | 'completed' | 'cancelled'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('orders_kanban')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'history') fetchHistory();
  }, [view, historyStatus, dateFrom, dateTo]);

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items (*, menu_items (name))')
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (data) setOrders(data);
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items (*, menu_items (name))')
      .in('status', historyStatus === 'all' ? ['completed', 'cancelled'] : [historyStatus])
      .order('created_at', { ascending: false })
      .limit(200);

    if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      query = query.lt('created_at', end.toISOString());
    }

    const { data } = await query;
    if (data) setHistoryOrders(data);
    setHistoryLoading(false);
  }

  const updateStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);

    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));

    if (newStatus === 'completed' || newStatus === 'cancelled') {
      const order = orders.find(o => o.id === id);
      if (order && order.table_number) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'free', current_order_id: null, updated_at: new Date().toISOString() })
          .eq('table_number', order.table_number);
      }
    }

    if (newStatus === 'completed' && !deductedOrders.current.has(id)) {
      deductedOrders.current.add(id);
      const order = orders.find(o => o.id === id);
      if (order && order.order_items) {
        const deductionPromises = [];
        for (const item of order.order_items) {
          deductionPromises.push((async () => {
            const { data: recipe } = await supabase
              .from('recipes')
              .select('ingredient_id, quantity_required')
              .eq('menu_item_id', item.menu_item_id);

            if (recipe) {
              await Promise.all(recipe.map(r =>
                supabase.rpc('decrement_stock', { row_id: r.ingredient_id, amount: r.quantity_required * item.quantity })
              ));
            }
          })());
        }
        await Promise.all(deductionPromises);
      }
    }
  };

  const getTimeElapsed = (dateString) => {
    const diff = new Date() - new Date(dateString);
    return `${Math.floor(diff / 60000)} mins ago`;
  };

  const filteredHistory = historyOrders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.id?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      String(o.table_number || '').includes(q);
  });

  const KanbanColumn = ({ title, status, color, icon: Icon, count }) => (
    <div className="flex-1 flex flex-col bg-surface/50 rounded-3xl border border-border p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-text">{title}</h2>
          <span className="bg-bg px-3 py-1 rounded-full text-sm font-bold text-text-muted border border-border">{count}</span>
        </div>
        {Icon && <Icon className={`text-${color}`} size={24} />}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        <AnimatePresence mode='popLayout'>
          {orders.filter(o => o.status === status).map(order => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              key={order.id}
              className="bg-surface border border-border rounded-2xl p-5 shadow-lg hover:border-primary/50 transition-all group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}/5 rounded-bl-full -mr-4 -mt-4`} />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h3 className="text-2xl font-bold text-text">#{order.id.slice(0, 4)}</h3>
                  <p className="text-text-muted text-sm font-medium">
                    {order.customer_name || 'Guest'}{order.table_number ? ` · Table ${order.table_number}` : ''}
                  </p>
                  {order.discount_amount > 0 && (
                    <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md mt-1 inline-block">
                      Discount: {order.discount_type === 'percent' ? `${order.discount_amount}%` : `LKR ${order.discount_amount}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-bg px-2 py-1 rounded-lg text-xs font-bold text-text-muted mb-1 flex items-center gap-1">
                    <Clock size={12} /> {getTimeElapsed(order.created_at)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => printReceipt(order)} className="p-1.5 bg-bg/50 rounded-lg hover:bg-primary hover:text-bg transition-colors" title="Print Receipt"><Printer size={14} /></button>
                    <span className="text-xs font-bold text-primary self-center px-2 py-0.5 bg-primary/10 rounded-md uppercase">{order.payment_method || 'CASH'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6 border-t border-border/50 pt-4 relative z-10">
                {order.order_items?.map(item => (
                  <div key={item.id} className="flex justify-between text-base">
                    <span className="text-text font-bold"><span className="text-primary text-lg mr-3">{item.quantity}x</span>{item.menu_items?.name}</span>
                  </div>
                ))}
              </div>

              <div className="relative z-10">
                {status === 'pending' && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'in_progress')}
                    className="w-full py-3 rounded-xl bg-secondary text-bg font-bold hover:brightness-110 transition-all shadow-lg shadow-secondary/20">
                    Start Preparing
                  </motion.button>
                )}
                {status === 'in_progress' && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'ready')}
                    className="w-full py-3 rounded-xl bg-primary text-bg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20">
                    Mark as Ready
                  </motion.button>
                )}
                {status === 'ready' && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'completed')}
                    className="w-full py-3 rounded-xl bg-surface-hover text-text-muted font-bold hover:text-text hover:bg-border transition-all">
                    Complete Order
                  </motion.button>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); if (confirm('Cancel this order?')) updateStatus(order.id, 'cancelled'); }}
                className="absolute top-4 right-4 p-2 bg-surface-hover text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors z-20"
                title="Cancel Order"><X size={18} /></motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
        {orders.filter(o => o.status === status).length === 0 && (
          <div className="text-center text-text-muted py-10 opacity-50">No orders</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Orders</h1>
          <p className="text-text-muted">Manage active orders and view history.</p>
        </div>
      </motion.header>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6 bg-surface p-1 rounded-2xl border border-border w-fit">
        <button onClick={() => setView('active')} className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors ${view === 'active' ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
          Active Orders
        </button>
        <button onClick={() => setView('history')} className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5 ${view === 'history' ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
          <History size={14} /> Order History
        </button>
      </div>

      {view === 'active' ? (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          <KanbanColumn title="Pending" status="pending" color="secondary" icon={Clock} count={orders.filter(o => o.status === 'pending').length} />
          <KanbanColumn title="In Progress" status="in_progress" color="primary" icon={ChefHat} count={orders.filter(o => o.status === 'in_progress').length} />
          <KanbanColumn title="Ready for Pickup" status="ready" color="primary" icon={CheckCircle} count={orders.filter(o => o.status === 'ready').length} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Filters */}
          <div className="bg-surface border border-border rounded-3xl p-4 mb-4 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 flex-1 min-w-[200px]">
              <Search size={16} className="text-text-muted" />
              <input type="text" placeholder="Search by order ID, customer, table..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent text-text focus:outline-none text-sm w-full" />
            </div>
            <div className="flex gap-2 bg-bg rounded-xl p-1 border border-border">
              {['all', 'completed', 'cancelled'].map(s => (
                <button key={s} onClick={() => setHistoryStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${historyStatus === s ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
                  {s}
                </button>
              ))}
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-bg border border-border rounded-xl px-3 py-2 text-text text-sm focus:border-primary focus:outline-none" title="From" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-bg border border-border rounded-xl px-3 py-2 text-text text-sm focus:border-primary focus:outline-none" title="To" />
            {(dateFrom || dateTo || searchQuery || historyStatus !== 'all') && (
              <button onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setHistoryStatus('all'); }} className="text-xs text-primary font-bold hover:underline">Clear</button>
            )}
          </div>

          {/* History Table */}
          <div className="bg-surface border border-border rounded-3xl overflow-hidden">
            {historyLoading ? (
              <div className="p-8 text-center text-text-muted">Loading...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-10 text-center text-text-muted">No orders found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-text-muted text-sm border-b border-border">
                      <th className="p-4 font-bold">Order #</th>
                      <th className="p-4 font-bold">Date</th>
                      <th className="p-4 font-bold">Customer</th>
                      <th className="p-4 font-bold">Table</th>
                      <th className="p-4 font-bold">Items</th>
                      <th className="p-4 font-bold">Total</th>
                      <th className="p-4 font-bold">Payment</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(order => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                        <td className="p-4 font-bold text-text">#{order.id.slice(0, 4)}</td>
                        <td className="p-4 text-text-muted text-sm">{new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-4 text-text">{order.customer_name || 'Guest'}</td>
                        <td className="p-4 text-text-muted">{order.table_number || '—'}</td>
                        <td className="p-4 text-text-muted text-sm">{order.order_items?.length || 0} items</td>
                        <td className="p-4 font-bold text-primary">LKR {Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-4"><span className="text-xs font-bold uppercase bg-bg px-2 py-1 rounded-lg border border-border">{order.payment_method || 'CASH'}</span></td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${order.status === 'completed' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button onClick={() => printReceipt(order)} className="p-2 bg-bg rounded-lg hover:bg-primary hover:text-bg transition-colors" title="Print"><Printer size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
