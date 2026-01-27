import { useState, useMemo, useEffect } from "react";
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
import { AlertTriangle, DollarSign, Printer, Trash2, Calendar, ExternalLink } from "lucide-react";
import { CopyableId } from "@/components/ui/copyable-id";
import type { TransactionWithRelations } from "@/types/transactions";

interface ReceiptsTableProps {
  sales: TransactionWithRelations[];
  isLoading: boolean;
  onReceive: (sale: TransactionWithRelations) => void;
  onPrint: (sale: TransactionWithRelations) => void;
  onDelete: (sale: TransactionWithRelations) => void;
  onFilteredDataChange?: (filteredSales: TransactionWithRelations[], hasFilters: boolean) => void;
}

export function ReceiptsTable({ sales, isLoading, onReceive, onPrint, onDelete, onFilteredDataChange }: ReceiptsTableProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [receivableFilter, setReceivableFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");

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
    if (!remainingPayment) return true;
    const remaining = typeof remainingPayment === 'string' ? parseFloat(remainingPayment) : remainingPayment;
    return remaining <= 0;
  };

  // Get unique products from all sales
  const uniqueProducts = useMemo(() => {
    const productMap = new Map<string, { id: string; name: string }>();
    sales.forEach(sale => {
      if (sale.productJunctions && sale.productJunctions.length > 0) {
        sale.productJunctions.forEach(junction => {
          if (junction.product_id && junction.product_name) {
            productMap.set(junction.product_id, {
              id: junction.product_id,
              name: junction.product_name
            });
          }
        });
      }
    });
    return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sales]);

  // Get unique account receivables for dropdown
  const uniqueAccountReceivables = Array.from(
    new Map(
      sales
        .filter(p => p.account_receivable_id && p.account_receivable_name)
        .map(p => [p.account_receivable_id, { id: p.account_receivable_id, name: p.account_receivable_name }])
    ).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Get product names for a sale (comma-separated)
  const getProductNames = (sale: TransactionWithRelations): string => {
    if (!sale.productJunctions || sale.productJunctions.length === 0) {
      return '-';
    }
    const names = sale.productJunctions
      .map(j => j.product_name)
      .filter(Boolean) as string[];
    if (names.length === 0) return '-';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = 
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.account_receivable_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProductNames(sale).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMode = !modeFilter || modeFilter === 'all_modes' || sale.mode_of_payment === modeFilter;
    
    const matchesDate = isDateMatch(sale.date, dateFilter);

    // Paid/Unpaid filter
    const matchesPaymentStatus = !paymentStatusFilter || paymentStatusFilter === 'all_statuses' || 
      (paymentStatusFilter === 'paid' && isPaid(sale.remaining_payment)) ||
      (paymentStatusFilter === 'unpaid' && !isPaid(sale.remaining_payment));

    // Account Receivable filter
    const matchesReceivable = !receivableFilter || receivableFilter === 'all_receivables' || 
      sale.account_receivable_id === receivableFilter;

    // Product filter
    const matchesProduct = !productFilter || productFilter === 'all_products' ||
      (sale.productJunctions && sale.productJunctions.some(j => j.product_id === productFilter));

    return matchesSearch && matchesMode && matchesDate && matchesPaymentStatus && matchesReceivable && matchesProduct;
  });

  // Check if any filters are applied
  const hasFilters = useMemo(() => {
    return !!(
      searchTerm ||
      (modeFilter && modeFilter !== 'all_modes') ||
      (productFilter && productFilter !== 'all_products') ||
      (paymentStatusFilter && paymentStatusFilter !== 'all_statuses') ||
      (receivableFilter && receivableFilter !== 'all_receivables') ||
      dateFilter
    );
  }, [searchTerm, modeFilter, productFilter, paymentStatusFilter, receivableFilter, dateFilter]);

  // Calculate filtered metrics
  const filteredMetrics = useMemo(() => {
    if (!hasFilters) return null;

    const totalSales = filteredSales.length;
    
    const totalAmount = filteredSales.reduce((sum, sale) => {
      const amount = parseFloat(sale.total_amount?.toString() || '0');
      return sum + amount;
    }, 0);

    // Get unique customers
    const uniqueCustomers = Array.from(
      new Set(
        filteredSales
          .filter(p => p.account_receivable_name)
          .map(p => p.account_receivable_name)
      )
    ).filter(Boolean) as string[];

    // Get unique products
    const uniqueProductsInFiltered = new Set<string>();
    filteredSales.forEach(sale => {
      if (sale.productJunctions && sale.productJunctions.length > 0) {
        sale.productJunctions.forEach(junction => {
          if (junction.product_name) {
            uniqueProductsInFiltered.add(junction.product_name);
          }
        });
      }
    });

    // Get unique sale descriptions/names
    const uniqueSaleNames = Array.from(
      new Set(
        filteredSales
          .filter(p => p.description)
          .map(p => p.description)
      )
    ).filter(Boolean) as string[];

    // Count paid/unpaid
    const paidCount = filteredSales.filter(p => isPaid(p.remaining_payment)).length;
    const unpaidCount = filteredSales.filter(p => !isPaid(p.remaining_payment)).length;

    // Calculate paid and unpaid amounts
    // Paid Amount = Sum of (total_payment - remaining_payment) = amount already received
    // Unpaid Amount = Sum of remaining_payment = amount still to be received
    const paidAmount = filteredSales.reduce((sum, sale) => {
      const totalPayment = parseFloat(sale.paid_amount?.toString() || '0');
      const remainingPayment = parseFloat(sale.remaining_payment?.toString() || '0');
      const amountPaid = totalPayment - remainingPayment;
      return sum + Math.max(0, amountPaid); // Ensure non-negative
    }, 0);

    const unpaidAmount = filteredSales.reduce((sum, sale) => {
      const remainingPayment = parseFloat(sale.remaining_payment?.toString() || '0');
      return sum + Math.max(0, remainingPayment); // Ensure non-negative
    }, 0);

    return {
      totalSales,
      totalAmount,
      uniqueCustomers,
      uniqueProducts: Array.from(uniqueProductsInFiltered),
      uniqueSaleNames,
      paidCount,
      unpaidCount,
      paidAmount,
      unpaidAmount,
    };
  }, [filteredSales, hasFilters]);

  // Notify parent of filtered data changes
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredSales, hasFilters);
    }
  }, [filteredSales, hasFilters, onFilteredDataChange]);

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
      'pay_order': 'Receive Order',
    };
    return modeMap[mode] || mode;
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
            {/* First Row: Search and Receipt Mode */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by ID, description, product, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="mode-filter">Receipt Mode</Label>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger id="mode-filter" data-testid="select-mode-filter" className="w-full">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_modes">All Modes</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="pay_order">Receive Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Second Row: Product, Receipt Status, and Receivable Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="product-filter">Product</Label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger id="product-filter" data-testid="select-product-filter" className="w-full">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_products">All Products</SelectItem>
                    {uniqueProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="receipt-status-filter">Receipt Status</Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger id="receipt-status-filter" data-testid="select-receipt-status-filter" className="w-full">
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
                <Label htmlFor="receivable-filter">Receivable (Customer)</Label>
                <Select value={receivableFilter} onValueChange={setReceivableFilter}>
                  <SelectTrigger id="receivable-filter" data-testid="select-receivable-filter" className="w-full">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_receivables">All Customers</SelectItem>
                    {uniqueAccountReceivables.map((receivable) => (
                      <SelectItem key={receivable.id} value={receivable.id || ''}>
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
                    setModeFilter("");
                    setProductFilter("");
                    setPaymentStatusFilter("");
                    setReceivableFilter("");
                    setDateFilter("");
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

      {/* Filtered Metrics - Only show when filters are applied */}
      {hasFilters && filteredMetrics && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-900">Filtered Results Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Total Sales */}
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                  <p className="text-2xl font-bold">{filteredMetrics.totalSales}</p>
                </div>

                {/* Total Amount */}
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(filteredMetrics.totalAmount)}</p>
                </div>

                {/* Paid/Unpaid Count */}
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Receipt Status</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="text-lg font-bold text-green-600">{filteredMetrics.paidCount}</p>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unpaid</p>
                      <p className="text-lg font-bold text-orange-600">{filteredMetrics.unpaidCount}</p>
                    </div>
                  </div>
                </div>

                {/* Customers */}
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Customers ({filteredMetrics.uniqueCustomers.length})</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {filteredMetrics.uniqueCustomers.slice(0, 3).map((customer, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {customer}
                      </Badge>
                    ))}
                    {filteredMetrics.uniqueCustomers.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{filteredMetrics.uniqueCustomers.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Products */}
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Products ({filteredMetrics.uniqueProducts.length})</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {filteredMetrics.uniqueProducts.slice(0, 3).map((product, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {product}
                      </Badge>
                    ))}
                    {filteredMetrics.uniqueProducts.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{filteredMetrics.uniqueProducts.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Paid/Unpaid Amounts */}
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Receipt Amounts</p>
                  <div className="space-y-2 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Paid Amount</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(filteredMetrics.paidAmount)}</p>
                    </div>
                    <div className="h-px bg-border"></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unpaid Amount</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(filteredMetrics.unpaidAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipts Table */}
      <Card data-testid="payments-table-card">
        <CardContent className="p-0">
          {filteredSales.length === 0 && !isLoading ? (
            <div className="text-center py-12" data-testid="empty-state">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No sales found</h3>
              <p className="text-muted-foreground">
                {sales.length === 0 
                  ? "No sales available." 
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
                        Product
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                        Description
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Total Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Paid Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Remaining Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]">
                        Receivable (Customer)
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const isUnpaid = !isPaid(sale.remaining_payment);
                      return (
                        <TableRow 
                          key={sale.id}
                          className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100 transition-colors"
                          data-testid={`row-sale-${sale.id}`}
                        >
                          <TableCell className="whitespace-nowrap text-sm">
                            <CopyableId id={sale.id} />
                          </TableCell>
                          <TableCell className="text-sm text-foreground max-w-xs">
                            <div className="truncate" title={getProductNames(sale)}>
                              {getProductNames(sale)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground max-w-xs truncate">
                            {sale.description || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                            {formatCurrency(sale.total_amount)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium text-green-600">
                            {(() => {
                              const totalPayment = parseFloat(sale.paid_amount?.toString() || '0');
                              const remainingPayment = parseFloat(sale.remaining_payment?.toString() || '0');
                              const paidAmount = totalPayment - remainingPayment;
                              return formatCurrency(Math.max(0, paidAmount));
                            })()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium text-orange-600">
                            {formatCurrency(sale.remaining_payment)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {isUnpaid ? (
                              <Badge variant="destructive">Unpaid</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600">Paid</Badge>
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
                          <TableCell className="whitespace-nowrap text-sm space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onReceive(sale)}
                              disabled={!isUnpaid}
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              data-testid={`button-receive-${sale.id}`}
                              title={isUnpaid ? "Receive" : "Already paid"}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onPrint(sale)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              data-testid={`button-print-${sale.id}`}
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(sale)}
                              className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                              data-testid={`button-delete-${sale.id}`}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {filteredSales.map((sale) => {
                  const isUnpaid = !isPaid(sale.remaining_payment);
                  return (
                    <Card key={sale.id} className="p-4 border-l-4 border-green-500">
                      <div className="space-y-3">
                        {/* Header with Status */}
                        <div className="flex items-center justify-between">
                          <CopyableId id={sale.id} />
                          {isUnpaid ? (
                            <Badge variant="destructive">Unpaid</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-600">Paid</Badge>
                          )}
                        </div>

                        {/* Product */}
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Product</p>
                          <p className="text-sm font-medium">{getProductNames(sale)}</p>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                          <p className="text-sm text-foreground">
                            {sale.description || 'No description'}
                          </p>
                        </div>

                        {/* Receipt Information */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Amount</p>
                            <p className="text-sm font-medium">{formatCurrency(sale.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid Amount</p>
                            <p className="text-sm font-medium text-green-600">
                              {(() => {
                                const totalPayment = parseFloat(sale.paid_amount?.toString() || '0');
                                const remainingPayment = parseFloat(sale.remaining_payment?.toString() || '0');
                                const paidAmount = totalPayment - remainingPayment;
                                return formatCurrency(Math.max(0, paidAmount));
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining Amount</p>
                            <p className="text-sm font-medium text-orange-600">{formatCurrency(sale.remaining_payment)}</p>
                          </div>
                        </div>

                        {/* Account Receivable */}
                        {sale.account_receivable_name && sale.account_receivable_id && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Receivable (Customer)</p>
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

                        {/* Actions */}
                        <div className="flex justify-end space-x-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReceive(sale)}
                            disabled={!isUnpaid}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            data-testid={`button-receive-${sale.id}`}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Receive
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPrint(sale)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid={`button-print-${sale.id}`}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
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
                  );
                })}
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

