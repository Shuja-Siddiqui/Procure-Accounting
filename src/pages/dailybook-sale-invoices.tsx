import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SaleModal } from "@/components/dailybooks/sale/sale-modal";
import { SaleReturnModal } from "@/components/dailybooks/sale/sale-return-modal";
import { ReceivablesTable } from "@/components/dailybooks/sale/receivables-table";
import { ReceivableInvoiceViewModal } from "@/components/dailybooks/sale/receivable-invoice-view-modal";
import { ReceivablePrintModal } from "@/components/dailybooks/sale/receivable-print-modal";
import { ReceivableEditModal } from "@/components/dailybooks/sale/receivable-edit-modal";
import { ReceivableDeleteModal } from "@/components/dailybooks/sale/receivable-delete-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, DollarSign, CreditCard, Plus, RotateCcw } from "lucide-react";

interface Receivable {
  id: string;
  account_receivable_id: string;
  transaction_id: string;
  amount: string | number;
  total_payment: string | number;
  remaining_payment: string | number;
  status: 'pending' | 'partial_pending' | 'paid';
  description?: string | null;
  due_date?: string | null;
  sale_invoice_number?: string | null;
  receipt_invoice_number?: string | null;
  type?: string;
  created_at: string;
  updated_at: string;
  accountReceivable?: {
    id: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  };
  transaction?: {
    id: string;
    date?: string | null;
    description?: string | null;
    mode_of_payment?: string | null;
    sale_invoice_number?: string | null;
    receipt_invoice_number?: string | null;
    type?: string;
  };
}

interface ReceivableFilters {
  search?: string;
  status?: string;
  account_receivable_id?: string;
  date_from?: string;
  date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  transaction_type?: string;
}

