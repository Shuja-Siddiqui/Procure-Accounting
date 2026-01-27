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
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction } from "@shared/schema";
import { MODE_OF_PAYMENT_OPTIONS } from "@/types/transactions";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, DollarSign, Check, ChevronsUpDown, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SelectionType = 'vendor' | 'client' | null;

interface VendorOrClient {
  id: string;
  name: string;
  balance: number | string;
  type: 'vendor' | 'client';
}

export function CreatePaymentModal({ isOpen, onClose, onSuccess }: CreatePaymentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<InsertTransaction | null>(null);
  const [pendingEntity, setPendingEntity] = useState<VendorOrClient | null>(null);
  const [pendingSourceAccount, setPendingSourceAccount] = useState<any>(null);
  const [selectionType, setSelectionType] = useState<SelectionType>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Fetch related data for dropdowns
  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: () => apiRequest('GET', '/api/accounts'),
  });
  
  const accounts = accountsResponse?.data || [];

  const { data: accountPayablesResponse } = useQuery({
    queryKey: ['/api/account-payables'],
    queryFn: () => apiRequest('GET', '/api/account-payables'),
  });
  const accountPayables = accountPayablesResponse?.data || [];

  const { data: accountReceivablesResponse } = useQuery({
    queryKey: ['/api/account-receivables'],
    queryFn: () => apiRequest('GET', '/api/account-receivables'),
  });
  const accountReceivables = accountReceivablesResponse?.data || [];

  // Filter vendors (positive balance) and clients (negative balance)
  const vendors: VendorOrClient[] = (accountPayables || [])
    .filter((ap: any) => {
      const balance = typeof ap.balance === 'string' ? parseFloat(ap.balance) : (ap.balance || 0);
      return balance > 0;
    })
    .map((ap: any) => ({
      id: ap.id,
      name: ap.name,
      balance: ap.balance,
      type: 'vendor' as const,
    }));

  const clients: VendorOrClient[] = (accountReceivables || [])
    .filter((ar: any) => {
      const balance = typeof ar.balance === 'string' ? parseFloat(ar.balance) : (ar.balance || 0);
      return balance < 0;
    })
    .map((ar: any) => ({
      id: ar.id,
      name: ar.name,
      balance: ar.balance,
      type: 'client' as const,
    }));

  const allOptions: VendorOrClient[] = [...vendors, ...clients];

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "pay_able",
      total_amount: "",
      description: "",
      mode_of_payment: "cash",
      date: new Date().toISOString().split('T')[0],
      account_payable_id: "",
      account_receivable_id: "",
      source_account_id: "",
    },
  });

  const selectedEntityId = form.watch(selectionType === 'vendor' ? 'account_payable_id' : 'account_receivable_id');
  const selectedEntity = allOptions.find(opt => opt.id === selectedEntityId);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const processedData = {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : undefined,
      };
      
      const foreignKeyFields = [
        'account_payable_id', 'account_receivable_id', 'purchaser_id', 
        'source_account_id', 'destination_account_id'
      ];
      
      foreignKeyFields.forEach(field => {
        if ((processedData as any)[field] === '') {
          (processedData as any)[field] = null;
        }
      });

      return apiRequest('POST', '/api/transactions', processedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment created successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      
      form.reset({
        type: "pay_able",
        total_amount: "",
        description: "",
        mode_of_payment: "cash",
        date: new Date().toISOString().split('T')[0],
        account_payable_id: "",
        account_receivable_id: "",
        source_account_id: "",
      });
      setIsConfirmOpen(false);
      setPendingPaymentData(null);
      setPendingEntity(null);
      setPendingSourceAccount(null);
      setSelectionType(null);
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  const handleConfirmPayment = () => {
    if (pendingPaymentData) {
      createPaymentMutation.mutate(pendingPaymentData);
    }
  };

  const onSubmit = (data: InsertTransaction) => {
    // Validation
    if (!selectionType || (!data.account_payable_id && !data.account_receivable_id)) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor or client",
        variant: "destructive",
      });
      return;
    }

    if (!data.source_account_id) {
      toast({
        title: "Validation Error",
        description: "Please select a source account",
        variant: "destructive",
      });
      return;
    }

    if (!data.total_amount || parseFloat(data.total_amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    const selectedEntity = allOptions.find(opt => 
      opt.id === (selectionType === 'vendor' ? data.account_payable_id : data.account_receivable_id)
    );

    if (!selectedEntity) {
      toast({
        title: "Validation Error",
        description: "Selected entity not found",
        variant: "destructive",
      });
      return;
    }

    const entityName = selectedEntity.name;
    const currentBalance = typeof selectedEntity.balance === 'string' 
      ? parseFloat(selectedEntity.balance) 
      : (selectedEntity.balance || 0);
    const paymentAmount = parseFloat(data.total_amount);

    // Calculate remaining payment after this payment
    let remainingAfterPayment: number;
    if (selectionType === 'vendor') {
      // For vendors: balance decreases (what you owe decreases)
      remainingAfterPayment = currentBalance - paymentAmount;
    } else {
      // For clients: balance increases (becomes less negative)
      remainingAfterPayment = currentBalance + paymentAmount;
    }

    // Auto-append note to description
    const entityTypeLabel = selectionType === 'vendor' ? 'Account Payable' : 'Account Receivable';
    const noteText = `Note: ${entityName} (${entityTypeLabel}) balance at time of payment is: ${formatCurrency(currentBalance)}`;
    const existingDescription = data.description?.trim() || '';
    const finalDescription = existingDescription 
      ? `${existingDescription}\n${noteText}`
      : noteText;

    // Determine transaction type
    const transactionType = selectionType === 'vendor' ? 'pay_able' : 'pay_able_client';

    // Create payment data
    const paymentData: InsertTransaction = {
      ...data,
      type: transactionType,
      total_amount: currentBalance.toFixed(2),
      paid_amount: paymentAmount.toFixed(2),
      remaining_payment: remainingAfterPayment.toFixed(2),
      user_id: user?.id || undefined,
      description: finalDescription,
      // Set the appropriate ID based on selection type
      account_payable_id: selectionType === 'vendor' ? data.account_payable_id : null,
      account_receivable_id: selectionType === 'client' ? data.account_receivable_id : null,
    };

    const sourceAccount = accounts.find((acc: any) => acc.id === data.source_account_id);

    setPendingPaymentData(paymentData);
    setPendingEntity(selectedEntity);
    setPendingSourceAccount(sourceAccount);
    setIsConfirmOpen(true);
  };

  const formatCurrency = (amount: number | string | null) => {
    if (amount === null || amount === undefined) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '₨0.00';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const handleEntitySelect = (entity: VendorOrClient) => {
    setSelectionType(entity.type);
    setComboboxOpen(false);
    
    if (entity.type === 'vendor') {
      form.setValue('account_payable_id', entity.id);
      form.setValue('account_receivable_id', '');
      form.setValue('type', 'pay_able');
    } else {
      form.setValue('account_receivable_id', entity.id);
      form.setValue('account_payable_id', '');
      form.setValue('type', 'pay_able_client');
    }
  };

  const selectedEntityBalance = selectedEntity 
    ? (typeof selectedEntity.balance === 'string' ? parseFloat(selectedEntity.balance) : selectedEntity.balance)
    : 0;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Create Payment
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" max={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Payable / Receivable Selection */}
            <FormField
              control={form.control}
              name={selectionType === 'vendor' ? 'account_payable_id' : 'account_receivable_id'}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Account Payable / Receivable *</FormLabel>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !selectedEntityId && "text-muted-foreground"
                          )}
                        >
                          {selectedEntity
                            ? `${selectedEntity.name} (${selectedEntity.type === 'vendor' ? 'Vendor' : 'Client'})`
                            : "Select vendor or client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search vendors or clients..." />
                        <CommandList>
                          <CommandEmpty>No vendors or clients found.</CommandEmpty>
                          {vendors.length > 0 && (
                            <CommandGroup heading="Vendors (Account Payables)">
                              {vendors.map((vendor) => (
                                <CommandItem
                                  key={vendor.id}
                                  value={`${vendor.name} ${vendor.id}`}
                                  onSelect={() => handleEntitySelect(vendor)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedEntityId === vendor.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Building2 className="mr-2 h-4 w-4 text-blue-500" />
                                  <div className="flex-1">
                                    <div className="font-medium">{vendor.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Balance: {formatCurrency(vendor.balance)}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {clients.length > 0 && (
                            <>
                              {vendors.length > 0 && <div className="h-px bg-border my-1" />}
                              <CommandGroup heading="Clients (Account Receivables)">
                                {clients.map((client) => (
                                  <CommandItem
                                    key={client.id}
                                    value={`${client.name} ${client.id}`}
                                    onSelect={() => handleEntitySelect(client)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedEntityId === client.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <User className="mr-2 h-4 w-4 text-green-500" />
                                    <div className="flex-1">
                                      <div className="font-medium">{client.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Balance: {formatCurrency(client.balance)}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Balance Display */}
            {selectedEntity && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectionType === 'vendor' ? 'Account Payable' : 'Account Receivable'}:
                      </span>
                      <span className="text-sm font-semibold">
                        {selectedEntity.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Balance:
                      </span>
                      <span className={`text-lg font-bold ${
                        selectionType === 'vendor' 
                          ? (selectedEntityBalance > 0 ? 'text-orange-600' : 'text-green-600')
                          : (selectedEntityBalance < 0 ? 'text-orange-600' : 'text-green-600')
                      }`}>
                        {formatCurrency(selectedEntityBalance)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Source Account */}
            <FormField
              control={form.control}
              name="source_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Account (Payment From) *</FormLabel>
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
                            {acc.name} ({acc.account_type}) - Balance: {formatCurrency(acc.balance)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Amount */}
            <FormField
              control={form.control}
              name="total_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = `${parts[0]}.${parts.slice(1).join('')}`;
                        }
                        if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
                          value = value.replace(/^0+/, '');
                        }
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
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
                  <FormLabel>Mode of Payment *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "cash"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODE_OF_PAYMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
                      placeholder="Payment description (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Create Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Confirmation Modal */}
    <Dialog open={isConfirmOpen} onOpenChange={(open) => {
      if (!open) {
        setIsConfirmOpen(false);
        setPendingPaymentData(null);
        setPendingEntity(null);
        setPendingSourceAccount(null);
        setSelectionType(null);
        form.reset({
          type: "pay_able",
          total_amount: "",
          description: "",
          mode_of_payment: "cash",
          date: new Date().toISOString().split('T')[0],
          account_payable_id: "",
          account_receivable_id: "",
          source_account_id: "",
        });
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to create this payment?
          </p>

          {pendingPaymentData && pendingEntity && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm border-b pb-4">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    {pendingEntity.type === 'vendor' ? 'Account Payable (Vendor)' : 'Account Receivable (Client)'}:
                  </span>
                  <span className="font-semibold">{pendingEntity.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Pending Balance:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(parseFloat(pendingPaymentData.total_amount || '0'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Paid Amount:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(parseFloat(pendingPaymentData.paid_amount || '0'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Remaining:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(parseFloat(pendingPaymentData.remaining_payment || '0'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">From Account:</span>
                  <span className="font-semibold">{pendingSourceAccount?.name || '-'}</span>
                </div>
                {pendingPaymentData.date && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">Date:</span>
                    <span className="font-semibold">
                      {new Date(pendingPaymentData.date).toLocaleDateString('en-PK')}
                    </span>
                  </div>
                )}
                {pendingPaymentData.mode_of_payment && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">Payment Mode:</span>
                    <span className="font-semibold capitalize">
                      {pendingPaymentData.mode_of_payment.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {pendingPaymentData.description && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description:</p>
                  <p className="text-sm whitespace-pre-wrap">{pendingPaymentData.description}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setPendingPaymentData(null);
                setPendingEntity(null);
                setPendingSourceAccount(null);
                setSelectionType(null);
                form.reset({
                  type: "pay_able",
                  total_amount: "",
                  description: "",
                  mode_of_payment: "cash",
                  date: new Date().toISOString().split('T')[0],
                  account_payable_id: "",
                  account_receivable_id: "",
                  source_account_id: "",
                });
              }}
              disabled={createPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayment}
              disabled={createPaymentMutation.isPending}
              className="flex items-center gap-2"
            >
              {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Payment</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
