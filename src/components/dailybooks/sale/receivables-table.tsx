import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, AlertTriangle, Eye, ExternalLink, Calendar, Printer, MoreHorizontal, ChevronDown, ChevronUp, Filter, Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface Receivable {
  id: string;
  account_receivable_id?: string;
  account_payable_id?: string;
  transaction_id: string;
  amount: string | number;
  total_payment: string | number;
  remaining_payment: string | number;
  status: 'pending' | 'partial_pending' | 'paid';
  description?: string | null;
  due_date?: string | null;
  sale_invoice_number?: string | null;
  receipt_invoice_number?: string | null;
  type?: string;
  created_at: string;
  updated_at: string;
  accountReceivable?: {
    id: string;
    ar_id?: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  };
  accountPayable?: {
    id: string;
    name: string;
    number?: string;
    city?: string;
    address?: string;
  };
  transaction?: {
    id: string;
    date?: string | null;
    description?: string | null;
    mode_of_payment?: string | null;
    sale_invoice_number?: string | null;
    receipt_invoice_number?: string | null;
    type?: string;
  };
}

interface ReceivableFilters {
  search?: string;
  status?: string;
  account_receivable_id?: string;
  date_from?: string;
  date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
}

interface ReceivablesTableProps {
  receivables: Receivable[];
  isLoading: boolean;
  onView: (receivable: Receivable) => void;
  onEdit: (receivable: Receivable) => void;
  onDelete: (receivable: Receivable) => void;
  onFiltersChange?: (filters: ReceivableFilters) => void;
}

