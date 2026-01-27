export interface TransactionProductJunction {
  id: string;
  transaction_id: string;
  product_id: string;
  inventory_history_id?: string;
  quantity: string;
  unit?: string;
  per_unit_rate?: string;
  total_amount?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionProductJunctionWithRelations extends TransactionProductJunction {
  product_name?: string;
  product_brand?: string;
  product_unit?: string;
  product_current_price?: string;
}

export interface TransactionProductJunctionFilters {
  transaction_id?: string;
  product_id?: string;
  inventory_history_id?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionProductJunctionData {
  transaction_id: string;
  product_id: string;
  inventory_history_id?: string;
  quantity: string;
  unit?: string;
  per_unit_rate?: string;
  total_amount?: string;
}

export interface CreateMultipleTransactionProductJunctionsData {
  transaction_id: string;
  products: Array<{
    product_id: string;
    quantity: string;
    unit?: string;
    per_unit_rate: string;
    total_amount: string;
    inventory_history_id?: string;
  }>;
}

export interface PurchaseProduct {
  product_id: string;
  product_name: string;
  quantity: string;
  unit?: string;
  per_unit_rate: string;
  total_amount: string;
  inventory_history_id?: string;
}

export interface PurchaseTransactionData {
  transaction: {
    type: 'purchase';
    vendor_id: string;
    account_id: string;
    total_payment: string;
    remaining_payment: string;
    description?: string;
    date: string;
  };
  products: PurchaseProduct[];
}



