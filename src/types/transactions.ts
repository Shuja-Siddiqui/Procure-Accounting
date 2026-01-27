import { Transaction, InsertTransaction } from "@shared/schema";

export interface ProductJunction {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: string | number;
  quantity_before?: string | number; // NEW
  quantity_after?: string | number; // NEW
  unit?: string;
  per_unit_rate?: string | number;
  unit_price?: string | number; // NEW
  total_amount?: string | number;
  batch_id?: string; // NEW
  notes?: string; // NEW
  type?: string; // NEW
  discount?: string | number; // NEW
  discount_per_unit?: string | number; // NEW
  inventory_history_id?: string; // TODO: Remove after migration
  product_name?: string;
  product_brand?: string;
  product_unit?: string;
  product_current_price?: string | number;
}

// NEW: Transaction Product Sale Junction interface
export interface TransactionProductSaleJunction {
  id: string;
  transaction_id: string;
  product_id: string;
  batch_id: string;
  quantity: string | number;
  q_before: string | number;
  q_after: string | number;
  purchase_price: string | number;
  sale_price: string | number;
  profit_loss: string | number; // Can be negative (loss)
  type?: string;
  transaction_product_id: string;
  created_at?: string;
  updated_at?: string;
  // Related data
  product_name?: string;
  product_brand?: string;
  batch_number?: string;
}

export interface TransactionWithRelations extends Transaction {
  source_account_name?: string;
  destination_account_name?: string;
  account_payable_name?: string;
  account_receivable_name?: string;
  purchaser_name?: string;
  productJunctions?: ProductJunction[];
}

export interface TransactionFilters {
  search?: string;
  type?: string;
  account_payable_id?: string;
  account_receivable_id?: string;
  purchaser_id?: string;
  source_account_id?: string;
  destination_account_id?: string;
  mode_of_payment?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  maxAmount: number;
  minAmount: number;
  typeStats: Array<{
    type: string;
    count: number;
    totalAmount: number;
  }>;
  modeStats: Array<{
    mode_of_payment: string | null;
    count: number;
    totalAmount: number;
  }>;
}

export interface TransactionFormData {
  type: string;
  source_account_id?: string;
  destination_account_id?: string;
  total_amount?: string;
  opening_balance?: string;
  closing_balance?: string;
  description?: string;
  mode_of_payment?: string;
  paid_amount?: string;
  remaining_payment?: string;
  remaining?: string; // NEW: Auto-calculated (total_amount - paid_amount)
  profit_loss?: string; // NEW: For sales transactions (can be negative)
  user_id?: string; // NEW: User who created the transaction
  date?: string;
  account_payable_id?: string;
  account_receivable_id?: string;
  purchaser_id?: string;
}

export const TRANSACTION_TYPES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'purchase_return', label: 'Purchase Return' },
  { value: 'sale', label: 'Sale' },
  { value: 'sale_return', label: 'Sale Return' },
  { value: 'advance_purchase_inventory', label: 'Advance Purchase Inventory' },
  { value: 'advance_sale_payment', label: 'Advance Sale Payment' },
  { value: 'advance_purchase_payment', label: 'Advance Purchase Payment' },
  { value: 'advance_sale_inventory', label: 'Advance Sale Inventory' },
  { value: 'asset_purchase', label: 'Asset Purchase' },
  { value: 'loan', label: 'Loan' },
  { value: 'loan_return', label: 'Loan Return' },
  { value: 'other_expense', label: 'Other Expense' },
  { value: 'lost_and_damage', label: 'Lost and Damage' },
  { value: 'pay_able', label: 'Payable' },
  { value: 'receive_able', label: 'Receivable' },
  { value: 'payable_advance', label: 'Payable Advance' },
  { value: 'receivable_advance', label: 'Receivable Advance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'fixed_utility', label: 'Fixed Utility' },
  { value: 'fixed_expense', label: 'Fixed Expense' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
] as const;

export const MODE_OF_PAYMENT_OPTIONS = [
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'pay_order', label: 'Pay Order' },
] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number]['value'];
export type ModeOfPayment = typeof MODE_OF_PAYMENT_OPTIONS[number]['value'];
