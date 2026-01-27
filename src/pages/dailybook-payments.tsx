import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PaymentsTable } from "@/components/dailybooks/payment/payments-table";
import { PaymentInvoiceViewModal } from "@/components/dailybooks/payment/payment-invoice-view-modal";
import { PaymentPrintModal } from "@/components/dailybooks/payment/payment-print-modal";
import { CreatePaymentModal } from "@/components/dailybooks/payment/create-payment-modal";
import { AdvancePaymentModal } from "@/components/dailybooks/purchase/advance-payment-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, DollarSign, CreditCard, Plus, ChevronDown } from "lucide-react";

interface PaymentTransaction {
  id: string;
  type: string;
  account_payable_id: string;
  source_account_id?: string | null;
  total_amount: string | number;
  description?: string | null;
  mode_of_payment?: string | null;
  date: string;
  payment_invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  accountPayable?: {
    id: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  } | null;
  payable?: {
    id: string;
    total_amount: string | number;
    paid_amount: string | number;
    remaining_payment: string | number;
  } | null;
}

interface PaymentFilters {
  search?: string;
  account_payable_id?: string;
  date_from?: string;
  date_to?: string;
}

export default function DailyBookPayments() {
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);
  const [isAdvancePaymentModalOpen, setIsAdvancePaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [printPayment, setPrintPayment] = useState<PaymentTransaction | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 10; // Server-side search with pagination

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Helper to build query string from filters
  const buildQueryString = (filters: PaymentFilters) => {
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

  // Fetch payment transactions (pay_able, pay_able_client, and advance_purchase_payment types)
  const { data: paymentsResponse, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/transactions', 'pay_able,pay_able_client,advance_purchase_payment', filters, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Include pay_able, pay_able_client, and advance_purchase_payment types
      params.append('type', 'pay_able,pay_able_client,advance_purchase_payment');
      if (filters.account_payable_id) params.append('account_payable_id', filters.account_payable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search); // Send search to API
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      
      const url = `/api/transactions?${params.toString()}`;
      const response = await apiRequest('GET', url);
      // Transform response to match PaymentTransaction interface
      // The response should already have accountPayable joined, but we need to ensure structure matches
      return {
        success: true,
        data: (response.data || []).map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          account_payable_id: tx.account_payable_id,
          account_receivable_id: tx.account_receivable_id,
          source_account_id: tx.source_account_id,
          total_amount: tx.total_amount || '0.00',
          paid_amount: tx.paid_amount || '0.00',
          remaining_payment: tx.remaining_payment || '0.00',
          description: tx.description,
          mode_of_payment: tx.mode_of_payment,
          date: tx.date,
          payment_invoice_number: tx.payment_invoice_number || null,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          accountPayable: tx.account_payable_name ? {
            id: tx.account_payable_id,
            name: tx.account_payable_name,
            number: tx.account_payable_number,
            city: tx.account_payable_city,
            address: tx.account_payable_address,
          } : null,
          accountReceivable: tx.account_receivable_name ? {
            id: tx.account_receivable_id,
            name: tx.account_receivable_name,
            number: tx.account_receivable_number,
            city: tx.account_receivable_city,
            address: tx.account_receivable_address,
          } : null,
        })),
      };
    },
  });

  const paymentTransactions: PaymentTransaction[] = paymentsResponse?.data || [];

  // Calculate stats from transactions (including pay_able and advance_purchase_payment)
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats', 'payments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Include pay_able, pay_able_client, and advance_purchase_payment types
      params.append('type', 'pay_able,pay_able_client,advance_purchase_payment');
      if (filters.account_payable_id) params.append('account_payable_id', filters.account_payable_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const url = `/api/transactions?${params.toString()}`;
      const response = await apiRequest('GET', url);
      const transactions = response.data || [];
      
      const totalAmount = transactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.total_amount || '0'), 0);
      const totalPaid = transactions.reduce((sum: number, tx: any) => 
        sum + parseFloat(tx.paid_amount || '0'), 0);
      
      return {
        data: {
          totalPayments: transactions.length,
          totalAmount,
          totalPaid,
        },
      };
    },
  });

  const metrics = useMemo(() => {
    const stats = statsResponse?.data || {
      totalPayables: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0,
    };

    return {
      // Interpreted as "number of payments/purchases" in the header card
      totalPayments: stats.totalPayables,
      totalAmount: stats.totalAmount,
      totalPaid: stats.totalPaid,
      totalRemaining: stats.totalRemaining,
    };
  }, [statsResponse]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleView = (payment: PaymentTransaction) => {
    setSelectedPaymentId(payment.id);
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handlePrintPayable = (payment: PaymentTransaction) => {
    setPrintPayment(payment);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage and track all payable payments
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center space-x-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span>Create Payment</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setIsCreatePaymentModalOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              AP Payment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAdvancePaymentModalOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Advance Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Metric 1: Total Payments */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {paymentsLoading || statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{metrics.totalPayments}</div>
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
            {paymentsLoading || statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{formatCurrency(metrics.totalAmount)}</div>
            )}
          </CardContent>
        </Card> */}

        {/* Metric 3: Total Paid */}
        {/* <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {paymentsLoading || statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-green-600">
                {formatCurrency(metrics.totalPaid)}
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Metric 4: Remaining Payments */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {paymentsLoading || statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold text-orange-600">
                {formatCurrency(metrics.totalRemaining)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding amounts to be paid
            </p>
          </CardContent>
        </Card> */}
      </div>

      {/* Payments Table */}
      <PaymentsTable
        payments={paymentTransactions}
        isLoading={paymentsLoading}
        onView={handleView}
        onFiltersChange={setFilters}
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} • Showing {paymentTransactions.length} payment{paymentTransactions.length === 1 ? '' : 's'}
          {paymentsResponse?.count && ` of ${paymentsResponse.count}`}
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
            disabled={paymentTransactions.length < pageSize}
            onClick={() => {
              if (paymentTransactions.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreatePaymentModal
        isOpen={isCreatePaymentModalOpen}
        onClose={() => setIsCreatePaymentModalOpen(false)}
        onSuccess={() => {
          // Queries will be invalidated by the modal
        }}
      />

      <AdvancePaymentModal
        isOpen={isAdvancePaymentModalOpen}
        onClose={() => setIsAdvancePaymentModalOpen(false)}
        onSuccess={() => {
          // Queries will be invalidated by the modal
        }}
      />

      <PaymentInvoiceViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPaymentId(null);
          setSelectedPayment(null);
        }}
        paymentId={selectedPaymentId}
        onPrint={handlePrintPayable}
      />

      <PaymentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintPayment(null);
        }}
        payment={printPayment}
        keepDetailModalOpen={isViewModalOpen}
      />
    </div>
  );
}

