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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface BatchWithDetails {
  id: string;
  batch_number: string;
  available_quantity: string;
  purchase_price_per_unit: string;
  purchase_date: string;
}

interface BatchAllocation {
  batch_id: string;
  batch_number: string;
  quantity: string;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  sale_price_per_unit: string;  // Sale price per unit (applies to all batches)
  total_quantity: string;       // Sum of all batch quantities
  discount_percentage: string; // NEW: Discount percentage
  discount_per_unit: string;   // NEW: Auto-calculated discount per unit
  discount: string;            // NEW: Total discount amount
  total_amount: string;
  unit: string;
  selectedBatches: BatchAllocation[];  // User-selected batches
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Searchable Company Select Component
interface SearchableCompanySelectProps {
  companies: any[];
  selectedCompanyId: string;
  onValueChange: (value: string) => void;
}

function SearchableCompanySelect({ companies, selectedCompanyId, onValueChange }: SearchableCompanySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const filteredCompanies = companies.filter((company: any) =>
    company.company_name?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedCompany = companies.find((c: any) => c.id === selectedCompanyId);

  return (
    <div>
      <label className="text-sm font-medium">Company <span className="text-destructive">*</span></label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !selectedCompanyId && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedCompany ? selectedCompany.company_name : "Select company..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search company..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No company found.</CommandEmpty>
              <CommandGroup>
                {filteredCompanies.map((company: any) => (
                  <CommandItem
                    key={company.id}
                    value={company.company_name}
                    onSelect={() => {
                      onValueChange(company.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCompanyId === company.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {company.company_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!selectedCompanyId && (
        <p className="text-xs text-muted-foreground mt-1">
          Please select a company to view products
        </p>
      )}
    </div>
  );
}

// Searchable Account Receivable Select Component
interface SearchableAccountReceivableSelectProps {
  form: any;
  accountReceivables: any[];
}

function SearchableAccountReceivableSelect({ form, accountReceivables }: SearchableAccountReceivableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const field = form.watch('account_receivable_id');
  
  const filteredAccountReceivables = accountReceivables.filter((ar: any) => {
    const searchLower = searchValue.toLowerCase();
    return (
      ar.name?.toLowerCase().includes(searchLower) ||
      ar.city?.toLowerCase().includes(searchLower) ||
      ar.number?.toLowerCase().includes(searchLower) ||
      ar.ar_id?.toLowerCase().includes(searchLower)
    );
  });
  const selectedAccountReceivable = accountReceivables.find((ar: any) => ar.id === field);

  return (
    <FormField
      control={form.control}
      name="account_receivable_id"
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>Account Receivable <span className="text-destructive">*</span></FormLabel>
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
                    {selectedAccountReceivable 
                      ? `${selectedAccountReceivable.name}${selectedAccountReceivable.city ? ` - ${selectedAccountReceivable.city}` : ''}`
                      : "Select account receivable..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search account receivable..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>No account receivable found.</CommandEmpty>
                  <CommandGroup>
                    {filteredAccountReceivables.map((ar: any) => (
                      <CommandItem
                        key={ar.id}
                        value={`${ar.name} ${ar.city || ''} ${ar.number || ''} ${ar.ar_id || ''} ${ar.address || ''}`}
                        onSelect={() => {
                          formField.onChange(ar.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formField.value === ar.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {ar.name}{ar.city ? ` - ${ar.city}` : ''}
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

// Searchable To Account Select Component
interface SearchableToAccountSelectProps {
  form: any;
  accounts: any[];
}

function SearchableToAccountSelect({ form, accounts }: SearchableToAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const field = form.watch('destination_account_id');
  
  const filteredAccounts = accounts.filter((account: any) =>
    account.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    account.account_number?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const selectedAccount = accounts.find((a: any) => a.id === field);

  return (
    <FormField
      control={form.control}
      name="destination_account_id"
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>To Account <span className="text-destructive">*</span></FormLabel>
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
                    {selectedAccount 
                      ? `${selectedAccount.name} (${selectedAccount.account_number}) - ${selectedAccount.balance} PKR`
                      : "Select destination account..."}
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
                    {filteredAccounts.map((account: any) => (
                      <CommandItem
                        key={account.id}
                        value={`${account.name} ${account.account_number} ${account.balance}`}
                        onSelect={() => {
                          formField.onChange(account.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formField.value === account.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {account.name} ({account.account_number}) - {account.balance} PKR
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
interface SaleProductRowProps {
  item: SaleItem;
  availableProducts: any[];
  selectedProduct: any;
  batches: BatchWithDetails[];
  updateSaleItem: (id: string, field: keyof SaleItem, value: string) => void;
  updateProductName: (id: string, productId: string) => void;
  removeSaleItem: (id: string) => void;
  handleBatchToggle: (itemId: string, batch: BatchWithDetails) => void;
  handleBatchQuantityUpdate: (itemId: string, batchId: string, quantity: string) => void;
}

function SaleProductRow({ 
  item, 
  availableProducts, 
  selectedProduct, 
  batches,
  updateSaleItem, 
  updateProductName, 
  removeSaleItem,
  handleBatchToggle,
  handleBatchQuantityUpdate,
  toast
}: SaleProductRowProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const filteredProducts = availableProducts.filter((p: any) => {
    const searchLower = productSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(searchLower) ||
      p.brand?.toLowerCase().includes(searchLower) ||
      p.quantity?.toString().includes(searchLower)
    );
  });

  return (
    <>
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
                        value={`${product.name} ${product.brand || ''} ${product.quantity || ''}`}
                        onSelect={async () => {
                          await updateProductName(item.id, product.id);
                          setProductOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            item.product_id === product.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1">
                          {product.brand ? `${product.brand} - ${product.name}` : product.name}
                          {product.quantity !== null && product.quantity !== undefined && (
                            <span className="text-muted-foreground ml-2">
                              (Available: {parseFloat(product.quantity).toFixed(2)})
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </td>
        <td className="px-2 py-2 w-[100px] min-w-[100px] max-w-[100px]">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={item.sale_price_per_unit}
            onFocus={(e) => {
              if (e.target.value === "0.00") {
                e.target.value = "";
              }
            }}
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
              updateSaleItem(item.id, 'sale_price_per_unit', value);
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
            onFocus={(e) => {
              if (e.target.value === "0") {
                e.target.value = "";
              }
            }}
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
              updateSaleItem(item.id, 'discount_percentage', value);
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
            onClick={() => removeSaleItem(item.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </td>
      </tr>
      {/* Batch Selection Table - shown below the product row */}
      {item.product_id && batches.length > 0 && (
        <tr>
          <td colSpan={7} className="px-0 py-0">
            <div className="border rounded-lg m-2">
              <div className="p-3 bg-muted/50 border-b">
                <h4 className="text-sm font-medium">Select Batches</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Select batches and enter sale quantity for each
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Available Qty</TableHead>
                    <TableHead>Purchase Price/Unit</TableHead>
                    <TableHead>Sale Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const isSelected = item.selectedBatches.some(b => b.batch_id === batch.id);
                    const batchAllocation = item.selectedBatches.find(b => b.batch_id === batch.id);
                    
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleBatchToggle(item.id, batch)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{batch.batch_number}</TableCell>
                        <TableCell>{parseFloat(batch.available_quantity).toFixed(2)}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-PK', {
                            style: 'currency',
                            currency: 'PKR',
                          }).format(parseFloat(batch.purchase_price_per_unit))}
                        </TableCell>
                        <TableCell>
                          {isSelected ? (
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={batchAllocation?.quantity || "0"}
                              onFocus={(e) => {
                                if (e.target.value === "0" || e.target.value === "0.00") {
                                  e.target.value = "";
                                }
                              }}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  const qty = value;
                                  if (qty === '' || parseFloat(qty) <= parseFloat(batch.available_quantity)) {
                                    handleBatchQuantityUpdate(item.id, batch.id, qty);
                                  } else {
                                    toast({
                                      title: "Validation Error",
                                      description: `Quantity cannot exceed available quantity (${batch.available_quantity})`,
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              className="w-24"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {item.selectedBatches.length > 0 && (
                <div className="p-3 bg-muted/30 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Total Quantity:</span>
                    <span className="font-semibold">{item.total_quantity}</span>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SaleModal({ isOpen, onClose, onSuccess }: SaleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get current user for user_id field
  const today = new Date().toISOString().split('T')[0];

  // Fetch related data for dropdowns
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const { data: accountReceivablesResponse } = useQuery({
    queryKey: ['/api/account-receivables'],
    queryFn: () => apiRequest('GET', '/api/account-receivables'),
  });
  const accountReceivables = accountReceivablesResponse?.data || [];

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "sale",
      paid_amount: "0.00",
      description: "",
      mode_of_payment: "bank_transfer",
      total_payment: "0.00",
      remaining_payment: "0.00",
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Sale items state
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [remainingPayment, setRemainingPayment] = useState<number>(0);
  
  // State to track batches for each product
  const [productBatches, setProductBatches] = useState<Record<string, BatchWithDetails[]>>({});
  
  // Company selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  
  // Confirmation modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [pendingProductsPayload, setPendingProductsPayload] = useState<any[]>([]);
  const [pendingDisplayItems, setPendingDisplayItems] = useState<SaleItem[]>([]);

  const { data: productsResponse } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('GET', '/api/products'),
  });
  const allProducts = productsResponse?.data || [];

  const { data: companiesResponse } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: () => apiRequest('GET', '/api/companies'),
    enabled: isOpen,
  });
  const companies = companiesResponse?.data || [];
  
  // Filter products based on selected company
  const products = selectedCompanyId 
    ? allProducts.filter((p: any) => p.company_id === selectedCompanyId)
    : [];


  const createSaleWithProductsMutation = useMutation({
    mutationFn: (data: { transaction: InsertTransaction; products: any[] }) => 
      apiRequest('POST', '/api/transactions/sale-with-products', data),
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-product-junctions'] });
      // /api/receivables routes removed - use /api/transactions instead
      
      // Invalidate product-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      // /api/inventory-history routes removed - use transaction_product_junction instead
      
      // Invalidate specific product queries for each product in the transaction
      if (data?.data?.productJunctions) {
        data.data.productJunctions.forEach((junction: any) => {
          if (junction.product_id) {
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}/inventory-history`] });
          }
        });
      }
      
      // Invalidate specific account queries if transaction affects accounts
      // For sale: destination_account_id (where money is received)
      if (data?.data?.transaction?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}/transactions`] });
      }
      
      // Also invalidate source_account_id if present (for any transaction type that uses it)
      if (data?.data?.transaction?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}/transactions`] });
      }
      
      // Invalidate account receivable queries if transaction has account receivable
      if (data?.data?.transaction?.account_receivable_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/account-receivables/${data.data.transaction.account_receivable_id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions/account-receivable', data.data.transaction.account_receivable_id] });
      }
      
      toast({
        title: "Success",
        description: "Sale transaction with products created successfully",
      });
      
      // Reset form
      form.reset({
        type: "sale",
        amount: "0.00",
        description: "",
        mode_of_payment: "bank_transfer",
        total_payment: "0.00",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
        destination_account_id: "",
        account_receivable_id: "",
      });
      setSaleItems([]);
      setCalculatedTotal(0);
      setRemainingPayment(0);
      
      // Close confirmation modal and main modal
      setIsConfirmOpen(false);
      setPendingTransaction(null);
      setPendingProductsPayload([]);
      setPendingDisplayItems([]);
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sale transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTransaction) => {
    // Validate that at least one product is added
    if (saleItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product to the sale",
        variant: "destructive",
      });
      return;
    }

    // Validate all sale items have required fields
    const invalidItems = saleItems.filter(item => 
      !item.product_id || !item.sale_price_per_unit || parseFloat(item.sale_price_per_unit) <= 0 || !item.selectedBatches || item.selectedBatches.length === 0
    );
    
    if (invalidItems.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please ensure all products have valid sale price and at least one batch selected",
        variant: "destructive",
      });
      return;
    }

    // Get advance payment from paid_amount field
    const advancePayment = parseFloat((data as any).paid_amount || '0');
    
    // Validate that if advance payment > 0, destination_account_id is required
    if (advancePayment > 0 && !data.destination_account_id) {
      toast({
        title: "Validation Error",
        description: "To Account is required when advance payment is greater than 0",
        variant: "destructive",
      });
      form.setError('destination_account_id', {
        type: 'manual',
        message: 'To Account is required when advance payment is greater than 0'
      });
      return;
    }

    // Convert date to proper format for database
    // Determine transaction type based on payment: if no payment, it's advance_sale_inventory
    const transactionType = advancePayment > 0 ? "sale" : "advance_sale_inventory";
    
    const processedData: any = {
      ...data,
      type: transactionType as "sale" | "advance_sale_inventory",
      date: data.date ? new Date(data.date).toISOString() : undefined,
    };
    
    // Convert empty strings to null for foreign key fields
    const foreignKeyFields = [
      'account_payable_id', 'account_receivable_id', 'purchaser_id', 
      'source_account_id', 'destination_account_id'
    ];
    
    foreignKeyFields.forEach(field => {
      if (processedData[field] === '') {
        processedData[field] = null;
      }
    });

    // Use the calculated total
    processedData.total_amount = calculatedTotal.toFixed(2);
    
    // Set paid_amount explicitly (always set, even if 0)
    processedData.paid_amount = advancePayment.toFixed(2);
    
    // Calculate remaining payment correctly
    // Allow negative values for overpayments (handled by backend)
    const calculatedRemaining = calculatedTotal - advancePayment;
    processedData.remaining_payment = calculatedRemaining.toFixed(2);
    
    // Add user_id (NEW)
    if (user?.id) {
      (processedData as any).user_id = user.id;
    }

    // Validate company selection
    if (!selectedCompanyId) {
      toast({
        title: "Validation Error",
        description: "Please select a company first",
        variant: "destructive",
      });
      return;
    }

    // Validate batch quantities
    for (const item of saleItems) {
      for (const batch of item.selectedBatches) {
        const batchQty = parseFloat(batch.quantity);
        if (batchQty <= 0) {
          toast({
            title: "Validation Error",
            description: `Sale quantity must be greater than 0 for batch ${batch.batch_number}`,
            variant: "destructive",
          });
          return;
        }
        
        // Find the batch to check available quantity
        const batchDetails = productBatches[item.product_id]?.find(b => b.id === batch.batch_id);
        if (batchDetails) {
          const availableQty = parseFloat(batchDetails.available_quantity);
          if (batchQty > availableQty) {
            toast({
              title: "Validation Error",
              description: `Sale quantity (${batchQty}) exceeds available quantity (${availableQty}) for batch ${batch.batch_number}`,
              variant: "destructive",
            });
            return;
          }
        }
      }
      
      // Validate total quantity matches sum of batch quantities
      const sumOfBatchQuantities = item.selectedBatches.reduce((sum, batch) => {
        return sum + parseFloat(batch.quantity);
      }, 0);
      const totalQty = parseFloat(item.total_quantity);
      
      if (Math.abs(sumOfBatchQuantities - totalQty) > 0.01) {
        toast({
          title: "Validation Error",
          description: `Total quantity (${totalQty}) does not match sum of batch quantities (${sumOfBatchQuantities}) for product ${item.product_name}`,
          variant: "destructive",
        });
        return;
      }
    }

    const products = saleItems.map(item => ({
      product_id: item.product_id,
      sale_price_per_unit: item.sale_price_per_unit,
      total_quantity: item.total_quantity,
      total_amount: item.total_amount,
      unit: item.unit,
      discount: item.discount || "0.00", // NEW: Total discount amount
      discount_per_unit: item.discount_per_unit || "0.00", // NEW: Discount per unit
      batchAllocations: item.selectedBatches.map(batch => ({
        batch_id: batch.batch_id,
        quantity: batch.quantity,
      })),
    }));
    
    // Open confirmation modal with snapshot of data instead of submitting immediately
    setPendingTransaction(processedData);
    setPendingProductsPayload(products);
    setPendingDisplayItems([...saleItems]);
    setIsConfirmOpen(true);
  };

  const handleConfirmSale = () => {
    if (!pendingTransaction || pendingProductsPayload.length === 0) return;

    createSaleWithProductsMutation.mutate({
      transaction: pendingTransaction,
      products: pendingProductsPayload,
    });
  };

  const isPending = createSaleWithProductsMutation.isPending;

  // Fetch batches for a product
  const fetchBatchesForProduct = async (productId: string, forceRefetch: boolean = false) => {
    if (!productId) {
      return; // No product selected
    }
    
    // Only skip if already fetched and not forcing refetch
    if (!forceRefetch && productBatches[productId]) {
      return; // Already fetched
    }
    
    try {
      const response = await apiRequest('GET', `/api/batch-inventory/product/${productId}/available`);
      setProductBatches(prev => ({
        ...prev,
        [productId]: response.data || []
      }));
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch batches for product",
        variant: "destructive",
      });
    }
  };

  // Sale items functions
  const addSaleItem = () => {
    const newItem: SaleItem = {
      id: Date.now().toString(),
      product_id: "",
      product_name: "",
      sale_price_per_unit: "0.00",
      total_quantity: "0",
      discount_percentage: "0", // NEW: Default discount percentage
      discount_per_unit: "0.00", // NEW: Auto-calculated
      discount: "0.00", // NEW: Total discount
      total_amount: "0.00",
      unit: "",
      selectedBatches: []
    };
    setSaleItems([...saleItems, newItem]);
  };

  const removeSaleItem = (id: string) => {
    setSaleItems(saleItems.filter(item => item.id !== id));
  };

  const updateSaleItem = (id: string, field: keyof SaleItem, value: string) => {
    setSaleItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Calculate discount and total amount when relevant fields change
          if (field === 'sale_price_per_unit' || field === 'total_quantity' || field === 'discount_percentage') {
            const quantity = parseFloat(field === 'total_quantity' ? value : updatedItem.total_quantity) || 0;
            const rate = parseFloat(field === 'sale_price_per_unit' ? value : updatedItem.sale_price_per_unit) || 0;
            const discountPercent = parseFloat(field === 'discount_percentage' ? value : updatedItem.discount_percentage) || 0;
            
            // Calculate discount_per_unit = (sale_price_per_unit * discount_percentage) / 100
            const discountPerUnit = (rate * discountPercent) / 100;
            updatedItem.discount_per_unit = discountPerUnit.toFixed(2);
            
            // Calculate total discount = discount_per_unit * quantity
            const totalDiscount = discountPerUnit * quantity;
            updatedItem.discount = totalDiscount.toFixed(2);
            
            // Calculate total_amount = (quantity * sale_price_per_unit) - discount
            const subtotal = quantity * rate;
            updatedItem.total_amount = (subtotal - totalDiscount).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const updateProductName = async (id: string, productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      // Clear selected batches when product changes
      setSaleItems(items => 
        items.map(item => {
          if (item.id === id) {
            return {
              ...item,
              product_name: product.name,
              unit: product.unit || '',
              product_id: productId,
              selectedBatches: [], // Clear selected batches when product changes
              total_quantity: "0",
              total_amount: "0.00"
            };
          }
          return item;
        })
      );
      
      // Fetch batches for this product (force refetch to ensure fresh data)
      await fetchBatchesForProduct(productId, true);
    }
  };

  // Handle company selection change
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    // Clear all sale items when company changes
    setSaleItems([]);
    setProductBatches({});
    setCalculatedTotal(0);
    setRemainingPayment(0);
  };

  // Handle batch selection toggle
  const handleBatchToggle = (itemId: string, batch: BatchWithDetails) => {
    setSaleItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const existingIndex = item.selectedBatches.findIndex(b => b.batch_id === batch.id);
          let newSelectedBatches: BatchAllocation[];
          
          if (existingIndex >= 0) {
            // Deselect batch
            newSelectedBatches = item.selectedBatches.filter(b => b.batch_id !== batch.id);
          } else {
            // Select batch
            newSelectedBatches = [
              ...item.selectedBatches,
              {
                batch_id: batch.id,
                batch_number: batch.batch_number,
                quantity: "0"
              }
            ];
          }
          
          // Recalculate total quantity
          const totalQty = newSelectedBatches.reduce((sum, b) => sum + parseFloat(b.quantity || "0"), 0);
          const salePrice = parseFloat(item.sale_price_per_unit || "0");
          const discountPercent = parseFloat(item.discount_percentage || "0");
          
          // Calculate discount
          const discountPerUnit = (salePrice * discountPercent) / 100;
          const totalDiscount = discountPerUnit * totalQty;
          const subtotal = totalQty * salePrice;
          const totalAmount = (subtotal - totalDiscount).toFixed(2);
          
          return {
            ...item,
            selectedBatches: newSelectedBatches,
            total_quantity: totalQty.toFixed(2),
            discount_per_unit: discountPerUnit.toFixed(2),
            discount: totalDiscount.toFixed(2),
            total_amount: totalAmount
          };
        }
        return item;
      })
    );
  };

  // Handle batch quantity update
  const handleBatchQuantityUpdate = (itemId: string, batchId: string, quantity: string) => {
    setSaleItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const updatedBatches = item.selectedBatches.map(batch => {
            if (batch.batch_id === batchId) {
              return { ...batch, quantity };
            }
            return batch;
          });
          
          // Recalculate total quantity and amount
          const totalQty = updatedBatches.reduce((sum, b) => sum + parseFloat(b.quantity || "0"), 0);
          const salePrice = parseFloat(item.sale_price_per_unit || "0");
          const discountPercent = parseFloat(item.discount_percentage || "0");
          
          // Calculate discount
          const discountPerUnit = (salePrice * discountPercent) / 100;
          const totalDiscount = discountPerUnit * totalQty;
          const subtotal = totalQty * salePrice;
          const totalAmount = (subtotal - totalDiscount).toFixed(2);
          
          return {
            ...item,
            selectedBatches: updatedBatches,
            total_quantity: totalQty.toFixed(2),
            discount_per_unit: discountPerUnit.toFixed(2),
            discount: totalDiscount.toFixed(2),
            total_amount: totalAmount
          };
        }
        return item;
      })
    );
  };

  // Calculate total amount from sale items
  useEffect(() => {
    const total = saleItems.reduce((sum, item) => {
      return sum + (parseFloat(item.total_amount) || 0);
    }, 0);
    setCalculatedTotal(total);
    
    // Update form with calculated total
    form.setValue('total_payment', total.toFixed(2));
    form.setValue('total_amount', total.toFixed(2));
    
    // Calculate remaining payment
    // Allow negative values for overpayments (handled by backend)
    const enteredAmount = parseFloat(form.getValues('paid_amount') || '0');
    const remaining = total - enteredAmount;
    setRemainingPayment(remaining);
    form.setValue('remaining_payment', remaining.toFixed(2));
  }, [saleItems, form]);

  // Update remaining payment when amount changes
  // Allow negative values for overpayments (handled by backend)
  useEffect(() => {
    const enteredAmount = parseFloat(form.getValues('paid_amount') || '0');
    const remaining = calculatedTotal - enteredAmount;
    setRemainingPayment(remaining);
    form.setValue('remaining_payment', remaining.toFixed(2));
  }, [form.watch('paid_amount'), calculatedTotal, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        type: "sale",
        amount: "0.00",
        description: "",
        mode_of_payment: "bank_transfer",
        total_payment: "0.00",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
        destination_account_id: "",
        account_receivable_id: "",
      });
      setSaleItems([]);
      setCalculatedTotal(0);
      setRemainingPayment(0);
      setSelectedCompanyId("");
      setProductBatches({});
      
      // Reset confirmation modal state
      setIsConfirmOpen(false);
      setPendingTransaction(null);
      setPendingProductsPayload([]);
      setPendingDisplayItems([]);
    }
  }, [isOpen, form]);

  // Get available products for a specific sale item (exclude already selected products)
  const getAvailableProducts = (itemId: string) => {
    const selectedProductIds = saleItems
      .filter(item => item.id !== itemId && item.product_id)
      .map(item => item.product_id);
    return products.filter((p: any) => !selectedProductIds.includes(p.id));
  };

  // Derived lookups for confirmation modal
  const selectedAccountReceivable = useMemo(
    () => accountReceivables.find((ar: any) => ar.id === pendingTransaction?.account_receivable_id),
    [accountReceivables, pendingTransaction?.account_receivable_id],
  );

  const selectedAccount = useMemo(
    () => accounts.find((acc: any) => acc.id === pendingTransaction?.destination_account_id),
    [accounts, pendingTransaction?.destination_account_id],
  );

  const selectedCompany = useMemo(
    () => companies.find((c: any) => c.id === selectedCompanyId),
    [companies, selectedCompanyId],
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sale</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <>
            {/* Transaction Date and Company Selection */}
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
              
              <SearchableCompanySelect
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onValueChange={handleCompanyChange}
              />
            </div>

            {/* Sale Items Section */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Sale Items</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSaleItem}
                      className="flex items-center space-x-2"
                      disabled={!selectedCompanyId}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Product</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedCompanyId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Please select a company first to view and add products.</p>
                    </div>
                  ) : saleItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No products added yet. Click "Add Product" to start adding items to your sale.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="min-w-full inline-block">
                        <table className="w-full text-xs table-fixed">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-2 py-2 text-left font-medium w-[180px]">Product</th>
                              <th className="px-2 py-2 text-center font-medium w-[100px]">Sale Price/Unit</th>
                              <th className="px-2 py-2 text-center font-medium w-[70px]">Discount %</th>
                              <th className="px-2 py-2 text-center font-medium w-[90px]">Discount/Unit</th>
                              <th className="px-2 py-2 text-center font-medium w-[100px]">Total Discount</th>
                              <th className="px-2 py-2 text-center font-medium w-[90px]">Total Amount</th>
                              <th className="px-2 py-2 text-center font-medium w-[40px]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {saleItems.map((item) => {
                              const batches = productBatches[item.product_id] || [];
                              const availableProducts = getAvailableProducts(item.id);
                              const selectedProduct = products.find((p: any) => p.id === item.product_id);
                              
                              return (
                                <SaleProductRow
                                  key={item.id}
                                  item={item}
                                  availableProducts={availableProducts}
                                  selectedProduct={selectedProduct}
                                  batches={batches}
                                  updateSaleItem={updateSaleItem}
                                  updateProductName={updateProductName}
                                  removeSaleItem={removeSaleItem}
                                  handleBatchToggle={handleBatchToggle}
                                  handleBatchQuantityUpdate={handleBatchQuantityUpdate}
                                  toast={toast}
                                />
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sale Summary */}
                  {saleItems.length > 0 && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Items</p>
                          <p className="text-lg font-semibold">{saleItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Calculated Total</p>
                          <p className="text-lg font-semibold text-green-600">
                            {new Intl.NumberFormat('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                            }).format(calculatedTotal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining Payment</p>
                          <p className={`text-lg font-semibold ${remainingPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {new Intl.NumberFormat('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                            }).format(remainingPayment)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Total Payment & Remaining Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Payment</FormLabel>
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

            {/* Amount (Advance Payment) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paid_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Amount (Advance Payment) 
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-paid-amount"
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            field.onChange(value);
                            // Update remaining payment when amount changes
                            // Allow negative values for overpayments (handled by backend)
                            const enteredAmount = parseFloat(value) || 0;
                            const remaining = calculatedTotal - enteredAmount;
                            setRemainingPayment(remaining);
                            form.setValue('remaining_payment', remaining.toFixed(2));
                            
                            // Clear destination_account_id if amount becomes 0
                            if (enteredAmount === 0) {
                              form.setValue('destination_account_id', '');
                              form.clearErrors('destination_account_id');
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Enter the advance payment amount. The remaining amount will be calculated automatically.
                    </p>
                  </FormItem>
                )}
              />
            </div>

            {/* Account Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* To Account (Destination Account) - Only show when advance payment > 0 */}
              {parseFloat(form.watch('paid_amount') || '0') > 0 && (
                <SearchableToAccountSelect
                  form={form}
                  accounts={accounts}
                />
              )}

              {/* Account Receivable */}
              <SearchableAccountReceivableSelect
                form={form}
                accountReceivables={accountReceivables}
              />
            </div>

            {/* Description and Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="mode_of_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-mode">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODE_OF_PAYMENT_OPTIONS.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    type: "sale",
                    amount: "0.00",
                    description: "",
                    mode_of_payment: "bank_transfer",
                    total_payment: "0.00",
                    remaining_payment: "0.00",
                    date: new Date().toISOString().split('T')[0],
                    destination_account_id: "",
                    account_receivable_id: "",
                  });
                  setSaleItems([]);
                  setCalculatedTotal(0);
                  setRemainingPayment(0);
                }}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={createSaleWithProductsMutation.isPending || saleItems.length === 0}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                data-testid="button-submit-sale"
              >
                {createSaleWithProductsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Sale</span>
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
          <DialogTitle>Confirm Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to create this sale?
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Company:</span>{' '}
              {selectedCompany?.company_name || '-'}
            </p>
            <p>
              <span className="font-medium">Customer:</span>{' '}
              {selectedAccountReceivable?.name || '-'}
            </p>
            <p>
              <span className="font-medium">Date:</span>{' '}
              {pendingTransaction?.date
                ? new Date(pendingTransaction.date).toLocaleDateString('en-PK')
                : '-'}
            </p>
            {selectedAccount && (
              <p>
                <span className="font-medium">To Account:</span>{' '}
                {selectedAccount.name} ({selectedAccount.account_type})
              </p>
            )}
          </div>

          {/* Products Table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price/Unit</th>
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
                    <td className="px-3 py-2 text-right">{item.total_quantity}</td>
                    <td className="px-3 py-2 text-right">{item.sale_price_per_unit}</td>
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
              onClick={handleConfirmSale}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Sale</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}

