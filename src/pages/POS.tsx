import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore, type CartItem } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useOfflineStore } from '../store/offlineStore';
import { toast } from 'sonner';
import { printReceipt } from '../utils/printReceipt';
import { logOrderAction } from '../lib/auditLog';
import POSMenuGrid from '../components/POSMenuGrid';
import type { POSMenuItem } from '../components/POSMenuGrid';
import POSCartBar from '../components/POSCartBar';
import POSPortionModal from '../components/POSPortionModal';
import POSCartDrawer from '../components/POSCartDrawer';

interface RestaurantTable {
    id: string;
    table_number: number;
    capacity: number;
    status: string;
}

interface BusinessInfo {
    business_name: string;
    business_address: string;
    business_phone: string;
}

const POS = () => {
    const [menuItems, setMenuItems] = useState<POSMenuItem[]>([]);
    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [loading, setLoading] = useState(true);
    const { cart, addToCart, updateQuantity, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const { isOnline, addToQueue } = useOfflineStore();
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const [processing, setProcessing] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItemForPortion, setSelectedItemForPortion] = useState<POSMenuItem | null>(null);

    const [orderType, setOrderType] = useState('takeaway');
    const [selectedTableNumber, setSelectedTableNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [discountType, setDiscountType] = useState('none');
    const [discountValue, setDiscountValue] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({ business_name: 'Kadé', business_address: '', business_phone: '' });

    const categories = ['All', 'Base', 'Protein', 'Drink', 'Extra'];

    useEffect(() => {
        supabase.from('settings').select('*').then(({ data }) => {
            if (data) {
                const map: Record<string, string> = {};
                data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
                setTaxRate(parseFloat(map.tax_rate) || 0);
                setBusinessInfo({
                    business_name: map.business_name || 'Kadé',
                    business_address: map.business_address || '',
                    business_phone: map.business_phone || '',
                });
            }
        }, () => {});
    }, []);

    const handleAddItem = (item: POSMenuItem) => {
        addToCart({ ...item, cartItemId: item.id, original_id: item.id, portion: 'normal', quantity: 1 } as CartItem);
        toast.success(`Added ${item.name}`);
    };

    const handleAddPortionItem = (item: POSMenuItem, portionType: string) => {
        const price = portionType === 'large' ? item.large_price : item.price;
        addToCart({
            ...item,
            cartItemId: `${item.id}-${portionType}`,
            original_id: item.id,
            price: price,
            portion: portionType,
            quantity: 1,
        } as CartItem);
        toast.success(`Added ${item.name} (${portionType})`);
        setSelectedItemForPortion(null);
    };

    const fetchMenu = async () => {
        const { data } = await supabase
            .from('menu_items')
            .select('*')
            .eq('is_available', true)
            .order('category', { ascending: true });

        if (data) setMenuItems(data as POSMenuItem[]);
    };

    const fetchTables = async () => {
        const { data } = await supabase
            .from('restaurant_tables')
            .select('*')
            .order('table_number');

        if (data) setTables(data as RestaurantTable[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchMenu();
        fetchTables();

        const subscription = supabase
            .channel('pos_tables_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
                fetchTables();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        if (discountType !== 'none') {
            const val = parseFloat(discountValue);
            if (isNaN(val) || val < 0) {
                toast.error('Please enter a valid discount value');
                return;
            }
            if (discountType === 'percent' && (val > 100)) {
                toast.error('Percentage discount cannot exceed 100%');
                return;
            }
        }

        setProcessing(true);

        try {
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let discountAmount = 0;
            if (discountType === 'percent' && discountValue) {
                discountAmount = parseFloat(discountValue);
            } else if (discountType === 'flat' && discountValue) {
                discountAmount = parseFloat(discountValue);
            }

            let discountLkr = 0;
            if (discountType === 'percent') {
                discountLkr = subtotal * (discountAmount / 100);
            } else if (discountType === 'flat') {
                discountLkr = discountAmount;
            }

            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = Math.max(0, subtotal - discountLkr + taxAmount);

            if (!isOnline) {
                addToQueue({
                    items: cart,
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    created_at: new Date().toISOString(),
                    discount_amount: discountAmount > 0 ? discountAmount : null,
                    discount_type: discountType !== 'none' ? discountType : null,
                    table_number: selectedTableNumber ? parseInt(selectedTableNumber) : null,
                    customer_name: customerName || null,
                    tax_rate: taxRate,
                    tax_amount: taxAmount
                });

                toast.success('Order saved offline! Will sync when online.');
                printReceipt({
                    id: `OFF-${Date.now().toString().slice(-4)}`,
                    created_at: new Date().toISOString(),
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    discount_amount: discountAmount > 0 ? discountAmount : null,
                    discount_type: discountType !== 'none' ? discountType : null,
                    table_number: selectedTableNumber ? parseInt(selectedTableNumber) : null,
                    customer_name: customerName || null,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    business_name: businessInfo.business_name,
                    business_address: businessInfo.business_address,
                    business_phone: businessInfo.business_phone,
                    order_items: cart.map(item => ({
                        quantity: item.quantity,
                        price_at_time: item.price,
                        menu_items: { name: item.name },
                        portion: ((item as Record<string, unknown>).portion as string) || 'normal'
                    }))
                });

                clearCart();
                setSelectedTableNumber('');
                setCustomerName('');
                setDiscountType('none');
                setDiscountValue('');
                setProcessing(false);
                return;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    status: 'pending',
                    discount_amount: discountAmount > 0 ? discountAmount : null,
                    discount_type: discountType !== 'none' ? discountType : null,
                    table_number: selectedTableNumber ? parseInt(selectedTableNumber) : null,
                    customer_name: customerName || null,
                    tax_rate: taxRate,
                    tax_amount: taxAmount
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            if (selectedTableNumber) {
                await supabase
                    .from('restaurant_tables')
                    .update({
                        status: 'occupied',
                        current_order_id: order.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('table_number', parseInt(selectedTableNumber));
            }

            const orderItems = cart.map(item => ({
                order_id: order.id,
                menu_item_id: (item as Record<string, unknown>).original_id || item.id,
                quantity: item.quantity,
                price_at_time: item.price,
                portion: (item as Record<string, unknown>).portion || 'normal'
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            logOrderAction(user?.id, order.id, 'created', {
                total: totalAmount,
                payment_method: paymentMethod,
                item_count: cart.length
            });

            toast.success('Order placed successfully!');

            printReceipt({
                ...order,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                business_name: businessInfo.business_name,
                business_address: businessInfo.business_address,
                business_phone: businessInfo.business_phone,
                order_items: cart.map(item => ({
                    quantity: item.quantity,
                    price_at_time: item.price,
                    menu_items: { name: item.name },
                    portion: ((item as Record<string, unknown>).portion as string) || 'normal'
                }))
            });

            clearCart();
            setOrderType('takeaway');
            setSelectedTableNumber('');
            setCustomerName('');
            setDiscountType('none');
            setDiscountValue('');
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to place order. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountLkr = 0;
    const discountValNum = parseFloat(discountValue);
    if (!isNaN(discountValNum)) {
        if (discountType === 'percent') {
            discountLkr = subtotal * (discountValNum / 100);
        } else if (discountType === 'flat') {
            discountLkr = discountValNum;
        }
    }
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal - discountLkr + taxAmount);

    return (
        <div className="h-full relative">
            <POSMenuGrid
                items={menuItems}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                loading={loading}
                onAddItem={handleAddItem}
                onSelectPortion={setSelectedItemForPortion}
            />

            {!isCartOpen && (
                <POSCartBar
                    cartCount={cartCount}
                    totalAmount={totalAmount}
                    onOpen={() => setIsCartOpen(true)}
                />
            )}

            <POSPortionModal
                item={selectedItemForPortion}
                onClose={() => setSelectedItemForPortion(null)}
                onSelect={handleAddPortionItem}
            />

            <POSCartDrawer
                isOpen={isCartOpen}
                cart={cart}
                subtotal={subtotal}
                discountLkr={discountLkr}
                taxRate={taxRate}
                taxAmount={taxAmount}
                totalAmount={totalAmount}
                orderType={orderType}
                onOrderTypeChange={setOrderType}
                selectedTableNumber={selectedTableNumber}
                onTableNumberChange={setSelectedTableNumber}
                tables={tables}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                discountType={discountType}
                onDiscountTypeChange={setDiscountType}
                discountValue={discountValue}
                onDiscountValueChange={setDiscountValue}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                processing={processing}
                onClose={() => setIsCartOpen(false)}
                onCheckout={handleCheckout}
                onUpdateQuantity={updateQuantity}
            />
        </div>
    );
};

export default POS;

