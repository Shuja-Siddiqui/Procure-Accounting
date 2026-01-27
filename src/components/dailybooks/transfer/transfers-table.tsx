import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Eye, ExternalLink, Calendar } from "lucide-react";
import { CopyableId } from "@/components/ui/copyable-id";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TransferTransaction {
  id: string;
  type: string;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  total_amount: string | number;
  paid_amount: string | number;
  description?: string | null;
  mode_of_payment?: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  sourceAccount?: {
    id: string;
    name: string;
    account_number?: string;
    account_type?: string;
  } | null;
  destinationAccount?: {
    id: string;
    name: string;
    account_number?: string;
    account_type?: string;
  } | null;
}

interface TransferFilters {
  source_account_id?: string;
  destination_account_id?: string;
  date_from?: string;
  date_to?: string;
}

interface TransfersTableProps {
  transfers: TransferTransaction[];
  isLoading: boolean;
  onView: (transfer: TransferTransaction) => void;
  onFiltersChange?: (filters: TransferFilters) => void;
}

export function TransfersTable({ transfers, isLoading, onView, onFiltersChange }: TransfersTableProps) {
  const [, setLocation] = useLocation();
  const [sourceAccountFilter, setSourceAccountFilter] = useState<string>("");
  const [destinationAccountFilter, setDestinationAccountFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");

  // Fetch accounts for filter dropdowns
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });

  const accounts = accountsResponse?.data || [];

  // Apply filters
  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      // Source account filter
      if (sourceAccountFilter && transfer.source_account_id !== sourceAccountFilter) {
        return false;
      }

      // Destination account filter
      if (destinationAccountFilter && transfer.destination_account_id !== destinationAccountFilter) {
        return false;
      }

      // Date range filter
      if (dateFromFilter || dateToFilter) {
        const transferDate = new Date(transfer.date);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (transferDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (transferDate > toDate) return false;
        }
      }

      return true;
    });
  }, [transfers, sourceAccountFilter, destinationAccountFilter, dateFromFilter, dateToFilter]);

  // Update parent filters when local filters change
  useMemo(() => {
    if (onFiltersChange) {
      const filters: TransferFilters = {};
      if (sourceAccountFilter) filters.source_account_id = sourceAccountFilter;
      if (destinationAccountFilter) filters.destination_account_id = destinationAccountFilter;
      if (dateFromFilter) filters.date_from = dateFromFilter;
      if (dateToFilter) filters.date_to = dateToFilter;
      onFiltersChange(filters);
    }
  }, [sourceAccountFilter, destinationAccountFilter, dateFromFilter, dateToFilter, onFiltersChange]);

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

  const handleAccountClick = (accountId: string) => {
    setLocation(`/accounts/${accountId}`);
  };

  const handleClearFilters = () => {
    setSourceAccountFilter("");
    setDestinationAccountFilter("");
    setDateFromFilter("");
    setDateToFilter("");
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
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="source-account-filter">Source Account</Label>
                <Select value={sourceAccountFilter || "all"} onValueChange={(value) => setSourceAccountFilter(value === "all" ? "" : value)}>
                  <SelectTrigger id="source-account-filter" className="w-full">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[200px]">
                <Label htmlFor="destination-account-filter">Destination Account</Label>
                <Select value={destinationAccountFilter || "all"} onValueChange={(value) => setDestinationAccountFilter(value === "all" ? "" : value)}>
                  <SelectTrigger id="destination-account-filter" className="w-full">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="date-from-filter">Date From</Label>
                <Input
                  id="date-from-filter"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Label htmlFor="date-to-filter">Date To</Label>
                <Input
                  id="date-to-filter"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto">
                <Button 
                  variant="secondary" 
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTransfers.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transfers found</h3>
              <p className="text-muted-foreground">
                {transfers.length === 0 
                  ? "No transfers available." 
                  : "Try adjusting your filter criteria."}
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
                        From Account
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                        To Account
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Payment Mode
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]">
                        Transaction Date
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.map((transfer) => {
                      const amount = typeof transfer.paid_amount === 'string' 
                        ? parseFloat(transfer.paid_amount) 
                        : transfer.paid_amount || 0;

                      return (
                        <TableRow 
                          key={transfer.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell className="whitespace-nowrap text-sm">
                            <CopyableId id={transfer.id} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transfer.sourceAccount?.name ? (
                              <button
                                onClick={() => handleAccountClick(transfer.source_account_id!)}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                                title={`View ${transfer.sourceAccount.name} details`}
                              >
                                <span>{transfer.sourceAccount.name}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {transfer.destinationAccount?.name ? (
                              <button
                                onClick={() => handleAccountClick(transfer.destination_account_id!)}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 transition-colors"
                                title={`View ${transfer.destinationAccount.name} details`}
                              >
                                <span>{transfer.destinationAccount.name}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium">
                            {formatCurrency(amount)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {transfer.mode_of_payment || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(transfer.date)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onView(transfer)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
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
                {filteredTransfers.map((transfer) => {
                  const amount = typeof transfer.paid_amount === 'string' 
                    ? parseFloat(transfer.paid_amount) 
                    : transfer.paid_amount || 0;

                  return (
                    <Card key={transfer.id} className="border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CopyableId id={transfer.id} />
                            <p className="text-xs text-muted-foreground">
                              {formatDate(transfer.date)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(transfer)}
                            className="h-8 w-8"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">From:</span>
                            <span className="text-sm font-medium">
                              {transfer.sourceAccount?.name || '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">To:</span>
                            <span className="text-sm font-medium">
                              {transfer.destinationAccount?.name || '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Amount:</span>
                            <span className="text-sm font-semibold">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          {transfer.mode_of_payment && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Mode:</span>
                              <span className="text-sm">
                                {transfer.mode_of_payment}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

