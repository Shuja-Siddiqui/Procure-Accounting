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
import { insertAccountSchema, type InsertAccount, type Account } from "@shared/schema";
import { getCityOptions } from "@/lib/pakistan-cities";
import { Loader2 } from "lucide-react";

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  account?: Account | null;
}

export function AccountFormModal({ isOpen, onClose, mode, account }: AccountFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAccount>({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      account_number: "",
      name: "",
      handler: "",
      account_type: "petty",
      balance: 0,
      status: "active",
      city: "Karachi",
    },
  });

  useEffect(() => {
    if (mode === 'edit' && account) {
      form.reset({
        account_number: account.account_number,
        name: account.name,
        handler: account.handler || "",
        account_type: account.account_type,
        balance: account.balance,
        status: account.status,
        city: account.city || "Karachi",
      });
    } else if (mode === 'create') {
      form.reset({
        account_number: "",
        name: "",
        handler: "",
        account_type: "petty",
        balance: 0,
        status: "active",
        city: "Karachi",
      });
    }
  }, [mode, account, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertAccount) => 
      apiRequest('POST', '/api/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      // Reset form before closing
      form.reset({
        account_number: "",
        name: "",
        handler: "",
        account_type: "petty",
        balance: 0,
        status: "active",
        city: "Karachi",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertAccount) => 
      apiRequest('PUT', `/api/accounts/${account?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      // Reset form before closing
      form.reset({
        account_number: "",
        name: "",
        handler: "",
        account_type: "petty",
        balance: 0,
        status: "active",
        city: "Karachi",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAccount) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      // Exclude balance from update payload - initial balance should not be changed
      const { balance, ...updateData } = data;
      updateMutation.mutate(updateData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        account_number: "",
        name: "",
        handler: "",
        account_type: "petty",
        balance: 0,
        status: "active",
        city: "Karachi",
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="account-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New Account' : 'Edit Account'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? 'Fill in the details to create a new account' 
              : 'Update the account information'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="account-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ACC-2024-XXX"
                        {...field}
                        data-testid="input-account-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Must be unique across the system
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
                    <FormLabel>Account Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Construction Materials"
                        {...field}
                        data-testid="input-account-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="handler"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Handler</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John Smith"
                        {...field}
                        data-testid="input-account-handler"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional - Person responsible for this account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="petty">Petty Cash</SelectItem>
                        <SelectItem value="bank">Bank Account</SelectItem>
                        <SelectItem value="cash">Cash Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Type of account for categorization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={mode === 'edit' 
                          ? (typeof field.value === 'number' ? field.value.toFixed(2) : field.value || '0.00')
                          : (field.value || '')
                        }
                        onChange={(e) => {
                          if (mode === 'edit') {
                            // Prevent changes in edit mode
                            return;
                          }
                          const value = e.target.value;
                          // Allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0);
                          }
                        }}
                        readOnly={mode === 'edit'}
                        disabled={mode === 'edit'}
                        className={mode === 'edit' ? 'bg-muted cursor-not-allowed' : ''}
                        data-testid="input-balance"
                      />
                    </FormControl>
                    {mode === 'edit' && (
                      <FormDescription className="text-xs text-muted-foreground">
                        Initial balance cannot be changed after account creation
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {getCityOptions().map((city) => (
                          <SelectItem key={city.value} value={city.value}>
                            {city.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the city where this account is located
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
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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
                    account_number: "",
                    name: "",
                    handler: "",
                    account_type: "petty",
                    balance: 0,
                    status: "active",
                    city: "Karachi",
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
                <span>{mode === 'create' ? 'Create Account' : 'Update Account'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
