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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertAccountReceivableSchema, type InsertAccountReceivable, type AccountReceivable } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface AccountReceivableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  accountReceivable?: AccountReceivable | null;
  onSuccess: () => void;
}

export function AccountReceivableFormModal({ isOpen, onClose, mode, accountReceivable, onSuccess }: AccountReceivableFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAccountReceivable>({
    resolver: zodResolver(insertAccountReceivableSchema),
    defaultValues: {
      name: "",
      number: "",
      cnic: "",
      address: "",
      city: "",
      status: "active",
      construction_category: undefined,
      initial_balance: undefined,
    },
  });

  useEffect(() => {
    if (mode === 'edit' && accountReceivable) {
      form.reset({
        name: accountReceivable.name,
        number: accountReceivable.number || "",
        cnic: accountReceivable.cnic || "",
        address: accountReceivable.address || "",
        city: accountReceivable.city || "",
        status: accountReceivable.status,
        construction_category: accountReceivable.construction_category || undefined,
      });
    } else if (mode === 'create') {
      form.reset({
        name: "",
        number: "",
        cnic: "",
        address: "",
        city: "",
        status: "active",
        construction_category: undefined,
        initial_balance: undefined,
      });
    }
  }, [mode, accountReceivable, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertAccountReceivable) => 
      apiRequest('POST', '/api/account-receivables', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables/stats'] });
      toast({
        title: "Success",
        description: "Account Receivable created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account receivable",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertAccountReceivable) => 
      apiRequest('PUT', `/api/account-receivables/${accountReceivable?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables/stats'] });
      toast({
        title: "Success",
        description: "Account Receivable updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account receivable",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAccountReceivable) => {
    // Convert empty string to undefined for construction_category
    const processedData = {
      ...data,
      construction_category: data.construction_category === "" ? undefined : data.construction_category
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
        name: "",
        number: "",
        cnic: "",
        address: "",
        city: "",
        status: "active",
        construction_category: undefined,
        initial_balance: undefined,
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="account-receivable-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New Account Receivable' : 'Edit Account Receivable'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? 'Fill in the details to create a new account receivable' 
              : 'Update the account receivable information'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="account-receivable-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Receivable Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter account receivable name"
                        {...field}
                        data-testid="input-account-receivable-name"
                      />
                    </FormControl>
                    <FormDescription>
                      The name of the account receivable or company
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
                        data-testid="input-account-receivable-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Phone number for contacting the account receivable
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
                        data-testid="input-account-receivable-cnic"
                      />
                    </FormControl>
                    <FormDescription>
                      CNIC number of the account receivable
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
                        data-testid="input-account-receivable-city"
                      />
                    </FormControl>
                    <FormDescription>
                      City where the account receivable is located
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
                        <SelectTrigger data-testid="select-account-receivable-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the account receivable relationship
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="construction_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Construction Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-construction-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="grey">Grey</SelectItem>
                        <SelectItem value="finishing">Finishing</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Construction category for this account receivable
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
                          data-testid="input-account-receivable-initial-balance"
                        />
                      </FormControl>
                      <FormDescription>
                        Starting balance for this account receivable. Can be negative (e.g., -100). If not provided, defaults to 0.00.
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
                      data-testid="input-account-receivable-address"
                    />
                  </FormControl>
                  <FormDescription>
                    Complete address of the account receivable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    name: "",
                    number: "",
                    cnic: "",
                    address: "",
                    city: "",
                    status: "active",
                    construction_category: undefined,
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
                <span>{mode === 'create' ? 'Create Account Receivable' : 'Update Account Receivable'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

