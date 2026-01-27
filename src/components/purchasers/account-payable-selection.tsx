import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountPayable {
  id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  products?: Array<{
    id: string;
    name: string;
  }>;
}

interface AccountPayableSelectionProps {
  selectedAccountPayables: AccountPayable[];
  onAccountPayablesChange: (accountPayables: AccountPayable[]) => void;
  selectedProducts: Product[];
  disabled?: boolean;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
}

export function AccountPayableSelection({ selectedAccountPayables, onAccountPayablesChange, selectedProducts, disabled = false }: AccountPayableSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch account payables based on selected products using existing endpoint
  const { data: accountPayablesData, isLoading: accountPayablesLoading } = useQuery<{
    success: boolean;
    data: AccountPayable[];
  }>({
    queryKey: ['/api/account-payable-products/by-products', selectedProducts.map(p => p.id)],
    queryFn: async () => {
      if (selectedProducts.length === 0) {
        return { success: true, data: [] };
      }
      
      console.log('Fetching accountPayables for products:', selectedProducts.map(p => ({ id: p.id, name: p.name })));
      
      // Fetch accountPayables for each product and combine them with product info
      const accountPayablePromises = selectedProducts.map(async (product) => {
        console.log(`Fetching accountPayables for product: ${product.name} (${product.id})`);
        const response = await fetch(`/api/account-payable-products/product/${product.id}`, { 
          credentials: 'include' 
        });
        if (!response.ok) {
          console.warn(`Failed to fetch accountPayables for product ${product.id}`);
          return [];
        }
        const data = await response.json();
        console.log(`Found ${data.data?.length || 0} accountPayables for product ${product.name}:`, data.data);
        
        // Add product information to each accountPayable
        return (data.data || []).map((accountPayable: any) => ({
          ...accountPayable,
          product_name: product.name,
          product_id: product.id
        }));
      });
      
      const accountPayableArrays = await Promise.all(accountPayablePromises);
      
      // Group accountPayables by accountPayable ID and collect all their products
      const accountPayableMap = new Map();
      accountPayableArrays.flat().forEach((accountPayable: any) => {
        if (accountPayableMap.has(accountPayable.id)) {
          // Add product to existing accountPayable
          const existingAccountPayable = accountPayableMap.get(accountPayable.id);
          if (!existingAccountPayable.products.some((p: any) => p.id === accountPayable.product_id)) {
            existingAccountPayable.products.push({
              id: accountPayable.product_id,
              name: accountPayable.product_name
            });
          }
        } else {
          // Create new accountPayable entry
          accountPayableMap.set(accountPayable.id, {
            ...accountPayable,
            products: [{
              id: accountPayable.product_id,
              name: accountPayable.product_name
            }]
          });
        }
      });
      
      const uniqueAccountPayables = Array.from(accountPayableMap.values());
      
      console.log('Final unique accountPayables:', uniqueAccountPayables);
      return { success: true, data: uniqueAccountPayables };
    },
    enabled: selectedProducts.length > 0,
  });

  const accountPayables = accountPayablesData?.data || [];

  // Clear selected accountPayables that are no longer available when products change
  // But don't clear if accountPayables are already selected (they might be from edit mode)
  useEffect(() => {
    if (accountPayables.length > 0) {
      const availableAccountPayableIds = accountPayables.map(v => v.id);
      const validSelectedAccountPayables = selectedAccountPayables.filter(v => availableAccountPayableIds.includes(v.id));
      
      if (validSelectedAccountPayables.length !== selectedAccountPayables.length) {
        console.log('Clearing invalid accountPayables due to product change');
        onAccountPayablesChange(validSelectedAccountPayables);
      }
    }
    // Don't auto-clear accountPayables when no products are selected
    // They might be pre-selected from edit mode
  }, [accountPayables, selectedAccountPayables, onAccountPayablesChange]);

  // Filter accountPayables based on search
  const filteredAccountPayables = accountPayables.filter((accountPayable) =>
    accountPayable.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    accountPayable.city?.toLowerCase().includes(searchValue.toLowerCase()) ||
    accountPayable.number?.includes(searchValue)
  );

  const handleSelect = (accountPayable: AccountPayable) => {
    const isSelected = selectedAccountPayables.some(v => v.id === accountPayable.id);
    console.log('AccountPayable selected:', accountPayable);
    console.log('Is already selected:', isSelected);
    console.log('Current selected accountPayables:', selectedAccountPayables);
    if (isSelected) {
      const newAccountPayables = selectedAccountPayables.filter(v => v.id !== accountPayable.id);
      console.log('Removing accountPayable, new list:', newAccountPayables);
      onAccountPayablesChange(newAccountPayables);
    } else {
      const newAccountPayables = [...selectedAccountPayables, accountPayable];
      console.log('Adding accountPayable, new list:', newAccountPayables);
      onAccountPayablesChange(newAccountPayables);
    }
  };

  const handleRemove = (accountPayableId: string) => {
    console.log('Removing accountPayable with ID:', accountPayableId);
    const newAccountPayables = selectedAccountPayables.filter(v => v.id !== accountPayableId);
    console.log('New accountPayables after removal:', newAccountPayables);
    onAccountPayablesChange(newAccountPayables);
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

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Associated AccountPayables</label>
        <p className="text-sm text-muted-foreground">
          {selectedProducts.length > 0 
            ? `Select accountPayables that supply the selected products (${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''})`
            : 'Select products first to see available accountPayables'
          }
        </p>
      </div>

      {/* AccountPayable Selection Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || selectedProducts.length === 0}
          >
            <Search className="mr-2 h-4 w-4 shrink-0" />
            {selectedProducts.length === 0 
              ? (selectedAccountPayables.length > 0 ? `${selectedAccountPayables.length} account payable(s) selected` : "Search accountPayables...")
              : searchValue || "Search accountPayables..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search accountPayables..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {accountPayablesLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : filteredAccountPayables.length === 0 ? (
                <CommandEmpty>
                  {selectedProducts.length === 0 
                    ? (selectedAccountPayables.length > 0 
                        ? "No additional accountPayables available. Selected accountPayables are shown below." 
                        : "Select products first to see available accountPayables, or accountPayables will be shown if already associated.")
                    : "No accountPayables found for the selected products."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredAccountPayables.map((accountPayable) => {
                    const isSelected = selectedAccountPayables.some(v => v.id === accountPayable.id);
                    return (
                      <CommandItem
                        key={accountPayable.id}
                        value={accountPayable.name}
                        onSelect={() => handleSelect(accountPayable)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {accountPayable.products && accountPayable.products.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-sm text-blue-600 font-semibold">
                                    {accountPayable.products.map((p: any) => p.name).join(', ')}
                                  </div>
                                  <div className="text-sm font-medium">{accountPayable.name}</div>
                                </div>
                              ) : (
                                accountPayable.name
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {accountPayable.city && `${accountPayable.city}`}
                              {accountPayable.number && ` • ${accountPayable.number}`}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(accountPayable.status)}>
                          {accountPayable.status}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected AccountPayables */}
      {selectedAccountPayables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Selected AccountPayables ({selectedAccountPayables.length})</CardTitle>
            <CardDescription className="text-xs">
              Click the X to remove a accountPayable
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {selectedAccountPayables.map((accountPayable) => (
                <Badge
                  key={accountPayable.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-xs">
                    {accountPayable.products && accountPayable.products.length > 0 ? (
                      <span>
                        <span className="text-blue-600 font-semibold">
                          {accountPayable.products.map((p: any) => p.name).join(', ')}
                        </span>
                        <span className="mx-1">•</span>
                        <span>{accountPayable.name}</span>
                      </span>
                    ) : (
                      accountPayable.name
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemove(accountPayable.id)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
