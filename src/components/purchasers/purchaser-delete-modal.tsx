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

interface Purchaser {
  id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface PurchaserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaser: Purchaser | null;
  onSuccess: () => void;
}

export function PurchaserDeleteModal({ isOpen, onClose, purchaser, onSuccess }: PurchaserDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (purchaserId: string) => 
      apiRequest('DELETE', `/api/purchasers/${purchaserId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchasers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchasers/stats'] });
      toast({
        title: "Success",
        description: "Purchaser deleted successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchaser",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (purchaser) {
      deleteMutation.mutate(purchaser.id);
    }
  };

  const isPending = deleteMutation.isPending;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="purchaser-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Purchaser
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{purchaser?.name}</strong>? This action cannot be undone.
            {purchaser?.city && (
              <span className="block mt-2 text-sm text-muted-foreground">
                Location: {purchaser.city}
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
            {isPending ? 'Deleting...' : 'Delete Purchaser'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
