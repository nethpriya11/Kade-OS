export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Tables {
  schema_version: {
    Row: { version: string; applied_at: string }
    Insert: { version: string; applied_at?: string }
    Update: { version?: string; applied_at?: string }
  }
  profiles: {
    Row: { id: string; username: string; full_name: string | null; role: 'admin' | 'staff'; created_at: string; updated_at: string | null }
    Insert: { id: string; username: string; full_name?: string | null; role?: 'admin' | 'staff'; created_at?: string; updated_at?: string | null }
    Update: { id?: string; username?: string; full_name?: string | null; role?: 'admin' | 'staff'; created_at?: string; updated_at?: string | null }
  }
  menu_items: {
    Row: { id: string; name: string; category: 'Base' | 'Protein' | 'Drink' | 'Extra'; price: number; cost: number | null; is_available: boolean; has_portions: boolean; large_price: number; image_url: string | null; created_at: string }
    Insert: { id?: string; name: string; category: 'Base' | 'Protein' | 'Drink' | 'Extra'; price: number; cost?: number | null; is_available?: boolean; has_portions?: boolean; large_price?: number; image_url?: string | null; created_at?: string }
    Update: { id?: string; name?: string; category?: 'Base' | 'Protein' | 'Drink' | 'Extra'; price?: number; cost?: number | null; is_available?: boolean; has_portions?: boolean; large_price?: number; image_url?: string | null; created_at?: string }
  }
  ingredients: {
    Row: { id: string; name: string; unit: 'kg' | 'g' | 'l' | 'ml' | 'count'; current_stock: number; low_stock_threshold: number; purchase_price: number; yield_percent: number; category: string | null; created_at: string }
    Insert: { id?: string; name: string; unit: 'kg' | 'g' | 'l' | 'ml' | 'count'; current_stock?: number; low_stock_threshold?: number; purchase_price?: number; yield_percent?: number; category?: string | null; created_at?: string }
    Update: { id?: string; name?: string; unit?: 'kg' | 'g' | 'l' | 'ml' | 'count'; current_stock?: number; low_stock_threshold?: number; purchase_price?: number; yield_percent?: number; category?: string | null; created_at?: string }
  }
  recipes: {
    Row: { id: string; menu_item_id: string; ingredient_id: string; quantity_required: number }
    Insert: { id?: string; menu_item_id: string; ingredient_id: string; quantity_required: number }
    Update: { id?: string; menu_item_id?: string; ingredient_id?: string; quantity_required?: number }
  }
  orders: {
    Row: { id: string; total_amount: number; status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled'; payment_method: 'cash' | 'card'; table_number: number | null; customer_name: string | null; discount_amount: number; discount_type: 'percent' | 'flat' | null; tax_rate: number; tax_amount: number; created_at: string }
    Insert: { id?: string; total_amount: number; status?: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled'; payment_method?: 'cash' | 'card'; table_number?: number | null; customer_name?: string | null; discount_amount?: number; discount_type?: 'percent' | 'flat' | null; tax_rate?: number; tax_amount?: number; created_at?: string }
    Update: { id?: string; total_amount?: number; status?: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled'; payment_method?: 'cash' | 'card'; table_number?: number | null; customer_name?: string | null; discount_amount?: number; discount_type?: 'percent' | 'flat' | null; tax_rate?: number; tax_amount?: number; created_at?: string }
  }
  order_items: {
    Row: { id: string; order_id: string; menu_item_id: string; quantity: number; price_at_time: number; portion: 'normal' | 'large' }
    Insert: { id?: string; order_id: string; menu_item_id: string; quantity: number; price_at_time: number; portion?: 'normal' | 'large' }
    Update: { id?: string; order_id?: string; menu_item_id?: string; quantity?: number; price_at_time?: number; portion?: 'normal' | 'large' }
  }
  restock_logs: {
    Row: { id: string; ingredient_id: string; quantity: number; cost_per_unit: number | null; total_cost: number | null; supplier_id: string | null; created_at: string }
    Insert: { id?: string; ingredient_id: string; quantity: number; cost_per_unit?: number | null; total_cost?: number | null; supplier_id?: string | null; created_at?: string }
    Update: { id?: string; ingredient_id?: string; quantity?: number; cost_per_unit?: number | null; total_cost?: number | null; supplier_id?: string | null; created_at?: string }
  }
  wastage_logs: {
    Row: { id: string; ingredient_id: string; quantity: number; reason: string; cost_at_time: number | null; created_at: string }
    Insert: { id?: string; ingredient_id: string; quantity: number; reason: string; cost_at_time?: number | null; created_at?: string }
    Update: { id?: string; ingredient_id?: string; quantity?: number; reason?: string; cost_at_time?: number | null; created_at?: string }
  }
  expenses: {
    Row: { id: string; category: string; description: string | null; amount: number; expense_date: string; created_by: string | null; created_at: string }
    Insert: { id?: string; category: string; description?: string | null; amount: number; expense_date?: string; created_by?: string | null; created_at?: string }
    Update: { id?: string; category?: string; description?: string | null; amount?: number; expense_date?: string; created_by?: string | null; created_at?: string }
  }
  shifts: {
    Row: { id: string; user_id: string; clock_in: string; clock_out: string | null; duration_minutes: number | null; notes: string | null; created_at: string }
    Insert: { id?: string; user_id: string; clock_in?: string; clock_out?: string | null; duration_minutes?: number | null; notes?: string | null; created_at?: string }
    Update: { id?: string; user_id?: string; clock_in?: string; clock_out?: string | null; duration_minutes?: number | null; notes?: string | null; created_at?: string }
  }
  restaurant_tables: {
    Row: { id: string; table_number: number; capacity: number; status: 'free' | 'occupied' | 'reserved'; current_order_id: string | null; created_at: string; updated_at: string }
    Insert: { id?: string; table_number: number; capacity?: number; status?: 'free' | 'occupied' | 'reserved'; current_order_id?: string | null; created_at?: string; updated_at?: string }
    Update: { id?: string; table_number?: number; capacity?: number; status?: 'free' | 'occupied' | 'reserved'; current_order_id?: string | null; created_at?: string; updated_at?: string }
  }
  suppliers: {
    Row: { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; created_at: string }
    Insert: { id?: string; name: string; contact_person?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; created_at?: string }
    Update: { id?: string; name?: string; contact_person?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; created_at?: string }
  }
  supplier_prices: {
    Row: { id: string; supplier_id: string; ingredient_id: string; price: number; min_order_qty: number; unit: string | null }
    Insert: { id?: string; supplier_id: string; ingredient_id: string; price?: number; min_order_qty?: number; unit?: string | null }
    Update: { id?: string; supplier_id?: string; ingredient_id?: string; price?: number; min_order_qty?: number; unit?: string | null }
  }
  settings: {
    Row: { id: string; key: string; value: string; updated_at: string }
    Insert: { id?: string; key: string; value: string; updated_at?: string }
    Update: { id?: string; key?: string; value?: string; updated_at?: string }
  }
  audit_logs: {
    Row: { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string | null; details: Json | null; created_at: string }
    Insert: { id?: string; user_id?: string | null; action: string; entity_type: string; entity_id?: string | null; details?: Json | null; created_at?: string }
    Update: { id?: string; user_id?: string | null; action?: string; entity_type?: string; entity_id?: string | null; details?: Json | null; created_at?: string }
  }
  procurement_orders: {
    Row: { id: string; created_by: string | null; status: 'needed' | 'ordered' | 'received'; notes: string | null; created_at: string; updated_at: string }
    Insert: { id?: string; created_by?: string | null; status?: 'needed' | 'ordered' | 'received'; notes?: string | null; created_at?: string; updated_at?: string }
    Update: { id?: string; created_by?: string | null; status?: 'needed' | 'ordered' | 'received'; notes?: string | null; created_at?: string; updated_at?: string }
  }
  procurement_order_items: {
    Row: { id: string; procurement_order_id: string; ingredient_id: string; quantity_to_buy: number; estimated_cost: number | null; supplier_note: string | null; created_at: string }
    Insert: { id?: string; procurement_order_id: string; ingredient_id: string; quantity_to_buy: number; estimated_cost?: number | null; supplier_note?: string | null; created_at?: string }
    Update: { id?: string; procurement_order_id?: string; ingredient_id?: string; quantity_to_buy?: number; estimated_cost?: number | null; supplier_note?: string | null; created_at?: string }
  }
}
