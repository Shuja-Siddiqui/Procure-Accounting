import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  User,
  Clock,
  Package,
  DollarSign,
  ShoppingCart,
  Receipt,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { CopyableId } from "@/components/ui/copyable-id";
import { AccountPayableDeleteModal } from "@/components/account-payables/account-payable-delete-modal";
import { AccountPayableFormModal } from "@/components/account-payables/account-payable-form-modal";
import { PayableInvoiceViewModal } from "@/components/dailybooks/purchase/payable-invoice-view-modal";
import { PayablePrintModal } from "@/components/dailybooks/purchase/payable-print-modal";
import { useState } from "react";

interface AccountPayable {
  id: string;
  ap_id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  balance?: string | number;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  unit?: string;
  current_price?: number;
  construction_category?: 'grey' | 'finishing' | 'both';
  created_at: string;
  updated_at: string;
  junction_id: string;
  junction_created_at: string;
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
  junction_id: string;
  junction_created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  created_at: string;
  source_account_id?: string;
  destination_account_id?: string;
  source_account_name?: string;
  destination_account_name?: string;
  opening_balance?: string;
  closing_balance?: string;
  mode_of_payment?: string;
  date?: string;
  total_payment?: string;
  remaining_payment?: string;
}

export default function AccountPayableDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccountPayable, setSelectedAccountPayable] = useState<AccountPayable | null>(null);
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(null);
  const [isPayableViewOpen, setIsPayableViewOpen] = useState(false);
  const [isPayablePrintOpen, setIsPayablePrintOpen] = useState(false);
  const [printPayable, setPrintPayable] = useState<any | null>(null);

  // Get accountPayable ID from URL params
  const accountPayableId = window.location.pathname.split('/').pop();

  // Fetch accountPayable details
  const { data: accountPayableData, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: AccountPayable;
  }>({
    queryKey: ['/api/account-payables', accountPayableId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/account-payables/${accountPayableId}`), { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('AccountPayable not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!accountPayableId,
  });

  // Fetch products for this accountPayable
  const { data: productsData, isLoading: productsLoading } = useQuery<{
    success: boolean;
    data: Product[];
  }>({
    queryKey: ['/api/account-payable-products/account-payable', accountPayableId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/account-payable-products/account-payable/${accountPayableId}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!accountPayableId,
  });

  // Fetch purchasers for this accountPayable
  const { data: purchasersData, isLoading: purchasersLoading } = useQuery<{
    success: boolean;
    data: Purchaser[];
  }>({
    queryKey: ['/api/purchaser-account-payables/account-payable', accountPayableId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/purchaser-account-payables/account-payable/${accountPayableId}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!accountPayableId,
  });

  // Fetch ALL payables for this vendor (both purchase and payment transactions)
  // Fetch transactions for this account payable (replacing payables)
  const { data: transactionsData, isLoading: payablesLoading } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ['/api/transactions', accountPayableId, 'all'],
    queryFn: async () => {
      // Fetch purchase, payable_advance, and pay_able transactions
      const params = new URLSearchParams();
      params.append('account_payable_id', accountPayableId!);

      const response = await fetch(getApiUrl(`/api/transactions?${params.toString()}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Transform transactions to payables format for compatibility
      const transformedData = {
        ...data,
        data: (data.data || []).map((tx: any) => ({
          id: tx.id,
          account_payable_id: tx.account_payable_id,
          transaction_id: tx.id,
          total_amount: tx.total_amount || '0.00',
          paid_amount: tx.paid_amount || '0.00',
          remaining_payment: tx.remaining_payment || '0.00',
          status: parseFloat(tx.remaining_payment || '0') === 0 ? 'paid' :
            (parseFloat(tx.paid_amount || '0') > 0 ? 'partial_pending' : 'pending'),
          description: tx.description,
          due_date: tx.date,
          purchase_invoice_number: tx.purchase_invoice_number,
          payment_invoice_number: tx.payment_invoice_number,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          transaction: tx,
        })),
      };
      return transformedData;
    },
    enabled: !!accountPayableId,
  });

  // Calculate stats from transactions (replacing payables stats)
  const { data: payablesStatsData, isLoading: payablesStatsLoading } = useQuery<{
    success: boolean;
    data: {
      totalPayables: number;
      totalAmount: number;
      totalPaid: number;
      totalRemaining: number;
    };
  }>({
    queryKey: ['/api/transactions/stats', accountPayableId, 'purchase'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('account_payable_id', accountPayableId!);
      params.append('type', 'purchase');

      const response = await fetch(getApiUrl(`/api/transactions?${params.toString()}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const transactions = data.data || [];

      const totalAmount = transactions.reduce((sum: number, tx: any) =>
        sum + parseFloat(tx.total_amount || '0'), 0);
      const totalPaid = transactions.reduce((sum: number, tx: any) =>
        sum + parseFloat(tx.paid_amount || '0'), 0);
      const totalRemaining = transactions.reduce((sum: number, tx: any) =>
        sum + parseFloat(tx.remaining_payment || '0'), 0);

      return {
        success: true,
        data: {
          totalPayables: transactions.length,
          totalAmount,
          totalPaid,
          totalRemaining,
        },
      };
    },
    enabled: !!accountPayableId,
  });

  const accountPayable = accountPayableData?.data;
  const purchasers = purchasersData?.data || [];
  const payables = transactionsData?.data || [];

  // Helper functions
  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (transactionType: string | undefined) => {
    if (!transactionType) return null;

    if (transactionType === 'pay_able') {
      return <Badge className="bg-blue-100 text-blue-800">Payment</Badge>;
    } else if (transactionType === 'purchase' || transactionType === 'advance_purchase_inventory') {
      return <Badge className="bg-green-100 text-green-800">Purchase</Badge>;
    }
    return null;
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      deposit: 'Deposit',
      transfer: 'Transfer',
      purchase: 'Purchase',
      purchase_return: 'Purchase Return',
      sale: 'Sale',
      sale_return: 'Sale Return',
      advance_purchase_inventory: 'Advance Purchase Inventory',
      advance_sale_payment: 'Advance Sale Payment',
      advance_purchase_payment: 'Advance Purchase Payment',
      advance_sale_inventory: 'Advance Sale Inventory',
      asset_purchase: 'Asset Purchase',
      loan: 'Loan',
      loan_return: 'Loan Return',
      other_expense: 'Other Expense',
      lost_and_damage: 'Lost and Damage',
      pay_able: 'Payable',
      receive_able: 'Receivable',
    };
    return typeMap[type] || type;
  };

  const handleViewPayable = (payable: any) => {
    setSelectedPayableId(payable.id);
    setIsPayableViewOpen(true);
  };

  const handlePrintPayable = async (payable: any) => {
    try {
      // Fetch full transaction details with products for printing (replacing payables)
      const response = await apiRequest('GET', `/api/transactions/${payable.transaction_id}/relations`);
      // Transform transaction to payable format
      const tx = response.data;
      const transformedPayable = {
        ...payable,
        transaction: tx,
      };
      setPrintPayable(transformedPayable);
      setIsPayablePrintOpen(true);
    } catch (error) {
      console.error('Error fetching transaction details for print:', error);
    }
  };

  const handleEdit = () => {
    if (accountPayable) {
      setSelectedAccountPayable(accountPayable);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = () => {
    if (accountPayable) {
      setSelectedAccountPayable(accountPayable);
      setIsDeleteModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedAccountPayable(null);
  };

  const handleSuccess = () => {
    refetch();
    handleModalClose();
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "Success",
      description: "AccountPayable deleted successfully",
    });
    setLocation('/account-payables');
  };

  // Delete purchaser relationship mutation
  const queryClient = useQueryClient();
  const deletePurchaserMutation = useMutation({
    mutationFn: (junctionId: string) =>
      apiRequest('DELETE', `/api/purchaser-accountPayables/${junctionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchaser-account-payables/account-payable', accountPayableId] });
      toast({
        title: "Success",
        description: "Purchaser relationship removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove purchaser relationship",
        variant: "destructive",
      });
    },
  });

  const handleDeletePurchaser = (purchaser: Purchaser) => {
    deletePurchaserMutation.mutate(purchaser.junction_id);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="accountPayable-detail-page">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !accountPayable) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="accountPayable-detail-page">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/account-payables">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to AccountPayables
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">AccountPayable Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The accountPayable you're looking for doesn't exist or has been deleted.
              </p>
              <Link href="/account-payables">
                <Button>Back to AccountPayables</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="accountPayable-detail-page">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/account-payables')}
              className="h-8 w-8 border flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 truncate">
                {accountPayable.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                AccountPayable Details & Information
              </p>
            </div>
          </div>

          {/* <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-initial">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 sm:flex-initial">
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div> */}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Core details about this accountPayable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">AccountPayable Name</label>
                <p className="text-lg font-semibold">{accountPayable.name}</p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={accountPayable.status === 'active' ? 'default' : 'secondary'}>
                    {accountPayable.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">AP ID</label>
                  <p className="text-sm font-mono text-muted-foreground">{accountPayable.ap_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Internal ID</label>
                  <p className="text-xs font-mono text-muted-foreground break-all">{accountPayable.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How to reach this accountPayable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountPayable.number ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {accountPayable.number}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-muted-foreground italic">No phone number provided</p>
                </div>
              )}

              <Separator />

              {accountPayable.city ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {accountPayable.city}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-muted-foreground italic">No city specified</p>
                </div>
              )}

              {accountPayable.address && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm mt-1 whitespace-pre-line">{accountPayable.address}</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(accountPayable.created_at), 'PPP p')}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(accountPayable.updated_at), 'PPP p')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Summary */}
        {/* {(payablesStatsData?.data || payables.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Transaction Summary
              </CardTitle>
              <CardDescription>
                Overview of transactions and payments with this vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payablesStatsLoading ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      {payables.length || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {formatCurrency(payablesStatsData?.data?.totalAmount || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Amount</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(payablesStatsData?.data?.totalPaid || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Paid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(payablesStatsData?.data?.totalRemaining || accountPayable.balance || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Outstanding Balance</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )} */}

        {/* Associated Purchasers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Associated Purchasers
            </CardTitle>
            <CardDescription>
              Purchasers that deal with this accountPayable
            </CardDescription>
          </CardHeader>
          <CardContent>
            {purchasersLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : purchasers.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {purchasers.length} purchaser{purchasers.length !== 1 ? 's' : ''} associated
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Purchaser Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>CNIC</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchasers.map((purchaser) => (
                        <TableRow key={purchaser.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/purchasers/${purchaser.id}`}
                              className="hover:underline hover:text-blue-600 transition-colors"
                            >
                              {purchaser.name}
                            </Link>
                          </TableCell>
                          <TableCell>{purchaser.number || '-'}</TableCell>
                          <TableCell>{purchaser.cnic || '-'}</TableCell>
                          <TableCell>{purchaser.city || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              purchaser.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }>
                              {purchaser.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {format(new Date(purchaser.junction_created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeletePurchaser(purchaser)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Purchaser
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {purchasers.map((purchaser) => (
                    <div key={purchaser.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/purchasers/${purchaser.id}`}
                            className="font-medium text-sm hover:underline hover:text-blue-600 transition-colors block truncate"
                          >
                            {purchaser.name}
                          </Link>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeletePurchaser(purchaser)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Purchaser
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Contact</span>
                          <div>{purchaser.number || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">CNIC</span>
                          <div>{purchaser.cnic || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">City</span>
                          <div>{purchaser.city || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Status</span>
                          <div>
                            <Badge variant="outline" className={`text-xs ${purchaser.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                              {purchaser.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Added: </span>
                        <span className="text-xs">{format(new Date(purchaser.junction_created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                <p>No purchasers associated with this accountPayable</p>
                <p className="text-sm">Purchasers can be added when creating or editing the purchaser</p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Associated Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Associated Products
            </CardTitle>
            <CardDescription>
              Products that this accountPayable supplies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : productsData?.data && productsData.data.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {productsData.data.length} product{productsData.data.length !== 1 ? 's' : ''} associated
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsData.data.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <Link href={`/products/${product.id}`} className="hover:underline">
                              {product.name}
                            </Link>
                          </TableCell>
                          <TableCell>{product.brand || '-'}</TableCell>
                          <TableCell>{product.unit || '-'}</TableCell>
                          <TableCell>
                            {product.construction_category && (
                              <Badge variant="outline">
                                {product.construction_category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.current_price ? (
                              <span className="flex items-center justify-end gap-1">
                                {/* <DollarSign className="h-3 w-3" /> */}
                                {product.current_price}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {format(new Date(product.junction_created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {productsData.data.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="font-medium text-sm">
                        <Link href={`/products/${product.id}`} className="hover:underline">
                          {product.name}
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Brand</span>
                          <div>{product.brand || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Unit</span>
                          <div>{product.unit || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Category</span>
                          <div>
                            {product.construction_category ? (
                              <Badge variant="outline" className="text-xs">
                                {product.construction_category}
                              </Badge>
                            ) : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Price</span>
                          <div>
                            {product.current_price ? (
                              <span className="flex items-center gap-1">
                                {/* <DollarSign className="h-3 w-3" /> */}
                                {product.current_price}
                              </span>
                            ) : '-'}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Added: </span>
                        <span className="text-xs">{format(new Date(product.junction_created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2" />
                <p>No products associated with this accountPayable</p>
                <p className="text-sm">Products can be added when creating or editing the accountPayable</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payables Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payables
            </CardTitle>
            <CardDescription>
              All transactions related to this account payable
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payablesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : payables && payables.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {payables.length} payable{payables.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payable ID</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Total Paid</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payables.map((payable: any) => (
                        <TableRow key={payable.id}>
                          <TableCell className="font-mono text-sm">
                            <CopyableId id={payable.id} />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <CopyableId id={payable.transaction_id} />
                          </TableCell>
                          <TableCell>
                            {getTransactionTypeBadge(payable.transaction?.type)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 font-semibold">
                              {/* <DollarSign className="h-3 w-3" /> */}
                              {formatCurrency(payable.total_amount ?? payable.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(payable.paid_amount ?? payable.total_payment)}
                          </TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            {formatCurrency(payable.remaining_payment || '0.00')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payable.created_at ? format(new Date(payable.created_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPayable(payable)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {payables.map((payable: any) => (
                    <div key={payable.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Payable ID</span>
                          <CopyableId id={payable.id} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Transaction ID</span>
                          <CopyableId id={payable.transaction_id} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Type</span>
                          {getTransactionTypeBadge(payable.transaction?.type)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground">Amount</span>
                          <div className="flex items-center gap-1 font-semibold">
                            {/* <DollarSign className="h-3 w-3" /> */}
                            {formatCurrency(payable.total_amount ?? payable.amount)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Total Paid</span>
                          <div className="text-green-600 font-medium">
                            {formatCurrency(payable.paid_amount ?? payable.total_payment)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Remaining</span>
                          <div className="text-orange-600 font-medium">{formatCurrency(payable.remaining_payment || '0.00')}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Created</span>
                          <div className="text-xs">
                            {payable.created_at ? format(new Date(payable.created_at), 'MMM d, yyyy') : '-'}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPayable(payable)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2" />
                <p>No payables found</p>
                <p className="text-sm">Payables will appear here when purchase transactions are created</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <AccountPayableFormModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          mode="edit"
          accountPayable={selectedAccountPayable as any}
          onSuccess={handleSuccess}
        />

        {/* Delete Modal */}
        <AccountPayableDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
          accountPayable={selectedAccountPayable}
          onSuccess={handleDeleteSuccess}
        />

        {/* Payable Invoice View Modal */}
        <PayableInvoiceViewModal
          isOpen={isPayableViewOpen}
          onClose={() => {
            setIsPayableViewOpen(false);
            setSelectedPayableId(null);
          }}
          payableId={selectedPayableId}
          onPrint={handlePrintPayable}
        />

        {/* Payable Print Modal */}
        <PayablePrintModal
          isOpen={isPayablePrintOpen}
          onClose={() => {
            setIsPayablePrintOpen(false);
            setPrintPayable(null);
          }}
          payable={printPayable}
          keepDetailModalOpen={isPayableViewOpen}
        />
      </div>
    </div>
  );
}
