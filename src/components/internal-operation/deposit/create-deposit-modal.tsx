import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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
import { Wallet, Loader2, ArrowRight } from "lucide-react";

interface CreateDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (data: any) => void;
}

export function CreateDepositModal({ isOpen, onClose, onNext }: CreateDepositModalProps) {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  // Fetch accounts
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const form = useForm<InsertTransaction & { destination_account_name?: string }>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "deposit",
      paid_amount: "",
      description: "",
      mode_of_payment: "bank_transfer",
      date: new Date().toISOString().split('T')[0],
      destination_account_id: "",
    },
  });

  const selectedDestinationAccountId = form.watch('destination_account_id');
  const selectedDestinationAccount = accounts.find((acc: any) => acc.id === selectedDestinationAccountId);
  const amount = form.watch('paid_amount');
  const date = form.watch('date');

  // Auto-generate description
  useEffect(() => {
    if (selectedDestinationAccount && amount && date) {
      const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const generatedDescription = `Deposit to ${selectedDestinationAccount.name} - ${formattedDate}`;
      form.setValue('description', generatedDescription);
    }
  }, [selectedDestinationAccount, amount, date, form]);

  const onSubmit = (data: InsertTransaction) => {
    // Validation
    if (!data.destination_account_id) {
      toast({
        title: "Validation Error",
        description: "Please select a destination account",
        variant: "destructive",
      });
      return;
    }

    if (!data.paid_amount || parseFloat(data.paid_amount.toString()) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Deposits increase balance, so no need to check if balance is sufficient
    if (parseFloat(amount.toString()) < 0) {
      toast({
        title: "Validation Error",
        description: "Amount cannot be negative",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for confirmation modal
    const confirmationData = {
      ...data,
      destinationAccountName: selectedDestinationAccount?.name || '',
      paymentModeLabel: MODE_OF_PAYMENT_OPTIONS.find(m => m.value === data.mode_of_payment)?.label || data.mode_of_payment || '',
    };

    onNext(confirmationData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Deposit
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
                  <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={today}
                      {...field}
                    />
                  </FormControl>
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
                  <FormLabel>Destination Account <span className="text-destructive">*</span></FormLabel>
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

            {/* Amount */}
            <FormField
              control={form.control}
              name="paid_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
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
                  {selectedDestinationAccount && (
                    <p className="text-xs text-muted-foreground">
                      Account balance: {new Intl.NumberFormat('en-PK', {
                        style: 'currency',
                        currency: 'PKR',
                        minimumFractionDigits: 2,
                      }).format(selectedDestinationAccount.balance)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Mode */}
            <FormField
              control={form.control}
              name="mode_of_payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || "bank_transfer"}>
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
                      placeholder="Description will be auto-generated"
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
                    type: "deposit",
                    paid_amount: "",
                    description: "",
                    mode_of_payment: "bank_transfer",
                    date: new Date().toISOString().split('T')[0],
                    destination_account_id: "",
                  });
                  onClose();
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

