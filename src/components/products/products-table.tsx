import { useState, useEffect } from "react";
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
import { Edit, Trash2, AlertTriangle, Eye, MoreHorizontal } from "lucide-react";
import type { Product } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";

interface ProductFilters {
  search?: string;
  company_id?: string;
  construction_category?: string;
  available_only?: boolean;
}

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

export function ProductsTable({ products, isLoading, onEdit, onDelete, onView, filters, onFiltersChange }: ProductsTableProps) {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [companyFilter, setCompanyFilter] = useState(filters.company_id || "");
  const [constructionCategoryFilter, setConstructionCategoryFilter] = useState(filters.construction_category || "");
  const [availableOnlyFilter, setAvailableOnlyFilter] = useState(filters.available_only || false);

  // Fetch companies for the filter dropdown
  const { data: companiesResponse } = useQuery<{
    success: boolean;
    data: Array<{ id: string; company_name: string }>;
  }>({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return await response.json();
    },
  });

  const companies = companiesResponse?.data || [];

  // Update all filters, debouncing only search
  useEffect(() => {
    const timer = setTimeout(() => {
      const newFilters: ProductFilters = {};
      // Add company filter
      if (companyFilter && companyFilter !== 'all_companies') {
        newFilters.company_id = companyFilter;
      }
      // Add construction category filter
      if (constructionCategoryFilter && constructionCategoryFilter !== 'all_construction_categories') {
        newFilters.construction_category = constructionCategoryFilter;
      }
      // Add available only filter
      if (availableOnlyFilter) {
        newFilters.available_only = true;
      }
      // Add search (debounced)
      if (searchTerm.trim()) {
        newFilters.search = searchTerm.trim();
      }
      onFiltersChange(newFilters);
    }, searchTerm ? 500 : 0); // Debounce only if there's a search term

    return () => clearTimeout(timer);
  }, [searchTerm, companyFilter, constructionCategoryFilter, availableOnlyFilter, onFiltersChange]);

  // No client-side filtering needed - all filtering is done server-side
  const filteredProducts = products;

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

  // Get unique construction categories for filter
  const constructionCategoriesSet = new Set<string>();
  products.forEach(p => {
    if (p.construction_category) {
      constructionCategoriesSet.add(p.construction_category);
    }
  });
  const uniqueConstructionCategories = Array.from(constructionCategoriesSet);

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card data-testid="filters-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div>
              <Label htmlFor="company-filter">Company</Label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger id="company-filter" data-testid="select-company-filter">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_companies">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="construction-category-filter">Construction Category</Label>
              <Select value={constructionCategoryFilter} onValueChange={setConstructionCategoryFilter}>
                <SelectTrigger id="construction-category-filter" data-testid="select-construction-category-filter">
                  <SelectValue placeholder="All Construction Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_construction_categories">All Construction Categories</SelectItem>
                  {uniqueConstructionCategories.map(category => (
                    <SelectItem key={category} value={category!}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={availableOnlyFilter ? "default" : "ghost"}
                onClick={() => setAvailableOnlyFilter(!availableOnlyFilter)}
                className={availableOnlyFilter ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : "border-gray-300 border-2"}
                data-testid="button-available-only"
              >
                Available Only
              </Button>
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setSearchTerm("");
                  setCompanyFilter("all_companies");
                  setConstructionCategoryFilter("all_construction_categories");
                  setAvailableOnlyFilter(false);
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

      {/* Products Table */}
      <Card data-testid="products-table-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
              <p className="text-muted-foreground">
                {products.length === 0 
                  ? "Create your first product to get started." 
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Product Name
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Brand
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Category
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Company
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Quantity
                      </TableHead>
                      {/* <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Unit Price
                      </TableHead> */}
                      {!isSeller && (
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Total Value
                        </TableHead>
                      )}
                      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Created
                      </TableHead>
                      {!isSeller && (
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow 
                        key={product.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-testid={`row-product-${product.id}`}
                      >
                        <TableCell className="whitespace-nowrap text-sm text-foreground">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.construction_category && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {product.construction_category}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {product.brand || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {product.product_category || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {product.company_name || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-foreground">
                          <div>
                            <div className="font-medium">{product.quantity}</div>
                            {product.unit && (
                              <div className="text-xs text-muted-foreground">{product.unit}</div>
                            )}
                          </div>
                        </TableCell>
                        {/* <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(product.current_price)}
                        </TableCell> */}
                        {!isSeller && (
                          <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                            {formatCurrency(product.quantity * product.current_price)}
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(product.created_at.toString())}
                        </TableCell>
                        {!isSeller && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-${product.id}`}>
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onView(product)} data-testid={`button-view-${product.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(product)} data-testid={`button-edit-${product.id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onDelete(product)}
                                  className="text-destructive"
                                  data-testid={`button-delete-${product.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 p-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 space-y-3 bg-card">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      {product.construction_category && (
                        <Badge variant="outline" className="text-xs">
                          {product.construction_category}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground">Brand</span>
                        <div>{product.brand || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Category</span>
                        <div>{product.product_category || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Company</span>
                        <div>{product.company_name || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Quantity</span>
                        <div>
                          <span className="font-medium">{product.quantity}</span>
                          {product.unit && (
                            <span className="text-xs text-muted-foreground ml-1">{product.unit}</span>
                          )}
                        </div>
                      </div>
                      {/* <div>
                        <span className="text-xs text-muted-foreground">Unit Price</span>
                        <div className="font-medium">{formatCurrency(product.current_price)}</div>
                      </div> */}
                      {!isSeller && (
                        <div>
                          <span className="text-xs text-muted-foreground">Total Value</span>
                          <div className="text-sm font-semibold mt-1">
                            {formatCurrency(product.quantity * product.current_price)}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isSeller && (
                      <div className="flex items-center justify-end pt-2 border-t">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(product)} data-testid={`button-view-${product.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(product)} data-testid={`button-edit-${product.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(product)}
                              className="text-destructive"
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {products.length} product{products.length === 1 ? '' : 's'} on this page
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