export function ReceivablesTable({ receivables, isLoading, onView, onEdit, onDelete, onFiltersChange }: ReceivablesTableProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const todayIso = new Date().toISOString().split("T")[0];
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [accountReceivableFilter, setAccountReceivableFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "today" | "week">("all");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

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


  // Fetch all account receivables for dropdown (not just from filtered receivables)
  const { data: accountReceivablesResponse } = useQuery({
    queryKey: ['/api/account-receivables'],
    queryFn: async () => {
      const res = await fetch('/api/account-receivables', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch account receivables');
      return await res.json();
    },
  });
  
  const uniqueAccountReceivables = (accountReceivablesResponse?.data || [])
    .map((ar: any) => ({ id: ar.id, name: ar.name }))
    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  // No client-side filtering - data comes pre-filtered from API
  // Just use receivables directly as they're already filtered by the backend
  const filteredReceivables = receivables;

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '?0.00';
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

  const getTransactionTypeLabel = (type: string | undefined) => {
    if (!type) return 'Receipt';
    const typeMap: Record<string, string> = {
      'sale': 'Sale',
      'advance_sale_inventory': 'Advance Sale',
      'advance_sale_payment': 'Advance Payment',
      'sale_return': 'Sale Return',
      'receive_able': 'AR Receipt',
      'receive_able_vendor': 'Vendor Receipt',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'partial_pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };


  const handleAccountReceivableClick = (accountReceivableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/account-receivables/${accountReceivableId}`);
  };

  const handleAccountPayableClick = (accountPayableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/account-payables/${accountPayableId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setAccountReceivableFilter("all_receivables");
    setDateFromFilter("");
    setDateToFilter("");
    setDateFilterMode("all");
    // Reset page when clearing filters
    if (onFiltersChange) {
      onFiltersChange({});
    }
  };

  // Update parent filters when local filters change
  // Send all filters including search to API for server-side filtering
  useEffect(() => {
    if (onFiltersChange) {
      const filters: ReceivableFilters = {};
      // Send search to API for server-side search (trim whitespace)
      const trimmedSearch = debouncedSearchTerm.trim();
      if (trimmedSearch) {
        filters.search = trimmedSearch;
      }
      // Apply date filters
      if (dateFromFilter) filters.date_from = dateFromFilter;
      if (dateToFilter) filters.date_to = dateToFilter;
      // Client filter
      if (accountReceivableFilter && accountReceivableFilter !== 'all_receivables') filters.account_receivable_id = accountReceivableFilter;
      onFiltersChange(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, accountReceivableFilter, dateFromFilter, dateToFilter]);

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
                placeholder="Search by any field: ID, invoice number, client, amount, date, type, mode of payment..."
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
              placeholder="Search by any field: ID, invoice number, client, amount, date, type, mode of payment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Advanced Filters - Hidden on mobile unless expanded */}
          <div className={`${isMobileFiltersOpen ? 'block' : 'hidden'} sm:block space-y-4`}>
            {/* Second Row: Account Receivable (Client) only - status removed */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="account-receivable-filter">Client</Label>
                <Select value={accountReceivableFilter} onValueChange={setAccountReceivableFilter}>
                  <SelectTrigger id="account-receivable-filter" className="w-full">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_receivables">All Clients</SelectItem>
                    {uniqueAccountReceivables.map((receivable: { id: string; name: string }) => (
                      <SelectItem key={receivable.id} value={receivable.id}>
                        {receivable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Third Row: Date Range + Quick Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="date-from-filter">Date From</Label>
                <Input
                  id="date-from-filter"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => {
                    setDateFromFilter(e.target.value);
                    setDateFilterMode("all"); // Reset to custom when manually changing dates
                  }}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="date-to-filter">Date To</Label>
                <Input
                  id="date-to-filter"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => {
                    setDateToFilter(e.target.value);
                    setDateFilterMode("all"); // Reset to custom when manually changing dates
                  }}
                  className="w-full"
                />
              </div>
              {/* Desktop: Pipe-separated filter buttons */}
              <div className="hidden sm:flex items-center gap-0 border rounded-md overflow-hidden">
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
                  All time
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

      {/* Receivables Table */}
      <Card>
        <CardContent className="p-0">
          {filteredReceivables.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No receivables found</h3>
              <p className="text-muted-foreground">
                {receivables.length === 0 
                  ? "No receivables available." 
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
                          Client
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
                        filteredReceivables.map((receivable) => {
                          const invoiceNumber = receivable.sale_invoice_number || receivable.receipt_invoice_number || receivable.transaction?.sale_invoice_number || receivable.transaction?.receipt_invoice_number || '-';
                          const isCopied = copiedInvoiceId === invoiceNumber;
                          
                          const amount = typeof receivable.amount === 'string' 
                            ? parseFloat(receivable.amount) 
                            : receivable.amount || 0;
                          const paid = typeof receivable.total_payment === 'string'
                            ? parseFloat(receivable.total_payment) 
                            : receivable.total_payment || 0;
                          const remaining = typeof receivable.remaining_payment === 'string'
                            ? parseFloat(receivable.remaining_payment) 
                            : receivable.remaining_payment || 0;
                          
                          return (
                            <TableRow 
                              key={receivable.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => onView(receivable)}
                            >
                              <TableCell className="whitespace-nowrap">
                                <Badge 
                                  variant={
                                    receivable.transaction?.type === 'sale' ? 'default' :
                                    receivable.transaction?.type === 'sale_return' ? 'destructive' :
                                    receivable.transaction?.type === 'advance_sale_inventory' ? 'outline' :
                                    receivable.transaction?.type === 'advance_sale_payment' ? 'secondary' :
                                    receivable.transaction?.type === 'receive_able' ? 'default' :
                                    receivable.transaction?.type === 'receive_able_vendor' ? 'default' :
                                    'default'
                                  }
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  {getTransactionTypeLabel(receivable.type || receivable.transaction?.type)}
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
                                {receivable.transaction?.type === 'receive_able_vendor' && receivable.accountPayable?.name ? (
                                  <button
                                    onClick={(e) => handleAccountPayableClick(receivable.account_payable_id!, e)}
                                    className="text-red-600 hover:text-red-800 hover:underline flex items-center space-x-1 transition-colors text-left"
                                    title={`View ${receivable.accountPayable.name} details`}
                                  >
                                    <span className="truncate">{receivable.accountPayable.name}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </button>
                                ) : receivable.accountReceivable?.name ? (
                                  <button
                                    onClick={(e) => handleAccountReceivableClick(receivable.account_receivable_id!, e)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors text-left"
                                    title={`View ${receivable.accountReceivable.name} details`}
                                  >
                                    <span className="truncate">{receivable.accountReceivable.name}</span>
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
                                {formatDate(receivable.transaction?.date || receivable.created_at)}
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
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  filteredReceivables.map((receivable) => {
                    const invoiceNumber = receivable.sale_invoice_number || receivable.receipt_invoice_number || receivable.transaction?.sale_invoice_number || receivable.transaction?.receipt_invoice_number || '-';
                    const isCopied = copiedInvoiceId === invoiceNumber;
                    
                    return (
                      <Card 
                        key={receivable.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onView(receivable)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <Badge 
                                variant={
                                  receivable.transaction?.type === 'sale' ? 'default' :
                                  receivable.transaction?.type === 'sale_return' ? 'destructive' :
                                  receivable.transaction?.type === 'advance_sale_inventory' ? 'outline' :
                                  receivable.transaction?.type === 'advance_sale_payment' ? 'secondary' :
                                  receivable.transaction?.type === 'receive_able' ? 'default' :
                                  receivable.transaction?.type === 'receive_able_vendor' ? 'default' :
                                  'default'
                                }
                                className="text-[10px] px-1.5 py-0.5 mb-1"
                              >
                                {getTransactionTypeLabel(receivable.type || receivable.transaction?.type)}
                              </Badge>
                              {invoiceNumber !== '-' ? (
                                <div className="flex items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyInvoiceNumber(invoiceNumber, e);
                                        }}
                                        className="flex items-center gap-1 text-sm font-mono hover:text-primary transition-colors"
                                      >
                                        <span>{invoiceNumber}</span>
                                        {isCopied ? (
                                          <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Click to copy invoice number</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : (
                                <span className="text-sm font-mono text-muted-foreground">-</span>
                              )}
                              {receivable.transaction?.type === 'receive_able_vendor' && receivable.accountPayable?.name ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccountPayableClick(receivable.account_payable_id!, e);
                                  }}
                                  className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline flex items-center space-x-1 transition-colors"
                                >
                                  <span>{receivable.accountPayable.name}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : (
                                <p className="text-sm font-medium">
                                  {receivable.accountReceivable?.name || 'Unknown Client'}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Amount</p>
                              <p className="font-medium">{formatCurrency(receivable.amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Paid</p>
                              <p className="font-medium text-green-600">{formatCurrency(receivable.total_payment)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Remaining</p>
                              <p className="font-medium text-orange-600">{formatCurrency(receivable.remaining_payment)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Transaction Date</p>
                              <p className="font-medium">{formatDate(receivable.transaction?.date || receivable.created_at)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

