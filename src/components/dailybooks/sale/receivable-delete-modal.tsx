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

interface Receivable {
  id: string;
  account_receivable_id: string;
  transaction_id: string;
  amount: string | number;
  total_payment: string | number;
  remaining_payment: string | number;
  status: 'pending' | 'partial_pending' | 'paid';
  description?: string | null;
  accountReceivable?: {
    id: string;
    name: string;
  };
}

interface ReceivableDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: Receivable | null;
  onSuccess: () => void;
}

export function ReceivableDeleteModal({ isOpen, onClose, receivable, onSuccess }: ReceivableDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (receivableId: string) => {
      // receivableId is actually transaction_id now
      return apiRequest('DELETE', `/api/transactions/${receivableId}`);
    },
    onSuccess: () => {
      // /api/receivables routes removed - use /api/transactions instead
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete receivable",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (receivable) {
      deleteMutation.mutate(receivable.id);
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
      <AlertDialogContent data-testid="receivable-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Receivable
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this receivable? This action cannot be undone.
            {receivable && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Receivable Details:</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div><strong>Receivable ID:</strong> {receivable.id}</div>
                  {receivable.accountReceivable && (
                    <div><strong>Client:</strong> {receivable.accountReceivable.name}</div>
                  )}
                  <div><strong>Amount:</strong> {formatCurrency(receivable.amount)}</div>
                  <div><strong>Received:</strong> {formatCurrency(receivable.total_payment)}</div>
                  <div><strong>Remaining:</strong> {formatCurrency(receivable.remaining_payment)}</div>
                  <div><strong>Status:</strong> {receivable.status}</div>
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
            {isPending ? 'Deleting...' : 'Delete Receivable'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

