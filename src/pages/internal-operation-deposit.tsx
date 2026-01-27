import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DepositsTable } from "@/components/internal-operation/deposit/deposits-table";
import { CreateDepositModal } from "@/components/internal-operation/deposit/create-deposit-modal";
import { DepositConfirmationModal } from "@/components/internal-operation/deposit/deposit-confirmation-modal";
import { TransactionDetailModal } from "@/components/transactions/transaction-detail-modal";
import { MetricsCards } from "@/components/internal-operation/shared/metrics-cards";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";

interface DepositTransaction {
  id: string;
  type: string;
  source_account_id?: string | null;
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
}

interface DepositFilters {
  destination_account_id?: string;
  date_from?: string;
  date_to?: string;
}

export default function InternalOperationDeposit() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositTransaction | null>(null);
  const [filters, setFilters] = useState<DepositFilters>({});
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();

  const pageSize = 20;

  // Helper to build query string from filters
  const buildQueryString = (filters: DepositFilters) => {
    const params = new URLSearchParams();
    params.append('type', 'deposit');
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    params.append('page', String(page));
    params.append('limit', String(pageSize));
    return params.toString();
  };

  // Fetch deposit transactions
  const { data: depositsResponse, isLoading: depositsLoading } = useQuery({
    queryKey: ['/api/transactions', 'deposits', filters, page, pageSize],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const url = queryString ? `/api/transactions?${queryString}` : `/api/transactions?type=deposit&page=${page}&limit=${pageSize}`;
      return apiRequest('GET', url);
    },
  });

  // Map backend response to frontend format
  const depositTransactions: DepositTransaction[] = (depositsResponse?.data || []).map((tx: any) => ({
    ...tx,
    sourceAccount: tx.destination_account_id ? {
      id: tx.destination_account_id,
      name: tx.destination_account_name || '',
      account_number: tx.destination_account_number || '',
      account_type: tx.destination_account_type || '',
    } : null,
  }));

  // Calculate stats from transactions
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats', 'deposits', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'deposit');
      if (filters.destination_account_id) params.append('destination_account_id', filters.destination_account_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const url = `/api/transactions?${params.toString()}`;
      const response = await apiRequest('GET', url);
      const transactions = response.data || [];

      const totalAmount = transactions.reduce((sum: number, tx: any) =>
        sum + parseFloat(tx.paid_amount || '0'), 0);
      const totalDeposits = transactions.length;

      return {
        data: {
          totalDeposits,
          totalAmount,
        },
      };
    },
  });

  const metrics = useMemo(() => {
    const stats = statsResponse?.data || {
      totalDeposits: 0,
      totalAmount: 0,
    };

    return {
      totalTransactions: stats.totalDeposits,
      totalAmount: stats.totalAmount,
    };
  }, [statsResponse]);

  const handleView = (deposit: DepositTransaction) => {
    setSelectedDeposit(deposit);
  };

  const handleNext = (data: any) => {
    setConfirmationData(data);
    setIsCreateModalOpen(false);
    setIsConfirmationModalOpen(true);
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Deposits</h1>
          <p className="text-muted-foreground">
            Record and manage deposits to accounts
          </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Deposit</span>
        </Button>
      </div>

      {/* Metrics Cards */}
      {/* <MetricsCards
        totalTransactions={metrics.totalTransactions}
        totalAmount={metrics.totalAmount}
        isLoading={depositsLoading || statsLoading}
      /> */}

      {/* Deposits Table */}
      <DepositsTable
        deposits={depositTransactions}
        isLoading={depositsLoading}
        onView={handleView}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} • Showing {depositTransactions.length} deposit{depositTransactions.length === 1 ? '' : 's'}
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
            disabled={depositTransactions.length < pageSize}
            onClick={() => {
              if (depositTransactions.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateDepositModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onNext={handleNext}
      />

      {confirmationData && (
        <DepositConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => {
            setIsConfirmationModalOpen(false);
            setConfirmationData(null);
          }}
          formData={confirmationData}
        />
      )}

      {selectedDeposit && (
        <TransactionDetailModal
          isOpen={!!selectedDeposit}
          onClose={() => setSelectedDeposit(null)}
          transactionId={selectedDeposit.id}
        />
      )}
    </div>
  );
}

