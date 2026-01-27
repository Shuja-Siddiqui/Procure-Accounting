import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard-new/stat-card";
import { CompanySpendingProgress } from "@/components/dashboard-new/company-spending-progress";
import { LatestTransactions } from "@/components/dashboard-new/latest-transactions";
import { FinancialSummaryCards } from "@/components/dashboard-new/financial-summary-cards";
import { Coins, DollarSign, Package } from "lucide-react";

interface AccountStats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: string;
  currencies: string[];
}

interface ProductStats {
  totalProducts: number;
  totalValue: number;
  averagePrice: number;
  maxPrice: number;
  minPrice: number;
  totalQuantity: number;
  averageQuantity: number;
}

export default function DashboardNew() {
  const { data: accountStats } = useQuery<{
    success: boolean;
    data: AccountStats;
  }>({
    queryKey: ['/api/accounts/stats'],
  });

  // Fetch all accounts for balance calculation
  const { data: accountsData } = useQuery<{
    success: boolean;
    data: Array<{ balance: string }>;
  }>({
    queryKey: ['/api/accounts'],
  });

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Fetch all deposits for capital calculation
  const { data: depositsData } = useQuery<{
    success: boolean;
    data: Array<{ total_amount: string }>;
  }>({
    queryKey: ['/api/transactions', 'deposits'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=deposit', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deposits');
      return response.json();
    },
  });

  // Fetch all batch inventory for inventory valuation
  const { data: batchesData } = useQuery<{
    success: boolean;
    data: Array<{
      available_quantity: string;
      purchase_price_per_unit: string;
    }>;
  }>({
    queryKey: ['/api/batch-inventory', 'valuation'],
    queryFn: async () => {
      const response = await fetch('/api/batch-inventory?includeExhausted=false', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login');
        }
        throw new Error('Failed to fetch batches');
      }
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

  // Calculate Capital: Sum of all deposits
  const capital = depositsData?.data?.reduce((sum, deposit) => {
    const amount = parseFloat(deposit.total_amount || '0');
    return sum + amount;
  }, 0) || 0;

  // Calculate Balance: Sum of balances in all accounts
  const balance = accountsData?.data?.reduce((sum, account) => {
    const accountBalance = parseFloat(account.balance || '0');
    return sum + accountBalance;
  }, 0) || 0;

  // Calculate Inventory Valuation: Sum of all batch values (available_quantity * purchase_price_per_unit)
  const inventoryValuation = batchesData?.data?.reduce((sum, batch) => {
    const availableQty = parseFloat(batch.available_quantity || '0');
    const purchasePrice = parseFloat(batch.purchase_price_per_unit || '0');
    const batchValue = availableQty * purchasePrice;
    return sum + batchValue;
  }, 0) || 0;

  // Mock company spending data - replace with actual API call later
  const companySpendingData = [
    {
      companyName: "Adil Steel",
      companySlug: "adil-steel",
      purchaseAmount: 514.10,
      saleAmount: 380.50,
      color: "#8B5CF6", // Purple
    },
    {
      companyName: "Hafiz Daniyal",
      companySlug: "hafiz-daniyal",
      purchaseAmount: 500.00,
      saleAmount: 450.00,
      color: "#EC4899", // Pink
    },
    {
      companyName: "Maqbool",
      companySlug: "maqbool",
      purchaseAmount: 165.75,
      saleAmount: 200.00,
      color: "#F97316", // Orange
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard New</h1>
          <p className="text-muted-foreground">
            Overview of your financial metrics
          </p>
        </div>
      </div> */}

      {/* Content Area */}
      <div className="flex flex-col  gap-2">
        {/* Stat Cards  */}
        <div className="w-full lg:w-[100%] grid grid-cols-1 md:grid-cols-3 gap-2">
          <StatCard
            title="Capital"
            value={formatCurrency(capital)}
            bgColor="bg-gradient-to-br from-orange-600 to-orange-700"
            icon={Coins}
          />
          <StatCard
            title="Balance"
            value={formatCurrency(balance)}
            bgColor="bg-gradient-to-br from-green-500 to-green-600"
            icon={DollarSign}
          />
          <StatCard
            title="Inventory Valuation"
            value={formatCurrency(inventoryValuation)}
            bgColor="bg-gradient-to-br from-purple-600 to-indigo-600"
            icon={Package}
          />
        </div>

        {/* Latest Transactions and Financial Summary Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 ">
          <div className="md:col-span-2">
            <LatestTransactions />
          </div>
          <div>
            <FinancialSummaryCards />
          </div>
        </div>

        {/* Company Spending Progress */}
        {/* <div className="w-full ">
          <CompanySpendingProgress />
        </div> */}
      </div>
    </div>
  );
}
