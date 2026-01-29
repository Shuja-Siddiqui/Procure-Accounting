import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction } from "@shared/schema";
import { MODE_OF_PAYMENT_OPTIONS } from "@/types/transactions";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Plus, Trash2, Calculator, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: string;
  unit: string;
  per_unit_rate: string;
  discount_percentage: string; // NEW: Discount percentage
  discount_per_unit: string; // NEW: Auto-calculated discount per unit
  discount: string; // NEW: Total discount amount
  total_amount: string;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Searchable Vendor Select Component
interface SearchableVendorSelectProps {
  form: any;
  accountPayables: any[];
}

function SearchableVendorSelect({ form, accountPayables }: SearchableVendorSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const field = form.watch('account_payable_id');
  
  const filteredVendors = accountPayables.filter((ap: any) =>
    ap.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    ap.city?.toLowerCase().includes(searchValue.toLowerCase()) ||
    ap.number?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedVendor = accountPayables.find((ap: any) => ap.id === field);

  return (
    <FormField
      control={form.control}
      name="account_payable_id"
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>Account Payable (Vendor) <span className="text-destructive">*</span></FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !formField.value && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedVendor ? `${selectedVendor.name}${selectedVendor.city ? ` - ${selectedVendor.city}` : ''}` : "Select vendor..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search vendor..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>No vendor found.</CommandEmpty>
                  <CommandGroup>
                    {filteredVendors.map((ap: any) => (
                      <CommandItem
                        key={ap.id}
                        value={`${ap.name} ${ap.city || ''} ${ap.number || ''}`}
                        onSelect={() => {
                          formField.onChange(ap.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formField.value === ap.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {ap.name}{ap.city ? ` - ${ap.city}` : ''}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Searchable Purchaser Select Component
interface SearchablePurchaserSelectProps {
  form: any;
  purchasers: any[];
  selectedAccountPayableId: string | null | undefined;
}

function SearchablePurchaserSelect({ form, purchasers, selectedAccountPayableId }: SearchablePurchaserSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const field = form.watch('purchaser_id');
  
  const filteredPurchasers = purchasers.filter((p: any) =>
    p.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedPurchaser = purchasers.find((p: any) => p.id === field);

  return (
    <FormField
      control={form.control}
      name="purchaser_id"
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>Purchaser <span className="text-destructive">*</span></FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!selectedAccountPayableId || purchasers.length === 0}
                  className={cn(
                    "w-full justify-between",
                    !formField.value && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedPurchaser ? `${selectedPurchaser.name}${selectedPurchaser.city ? ` - ${selectedPurchaser.city}` : ''}` : 
                     !selectedAccountPayableId ? "Select vendor first" :
                     purchasers.length === 0 ? "No purchasers available" :
                     "Select purchaser..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search purchaser..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>No purchaser found.</CommandEmpty>
                  <CommandGroup>
                    {filteredPurchasers.map((p: any) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.city || ''}`}
                        onSelect={() => {
                          formField.onChange(p.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formField.value === p.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {p.name}{p.city ? ` - ${p.city}` : ''}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Searchable From Account Select Component
interface SearchableFromAccountSelectProps {
  form: any;
  accounts: any[];
}

function SearchableFromAccountSelect({ form, accounts }: SearchableFromAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const field = form.watch('source_account_id');
  
  const filteredAccounts = accounts.filter((acc: any) =>
    acc.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    acc.account_number?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedAccount = accounts.find((acc: any) => acc.id === field);

  return (
    <FormField
      control={form.control}
      name="source_account_id"
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>From Account <span className="text-destructive">*</span></FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !formField.value && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedAccount ? `${selectedAccount.name} (${selectedAccount.account_number}) - ${selectedAccount.balance} PKR` : "Select source account..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search account..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>No account found.</CommandEmpty>
                  <CommandGroup>
                    {filteredAccounts.map((acc: any) => (
                      <CommandItem
                        key={acc.id}
                        value={`${acc.name} ${acc.account_number || ''}`}
                        onSelect={() => {
                          formField.onChange(acc.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formField.value === acc.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {acc.name} ({acc.account_number}) - {acc.balance} PKR
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Searchable Payment Mode Select Component
interface SearchablePaymentModeSelectProps {
  form: any;
}

function SearchablePaymentModeSelect({ form }: SearchablePaymentModeSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const field = form.watch('mode_of_payment');
  
  const filteredModes = MODE_OF_PAYMENT_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
    option.value.toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedMode = MODE_OF_PAYMENT_OPTIONS.find((option) => option.value === field);

  return (
    <FormField
      control={form.control}
      name="mode_of_payment"
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>Payment Mode</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !formField.value && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedMode ? selectedMode.label : "Select payment mode..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search payment mode..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>No payment mode found.</CommandEmpty>
                  <CommandGroup>
                    {filteredModes.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => {
                          formField.onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formField.value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Product Row Component for table layout
interface ProductRowProps {
  item: PurchaseItem;
  availableProducts: any[];
  selectedProduct: any;
  updatePurchaseItem: (id: string, field: keyof PurchaseItem, value: string) => void;
  updateProductName: (id: string, productId: string) => void;
  removePurchaseItem: (id: string) => void;
}

function ProductRow({ 
  item, 
  availableProducts, 
  selectedProduct, 
  updatePurchaseItem, 
  updateProductName, 
  removePurchaseItem 
}: ProductRowProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const filteredProducts = availableProducts.filter((p: any) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <tr className="border-b">
      <td className="px-2 py-2 w-[180px] min-w-[180px] max-w-[180px]">
        <Popover open={productOpen} onOpenChange={setProductOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between h-8 text-xs min-w-0",
                !item.product_id && "text-muted-foreground"
              )}
            >
              <span className="truncate text-xs min-w-0 flex-1 text-left">
                {selectedProduct 
                  ? (selectedProduct.brand ? `${selectedProduct.brand} - ${selectedProduct.name}` : selectedProduct.name)
                  : "Select product..."}
              </span>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search product..."
                value={productSearch}
                onValueChange={setProductSearch}
              />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  {filteredProducts.map((product: any) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.brand || ''}`}
                      onSelect={() => {
                        updatePurchaseItem(item.id, 'product_id', product.id);
                        updateProductName(item.id, product.id);
                        setProductOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          item.product_id === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {product.brand ? `${product.brand} - ${product.name}` : product.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-2 py-2 w-[80px] min-w-[80px] max-w-[80px]">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={item.quantity}
          onChange={(e) => {
            let value = e.target.value;
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
              value = `${parts[0]}.${parts.slice(1).join('')}`;
            }
            if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
              value = value.replace(/^0+/, '');
            }
            updatePurchaseItem(item.id, 'quantity', value);
          }}
          className="h-8 text-xs text-center w-full"
        />
      </td>
      <td className="px-2 py-2 w-[60px] min-w-[60px] max-w-[60px]">
        <Input
          placeholder="kg"
          value={item.unit}
          readOnly
          className="h-8 text-xs text-center bg-muted w-full"
        />
      </td>
      <td className="px-2 py-2 w-[80px] min-w-[80px] max-w-[80px]">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={item.per_unit_rate}
          onChange={(e) => {
            let value = e.target.value;
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
              value = `${parts[0]}.${parts.slice(1).join('')}`;
            }
            if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
              value = value.replace(/^0+/, '');
            }
            updatePurchaseItem(item.id, 'per_unit_rate', value);
          }}
          className="h-8 text-xs text-center w-full"
        />
      </td>
      <td className="px-2 py-2 w-[70px] min-w-[70px] max-w-[70px]">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={item.discount_percentage || "0"}
          onChange={(e) => {
            let value = e.target.value;
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
              value = `${parts[0]}.${parts.slice(1).join('')}`;
            }
            if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
              value = value.replace(/^0+/, '');
            }
            const numValue = parseFloat(value) || 0;
            if (numValue > 100) value = "100";
            updatePurchaseItem(item.id, 'discount_percentage', value);
          }}
          className="h-8 text-xs text-center w-full"
        />
      </td>
      <td className="px-2 py-2 w-[90px] min-w-[90px] max-w-[90px]">
        <Input
          placeholder="0.00"
          value={item.discount_per_unit || "0.00"}
          readOnly
          className="h-8 text-xs text-center bg-muted w-full"
        />
      </td>
      <td className="px-2 py-2 w-[100px] min-w-[100px] max-w-[100px]">
        <Input
          placeholder="0.00"
          value={item.discount || "0.00"}
          readOnly
          className="h-8 text-xs text-center bg-muted w-full"
        />
      </td>
      <td className="px-2 py-2 w-[90px] min-w-[90px] max-w-[90px]">
        <Input
          placeholder="0.00"
          value={item.total_amount}
          readOnly
          className="h-8 text-xs text-center bg-muted font-medium w-full"
        />
      </td>
      <td className="px-2 py-2 w-[40px] min-w-[40px] max-w-[40px]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removePurchaseItem(item.id)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}

export function PurchaseModal({ isOpen, onClose, onSuccess }: PurchaseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get current user for user_id field

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];

  // Fetch related data for dropdowns
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const { data: accountPayablesResponse } = useQuery({
    queryKey: ['/api/account-payables'],
    queryFn: () => apiRequest('GET', '/api/account-payables'),
  });
  const accountPayables = accountPayablesResponse?.data || [];

  const { data: accountReceivablesResponse } = useQuery({
    queryKey: ['/api/account-receivables'],
    queryFn: () => apiRequest('GET', '/api/account-receivables'),
  });
  const accountReceivables = accountReceivablesResponse?.data || [];

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "purchase",
      total_amount: "0.00",
      description: "",
      mode_of_payment: "bank_transfer",
      paid_amount: "",
      remaining_payment: "0.00",
      date: new Date().toISOString().split('T')[0],
      purchase_invoice_number: "",
    },
  });

  const selectedAccountPayableId = form.watch('account_payable_id');

  const { data: vendorProductsResponse } = useQuery({
    queryKey: ['/api/account-payables', selectedAccountPayableId, 'products'],
    queryFn: () => apiRequest('GET', `/api/account-payables/${selectedAccountPayableId}/products`),
    enabled: !!selectedAccountPayableId,
  });
  const products = vendorProductsResponse?.data || [];

  const { data: vendorPurchasersResponse } = useQuery({
    queryKey: ['/api/account-payables', selectedAccountPayableId, 'purchasers'],
    queryFn: () => apiRequest('GET', `/api/account-payables/${selectedAccountPayableId}/purchasers`),
    enabled: !!selectedAccountPayableId,
  });
  const purchasers = vendorPurchasersResponse?.data || [];

  // Purchase items state
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [remainingPayment, setRemainingPayment] = useState<number>(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<InsertTransaction | null>(null);
  const [pendingProductsPayload, setPendingProductsPayload] = useState<any[]>([]);
  const [pendingDisplayItems, setPendingDisplayItems] = useState<PurchaseItem[]>([]);

  // Reset dependent state when account payable changes
  useEffect(() => {
    setPurchaseItems([]);
    setCalculatedTotal(0);
    setRemainingPayment(0);
      form.setValue('purchaser_id', '' as any);
  }, [selectedAccountPayableId]);

  const createPurchaseWithProductsMutation = useMutation({
    mutationFn: (data: { transaction: InsertTransaction; products: any[] }) => 
      apiRequest('POST', '/api/transactions/purchase-with-products', data),
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-product-junctions'] });
      
      // Invalidate product-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-history'] });
      
      // Invalidate specific product queries for each product in the transaction
      if (data?.data?.productJunctions) {
        data.data.productJunctions.forEach((junction: any) => {
          if (junction.product_id) {
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/inventory-history/product/${junction.product_id}`] });
          }
        });
      }
      
      // Invalidate specific account queries if transaction affects accounts
      if (data?.data?.transaction?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}/transactions`] });
      }
      if (data?.data?.transaction?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}/transactions`] });
      }
      
      // Invalidate account payable queries if transaction has account payable
      if (data?.data?.transaction?.account_payable_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/account-payables/${data.data.transaction.account_payable_id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions/account-payable', data.data.transaction.account_payable_id] });
      }
      
      // Invalidate account payables list and stats (for balance updates on account payables page)
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables/stats'] });
      
      // /api/payables routes removed - use /api/transactions instead
      
      toast({
        title: "Success",
        description: "Purchase transaction with products created successfully",
      });
      
      // Reset form
      form.reset({
        type: "purchase",
        total_amount: "0.00",
        description: "",
        mode_of_payment: "cash",
        paid_amount: "0.00",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
        purchase_invoice_number: "",
        source_account_id: "",
        account_payable_id: "",
        purchaser_id: "",
      });
      setPurchaseItems([]);
      setCalculatedTotal(0);
      setRemainingPayment(0);
      
      // Close confirmation modal and main modal
      setIsConfirmOpen(false);
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTransaction) => {
    // Validate that at least one product is added
    if (purchaseItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product to the purchase",
        variant: "destructive",
      });
      return;
    }

    // Validate all purchase items have required fields
    const invalidItems = purchaseItems.filter(item => 
      !item.product_id || !item.quantity || !item.per_unit_rate || parseFloat(item.quantity) <= 0 || parseFloat(item.per_unit_rate) <= 0
    );
    
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please ensure all products have valid quantity and rate",
        variant: "destructive",
      });
      return;
    }

    // Validate that if advance payment > 0, source_account_id is required
    const advancePayment = parseFloat(data.paid_amount || '0');
    if (advancePayment > 0 && !data.source_account_id) {
      toast({
        title: "Validation Error",
        description: "From Account is required when advance payment is greater than 0",
        variant: "destructive",
      });
      form.setError('source_account_id', {
        type: 'manual',
        message: 'From Account is required when advance payment is greater than 0'
      });
      return;
    }

    // Frontend balance check: prevent advance payment greater than selected source account balance
    if (advancePayment > 0 && data.source_account_id) {
      const sourceAccount = accounts.find((acc: any) => acc.id === data.source_account_id);
      const sourceBalance = sourceAccount ? parseFloat(String(sourceAccount.balance ?? 0)) : 0;

      if (advancePayment > sourceBalance) {
        toast({
          title: "Validation Error",
          description: "Transaction can't happen as selected account balance is low",
          variant: "destructive",
        });

        form.setError('paid_amount', {
          type: 'manual',
          message: "Transaction can't happen as selected account balance is low",
        });

        return;
      }
    }

    // Validate purchaser is selected
    if (!data.purchaser_id) {
      toast({
        title: "Validation Error",
        description: "Purchaser is required for a purchase transaction",
        variant: "destructive",
      });
      form.setError('purchaser_id', {
        type: 'manual',
        message: 'Purchaser is required',
      });
      return;
    }

    // Convert date to proper format for database
    // Ensure paid_amount defaults to "0.00" if empty or not provided
    const paidAmount = data.paid_amount?.trim() || "0.00";
    
    const processedData: InsertTransaction = {
      ...data,
      type: "purchase" as const, // Backend will override type based on paid_amount, but keep for validation
      date: data.date ? new Date(data.date).toISOString() : undefined,
      paid_amount: paidAmount, // Default to "0.00" if empty
    };
    
    // Convert empty strings to null for foreign key fields
    const foreignKeyFields = [
      'account_payable_id', 'account_receivable_id', 'purchaser_id', 
      'source_account_id', 'destination_account_id'
    ];
    
    foreignKeyFields.forEach(field => {
      if ((processedData as any)[field] === '') {
        (processedData as any)[field] = null;
      }
    });

    // Convert empty purchase_invoice_number to undefined so backend generates it
    if ((processedData as any).purchase_invoice_number === '') {
      (processedData as any).purchase_invoice_number = undefined;
    }

    // Use the calculated total
    processedData.total_amount = calculatedTotal.toFixed(2);
    processedData.remaining_payment = remainingPayment.toFixed(2);
    // remaining_payment is already set above
    // Add user_id (NEW)
    if (user?.id) {
      (processedData as any).user_id = user.id;
    }

    const productsPayload = purchaseItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      per_unit_rate: item.per_unit_rate,
      total_amount: item.total_amount,
      discount: item.discount || "0.00", // NEW: Total discount amount
      discount_per_unit: item.discount_per_unit || "0.00", // NEW: Discount per unit
    }));

    // Open confirmation modal with snapshot of data instead of submitting immediately
    setPendingTransaction(processedData);
    setPendingProductsPayload(productsPayload);
    setPendingDisplayItems(purchaseItems);
    setIsConfirmOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!pendingTransaction || pendingProductsPayload.length === 0) return;

    createPurchaseWithProductsMutation.mutate({
      transaction: pendingTransaction,
      products: pendingProductsPayload,
    });
  };

  const isPending = createPurchaseWithProductsMutation.isPending;

  // Purchase items functions
  const addPurchaseItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      product_id: "",
      product_name: "",
      quantity: "",
      unit: "",
      per_unit_rate: "",
      discount_percentage: "0", // NEW: Default discount percentage
      discount_per_unit: "0.00", // NEW: Auto-calculated
      discount: "0.00", // NEW: Total discount
      total_amount: "0.00"
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  const removePurchaseItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  const updatePurchaseItem = (id: string, field: keyof PurchaseItem, value: string) => {
    setPurchaseItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Calculate discount and total amount when relevant fields change
          if (field === 'quantity' || field === 'per_unit_rate' || field === 'discount_percentage') {
            const quantity = parseFloat(updatedItem.quantity) || 0;
            const rate = parseFloat(updatedItem.per_unit_rate) || 0;
            const discountPercent = parseFloat(updatedItem.discount_percentage) || 0;
            
            // Calculate discount_per_unit = (per_unit_rate * discount_percentage) / 100
            const discountPerUnit = (rate * discountPercent) / 100;
            updatedItem.discount_per_unit = discountPerUnit.toFixed(2);
            
            // Calculate total discount = discount_per_unit * quantity
            const totalDiscount = discountPerUnit * quantity;
            updatedItem.discount = totalDiscount.toFixed(2);
            
            // Calculate total_amount = (quantity * per_unit_rate) - discount
            const subtotal = quantity * rate;
            updatedItem.total_amount = (subtotal - totalDiscount).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const updateProductName = (id: string, productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      const displayName = product.brand ? `${product.brand} - ${product.name}` : product.name;
      updatePurchaseItem(id, 'product_name', displayName);
      // Auto-fill unit from product when available
      if (product.unit) {
        updatePurchaseItem(id, 'unit', product.unit);
      }
    }
  };

  // Get available products for a specific row (exclude already selected products in other rows)
  const getAvailableProducts = (currentItemId: string) => {
    const selectedProductIds = purchaseItems
      .filter(item => item.id !== currentItemId && item.product_id)
      .map(item => item.product_id);
    return products.filter((product: any) => !selectedProductIds.includes(product.id));
  };

  // Calculate total amount from purchase items
  useEffect(() => {
    const total = purchaseItems.reduce((sum, item) => {
      return sum + (parseFloat(item.total_amount) || 0);
    }, 0);
    setCalculatedTotal(total);
    
    // Update form with calculated total
    form.setValue('total_amount', total.toFixed(2));
    
    // Calculate remaining payment
    // Allow negative values for overpayments (handled by backend)
    const enteredAmount = parseFloat(form.getValues('paid_amount') || '0');
    const remaining = total - enteredAmount;
    setRemainingPayment(remaining);
    form.setValue('remaining_payment', remaining.toFixed(2));
  }, [purchaseItems, form]);

  // Update remaining payment when paid amount changes
  // Allow negative values for overpayments (handled by backend)
  useEffect(() => {
    const enteredAmount = parseFloat(form.getValues('paid_amount') || '0');
    const remaining = calculatedTotal - enteredAmount;
    setRemainingPayment(remaining);
    form.setValue('remaining_payment', remaining.toFixed(2));
  }, [form.watch('paid_amount'), calculatedTotal, form]);

  // Get product IDs from purchase items
  const selectedProductIds = purchaseItems.map(item => item.product_id).filter(Boolean);

  // Fetch account payables based on selected products
  const { data: filteredAccountPayablesResponse } = useQuery({
    queryKey: ['/api/account-payable-products/account-payables-by-products', selectedProductIds],
    queryFn: () => {
      if (selectedProductIds.length === 0) {
        return { success: true, data: [] };
      }
      return apiRequest('POST', '/api/account-payable-products/account-payables-by-products', {
        productIds: selectedProductIds
      });
    },
    enabled: selectedProductIds.length > 0,
  });

  const filteredAccountPayables = filteredAccountPayablesResponse?.data || [];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        type: "purchase",
        total_amount: "0.00",
        description: "",
        mode_of_payment: "cash",
        paid_amount: "",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
        purchase_invoice_number: "",
        source_account_id: "",
        account_payable_id: "",
        purchaser_id: "",
      });
      setPurchaseItems([]);
      setCalculatedTotal(0);
      setRemainingPayment(0);
    }
  }, [isOpen, form]);

  // Derived lookups for confirmation modal
  const selectedVendor = useMemo(
    () => accountPayables.find((ap: any) => ap.id === pendingTransaction?.account_payable_id),
    [accountPayables, pendingTransaction?.account_payable_id],
  );

  const selectedPurchaser = useMemo(
    () => purchasers.find((p: any) => p.id === pendingTransaction?.purchaser_id),
    [purchasers, pendingTransaction?.purchaser_id],
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create Purchase</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <>
            {/* Transaction Date and Purchase Invoice Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={today}
                      {...field}
                      data-testid="input-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchase_invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Invoice Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PI_0000000 (optional)"
                      {...field}
                      data-testid="input-purchase-invoice-number"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to auto-generate from transaction ID
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Account Payable (Vendor) and Purchaser */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableVendorSelect
              form={form}
              accountPayables={accountPayables}
            />

            <SearchablePurchaserSelect
              form={form}
              purchasers={purchasers}
              selectedAccountPayableId={selectedAccountPayableId || undefined}
            />
          </div>

          {/* Purchase Section - only when Account Payable is selected */}
          {selectedAccountPayableId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Purchase Section</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPurchaseItem}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Product</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {purchaseItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground px-4">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No products added yet. Click "Add Product" to start adding items to your purchase.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-full inline-block">
                      <table className="w-full text-xs table-fixed">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium w-[180px]">Product</th>
                          <th className="px-2 py-2 text-center font-medium w-[80px]">Qt</th>
                          <th className="px-2 py-2 text-center font-medium w-[60px]">Unit</th>
                          <th className="px-2 py-2 text-center font-medium w-[80px]">Rate/Unit</th>
                          <th className="px-2 py-2 text-center font-medium w-[70px]">Discount</th>
                          <th className="px-2 py-2 text-center font-medium w-[90px]">Discount/Unit</th>
                          <th className="px-2 py-2 text-center font-medium w-[100px]">Total Discount</th>
                          <th className="px-2 py-2 text-center font-medium w-[90px]">Total Amount</th>
                          <th className="px-2 py-2 text-center font-medium w-[40px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseItems.map((item) => {
                          const availableProducts = getAvailableProducts(item.id);
                          const selectedProduct = products.find((p: any) => p.id === item.product_id);
                          
                          return (
                            <ProductRow
                              key={item.id}
                              item={item}
                              availableProducts={availableProducts}
                              selectedProduct={selectedProduct}
                              updatePurchaseItem={updatePurchaseItem}
                              updateProductName={updateProductName}
                              removePurchaseItem={removePurchaseItem}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

            {/* Total Amount & Remaining Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        data-testid="input-total-payment"
                        readOnly
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remaining_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remaining Payment</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-remaining-payment"
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow negative sign, numbers and decimal point
                          if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                            field.onChange(value);
                            // Update remaining payment state
                            const remaining = parseFloat(value) || 0;
                            setRemainingPayment(remaining);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Negative values indicate overpayment (credit)
                    </p>
                  </FormItem>
                )}
              />
            </div>

            {/* Paid Amount (Advance Payment) and From Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paid_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount (Advance Payment)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-paid-amount"
                        onChange={(e) => {
                          let value = e.target.value;
                          value = value.replace(/[^0-9.]/g, '');
                          const parts = value.split('.');
                          if (parts.length > 2) {
                            value = `${parts[0]}.${parts.slice(1).join('')}`;
                          }
                          if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
                            value = value.replace(/^0+/, '');
                          }
                          field.onChange(value);
                          const enteredAmount = parseFloat(value || '0') || 0;
                          const remaining = calculatedTotal - enteredAmount;
                          setRemainingPayment(remaining);
                          form.setValue('remaining_payment', remaining.toFixed(2));
                          
                          if (enteredAmount === 0) {
                            form.setValue('source_account_id', '');
                            form.clearErrors('source_account_id');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Enter the advance payment amount. The remaining amount will be calculated automatically.
                    </p>
                  </FormItem>
                )}
              />

              {/* From Account (Source Account) - Only show when advance payment > 0 */}
              {parseFloat(form.watch('paid_amount') || '0') > 0 && (
                <SearchableFromAccountSelect
                  form={form}
                  accounts={accounts}
                />
              )}
            </div>

            {/* Payment Mode and Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchablePaymentModeSelect
                form={form}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Transaction description..."
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    type: "purchase",
                    total_amount: "0.00",
                    description: "",
                    mode_of_payment: "cash",
                    paid_amount: "0.00",
                    remaining_payment: "0.00",
                    date: new Date().toISOString().split('T')[0],
                    source_account_id: "",
                    account_payable_id: "",
                    purchaser_id: "",
                  });
                  setPurchaseItems([]);
                  setCalculatedTotal(0);
                  setRemainingPayment(0);
                }}
                disabled={createPurchaseWithProductsMutation.isPending}
                className="w-full sm:w-auto"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={createPurchaseWithProductsMutation.isPending || purchaseItems.length === 0}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                data-testid="button-submit-purchase"
              >
                {createPurchaseWithProductsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Purchase</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Confirmation Modal - Separate Dialog */}
    <Dialog open={isConfirmOpen} onOpenChange={(open) => {
      if (!open) {
        setIsConfirmOpen(false);
        setPendingTransaction(null);
        setPendingProductsPayload([]);
        setPendingDisplayItems([]);
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to create this purchase?
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Vendor:</span>{' '}
              {selectedVendor?.name || '-'}
            </p>
            <p>
              <span className="font-medium">Purchaser:</span>{' '}
              {selectedPurchaser?.name || '-'}
            </p>
            <p>
              <span className="font-medium">Date:</span>{' '}
              {pendingTransaction?.date
                ? new Date(pendingTransaction.date).toLocaleDateString('en-PK')
                : '-'}
            </p>
          </div>

          {/* Products Table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-right">Rate/Unit</th>
                  <th className="px-3 py-2 text-right">Disc. %</th>
                  <th className="px-3 py-2 text-right">Disc./Unit</th>
                  <th className="px-3 py-2 text-right">Total Disc.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {pendingDisplayItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">{item.product_name}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2 text-right">{item.per_unit_rate}</td>
                    <td className="px-3 py-2 text-right">{item.discount_percentage || '0'}%</td>
                    <td className="px-3 py-2 text-right">{item.discount_per_unit || '0.00'}</td>
                    <td className="px-3 py-2 text-right">{item.discount || '0.00'}</td>
                    <td className="px-3 py-2 text-right">{item.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">
                {pendingTransaction?.total_amount || calculatedTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="font-semibold">
                {pendingTransaction?.paid_amount || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-semibold">
                {pendingTransaction?.remaining_payment ||
                  remainingPayment.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setPendingTransaction(null);
                setPendingProductsPayload([]);
                setPendingDisplayItems([]);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPurchase}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Purchase</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}

