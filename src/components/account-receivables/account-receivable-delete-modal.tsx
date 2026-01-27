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
import { Loader2, AlertTriangle } from "lucide-react";

interface AccountReceivable {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  address?: string;
  status: 'active' | 'inactive';
  construction_category?: 'grey' | 'finishing' | 'both';
  created_at: string;
  updated_at: string;
}

interface AccountReceivableDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountReceivable: AccountReceivable | null;
  onSuccess: () => void;
}

export function AccountReceivableDeleteModal({ isOpen, onClose, accountReceivable, onSuccess }: AccountReceivableDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (accountReceivableId: string) => 
      apiRequest('DELETE', `/api/account-receivables/${accountReceivableId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-receivables/stats'] });
      toast({
        title: "Success",
        description: "Account Receivable deleted successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account receivable",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (accountReceivable) {
      deleteMutation.mutate(accountReceivable.id);
    }
  };

  const isPending = deleteMutation.isPending;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="account-receivable-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Account Receivable
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{accountReceivable?.name}</strong>? This action cannot be undone.
            {accountReceivable?.city && (
              <span className="block mt-2 text-sm text-muted-foreground">
                Location: {accountReceivable.city}
              </span>
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
            {isPending ? 'Deleting...' : 'Delete Account Receivable'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

