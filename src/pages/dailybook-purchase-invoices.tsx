import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { PurchaseModal } from "@/components/dailybooks/purchase/purchase-modal";
import { PurchaseReturnModal } from "@/components/dailybooks/purchase/purchase-return-modal";
import { PayablesTable } from "@/components/dailybooks/purchase/payables-table";
import { PayableInvoiceViewModal } from "@/components/dailybooks/purchase/payable-invoice-view-modal";
import { PayablePrintModal } from "@/components/dailybooks/purchase/payable-print-modal";
import { PayableEditModal } from "@/components/dailybooks/purchase/payable-edit-modal";
import { PayableDeleteModal } from "@/components/dailybooks/purchase/payable-delete-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, DollarSign, CreditCard, Plus } from "lucide-react";

interface Payable {
  id: string;
  account_payable_id: string;
  transaction_id: string;
  total_amount: string | number;
  paid_amount: string | number;
  remaining_payment: string | number;
  status: 'pending' | 'partial_pending' | 'paid';
  description?: string | null;
  due_date?: string | null;
  purchase_invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  accountPayable?: {
    id: string;
    name: string;
    number?: string | null;
    city?: string | null;
    address?: string | null;
    status?: 'active' | 'inactive';
  };
  transaction?: {
    id: string;
    date?: string | null;
    description?: string | null;
    mode_of_payment?: string | null;
    purchase_invoice_number?: string | null;
  };
}

interface PayableFilters {
  search?: string;
  status?: string;
  account_payable_id?: string;
  date_from?: string;
  date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  transaction_type?: string;
}