export default function DailyBookSaleInvoices() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaleReturnModalOpen, setIsSaleReturnModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [filters, setFilters] = useState<ReceivableFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 10; // Server-side search with pagination

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Build query string from filters
  const buildQueryString = (filters: ReceivableFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    params.append('page', String(page));
    params.append('limit', String(pageSize));
    return params.toString();
  };

  // Fetch sale transactions (sale, advance_sale_inventory, sale_return - excluding advance_sale_payment which is now on receipts page)
  const { data: transactionsResponse, isLoading: receivablesLoading } = useQuery({
    queryKey: ['/api/transactions', 'all-sales', filters, page, pageSize],
    queryFn: async () => {
      // Fetch all sale types in one call (API supports comma-separated types)
      const params = new URLSearchParams();
      params.append('type', 'sale,advance_sale_inventory,sale_return');
      if (filters.account_receivable_id) params.append('account_receivable_id', filters.account_receivable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search); // Send search to API
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      
      const url = `/api/transactions?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch sale transactions');
      const data = await res.json();
      
      // Transform transactions to receivables format for compatibility
      const transformedData = {
        ...data,
        data: (data.data || []).map((tx: any) => ({
          id: tx.id,
          account_receivable_id: tx.account_receivable_id,
          transaction_id: tx.id,
          amount: tx.total_amount || '0.00',  // Total invoice amount
          total_payment: tx.paid_amount || '0.00',  // Received/paid amount
          remaining_payment: tx.remaining_payment || '0.00',
          status: parseFloat(tx.remaining_payment || '0') === 0 ? 'paid' : 
                 (parseFloat(tx.paid_amount || '0') > 0 ? 'partial_pending' : 'pending'),
          description: tx.description,
          due_date: tx.date,
          sale_invoice_number: tx.sale_invoice_number,
          receipt_invoice_number: tx.receipt_invoice_number,
          type: tx.type,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          accountReceivable: tx.account_receivable_name ? {
            id: tx.account_receivable_id,
            name: tx.account_receivable_name,
            number: tx.account_receivable_number,
            city: tx.account_receivable_city,
            address: tx.account_receivable_address,
          } : undefined,
          transaction: {
            id: tx.id,
            date: tx.date,
            description: tx.description,
            mode_of_payment: tx.mode_of_payment,
            sale_invoice_number: tx.sale_invoice_number,
            receipt_invoice_number: tx.receipt_invoice_number,
            type: tx.type,
          },
        })),
      };
      return transformedData;
    },
  });

  // Calculate stats from sale transactions (excluding advance_sale_payment)
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats', 'all-sales', filters],
    queryFn: async () => {
      // Fetch all sale types in one call for stats
      const params = new URLSearchParams();
      params.append('type', 'sale,advance_sale_inventory,sale_return');
      if (filters.account_receivable_id) params.append('account_receivable_id', filters.account_receivable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      // Don't include search in stats - we want total stats, not filtered
      
      const url = `/api/transactions?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch transaction stats');
      const data = await res.json();
      
      const allTransactions = data.data || [];
      const totalAmount = allTransactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.total_amount || '0'), 0);
      const totalPaid = allTransactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.paid_amount || '0'), 0);
      const totalRemaining = allTransactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.remaining_payment || '0'), 0);
      
      return {
        data: {
          totalReceivables: allTransactions.length,
          totalAmount,
          totalPaid,
          totalRemaining,
        },
      };
    },
  });

  const receivables: Receivable[] = transactionsResponse?.data || [];
  const stats = statsResponse?.data || {
    totalReceivables: 0,
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

  const handleViewReceivable = (receivable: Receivable) => {
    setSelectedReceivableId(receivable.id);
    setIsDetailModalOpen(true);
  };

  const handlePrintReceivable = async (receivable: Receivable) => {
    try {
      // Fetch full transaction details with products (replacing receivables)
      const response = await apiRequest('GET', `/api/transactions/${receivable.transaction_id}/relations`);
      // Transform transaction to receivable format
      const tx = response.data;
      const transformedReceivable = {
        ...receivable,
        transaction: tx,
      };
      setSelectedReceivable(transformedReceivable);
      setIsPrintModalOpen(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    }
  };

  const handleEditReceivable = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setIsEditModalOpen(true);
  };

  const handleDeleteReceivable = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false);
    setIsDetailModalOpen(false);
    setSelectedReceivable(null);
    setSelectedReceivableId(null);
  };

  const handleSaleSuccess = () => {
    // Query invalidation will be handled by react-query
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sale Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track all sale receivables
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Sale</span>
          </Button>
          <Button 
            onClick={() => setIsSaleReturnModalOpen(true)} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Sale Return</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Metric 1: Total Receivables */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{stats.totalReceivables}</div>
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

        {/* Metric 3: Remaining Receivables */}
        {/* <Card className="md:block hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Receivables</CardTitle>
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
              Outstanding amounts to be received
            </p>
          </CardContent>
        </Card> */}
      </div>
      <Card className="md:hidden block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Receivables</CardTitle>
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
              Outstanding amounts to be received
            </p>
          </CardContent>
        </Card>

      {/* Receivables Table */}
      <ReceivablesTable
        receivables={receivables}
        isLoading={receivablesLoading}
        onView={handleViewReceivable}
        onEdit={handleEditReceivable}
        onDelete={handleDeleteReceivable}
        onFiltersChange={setFilters}
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} • Showing {receivables.length} invoice{receivables.length === 1 ? '' : 's'}
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
            disabled={receivables.length < pageSize}
            onClick={() => {
              if (receivables.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <SaleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSaleSuccess}
      />

      <SaleReturnModal
        isOpen={isSaleReturnModalOpen}
        onClose={() => setIsSaleReturnModalOpen(false)}
        onSuccess={handleSaleSuccess}
      />

      <ReceivableInvoiceViewModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReceivableId(null);
        }}
        receivableId={selectedReceivableId}
        onPrint={handlePrintReceivable}
      />

      <ReceivablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedReceivable(null);
        }}
        receivable={selectedReceivable}
        keepDetailModalOpen={isDetailModalOpen}
      />

      <ReceivableEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedReceivable(null);
        }}
        receivable={selectedReceivable}
      />

      <ReceivableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedReceivable(null);
        }}
        receivable={selectedReceivable}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
