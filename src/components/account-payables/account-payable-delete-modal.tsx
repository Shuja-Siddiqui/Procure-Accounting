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

interface AccountPayable {
  id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface AccountPayableDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountPayable: AccountPayable | null;
  onSuccess: () => void;
}

export function AccountPayableDeleteModal({ isOpen, onClose, accountPayable, onSuccess }: AccountPayableDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (accountPayableId: string) => 
      apiRequest('DELETE', `/api/account-payables/${accountPayableId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account-payables/stats'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account payable",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (accountPayable) {
      deleteMutation.mutate(accountPayable.id);
    }
  };

  const isPending = deleteMutation.isPending;

  if (!accountPayable) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="accountPayable-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete AccountPayable
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{accountPayable.name}</strong>? This action cannot be undone.
            {accountPayable.status === 'active' && (
              <span className="block mt-2 text-amber-600 font-medium">
                ⚠️ This accountPayable is currently active. Consider deactivating instead of deleting.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} data-testid="button-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-delete"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isPending ? 'Deleting...' : 'Delete AccountPayable'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