export default function DailyBookPurchaseInvoices() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPurchaseReturnModalOpen, setIsPurchaseReturnModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10; // Server-side search with pagination
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [filters, setFilters] = useState<PayableFilters>({});

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Build query string from filters
  const buildQueryString = (filters: PayableFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    // Pagination
    params.append('page', String(page));
    params.append('limit', String(pageSize));
    return params.toString();
  };

  // Fetch purchase transactions (replacing payables)
  const { data: transactionsResponse, isLoading: payablesLoading } = useQuery({
    queryKey: ['/api/transactions', 'purchase', filters, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Include purchase-related transaction types (excluding advance_purchase_payment which is now on payments page)
      params.append('type', 'purchase,purchase_return,advance_purchase_inventory');
      if (filters.account_payable_id) params.append('account_payable_id', filters.account_payable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search); // Send search to API
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      
      const url = getApiUrl(`/api/transactions?${params.toString()}`);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch purchase transactions');
      const data = await res.json();
      
      // Transform transactions to payables format for compatibility
      const transformedData = {
        ...data,
        data: (data.data || []).map((tx: any) => ({
          id: tx.id,
          account_payable_id: tx.account_payable_id,
          transaction_id: tx.id,
          total_amount: tx.total_amount || '0.00',
          paid_amount: tx.paid_amount || '0.00',
          remaining_payment: tx.remaining_payment || '0.00',
          status: parseFloat(tx.remaining_payment || '0') === 0 ? 'paid' : 
                 (parseFloat(tx.paid_amount || '0') > 0 ? 'partial_pending' : 'pending'),
          description: tx.description,
          due_date: tx.date,
          purchase_invoice_number: tx.purchase_invoice_number,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          accountPayable: tx.account_payable_name ? {
            id: tx.account_payable_id,
            name: tx.account_payable_name,
          } : undefined,
          transaction: {
            id: tx.id,
            date: tx.date,
            description: tx.description,
            mode_of_payment: tx.mode_of_payment,
            purchase_invoice_number: tx.purchase_invoice_number,
            type: tx.type,
          },
          type: tx.type, // Include transaction type for display
        })),
      };
      return transformedData;
    },
  });

  // Calculate stats from transactions
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats', 'purchase', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Include purchase-related transaction types (excluding advance_purchase_payment which is now on payments page)
      params.append('type', 'purchase,purchase_return,advance_purchase_inventory');
      if (filters.account_payable_id) params.append('account_payable_id', filters.account_payable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const url = getApiUrl(`/api/transactions?${params.toString()}`);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch transaction stats');
      const data = await res.json();
      
      const transactions = data.data || [];
      const totalAmount = transactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.total_amount || '0'), 0);
      const totalPaid = transactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.paid_amount || '0'), 0);
      const totalRemaining = transactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.remaining_payment || '0'), 0);
      
      return {
        data: {
          totalPayables: transactions.length,
          totalAmount,
          totalPaid,
          totalRemaining,
        },
      };
    },
  });

  const payables: Payable[] = transactionsResponse?.data || [];
  
  const stats = statsResponse?.data || {
    totalPayables: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalRemaining: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleViewPayable = (payable: Payable) => {
    setSelectedPayableId(payable.id);
    setIsDetailModalOpen(true);
  };

  const handlePrintPayable = async (payable: Payable) => {
    try {
      // Fetch full transaction details with products (replacing payables)
      const response = await apiRequest('GET', `/api/transactions/${payable.transaction_id}/relations`);
      // Transform transaction to payable format
      const tx = response.data;
      const transformedPayable = {
        ...payable,
        transaction: tx,
        accountPayable: payable.accountPayable ? {
          ...payable.accountPayable,
          status: payable.accountPayable.status || 'active' as 'active' | 'inactive',
        } : undefined,
      };
      setSelectedPayable(transformedPayable as any);
      setIsPrintModalOpen(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    }
  };

  const handleEditPayable = (payable: Payable) => {
    // Transform to match edit modal's expected format
    const transformedPayable = {
      ...payable,
      amount: payable.total_amount,
      total_payment: payable.paid_amount,
      accountPayable: payable.accountPayable ? {
        ...payable.accountPayable,
        status: payable.accountPayable.status || 'active' as 'active' | 'inactive',
      } : undefined,
    };
    setSelectedPayable(transformedPayable as any);
    setIsEditModalOpen(true);
  };

  const handleDeletePayable = (payable: Payable) => {
    // Transform to match delete modal's expected format
    const transformedPayable = {
      ...payable,
      amount: payable.total_amount,
      total_payment: payable.paid_amount,
      accountPayable: payable.accountPayable ? {
        ...payable.accountPayable,
        status: payable.accountPayable.status || 'active' as 'active' | 'inactive',
      } : undefined,
    };
    setSelectedPayable(transformedPayable as any);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false);
    setIsDetailModalOpen(false);
    setSelectedPayable(null);
    setSelectedPayableId(null);
  };

  const handlePurchaseSuccess = () => {
    // Query invalidation will be handled by react-query
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track all purchase payables
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="flex items-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase</span>
          </Button>
          <Button 
            onClick={() => setIsPurchaseReturnModalOpen(true)} 
            variant="outline"
            className="flex items-center space-x-2 w-full sm:w-auto"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Purchase Return</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Metric 1: Total Payables */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{stats.totalPayables}</div>
            )}
          </CardContent>
        </Card> */}

        {/* Metric 2: Total Amount */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{formatCurrency(stats.totalAmount)}</div>
            )}
          </CardContent>
        </Card> */}

        {/* Metric 3: Paid Amount */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-green-600">
                {formatCurrency(stats.totalPaid)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total amount paid to vendors
            </p>
          </CardContent>
        </Card> */}

        {/* Metric 4: Remaining Payments */}
        {/* <Card className="md:block hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-orange-600">
                {formatCurrency(stats.totalRemaining)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding amounts to be paid
            </p>
          </CardContent>
        </Card> */}
      </div>
      <Card className="md:hidden block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-orange-600">
                {formatCurrency(stats.totalRemaining)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding amounts to be paid
            </p>
          </CardContent>
        </Card>

      {/* Payables Table */}
      <PayablesTable
        payables={payables as any}
        isLoading={payablesLoading}
        onView={handleViewPayable}
        onFiltersChange={setFilters}
      />

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <span className="text-sm text-muted-foreground text-center sm:text-left">
          Page {page} • Showing {payables.length} invoice{payables.length === 1 ? '' : 's'}
          {transactionsResponse?.count && ` of ${transactionsResponse.count}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={payables.length < pageSize}
            onClick={() => {
              if (payables.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <PurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePurchaseSuccess}
      />

      <PayableInvoiceViewModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPayableId(null);
        }}
        payableId={selectedPayableId}
        onPrint={handlePrintPayable}
      />

      <PayablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedPayable(null);
        }}
        payable={selectedPayable as any}
        keepDetailModalOpen={isDetailModalOpen}
      />

      <PayableEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPayable(null);
        }}
        payable={selectedPayable as any}
      />

      <PayableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPayable(null);
        }}
        payable={selectedPayable as any}
        onSuccess={handleDeleteSuccess}
      />

      <PurchaseReturnModal
        isOpen={isPurchaseReturnModalOpen}
        onClose={() => setIsPurchaseReturnModalOpen(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}
