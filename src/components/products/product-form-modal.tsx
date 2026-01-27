import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, type InsertProduct, type Product } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Company } from "@shared/schema";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  product?: Product | null;
}

export function ProductFormModal({ isOpen, onClose, mode, product }: ProductFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies for selection
  const { data: companiesResponse } = useQuery<{
    success: boolean;
    data: Company[];
  }>({
    queryKey: ['/api/companies'],
    enabled: isOpen,
  });

  const companies = companiesResponse?.data || [];

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      brand: "",
      unit: "",
      quantity: 0,
      current_price: 0,
      product_category: "",
      construction_category: "",
      company_id: "",
      company_name: "",
    },
  });

  useEffect(() => {
    if (mode === 'edit' && product) {
      form.reset({
        name: product.name,
        brand: product.brand || "",
        unit: product.unit || "",
        quantity: product.quantity,
        current_price: product.current_price,
        product_category: product.product_category || "",
        construction_category: product.construction_category || "",
        company_id: product.company_id || "",
        company_name: product.company_name || "",
      });
    } else if (mode === 'create') {
      form.reset({
        name: "",
        brand: "",
        unit: "",
        quantity: 0,
        current_price: 0,
        product_category: "",
        construction_category: "",
        company_id: "",
        company_name: "",
      });
    }
  }, [mode, product, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) => 
      apiRequest('POST', '/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/stats'] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      // Reset form before closing
      form.reset({
        name: "",
        brand: "",
        unit: "",
        quantity: 0,
        current_price: 0,
        product_category: "",
        construction_category: "",
        company_id: "",
        company_name: "",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertProduct) => 
      apiRequest('PUT', `/api/products/${product?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/stats'] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      // Reset form before closing
      form.reset({
        name: "",
        brand: "",
        unit: "",
        quantity: 0,
        current_price: 0,
        product_category: "",
        construction_category: "",
        company_id: "",
        company_name: "",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    // When company is selected, ensure both company_id and company_name are set
    if (data.company_id) {
      const selectedCompany = companies.find(c => c.id === data.company_id);
      if (selectedCompany) {
        data.company_name = selectedCompany.company_name;
      }
    } else {
      // Clear company_name if company_id is not set
      data.company_name = "";
    }

    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        name: "",
        brand: "",
        unit: "",
        quantity: 0,
        current_price: 0,
        product_category: "",
        construction_category: "",
        company_id: "",
        company_name: "",
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New Product' : 'Edit Product'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? 'Fill in the details to create a new product' 
              : 'Update the product information'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="product-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Construction Category - First and Required */}
              <FormField
                control={form.control}
                name="construction_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Construction Category <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-construction-category">
                          <SelectValue placeholder="Select construction category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="grey">Grey</SelectItem>
                        <SelectItem value="finishing">Finishing</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Construction phase category - affects available products
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter product name"
                        {...field}
                        data-testid="input-product-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the name of the product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter brand name (optional)"
                        {...field}
                        data-testid="input-brand"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the brand name (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., kg, bag, piece, cft, ltr, etc."
                        {...field}
                        data-testid="input-unit"
                      />
                    </FormControl>
                    <FormDescription>
                      Measurement unit (kg, bag, piece, cft, ltr, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0);
                          }
                        }}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormDescription>
                      Can be 0 for out-of-stock items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Price</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0);
                          }
                        }}
                        data-testid="input-current-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Construction Materials (optional)"
                        {...field}
                        data-testid="input-product-category"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional category for organizing products
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        if (value === '__clear__') {
                          field.onChange(undefined);
                          form.setValue('company_name', '');
                        } else {
                          const selectedCompany = companies.find(c => c.id === value);
                          if (selectedCompany) {
                            field.onChange(value);
                            form.setValue('company_name', selectedCompany.company_name);
                          }
                        }
                      }} 
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-company">
                          <SelectValue placeholder="Select company (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {field.value && (
                          <SelectItem value="__clear__">Clear Selection</SelectItem>
                        )}
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the company associated with this product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    name: "",
                    brand: "",
                    unit: "",
                    quantity: 0,
                    current_price: 0,
                    product_category: "",
                    construction_category: "",
                    company_id: "",
                    company_name: "",
                  });
                  onClose();
                }}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex items-center space-x-2"
                data-testid="button-save"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{mode === 'create' ? 'Create Product' : 'Update Product'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
