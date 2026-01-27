import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, FileText, DollarSign, Users, Calendar } from "lucide-react";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { InvoiceDeleteModal } from "@/components/invoices/invoice-delete-modal";
import { getApiUrl } from "@/lib/queryClient";

interface Invoice {
  id: string;
  account_receivable_id: string;
  invoice_number: string;
  total_amount: string;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
  accountReceivable: {
    id: string;
    name: string;
    number?: string;
    city?: string;
  };
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  accountReceivableBreakdown: Array<{ account_receivable_id: string; account_receivable_name: string; invoice_count: number; total_amount: number }>;
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accountReceivableFilter, setAccountReceivableFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch invoices with filters
  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<{
    success: boolean;
    data: Invoice[];
  }>({
    queryKey: ['/api/invoices', searchTerm, statusFilter, accountReceivableFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (accountReceivableFilter !== 'all') params.append('account_receivable_id', accountReceivableFilter);
      
      const response = await fetch(getApiUrl(`/api/invoices?${params.toString()}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  // Fetch invoice statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    data: InvoiceStats;
  }>({
    queryKey: ['/api/invoices/stats'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/invoices/stats'), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  // Fetch account receivables for filter
  const { data: accountReceivablesData } = useQuery<{
    success: boolean;
    data: Array<{ id: string; name: string; city?: string }>;
  }>({
    queryKey: ['/api/account-receivables'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/account-receivables'), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  const invoices = invoicesData?.data || [];
  const stats = statsData?.data || {
    totalInvoices: 0,
    totalAmount: 0,
    statusBreakdown: [],
    accountReceivableBreakdown: []
  };
  const accountReceivables = accountReceivablesData?.data || [];

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsCreateModalOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setLocation(`/invoices/${invoice.id}`);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditModalOpen(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleSuccess = () => {
    refetchInvoices();
    handleModalClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6" data-testid="invoices-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your invoices and billing
            </p>
          </div>
          <Button onClick={handleCreateInvoice} data-testid="create-invoice-button" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">{stats.totalInvoices}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.statusBreakdown.find(s => s.status === 'paid')?.count || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.statusBreakdown.find(s => s.status === 'pending')?.count || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Account Receivable</label>
                <Select value={accountReceivableFilter} onValueChange={setAccountReceivableFilter}>
                  <SelectTrigger data-testid="account-receivable-filter">
                    <SelectValue placeholder="All account receivables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Account Receivables</SelectItem>
                    {accountReceivables.map((accountReceivable) => (
                      <SelectItem key={accountReceivable.id} value={accountReceivable.id}>
                        {accountReceivable.name} {accountReceivable.city && `(${accountReceivable.city})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              {invoicesLoading ? "Loading invoices..." : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoicesTable
              invoices={invoices}
              isLoading={invoicesLoading}
              onView={handleViewInvoice}
              onEdit={handleEditInvoice}
              onDelete={handleDeleteInvoice}
            />
          </CardContent>
        </Card>

        {/* Modals */}
        <InvoiceFormModal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={handleModalClose}
          mode={isCreateModalOpen ? 'create' : 'edit'}
          invoice={selectedInvoice}
          onSuccess={handleSuccess}
        />

        <InvoiceDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
          invoice={selectedInvoice}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}






