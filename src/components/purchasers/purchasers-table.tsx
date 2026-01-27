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
import { MoreHorizontal, Edit, Trash2, Phone, MapPin, Eye, User, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface Purchaser {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface PurchasersTableProps {
  purchasers: Purchaser[];
  isLoading: boolean;
  onView?: (purchaser: Purchaser) => void;
  onEdit: (purchaser: Purchaser) => void;
  onDelete: (purchaser: Purchaser) => void;
}

export function PurchasersTable({ purchasers, isLoading, onView, onEdit, onDelete }: PurchasersTableProps) {
  const [sortField, setSortField] = useState<keyof Purchaser>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Purchaser) => {
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

  if (purchasers.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No purchasers found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating a new purchaser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Purchaser Name
                </div>
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchasers.map((purchaser) => (
              <TableRow key={purchaser.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{purchaser.name}</div>
                      {purchaser.cnic && (
                        <div className="text-sm text-muted-foreground">
                          CNIC: {purchaser.cnic}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {purchaser.number ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{purchaser.number}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No contact</span>
                  )}
                </TableCell>
                <TableCell>
                  {purchaser.city ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{purchaser.city}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No location</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(purchaser.status)}>
                    {purchaser.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(purchaser.created_at), 'MMM d, yyyy')}
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
                        <DropdownMenuItem onClick={() => onView(purchaser)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(purchaser)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(purchaser)}
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
      <div className="md:hidden space-y-3">
        {purchasers.map((purchaser) => (
          <div key={purchaser.id} className="border rounded-lg p-4 space-y-2 bg-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{purchaser.name}</div>
                  {purchaser.cnic && (
                    <div className="text-xs text-muted-foreground mt-1">
                      CNIC: {purchaser.cnic}
                    </div>
                  )}
                </div>
              </div>
              <Badge className={`${getStatusColor(purchaser.status)} text-xs`}>
                {purchaser.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
              <div>
                <span className="text-xs text-muted-foreground">Contact</span>
                <div className="text-xs">
                  {purchaser.number ? (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {purchaser.number}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No contact</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Location</span>
                <div className="text-xs">
                  {purchaser.city ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {purchaser.city}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No location</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(purchaser.created_at), 'MMM d, yyyy')}
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
                    <DropdownMenuItem onClick={() => onView(purchaser)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(purchaser)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(purchaser)}
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
