import { supabase } from './supabase';

interface AuditLogEntry {
    user_id?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: Record<string, unknown>;
}

export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
    try {
        const { error } = await supabase.from('audit_logs').insert([entry]);
        if (error) console.error('Audit log insert failed:', error);
    } catch (err) {
        console.error('Audit log error:', err);
    }
};

export const logOrderAction = async (userId: string | undefined, orderId: string, action: string, details?: Record<string, unknown>) => {
    await createAuditLog({ user_id: userId, action, entity_type: 'order', entity_id: orderId, details });
};

export const logInventoryAction = async (userId: string | undefined, ingredientId: string, action: string, details?: Record<string, unknown>) => {
    await createAuditLog({ user_id: userId, action, entity_type: 'ingredient', entity_id: ingredientId, details });
};

export const logAuthAction = async (userId: string | undefined, action: string, details?: Record<string, unknown>) => {
    await createAuditLog({ user_id: userId, action, entity_type: 'auth', details });
};

export const logProcurementAction = async (userId: string | undefined, procurementId: string, action: string, details?: Record<string, unknown>) => {
    await createAuditLog({ user_id: userId, action, entity_type: 'procurement', entity_id: procurementId, details });
};

export const logWastageAction = async (userId: string | undefined, wastageId: string, details?: Record<string, unknown>) => {
    await createAuditLog({ user_id: userId, action: 'report_wastage', entity_type: 'wastage', entity_id: wastageId, details });
};
