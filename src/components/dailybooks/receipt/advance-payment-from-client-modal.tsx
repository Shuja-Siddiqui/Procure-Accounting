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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction } from "@shared/schema";
import { MODE_OF_PAYMENT_OPTIONS } from "@/types/transactions";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

interface AdvancePaymentFromClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdvancePaymentFromClientModal({ isOpen, onClose, onSuccess }: AdvancePaymentFromClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch related data for dropdowns
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const { data: accountReceivablesResponse } = useQuery({
    queryKey: ['/api/account-receivables'],
    queryFn: () => apiRequest('GET', '/api/account-receivables'),
  });
  const accountReceivables = accountReceivablesResponse?.data || [];

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];

  // Confirmation modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<InsertTransaction | null>(null);

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "advance_sale_payment",
      total_amount: "0.00",
      description: "",
      mode_of_payment: "bank_transfer",
      paid_amount: "",
      remaining_payment: "0.00",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const createAdvancePaymentMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      return apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables/stats'] });
      
      if (data?.data?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.destination_account_id}/transactions`] });
      }
      if (data?.data?.account_receivable_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/account-receivables/${data.data.account_receivable_id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions/account-receivable', data.data.account_receivable_id] });
      }
      
      toast({
        title: "Success",
        description: "Advance payment from client created successfully",
      });
      
      form.reset({
        type: "advance_sale_payment",
        total_amount: "0.00",
        description: "",
        mode_of_payment: "bank_transfer",
        paid_amount: "",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
        destination_account_id: "",
        account_receivable_id: "",
      });
      setIsConfirmOpen(false);
      setPendingTransaction(null);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create advance payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTransaction) => {
    // Validate required fields
    if (!data.account_receivable_id) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
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
    if (!data.paid_amount || parseFloat(data.paid_amount.toString()) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    // Prepare advance payment data
    const advancePaymentData: InsertTransaction = {
      type: 'advance_sale_payment',
      account_receivable_id: data.account_receivable_id,
      destination_account_id: data.destination_account_id,
      paid_amount: data.paid_amount,
      total_amount: data.paid_amount,
      remaining_payment: "0.00",
      date: data.date,
      mode_of_payment: data.mode_of_payment || 'bank_transfer',
      description: data.description || '',
      user_id: user?.id,
    };

    // Open confirmation modal - DO NOT submit yet
    // Submission only happens when user confirms in the modal
    setPendingTransaction(advancePaymentData);
    setIsConfirmOpen(true);
  };

  const handleConfirmPayment = () => {
    // Only submit when user explicitly confirms
    if (!pendingTransaction) {
      toast({
        title: "Error",
        description: "No transaction data to submit",
        variant: "destructive",
      });
      return;
    }
    // This is the ONLY place where the mutation is called
    createAdvancePaymentMutation.mutate(pendingTransaction);
  };

  // Get selected client and account for confirmation modal
  const selectedClient = useMemo(
    () => accountReceivables.find((ar: any) => ar.id === pendingTransaction?.account_receivable_id),
    [accountReceivables, pendingTransaction?.account_receivable_id]
  );

  const selectedAccount = useMemo(
    () => accounts.find((acc: any) => acc.id === pendingTransaction?.destination_account_id),
    [accounts, pendingTransaction?.destination_account_id]
  );

  const selectedPaymentMode = useMemo(
    () => MODE_OF_PAYMENT_OPTIONS.find((mode) => mode.value === pendingTransaction?.mode_of_payment),
    [pendingTransaction?.mode_of_payment]
  );

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        type: "advance_sale_payment",
        total_amount: "0.00",
        description: "",
        mode_of_payment: "bank_transfer",
        paid_amount: "",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
        destination_account_id: "",
        account_receivable_id: "",
      });
    }
  }, [isOpen, form]);

  const isPending = createAdvancePaymentMutation.isPending;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Advance Payment from Client</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Receivable (Client) */}
            <FormField
              control={form.control}
              name="account_receivable_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client (Account Receivable) <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountReceivables.map((ar: any) => (
                        <SelectItem key={ar.id} value={ar.id}>
                          {ar.name}
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
                  <FormLabel>Destination Account (Receive To) <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
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
                            {acc.name} ({acc.account_number}) - Balance: {new Intl.NumberFormat('en-PK', {
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

            {/* Advance Payment Amount */}
            <FormField
              control={form.control}
              name="paid_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Advance Payment Amount <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        // Allow only numbers and decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        // Prevent multiple decimal points
                        const parts = value.split('.');
                        const formattedValue = parts.length > 2 
                          ? parts[0] + '.' + parts.slice(1).join('')
                          : value;
                        field.onChange(formattedValue);
                      }}
                    />
                  </FormControl>
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
                  <FormLabel>Payment Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'bank_transfer'}>
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
                      placeholder="Enter description (optional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || isConfirmOpen}
                className="flex items-center gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Review Payment</span>
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
        setPendingTransaction(null);
      }
    }}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Confirm Advance Payment from Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to create this advance payment from client?
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Client:</span>{' '}
              {selectedClient?.name || '-'}
            </p>
            <p>
              <span className="font-medium">Destination Account:</span>{' '}
              {selectedAccount ? `${selectedAccount.name} (${selectedAccount.account_number})` : '-'}
            </p>
            <p>
              <span className="font-medium">Transaction Date:</span>{' '}
              {pendingTransaction?.date
                ? new Date(pendingTransaction.date).toLocaleDateString('en-PK', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '-'}
            </p>
            <p>
              <span className="font-medium">Payment Mode:</span>{' '}
              {selectedPaymentMode?.label || '-'}
            </p>
            {pendingTransaction?.description && (
              <p>
                <span className="font-medium">Description:</span>{' '}
                {pendingTransaction.description}
              </p>
            )}
          </div>

          {/* Payment Summary */}
          <div className="border rounded-md p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment Amount:</span>
              <span className="text-lg font-semibold">
                {new Intl.NumberFormat('en-PK', {
                  style: 'currency',
                  currency: 'PKR',
                  minimumFractionDigits: 2,
                }).format(parseFloat(pendingTransaction?.paid_amount?.toString() || '0'))}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setPendingTransaction(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Payment</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
