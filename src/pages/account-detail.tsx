import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, ExternalLink, Search, Filter, Eye } from "lucide-react";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import { AccountDeleteModal } from "@/components/accounts/account-delete-modal";
import { CopyableId } from "@/components/ui/copyable-id";
import type { Account } from "@shared/schema";

interface Transaction {
  id: string;
  type: string;
  total_amount?: string | number | null;
  amount?: number | string; // Keep for backward compatibility
  description?: string | null;
  created_at: string;
  updated_at?: string;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  source_account_name?: string | null;
  source_account_number?: string | null;
  source_account_type?: string | null;
  destination_account_name?: string | null;
  destination_account_number?: string | null;
  destination_account_type?: string | null;
  opening_balance?: string | number | null;
  closing_balance?: string | number | null;
  mode_of_payment?: string | null;
  paid_amount?: string | number | null;
  remaining_payment?: string | number | null;
  profit_loss?: string | number | null;
  user_id?: string | null;
  date?: string | null;
  account_payable_id?: string | null;
  account_receivable_id?: string | null;
  purchaser_id?: string | null;
  purchase_invoice_number?: string | null;
  payment_invoice_number?: string | null;
  receipt_invoice_number?: string | null;
  sale_invoice_number?: string | null;
}

export default function AccountDetail() {
  const [, params] = useRoute("/accounts/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionViewOpen, setIsTransactionViewOpen] = useState(false);

  const { data: accountResponse, isLoading: accountLoading } = useQuery<{
    success: boolean;
    data: Account;
  }>({
    queryKey: [`/api/accounts/${id}`],
    enabled: !!id,
  });

  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery<{
    success: boolean;
    data: Transaction[];
  }>({
    queryKey: [`/api/accounts/${id}/transactions`],
    enabled: !!id,
  });

  const account = accountResponse?.data;
  const transactions = transactionsResponse?.data || [];

  // Filter transactions based on search term and type
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch = searchTerm === "" || 
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        transaction.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.source_account_name && transaction.source_account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (transaction.destination_account_name && transaction.destination_account_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return 'Rs 0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'Rs 0.00';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Helper function to get transaction amount (checks total_amount first, then amount for backward compatibility)
  const getTransactionAmount = (transaction: Transaction): number => {
    const amount = transaction.total_amount ?? transaction.amount;
    if (amount === null || amount === undefined) return 0;
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(numAmount) ? 0 : numAmount;
  };

  const getTransactionTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'deposit': 'bg-green-50 border-green-200 text-green-800',
      'transfer': 'bg-blue-50 border-blue-200 text-blue-800',
      'transfer_in': 'bg-emerald-50 border-emerald-200 text-emerald-800',
      'transfer_out': 'bg-orange-50 border-orange-200 text-orange-800',
      'purchase': 'bg-purple-50 border-purple-200 text-purple-800',
      'purchase_return': 'bg-purple-50 border-purple-200 text-purple-800',
      'sale': 'bg-indigo-50 border-indigo-200 text-indigo-800',
      'sale_return': 'bg-indigo-50 border-indigo-200 text-indigo-800',
      'advance_inventory': 'bg-cyan-50 border-cyan-200 text-cyan-800',
      'advance_account_receivable_payment': 'bg-teal-50 border-teal-200 text-teal-800',
      'advance_account_payable_payment': 'bg-teal-50 border-teal-200 text-teal-800',
      'advance_account_receivable_inventory': 'bg-cyan-50 border-cyan-200 text-cyan-800',
      'asset_purchase': 'bg-amber-50 border-amber-200 text-amber-800',
      'loan': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'loan_return': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'other_expense': 'bg-red-50 border-red-200 text-red-800',
      'lost_and_damage': 'bg-red-50 border-red-200 text-red-800',
      'pay_able': 'bg-rose-50 border-rose-200 text-rose-800',
      'receive_able': 'bg-pink-50 border-pink-200 text-pink-800',
    };
    return colorMap[type] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getTransactionTypeBadgeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'deposit': 'bg-green-600 text-white border-green-600 hover:bg-green-700',
      'transfer': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
      'transfer_in': 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
      'transfer_out': 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700',
      'purchase': 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700',
      'purchase_return': 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700',
      'sale': 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700',
      'sale_return': 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700',
      'advance_inventory': 'bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700',
      'advance_account_receivable_payment': 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700',
      'advance_account_payable_payment': 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700',
      'advance_account_receivable_inventory': 'bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700',
      'asset_purchase': 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700',
      'loan': 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700',
      'loan_return': 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700',
      'other_expense': 'bg-red-600 text-white border-red-600 hover:bg-red-700',
      'lost_and_damage': 'bg-red-600 text-white border-red-600 hover:bg-red-700',
      'pay_able': 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
      'receive_able': 'bg-pink-600 text-white border-pink-600 hover:bg-pink-700',
    };
    return colorMap[type] || 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700';
  };

  const getTransactionTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'deposit': '💰',
      'transfer': '🔄',
      'transfer_in': '⬇️',
      'transfer_out': '⬆️',
      'purchase': '🛒',
      'purchase_return': '↩️',
      'sale': '💼',
      'sale_return': '↩️',
      'advance_inventory': '📦',
      'advance_account_receivable_payment': '💳',
      'advance_account_payable_payment': '💳',
      'advance_account_receivable_inventory': '📦',
      'asset_purchase': '🏗️',
      'loan': '🏦',
      'loan_return': '↩️',
      'other_expense': '💸',
      'lost_and_damage': '❌',
      'pay_able': '📤',
      'receive_able': '📥',
    };
    return iconMap[type] || '📄';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };



  const handleEdit = () => {
    if (account) {
      setSelectedAccount(account);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = () => {
    if (account) {
      setSelectedAccount(account);
      setIsDeleteModalOpen(true);
    }
  };

  const handleAccountClick = (accountId: string) => {
    setLocation(`/accounts/${accountId}`);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionViewOpen(true);
  };

  const handleCloseModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsTransactionViewOpen(false);
    setSelectedAccount(null);
    setSelectedTransaction(null);
  };

  if (accountLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">Account not found</h3>
          <p className="text-muted-foreground mb-4">The account you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/accounts')}>
            Back to Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/accounts')}
            className="h-8 w-8 border flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{account.name}</h1>
            <p className="text-sm text-muted-foreground">Account #{account.account_number}</p>
          </div>
        </div>
        {/* <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleEdit}
            className="flex-1 sm:flex-initial"
          >
            <Edit className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="flex-1 sm:flex-initial"
          >
            <Trash2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div> */}
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(account.balance)}</div>
            <p className="text-xs text-muted-foreground">Available funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Type</CardTitle>
            <Badge variant="outline" className="capitalize hidden sm:block">
              {account.account_type}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold capitalize">{account.account_type}</div>
            <p className="text-xs text-muted-foreground">Account category</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Badge 
              variant={account.status === 'active' ? 'default' : 'secondary'}
              className={`hidden sm:block ${
                account.status === 'active' 
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' 
                  : 'bg-red-100 text-red-800 hover:bg-red-100'
              }`}
            >
              {account.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold capitalize">{account.status}</div>
            <p className="text-xs text-muted-foreground">Account status</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Desktop View */}
            <div className="hidden md:block space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Account Number:</span>
                <span className="text-sm font-medium">{account.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Handler:</span>
                <span className="text-sm font-medium">{account.handler || 'Not assigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">City:</span>
                <span className="text-sm font-medium">{account.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm font-medium">
                  {new Date(account.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated:</span>
                <span className="text-sm font-medium">
                  {new Date(account.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
              <div className="pb-2 border-b">
                <span className="text-xs text-muted-foreground">Account Number</span>
                <div className="text-sm font-medium mt-1">{account.account_number}</div>
              </div>
              <div className="pb-2 border-b">
                <span className="text-xs text-muted-foreground">Handler</span>
                <div className="text-sm font-medium mt-1">{account.handler || 'Not assigned'}</div>
              </div>
              <div className="pb-2 border-b">
                <span className="text-xs text-muted-foreground">City</span>
                <div className="text-sm font-medium mt-1">{account.city}</div>
              </div>
              <div className="pb-2 border-b">
                <span className="text-xs text-muted-foreground">Created</span>
                <div className="text-sm font-medium mt-1">
                  {new Date(account.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Last Updated</span>
                <div className="text-sm font-medium mt-1">
                  {new Date(account.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Transactions:</span>
                  <span className="text-sm font-medium">{transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Transaction:</span>
                  <span className="text-sm font-medium">
                    {transactions.length > 0 
                      ? formatDate(transactions[0].created_at)
                      : 'No transactions'
                    }
                  </span>
                </div>
                
                {/* Deposits Summary */}
                {(() => {
                  const depositTransactions = transactions.filter(t => ['deposit', 'transfer_in'].includes(t.type));
                  const totalDeposits = depositTransactions.reduce((sum, t) => {
                    return sum + getTransactionAmount(t);
                  }, 0);
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Deposits:</span>
                        <span className="text-sm font-medium text-green-600">
                          {depositTransactions.length} transactions
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Deposit Amount:</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(totalDeposits)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Withdrawals Summary */}
                {(() => {
                  const withdrawalTransactions = transactions.filter(t => ['transfer_out'].includes(t.type));
                  const totalWithdrawals = withdrawalTransactions.reduce((sum, t) => {
                    return sum + getTransactionAmount(t);
                  }, 0);
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Withdrawals:</span>
                        <span className="text-sm font-medium text-red-600">
                          {withdrawalTransactions.length} transactions
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Withdrawal Amount:</span>
                        <span className="text-sm font-bold text-red-600">
                          {formatCurrency(totalWithdrawals)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Net Flow Summary */}
                {(() => {
                  const depositTransactions = transactions.filter(t => ['deposit', 'transfer_in'].includes(t.type));
                  const withdrawalTransactions = transactions.filter(t => ['transfer_out'].includes(t.type));
                  
                  const totalDeposits = depositTransactions.reduce((sum, t) => {
                    return sum + getTransactionAmount(t);
                  }, 0);
                  
                  const totalWithdrawals = withdrawalTransactions.reduce((sum, t) => {
                    return sum + getTransactionAmount(t);
                  }, 0);
                  
                  const netFlow = totalDeposits - totalWithdrawals;
                  const isPositive = netFlow >= 0;
                  
                  return (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Net Flow:</span>
                        <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(netFlow))} {isPositive ? 'In' : 'Out'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle>Account Transactions</CardTitle>
              <p className="text-sm text-muted-foreground">
                All transactions related to this account ({transactions.length} total)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {transactions.filter(t => ['deposit', 'transfer_in'].includes(t.type)).length} Deposits
              </Badge>
              <Badge variant="outline" className="text-xs">
                {transactions.filter(t => ['transfer_out'].includes(t.type)).length} Withdrawals
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by ID, description, or account names..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="transfer_in">Transfer In</SelectItem>
                    <SelectItem value="transfer_out">Transfer Out</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-end">
                <Badge variant="secondary" className="text-xs">
                  {filteredTransactions.length} of {transactions.length} transactions
                </Badge>
              </div>
            </div>
          </div>

          {transactionsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {transactions.length === 0 
                  ? "No transactions found for this account." 
                  : "No transactions match your search criteria."
                }
              </p>
              {transactions.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Description</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Opening Balance</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Closing Balance</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Source Account</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Destination Account</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Payment Mode</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr 
                        key={transaction.id} 
                        className={`border-b ${getTransactionTypeColor(transaction.type)} hover:opacity-80 transition-colors cursor-pointer`}
                        onClick={() => handleViewTransaction(transaction)}
                        title="Click to view transaction details"
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <CopyableId id={transaction.id} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getTransactionTypeIcon(transaction.type)}</span>
                            <span className={`font-medium capitalize text-sm px-3 py-1 rounded-full border ${getTransactionTypeBadgeColor(transaction.type)}`}>
                              {transaction.type.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-foreground">{transaction.description || '-'}</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-medium text-sm">
                            {formatCurrency(transaction.total_amount ?? transaction.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-muted-foreground">
                            {transaction.opening_balance ? formatCurrency(transaction.opening_balance) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-muted-foreground">
                            {transaction.closing_balance ? formatCurrency(transaction.closing_balance) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          {transaction.source_account_name && transaction.source_account_id ? (
                            <button
                              onClick={() => handleAccountClick(transaction.source_account_id!)}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.source_account_name} details`}
                            >
                              <span>{transaction.source_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          {transaction.destination_account_name && transaction.destination_account_id ? (
                            <button
                              onClick={() => handleAccountClick(transaction.destination_account_id!)}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.destination_account_name} details`}
                            >
                              <span>{transaction.destination_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground capitalize">
                            {transaction.mode_of_payment || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {transaction.date ? formatDate(transaction.date) : formatDate(transaction.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-2 ">
                {filteredTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="border rounded-lg p-4 space-y-2 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleViewTransaction(transaction)}
                    title="Click to view transaction details"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Badge 
                          variant="outline" 
                          className={`capitalize font-medium text-xs ${getTransactionTypeBadgeColor(transaction.type)}`}
                        >
                          {transaction.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="font-semibold text-base flex-shrink-0 ml-2">
                        {formatCurrency(transaction.total_amount ?? transaction.amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">Transaction ID</span>
                      <CopyableId id={transaction.id} />
                    </div>
                    
                    {transaction.description && (
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground mb-1 block">Description</span>
                        <p className="text-sm text-foreground">{transaction.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Opening Balance</span>
                        <p className="text-sm font-medium">
                          {transaction.opening_balance ? formatCurrency(transaction.opening_balance) : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Closing Balance</span>
                        <p className="text-sm font-medium">
                          {transaction.closing_balance ? formatCurrency(transaction.closing_balance) : '-'}
                        </p>
                      </div>
                    </div>
                    
                    {(transaction.source_account_name || transaction.destination_account_name) && (
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        {transaction.source_account_name && transaction.source_account_id && (
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">From Account</span>
                            <button
                              onClick={() => handleAccountClick(transaction.source_account_id!)}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.source_account_name} details`}
                            >
                              <span>{transaction.source_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {transaction.destination_account_name && transaction.destination_account_id && (
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">To Account</span>
                            <button
                              onClick={() => handleAccountClick(transaction.destination_account_id!)}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.destination_account_name} details`}
                            >
                              <span>{transaction.destination_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Payment Mode</span>
                        <p className="text-sm font-medium capitalize">
                          {transaction.mode_of_payment || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Date</span>
                        <p className="text-sm font-medium">
                          {transaction.date ? formatDate(transaction.date) : formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AccountFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        mode="edit"
        account={selectedAccount}
      />

      <AccountDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseModals}
        account={selectedAccount}
      />

      {/* Transaction View Modal */}
      {isTransactionViewOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Transaction Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModals}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Transaction ID */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transaction ID</p>
                  <CopyableId id={selectedTransaction.id} />
                </div>

                {/* Transaction Type */}
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTransactionTypeIcon(selectedTransaction.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold capitalize">
                      {selectedTransaction.type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-muted-foreground">Transaction Type</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(selectedTransaction.total_amount ?? selectedTransaction.amount)}
                  </p>
                </div>

                {/* Payment Details */}
                {(selectedTransaction.paid_amount || selectedTransaction.remaining_payment) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Payment Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTransaction.paid_amount && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Paid Amount</p>
                          <p className="font-medium">
                            {formatCurrency(selectedTransaction.paid_amount)}
                          </p>
                        </div>
                      )}
                      {selectedTransaction.remaining_payment && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Remaining Payment</p>
                          <p className="font-medium">
                            {formatCurrency(selectedTransaction.remaining_payment)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profit/Loss */}
                {selectedTransaction.profit_loss && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Profit/Loss</p>
                    <p className={`text-xl font-bold ${
                      parseFloat(String(selectedTransaction.profit_loss)) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(selectedTransaction.profit_loss)}
                    </p>
                  </div>
                )}

                {/* Description */}
                {selectedTransaction.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Description</p>
                    <p className="text-foreground">{selectedTransaction.description}</p>
                  </div>
                )}

                {/* Account Information */}
                {(selectedTransaction.source_account_name || selectedTransaction.destination_account_name) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Account Information</p>
                    <div className="space-y-3">
                      {selectedTransaction.source_account_name && selectedTransaction.source_account_id && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">From Account</p>
                            <p className="font-medium">{selectedTransaction.source_account_name}</p>
                            {selectedTransaction.source_account_number && (
                              <p className="text-xs text-muted-foreground">#{selectedTransaction.source_account_number}</p>
                            )}
                            {selectedTransaction.source_account_type && (
                              <p className="text-xs text-muted-foreground capitalize">{selectedTransaction.source_account_type}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccountClick(selectedTransaction.source_account_id!)}
                            className="flex items-center space-x-1 ml-2"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {selectedTransaction.destination_account_name && selectedTransaction.destination_account_id && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">To Account</p>
                            <p className="font-medium">{selectedTransaction.destination_account_name}</p>
                            {selectedTransaction.destination_account_number && (
                              <p className="text-xs text-muted-foreground">#{selectedTransaction.destination_account_number}</p>
                            )}
                            {selectedTransaction.destination_account_type && (
                              <p className="text-xs text-muted-foreground capitalize">{selectedTransaction.destination_account_type}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccountClick(selectedTransaction.destination_account_id!)}
                            className="flex items-center space-x-1 ml-2"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Balance Information */}
                {(selectedTransaction.opening_balance || selectedTransaction.closing_balance) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Balance Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Opening Balance</p>
                        <p className="font-medium">
                          {selectedTransaction.opening_balance ? formatCurrency(selectedTransaction.opening_balance) : '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Closing Balance</p>
                        <p className="font-medium">
                          {selectedTransaction.closing_balance ? formatCurrency(selectedTransaction.closing_balance) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Numbers */}
                {(selectedTransaction.purchase_invoice_number || 
                  selectedTransaction.sale_invoice_number || 
                  selectedTransaction.payment_invoice_number || 
                  selectedTransaction.receipt_invoice_number) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Invoice Numbers</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedTransaction.purchase_invoice_number && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Purchase Invoice</p>
                          <p className="font-medium">{selectedTransaction.purchase_invoice_number}</p>
                        </div>
                      )}
                      {selectedTransaction.sale_invoice_number && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Sale Invoice</p>
                          <p className="font-medium">{selectedTransaction.sale_invoice_number}</p>
                        </div>
                      )}
                      {selectedTransaction.payment_invoice_number && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Payment Invoice</p>
                          <p className="font-medium">{selectedTransaction.payment_invoice_number}</p>
                        </div>
                      )}
                      {selectedTransaction.receipt_invoice_number && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Receipt Invoice</p>
                          <p className="font-medium">{selectedTransaction.receipt_invoice_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Details */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Transaction Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Payment Mode</p>
                      <p className="capitalize">{selectedTransaction.mode_of_payment || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Transaction Date</p>
                      <p>{selectedTransaction.date ? formatDate(selectedTransaction.date) : formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created At</p>
                      <p>{formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    {selectedTransaction.updated_at && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Updated At</p>
                        <p>{formatDate(selectedTransaction.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleCloseModals}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
