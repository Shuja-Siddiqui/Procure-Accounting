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
import type { Transaction } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface TransactionDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionDeleteModal({ isOpen, onClose, transaction }: TransactionDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => 
      apiRequest('DELETE', `/api/transactions/${transaction?.id}`),
    onSuccess: () => {
      // Invalidate all relevant queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      
      // Invalidate specific account queries if transaction affects accounts
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
        description: "Transaction deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (transaction) {
      deleteMutation.mutate();
    }
  };

  const isPending = deleteMutation.isPending;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="transaction-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
            {transaction && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Transaction Details:</p>
                <p className="text-sm text-muted-foreground">
                  Type: {transaction.type}
                </p>
                <p className="text-sm text-muted-foreground">
                  Amount: ₨{transaction.amount || '0.00'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Description: {transaction.description || 'No description'}
                </p>
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
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Delete Transaction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
