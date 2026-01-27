import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CreditCard, PlusCircle, Receipt, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceivablesTable } from "@/components/dailybooks/sale/receivables-table";
import { ReceivableInvoiceViewModal } from "@/components/dailybooks/sale/receivable-invoice-view-modal";
import { ReceivablePrintModal } from "@/components/dailybooks/sale/receivable-print-modal";
import { ReceivableEditModal } from "@/components/dailybooks/sale/receivable-edit-modal";
import { ReceivableDeleteModal } from "@/components/dailybooks/sale/receivable-delete-modal";
import { CreateReceiptModal } from "@/components/dailybooks/receipt/create-receipt-modal";
import { AdvancePaymentFromClientModal } from "@/components/dailybooks/receipt/advance-payment-from-client-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Receivable } from "@shared/schema";

// Extend Receivable with transaction.type so we can filter by transaction type
type ReceivableWithTransaction = Receivable & {
  transaction?: {
    id: string;
    type?: string;
    date?: string | null;
    description?: string | null;
    mode_of_payment?: string | null;
  };
};

export default function DailyBookReceipts() {
  const queryClient = useQueryClient();
  const [isCreateReceiptModalOpen, setIsCreateReceiptModalOpen] = useState(false);
  const [isAdvancePaymentModalOpen, setIsAdvancePaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    account_receivable_id: "",
    date_from: "",
    date_to: "",
    due_date_from: "",
    due_date_to: "",
    transaction_type: "receive_able",
  });
  const [page, setPage] = useState(1);
  const pageSize = 10; // Server-side search with pagination

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Handle filters change from table
  const handleFiltersChange = (newFilters: any) => {
    setFilters({
      ...newFilters,
      transaction_type: "receive_able",
    });
  };

  // Fetch transactions (receive_able, receive_able_vendor, and advance_sale_payment types only) - excluding sale and sale_return
  const { data: transactionsResponse, isLoading: receivablesLoading } = useQuery<{
    success: boolean;
    data: any[];
    count?: number;
  }>({
    queryKey: ['/api/transactions', 'receipts_view', filters, page, pageSize],
    queryFn: async () => {
      // Fetch all receipt types in one call (API supports comma-separated types)
      const params = new URLSearchParams();
      params.append('type', 'receive_able,receive_able_vendor,advance_sale_payment');
      if (filters.account_receivable_id) params.append('account_receivable_id', filters.account_receivable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search); // Send search to API
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      
      const res = await fetch(getApiUrl(`/api/transactions?${params.toString()}`), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch receipt transactions');
      const data = await res.json();
      
      // Transform transactions to receivables format
      const transformedReceipts = (data.data || []).map((tx: any) => {
        // Handle different transaction types
        if (tx.type === 'receive_able') {
          return {
            id: tx.id,
            account_receivable_id: tx.account_receivable_id,
            transaction_id: tx.id,
            amount: tx.paid_amount || '0.00',
            total_payment: tx.total_amount || '0.00',
            remaining_payment: tx.remaining || tx.remaining_payment || '0.00',
            status: 'paid' as const,
            description: tx.description,
            due_date: tx.date,
            receipt_invoice_number: tx.receipt_invoice_number,
            created_at: tx.created_at,
            updated_at: tx.updated_at,
            accountReceivable: tx.account_receivable_name ? {
              id: tx.account_receivable_id,
              name: tx.account_receivable_name,
            } : undefined,
            transaction: {
              id: tx.id,
              type: tx.type,
              date: tx.date,
              description: tx.description,
              mode_of_payment: tx.mode_of_payment,
              receipt_invoice_number: tx.receipt_invoice_number,
            },
          };
        } else if (tx.type === 'receive_able_vendor') {
          return {
            id: tx.id,
            account_payable_id: tx.account_payable_id,
            transaction_id: tx.id,
            amount: tx.paid_amount || '0.00',
            total_payment: tx.total_amount || '0.00',
            remaining_payment: tx.remaining || tx.remaining_payment || '0.00',
            status: 'paid' as const,
            description: tx.description,
            due_date: tx.date,
            receipt_invoice_number: tx.receipt_invoice_number,
            created_at: tx.created_at,
            updated_at: tx.updated_at,
            accountPayable: tx.account_payable_name ? {
              id: tx.account_payable_id,
              name: tx.account_payable_name,
            } : undefined,
            transaction: {
              id: tx.id,
              type: tx.type,
              date: tx.date,
              description: tx.description,
              mode_of_payment: tx.mode_of_payment,
              receipt_invoice_number: tx.receipt_invoice_number,
            },
          };
        } else {
          // advance_sale_payment
          return {
            id: tx.id,
            account_receivable_id: tx.account_receivable_id,
            transaction_id: tx.id,
            amount: tx.paid_amount || '0.00',
            total_payment: tx.total_amount || '0.00',
            remaining_payment: '0.00',
            status: 'paid' as const,
            description: tx.description,
            due_date: tx.date,
            sale_invoice_number: null,
            receipt_invoice_number: null,
            type: tx.type,
            created_at: tx.created_at,
            updated_at: tx.updated_at,
            accountReceivable: tx.account_receivable_name ? {
              id: tx.account_receivable_id,
              name: tx.account_receivable_name,
            } : undefined,
            transaction: {
              id: tx.id,
              type: tx.type,
              date: tx.date,
              description: tx.description,
              mode_of_payment: tx.mode_of_payment,
              receipt_invoice_number: null,
            },
          };
        }
      });
      
      return {
        success: true,
        data: transformedReceipts,
        count: data.count || transformedReceipts.length,
      };
    },
  });

  // No client-side filtering - data comes pre-filtered from API
  // Just use receivables directly as they're already filtered by the backend
  const filteredReceivables: ReceivableWithTransaction[] = transactionsResponse?.data || [];

  // Calculate metrics from the filtered list so cards match the table
  const metrics = useMemo(() => {
    const totals = filteredReceivables.reduce(
      (acc, r) => {
        const amount =
          typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount || 0;
        const paid =
          typeof r.total_payment === 'string'
            ? parseFloat(r.total_payment)
            : r.total_payment || 0;
        const remaining =
          typeof r.remaining_payment === 'string'
            ? parseFloat(r.remaining_payment)
            : r.remaining_payment || 0;

        acc.totalAmount += amount;
        acc.totalPaid += paid;
        acc.totalRemaining += remaining;
        return acc;
      },
      { totalAmount: 0, totalPaid: 0, totalRemaining: 0 }
    );

    return {
      totalReceivables: filteredReceivables.length,
      totalAmount: totals.totalAmount,
      totalPaid: totals.totalPaid,
      totalRemaining: totals.totalRemaining,
    };
  }, [filteredReceivables]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleViewReceivable = (receivable: Receivable) => {
    setSelectedReceivableId(receivable.id);
    setSelectedReceivable(receivable);
    setIsViewModalOpen(true);
  };

  const handleEditReceivable = (receivable: Receivable) => {
    setSelectedReceivableId(receivable.id);
    setSelectedReceivable(receivable);
    setIsEditModalOpen(true);
  };

  const handleDeleteReceivable = (receivable: Receivable) => {
    setSelectedReceivableId(receivable.id);
    setSelectedReceivable(receivable);
    setIsDeleteModalOpen(true);
  };

  const handlePrintReceivable = async (receivable: Receivable) => {
    try {
      // Fetch full transaction details with products for printing (replacing receivables)
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
      console.error('Error fetching transaction details for print:', error);
    }
  };

  const handleCreateReceiptSuccess = () => {
    // /api/receivables routes removed - use /api/transactions instead
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground">
            Manage and track all receipts received from clients.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center space-x-2 w-full sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              <span>Record New Receipt</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setIsCreateReceiptModalOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              AR Receipt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAdvancePaymentModalOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Advance Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Total Receivables */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{metrics.totalReceivables}</div>
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
            {receivablesLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{formatCurrency(metrics.totalAmount)}</div>
            )}
          </CardContent>
        </Card> */}

        {/* Metric 3: Total Received */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-green-600">
                {formatCurrency(metrics.totalPaid)}
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Metric 4: Total Remaining */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-orange-600">
                {formatCurrency(metrics.totalRemaining)}
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>

      {/* Receivables Table */}
      <ReceivablesTable
        receivables={filteredReceivables}
        isLoading={receivablesLoading}
        onView={handleViewReceivable}
        onEdit={handleEditReceivable}
        onDelete={handleDeleteReceivable}
        onPrint={handlePrintReceivable}
        onFiltersChange={handleFiltersChange}
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} • Showing {filteredReceivables.length} receipt{filteredReceivables.length === 1 ? '' : 's'}
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
            disabled={filteredReceivables.length < pageSize}
            onClick={() => {
              if (filteredReceivables.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateReceiptModal
        isOpen={isCreateReceiptModalOpen}
        onClose={() => setIsCreateReceiptModalOpen(false)}
        onSuccess={handleCreateReceiptSuccess}
      />

      <AdvancePaymentFromClientModal
        isOpen={isAdvancePaymentModalOpen}
        onClose={() => setIsAdvancePaymentModalOpen(false)}
        onSuccess={handleCreateReceiptSuccess}
      />

      <ReceivableInvoiceViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedReceivableId(null);
          setSelectedReceivable(null);
        }}
        receivableId={selectedReceivableId}
        onPrint={handlePrintReceivable}
      />

      <ReceivablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedReceivableId(null);
          setSelectedReceivable(null);
        }}
        receivable={selectedReceivable}
        keepDetailModalOpen={isViewModalOpen}
      />

      <ReceivableEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedReceivableId(null);
          setSelectedReceivable(null);
        }}
        receivableId={selectedReceivableId}
      />

      <ReceivableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedReceivableId(null);
          setSelectedReceivable(null);
        }}
        receivableId={selectedReceivableId}
      />
    </div>
  );
}
