import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TransfersTable } from "@/components/internal-operation/transfer/transfers-table";
import { CreateTransferModal } from "@/components/internal-operation/transfer/create-transfer-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, DollarSign, TrendingUp, TrendingDown, Plus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface TransferTransaction {
  id: string;
  type: string;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  total_amount: string | number;
  paid_amount: string | number;
  description?: string | null;
  mode_of_payment?: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  sourceAccount?: {
    id: string;
    name: string;
    account_number?: string;
    account_type?: string;
  } | null;
  destinationAccount?: {
    id: string;
    name: string;
    account_number?: string;
    account_type?: string;
  } | null;
}

interface TransferFilters {
  source_account_id?: string;
  destination_account_id?: string;
  date_from?: string;
  date_to?: string;
}

export default function InternalOperationTransfer() {
  const [isCreateTransferModalOpen, setIsCreateTransferModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferTransaction | null>(null);
  const [filters, setFilters] = useState<TransferFilters>({});
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const pageSize = 20;

  // Helper to build query string from filters
  const buildQueryString = (filters: TransferFilters) => {
    const params = new URLSearchParams();
    params.append('type', 'transfer_out'); // Get transfer_out transactions (primary)
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

  // Fetch transfer transactions
  const { data: transfersResponse, isLoading: transfersLoading } = useQuery({
    queryKey: ['/api/transactions', 'transfers', filters, page, pageSize],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const url = queryString ? `/api/transactions?${queryString}` : `/api/transactions?type=transfer_out&page=${page}&limit=${pageSize}`;
      return apiRequest('GET', url);
    },
  });

  // Map backend response to frontend format
  const transferTransactions: TransferTransaction[] = (transfersResponse?.data || []).map((tx: any) => ({
    ...tx,
    sourceAccount: tx.source_account_id ? {
      id: tx.source_account_id,
      name: tx.source_account_name || '',
      account_number: tx.source_account_number || '',
      account_type: tx.source_account_type || '',
    } : null,
    destinationAccount: tx.destination_account_id ? {
      id: tx.destination_account_id,
      name: tx.destination_account_name || '',
      account_number: tx.destination_account_number || '',
      account_type: tx.destination_account_type || '',
    } : null,
  }));

  // Calculate stats from transactions
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats', 'transfers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'transfer_out');
      if (filters.source_account_id) params.append('source_account_id', filters.source_account_id);
      if (filters.destination_account_id) params.append('destination_account_id', filters.destination_account_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const url = `/api/transactions?${params.toString()}`;
      const response = await apiRequest('GET', url);
      const transactions = response.data || [];

      const totalAmount = transactions.reduce((sum: number, tx: any) =>
        sum + parseFloat(tx.paid_amount || '0'), 0);
      const totalTransfers = transactions.length;

      return {
        data: {
          totalTransfers,
          totalAmount,
        },
      };
    },
  });

  const metrics = useMemo(() => {
    const stats = statsResponse?.data || {
      totalTransfers: 0,
      totalAmount: 0,
    };

    return {
      totalTransfers: stats.totalTransfers,
      totalAmount: stats.totalAmount,
    };
  }, [statsResponse]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleView = (transfer: TransferTransaction) => {
    setSelectedTransfer(transfer);
    // You can add a view modal here if needed
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/internal-operation')}
            className="h-8 w-8 border flex-shrink-0"
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transfers</h1>
            <p className="text-muted-foreground">
              Manage and track all account transfers
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateTransferModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Transfer</span>
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Metric 1: Total Transfers */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {transfersLoading || statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{metrics.totalTransfers}</div>
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
            {transfersLoading || statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="md:text-2xl text-lg font-bold">{formatCurrency(metrics.totalAmount)}</div>
            )}
          </CardContent>
        </Card> */}
      </div>

      {/* Transfers Table */}
      <TransfersTable
        transfers={transferTransactions}
        isLoading={transfersLoading}
        onView={handleView}
        onFiltersChange={setFilters}
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} • Showing {transferTransactions.length} transfer{transferTransactions.length === 1 ? '' : 's'}
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
            disabled={transferTransactions.length < pageSize}
            onClick={() => {
              if (transferTransactions.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateTransferModal
        isOpen={isCreateTransferModalOpen}
        onClose={() => setIsCreateTransferModalOpen(false)}
        onSuccess={() => {
          // Queries will be invalidated by the modal
        }}
      />
    </div>
  );
}

