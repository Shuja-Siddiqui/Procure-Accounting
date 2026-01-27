import { useState } from "react";
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
import { Edit, Trash2, AlertTriangle, Eye, MoreHorizontal } from "lucide-react";
import type { Account } from "@shared/schema";

interface AccountsTableProps {
  accounts: Account[];
  isLoading: boolean;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onView: (account: Account) => void;
}

export function AccountsTable({ accounts, isLoading, onEdit, onDelete, onView }: AccountsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = 
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.handler?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === 'all_statuses' || account.status === statusFilter;
    const matchesAccountType = !currencyFilter || currencyFilter === 'all_types' || account.account_type === currencyFilter;

    return matchesSearch && matchesStatus && matchesAccountType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" data-testid="select-status-filter" className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type-filter">Account Type</Label>
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger id="type-filter" data-testid="select-type-filter" className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_types">All Types</SelectItem>
                  <SelectItem value="petty">Petty</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all_statuses");
                  setCurrencyFilter("all_types");
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

      {/* Accounts Table */}
      <Card data-testid="accounts-table-card">
        <CardContent className="p-0 overflow-x-hidden">
          {filteredAccounts.length === 0 && !isLoading ? (
            <div className="text-center py-12" data-testid="empty-state">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No accounts found</h3>
              <p className="text-muted-foreground">
                {accounts.length === 0 
                  ? "Create your first account to get started." 
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-hidden w-full">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">
                        Account Number
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[200px]">
                        Account Name
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">
                        Handler
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
                        Type
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">
                        Balance
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow 
                        key={account.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-testid={`row-account-${account.id}`}
                      >
                        <TableCell className="whitespace-nowrap text-sm font-mono text-foreground">
                          {account.account_number}
                        </TableCell>
                        <TableCell className="text-sm text-foreground max-w-[200px]">
                          <div className="truncate" title={account.name}>
                            {account.name}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          <div className="truncate max-w-[120px]" title={account.handler || '-'}>
                            {account.handler || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {account.account_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(account.balance)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge 
                            variant={account.status === 'active' ? 'default' : 'secondary'}
                            className={account.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' 
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }
                          >
                            {account.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-${account.id}`}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onView(account)} data-testid={`button-view-${account.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit(account)} data-testid={`button-edit-${account.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDelete(account)}
                                className="text-destructive"
                                data-testid={`button-delete-${account.id}`}
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
                {filteredAccounts.map((account) => (
                  <div key={account.id} className="border rounded-lg p-4 space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{account.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Account Number</span>
                          <span className="text-xs font-mono text-muted-foreground">{account.account_number}</span>
                        </div>
                      </div>
                      <Badge 
                        variant={account.status === 'active' ? 'default' : 'secondary'}
                        className={`capitalize text-xs ${
                          account.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Handler</span>
                        <div className="text-xs">{account.handler || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Type</span>
                        <div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {account.account_type}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Balance</span>
                        <div className="text-sm font-semibold">{formatCurrency(account.balance)}</div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-${account.id}`}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(account)} data-testid={`button-view-${account.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(account)} data-testid={`button-edit-${account.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(account)}
                            className="text-destructive"
                            data-testid={`button-delete-${account.id}`}
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
                    Showing {filteredAccounts.length} of {accounts.length} accounts
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
