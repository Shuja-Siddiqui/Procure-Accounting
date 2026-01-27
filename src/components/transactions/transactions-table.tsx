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
import { Edit2, Trash2, AlertTriangle, Eye, ExternalLink, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyableId } from "@/components/ui/copyable-id";
import type { TransactionWithRelations } from "@/types/transactions";

interface TransactionsTableProps {
  transactions: TransactionWithRelations[];
  isLoading: boolean;
  onEdit: (transaction: TransactionWithRelations) => void;
  onDelete: (transaction: TransactionWithRelations) => void;
  onView: (transaction: TransactionWithRelations) => void;
}

export function TransactionsTable({ transactions, isLoading, onEdit, onDelete, onView }: TransactionsTableProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = 
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.source_account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.destination_account_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || typeFilter === 'all_types' || transaction.type === typeFilter;
    const matchesMode = !modeFilter || modeFilter === 'all_modes' || transaction.mode_of_payment === modeFilter;

    return matchesSearch && matchesType && matchesMode;
  });

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

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'deposit': 'Deposit',
      'transfer': 'Transfer',
      'purchase': 'Purchase',
      'purchase_return': 'Purchase Return',
      'sale': 'Sale',
      'sale_return': 'Sale Return',
      'advance_purchase_inventory': 'Advance Purchase Inventory',
      'advance_sale_payment': 'Advance Sale Payment',
      'advance_purchase_payment': 'Advance Purchase Payment',
      'advance_sale_inventory': 'Advance Sale Inventory',
      'asset_purchase': 'Asset Purchase',
      'loan': 'Loan',
      'loan_return': 'Loan Return',
      'other_expense': 'Other Expense',
      'lost_and_damage': 'Lost and Damage',
      'pay_able': 'Payable',
      'receive_able': 'Receivable',
    };
    return typeMap[type] || type;
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

  const getTransactionTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'deposit': 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
      'transfer': 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
      'transfer_in': 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
      'transfer_out': 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100',
      'purchase': 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
      'purchase_return': 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
      'sale': 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100',
      'sale_return': 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100',
      'advance_purchase_inventory': 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',
      'advance_sale_payment': 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100',
      'advance_purchase_payment': 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100',
      'advance_sale_inventory': 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100',
      'asset_purchase': 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
      'loan': 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100',
      'loan_return': 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100',
      'other_expense': 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100',
      'lost_and_damage': 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100',
      'pay_able': 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',
      'receive_able': 'bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100',
    };
    return colorMap[type] || 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100';
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
      'advance_purchase_inventory': 'bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700',
      'advance_sale_payment': 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700',
      'advance_purchase_payment': 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700',
      'advance_sale_inventory': 'bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700',
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
      'advance_purchase_inventory': '📦',
      'advance_sale_payment': '💳',
      'advance_purchase_payment': '💳',
      'advance_sale_inventory': '📦',
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

  const handleAccountClick = (accountId: string) => {
    setLocation(`/accounts/${accountId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by ID, description, or account names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="type-filter">Transaction Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter" data-testid="select-type-filter" className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_types">All Types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="other_expense">Other Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
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
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all_types");
                  setModeFilter("all_modes");
                }}
                className="w-full"
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card data-testid="transactions-table-card">
        <CardContent className="p-0">
          {filteredTransactions.length === 0 && !isLoading ? (
            <div className="text-center py-12" data-testid="empty-state">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {transactions.length === 0 
                  ? "Create your first transaction to get started." 
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto max-w-6xl mx-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        ID
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Invoice Number
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
                        Type
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                        Description
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Opening Balance
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Closing Balance
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        From Account
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        To Account
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
                    {filteredTransactions.map((transaction) => (
                      <TableRow 
                        key={transaction.id}
                        className={`${getTransactionTypeColor(transaction.type)} transition-colors`}
                        data-testid={`row-transaction-${transaction.id}`}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          <CopyableId id={transaction.id} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {(transaction.type === 'sale' || transaction.type === 'advance_sale_inventory' || transaction.type === 'advance_sale_payment') && (
                            transaction.sale_invoice_number || transaction.receipt_invoice_number || '-'
                          )}
                          {!(transaction.type === 'sale' || transaction.type === 'advance_sale_inventory' || transaction.type === 'advance_sale_payment') && '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getTransactionTypeIcon(transaction.type)}</span>
                            <Badge 
                              variant="outline" 
                              className={`capitalize font-medium px-3 py-1 ${getTransactionTypeBadgeColor(transaction.type)}`}
                            >
                              {getTransactionTypeLabel(transaction.type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground max-w-xs truncate">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(transaction.total_amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatCurrency(transaction.opening_balance)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatCurrency(transaction.closing_balance)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {transaction.source_account_name && transaction.source_account_id ? (
                            <button
                              onClick={() => handleAccountClick(transaction.source_account_id!)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.source_account_name} details`}
                            >
                              <span>{transaction.source_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {transaction.destination_account_name && transaction.destination_account_id ? (
                            <button
                              onClick={() => handleAccountClick(transaction.destination_account_id!)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              title={`View ${transaction.destination_account_name} details`}
                            >
                              <span>{transaction.destination_account_name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {getModeOfPaymentLabel(transaction.mode_of_payment)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onView(transaction)} data-testid={`button-view-${transaction.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit(transaction)} data-testid={`button-edit-${transaction.id}`}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDelete(transaction)}
                                className="text-destructive"
                                data-testid={`button-delete-${transaction.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3 p-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4 space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Badge 
                          variant="outline" 
                          className={`capitalize font-medium text-xs ${getTransactionTypeBadgeColor(transaction.type)}`}
                        >
                          {getTransactionTypeLabel(transaction.type)}
                        </Badge>
                      </div>
                      <span className="font-semibold text-base flex-shrink-0 ml-2">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Transaction ID</span>
                      <CopyableId id={transaction.id} />
                    </div>

                    {transaction.description && (
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground mb-1 block">Description</span>
                        <p className="text-sm text-foreground">{transaction.description}</p>
                      </div>
                    )}

                    {(transaction.source_account_name || transaction.destination_account_name) && (
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t">
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

                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Payment Mode</span>
                        <p className="text-sm font-medium">{getModeOfPaymentLabel(transaction.mode_of_payment)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Date</span>
                        <p className="text-sm font-medium">{formatDate(transaction.date)}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(transaction)} data-testid={`button-view-${transaction.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(transaction)} data-testid={`button-edit-${transaction.id}`}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(transaction)}
                            className="text-destructive"
                            data-testid={`button-delete-${transaction.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
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
