import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard-new/stat-card";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Users, CreditCard } from "lucide-react";

interface AccountPayable {
  id: string;
  balance: string;
}

interface AccountReceivable {
  id: string;
  balance: string;
}

interface Transaction {
  id: string;
  type: string;
  profit_loss?: string | number | null;
  total_amount?: string;
}

export function FinancialSummaryCards() {
  // Fetch account payables
  const { data: payablesData } = useQuery<{
    success: boolean;
    data: AccountPayable[];
  }>({
    queryKey: ['/api/account-payables'],
    queryFn: async () => {
      const response = await fetch('/api/account-payables', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch payables');
      return response.json();
    },
  });

  // Fetch account receivables
  const { data: receivablesData } = useQuery<{
    success: boolean;
    data: AccountReceivable[];
  }>({
    queryKey: ['/api/account-receivables'],
    queryFn: async () => {
      const response = await fetch('/api/account-receivables', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch receivables');
      return response.json();
    },
  });

  // Fetch transactions for profit/loss calculation
  const { data: transactionsData } = useQuery<{
    success: boolean;
    data: Transaction[];
  }>({
    queryKey: ['/api/transactions', 'profit-loss'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/transactions?limit=10000', {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Calculate Payables: Sum of payables with positive balance + Sum of receivables with negative balance
  const totalPayables = (payablesData?.data?.reduce((sum, payable) => {
    const balance = parseFloat(payable.balance || '0');
    // Only include positive balances
    return sum + (balance > 0 ? balance : 0);
  }, 0) || 0) + (receivablesData?.data?.reduce((sum, receivable) => {
    const balance = parseFloat(receivable.balance || '0');
    // Only include negative balances (they become positive in payables)
    return sum + (balance < 0 ? Math.abs(balance) : 0);
  }, 0) || 0);

  // Calculate Receivables: Sum of receivables with positive balance + Sum of payables with negative balance
  const totalReceivables = (receivablesData?.data?.reduce((sum, receivable) => {
    const balance = parseFloat(receivable.balance || '0');
    // Only include positive balances
    return sum + (balance > 0 ? balance : 0);
  }, 0) || 0) + (payablesData?.data?.reduce((sum, payable) => {
    const balance = parseFloat(payable.balance || '0');
    // Only include negative balances (they become positive in receivables)
    return sum + (balance < 0 ? Math.abs(balance) : 0);
  }, 0) || 0);

  // Calculate profit/loss from transactions
  // Sum of profit_loss field from all transactions that have it
  const profitLoss = useMemo(() => {
    if (!transactionsData?.data || transactionsData.data.length === 0) {
      return 0;
    }
    
    return transactionsData.data.reduce((sum, transaction) => {
      // Check if profit_loss exists (not null/undefined/empty string) and parse it
      if (transaction.profit_loss !== null && 
          transaction.profit_loss !== undefined && 
          transaction.profit_loss !== '') {
        const profitValue = String(transaction.profit_loss).trim();
        if (profitValue) {
          const profit = parseFloat(profitValue);
          // Handle NaN case (if parsing fails)
          if (!isNaN(profit)) {
            return sum + profit;
          }
        }
      }
      return sum;
    }, 0);
  }, [transactionsData?.data]);

  const isProfit = profitLoss > 0;
  const profitLossFormatted = formatCurrency(Math.abs(profitLoss));

  // Get counts
  const payablesCount = payablesData?.data?.length || 0;
  const receivablesCount = receivablesData?.data?.length || 0;

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Profit/Loss Card */}
      <div className="flex-1 min-h-0">
        <StatCard
          title={isProfit ? "Profit" : "Loss"}
          value={profitLossFormatted}
          bgColor=""
          textColor={isProfit ? "text-green-600" : "text-red-600"}
          icon={isProfit ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Payables Card */}
      <div className="flex-1 min-h-0">
        <StatCard
          title="Payables"
          value={formatCurrency(totalPayables)}
          bgColor=""
          textColor="text-black"
          icon={ArrowUpRight}
        />
      </div>

      {/* Receivables Card */}
      <div className="flex-1 min-h-0">
        <StatCard
          title="Receivables"
          value={formatCurrency(totalReceivables)}
          bgColor=""
          textColor="text-black"
          icon={ArrowDownLeft}
        />
      </div>

      {/* Account Counts - Two cards side by side */}
      <div className="flex-1 min-h-0 flex gap-2">
        <div className="flex-1">
          <StatCard
            title="# A/P"
            value={payablesCount.toString()}
            bgColor=""
            textColor="text-black"
            // icon={CreditCard}
          />
        </div>
        <div className="flex-1">
          <StatCard
            title="# A/R"
            value={receivablesCount.toString()}
            bgColor=""
            textColor="text-black"
            // icon={CreditCard}
          />
        </div>
      </div>
    </div>
  );
}
