// DEPRECATED: Use ProductJunction from transactions.ts instead
// This interface is kept for backward compatibility during migration
export interface InventoryHistory {
  id: string;
  product_id: string;
  transaction_id: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out';
  quantity_change: string;
  quantity_before: string;
  quantity_after: string;
  price_per_unit?: string;
  total_amount?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryHistoryWithRelations extends InventoryHistory {
  product_name?: string;
  product_brand?: string;
  product_unit?: string;
  product_current_price?: string;
}

export interface InventoryHistoryFilters {
  product_id?: string;
  transaction_id?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface CreateInventoryHistoryData {
  product_id: string;
  transaction_id: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out';
  quantity_change: string;
  quantity_before: string;
  quantity_after: string;
  price_per_unit?: string;
  total_amount?: string;
  notes?: string;
}



