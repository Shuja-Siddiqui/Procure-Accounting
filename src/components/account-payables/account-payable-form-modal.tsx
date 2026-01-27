import { useEffect, useState } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { insertAccountPayableSchema, type InsertAccountPayable, type AccountPayable } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { ProductSelection } from "./product-selection";
import { PurchaserSelection } from "./purchaser-selection";

interface AccountPayableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  accountPayable?: AccountPayable | null;
  onSuccess: () => void;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
}

interface Purchaser {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export function AccountPayableFormModal({ isOpen, onClose, mode, accountPayable, onSuccess }: AccountPayableFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedPurchasers, setSelectedPurchasers] = useState<Purchaser[]>([]);

  const form = useForm<InsertAccountPayable>({
    resolver: zodResolver(insertAccountPayableSchema),
    defaultValues: {
      name: "",
      number: "",
      address: "",
      city: "",
      status: "active",
      initial_balance: undefined,
    },
  });

  // Fetch accountPayable's products when editing
  const { data: accountPayableProductsData } = useQuery<{
    success: boolean;
    data: Product[];
  }>({
    queryKey: ['/api/account-payable-products/account-payable', accountPayable?.id],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/account-payable-products/account-payable/${accountPayable?.id}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch account payable products');
      }
      return response.json();
    },
    enabled: mode === 'edit' && !!accountPayable?.id,
  });

  // Fetch accountPayable's purchasers when editing
  const { data: accountPayablePurchasersData } = useQuery<{
    success: boolean;
    data: Purchaser[];
  }>({
    queryKey: ['/api/purchaser-account-payables/account-payable', accountPayable?.id],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/purchaser-account-payables/account-payable/${accountPayable?.id}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch account payable purchasers');
      }
      return response.json();
    },
    enabled: mode === 'edit' && !!accountPayable?.id,
  });

  useEffect(() => {
    if (mode === 'edit' && accountPayable) {
      form.reset({
        name: accountPayable.name,
        number: accountPayable.number || "",
        address: accountPayable.address || "",
        city: accountPayable.city || "",
        status: accountPayable.status,
      });
    } else if (mode === 'create') {
      form.reset({
        name: "",
        number: "",
        address: "",
        city: "",
        status: "active",
        initial_balance: undefined,
      });
    }
  }, [mode, accountPayable, form]);

  // Load account payable's products and purchasers when editing
  useEffect(() => {
    if (mode === 'edit' && accountPayableProductsData?.data) {
      setSelectedProducts(accountPayableProductsData.data);
    } else if (mode === 'create') {
      setSelectedProducts([]);
      setSelectedPurchasers([]);
    }
  }, [mode, accountPayableProductsData]);

  // Load account payable's purchasers when editing
  useEffect(() => {
    if (mode === 'edit' && accountPayablePurchasersData?.data) {
      setSelectedPurchasers(accountPayablePurchasersData.data);
    } else if (mode === 'create') {
      setSelectedPurchasers([]);
    }
  }, [mode, accountPayablePurchasersData]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAccountPayable) => {
      // First create the account payable
      const accountPayableResponse = await apiRequest('POST', '/api/account-payables', data);
      
      if (!accountPayableResponse.data?.id) {
        throw new Error('Failed to create account payable');
      }

      const accountPayableId = accountPayableResponse.data.id;
      
      // Create account-payable-product relationships if products are selected
      if (selectedProducts.length > 0) {
        const productRelationshipPromises = selectedProducts.map(product =>
          apiRequest('POST', '/api/account-payable-products', {
            account_payable_id: accountPayableId,
            product_id: product.id
          })
        );
        await Promise.all(productRelationshipPromises);
      }
      
      // Create purchaser-account-payable relationships if purchasers are selected
      if (selectedPurchasers.length > 0) {
        const purchaserRelationshipPromises = selectedPurchasers.map(purchaser =>
          apiRequest('POST', '/api/purchaser-account-payables', {
            purchaser_id: purchaser.id,
            account_payable_id: accountPayableId
          }).catch(error => {
            // Ignore duplicate relationship errors (if relationship already exists)
            if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
              console.log(`Relationship already exists for purchaser ${purchaser.id}`);
              return null;
            }
            throw error;
          })
        );
        await Promise.all(purchaserRelationshipPromises);
      }
      
      return accountPayableResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payable-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account payable",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertAccountPayable) => {
      // First update the account payable
      const accountPayableResponse = await apiRequest('PUT', `/api/account-payables/${accountPayable?.id}`, data);
      
      // Then handle product relationships
      if (accountPayable?.id) {
        // Get current account payable products
        const currentProductsResponse = await fetch(getApiUrl(`/api/account-payable-products/account-payable/${accountPayable.id}`), { credentials: 'include' });
        const currentProducts = currentProductsResponse.ok ? await currentProductsResponse.json() : { data: [] };
        const currentProductIds = currentProducts.data?.map((p: Product) => p.id) || [];
        
        // Get selected product IDs
        const selectedProductIds = selectedProducts.map(p => p.id);
        
        // Find products to add and remove
        const productsToAdd = selectedProductIds.filter(id => !currentProductIds.includes(id));
        const productsToRemove = currentProductIds.filter(id => !selectedProductIds.includes(id));
        
        // Add new relationships
        const addPromises = productsToAdd.map(productId =>
          apiRequest('POST', '/api/account-payable-products', {
            account_payable_id: accountPayable.id,
            product_id: productId
          })
        );
        
        // Remove old relationships
        const removePromises = productsToRemove.map(productId =>
          apiRequest('DELETE', `/api/account-payable-products/account-payable/${accountPayable.id}/product/${productId}`)
        );
        
        // Execute all operations
        await Promise.all([...addPromises, ...removePromises]);
      }

      // Handle purchaser relationships
      if (accountPayable?.id) {
        // Get current account payable purchasers
        const currentPurchasersResponse = await fetch(getApiUrl(`/api/purchaser-account-payables/account-payable/${accountPayable.id}`), { credentials: 'include' });
        const currentPurchasers = currentPurchasersResponse.ok ? await currentPurchasersResponse.json() : { data: [] };
        const currentPurchaserIds = currentPurchasers.data?.map((p: Purchaser) => p.id) || [];
        
        // Get selected purchaser IDs
        const selectedPurchaserIds = selectedPurchasers.map(p => p.id);
        
        // Find purchasers to add and remove
        const purchasersToAdd = selectedPurchaserIds.filter(id => !currentPurchaserIds.includes(id));
        const purchasersToRemove = currentPurchaserIds.filter(id => !selectedPurchaserIds.includes(id));
        
        // Add new relationships
        const addPromises = purchasersToAdd.map(purchaserId =>
          apiRequest('POST', '/api/purchaser-account-payables', {
            purchaser_id: purchaserId,
            account_payable_id: accountPayable.id
          })
        );
        
        // Remove old relationships
        const removePromises = purchasersToRemove.map(purchaserId =>
          apiRequest('DELETE', `/api/purchaser-account-payables/purchaser/${purchaserId}/account-payable/${accountPayable.id}`)
        );
        
        // Execute all operations
        await Promise.all([...addPromises, ...removePromises]);
      }
      
      return accountPayableResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payable-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account payable",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAccountPayable) => {
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
        number: "",
        address: "",
        city: "",
        status: "active",
        initial_balance: undefined,
      });
      setSelectedProducts([]);
      setSelectedPurchasers([]);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="accountPayable-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New AccountPayable' : 'Edit AccountPayable'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? 'Fill in the details to create a new accountPayable' 
              : 'Update the accountPayable information'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="accountPayable-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mode === 'edit' && accountPayable && (
                <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3 bg-muted/40">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">AP ID</p>
                    <p className="text-sm font-mono">{accountPayable.ap_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Current Balance</p>
                    <p className="text-sm font-semibold">
                      {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        minimumFractionDigits: 2,
                      }).format(Number((accountPayable as any).balance || 0))}
                    </p>
                  </div>
                </div>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AccountPayable Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter accountPayable name"
                        {...field}
                        data-testid="input-accountPayable-name"
                      />
                    </FormControl>
                    <FormDescription>
                      The name of the accountPayable company or individual
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter contact number"
                        {...field}
                        data-testid="input-accountPayable-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Phone number for contacting the accountPayable
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter city"
                        {...field}
                        data-testid="input-accountPayable-city"
                      />
                    </FormControl>
                    <FormDescription>
                      City where the accountPayable is located
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accountPayable-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the accountPayable relationship
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === 'create' && (
                <FormField
                  control={form.control}
                  name="initial_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00 (can be negative, e.g., -100)"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : value);
                          }}
                          data-testid="input-accountPayable-initial-balance"
                        />
                      </FormControl>
                      <FormDescription>
                        Starting balance for this account payable. Can be negative (e.g., -100). If not provided, defaults to 0.00.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter full address"
                      className="min-h-[100px]"
                      {...field}
                      data-testid="input-accountPayable-address"
                    />
                  </FormControl>
                  <FormDescription>
                    Complete address of the accountPayable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Selection */}
            <div className="pt-6 border-t border-border">
              <ProductSelection
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
                disabled={isPending}
              />
            </div>

            {/* Purchaser Selection */}
            <div className="pt-6 border-t border-border">
              <PurchaserSelection
                selectedPurchasers={selectedPurchasers}
                onPurchasersChange={setSelectedPurchasers}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    name: "",
                    number: "",
                    address: "",
                    city: "",
                    status: "active",
                    initial_balance: undefined,
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
                <span>{mode === 'create' ? 'Create AccountPayable' : 'Update AccountPayable'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
