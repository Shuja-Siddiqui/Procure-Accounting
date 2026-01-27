import { useState } from "react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Building2, Eye } from "lucide-react";
import { format } from "date-fns";

interface AccountReceivable {
  id: string;
  ar_id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  address?: string;
  status: 'active' | 'inactive';
  construction_category?: 'grey' | 'finishing' | 'both';
  balance?: string | number;
  created_at: string;
  updated_at: string;
}

interface AccountReceivablesTableProps {
  accountReceivables: AccountReceivable[];
  isLoading: boolean;
  onView?: (accountReceivable: AccountReceivable) => void;
  onEdit: (accountReceivable: AccountReceivable) => void;
  onDelete: (accountReceivable: AccountReceivable) => void;
}

export function AccountReceivablesTable({ accountReceivables, isLoading, onView, onEdit, onDelete }: AccountReceivablesTableProps) {
  const [sortField, setSortField] = useState<keyof AccountReceivable>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof AccountReceivable) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const formatCurrency = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (accountReceivables.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No account receivables found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating a new account receivable.
        </p>
      </div>
    );
  }

  const sortedAccountReceivables = [...accountReceivables].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  return (
    <div className="rounded-md border">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AR ID</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                Name
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                Status
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('created_at')}
              >
                Created
              </TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccountReceivables.map((accountReceivable) => (
              <TableRow key={accountReceivable.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {accountReceivable.ar_id}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{accountReceivable.name}</div>
                </TableCell>
                <TableCell>
                  {accountReceivable.number ? (
                    <span className="text-sm">{accountReceivable.number}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {accountReceivable.city ? (
                    <span className="text-sm">{accountReceivable.city}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(accountReceivable.status)}>
                    {accountReceivable.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(accountReceivable.created_at), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">
                    {formatCurrency(accountReceivable.balance ?? 0)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(accountReceivable)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(accountReceivable)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(accountReceivable)}
                        className="text-destructive"
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
      <div className="md:hidden space-y-4 p-4">
        {sortedAccountReceivables.map((accountReceivable) => (
          <div key={accountReceivable.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="space-y-1">
              <div className="font-medium text-sm">{accountReceivable.name}</div>
              <div className="text-xs font-mono text-muted-foreground">
                {accountReceivable.ar_id}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className={`${getStatusColor(accountReceivable.status)} text-xs`}>
                {accountReceivable.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Contact</span>
                {accountReceivable.number ? (
                  <span className="text-sm">{accountReceivable.number}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Location</span>
                {accountReceivable.city ? (
                  <span className="text-sm">{accountReceivable.city}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-xs text-muted-foreground">Balance</span>
                <div className="text-sm font-semibold mt-1">
                  {formatCurrency(accountReceivable.balance ?? 0)}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(accountReceivable)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(accountReceivable)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(accountReceivable)}
                    className="text-destructive"
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
    </div>
  );
}

