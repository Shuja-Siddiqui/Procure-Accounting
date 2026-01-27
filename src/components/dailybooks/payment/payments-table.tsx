import { useState, useEffect } from "react";
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
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Filter, Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PaymentTransaction {
  id: string;
  type: string;
  account_payable_id: string;
  source_account_id?: string | null;
  total_amount: string | number;
  paid_amount: string | number;
  remaining_payment: string | number;
  description?: string | null;
  mode_of_payment?: string | null;
  date: string;
  payment_invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  accountPayable?: {
    id: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  } | null;
}

interface PaymentFilters {
  search?: string;
  account_payable_id?: string;
  date_from?: string;
  date_to?: string;
}

interface PaymentsTableProps {
  payments: PaymentTransaction[];
  isLoading: boolean;
  onView: (payment: PaymentTransaction) => void;
  onFiltersChange?: (filters: PaymentFilters) => void;
}

export function PaymentsTable({ payments, isLoading, onView, onFiltersChange }: PaymentsTableProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [accountPayableFilter, setAccountPayableFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "today" | "week">("all");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  const handleCopyInvoiceNumber = async (invoiceNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(invoiceNumber);
      setCopiedInvoiceId(invoiceNumber);
      toast({
        title: "Copied!",
        description: "Invoice number copied to clipboard",
      });
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy invoice number",
        variant: "destructive",
      });
    }
  };

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all account payables for dropdown (not just from filtered payments)
  const { data: accountPayablesResponse } = useQuery({
    queryKey: ['/api/account-payables'],
    queryFn: async () => {
      const res = await fetch('/api/account-payables', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch account payables');
      return await res.json();
    },
  });
  
  const uniqueAccountPayables = (accountPayablesResponse?.data || [])
    .map((ap: any) => ({ id: ap.id, name: ap.name }))
    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  // No client-side filtering - data comes pre-filtered from API
  // Just use payments directly as they're already filtered by the backend
  const filteredPayments = payments;

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
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAccountPayableClick = (accountPayableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/account-payables/${accountPayableId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setAccountPayableFilter("all_payables");
    setDateFromFilter("");
    setDateToFilter("");
    setDateFilterMode("all");
  };

  // Update parent filters when local filters change
  // Send all filters including search to API for server-side filtering
  useEffect(() => {
    if (onFiltersChange) {
      const filters: PaymentFilters = {};
      // Send search to API for server-side search (trim whitespace)
      const trimmedSearch = debouncedSearchTerm.trim();
      if (trimmedSearch) {
        filters.search = trimmedSearch;
      }
      // Apply date filters
      if (dateFromFilter) filters.date_from = dateFromFilter;
      if (dateToFilter) filters.date_to = dateToFilter;
      // Vendor filter
      if (accountPayableFilter && accountPayableFilter !== 'all_payables') filters.account_payable_id = accountPayableFilter;
      onFiltersChange(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, accountPayableFilter, dateFromFilter, dateToFilter]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Advanced Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Mobile: Search + Toggle Button */}
          <div className="flex flex-col sm:hidden gap-3">
            <div className="w-full">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by any field: ID, invoice number, vendor, amount, date, type, mode of payment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="w-full flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {isMobileFiltersOpen ? "Hide Filters" : "Show Filters"}
              </span>
              {isMobileFiltersOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

              {/* Desktop: Search Only */}
          <div className="hidden sm:block w-full">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              type="text"
              placeholder="Search by any field: invoice number, vendor, amount, date, type, mode of payment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Advanced Filters - Hidden on mobile unless expanded */}
          <div className={`${isMobileFiltersOpen ? 'block' : 'hidden'} sm:block space-y-4`}>
            {/* Second Row: Account Payable (Vendor) only */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="account-payable-filter">Vendor</Label>
                <Select 
                  value={accountPayableFilter || "all_payables"} 
                  onValueChange={(value) => setAccountPayableFilter(value === "all_payables" ? "" : value)}
                >
                  <SelectTrigger id="account-payable-filter" className="w-full">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_payables">All Vendors</SelectItem>
                    {uniqueAccountPayables.map((ap: any) => (
                      <SelectItem key={ap.id} value={ap.id}>
                        {ap.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filters */}
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="date-from-filter">Date From</Label>
                <Input
                  id="date-from-filter"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => {
                    setDateFromFilter(e.target.value);
                    setDateFilterMode("all");
                  }}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="date-to-filter">Date To</Label>
                <Input
                  id="date-to-filter"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => {
                    setDateToFilter(e.target.value);
                    setDateFilterMode("all");
                  }}
                  className="w-full"
                />
              </div>

              {/* Desktop: Quick Date Filter Buttons */}
              <div className="hidden sm:flex border rounded-md overflow-hidden">
                <Button
                  type="button"
                  variant={dateFilterMode === "all" ? "default" : "ghost"}
                  className="rounded-none border-0 border-r"
                  onClick={() => {
                    setDateFromFilter("");
                    setDateToFilter("");
                    setDateFilterMode("all");
                  }}
                >
                  all
                </Button>
                <Button
                  type="button"
                  variant={dateFilterMode === "week" ? "default" : "ghost"}
                  className="rounded-none border-0 border-r"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date();
                    weekAgo.setDate(today.getDate() - 6);
                    const fromIso = weekAgo.toISOString().split("T")[0];
                    const toIso = today.toISOString().split("T")[0];
                    setDateFromFilter(fromIso);
                    setDateToFilter(toIso);
                    setDateFilterMode("week");
                  }}
                >
                  this week
                </Button>
                <Button
                  type="button"
                  variant={dateFilterMode === "today" ? "default" : "ghost"}
                  className="rounded-none"
                  onClick={() => {
                    const today = new Date();
                    const iso = today.toISOString().split("T")[0];
                    setDateFromFilter(iso);
                    setDateToFilter(iso);
                    setDateFilterMode("today");
                  }}
                >
                  today
                </Button>
              </div>
              {/* Mobile: Filter buttons (keep existing mobile UI) */}
              <div className="w-full sm:hidden flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={dateFilterMode === "today" ? "default" : "outline"}
                  onClick={() => {
                    const today = new Date();
                    const iso = today.toISOString().split("T")[0];
                    setDateFromFilter(iso);
                    setDateToFilter(iso);
                    setDateFilterMode("today");
                  }}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant={dateFilterMode === "week" ? "default" : "outline"}
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date();
                    weekAgo.setDate(today.getDate() - 6);
                    const fromIso = weekAgo.toISOString().split("T")[0];
                    const toIso = today.toISOString().split("T")[0];
                    setDateFromFilter(fromIso);
                    setDateToFilter(toIso);
                    setDateFilterMode("week");
                  }}
                >
                  This Week
                </Button>
                <Button
                  type="button"
                  variant={dateFilterMode === "all" ? "default" : "outline"}
                  onClick={() => {
                    setDateFromFilter("");
                    setDateToFilter("");
                    setDateFilterMode("all");
                  }}
                >
                  All Time
                </Button>
              </div>

              <div className="w-full sm:w-auto">
                <Button 
                  variant="secondary" 
                  onClick={clearFilters}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {filteredPayments.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                {payments.length === 0 
                  ? "No payments available." 
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block w-full">
                <div className="w-full overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px] min-w-[100px]">
                          Type
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px] min-w-[150px]">
                          Invoice Number
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[200px] min-w-[200px]">
                          Vendor
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px] min-w-[120px]">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px] min-w-[120px]">
                          Paid
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px] min-w-[120px]">
                          Remaining
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] min-w-[130px]">
                          Transaction Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}>
                              <Skeleton className="h-10 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        filteredPayments.map((payment) => {
                          const invoiceNumber = payment.payment_invoice_number || '-';
                          const isCopied = copiedInvoiceId === invoiceNumber;
                          
                          const amount = typeof payment.total_amount === 'string' 
                            ? parseFloat(payment.total_amount) 
                            : payment.total_amount || 0;
                          const paid = typeof payment.paid_amount === 'string'
                            ? parseFloat(payment.paid_amount) 
                            : payment.paid_amount || 0;
                          const remaining = typeof payment.remaining_payment === 'string'
                            ? parseFloat(payment.remaining_payment) 
                            : payment.remaining_payment || 0;
                          
                          return (
                            <TableRow 
                              key={payment.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => onView(payment)}
                            >
                              <TableCell className="whitespace-nowrap">
                                <Badge 
                                  variant={
                                    payment.type === 'pay_able' ? 'default' :
                                    payment.type === 'advance_purchase_payment' ? 'secondary' :
                                    'default'
                                  }
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  {payment.type === 'pay_able' ? 'AP Payment' :
                                   payment.type === 'pay_able_client' ? 'Client Payment' :
                                   payment.type === 'advance_purchase_payment' ? 'Advance Payment' :
                                   payment.type || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis">
                                {invoiceNumber !== '-' ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => handleCopyInvoiceNumber(invoiceNumber, e)}
                                        className="flex items-center gap-2 text-sm font-mono hover:text-primary transition-colors group"
                                      >
                                        <span className="truncate max-w-[120px]">{invoiceNumber}</span>
                                        {isCopied ? (
                                          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Click to copy invoice number</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-sm font-mono text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm overflow-hidden text-ellipsis">
                                {payment.type === 'pay_able_client' && payment.accountReceivable?.name ? (
                                  <button
                                    onClick={(e) => handleAccountReceivableClick(payment.account_receivable_id!, e)}
                                    className="text-red-600 hover:text-red-800 hover:underline flex items-center space-x-1 transition-colors text-left"
                                    title={`View ${payment.accountReceivable.name} details`}
                                  >
                                    <span className="truncate">{payment.accountReceivable.name}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </button>
                                ) : payment.accountPayable?.name ? (
                                  <button
                                    onClick={(e) => handleAccountPayableClick(payment.account_payable_id!, e)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors text-left"
                                    title={`View ${payment.accountPayable.name} details`}
                                  >
                                    <span className="truncate">{payment.accountPayable.name}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm font-medium">
                                {formatCurrency(amount)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm font-medium text-green-600">
                                {formatCurrency(paid)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm font-medium text-orange-600">
                                {formatCurrency(remaining)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDate(payment.date)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </Card>
                  ))
                ) : (
                  filteredPayments.map((payment) => {
                    const amount = typeof payment.total_amount === 'string' 
                      ? parseFloat(payment.total_amount) 
                      : payment.total_amount || 0;
                    const paid = typeof payment.paid_amount === 'string'
                      ? parseFloat(payment.paid_amount) 
                      : payment.paid_amount || 0;
                    const remaining = typeof payment.remaining_payment === 'string'
                      ? parseFloat(payment.remaining_payment) 
                      : payment.remaining_payment || 0;

                    return (
                      <Card 
                        key={payment.id} 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onView(payment)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant={
                                payment.type === 'pay_able' ? 'default' :
                                payment.type === 'pay_able_client' ? 'destructive' :
                                payment.type === 'advance_purchase_payment' ? 'secondary' :
                                'default'
                              }
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {payment.type === 'pay_able' ? 'AP Payment' :
                               payment.type === 'pay_able_client' ? 'Client Payment' :
                               payment.type === 'advance_purchase_payment' ? 'Advance Payment' :
                               payment.type || 'N/A'}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Invoice Number</p>
                            <p className="text-sm font-medium">{payment.payment_invoice_number || '-'}</p>
                          </div>

                          {payment.type === 'pay_able_client' && payment.accountReceivable?.name ? (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Client</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccountReceivableClick(payment.account_receivable_id!, e);
                                }}
                                className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline flex items-center space-x-1 transition-colors"
                              >
                                <span>{payment.accountReceivable.name}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          ) : payment.accountPayable?.name ? (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Vendor</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccountPayableClick(payment.account_payable_id!, e);
                                }}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                              >
                                <span>{payment.accountPayable.name}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount</p>
                              <p className="text-sm font-medium">{formatCurrency(amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid</p>
                              <p className="text-sm font-medium text-green-600">{formatCurrency(paid)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining</p>
                              <p className="text-sm font-medium text-orange-600">{formatCurrency(remaining)}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Transaction Date</p>
                            <p className="text-sm">{formatDate(payment.date)}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              <div className="px-6 py-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredPayments.length} of {payments.length} payment{payments.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
