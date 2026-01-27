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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Search } from "lucide-react";
import { z } from "zod";

interface SaleBatch {
  id: string;
  batch_id: string;
  batch_number: string;
  quantity_sold: string;
  sale_price: string;
  purchase_price: string;
  product_name: string;
  product_brand?: string;
  product_unit?: string;
  discount?: string;
  discount_per_unit?: string;
  transaction_id: string;
}

interface SaleTransaction {
  id: string;
  type: string;
  date: string;
  sale_invoice_number?: string;
  receipt_invoice_number?: string;
  account_receivable_id: string;
  total_amount: string;
  paid_amount: string;
  remaining_payment: string;
  mode_of_payment?: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  customer_number?: string;
  customer_city?: string;
  customer_address?: string;
}

interface SaleData {
  transaction: SaleTransaction;
  batches: SaleBatch[];
}

const saleReturnSchema = z.object({
  source_account_id: z.string().min(1, "Source account is required"),
  account_receivable_id: z.string().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  total_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid total amount format"),
  paid_amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid paid amount format").optional(), // Allow negative values for overpayments
  description: z.string().optional(),
  mode_of_payment: z.string().optional(),
});

interface SaleReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SaleReturnModal({ isOpen, onClose, onSuccess }: SaleReturnModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState<string>("");
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [batchReturnQuantities, setBatchReturnQuantities] = useState<Record<string, string>>({});
  const [batchReturnPrices, setBatchReturnPrices] = useState<Record<string, string>>({});
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [pendingReturnItems, setPendingReturnItems] = useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(saleReturnSchema),
    defaultValues: {
      source_account_id: "",
      account_receivable_id: "",
      date: new Date().toISOString().split('T')[0],
      total_amount: "0.00",
      paid_amount: "0.00",
      description: "",
      mode_of_payment: "cash",
    },
  });

  // Fetch accounts
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  const accounts = accountsResponse?.data || [];

  // Fetch sale by invoice number
  const { data: saleResponse, isLoading: saleLoading, refetch: refetchSale } = useQuery({
    queryKey: ['/api/transactions/sale-by-invoice', searchInvoiceNumber],
    queryFn: async () => {
      if (!searchInvoiceNumber) return null;
      const response = await apiRequest('GET', `/api/transactions/sale-by-invoice?invoice_number=${searchInvoiceNumber}`);
      return response;
    },
    enabled: false, // Only fetch when explicitly called
  });

  // Update sale data when response changes
  useEffect(() => {
    if (saleResponse?.data) {
      setSaleData(saleResponse.data);
      const transaction = saleResponse.data.transaction;
      
      // Auto-fill customer
      if (transaction.account_receivable_id) {
        form.setValue('account_receivable_id', transaction.account_receivable_id);
      }
      
      // Reset batch selection
      setSelectedBatches(new Set());
      setBatchReturnQuantities({});
      setBatchReturnPrices({});
    } else if (saleResponse && !saleResponse.data) {
      setSaleData(null);
      toast({
        title: "Not Found",
        description: "No sale transaction found with this invoice number",
        variant: "destructive",
      });
    }
  }, [saleResponse, form, toast]);

  // Reset confirmation modal state when main modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsConfirmOpen(false);
      setPendingPayload(null);
      setPendingReturnItems([]);
    }
  }, [isOpen]);

  // Handle invoice number search
  const handleSearch = () => {
    if (!invoiceNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invoice number",
        variant: "destructive",
      });
      return;
    }
    setSearchInvoiceNumber(invoiceNumber.trim());
    refetchSale();
  };

  // Calculate total amount based on batch return quantities and prices
  const calculatedTotalAmount = useMemo(() => {
    if (!saleData) return "0.00";
    const total = Array.from(selectedBatches).reduce((sum, batchId) => {
      const batchQty = parseFloat(batchReturnQuantities[batchId] || "0");
      const batchPrice = parseFloat(batchReturnPrices[batchId] || "0");
      return sum + (batchQty * batchPrice);
    }, 0);
    return total.toFixed(2);
  }, [selectedBatches, batchReturnQuantities, batchReturnPrices, saleData]);

  // Update form total amount
  useEffect(() => {
    form.setValue('total_amount', calculatedTotalAmount);
  }, [calculatedTotalAmount, form]);

  // Handle batch selection
  const handleBatchToggle = (batchId: string) => {
    const newSelected = new Set(selectedBatches);
    if (newSelected.has(batchId)) {
      newSelected.delete(batchId);
      // Remove quantity and price when batch is deselected
      const newQuantities = { ...batchReturnQuantities };
      delete newQuantities[batchId];
      setBatchReturnQuantities(newQuantities);
      const newPrices = { ...batchReturnPrices };
      delete newPrices[batchId];
      setBatchReturnPrices(newPrices);
    } else {
      newSelected.add(batchId);
    }
    setSelectedBatches(newSelected);
  };

  // Handle batch return quantity change
  const handleBatchQuantityChange = (batchId: string, value: string) => {
    // Allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBatchReturnQuantities({
        ...batchReturnQuantities,
        [batchId]: value,
      });
    }
  };

  // Handle batch return price change
  const handleBatchPriceChange = (batchId: string, value: string) => {
    // Allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBatchReturnPrices({
        ...batchReturnPrices,
        [batchId]: value,
      });
    }
  };

  // Create sale return mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/transactions/sale-return', data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: "Sale return created successfully",
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/batches/sale-details'] });
      
      // Reset all state
      form.reset({
        source_account_id: "",
        account_receivable_id: "",
        date: new Date().toISOString().split('T')[0],
        total_amount: "0.00",
        paid_amount: "0.00",
        description: "",
        mode_of_payment: "cash",
      });
      setInvoiceNumber("");
      setSearchInvoiceNumber("");
      setSelectedBatches(new Set());
      setBatchReturnQuantities({});
      setBatchReturnPrices({});
      setSaleData(null);
      
      // Close confirmation modal and main modal
      setIsConfirmOpen(false);
      setPendingPayload(null);
      setPendingReturnItems([]);
      
      onSuccess?.();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create sale return",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset({
      source_account_id: "",
      account_receivable_id: "",
      date: new Date().toISOString().split('T')[0],
      total_amount: "0.00",
      paid_amount: "0.00",
      description: "",
      mode_of_payment: "cash",
    });
    setInvoiceNumber("");
    setSearchInvoiceNumber("");
    setSelectedBatches(new Set());
    setBatchReturnQuantities({});
    setBatchReturnPrices({});
    setSaleData(null);
    
    // Reset confirmation modal state
    setIsConfirmOpen(false);
    setPendingPayload(null);
    setPendingReturnItems([]);
    
    onClose();
  };

  const onSubmit = async (data: any) => {
    if (!saleData) {
      toast({
        title: "Error",
        description: "Please search and select a sale invoice first",
        variant: "destructive",
      });
      return;
    }

    if (selectedBatches.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one batch to return",
        variant: "destructive",
      });
      return;
    }

    // Validate that at least one batch has a return quantity and price
    const hasValidQuantity = Array.from(selectedBatches).some(batchId => {
      const qty = parseFloat(batchReturnQuantities[batchId] || "0");
      return qty > 0;
    });

    if (!hasValidQuantity) {
      toast({
        title: "Error",
        description: "Please enter return quantity for at least one selected batch",
        variant: "destructive",
      });
      return;
    }

    // Validate each batch's return quantity and price
    for (const batchId of Array.from(selectedBatches)) {
      const batch = saleData.batches.find(b => b.id === batchId);
      if (!batch) continue;

      const returnQty = parseFloat(batchReturnQuantities[batchId] || "0");
      const soldQty = parseFloat(batch.quantity_sold);

      if (returnQty > soldQty) {
        toast({
          title: "Error",
          description: `Return quantity (${returnQty.toFixed(2)}) for batch ${batch.batch_number} cannot exceed sold quantity (${soldQty.toFixed(2)})`,
          variant: "destructive",
        });
        return;
      }

      // Only validate price if quantity is greater than 0
      if (returnQty > 0) {
        const returnPrice = parseFloat(batchReturnPrices[batchId] || "0");
        if (!returnPrice || returnPrice <= 0) {
          toast({
            title: "Error",
            description: `Please enter a valid return price for batch ${batch.batch_number}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Build return items from selected batches with their actual quantities and prices
    const returnItems = Array.from(selectedBatches)
      .map(batchId => {
        const batch = saleData.batches.find(b => b.id === batchId);
        if (!batch) return null;

        const batchReturnQty = parseFloat(batchReturnQuantities[batchId] || "0");
        const batchReturnPrice = parseFloat(batchReturnPrices[batchId] || "0");
        
        // Skip batches with zero or invalid quantity
        if (batchReturnQty <= 0) return null;

        return {
          batch_id: batch.batch_id,
          quantity: batchReturnQty.toFixed(2),
          price_per_unit: batchReturnPrice.toFixed(2),
          total_amount: (batchReturnQty * batchReturnPrice).toFixed(2),
          discount: batch.discount,
          discount_per_unit: batch.discount_per_unit,
          transaction_id: batch.transaction_id,
        };
      })
      .filter(Boolean);

    // Build notes
    const notesParts = returnItems.map((item: any) => {
      return `Sale return of ${saleData.batches.find(b => b.batch_id === item.batch_id)?.product_name || 'product'} | ${item.quantity} | ${item.price_per_unit}/unit | ${item.total_amount}`;
    });
    const baseNote = notesParts.join('\n');
    const finalNote = data.description ? `${baseNote}\n${data.description}` : baseNote;

    const payload = {
      ...data,
      user_id: user?.id,
      description: finalNote,
      returns: returnItems,
    };

    // Open confirmation modal with snapshot of data instead of submitting immediately
    setPendingPayload(payload);
    setPendingReturnItems(returnItems);
    setIsConfirmOpen(true);
  };

  const handleConfirmSaleReturn = () => {
    if (!pendingPayload) return;
    createMutation.mutate(pendingPayload);
  };

  const invoiceNumberDisplay = saleData?.transaction.sale_invoice_number || saleData?.transaction.receipt_invoice_number || "-";

  // Get selected account for confirmation modal
  const selectedAccount = useMemo(
    () => accounts.find((acc: any) => acc.id === pendingPayload?.source_account_id),
    [accounts, pendingPayload?.source_account_id],
  );

  // Get customer for confirmation modal
  const selectedCustomer = useMemo(() => {
    if (!pendingPayload?.account_receivable_id || !saleData) return null;
    return {
      id: saleData.transaction.account_receivable_id,
      name: saleData.transaction.customer_name || '-',
      number: saleData.transaction.customer_number || '-',
      city: saleData.transaction.customer_city || '-',
    };
  }, [pendingPayload?.account_receivable_id, saleData]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Return</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date */}
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

            {/* Invoice Number Search */}
            <div className="space-y-2">
              <FormLabel>Search Invoice Number *</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={saleLoading}
                >
                  {saleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Search</span>
                </Button>
              </div>
            </div>

            {/* Sale Information */}
            {saleData && (
              <Card>
                <CardHeader>
                  <CardTitle>Sale Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="font-medium">{invoiceNumberDisplay}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transaction Date</p>
                      <p className="font-medium">
                        {saleData.transaction.date ? new Date(saleData.transaction.date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium">₨{parseFloat(saleData.transaction.total_amount || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{saleData.transaction.type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Batches Table */}
            {saleData && saleData.batches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Batches to Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Sale Price/Unit</TableHead>
                        <TableHead>Purchase Price</TableHead>
                        <TableHead>Discount/Unit</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Return Quantity</TableHead>
                        <TableHead>Return Price/Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleData.batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedBatches.has(batch.id)}
                              onCheckedChange={() => handleBatchToggle(batch.id)}
                            />
                          </TableCell>
                          <TableCell>
                            {batch.product_name}
                            {batch.product_brand && ` - ${batch.product_brand}`}
                          </TableCell>
                          <TableCell>{batch.batch_number}</TableCell>
                          <TableCell>{parseFloat(batch.quantity_sold).toFixed(2)}</TableCell>
                          <TableCell>₨{parseFloat(batch.sale_price).toFixed(2)}</TableCell>
                          <TableCell>₨{parseFloat(batch.purchase_price).toFixed(2)}</TableCell>
                          <TableCell>{batch.discount_per_unit ? `₨${parseFloat(batch.discount_per_unit).toFixed(2)}` : '-'}</TableCell>
                          <TableCell>{batch.discount ? `₨${parseFloat(batch.discount).toFixed(2)}` : '-'}</TableCell>
                          <TableCell>
                            {selectedBatches.has(batch.id) ? (
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={batchReturnQuantities[batch.id] || ""}
                                onChange={(e) => handleBatchQuantityChange(batch.id, e.target.value)}
                                placeholder="0.00"
                                className="w-24"
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {selectedBatches.has(batch.id) ? (
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={batchReturnPrices[batch.id] || ""}
                                onChange={(e) => handleBatchPriceChange(batch.id, e.target.value)}
                                placeholder="0.00"
                                className="w-24"
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Customer and Source Account */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_receivable_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        className="bg-muted"
                        value={saleData?.transaction.customer_name || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Account (Pay From) *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account to pay refund from" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.account_type}) - Balance: {account.balance} PKR
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Amount and Refund Amount */}
            <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>Refund Amount</FormLabel>
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
            </div>

            {/* Mode of Payment */}
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
                Create Sale Return
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
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Sale Return</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to create this sale return?
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Invoice Number:</span>{' '}
              {invoiceNumberDisplay}
            </p>
            {selectedCustomer && (
              <>
                <p>
                  <span className="font-medium">Customer:</span>{' '}
                  {selectedCustomer.name || '-'}
                </p>
                {selectedCustomer.city && (
                  <p>
                    <span className="font-medium">Customer City:</span>{' '}
                    {selectedCustomer.city}
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
              <span className="font-medium">Source Account:</span>{' '}
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
                  {pendingReturnItems.map((item: any, index: number) => {
                    const batch = saleData?.batches.find(b => b.batch_id === item.batch_id);
                    return (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{batch?.product_name || '-'}</td>
                        <td className="px-3 py-2">{batch?.batch_number || '-'}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{item.price_per_unit}</td>
                        <td className="px-3 py-2 text-right">{item.discount_per_unit || '0.00'}</td>
                        <td className="px-3 py-2 text-right">{item.discount || '0.00'}</td>
                        <td className="px-3 py-2 text-right">{item.total_amount}</td>
                      </tr>
                    );
                  })}
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
              <p className="text-muted-foreground">Refund Amount</p>
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
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSaleReturn}
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Sale Return</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
