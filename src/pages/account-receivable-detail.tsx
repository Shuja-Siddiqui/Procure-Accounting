import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Phone, MapPin, Building2, Calendar, Eye, DollarSign, Receipt } from "lucide-react";
import { format } from "date-fns";
import { CopyableId } from "@/components/ui/copyable-id";
import { ReceivableInvoiceViewModal } from "@/components/dailybooks/sale/receivable-invoice-view-modal";
import { ReceivablePrintModal } from "@/components/dailybooks/sale/receivable-print-modal";
import { AccountReceivableFormModal } from "@/components/account-receivables/account-receivable-form-modal";
import { AccountReceivableDeleteModal } from "@/components/account-receivables/account-receivable-delete-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl } from "@/lib/queryClient";

interface AccountReceivable {
  id: string;
  ar_id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  address?: string;
  status: 'active' | 'inactive';
  balance?: string | number;
  construction_category?: 'grey' | 'finishing' | 'both';
  created_at: string;
  updated_at: string;
}


export default function AccountReceivableDetailPage() {
  const [location, setLocation] = useLocation();
  const accountReceivableId = location.split('/').pop();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);
  const [isReceivableViewOpen, setIsReceivableViewOpen] = useState(false);
  const [isReceivablePrintOpen, setIsReceivablePrintOpen] = useState(false);
  const [printReceivable, setPrintReceivable] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accountReceivableData, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: AccountReceivable;
  }>({
    queryKey: ['/api/account-receivables', accountReceivableId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/account-receivables/${accountReceivableId}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!accountReceivableId,
  });

  const accountReceivable = accountReceivableData?.data;


  // Fetch ALL transactions for this account receivable
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<{
    success: boolean;
    data: any[];
  }>({
    queryKey: ['/api/transactions', accountReceivableId, 'all'],
    queryFn: async () => {
      // Fetch all transactions for this account receivable
      const params = new URLSearchParams();
      params.append('account_receivable_id', accountReceivableId!);

      const response = await fetch(getApiUrl(`/api/transactions?${params.toString()}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Transform transactions to receivables format for compatibility
      const transformedData = {
        ...data,
        data: (data.data || []).map((tx: any) => ({
          id: tx.id,
          account_receivable_id: tx.account_receivable_id,
          transaction_id: tx.id,
          total_amount: tx.total_amount || '0.00',
          paid_amount: tx.paid_amount || '0.00',
          remaining_payment: tx.remaining_payment || '0.00',
          status: parseFloat(tx.remaining_payment || '0') === 0 ? 'paid' :
            (parseFloat(tx.paid_amount || '0') > 0 ? 'partial_pending' : 'pending'),
          description: tx.description,
          due_date: tx.date,
          sale_invoice_number: tx.sale_invoice_number,
          receipt_invoice_number: tx.receipt_invoice_number,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          transaction: tx,
        })),
      };
      return transformedData;
    },
    enabled: !!accountReceivableId,
  });

  const receivables = transactionsData?.data || [];

  // Calculate stats from transactions
  const { data: receivablesStatsData, isLoading: receivablesStatsLoading } = useQuery<{
    success: boolean;
    data: {
      totalReceivables: number;
      totalAmount: number;
      totalPaid: number;
      totalRemaining: number;
    };
  }>({
    queryKey: ['/api/transactions/stats', accountReceivableId, 'sale'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('account_receivable_id', accountReceivableId!);
      params.append('type', 'sale');

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
          totalReceivables: transactions.length,
          totalAmount,
          totalPaid,
          totalRemaining,
        },
      };
    },
    enabled: !!accountReceivableId,
  });

  const handleViewReceivable = (receivable: any) => {
    setSelectedReceivableId(receivable.id);
    setIsReceivableViewOpen(true);
  };

  const handlePrintReceivable = async (receivable: any) => {
    try {
      // Fetch full transaction details with products for printing (replacing receivables)
      const response = await apiRequest('GET', `/api/transactions/${receivable.transaction_id}/relations`);
      // Transform transaction to receivable format
      const tx = response.data;
      const transformedReceivable = {
        ...receivable,
        transaction: tx,
      };
      setPrintReceivable(transformedReceivable);
      setIsReceivablePrintOpen(true);
    } catch (error) {
      console.error('Error fetching transaction details for print:', error);
    }
  };

  const handleEdit = () => {
    if (accountReceivable) {
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = () => {
    if (accountReceivable) {
      setIsDeleteModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  const handleSuccess = () => {
    refetch();
    handleModalClose();
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "Success",
      description: "Account Receivable deleted successfully",
    });
    setLocation('/account-receivables');
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (transactionType: string | undefined) => {
    if (!transactionType) return null;

    if (transactionType === 'receive_able' || transactionType === 'receive_able_vendor' || transactionType === 'advance_sale_payment') {
      return <Badge className="bg-blue-100 text-blue-800">Receipt</Badge>;
    } else if (transactionType === 'sale' || transactionType === 'advance_sale_inventory') {
      return <Badge className="bg-green-100 text-green-800">Sale</Badge>;
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grey':
        return 'bg-gray-100 text-gray-800';
      case 'finishing':
        return 'bg-blue-100 text-blue-800';
      case 'both':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '₨0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="account-receivable-detail-page">
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !accountReceivable) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="account-receivable-detail-page">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/account-receivables">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Account Receivables
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Account Receivable Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The account receivable you're looking for doesn't exist or has been deleted.
              </p>
              <Link href="/account-receivables">
                <Button>Back to Account Receivables</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="client-detail-page">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/account-receivables')}
              className="h-8 w-8 border flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 truncate">
                {accountReceivable.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Account Receivable Details & Information
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
                Core details about this accountReceivable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Receivable Name</label>
                <p className="text-lg font-semibold">{accountReceivable.name}</p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={accountReceivable.status === 'active' ? 'default' : 'secondary'}>
                    {accountReceivable.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">AR ID</label>
                  <p className="text-sm font-mono text-muted-foreground">{accountReceivable.ar_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Internal ID</label>
                  <p className="text-xs font-mono text-muted-foreground break-all">{accountReceivable.id}</p>
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
                How to reach this accountReceivable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountReceivable.number ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {accountReceivable.number}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-muted-foreground italic">No phone number provided</p>
                </div>
              )}

              <Separator />

              {accountReceivable.city ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {accountReceivable.city}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-muted-foreground italic">No city specified</p>
                </div>
              )}

              {accountReceivable.address && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm mt-1 whitespace-pre-line">{accountReceivable.address}</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(accountReceivable.created_at), 'PPP p')}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(accountReceivable.updated_at), 'PPP p')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Summary */}
        {/* {(receivablesStatsData?.data || receivables.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Transaction Summary
              </CardTitle>
              <CardDescription>
                Overview of transactions and receipts with this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receivablesStatsLoading ? (
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
                      {receivables.length || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {formatCurrency(receivablesStatsData?.data?.totalAmount || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Amount</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(receivablesStatsData?.data?.totalPaid || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Received</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(receivablesStatsData?.data?.totalRemaining || accountReceivable.balance || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Outstanding Balance</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )} */}

        {/* Receivables Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receivables
            </CardTitle>
            <CardDescription>
              All transactions related to this account receivable
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : receivables && receivables.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {receivables.length} receivable{receivables.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receivable ID</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Total Received</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables.map((receivable: any) => (
                        <TableRow key={receivable.id}>
                          <TableCell className="font-mono text-sm">
                            <CopyableId id={receivable.id} />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <CopyableId id={receivable.transaction_id} />
                          </TableCell>
                          <TableCell>
                            {getTransactionTypeBadge(receivable.transaction?.type)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 font-semibold">
                              {/* <DollarSign className="h-3 w-3" /> */}
                              {formatCurrency(receivable.total_amount ?? receivable.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(receivable.paid_amount ?? receivable.total_payment)}
                          </TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            {formatCurrency(receivable.remaining_payment || '0.00')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {receivable.created_at ? format(new Date(receivable.created_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReceivable(receivable)}
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
                  {receivables.map((receivable: any) => (
                    <div key={receivable.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Receivable ID</span>
                          <CopyableId id={receivable.id} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Transaction ID</span>
                          <CopyableId id={receivable.transaction_id} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Type</span>
                          {getTransactionTypeBadge(receivable.transaction?.type)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground">Amount</span>
                          <div className="flex items-center gap-1 font-semibold">
                            {/* <DollarSign className="h-3 w-3" /> */}
                            {formatCurrency(receivable.total_amount ?? receivable.amount)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Total Received</span>
                          <div className="text-green-600 font-medium">
                            {formatCurrency(receivable.paid_amount ?? receivable.total_payment)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Remaining</span>
                          <div className="text-orange-600 font-medium">{formatCurrency(receivable.remaining_payment || '0.00')}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Created</span>
                          <div className="text-xs">
                            {receivable.created_at ? format(new Date(receivable.created_at), 'MMM d, yyyy') : '-'}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceivable(receivable)}
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
                <p>No receivables found</p>
                <p className="text-sm">Receivables will appear here when sale transactions are created</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receivable Invoice View Modal */}
      <ReceivableInvoiceViewModal
        isOpen={isReceivableViewOpen}
        onClose={() => {
          setIsReceivableViewOpen(false);
          setSelectedReceivableId(null);
        }}
        receivableId={selectedReceivableId}
        onPrint={handlePrintReceivable}
      />

      {/* Receivable Print Modal */}
      <ReceivablePrintModal
        isOpen={isReceivablePrintOpen}
        onClose={() => {
          setIsReceivablePrintOpen(false);
          setPrintReceivable(null);
        }}
        receivable={printReceivable}
        keepDetailModalOpen={isReceivableViewOpen}
      />

      {/* Edit Modal */}
      <AccountReceivableFormModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        mode="edit"
        accountReceivable={accountReceivable as any}
        onSuccess={handleSuccess}
      />

      {/* Delete Modal */}
      <AccountReceivableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleModalClose}
        accountReceivable={accountReceivable}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
