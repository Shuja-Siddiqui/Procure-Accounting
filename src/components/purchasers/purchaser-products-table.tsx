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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, ShoppingCart, Package, User } from "lucide-react";
import { format } from "date-fns";

interface PurchaserProductRelationship {
  id: string;
  purchaser_id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
  purchaser: {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    city?: string;
  };
  product: {
    id: string;
    name: string;
    brand?: string;
    unit?: string;
    current_price?: number;
    construction_category?: 'grey' | 'finishing' | 'both';
  };
}

interface PurchaserProductsTableProps {
  relationships: PurchaserProductRelationship[];
  isLoading: boolean;
  onDelete: (relationship: PurchaserProductRelationship) => void;
}

export function PurchaserProductsTable({ relationships, isLoading, onDelete }: PurchaserProductsTableProps) {
  const [sortField, setSortField] = useState<keyof PurchaserProductRelationship>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof PurchaserProductRelationship) => {
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grey':
        return 'bg-gray-100 text-gray-800';
      case 'finishing':
        return 'bg-blue-100 text-blue-800';
      case 'both':
        return 'bg-purple-100 text-purple-800';
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

  if (relationships.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No relationships found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No purchaser-product relationships have been created yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('purchaser')}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Purchaser
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('product')}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product
              </div>
            </TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Category</TableHead>
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
          {relationships.map((relationship) => (
            <TableRow key={relationship.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{relationship.purchaser.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(relationship.purchaser.status)}>
                        {relationship.purchaser.status}
                      </Badge>
                      {relationship.purchaser.city && (
                        <span className="text-sm text-muted-foreground">
                          {relationship.purchaser.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{relationship.product.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {relationship.product.brand && (
                        <span>Brand: {relationship.product.brand}</span>
                      )}
                      {relationship.product.unit && (
                        <span>• Unit: {relationship.product.unit}</span>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {relationship.product.current_price ? (
                  <span className="font-medium">
                    ${relationship.product.current_price}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No price</span>
                )}
              </TableCell>
              <TableCell>
                {relationship.product.construction_category ? (
                  <Badge variant="outline" className={getCategoryColor(relationship.product.construction_category)}>
                    {relationship.product.construction_category}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not specified</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(relationship.created_at), 'MMM d, yyyy')}
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
                    <DropdownMenuItem 
                      onClick={() => onDelete(relationship)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Relationship
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
