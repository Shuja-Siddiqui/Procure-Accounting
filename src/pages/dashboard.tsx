import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Globe,
  Plus,
  Search,
  BarChart3,
  Download,
  Edit,
  AlertTriangle,
  Package,
  TrendingUp,
  ShoppingCart,
  Warehouse,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Home,
  Clock,
  Bell,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { Account, Product } from "@shared/schema";

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
  productCategories: Array<{ product_category: string; count: number }>;
  constructionCategories: Array<{ construction_category: string; count: number }>;
}

interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  maxAmount: number;
  minAmount: number;
  typeStats: Array<{ type: string; count: number; totalAmount: number }>;
  modeStats: Array<{ mode_of_payment: string; count: number; totalAmount: number }>;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: accountStats } = useQuery<{
    success: boolean;
    data: AccountStats;
  }>({
    queryKey: ['/api/accounts/stats'],
  });

  const { data: productStats } = useQuery<{
    success: boolean;
    data: ProductStats;
  }>({
    queryKey: ['/api/products/stats'],
  });

  const { data: accountsResponse } = useQuery<{
    success: boolean;
    data: Account[];
    count: number;
  }>({
    queryKey: ['/api/accounts'],
  });

  const { data: productsResponse } = useQuery<{
    success: boolean;
    data: Product[];
    count: number;
  }>({
    queryKey: ['/api/products'],
  });

  const { data: transactionStats } = useQuery<{
    success: boolean;
    data: TransactionStats;
  }>({
    queryKey: ['/api/transactions/stats'],
  });

  // Fetch transactions for profit/loss calculation
  const { data: transactionsData } = useQuery<{
    success: boolean;
    data: Array<{ type: string; profit_loss?: string | number | null }>;
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

  const accounts = accountsResponse?.data || [];
  const products = productsResponse?.data || [];
  const recentAccounts = accounts?.slice(0, 4) || [];
  const recentProducts = products?.slice(0, 4) || [];

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

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleActionClick = (href: string) => {
    setLocation(href);
  };

  const quickActions = [
    {
      name: 'Add Account',
      href: '/accounts',
      icon: CreditCard,
      subIcon: Plus,
      color: 'text-primary bg-primary/10' // Primary/Orange theme
    },
    {
      name: 'View Accounts',
      href: '/accounts',
      icon: Users, // Using Users for viewing accounts/directory
      subIcon: Search,
      color: 'text-blue-600 bg-blue-100' // Blue theme
    },
    {
      name: 'Add Product',
      href: '/products',
      icon: Package,
      subIcon: Plus,
      color: 'text-emerald-600 bg-emerald-100' // Emerald/Green theme
    },
    {
      name: 'View Products',
      href: '/products',
      icon: ShoppingCart,
      subIcon: Search,
      color: 'text-purple-600 bg-purple-100' // Purple theme
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6" data-testid="dashboard-content">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and track all purchase payables
          </p>
        </div>
       
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
        {/* Accounts Section */}
        <Card data-testid="card-total-accounts">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Accounts</p>
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-2xl font-bold text-foreground" data-testid="text-total-accounts">
                  {accountStats?.data?.totalAccounts || 0}
                </p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-emerald-600 font-medium">{accountStats?.data?.activeAccounts || 0}</span>
              <span className="text-muted-foreground ml-1 truncate">active accounts</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-balance">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Balance</p>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-foreground" data-testid="text-total-balance">
                  {accountStats?.data ? formatCurrency(accountStats.data.totalBalance) : '₨0.00'}
                </p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-emerald-600 font-medium">Combined</span>
              <span className="text-muted-foreground ml-1 truncate">across all accounts</span>
            </div>
          </CardContent>
        </Card>

        {/* Products Section */}
        <Card data-testid="card-total-products">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-2xl font-bold text-foreground" data-testid="text-total-products">
                  {productStats?.data?.totalProducts || 0}
                </p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-blue-600 font-medium">{productStats?.data?.totalQuantity || 0}</span>
              <span className="text-muted-foreground ml-1 truncate">total quantity</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-inventory-value">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Inventory Value</p>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-foreground" data-testid="text-inventory-value">
                  {productStats?.data ? formatCurrency(productStats.data.totalValue) : '₨0.00'}
                </p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Warehouse className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-purple-600 font-medium">
                {productStats?.data ? formatCurrency(productStats.data.averagePrice) : '₨0.00'}
              </span>
              <span className="text-muted-foreground ml-1 truncate">avg price</span>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Statistics */}
        <Card data-testid="card-total-purchases">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Purchases</p>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-foreground" data-testid="text-total-purchases">
                  {transactionStats?.data?.typeStats?.find(t => t.type === 'purchase')?.totalAmount ?
                    formatCurrency(transactionStats.data.typeStats.find(t => t.type === 'purchase')!.totalAmount) : '₨0.00'}
                </p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-green-600 font-medium">
                {transactionStats?.data?.typeStats?.find(t => t.type === 'purchase')?.count || 0}
              </span>
              <span className="text-muted-foreground ml-1 truncate">transactions</span>
            </div>
          </CardContent>
        </Card>

        {/* Sale Statistics */}
        <Card data-testid="card-total-sales">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-foreground" data-testid="text-total-sales">
                  {transactionStats?.data?.typeStats?.find(t => t.type === 'sale')?.totalAmount ?
                    formatCurrency(transactionStats.data.typeStats.find(t => t.type === 'sale')!.totalAmount) : '₨0.00'}
                </p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-orange-600 font-medium">
                {transactionStats?.data?.typeStats?.find(t => t.type === 'sale')?.count || 0}
              </span>
              <span className="text-muted-foreground ml-1 truncate">transactions</span>
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss Statistics */}
        <Card data-testid="card-profit-loss">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Profit / Loss</p>
                <p 
                  className={cn(
                    "text-sm sm:text-base lg:text-lg xl:text-xl font-bold",
                    isProfit ? "text-green-600" : "text-red-600"
                  )}
                  data-testid="text-profit-loss"
                >
                  {formatCurrency(Math.abs(profitLoss))}
                </p>
              </div>
              <div className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isProfit ? "bg-green-100" : "bg-red-100"
              )}>
                {isProfit ? (
                  <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                )}
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center text-xs sm:text-sm">
              <span className={cn("font-medium", isProfit ? "text-green-600" : "text-red-600")}>
                {isProfit ? "Profit" : "Loss"}
              </span>
              <span className="text-muted-foreground ml-1 truncate">from transactions</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
        {/* Account Statistics */}
        <Card data-testid="card-account-stats">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm lg:text-base">
              <CreditCard className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Account Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 lg:space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="text-center p-3 lg:p-4 bg-muted/50 rounded-lg">
                  <p className="text-base lg:text-lg xl:text-xl font-bold text-foreground">{accountStats?.data?.totalAccounts || 0}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total Accounts</p>
                </div>
                <div className="text-center p-3 lg:p-4 bg-muted/50 rounded-lg">
                  <p className="text-base lg:text-lg xl:text-xl font-bold text-foreground">{accountStats?.data?.activeAccounts || 0}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Active Accounts</p>
                </div>
              </div>
              <div className="pt-3 lg:pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-muted-foreground">Total Balance</span>
                  <span className="text-xs lg:text-sm font-semibold text-foreground truncate ml-2">
                    {accountStats?.data ? formatCurrency(accountStats.data.totalBalance) : '₨0.00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Statistics */}
        <Card data-testid="card-product-stats">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm lg:text-base">
              <Package className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Product Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 lg:space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="text-center p-3 lg:p-4 bg-muted/50 rounded-lg">
                  <p className="text-base lg:text-lg xl:text-xl font-bold text-foreground">{productStats?.data?.totalProducts || 0}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total Products</p>
                </div>
                <div className="text-center p-3 lg:p-4 bg-muted/50 rounded-lg">
                  <p className="text-base lg:text-lg xl:text-xl font-bold text-foreground">{productStats?.data?.totalQuantity || 0}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total Quantity</p>
                </div>
              </div>
              <div className="pt-3 lg:pt-4 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-muted-foreground">Inventory Value</span>
                  <span className="text-xs lg:text-sm font-semibold text-foreground truncate ml-2">
                    {productStats?.data ? formatCurrency(productStats.data.totalValue) : '₨0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-muted-foreground">Average Price</span>
                  <span className="text-xs lg:text-sm font-medium text-foreground truncate ml-2">
                    {productStats?.data ? formatCurrency(productStats.data.averagePrice) : '₨0.00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Statistics */}
        <Card data-testid="card-transaction-stats">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm lg:text-base">
              <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Transaction Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 lg:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                <div className="text-center p-3 lg:p-4 bg-green-50 rounded-lg border border-green-200">
                  <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 mx-auto mb-2" />
                  <p className="text-sm lg:text-base xl:text-lg font-bold text-green-800 truncate">
                    {transactionStats?.data?.typeStats?.find(t => t.type === 'purchase')?.totalAmount ?
                      formatCurrency(transactionStats.data.typeStats.find(t => t.type === 'purchase')!.totalAmount) : '₨0.00'}
                  </p>
                  <p className="text-xs lg:text-sm text-green-600 font-medium">Total Purchases</p>
                  <p className="text-xs text-green-500 mt-1">
                    {transactionStats?.data?.typeStats?.find(t => t.type === 'purchase')?.count || 0} transactions
                  </p>
                </div>
                <div className="text-center p-3 lg:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm lg:text-base xl:text-lg font-bold text-orange-800 truncate">
                    {transactionStats?.data?.typeStats?.find(t => t.type === 'sale')?.totalAmount ?
                      formatCurrency(transactionStats.data.typeStats.find(t => t.type === 'sale')!.totalAmount) : '₨0.00'}
                  </p>
                  <p className="text-xs lg:text-sm text-orange-600 font-medium">Total Sales</p>
                  <p className="text-xs text-orange-500 mt-1">
                    {transactionStats?.data?.typeStats?.find(t => t.type === 'sale')?.count || 0} transactions
                  </p>
                </div>
                <div className={cn(
                  "text-center p-3 lg:p-4 rounded-lg border",
                  isProfit 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                )}>
                  {isProfit ? (
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 mx-auto mb-2" />
                  ) : (
                    <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 mx-auto mb-2" />
                  )}
                  <p className={cn(
                    "text-sm lg:text-base xl:text-lg font-bold truncate",
                    isProfit ? "text-green-800" : "text-red-800"
                  )}>
                    {formatCurrency(Math.abs(profitLoss))}
                  </p>
                  <p className={cn(
                    "text-xs lg:text-sm font-medium",
                    isProfit ? "text-green-600" : "text-red-600"
                  )}>
                    {isProfit ? "Profit" : "Loss"}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    isProfit ? "text-green-500" : "text-red-500"
                  )}>
                    from transactions
                  </p>
                </div>
              </div>
              <div className="pt-3 lg:pt-4 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-muted-foreground">Total Transactions</span>
                  <span className="text-xs lg:text-sm font-semibold text-foreground">
                    {transactionStats?.data?.totalTransactions || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-muted-foreground">Total Amount</span>
                  <span className="text-xs lg:text-sm font-semibold text-foreground truncate ml-2">
                    {transactionStats?.data ? formatCurrency(transactionStats.data.totalAmount) : '₨0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-muted-foreground">Average Amount</span>
                  <span className="text-xs lg:text-sm font-medium text-foreground truncate ml-2">
                    {transactionStats?.data ? formatCurrency(transactionStats.data.averageAmount) : '₨0.00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6 pb-20 md:pb-0">
        {/* Recent Account Activity */}
        <Card data-testid="card-recent-accounts">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Recent Accounts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAccounts.length > 0 ? (
                recentAccounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-3" data-testid={`account-${account.id}`}>
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.account_number} • {account.account_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(account.balance)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(account.created_at.toString())}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent accounts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Products Activity */}
        <Card data-testid="card-recent-products">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Recent Products</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProducts.length > 0 ? (
                recentProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-3" data-testid={`product-${product.id}`}>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.brand && `${product.brand} • `}{product.unit && `${product.quantity} ${product.unit}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(product.current_price)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(product.created_at.toString())}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent products</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Hidden on mobile, shown on desktop */}
        <Card data-testid="card-quick-actions" className="hidden lg:block">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Account Actions */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Account Management</span>
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="p-3 h-auto flex items-center space-x-3 text-left"
                    onClick={() => setLocation('/accounts')}
                    data-testid="button-create-account"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Create Account</h4>
                      <p className="text-xs text-muted-foreground">Add a new account</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="p-3 h-auto flex items-center space-x-3 text-left"
                    onClick={() => setLocation('/accounts')}
                    data-testid="button-view-accounts"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Search className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">View Accounts</h4>
                      <p className="text-xs text-muted-foreground">Browse all accounts</p>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Product Actions */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>Product Management</span>
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="p-3 h-auto flex items-center space-x-3 text-left"
                    onClick={() => setLocation('/products')}
                    data-testid="button-create-product"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Create Product</h4>
                      <p className="text-xs text-muted-foreground">Add a new product</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="p-3 h-auto flex items-center space-x-3 text-left"
                    onClick={() => setLocation('/products')}
                    data-testid="button-view-products"
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">View Products</h4>
                      <p className="text-xs text-muted-foreground">Browse inventory</p>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Glassmorphism (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 p-4">
        <div
          className="bg-orange-50 backdrop-blur-md rounded-full shadow-2xl border border-gray-100 px-3 py-1"
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 3, 0.15))' }}
        >
          <nav>
            <ul className="grid grid-cols-4 gap-0">
              {quickActions.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                const SubIcon = item.subIcon;

                return (
                  <li key={item.name} className="flex-1">
                    <a href={item.href}>
                      <button
                        onClick={() => handleActionClick(item.href)}
                        className={cn(
                          "w-full flex flex-col items-center justify-center p-2 transition-all duration-200 rounded-xl group",
                          // Base button style
                          "text-gray-600 hover:bg-gray-50",
                          // Conditional highlight for active a (if desired, though for quick actions, direct navigation might be better)
                          // isActive && "bg-gray-100 text-gray-900" 
                        )}
                        aria-label={item.name}
                      >
                        {/* Icon Container - mimicking the card style but smaller */}
                        <div className={cn(
                          "relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                          item.color // Uses the specific color class defined in quickActions array
                        )}>
                          <Icon className="w-4 h-4" />

                          {/* Tiny Plus/Search indicator - placed as a small badge */}
                          <SubIcon className="absolute -top-0.5 -right-0.5 w-3 h-3 p-[1px] rounded-full text-white bg-black/60 opacity-80" />
                        </div>

                        {/* Text label */}
                        <span className="text-[8px] mt-1 font-medium text-gray-700 truncate group-hover:text-black">
                          {item.name} {/* Use only the first word (Create/View) for extreme compactness */}
                        </span>
                      </button>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
