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
import { Users, Loader2, ArrowRight } from "lucide-react";

interface CreatePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (data: any) => void;
}

export function CreatePayrollModal({ isOpen, onClose, onNext }: CreatePayrollModalProps) {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const form = useForm<InsertTransaction & { source_account_name?: string }>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "payroll",
      paid_amount: "",
      description: "",
      mode_of_payment: "bank_transfer",
      date: new Date().toISOString().split('T')[0],
      source_account_id: "",
    },
  });

  const selectedSourceAccountId = form.watch('source_account_id');
  const selectedSourceAccount = accounts.find((acc: any) => acc.id === selectedSourceAccountId);
  const amount = form.watch('paid_amount');
  const date = form.watch('date');

  // Auto-generate description
  useEffect(() => {
    if (selectedSourceAccount && amount && date) {
      const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const generatedDescription = `Payroll payment - ${formattedDate}`;
      form.setValue('description', generatedDescription);
    }
  }, [selectedSourceAccount, amount, date, form]);

  const onSubmit = (data: InsertTransaction) => {
    if (!data.source_account_id) {
      toast({
        title: "Validation Error",
        description: "Please select a source account",
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

    // Check balance
    if (selectedSourceAccount && parseFloat(amount.toString()) > parseFloat(selectedSourceAccount.balance.toString())) {
      toast({
        title: "Validation Error",
        description: "Insufficient balance in selected account",
        variant: "destructive",
      });
      form.setError('paid_amount', {
        type: 'manual',
        message: "Transaction can't happen as selected account balance is low",
      });
      return;
    }

    const confirmationData = {
      ...data,
      sourceAccountName: selectedSourceAccount?.name || '',
      paymentModeLabel: MODE_OF_PAYMENT_OPTIONS.find(m => m.value === data.mode_of_payment)?.label || data.mode_of_payment || '',
    };

    onNext(confirmationData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Payroll
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" max={today} {...field} />
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
                  <FormLabel>Source Account <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description will be auto-generated" {...field} />
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
                    type: "payroll",
                    paid_amount: "",
                    description: "",
                    mode_of_payment: "bank_transfer",
                    date: new Date().toISOString().split('T')[0],
                    source_account_id: "",
                  });
                  onClose();
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex items-center justify-center space-x-2 w-full sm:w-auto">
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

