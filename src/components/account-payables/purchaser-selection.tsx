import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Purchaser {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  status: 'active' | 'inactive';
  products?: Array<{
    id: string;
    name: string;
  }>;
}

interface PurchaserSelectionProps {
  selectedPurchasers: Purchaser[];
  onPurchasersChange: (purchasers: Purchaser[]) => void;
  disabled?: boolean;
}

export function PurchaserSelection({ selectedPurchasers, onPurchasersChange, disabled = false }: PurchaserSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch all purchasers (no filtering by products)
  const { data: purchasersData, isLoading: purchasersLoading } = useQuery<{
    success: boolean;
    data: Purchaser[];
  }>({
    queryKey: ['/api/purchasers'],
    queryFn: async () => {
      console.log('Fetching all purchasers');
      
      const response = await fetch('/api/purchasers', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch purchasers');
        return { success: true, data: [] };
      }
      
      const data = await response.json();
      console.log(`Found ${data.data?.length || 0} purchasers:`, data.data);
      
      return { success: true, data: data.data || [] };
    },
  });

  const purchasers = purchasersData?.data || [];

  // Filter purchasers based on search
  const filteredPurchasers = purchasers.filter((purchaser) =>
    purchaser.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    purchaser.city?.toLowerCase().includes(searchValue.toLowerCase()) ||
    purchaser.number?.includes(searchValue) ||
    purchaser.cnic?.includes(searchValue)
  );

  const handleSelect = (purchaser: Purchaser) => {
    const isSelected = selectedPurchasers.some(p => p.id === purchaser.id);
    console.log('Purchaser selected:', purchaser);
    console.log('Is already selected:', isSelected);
    if (isSelected) {
      const newPurchasers = selectedPurchasers.filter(p => p.id !== purchaser.id);
      console.log('Removing purchaser, new list:', newPurchasers);
      onPurchasersChange(newPurchasers);
    } else {
      const newPurchasers = [...selectedPurchasers, purchaser];
      console.log('Adding purchaser, new list:', newPurchasers);
      onPurchasersChange(newPurchasers);
    }
  };

  const handleRemove = (purchaserId: string) => {
    console.log('Removing purchaser with ID:', purchaserId);
    const newPurchasers = selectedPurchasers.filter(p => p.id !== purchaserId);
    console.log('New purchasers after removal:', newPurchasers);
    onPurchasersChange(newPurchasers);
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
        <label className="text-sm font-medium">Associated Purchasers</label>
        <p className="text-sm text-muted-foreground">
          Select purchasers to associate with this account payable
        </p>
      </div>

      {/* Purchaser Selection Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <Search className="mr-2 h-4 w-4 shrink-0" />
            {searchValue || (selectedPurchasers.length > 0 ? `${selectedPurchasers.length} purchaser(s) selected` : "Search purchasers...")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search purchasers..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {purchasersLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : filteredPurchasers.length === 0 ? (
                <CommandEmpty>
                  {selectedPurchasers.length > 0 
                    ? "No additional purchasers found. Selected purchasers are shown below." 
                    : "No purchasers found."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredPurchasers.map((purchaser) => {
                    const isSelected = selectedPurchasers.some(p => p.id === purchaser.id);
                    return (
                      <CommandItem
                        key={purchaser.id}
                        value={purchaser.name}
                        onSelect={() => handleSelect(purchaser)}
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
                              {purchaser.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {purchaser.city && `${purchaser.city}`}
                              {purchaser.number && ` • ${purchaser.number}`}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(purchaser.status)}>
                          {purchaser.status}
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

      {/* Selected Purchasers */}
      {selectedPurchasers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Selected Purchasers ({selectedPurchasers.length})</CardTitle>
            <CardDescription className="text-xs">
              Click the X to remove a purchaser
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {selectedPurchasers.map((purchaser) => (
                <Badge
                  key={purchaser.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-xs">
                    {purchaser.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemove(purchaser.id)}
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

