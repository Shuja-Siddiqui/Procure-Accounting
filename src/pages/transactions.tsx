import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, TrendingUp, DollarSign, Activity, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionFormModal } from "@/components/transactions/transaction-form-modal";
import { TransactionDeleteModal } from "@/components/transactions/transaction-delete-modal";
import { TransactionDetailModal } from "@/components/transactions/transaction-detail-modal";
import type { TransactionWithRelations, Transaction } from "@/types/transactions";

export default function TransactionsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Fetch transactions
  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: () => apiRequest('GET', '/api/transactions'),
  });

  // Fetch transaction stats
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/transactions/stats'],
    queryFn: () => apiRequest('GET', '/api/transactions/stats'),
  });

  const transactions: TransactionWithRelations[] = transactionsResponse?.data || [];
  const stats = statsResponse?.data;

  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setIsCreateModalOpen(true);
  };

  const handleEditTransaction = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDeleteTransaction = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleViewTransaction = (transaction: TransactionWithRelations) => {
    setSelectedTransactionId(transaction.id);
    setIsDetailModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTransactionTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'deposit': 'bg-green-100 text-green-800',
      'transfer': 'bg-blue-100 text-blue-800',
      'purchase': 'bg-orange-100 text-orange-800',
      'sale': 'bg-purple-100 text-purple-800',
      'loan': 'bg-yellow-100 text-yellow-800',
      'other_expense': 'bg-red-100 text-red-800',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Manage and track all financial transactions
          </p>
        </div>
        {/* <Button onClick={handleCreateTransaction} data-testid="button-create-transaction" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Transaction
        </Button> */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">{stats?.totalTransactions || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats?.totalAmount || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats?.averageAmount || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Amount</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats?.maxAmount || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Types Overview */}
      {stats?.typeStats && stats.typeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Types Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.typeStats.map((typeStat) => (
                <div key={typeStat.type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getTransactionTypeColor(typeStat.type)}>
                      {typeStat.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{typeStat.count} transactions</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(typeStat.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <TransactionsTable
        transactions={transactions}
        isLoading={transactionsLoading}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        onView={handleViewTransaction}
      />

      {/* Modals */}
      <TransactionFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
        transaction={null}
      />

      <TransactionFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="edit"
        transaction={selectedTransaction as Transaction}
      />

      <TransactionDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        transaction={selectedTransaction as Transaction}
      />

      <TransactionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        transactionId={selectedTransactionId}
      />
    </div>
  );
}
