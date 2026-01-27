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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Plus, Trash2, Calculator, Check, ChevronsUpDown } from "lucide-react";
import { z } from "zod";
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
import { cn } from "@/lib/utils";

interface BatchWithDetails {
  id: string;
  batch_number: string;
  available_quantity: string;
  purchase_price_per_unit: string;
  purchase_total_price: string;
  purchase_date: string;
  product_name: string;
  product_brand?: string;
  product_unit?: string;
  purchase_invoice_number?: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_number?: string;
  vendor_city?: string;
  vendor_address?: string;
  discount?: string;
  discount_per_unit?: string;
}

interface ReturnItem {
  batch_id: string;
  batch_number: string;
  product_name: string;
  quantity: string;
  price_per_unit: string;
  total_amount: string;
  discount?: string;
  discount_per_unit?: string;
}

const purchaseReturnSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  destination_account_id: z.string().min(1, "Destination account is required"),
  date: z.string().min(1, "Date is required"),
  total_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid total amount format"),
  paid_amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid paid amount format").optional(), // Allow negative values for overpayments
  description: z.string().optional(),
  mode_of_payment: z.string().optional(),
});

interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PurchaseReturnModal({ isOpen, onClose, onSuccess }: PurchaseReturnModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [vendorDetails, setVendorDetails] = useState<{
    id?: string;
    name?: string;
    number?: string;
    city?: string;
    address?: string;
  } | null>(null);
  const [productComboboxOpen, setProductComboboxOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [pendingReturnItems, setPendingReturnItems] = useState<ReturnItem[]>([]);
  const [pendingVendorDetails, setPendingVendorDetails] = useState<{
    id?: string;
    name?: string;
    number?: string;
    city?: string;
    address?: string;
  } | null>(null);
  const [pendingProductName, setPendingProductName] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(purchaseReturnSchema),
    defaultValues: {
      product_id: "",
      destination_account_id: "",
      date: new Date().toISOString().split('T')[0],
      total_amount: "0.00",
      paid_amount: "0.00",
      description: "",
      mode_of_payment: "cash",
    },
  });

  // Fetch products
  const { data: productsResponse } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('GET', '/api/products'),
  });
  const products = productsResponse?.data || [];

  // Fetch accounts
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  const accounts = accountsResponse?.data || [];

  // Fetch batches with purchase details when product is selected
  const { data: batchesResponse, isLoading: batchesLoading } = useQuery({
    queryKey: ['/api/transactions/batches/purchase-details', selectedProductId],
    queryFn: () => apiRequest('GET', `/api/transactions/batches/purchase-details?product_id=${selectedProductId}`),
    enabled: !!selectedProductId,
  });
  const allBatches: BatchWithDetails[] = batchesResponse?.data || [];
  
  // Filter out duplicate batches by batch_number (keep first occurrence)
  const batches = useMemo(() => {
    const seen = new Set<string>();
    return allBatches.filter(batch => {
      if (seen.has(batch.batch_number)) {
        return false;
      }
      seen.add(batch.batch_number);
      return true;
    });
  }, [allBatches]);

  // Handle product selection
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedBatchId("");
    setReturnItems([]);
    setVendorDetails(null);
    form.setValue('product_id', productId);
  };

  // Handle batch selection (radio button - single selection only)
  const handleBatchSelect = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    // If selecting the same batch, deselect it
    if (selectedBatchId === batchId) {
      setSelectedBatchId("");
      setReturnItems([]);
      setVendorDetails(null);
      return;
    }
    
    // Select the new batch (replacing any previous selection)
    setSelectedBatchId(batchId);
    
    // Set vendor details from the selected batch
    if (batch.vendor_id && batch.vendor_name) {
      setVendorDetails({
        id: batch.vendor_id,
        name: batch.vendor_name || '-',
        number: batch.vendor_number || '-',
        city: batch.vendor_city || '-',
        address: batch.vendor_address || '-',
      });
    } else {
      setVendorDetails(null);
    }
    
    // Set return items with only this batch
    setReturnItems([{
      batch_id: batchId,
      batch_number: batch.batch_number,
      product_name: batch.product_name,
      quantity: "",
      price_per_unit: batch.purchase_price_per_unit,
      total_amount: "0.00",
      discount: batch.discount,
      discount_per_unit: batch.discount_per_unit,
    }]);
  };

  // Handle return item update
  const handleReturnItemUpdate = (batchId: string, field: keyof ReturnItem, value: string) => {
    setReturnItems(prev =>
      prev.map(item => {
        if (item.batch_id === batchId) {
          const updated = { ...item, [field]: value };
          // Auto-calculate total if quantity or price changes
          if (field === 'quantity' || field === 'price_per_unit') {
            const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
            const price = parseFloat(field === 'price_per_unit' ? value : item.price_per_unit) || 0;
            updated.total_amount = (qty * price).toFixed(2);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return returnItems.reduce((sum, item) => {
      return sum + (parseFloat(item.total_amount) || 0);
    }, 0);
  }, [returnItems]);

  // Update form total amount
  useEffect(() => {
    form.setValue('total_amount', totalAmount.toFixed(2));
  }, [totalAmount, form]);

  // Reset confirmation modal state when main modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsConfirmOpen(false);
      setPendingPayload(null);
      setPendingReturnItems([]);
      setPendingVendorDetails(null);
      setPendingProductName("");
    }
  }, [isOpen]);

  // Create purchase return mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/transactions/purchase-return', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase return created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/batches/purchase-details'] });
      
      // Reset all state after successful submission
      form.reset({
        product_id: "",
        destination_account_id: "",
        date: new Date().toISOString().split('T')[0],
        total_amount: "0.00",
        paid_amount: "0.00",
        description: "",
        mode_of_payment: "cash",
      });
      setSelectedProductId("");
      setSelectedBatchId("");
      setReturnItems([]);
      setVendorDetails(null);
      
      // Close confirmation modal and main modal
      setIsConfirmOpen(false);
      setPendingPayload(null);
      setPendingReturnItems([]);
      setPendingVendorDetails(null);
      setPendingProductName("");
      
      onSuccess?.();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create purchase return",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    // Reset form
    form.reset({
      product_id: "",
      destination_account_id: "",
      date: new Date().toISOString().split('T')[0],
      total_amount: "0.00",
      description: "",
      mode_of_payment: "cash",
    });
    
    // Reset all state
    setSelectedProductId("");
    setSelectedBatchId("");
    setReturnItems([]);
    setVendorDetails(null);
    
    // Reset confirmation modal state
    setIsConfirmOpen(false);
    setPendingPayload(null);
    setPendingReturnItems([]);
    setPendingVendorDetails(null);
    setPendingProductName("");
    
    onClose();
  };

  const onSubmit = async (data: any) => {
    if (returnItems.length === 0 || !selectedBatchId) {
      toast({
        title: "Error",
        description: "Please select a batch to return",
        variant: "destructive",
      });
      return;
    }

    // Validate return items
    for (const item of returnItems) {
      const batch = batches.find(b => b.id === item.batch_id);
      if (!batch) continue;

      const returnQty = parseFloat(item.quantity);
      const availableQty = parseFloat(batch.available_quantity);

      if (!item.quantity || returnQty <= 0) {
        toast({
          title: "Error",
          description: `Please enter a valid return quantity for ${item.product_name}`,
          variant: "destructive",
        });
        return;
      }

      if (returnQty > availableQty) {
        toast({
          title: "Error",
          description: `Return quantity (${returnQty}) cannot exceed available quantity (${availableQty}) for ${item.product_name}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Build notes: "Purchase return of product name | qt | price /unit | total price + \n notes if typed"
    const notesParts = returnItems.map(item => {
      return `Purchase return of ${item.product_name} | ${item.quantity} | ${item.price_per_unit}/unit | ${item.total_amount}`;
    });
    const baseNote = notesParts.join('\n');
    const finalNote = data.description ? `${baseNote}\n${data.description}` : baseNote;

    const payload = {
      ...data,
      user_id: user?.id,
      description: finalNote,
      returns: returnItems.map(item => ({
        batch_id: item.batch_id,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        total_amount: item.total_amount,
        discount: item.discount,
        discount_per_unit: item.discount_per_unit,
      })),
    };

    // Get selected product name for confirmation modal
    const selectedProduct = products.find((p: any) => p.id === selectedProductId);
    const productName = selectedProduct 
      ? `${selectedProduct.name}${selectedProduct.brand ? ` - ${selectedProduct.brand}` : ''}`
      : "";

    // Open confirmation modal with snapshot of data instead of submitting immediately
    setPendingPayload(payload);
    setPendingReturnItems([...returnItems]);
    setPendingVendorDetails(vendorDetails ? { ...vendorDetails } : null);
    setPendingProductName(productName);
    setIsConfirmOpen(true);
  };

  const handleConfirmPurchaseReturn = () => {
    if (!pendingPayload) return;
    createMutation.mutate(pendingPayload);
  };

  // Get selected account for confirmation modal
  const selectedAccount = useMemo(
    () => accounts.find((acc: any) => acc.id === pendingPayload?.destination_account_id),
    [accounts, pendingPayload?.destination_account_id],
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Purchase Return</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Selection */}
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => {
                const selectedProduct = products.find((p: any) => p.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Popover open={productComboboxOpen} onOpenChange={setProductComboboxOpen}>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={productComboboxOpen}
                            className="w-full justify-between"
                          >
                            <span className="truncate">
                              {selectedProduct
                                ? `${selectedProduct.name}${selectedProduct.brand ? ` - ${selectedProduct.brand}` : ''}`
                                : "Select product to return..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search products by name or brand..." />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product: any) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.brand || ''}`}
                                  onSelect={() => {
                                    field.onChange(product.id);
                                    handleProductChange(product.id);
                                    setProductComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span>
                                    {product.name} {product.brand ? `- ${product.brand}` : ''}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Batch Selection Table */}
            {selectedProductId && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Batches to Return</CardTitle>
                </CardHeader>
                <CardContent>
                  {batchesLoading ? (
                    <div className="text-center py-4">Loading batches...</div>
                  ) : batches.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No available batches found for this product
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="min-w-full inline-block px-4 sm:px-0">
                    <RadioGroup value={selectedBatchId} onValueChange={handleBatchSelect}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Price/Unit</TableHead>
                            <TableHead>Available Qty</TableHead>
                            <TableHead>Purchase Price</TableHead>
                            <TableHead>Discount/Unit</TableHead>
                            <TableHead>Discount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batches.map((batch) => (
                            <TableRow 
                              key={batch.id} 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleBatchSelect(batch.id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <RadioGroupItem value={batch.id} id={`batch-${batch.id}`} />
                              </TableCell>
                              <TableCell>
                                {new Date(batch.purchase_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {batch.batch_number}
                              </TableCell>
                              <TableCell>
                                {batch.product_name}
                              </TableCell>
                              <TableCell>
                                {parseFloat(batch.purchase_price_per_unit).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {parseFloat(batch.available_quantity).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {parseFloat(batch.purchase_total_price).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {batch.discount_per_unit || '-'}
                              </TableCell>
                              <TableCell>
                                {batch.discount || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </RadioGroup>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vendor Details - Only show when batch is selected */}
            {selectedBatchId && vendorDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Details (From Selected Batch)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{vendorDetails.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Number</p>
                      <p className="font-medium">{vendorDetails.number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{vendorDetails.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{vendorDetails.address || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Return Items */}
            {returnItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Return Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price/Unit</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Discount/Unit</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnItems.map((item) => {
                            const batch = batches.find(b => b.id === item.batch_id);
                            const maxQty = batch ? parseFloat(batch.available_quantity) : 0;
                            
                            return (
                              <TableRow key={item.batch_id}>
                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                <TableCell>{item.batch_number}</TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow numbers and decimal point
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        handleReturnItemUpdate(item.batch_id, 'quantity', value);
                                      }
                                    }}
                                    placeholder="0.00"
                                    className="w-24"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Max: {maxQty.toFixed(2)}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.price_per_unit}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow numbers and decimal point
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        handleReturnItemUpdate(item.batch_id, 'price_per_unit', value);
                                      }
                                    }}
                                    placeholder="0.00"
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.total_amount}
                                    readOnly
                                    className="bg-muted w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">
                                    {item.discount_per_unit ? parseFloat(item.discount_per_unit).toFixed(2) : '-'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">
                                    {item.discount ? parseFloat(item.discount).toFixed(2) : '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReturnItems([]);
                                      setSelectedBatchId("");
                                      setVendorDetails(null);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {returnItems.map((item) => {
                        const batch = batches.find(b => b.id === item.batch_id);
                        const maxQty = batch ? parseFloat(batch.available_quantity) : 0;
                        
                        return (
                          <div key={item.batch_id} className="border rounded-lg p-4 space-y-3">
                            <div className="font-medium">{item.product_name} - {item.batch_number}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-muted-foreground">Quantity *</label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow numbers and decimal point
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handleReturnItemUpdate(item.batch_id, 'quantity', value);
                                    }
                                  }}
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Max: {maxQty.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Price/Unit *</label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.price_per_unit}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow numbers and decimal point
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handleReturnItemUpdate(item.batch_id, 'price_per_unit', value);
                                    }
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Total Amount</label>
                                <Input
                                  value={item.total_amount}
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setReturnItems([]);
                                    setSelectedBatchId("");
                                    setVendorDetails(null);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {(item.discount_per_unit || item.discount) && (
                              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                <div>
                                  <label className="text-sm text-muted-foreground">Discount/Unit</label>
                                  <p className="text-sm font-medium">
                                    {item.discount_per_unit ? parseFloat(item.discount_per_unit).toFixed(2) : '-'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">Discount</label>
                                  <p className="text-sm font-medium">
                                    {item.discount ? parseFloat(item.discount).toFixed(2) : '-'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction Details */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" max={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Account *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account to receive amount" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.account_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pay Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        inputMode="decimal"
                        {...field} 
                        placeholder="0.00"
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow negative sign, numbers and decimal point
                          if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                            field.onChange(value);
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

              <FormField
                control={form.control}
                name="mode_of_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode of Payment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode of payment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Purchase Return
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
        setPendingPayload(null);
        setPendingReturnItems([]);
        setPendingVendorDetails(null);
        setPendingProductName("");
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Purchase Return</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to create this purchase return?
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Product:</span>{' '}
              {pendingProductName || '-'}
            </p>
            {pendingVendorDetails && (
              <>
                <p>
                  <span className="font-medium">Vendor:</span>{' '}
                  {pendingVendorDetails.name || '-'}
                </p>
                {pendingVendorDetails.city && (
                  <p>
                    <span className="font-medium">Vendor City:</span>{' '}
                    {pendingVendorDetails.city}
                  </p>
                )}
              </>
            )}
            <p>
              <span className="font-medium">Date:</span>{' '}
              {pendingPayload?.date
                ? new Date(pendingPayload.date).toLocaleDateString('en-PK')
                : '-'}
            </p>
            <p>
              <span className="font-medium">Destination Account:</span>{' '}
              {selectedAccount ? `${selectedAccount.name} (${selectedAccount.account_type})` : '-'}
            </p>
          </div>

          {/* Return Items Table */}
          {pendingReturnItems.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Batch Number</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price/Unit</th>
                    <th className="px-3 py-2 text-right">Disc./Unit</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReturnItems.map((item) => (
                    <tr key={item.batch_id} className="border-t">
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2">{item.batch_number}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{item.price_per_unit}</td>
                      <td className="px-3 py-2 text-right">{item.discount_per_unit || '0.00'}</td>
                      <td className="px-3 py-2 text-right">{item.discount || '0.00'}</td>
                      <td className="px-3 py-2 text-right">{item.total_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">
                {pendingPayload?.total_amount || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pay Amount</p>
              <p className="font-semibold">
                {pendingPayload?.paid_amount || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Mode</p>
              <p className="font-semibold">
                {pendingPayload?.mode_of_payment || '-'}
              </p>
            </div>
          </div>

          {pendingPayload?.description && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Notes:</p>
              <p className="whitespace-pre-wrap bg-muted p-2 rounded-md">
                {pendingPayload.description}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setPendingPayload(null);
                setPendingReturnItems([]);
                setPendingVendorDetails(null);
                setPendingProductName("");
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPurchaseReturn}
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Purchase Return</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}

