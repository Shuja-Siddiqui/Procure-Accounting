import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Plus, Trash2, Package, DollarSign } from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
  created_at: string;
  updated_at: string;
  units_of_product?: number;
  amount_of_product?: string;
}

interface ProductSelectionProps {
  selectedProducts: Product[];
  onProductsChange: (products: Product[]) => void;
  disabled?: boolean;
}

export function ProductSelection({ selectedProducts, onProductsChange, disabled }: ProductSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all products
  const { data: productsData, isLoading } = useQuery<{
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
  const selectedProductIds = selectedProducts.map(p => p.id);

  const handleAddProduct = (product: Product) => {
    if (!selectedProductIds.includes(product.id)) {
      const newProduct = {
        ...product,
        units_of_product: 1,
        amount_of_product: (product.current_price || 0).toString(),
      };
      onProductsChange([...selectedProducts, newProduct]);
    }
    setOpen(false);
    setSearchTerm("");
  };

  const handleRemoveProduct = (productId: string) => {
    onProductsChange(selectedProducts.filter(p => p.id !== productId));
  };

  const handleUpdateProduct = (productId: string, field: 'units_of_product' | 'amount_of_product', value: string | number) => {
    onProductsChange(selectedProducts.map(p => 
      p.id === productId 
        ? { ...p, [field]: value }
        : p
    ));
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.construction_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Add Product Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search products..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading products..." : "No products found."}
              </CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-64">
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleAddProduct(product)}
                      disabled={selectedProductIds.includes(product.id)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selectedProductIds.includes(product.id) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.brand && `${product.brand} • `}
                          {product.unit && `${product.unit} • `}
                          {formatCurrency(product.current_price || 0)}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selected Products</h4>
          {selectedProducts.map((product) => (
            <Card key={product.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <CardDescription>
                      {product.brand && `${product.brand} • `}
                      {product.unit && `${product.unit} • `}
                      {product.construction_category && `${product.construction_category}`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProduct(product.id)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      value={product.units_of_product || 1}
                      onChange={(e) => handleUpdateProduct(product.id, 'units_of_product', parseInt(e.target.value) || 1)}
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount per Quantity</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={product.amount_of_product || 0}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleUpdateProduct(product.id, 'amount_of_product', value);
                        }
                      }}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="font-bold">
                      {formatCurrency((product.units_of_product || 1) * parseFloat(product.amount_of_product || '0'))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {selectedProducts.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span className="font-medium">Total Amount:</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-2xl font-bold">
                  {formatCurrency(selectedProducts.reduce((sum, product) => {
                    return sum + ((product.units_of_product || 1) * parseFloat(product.amount_of_product || '0'));
                  }, 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

