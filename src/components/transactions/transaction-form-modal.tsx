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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTransactionSchema, type InsertTransaction, type Transaction } from "@shared/schema";
import { TRANSACTION_TYPES, MODE_OF_PAYMENT_OPTIONS } from "@/types/transactions";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Plus, Trash2, Calculator } from "lucide-react";

interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: string;
  unit: string;
  per_unit_rate: string;
  total_amount: string;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  transaction?: Transaction | null;
}

export function TransactionFormModal({ isOpen, onClose, mode, transaction }: TransactionFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get current user for user_id field

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

  const { data: purchasersResponse } = useQuery({
    queryKey: ['/api/purchasers'],
    queryFn: () => apiRequest('GET', '/api/purchasers'),
  });
  const purchasers = purchasersResponse?.data || [];

  const { data: productsResponse } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('GET', '/api/products'),
  });
  const products = productsResponse?.data || [];

  const form = useForm<InsertTransaction>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: "deposit",
      total_amount: "0.00",
      description: "",
      mode_of_payment: "cash",
      paid_amount: "0.00",
      remaining_payment: "0.00",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const [selectedType, setSelectedType] = useState<string>("deposit");
  const [insufficientBalance, setInsufficientBalance] = useState<{
    isInsufficient: boolean;
    availableBalance: number;
    transferAmount: number;
  }>({ isInsufficient: false, availableBalance: 0, transferAmount: 0 });

  const [sameAccountError, setSameAccountError] = useState<boolean>(false);
  
  // Purchase/Sale items state
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [saleItems, setSaleItems] = useState<PurchaseItem[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [remainingPayment, setRemainingPayment] = useState<number>(0);

  // Watch total_amount and paid_amount for auto-calculating remaining
  const totalAmount = form.watch('total_amount');
  const paidAmount = form.watch('paid_amount');

  // Auto-calculate remaining when total_amount or paid_amount changes
  useEffect(() => {
    const total = parseFloat(totalAmount?.toString() || '0');
    const paid = parseFloat(paidAmount?.toString() || '0');
    const remaining = total - paid;
    form.setValue('remaining_payment', remaining.toFixed(2), { shouldValidate: false });
  }, [totalAmount, paidAmount, form]);

  useEffect(() => {
    if (mode === 'edit' && transaction) {
      form.reset({
        type: transaction.type as any,
        source_account_id: transaction.source_account_id || "",
        destination_account_id: transaction.destination_account_id || "",
        total_amount: transaction.total_amount || "0.00",
        opening_balance: transaction.opening_balance || "0.00",
        closing_balance: transaction.closing_balance || "0.00",
        description: transaction.description || "",
        mode_of_payment: transaction.mode_of_payment || "cash",
        paid_amount: transaction.paid_amount || "0.00",
        remaining_payment: transaction.remaining_payment || "0.00",
        // remaining_payment: transaction.remaining_payment || "0.00",
        profit_loss: (transaction as any).profit_loss || undefined, // NEW
        user_id: (transaction as any).user_id || user?.id || undefined, // NEW
        date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        account_payable_id: transaction.account_payable_id || "",
        account_receivable_id: transaction.account_receivable_id || "",
        purchaser_id: transaction.purchaser_id || "",
      });
      setSelectedType(transaction.type);
    } else if (mode === 'create') {
      form.reset({
        type: "deposit",
        total_amount: "0.00",
        description: "",
        mode_of_payment: "cash",
        paid_amount: "0.00",
        remaining_payment: "0.00",
        // remaining_payment: "0.00",
        user_id: user?.id || undefined, // NEW
        date: new Date().toISOString().split('T')[0],
      });
      setSelectedType("deposit");
    }
  }, [mode, transaction, form, user]);

  const createMutation = useMutation({
    mutationFn: (data: InsertTransaction) => 
      apiRequest('POST', '/api/transactions', data),
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      
      // Invalidate specific account queries if transaction affects accounts
      if (data?.data?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.source_account_id}/transactions`] });
      }
      if (data?.data?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.destination_account_id}/transactions`] });
      }
      
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertTransaction) => 
      apiRequest('PUT', `/api/transactions/${transaction?.id}`, data),
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      
      // Invalidate specific account queries if transaction affects accounts
      if (data?.data?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.source_account_id}/transactions`] });
      }
      if (data?.data?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.destination_account_id}/transactions`] });
      }
      
      // Also invalidate the original transaction's account queries
      if (transaction?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${transaction.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${transaction.source_account_id}/transactions`] });
      }
      if (transaction?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${transaction.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${transaction.destination_account_id}/transactions`] });
      }
      
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
    },
  });

  const createPurchaseWithProductsMutation = useMutation({
    mutationFn: (data: { transaction: InsertTransaction; products: any[] }) => 
      apiRequest('POST', '/api/transactions/purchase-with-products', data),
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-product-junctions'] });
      
      // Invalidate product-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      // /api/inventory-history routes removed - use transaction_product_junction instead
      
      // Invalidate specific product queries for each product in the transaction
      if (data?.data?.productJunctions) {
        data.data.productJunctions.forEach((junction: any) => {
          if (junction.product_id) {
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}/inventory-history`] });
          }
        });
      }
      
      // Invalidate specific account queries if transaction affects accounts
      if (data?.data?.transaction?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}/transactions`] });
      }
      if (data?.data?.transaction?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}/transactions`] });
      }
      
      // Invalidate account payable queries if transaction has account payable
      if (data?.data?.transaction?.account_payable_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/account-payables/${data.data.transaction.account_payable_id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions/account-payable', data.data.transaction.account_payable_id] });
      }
      
      toast({
        title: "Success",
        description: "Purchase transaction with products created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase transaction",
        variant: "destructive",
      });
    },
  });

  const createSaleWithProductsMutation = useMutation({
    mutationFn: (data: { transaction: InsertTransaction; products: any[] }) => 
      apiRequest('POST', '/api/transactions/sale-with-products', data),
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-product-junctions'] });
      
      // Invalidate product-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      // /api/inventory-history routes removed - use transaction_product_junction instead
      
      // Invalidate specific product queries for each product in the transaction
      if (data?.data?.productJunctions) {
        data.data.productJunctions.forEach((junction: any) => {
          if (junction.product_id) {
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${junction.product_id}/inventory-history`] });
          }
        });
      }
      
      // Invalidate specific account queries if transaction affects accounts
      if (data?.data?.transaction?.source_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.source_account_id}/transactions`] });
      }
      if (data?.data?.transaction?.destination_account_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${data.data.transaction.destination_account_id}/transactions`] });
      }
      
      // Invalidate account receivable queries if transaction has account receivable
      if (data?.data?.transaction?.account_receivable_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/account-receivables/${data.data.transaction.account_receivable_id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions/account-receivable', data.data.transaction.account_receivable_id] });
      }
      
      toast({
        title: "Success",
        description: "Sale transaction with products created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sale transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTransaction) => {
    // Get amount value directly from form state (since it's not in the schema)
    // Use watch to get the current value or getValues as fallback
    const amountValue = form.watch('amount' as any) || form.getValues('amount' as any);
    
    // Check for same account in transfer transactions
    if (data.type === 'transfer' && data.source_account_id && data.destination_account_id) {
      if (!checkSameAccount(data.source_account_id, data.destination_account_id)) {
        toast({
          title: "Invalid Transfer",
          description: "From and To accounts must be different",
          variant: "destructive",
        });
        return;
      }
    }

    // Check balance for transfer transactions using amount from form state
    if (data.type === 'transfer' && data.source_account_id && amountValue) {
      const amountStr = amountValue?.toString() || '';
      if (amountStr && !checkBalance(data.source_account_id, amountStr)) {
        toast({
          title: "Insufficient Balance",
          description: `Available balance: ${insufficientBalance.availableBalance.toFixed(2)} PKR, Transfer amount: ${insufficientBalance.transferAmount.toFixed(2)} PKR`,
          variant: "destructive",
        });
        return;
      }
    }

    // Convert date to proper format for database
    const processedData = {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
    };
    
    // Auto-calculate remaining if not set
    const total = parseFloat(processedData.total_amount?.toString() || '0');
    const paid = parseFloat(processedData.paid_amount?.toString() || '0');
    const remaining = total - paid;
    (processedData as any).remaining = remaining.toFixed(2);
    
    // Add user_id if not set
    if (!(processedData as any).user_id && user?.id) {
      (processedData as any).user_id = user.id;
    }
    
    // Convert empty strings to null for foreign key fields
    const foreignKeyFields = [
      'account_payable_id', 'account_receivable_id', 'purchaser_id', 
      'source_account_id', 'destination_account_id', 'user_id'
    ];
    
    foreignKeyFields.forEach(field => {
      if ((processedData as any)[field] === '') {
        (processedData as any)[field] = null;
      }
    });

    // For purchase/sale transactions, use the calculated total
    if ((selectedType === 'purchase' && purchaseItems.length > 0) || (selectedType === 'sale' && saleItems.length > 0)) {
      processedData.total_payment = calculatedTotal.toFixed(2);
      processedData.remaining_payment = remainingPayment.toFixed(2);
    }

    // For transfer transactions, map amount from form state to paid_amount
    if (selectedType === 'transfer' && amountValue) {
      const transferAmount = amountValue?.toString() || '';
      if (transferAmount && parseFloat(transferAmount) > 0) {
        processedData.paid_amount = parseFloat(transferAmount).toFixed(2);
        // Also set total_amount to the same value for consistency
        processedData.total_amount = parseFloat(transferAmount).toFixed(2);
      } else {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid transfer amount",
          variant: "destructive",
        });
        return;
      }
    }

    if (mode === 'create') {
      // Use special API for purchase/sale transactions with products
      if (selectedType === 'purchase' && purchaseItems.length > 0) {
        const products = purchaseItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          per_unit_rate: item.per_unit_rate,
          total_amount: item.total_amount,
        }));
        
        createPurchaseWithProductsMutation.mutate({
          transaction: processedData,
          products
        });
      } else if (selectedType === 'sale' && saleItems.length > 0) {
        const products = saleItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          per_unit_rate: item.per_unit_rate,
          total_amount: item.total_amount,
        }));
        
        createSaleWithProductsMutation.mutate({
          transaction: processedData,
          products
        });
      } else {
        createMutation.mutate(processedData);
      }
    } else {
      updateMutation.mutate(processedData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || createPurchaseWithProductsMutation.isPending || createSaleWithProductsMutation.isPending;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        type: "deposit",
        amount: "0.00",
        description: "",
        mode_of_payment: "cash",
        total_payment: "0.00",
        remaining_payment: "0.00",
        date: new Date().toISOString().split('T')[0],
      });
      setSelectedType("deposit");
      setInsufficientBalance({ isInsufficient: false, availableBalance: 0, transferAmount: 0 });
      setSameAccountError(false);
      setPurchaseItems([]);
      setSaleItems([]);
      setCalculatedTotal(0);
      setRemainingPayment(0);
    }
  }, [isOpen, form]);

  // Check if source and destination accounts are the same
  const checkSameAccount = (sourceAccountId: string, destinationAccountId: string) => {
    if (selectedType === 'transfer' && sourceAccountId && destinationAccountId) {
      const isSame = sourceAccountId === destinationAccountId;
      setSameAccountError(isSame);
      return !isSame;
    }
    setSameAccountError(false);
    return true;
  };

  // Check balance for transfer transactions
  const checkBalance = (sourceAccountId: string, amount: string) => {
    if (selectedType === 'transfer' && sourceAccountId && amount) {
      const sourceAccount = accounts.find((acc: any) => acc.id === sourceAccountId);
      const transferAmount = parseFloat(amount);

      if (sourceAccount && transferAmount > 0) {
        const availableBalance = parseFloat(sourceAccount.balance.toString());

        if (transferAmount > availableBalance) {
          setInsufficientBalance({
            isInsufficient: true,
            availableBalance,
            transferAmount
          });
          return false;
        } else {
          setInsufficientBalance({
            isInsufficient: false,
            availableBalance: 0,
            transferAmount: 0
          });
          return true;
        }
      }
    }
    setInsufficientBalance({ isInsufficient: false, availableBalance: 0, transferAmount: 0 });
    return true;
  };

  // Purchase/Sale items functions
  const addPurchaseItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      product_id: "",
      product_name: "",
      quantity: "0",
      unit: "",
      per_unit_rate: "0.00",
      total_amount: "0.00"
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  const addSaleItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      product_id: "",
      product_name: "",
      quantity: "0",
      unit: "",
      per_unit_rate: "0.00",
      total_amount: "0.00"
    };
    setSaleItems([...saleItems, newItem]);
  };

  const removePurchaseItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  const removeSaleItem = (id: string) => {
    setSaleItems(saleItems.filter(item => item.id !== id));
  };

  const updatePurchaseItem = (id: string, field: keyof PurchaseItem, value: string) => {
    setPurchaseItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Calculate total amount if quantity or rate changes
          if (field === 'quantity' || field === 'per_unit_rate') {
            const quantity = parseFloat(field === 'quantity' ? value : updatedItem.quantity) || 0;
            const rate = parseFloat(field === 'per_unit_rate' ? value : updatedItem.per_unit_rate) || 0;
            updatedItem.total_amount = (quantity * rate).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const updateSaleItem = (id: string, field: keyof PurchaseItem, value: string) => {
    setSaleItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Calculate total amount if quantity or rate changes
          if (field === 'quantity' || field === 'per_unit_rate') {
            const quantity = parseFloat(field === 'quantity' ? value : updatedItem.quantity) || 0;
            const rate = parseFloat(field === 'per_unit_rate' ? value : updatedItem.per_unit_rate) || 0;
            updatedItem.total_amount = (quantity * rate).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const updateProductName = (id: string, productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      if (selectedType === 'purchase') {
        updatePurchaseItem(id, 'product_name', product.name);
      } else if (selectedType === 'sale') {
        updateSaleItem(id, 'product_name', product.name);
      }
    }
  };

  // Calculate total amount from purchase/sale items
  useEffect(() => {
    const items = selectedType === 'purchase' ? purchaseItems : saleItems;
    const total = items.reduce((sum, item) => {
      return sum + (parseFloat(item.total_amount) || 0);
    }, 0);
    setCalculatedTotal(total);
    
    // Update form with calculated total
    form.setValue('total_payment', total.toFixed(2));
    
    // Calculate remaining payment
    const enteredAmount = parseFloat(form.getValues('amount') || '0');
    const remaining = Math.max(0, total - enteredAmount);
    setRemainingPayment(remaining);
    form.setValue('remaining_payment', remaining.toFixed(2));
  }, [purchaseItems, saleItems, selectedType, form]);

  // Update remaining payment when amount changes
  useEffect(() => {
    if (selectedType === 'purchase' || selectedType === 'sale') {
      const enteredAmount = parseFloat(form.getValues('amount') || '0');
      const remaining = Math.max(0, calculatedTotal - enteredAmount);
      setRemainingPayment(remaining);
      form.setValue('remaining_payment', remaining.toFixed(2));
    }
  }, [form.watch('amount'), calculatedTotal, selectedType, form]);

  // Get product IDs from purchase/sale items
  const selectedProductIds = (selectedType === 'purchase' ? purchaseItems : saleItems).map(item => item.product_id).filter(Boolean);

  // Fetch account payables based on selected products
  const { data: filteredAccountPayablesResponse } = useQuery({
    queryKey: ['/api/account-payable-products/account-payables-by-products', selectedProductIds],
    queryFn: () => {
      if (selectedProductIds.length === 0) {
        return { success: true, data: [] };
      }
      return apiRequest('POST', '/api/account-payable-products/account-payables-by-products', {
        productIds: selectedProductIds
      });
    },
    enabled: selectedType === 'purchase' && selectedProductIds.length > 0,
  });

  const filteredAccountPayables = filteredAccountPayablesResponse?.data || [];

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setValue('type', value as any);
    
    // Reset validation states when changing type
    setInsufficientBalance({ isInsufficient: false, availableBalance: 0, transferAmount: 0 });
    setSameAccountError(false);
    
    // Reset purchase/sale items when switching away from purchase/sale
    if (value !== 'purchase' && value !== 'sale') {
      setPurchaseItems([]);
      setSaleItems([]);
      setCalculatedTotal(0);
      setRemainingPayment(0);
    }
    
    // Reset related fields when changing transaction type
    if (value !== 'deposit') {
      form.setValue('source_account_id', '');
    }
    if (value !== 'transfer') {
      form.setValue('destination_account_id', '');
    }
    if (!['purchase', 'sale', 'advance_purchase_inventory', 'advance_sale_inventory'].includes(value)) {
      form.setValue('account_payable_id', '');
      form.setValue('account_receivable_id', '');
      form.setValue('purchaser_id', '');
    }
  };

  // Get fields to show based on transaction type
  const getFieldsToShow = (type: string) => {
    const baseFields = ['type', 'amount', 'description', 'mode_of_payment', 'date'];
    
    switch (type) {
      case 'deposit':
        return [...baseFields, 'destination_account_id'];
      case 'transfer':
        return [...baseFields, 'source_account_id', 'destination_account_id'];
      case 'purchase':
        // For purchase, exclude individual product fields since they're handled in purchase items section
        return [...baseFields, 'source_account_id', 'account_payable_id', 'total_payment', 'remaining_payment'];
      case 'purchase_return':
        return [...baseFields, 'source_account_id', 'account_payable_id', 'total_payment', 'remaining_payment'];
      case 'sale':
      case 'sale_return':
        return [...baseFields, 'destination_account_id', 'account_receivable_id', 'total_payment', 'remaining_payment'];
      case 'advance_purchase_inventory':
        return [...baseFields, 'source_account_id', 'account_payable_id', 'total_payment', 'remaining_payment'];
      case 'advance_sale_payment':
        return [...baseFields, 'source_account_id', 'account_receivable_id', 'total_payment', 'remaining_payment'];
      case 'advance_purchase_payment':
        return [...baseFields, 'source_account_id', 'account_payable_id', 'total_payment', 'remaining_payment'];
      case 'advance_sale_inventory':
        return [...baseFields, 'source_account_id', 'account_receivable_id', 'total_payment', 'remaining_payment'];
      case 'asset_purchase':
        return [...baseFields, 'source_account_id', 'description'];
      case 'loan':
      case 'loan_return':
        return [...baseFields, 'source_account_id', 'destination_account_id', 'total_payment', 'remaining_payment'];
      case 'other_expense':
      case 'lost_and_damage':
        return [...baseFields, 'source_account_id'];
      case 'pay_able':
        return [...baseFields, 'account_payable_id', 'account_receivable_id', 'purchaser_id', 'total_payment', 'remaining_payment'];
      case 'receive_able':
        return [...baseFields, 'account_payable_id', 'account_receivable_id', 'purchaser_id', 'total_payment', 'remaining_payment'];
      default:
        return baseFields;
    }
  };

  const fieldsToShow = getFieldsToShow(selectedType);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0" data-testid="transaction-form-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {mode === 'create' ? 'Create New Transaction' : 'Edit Transaction'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'create' 
              ? `Fill in the details to create a new ${selectedType} transaction` 
              : 'Update the transaction information'}
          </p>
          {selectedType === 'deposit' && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Deposit Transaction:</strong> Money is being added to an account. You need to specify the amount, description, payment mode, To account, and transaction date.
              </p>
            </div>
          )}
          {selectedType === 'purchase' && (
            <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-purple-800">
                <strong>Purchase Transaction:</strong> Use the "Purchase Items" section below to add multiple products. The total amount will be calculated automatically based on quantity × rate for each product. If the entered amount differs from the calculated total, the remaining amount will be added to remaining payment.
              </p>
            </div>
          )}
          {selectedType === 'sale' && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Sale Transaction:</strong> Use the "Sale Items" section below to add multiple products. The total amount will be calculated automatically based on quantity × rate for each product. The amount will be added to the destination account and product quantities will be deducted from inventory.
              </p>
            </div>
          )}
          {selectedType === 'transfer' && (
            <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-purple-800">
                <strong>Transfer Transaction:</strong> Money is being moved from one account to another. You need to specify the amount, description, payment mode, From account, To account, and transaction date. The system will automatically create two transactions: Transfer Out (debit From account) and Transfer In (credit To account).
              </p>
            </div>
          )}
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="transaction-form">
            {selectedType === 'purchase' || selectedType === 'sale' ? (
              // Custom field order for purchase/sale transactions
              <div className="space-y-6">
                {/* 1. Transaction Type & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={handleTypeChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-transaction-type">
                              <SelectValue placeholder="Select transaction type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRANSACTION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Date <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 3. Purchase/Sale Items Section - Move existing section here */}
                <div className="col-span-full">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {selectedType === 'purchase' ? 'Purchase Items' : 'Sale Items'}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={selectedType === 'purchase' ? addPurchaseItem : addSaleItem}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Product</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(selectedType === 'purchase' ? purchaseItems : saleItems).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No products added yet. Click "Add Product" to start adding items to your {selectedType}.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(selectedType === 'purchase' ? purchaseItems : saleItems).map((item, index) => (
                            <Card key={item.id} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                                {/* Product Selection */}
                                <div className="md:col-span-2">
                                  <label className="text-sm font-medium">Product</label>
                                  <Select
                                    value={item.product_id || undefined}
                                    onValueChange={(value) => {
                                      if (selectedType === 'purchase') {
                                        updatePurchaseItem(item.id, 'product_id', value);
                                      } else {
                                        updateSaleItem(item.id, 'product_id', value);
                                      }
                                      updateProductName(item.id, value);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products?.map((product: any) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Quantity */}
                                <div>
                                  <label className="text-sm font-medium">Quantity</label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow numbers and decimal point
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        if (selectedType === 'purchase') {
                                          updatePurchaseItem(item.id, 'quantity', value);
                                        } else {
                                          updateSaleItem(item.id, 'quantity', value);
                                        }
                                      }
                                    }}
                                  />
                                </div>

                                {/* Unit */}
                                <div>
                                  <label className="text-sm font-medium">Unit</label>
                                  <Input
                                    placeholder="kg, pcs, etc."
                                    value={item.unit}
                                    onChange={(e) => {
                                      if (selectedType === 'purchase') {
                                        updatePurchaseItem(item.id, 'unit', e.target.value);
                                      } else {
                                        updateSaleItem(item.id, 'unit', e.target.value);
                                      }
                                    }}
                                  />
                                </div>

                                {/* Rate per Unit */}
                                <div>
                                  <label className="text-sm font-medium">Rate/Unit</label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={item.per_unit_rate}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow numbers and decimal point
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        if (selectedType === 'purchase') {
                                          updatePurchaseItem(item.id, 'per_unit_rate', value);
                                        } else {
                                          updateSaleItem(item.id, 'per_unit_rate', value);
                                        }
                                      }
                                    }}
                                  />
                                </div>

                                {/* Total Amount */}
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1">
                                    <label className="text-sm font-medium">Total</label>
                                    <Input
                                      placeholder="0.00"
                                      value={item.total_amount}
                                      readOnly
                                      className="bg-muted"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (selectedType === 'purchase') {
                                        removePurchaseItem(item.id);
                                      } else {
                                        removeSaleItem(item.id);
                                      }
                                    }}
                                    className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Purchase/Sale Summary */}
                      {(selectedType === 'purchase' ? purchaseItems : saleItems).length > 0 && (
                        <div className="mt-6 p-4 bg-muted rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Items</p>
                              <p className="text-lg font-semibold">{(selectedType === 'purchase' ? purchaseItems : saleItems).length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Calculated Total</p>
                              <p className="text-lg font-semibold text-green-600">
                                {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR',
                                }).format(calculatedTotal)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Remaining Payment</p>
                              <p className={`text-lg font-semibold ${remainingPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR',
                                }).format(remainingPayment)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 4. Total Payment & Remaining Payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={form.control}
                    name="total_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Payment</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            {...field}
                            data-testid="input-total-payment"
                            readOnly
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remaining_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remaining Payment</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            {...field}
                            data-testid="input-remaining-payment"
                            readOnly
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 5. Amount (Advance Payment) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedType === 'purchase' ? 'Amount (Advance Payment)' : 'Amount (Advance Payment)'} 
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-amount"
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow numbers and decimal point
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                field.onChange(value);
                                // Update remaining payment when amount changes
                                const enteredAmount = parseFloat(value) || 0;
                                const remaining = Math.max(0, calculatedTotal - enteredAmount);
                                setRemainingPayment(remaining);
                                form.setValue('remaining_payment', remaining.toFixed(2));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-muted-foreground">
                          Enter the advance payment amount. The remaining amount will be calculated automatically.
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

                {/* 6. Account Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {selectedType === 'purchase' ? (
                    // Purchase: From Account (Source Account)
                    <FormField
                      control={form.control}
                      name="source_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Account <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-source-account">
                                <SelectValue placeholder="Select source account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {accounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.account_number}) - {account.balance} PKR
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    // Sale: To Account (Destination Account)
                    <FormField
                      control={form.control}
                      name="destination_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Account <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-destination-account">
                                <SelectValue placeholder="Select destination account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {accounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.account_number}) - {account.balance} PKR
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* 7. Account Payable/Account Receivable Selection */}
                  {selectedType === 'purchase' ? (
                    // Purchase: Account Payable (Filtered based on selected products)
                    <FormField
                      control={form.control}
                      name="account_payable_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Payable <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-account-payable">
                                <SelectValue placeholder="Select account payable" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedProductIds.length === 0 ? (
                                <SelectItem value="no-products" disabled>
                                  Add products first to see linked account payables
                                </SelectItem>
                              ) : filteredAccountPayables.length > 0 ? (
                                filteredAccountPayables.map((accountPayable: any) => (
                                  <SelectItem key={accountPayable.id} value={accountPayable.id}>
                                    {accountPayable.name} - {accountPayable.city}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-account-payables" disabled>
                                  No account payables linked to selected products
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {selectedProductIds.length > 0 && filteredAccountPayables.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              No account payables are linked to the selected products. You may need to add account-payable-product relationships first.
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  ) : (
                    // Sale: Account Receivable
                    <FormField
                      control={form.control}
                      name="account_receivable_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Receivable <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-account-receivable">
                                <SelectValue placeholder="Select account receivable" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accountReceivables?.map((accountReceivable: any) => (
                                <SelectItem key={accountReceivable.id} value={accountReceivable.id}>
                                  {accountReceivable.name} - {accountReceivable.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* 8. Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Transaction description..."
                            {...field}
                            data-testid="input-description"
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
                        <FormLabel>Payment Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-mode">
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
                </div>
              </div>
            ) : (
              // Default field order for other transaction types
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {/* Transaction Type - Always shown */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={handleTypeChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount - Always shown */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-amount"
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow numbers and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            field.onChange(value);
                            // Check balance in real-time for transfer transactions
                            if (selectedType === 'transfer') {
                              const sourceAccountId = form.getValues('source_account_id');
                              if (sourceAccountId && value) {
                                checkBalance(sourceAccountId, value);
                              }
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {insufficientBalance.isInsufficient && selectedType === 'transfer' && (
                      <div className="text-sm text-destructive mt-1">
                        ⚠️ Insufficient balance! Available: {insufficientBalance.availableBalance.toFixed(2)} PKR, 
                        Required: {insufficientBalance.transferAmount.toFixed(2)} PKR
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Description - Always shown */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Transaction description..."
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Mode - Always shown */}
              <FormField
                control={form.control}
                name="mode_of_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-mode">
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

              {/* Transaction Date - Always shown */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source Account - Show for transfer and other relevant types */}
              {fieldsToShow.includes('source_account_id') && (
                <FormField
                  control={form.control}
                  name="source_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Check balance and same account when source account changes for transfer transactions
                          if (selectedType === 'transfer') {
                            const amount = form.getValues('amount');
                            const destinationAccountId = form.getValues('destination_account_id');
                            
                            if (value && amount) {
                              checkBalance(value, amount.toString());
                            }
                            if (value && destinationAccountId) {
                              checkSameAccount(value, destinationAccountId);
                            }
                          }
                        }} 
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-source-account">
                            <SelectValue placeholder="Select account to transfer from" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts?.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.account_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Destination Account - Show for deposit and other relevant types */}
              {fieldsToShow.includes('destination_account_id') && (
                <FormField
                  control={form.control}
                  name="destination_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Check for same account when destination changes for transfer transactions
                          if (selectedType === 'transfer') {
                            const sourceAccountId = form.getValues('source_account_id');
                            if (sourceAccountId && value) {
                              checkSameAccount(sourceAccountId, value);
                            }
                          }
                        }} 
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-destination-account">
                            <SelectValue placeholder="Select account to transfer to" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts?.map((account: any) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.account_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {sameAccountError && selectedType === 'transfer' && (
                        <div className="text-sm text-destructive mt-1">
                          ⚠️ From and To accounts must be different!
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              )}

              {/* Vendor - Show for purchase and other relevant types */}
              {fieldsToShow.includes('vendor_id') && (
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors?.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Account Receivable - Show for sale and other relevant types */}
              {fieldsToShow.includes('account_receivable_id') && (
                <FormField
                  control={form.control}
                  name="account_receivable_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Receivable</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-account-receivable">
                            <SelectValue placeholder="Select account receivable" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountReceivables?.map((accountReceivable: any) => (
                            <SelectItem key={accountReceivable.id} value={accountReceivable.id}>
                              {accountReceivable.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Purchaser - Show for relevant types */}
              {fieldsToShow.includes('purchaser_id') && (
                <FormField
                  control={form.control}
                  name="purchaser_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchaser</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-purchaser">
                            <SelectValue placeholder="Select purchaser" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {purchasers?.map((purchaser: any) => (
                            <SelectItem key={purchaser.id} value={purchaser.id}>
                              {purchaser.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}


              {/* Total Payment - Show for relevant types */}
              {fieldsToShow.includes('total_payment') && (
                <FormField
                  control={form.control}
                  name="total_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Payment</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-total-payment"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Remaining Payment - Show for relevant types */}
              {fieldsToShow.includes('remaining_payment') && (
                <FormField
                  control={form.control}
                  name="remaining_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remaining Payment</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-remaining-payment"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                data-testid="button-cancel"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || (selectedType === 'transfer' && (insufficientBalance.isInsufficient || sameAccountError))}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                data-testid="button-save"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{mode === 'create' ? 'Create Transaction' : 'Update Transaction'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
