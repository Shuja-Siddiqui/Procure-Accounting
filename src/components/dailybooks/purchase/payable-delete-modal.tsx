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

interface Payable {
  id: string;
  account_payable_id: string;
  transaction_id: string;
  amount: string | number;
  total_payment: string | number;
  remaining_payment: string | number;
  status: 'pending' | 'partial_pending' | 'paid';
  description?: string | null;
  accountPayable?: {
    id: string;
    name: string;
  };
}

interface PayableDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: Payable | null;
  onSuccess: () => void;
}

export function PayableDeleteModal({ isOpen, onClose, payable, onSuccess }: PayableDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (payableId: string) => {
      // payableId is actually transaction_id now
      return apiRequest('DELETE', `/api/transactions/${payableId}`);
    },
    onSuccess: () => {
      // /api/payables routes removed - use /api/transactions instead
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payable",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (payable) {
      deleteMutation.mutate(payable.id);
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
      <AlertDialogContent data-testid="payable-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Payable
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this payable? This action cannot be undone.
            {payable && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Payable Details:</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div><strong>Payable ID:</strong> {payable.id}</div>
                  {payable.accountPayable && (
                    <div><strong>Vendor:</strong> {payable.accountPayable.name}</div>
                  )}
                  <div><strong>Amount:</strong> {formatCurrency(payable.amount)}</div>
                  <div><strong>Paid:</strong> {formatCurrency(payable.total_payment)}</div>
                  <div><strong>Remaining:</strong> {formatCurrency(payable.remaining_payment)}</div>
                  <div><strong>Status:</strong> {payable.status}</div>
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
            {isPending ? 'Deleting...' : 'Delete Payable'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

