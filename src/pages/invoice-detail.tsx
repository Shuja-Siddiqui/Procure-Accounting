import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Trash2,
  Package,
  DollarSign,
  Building2,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { InvoiceDeleteModal } from "@/components/invoices/invoice-delete-modal";
import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { InvoicePrintModal } from "@/components/invoices/invoice-print-modal";
import { useState } from "react";

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
    cnic?: string;
    city?: string;
    address?: string;
    status: 'active' | 'inactive';
  };
  products: Array<{
    id: string;
    product_id: string;
    units_of_product: number;
    amount_of_product: string;
    created_at: string;
    product: {
      id: string;
      name: string;
      brand?: string;
      unit?: string;
      current_price?: number;
      construction_category?: 'grey' | 'finishing' | 'both';
    };
  }>;
}

export default function InvoiceDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Get invoice ID from URL params
  const invoiceId = window.location.pathname.split('/').pop();

  // Fetch invoice details
  const { data: invoiceData, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: Invoice;
  }>({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/invoices/${invoiceId}`), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: !!invoiceId,
  });

  const invoice = invoiceData?.data;

  const handleEdit = () => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = () => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setIsDeleteModalOpen(true);
    }
  };

  const handlePrint = () => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setIsPrintModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsPrintModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleSuccess = () => {
    refetch();
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6" data-testid="invoice-detail-page">
        <div className="space-y-6">
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

  if (error || !invoice) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6" data-testid="invoice-detail-page">
        <div className="space-y-6">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Invoice not found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The invoice you're looking for doesn't exist or has been deleted.
            </p>
            <Button 
              onClick={() => setLocation('/invoices')} 
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="invoice-detail-page">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setLocation('/invoices')} 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 border flex-shrink-0"
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{invoice.invoice_number}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Invoice Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-initial">
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-initial">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 sm:flex-initial">
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Invoice Information Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                <p className="text-sm font-mono">{invoice.invoice_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                <p className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Receivable Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Receivable Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Receivable Name</label>
                <p className="text-sm">{invoice.accountReceivable.name}</p>
              </div>
              {invoice.accountReceivable.number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {invoice.accountReceivable.number}
                  </p>
                </div>
              )}
              {invoice.accountReceivable.city && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {invoice.accountReceivable.city}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={invoice.accountReceivable.status === 'active' ? 'default' : 'secondary'}>
                    {invoice.accountReceivable.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
            <CardDescription>
              Products included in this invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoice.products && invoice.products.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.products.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              {item.product.construction_category && (
                                <Badge variant="outline" className="mt-1">
                                  {item.product.construction_category}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.product.brand || '-'}</TableCell>
                          <TableCell>{item.product.unit || '-'}</TableCell>
                          <TableCell className="text-right">{item.units_of_product}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount_of_product)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.units_of_product * parseFloat(item.amount_of_product))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {invoice.products.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="font-medium text-sm">{item.product.name}</div>
                      {item.product.construction_category && (
                        <Badge variant="outline" className="text-xs">
                          {item.product.construction_category}
                        </Badge>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground">Brand</span>
                          <div>{item.product.brand || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Unit</span>
                          <div>{item.product.unit || '-'}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Quantity</span>
                          <div className="font-medium">{item.units_of_product}</div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Unit Price</span>
                          <div>{formatCurrency(item.amount_of_product)}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <span className="text-sm font-semibold">
                            {formatCurrency(item.units_of_product * parseFloat(item.amount_of_product))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No products</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No products have been added to this invoice.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Amount Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Total Amount Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Total Items</label>
                <p className="text-base sm:text-lg font-semibold">{invoice.products?.length || 0} product(s)</p>
              </div>
            </div>
            {invoice.products && invoice.products.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <p>Breakdown by product:</p>
                  <ul className="mt-2 space-y-1">
                    {invoice.products.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.product.name} (×{item.units_of_product})</span>
                        <span>{formatCurrency(item.units_of_product * parseFloat(item.amount_of_product))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(invoice.created_at), 'PPP p')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(invoice.updated_at), 'PPP p')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <InvoiceFormModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          mode="edit"
          invoice={selectedInvoice}
          onSuccess={handleSuccess}
        />

        <InvoiceDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
          invoice={selectedInvoice}
          onSuccess={handleSuccess}
        />

        <InvoicePrintModal
          isOpen={isPrintModalOpen}
          onClose={handleModalClose}
          invoice={selectedInvoice}
        />
      </div>
    </div>
  );
}
