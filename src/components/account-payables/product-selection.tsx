import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
}

interface ProductSelectionProps {
  selectedProducts: Product[];
  onProductsChange: (products: Product[]) => void;
  disabled?: boolean;
}

export function ProductSelection({ selectedProducts, onProductsChange, disabled = false }: ProductSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch all products
  const { data: productsData, isLoading: productsLoading } = useQuery<{
    success: boolean;
    data: Product[];
  }>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  const products = productsData?.data || [];

  // Filter products based on search
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchValue.toLowerCase()) ||
    product.construction_category?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (product: Product) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    
    if (isSelected) {
      // Remove product
      onProductsChange(selectedProducts.filter(p => p.id !== product.id));
    } else {
      // Add product
      onProductsChange([...selectedProducts, product]);
    }
  };

  const handleRemove = (productId: string) => {
    onProductsChange(selectedProducts.filter(p => p.id !== productId));
  };

  const isSelected = (product: Product) => {
    return selectedProducts.some(p => p.id === product.id);
  };

  if (productsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Select products that this vendor supplies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>Select products that this vendor supplies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Search and Selection */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="truncate">
                  {searchValue || "Search products..."}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search products by name, brand, or category..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.brand || ''} ${product.construction_category || ''}`}
                      onSelect={() => handleSelect(product)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            isSelected(product) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{product.name}</span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {product.brand && <span>Brand: {product.brand}</span>}
                            {product.unit && <span>• Unit: {product.unit}</span>}
                            {product.construction_category && (
                              <span>• {product.construction_category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {product.current_price && (
                        <span className="text-sm font-medium">
                          ${product.current_price}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected Products */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Selected Products ({selectedProducts.length})
              </span>
            </div>
            <div className="space-y-2">
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{product.name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {product.brand && <span>Brand: {product.brand}</span>}
                      {product.unit && <span>• Unit: {product.unit}</span>}
                      {product.construction_category && (
                        <span>• {product.construction_category}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.current_price && (
                      <span className="text-sm font-medium">
                        ${product.current_price}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(product.id)}
                      disabled={disabled}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProducts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2" />
            <p>No products selected</p>
            <p className="text-sm">Search and select products above</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
