import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction } from "@shared/schema";
import { MODE_OF_PAYMENT_OPTIONS } from "@/types/transactions";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, ArrowRightLeft } from "lucide-react";

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTransferModal({ isOpen, onClose, onSuccess }: CreateTransferModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Fetch accounts
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "transfer", // Automatically set transfer type
      paid_amount: "",
      description: "",
      mode_of_payment: "cash",
      date: new Date().toISOString().split('T')[0],
      source_account_id: "",
      destination_account_id: "",
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      // Convert date to proper format
      const processedData = {
        ...data,
        type: "transfer" as const, // Ensure type is transfer
        date: data.date ? new Date(data.date).toISOString() : undefined,
        paid_amount: data.paid_amount, // Transfer amount
        total_amount: data.paid_amount, // Use paid_amount as total_amount for transfers
      };
      
      // Convert empty strings to null for foreign key fields
      const foreignKeyFields = [
        'account_payable_id', 'account_receivable_id', 'purchaser_id'
      ];
      
      foreignKeyFields.forEach(field => {
        if ((processedData as any)[field] === '') {
          (processedData as any)[field] = null;
        }
      });

      // Add user_id
      if (user?.id) {
        (processedData as any).user_id = user.id;
      }

      return apiRequest('POST', '/api/transactions', processedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transfer created successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      
      // Reset form and close modal
      form.reset({
        type: "transfer",
        paid_amount: "",
        description: "",
        mode_of_payment: "cash",
        date: new Date().toISOString().split('T')[0],
        source_account_id: "",
        destination_account_id: "",
      });
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error('Error creating transfer:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create transfer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTransaction) => {
    // Validation
    if (!data.source_account_id) {
      toast({
        title: "Validation Error",
        description: "Please select a source account",
        variant: "destructive",
      });
      return;
    }

    if (!data.destination_account_id) {
      toast({
        title: "Validation Error",
        description: "Please select a destination account",
        variant: "destructive",
      });
      return;
    }

    if (data.source_account_id === data.destination_account_id) {
      toast({
        title: "Validation Error",
        description: "Source and destination accounts cannot be the same",
        variant: "destructive",
      });
      return;
    }

    if (!data.paid_amount || parseFloat(data.paid_amount.toString()) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid transfer amount",
        variant: "destructive",
      });
      return;
    }

    // Frontend balance check: prevent transfer greater than selected source account balance
    if (data.source_account_id) {
      const sourceAccount = accounts.find((acc: any) => acc.id === data.source_account_id);
      const sourceBalance = sourceAccount ? parseFloat(String(sourceAccount.balance ?? 0)) : 0;
      const transferAmount = parseFloat(data.paid_amount.toString());

      if (transferAmount > sourceBalance) {
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

    createTransferMutation.mutate(data);
  };

  const selectedSourceAccountId = form.watch('source_account_id');
  const selectedSourceAccount = accounts.find((acc: any) => acc.id === selectedSourceAccountId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Create Transfer
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Transaction Date */}
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

            {/* Source Account */}
            <FormField
              control={form.control}
              name="source_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Account (From) <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts
                        .filter((acc: any) => acc.status === 'active')
                        .map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.account_type}) - Balance: {new Intl.NumberFormat('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                              minimumFractionDigits: 2,
                            }).format(acc.balance)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destination Account */}
            <FormField
              control={form.control}
              name="destination_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Account (To) <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts
                        .filter((acc: any) => acc.status === 'active' && acc.id !== selectedSourceAccountId)
                        .map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.account_type}) - Balance: {new Intl.NumberFormat('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                              minimumFractionDigits: 2,
                            }).format(acc.balance)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transfer Amount */}
            <FormField
              control={form.control}
              name="paid_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Amount <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      value={field.value?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  {selectedSourceAccount && (
                    <p className="text-xs text-muted-foreground">
                      Available balance: {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        minimumFractionDigits: 2,
                      }).format(selectedSourceAccount.balance)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mode of Payment */}
            <FormField
              control={form.control}
              name="mode_of_payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || "cash"}>
                    <FormControl>
                      <SelectTrigger>
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Transfer description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    type: "transfer",
                    paid_amount: "",
                    description: "",
                    mode_of_payment: "cash",
                    date: new Date().toISOString().split('T')[0],
                    source_account_id: "",
                    destination_account_id: "",
                  });
                  onClose();
                }}
                disabled={createTransferMutation.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransferMutation.isPending}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                {createTransferMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                <span>Create Transfer</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

