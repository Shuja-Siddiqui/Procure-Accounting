import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FixedExpensesTable } from "@/components/internal-operation/fixed-expense/fixed-expenses-table";
import { CreateFixedExpenseModal } from "@/components/internal-operation/fixed-expense/create-fixed-expense-modal";
import { FixedExpenseConfirmationModal } from "@/components/internal-operation/fixed-expense/fixed-expense-confirmation-modal";
import { TransactionDetailModal } from "@/components/transactions/transaction-detail-modal";
import { MetricsCards } from "@/components/internal-operation/shared/metrics-cards";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";

interface FixedExpenseTransaction {
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

interface FixedExpenseFilters {
  source_account_id?: string;
  date_from?: string;
  date_to?: string;
}

export default function InternalOperationFixedExpense() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<FixedExpenseTransaction | null>(null);
  const [filters, setFilters] = useState<FixedExpenseFilters>({});
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const pageSize = 20;

  const buildQueryString = (filters: FixedExpenseFilters) => {
    const params = new URLSearchParams();
    params.append('type', 'fixed_expense');
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    params.append('page', String(page));
    params.append('limit', String(pageSize));
    return params.toString();
  };

  const { data: fixedExpensesResponse, isLoading: fixedExpensesLoading } = useQuery({
    queryKey: ['/api/transactions', 'fixed_expenses', filters, page, pageSize],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const url = queryString ? `/api/transactions?${queryString}` : `/api/transactions?type=fixed_expense&page=${page}&limit=${pageSize}`;
      return apiRequest('GET', url);
    },
  });

  const fixedExpenseTransactions: FixedExpenseTransaction[] = (fixedExpensesResponse?.data || []).map((tx: any) => ({
    ...tx,
    sourceAccount: tx.source_account_id ? {
      id: tx.source_account_id,
      name: tx.source_account_name || '',
      account_number: tx.source_account_number || '',
      account_type: tx.source_account_type || '',
    } : null,
  }));

  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats', 'fixed_expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'fixed_expense');
      if (filters.source_account_id) params.append('source_account_id', filters.source_account_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const url = `/api/transactions?${params.toString()}`;
      const response = await apiRequest('GET', url);
      const transactions = response.data || [];

      const totalAmount = transactions.reduce((sum: number, tx: any) =>
        sum + parseFloat(tx.paid_amount || '0'), 0);
      const totalFixedExpenses = transactions.length;

      return {
        data: {
          totalFixedExpenses,
          totalAmount,
        },
      };
    },
  });

  const metrics = useMemo(() => {
    const stats = statsResponse?.data || {
      totalFixedExpenses: 0,
      totalAmount: 0,
    };

    return {
      totalTransactions: stats.totalFixedExpenses,
      totalAmount: stats.totalAmount,
    };
  }, [statsResponse]);

  const handleView = (fixedExpense: FixedExpenseTransaction) => {
    setSelectedFixedExpense(fixedExpense);
  };

  const handleNext = (data: any) => {
    setConfirmationData(data);
    setIsCreateModalOpen(false);
    setIsConfirmationModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fixed Expense</h1>
            <p className="text-muted-foreground">
              Record and manage fixed expense transactions
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Fixed Expense</span>
        </Button>
      </div>

      {/* <MetricsCards
        totalTransactions={metrics.totalTransactions}
        totalAmount={metrics.totalAmount}
        isLoading={fixedExpensesLoading || statsLoading}
      /> */}

      <FixedExpensesTable
        fixedExpenses={fixedExpenseTransactions}
        isLoading={fixedExpensesLoading}
        onView={handleView}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} • Showing {fixedExpenseTransactions.length} transaction{fixedExpenseTransactions.length === 1 ? '' : 's'}
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
            disabled={fixedExpenseTransactions.length < pageSize}
            onClick={() => {
              if (fixedExpenseTransactions.length === pageSize) {
                setPage((p) => p + 1);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <CreateFixedExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onNext={handleNext}
      />

      {confirmationData && (
        <FixedExpenseConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => {
            setIsConfirmationModalOpen(false);
            setConfirmationData(null);
          }}
          formData={confirmationData}
        />
      )}

      {selectedFixedExpense && (
        <TransactionDetailModal
          isOpen={!!selectedFixedExpense}
          onClose={() => setSelectedFixedExpense(null)}
          transactionId={selectedFixedExpense.id}
        />
      )}
    </div>
  );
}