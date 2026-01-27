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
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Account } from "@shared/schema";

interface AccountDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export function AccountDeleteModal({ isOpen, onClose, account }: AccountDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) => {
      return apiRequest('DELETE', `/api/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (account?.id) {
      deleteMutation.mutate(account.id);
    } else {
      toast({
        title: "Error",
        description: "Account ID is required for deletion",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="delete-modal">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                This action cannot be undone
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete the account{" "}
            <span className="font-medium" data-testid="delete-account-name">
              "{account?.name}"
            </span>?
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This will permanently remove the account and all associated data.
          </p>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            disabled={deleteMutation.isPending}
            data-testid="button-cancel-delete"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center space-x-2"
            data-testid="button-confirm-delete"
          >
            {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Delete Account</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
