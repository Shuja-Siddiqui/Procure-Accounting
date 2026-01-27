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
import { MoreHorizontal, Edit, Trash2, Phone, MapPin, Building2, Eye } from "lucide-react";
import { format } from "date-fns";

interface AccountPayable {
  id: string;
  ap_id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  balance?: string | number;
  created_at: string;
  updated_at: string;
}

interface AccountPayablesTableProps {
  accountPayables: AccountPayable[];
  isLoading: boolean;
  onEdit: (accountPayable: AccountPayable) => void;
  onDelete: (accountPayable: AccountPayable) => void;
  onView?: (accountPayable: AccountPayable) => void;
}

export function AccountPayablesTable({ accountPayables, isLoading, onEdit, onDelete, onView }: AccountPayablesTableProps) {
  const [sortField, setSortField] = useState<keyof AccountPayable>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof AccountPayable) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAccountPayables = [...accountPayables].sort((a, b) => {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (accountPayables.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No accountPayables found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating a new accountPayable.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  return (
    <div className="rounded-md border">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('ap_id')}
              >
                <div className="flex items-center gap-2">
                  AP ID
                  {sortField === 'ap_id' && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name
                  {sortField === 'name' && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('city')}
              >
                <div className="flex items-center gap-2">
                  Location
                  {sortField === 'city' && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {sortField === 'status' && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-2">
                  Created
                  {sortField === 'created_at' && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('balance')}
              >
                <div className="flex items-center gap-2 justify-end">
                  Balance
                  {sortField === 'balance' && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccountPayables.map((accountPayable) => (
              <TableRow key={accountPayable.id}>
                <TableCell>
                  
                  <span className="text-xs font-mono text-muted-foreground">
                    {accountPayable.ap_id}
                  </span>
                </TableCell>
                <TableCell>
                <div className="flex items-center gap-3">
                    
                    <div>
                      <div className="font-medium">{accountPayable.name}</div>
                      {/* {accountPayable.address && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {accountPayable.address}
                        </div>
                      )} */}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {accountPayable.number ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" />
                      {accountPayable.number}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No contact</span>
                  )}
                </TableCell>
                <TableCell>
                  {accountPayable.city ? (
                    <span className="text-sm">{accountPayable.city}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not specified</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={accountPayable.status === 'active' ? 'default' : 'secondary'}>
                    {accountPayable.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(accountPayable.created_at), 'MMM dd, yyyy')}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-semibold">
                    {formatCurrency(accountPayable.balance)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(accountPayable)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(accountPayable)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(accountPayable)}
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
        {sortedAccountPayables.map((accountPayable) => (
          <div key={accountPayable.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="space-y-1">
              <div className="font-medium text-sm">{accountPayable.name}</div>
              <div className="text-xs font-mono text-muted-foreground">
                {accountPayable.ap_id}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge variant={accountPayable.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {accountPayable.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Contact</span>
                {accountPayable.number ? (
                  <span className="text-sm">{accountPayable.number}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Location</span>
                {accountPayable.city ? (
                  <span className="text-sm">{accountPayable.city}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-xs text-muted-foreground">Balance</span>
                <div className="text-sm font-semibold mt-1">
                  {formatCurrency(accountPayable.balance)}
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
                    <DropdownMenuItem onClick={() => onView(accountPayable)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(accountPayable)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(accountPayable)}
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
