import { useState } from "react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Trash2, AlertTriangle, Eye, ExternalLink, Calendar } from "lucide-react";
import { CopyableId } from "@/components/ui/copyable-id";
import type { TransactionWithRelations } from "@/types/transactions";

interface SalesTableProps {
  sales: TransactionWithRelations[];
  isLoading: boolean;
  onEdit: (sale: TransactionWithRelations) => void;
  onDelete: (sale: TransactionWithRelations) => void;
  onView: (sale: TransactionWithRelations) => void;
}

export function SalesTable({ sales, isLoading, onEdit, onDelete, onView }: SalesTableProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [paidStatusFilter, setPaidStatusFilter] = useState<string>("");
  const [accountReceivableFilter, setAccountReceivableFilter] = useState<string>("");

  // Helper function to check if date matches filter
  const isDateMatch = (transactionDate: string | Date | null, filterDate: string): boolean => {
    if (!filterDate || !transactionDate) return true;
    const transactionDateStr = new Date(transactionDate).toISOString().split('T')[0];
    return transactionDateStr === filterDate;
  };

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Helper function to check if sale is paid or unpaid
  const isPaid = (remainingPayment: string | number | null): boolean => {
    if (!remainingPayment) return true; // If no remaining payment, consider it paid
    const remaining = typeof remainingPayment === 'string' ? parseFloat(remainingPayment) : remainingPayment;
    return remaining <= 0;
  };

  // Get unique account receivables for dropdown
  const uniqueAccountReceivables = Array.from(
    new Map(
      sales
        .filter(s => s.account_receivable_id && s.account_receivable_name)
        .map(s => [s.account_receivable_id, { id: s.account_receivable_id, name: s.account_receivable_name }])
    ).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = 
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.destination_account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.account_receivable_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMode = !modeFilter || modeFilter === 'all_modes' || sale.mode_of_payment === modeFilter;
    
    const matchesDate = isDateMatch(sale.date, dateFilter);

    // Paid/Unpaid filter
    const matchesPaidStatus = !paidStatusFilter || paidStatusFilter === 'all_statuses' || 
      (paidStatusFilter === 'paid' && isPaid(sale.remaining_payment)) ||
      (paidStatusFilter === 'unpaid' && !isPaid(sale.remaining_payment));

    // Account Receivable filter
    const matchesAccountReceivable = !accountReceivableFilter || accountReceivableFilter === 'all_receivables' || 
      sale.account_receivable_id === accountReceivableFilter;

    return matchesSearch && matchesMode && matchesDate && matchesPaidStatus && matchesAccountReceivable;
  });

  const handleTodayClick = () => {
    setDateFilter(getTodayDate());
  };

  const handleAccountReceivableClick = (accountReceivableId: string) => {
    setLocation(`/account-receivables/${accountReceivableId}`);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getModeOfPaymentLabel = (mode: string | null) => {
    if (!mode) return '-';
    const modeMap: Record<string, string> = {
      'check': 'Check',
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'pay_order': 'Pay Order',
    };
    return modeMap[mode] || mode;
  };

  const handleAccountClick = (accountId: string) => {
    setLocation(`/accounts/${accountId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card data-testid="filters-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* First Row: Search and Payment Mode */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by ID, description, account names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="mode-filter">Payment Mode</Label>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger id="mode-filter" data-testid="select-mode-filter" className="w-full">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_modes">All Modes</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="pay_order">Pay Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Second Row: Paid/Unpaid and Account Receivable Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="paid-status-filter">Payment Status</Label>
                <Select value={paidStatusFilter} onValueChange={setPaidStatusFilter}>
                  <SelectTrigger id="paid-status-filter" data-testid="select-paid-status-filter" className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="account-receivable-filter">Account Receivable</Label>
                <Select value={accountReceivableFilter} onValueChange={setAccountReceivableFilter}>
                  <SelectTrigger id="account-receivable-filter" data-testid="select-account-receivable-filter" className="w-full">
                    <SelectValue placeholder="All Account Receivables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_receivables">All Account Receivables</SelectItem>
                    {uniqueAccountReceivables.map((receivable) => (
                      <SelectItem key={receivable.id} value={receivable.id}>
                        {receivable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Third Row: Date Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="date-filter">Filter by Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  data-testid="input-date-filter"
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleTodayClick}
                  className="w-full sm:w-auto flex items-center space-x-2"
                  data-testid="button-today"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Today</span>
                </Button>
              </div>
              <div className="w-full sm:w-auto">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setSearchTerm("");
                    setModeFilter("all_modes");
                    setDateFilter("");
                    setPaidStatusFilter("all_statuses");
                    setAccountReceivableFilter("all_receivables");
                  }}
                  className="w-full sm:w-auto"
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card data-testid="sales-table-card">
        <CardContent className="p-0">
          {filteredSales.length === 0 && !isLoading ? (
            <div className="text-center py-12" data-testid="empty-state">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No sales found</h3>
              <p className="text-muted-foreground">
                {sales.length === 0 
                  ? "Create your first sale to get started." 
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        ID
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                        Description
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Total Payment
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Remaining Payment
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Opening Balance
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Closing Balance
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        To Account
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]">
                        Account Receivable
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
                        Payment Mode
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow 
                        key={sale.id}
                        className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100 transition-colors"
                        data-testid={`row-sale-${sale.id}`}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          <CopyableId id={sale.id} />
                        </TableCell>
                        <TableCell className="text-sm text-foreground max-w-xs truncate">
                          {sale.description || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(sale.total_amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(sale.paid_amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-orange-600">
                          {formatCurrency(sale.remaining_payment)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatCurrency(sale.opening_balance)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatCurrency(sale.closing_balance)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {sale.destination_account_name && sale.destination_account_id ? (
                            <button
                              onClick={() => handleAccountClick(sale.destination_account_id!)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${sale.destination_account_name} details`}
                            >
                              <span>{sale.destination_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {sale.account_receivable_name && sale.account_receivable_id ? (
                            <button
                              onClick={() => handleAccountReceivableClick(sale.account_receivable_id!)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${sale.account_receivable_name} details`}
                            >
                              <span>{sale.account_receivable_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {getModeOfPaymentLabel(sale.mode_of_payment)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(sale.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(sale)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid={`button-view-${sale.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(sale)}
                            className="h-8 w-8 text-secondary hover:text-secondary/80 hover:bg-secondary/10"
                            data-testid={`button-edit-${sale.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(sale)}
                            className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            data-testid={`button-delete-${sale.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {filteredSales.map((sale) => (
                  <Card key={sale.id} className="p-4 border-l-4 border-green-500">
                    <div className="space-y-3">
                      {/* Header with Amount */}
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-600 text-white border-green-600">
                          Sale
                        </Badge>
                        <span className="font-medium text-lg">
                          {formatCurrency(sale.total_amount)}
                        </span>
                      </div>

                      {/* Transaction ID */}
                      <div className="flex items-center justify-between">
                        <CopyableId id={sale.id} />
                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          {sale.description || 'No description'}
                        </p>
                      </div>

                      {/* Payment Information */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Payment</p>
                          <p className="text-sm font-medium">{formatCurrency(sale.paid_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining Payment</p>
                          <p className="text-sm font-medium text-orange-600">{formatCurrency(sale.remaining_payment)}</p>
                        </div>
                      </div>

                      {/* Account Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sale.destination_account_name && sale.destination_account_id && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">To Account</p>
                            <button
                              onClick={() => handleAccountClick(sale.destination_account_id!)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${sale.destination_account_name} details`}
                            >
                              <span>{sale.destination_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {sale.account_receivable_name && sale.account_receivable_id && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Receivable</p>
                            <button
                              onClick={() => handleAccountReceivableClick(sale.account_receivable_id!)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${sale.account_receivable_name} details`}
                            >
                              <span>{sale.account_receivable_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Balance Information */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Opening Balance</p>
                          <p className="text-sm font-medium">{formatCurrency(sale.opening_balance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Closing Balance</p>
                          <p className="text-sm font-medium">{formatCurrency(sale.closing_balance)}</p>
                        </div>
                      </div>

                      {/* Payment Mode and Date */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Payment Mode</p>
                          <p className="text-sm font-medium">{getModeOfPaymentLabel(sale.mode_of_payment)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
                          <p className="text-sm font-medium">{formatDate(sale.date)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(sale)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`button-view-${sale.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(sale)}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          data-testid={`button-edit-${sale.id}`}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(sale)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          data-testid={`button-delete-${sale.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="px-6 py-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredSales.length} of {sales.length} sales
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

