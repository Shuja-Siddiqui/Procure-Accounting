import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { insertInvoiceSchema, type InsertInvoice, type Invoice } from "@shared/schema";
import { Loader2, Plus, Trash2, Package, DollarSign } from "lucide-react";
import { ProductSelection } from "@/components/invoices/product-selection";

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  invoice?: Invoice | null;
  onSuccess: () => void;
}

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

export function InvoiceFormModal({ isOpen, onClose, mode, invoice, onSuccess }: InvoiceFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const form = useForm<InsertInvoice>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: {
      account_receivable_id: "",
      invoice_number: "",
      total_amount: "0.00",
      status: "pending",
    },
  });

  // Fetch account receivables for dropdown
  const { data: accountReceivablesData } = useQuery<{
    success: boolean;
    data: Array<{ id: string; name: string; city?: string }>;
  }>({
    queryKey: ['/api/account-receivables'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/account-receivables'), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  // Fetch invoice products when editing
  const { data: invoiceProductsData } = useQuery<{
    success: boolean;
    data: Product[];
  }>({
    queryKey: ['/api/invoice-products/invoice', invoice?.id],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/invoice-products/invoice/${invoice?.id}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch invoice products');
      }
      return response.json();
    },
    enabled: mode === 'edit' && !!invoice?.id,
  });

  useEffect(() => {
    if (mode === 'edit' && invoice) {
      form.reset({
        account_receivable_id: invoice.account_receivable_id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        status: invoice.status,
      });
    } else if (mode === 'create') {
      form.reset({
        account_receivable_id: "",
        invoice_number: "",
        total_amount: "0.00",
        status: "pending",
      });
    }
  }, [mode, invoice, form]);

  // Load invoice products when editing
  useEffect(() => {
    if (mode === 'edit' && invoiceProductsData?.data) {
      setSelectedProducts(invoiceProductsData.data);
    } else if (mode === 'create') {
      setSelectedProducts([]);
    }
  }, [mode, invoiceProductsData]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      // First create the invoice
      const invoiceResponse = await apiRequest('POST', '/api/invoices', data);
      
      // Then create invoice-product relationships
      if (selectedProducts.length > 0 && invoiceResponse.data?.id) {
        const productPromises = selectedProducts.map(product => 
          apiRequest('POST', '/api/invoice-products', {
            invoice_id: invoiceResponse.data.id,
            product_id: product.id,
            units_of_product: product.units_of_product || 1,
            amount_of_product: product.amount_of_product || (product.current_price || 0).toString(),
          })
        );
        await Promise.all(productPromises);
      }
      
      return invoiceResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/stats'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      // Update the invoice
      const invoiceResponse = await apiRequest('PUT', `/api/invoices/${invoice?.id}`, data);
      
      // Update invoice-product relationships
      if (invoice?.id) {
        // Get current products
        const currentProductsResponse = await fetch(getApiUrl(`/api/invoice-products/invoice/${invoice.id}`), { credentials: 'include' });
        const currentProducts = await currentProductsResponse.json();
        const currentProductIds = currentProducts.data?.map((p: Product) => p.product_id) || [];
        const selectedProductIds = selectedProducts.map(p => p.id);
        
        // Find products to add and remove
        const productsToAdd = selectedProducts.filter(p => !currentProductIds.includes(p.id));
        const productsToRemove = currentProducts.data?.filter((p: Product) => !selectedProductIds.includes(p.product_id)) || [];
        
        // Add new products
        const addPromises = productsToAdd.map(product => 
          apiRequest('POST', '/api/invoice-products', {
            invoice_id: invoice.id,
            product_id: product.id,
            units_of_product: product.units_of_product || 1,
            amount_of_product: product.amount_of_product || (product.current_price || 0).toString(),
          })
        );
        
        // Remove products
        const removePromises = productsToRemove.map((product: Product) => 
          apiRequest('DELETE', `/api/invoice-products/invoice/${invoice.id}/product/${product.product_id}`)
        );
        
        await Promise.all([...addPromises, ...removePromises]);
      }
      
      return invoiceResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/stats'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInvoice) => {
    // Calculate total amount from selected products (quantity * amount per quantity)
    const totalAmount = selectedProducts.reduce((sum, product) => {
      const quantity = product.units_of_product || 1;
      const amountPerQuantity = parseFloat(product.amount_of_product || '0');
      return sum + (quantity * amountPerQuantity);
    }, 0);

    const processedData = {
      ...data,
      total_amount: totalAmount.toFixed(2),
    };
    
    if (mode === 'create') {
      createMutation.mutate(processedData);
    } else {
      updateMutation.mutate(processedData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        account_receivable_id: "",
        invoice_number: "",
        total_amount: "0.00",
        status: "pending",
      });
      setSelectedProducts([]);
    }
  }, [isOpen, form]);

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const totalAmount = selectedProducts.reduce((sum, product) => {
    const quantity = product.units_of_product || 1;
    const amountPerQuantity = parseFloat(product.amount_of_product || '0');
    return sum + (quantity * amountPerQuantity);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="invoice-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New Invoice' : 'Edit Invoice'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? 'Fill in the details to create a new invoice' 
              : 'Update the invoice information'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="invoice-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="account_receivable_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Receivable <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-receivable">
                          <SelectValue placeholder="Select account receivable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountReceivablesData?.data?.map((accountReceivable) => (
                          <SelectItem key={accountReceivable.id} value={accountReceivable.id}>
                            {accountReceivable.name} {accountReceivable.city && `(${accountReceivable.city})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the account receivable for this invoice
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter invoice number"
                        {...field}
                        data-testid="input-invoice-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Unique invoice number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the invoice
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Total Amount</label>
                <div className="p-3 border rounded-md bg-muted">
                  <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                  <p className="text-sm text-muted-foreground">
                    Calculated from selected products
                  </p>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Products</h3>
                <div className="text-sm text-muted-foreground">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </div>
              </div>
              
              <ProductSelection
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    account_receivable_id: "",
                    invoice_number: "",
                    total_amount: "0.00",
                    status: "pending",
                  });
                  setSelectedProducts([]);
                  onClose();
                }}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || selectedProducts.length === 0}
                className="flex items-center space-x-2"
                data-testid="button-save"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{mode === 'create' ? 'Create Invoice' : 'Update Invoice'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
