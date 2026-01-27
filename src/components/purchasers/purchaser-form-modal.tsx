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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPurchaserSchema, type InsertPurchaser, type Purchaser } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { ProductSelection } from "./product-selection";
import { AccountPayableSelection } from "./account-payable-selection";

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
}

interface AccountPayable {
  id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
}

interface PurchaserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  purchaser?: Purchaser | null;
  onSuccess: () => void;
}

export function PurchaserFormModal({ isOpen, onClose, mode, purchaser, onSuccess }: PurchaserFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedAccountPayables, setSelectedAccountPayables] = useState<AccountPayable[]>([]);

  // Debug selectedProducts changes
  useEffect(() => {
    console.log('Selected products changed:', selectedProducts);
  }, [selectedProducts]);

  // Debug selectedAccountPayables changes
  useEffect(() => {
    console.log('Selected account payables changed:', selectedAccountPayables);
  }, [selectedAccountPayables]);

  const form = useForm<InsertPurchaser>({
    resolver: zodResolver(insertPurchaserSchema),
    defaultValues: {
      name: "",
      number: "",
      cnic: "",
      city: "",
      status: "active",
    },
  });

  // Fetch existing products for this purchaser in edit mode
  const { data: existingProductsData } = useQuery<{
    success: boolean;
    data: Product[];
  }>({
    queryKey: ['/api/purchaser-products/purchaser', purchaser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/purchaser-products/purchaser/${purchaser?.id}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: mode === 'edit' && !!purchaser?.id,
  });

  // Fetch existing account payables for this purchaser in edit mode
  const { data: existingAccountPayablesData } = useQuery<{
    success: boolean;
    data: AccountPayable[];
  }>({
    queryKey: ['/api/purchaser-account-payables/purchaser', purchaser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/purchaser-account-payables/purchaser/${purchaser?.id}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: mode === 'edit' && !!purchaser?.id,
  });

  useEffect(() => {
    if (mode === 'edit' && purchaser) {
      form.reset({
        name: purchaser.name,
        number: purchaser.number || "",
        cnic: purchaser.cnic || "",
        city: purchaser.city || "",
        status: purchaser.status,
      });
      // Set existing products for edit mode
      if (existingProductsData?.data) {
        setSelectedProducts(existingProductsData.data);
      }
      // Set existing account payables for edit mode
      if (existingAccountPayablesData?.data) {
        setSelectedAccountPayables(existingAccountPayablesData.data);
      }
    } else if (mode === 'create') {
      form.reset({
        name: "",
        number: "",
        cnic: "",
        city: "",
        status: "active",
      });
      setSelectedProducts([]);
      setSelectedAccountPayables([]);
    }
  }, [mode, purchaser, form, existingProductsData, existingAccountPayablesData]);

  const createMutation = useMutation({
    mutationFn: (data: InsertPurchaser) => 
      apiRequest('POST', '/api/purchasers', data),
    onSuccess: (response) => {
      console.log('Create purchaser response:', response);
      console.log('Response data:', response.data);
      console.log('Selected products:', selectedProducts);
      
      queryClient.invalidateQueries({ queryKey: ['/api/purchasers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchasers/stats'] });
      
      // Create product and account payable relationships
      if (response.data) {
        console.log('Creating relationships for purchaser ID:', response.data.id);
        const productPromise = selectedProducts.length > 0 ? createProductRelationships(response.data.id) : Promise.resolve();
        const accountPayablePromise = selectedAccountPayables.length > 0 ? createAccountPayableRelationships(response.data.id) : Promise.resolve();
        
        if (selectedProducts.length === 0 && selectedAccountPayables.length === 0) {
          console.log('No products or account payables selected, calling onSuccess directly');
          onSuccess();
        } else {
          Promise.all([productPromise, accountPayablePromise]).then(() => {
            console.log('All relationships created successfully');
          });
        }
      } else {
        console.log('No response data, calling onSuccess directly');
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchaser",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertPurchaser) => 
      apiRequest('PUT', `/api/purchasers/${purchaser?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchasers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchasers/stats'] });
      
      // Update product and account payable relationships
      if (purchaser?.id) {
        const productPromise = updateProductRelationships(purchaser.id);
        const accountPayablePromise = updateAccountPayableRelationships(purchaser.id);
        Promise.all([productPromise, accountPayablePromise]).then(() => {
          console.log('All relationships updated successfully');
        });
      } else {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchaser",
        variant: "destructive",
      });
    },
  });

  const createProductRelationships = async (purchaserId: string) => {
    try {
      console.log('Creating product relationships for purchaser:', purchaserId);
      console.log('Selected products:', selectedProducts);
      
      const promises = selectedProducts.map(product => {
        console.log('Creating relationship for product:', product.id);
        return apiRequest('POST', '/api/purchaser-products', {
          purchaser_id: purchaserId,
          product_id: product.id
        });
      });
      
      const results = await Promise.all(promises);
      console.log('Product relationships created successfully:', results);
      
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products/purchaser', purchaserId] });
      
      toast({
        title: "Success",
        description: `Purchaser created and ${selectedProducts.length} product(s) associated successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating product relationships:', error);
      toast({
        title: "Warning",
        description: "Purchaser created but failed to associate some products",
        variant: "destructive",
      });
      onSuccess();
    }
  };

  const updateProductRelationships = async (purchaserId: string) => {
    try {
      // Get current products
      const currentProducts = existingProductsData?.data || [];
      
      console.log('Updating product relationships for purchaser:', purchaserId);
      console.log('Current products:', currentProducts);
      console.log('Selected products:', selectedProducts);
      
      // Find products to add and remove
      const currentProductIds = currentProducts.map(p => p.id);
      const selectedProductIds = selectedProducts.map(p => p.id);
      
      const productsToAdd = selectedProducts.filter(p => !currentProductIds.includes(p.id));
      const productsToRemove = currentProducts.filter(p => !selectedProductIds.includes(p.id));
      
      console.log('Products to add:', productsToAdd);
      console.log('Products to remove:', productsToRemove);
      
      // Remove old relationships
      const removePromises = productsToRemove.map(product => {
        console.log('Removing relationship for product:', product.id);
        return apiRequest('DELETE', `/api/purchaser-products/purchaser/${purchaserId}/product/${product.id}`);
      });
      
      // Add new relationships
      const addPromises = productsToAdd.map(product => {
        console.log('Adding relationship for product:', product.id);
        return apiRequest('POST', '/api/purchaser-products', {
          purchaser_id: purchaserId,
          product_id: product.id
        });
      });
      
      await Promise.all([...removePromises, ...addPromises]);
      console.log('Product relationships updated successfully');
      
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-products/purchaser', purchaserId] });
      
      toast({
        title: "Success",
        description: `Purchaser updated and product relationships updated successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating product relationships:', error);
      toast({
        title: "Warning",
        description: "Purchaser updated but failed to update some product relationships",
        variant: "destructive",
      });
      onSuccess();
    }
  };

  const createAccountPayableRelationships = async (purchaserId: string) => {
      try {
      console.log('Creating account payable relationships for purchaser:', purchaserId);
      console.log('Selected account payables:', selectedAccountPayables);

      const promises = selectedAccountPayables.map(accountPayable => {
        console.log('Creating relationship for account payable:', accountPayable.id);
        return apiRequest('POST', '/api/purchaser-account-payables', {
          purchaser_id: purchaserId,
          account_payable_id: accountPayable.id
        });
      });
      
      const results = await Promise.all(promises);
      console.log('Account payable relationships created successfully:', results);
      
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables/purchaser', purchaserId] });
      
      toast({
        title: "Success",
        description: `Purchaser created and ${selectedAccountPayables.length} account payable(s) associated successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating account payable relationships:', error);
      toast({
        title: "Warning",
        description: "Purchaser created but failed to associate some account payables",
        variant: "destructive",
      });
      onSuccess();
    }
  };

  const updateAccountPayableRelationships = async (purchaserId: string) => {
    try {
      // Get current account payables
      const currentAccountPayables = existingAccountPayablesData?.data || [];
      
      console.log('Updating account payable relationships for purchaser:', purchaserId);
      console.log('Current account payables:', currentAccountPayables);
      console.log('Selected account payables:', selectedAccountPayables);
      
      // Find account payables to add and remove
      const currentAccountPayableIds = currentAccountPayables.map(ap => ap.id);
      const selectedAccountPayableIds = selectedAccountPayables.map(ap => ap.id);
      
      const accountPayablesToAdd = selectedAccountPayables.filter(ap => !currentAccountPayableIds.includes(ap.id));
      const accountPayablesToRemove = currentAccountPayables.filter(ap => !selectedAccountPayableIds.includes(ap.id));
      
      console.log('Account payables to add:', accountPayablesToAdd);
      console.log('Account payables to remove:', accountPayablesToRemove);
      
      // Remove old relationships
      const removePromises = accountPayablesToRemove.map(accountPayable => {
        console.log('Removing relationship for account payable:', accountPayable.id);
        return apiRequest('DELETE', `/api/purchaser-account-payables/purchaser/${purchaserId}/account-payable/${accountPayable.id}`);
      });
      
      // Add new relationships
      const addPromises = accountPayablesToAdd.map(accountPayable => {
        console.log('Adding relationship for account payable:', accountPayable.id);
        return apiRequest('POST', '/api/purchaser-account-payables', {
          purchaser_id: purchaserId,
          account_payable_id: accountPayable.id
        });
      });
      
      await Promise.all([...removePromises, ...addPromises]);
      console.log('Account payable relationships updated successfully');
      
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables/purchaser', purchaserId] });
      
      toast({
        title: "Success",
        description: `Purchaser updated and account payable relationships updated successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating account payable relationships:', error);
      toast({
        title: "Warning",
        description: "Purchaser updated but failed to update some account payable relationships",
        variant: "destructive",
      });
      onSuccess();
    }
  };

  const onSubmit = (data: InsertPurchaser) => {
    console.log('Form submitted with data:', data);
    console.log('Selected products at submit:', selectedProducts);
    console.log('Mode:', mode);
    
    if (mode === 'create') {
      console.log('Creating purchaser...');
      createMutation.mutate(data);
    } else {
      console.log('Updating purchaser...');
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
        cnic: "",
        city: "",
        status: "active",
      });
      setSelectedProducts([]);
      setSelectedAccountPayables([]);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="purchaser-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New Purchaser' : 'Edit Purchaser'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? 'Fill in the details to create a new purchaser' 
              : 'Update the purchaser information'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="purchaser-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchaser Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter purchaser name"
                        {...field}
                        data-testid="input-purchaser-name"
                      />
                    </FormControl>
                    <FormDescription>
                      The name of the purchaser or company
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
                        data-testid="input-purchaser-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Phone number for contacting the purchaser
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter CNIC number"
                        {...field}
                        data-testid="input-purchaser-cnic"
                      />
                    </FormControl>
                    <FormDescription>
                      CNIC number of the purchaser
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
                        data-testid="input-purchaser-city"
                      />
                    </FormControl>
                    <FormDescription>
                      City where the purchaser is located
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
                        <SelectTrigger data-testid="select-purchaser-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the purchaser relationship
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Selection */}
            <div className="pt-6 border-t border-border">
              <ProductSelection
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
                disabled={isPending}
              />
            </div>

            {/* Account Payable Selection */}
            {/* <div className="pt-6 border-t border-border">
              <AccountPayableSelection
                selectedAccountPayables={selectedAccountPayables}
                onAccountPayablesChange={setSelectedAccountPayables}
                selectedProducts={selectedProducts}
                disabled={isPending}
              />
            </div> */}

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    name: "",
                    number: "",
                    cnic: "",
                    city: "",
                    status: "active",
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
                <span>{mode === 'create' ? 'Create Purchaser' : 'Update Purchaser'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
