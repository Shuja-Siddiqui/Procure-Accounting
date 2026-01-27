import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertTriangle, FileText } from "lucide-react";

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

interface InvoiceDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function InvoiceDeleteModal({ isOpen, onClose, invoice, onSuccess }: InvoiceDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (invoiceId: string) => 
      apiRequest('DELETE', `/api/invoices/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/stats'] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (invoice) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const isPending = deleteMutation.isPending;

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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="invoice-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Invoice
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice <strong>{invoice?.invoice_number}</strong>? This action cannot be undone.
            {invoice && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Invoice Details:</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div><strong>Account Receivable:</strong> {invoice.accountReceivable.name}</div>
                  <div><strong>Amount:</strong> {formatCurrency(invoice.total_amount)}</div>
                  <div><strong>Status:</strong> {invoice.status}</div>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isPending}
            data-testid="button-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-delete"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isPending ? 'Deleting...' : 'Delete Invoice'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}






