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
import type { Product } from "@shared/schema";

interface ProductDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductDeleteModal({ isOpen, onClose, product }: ProductDeleteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => {
      return apiRequest('DELETE', `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/stats'] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (product?.id) {
      deleteMutation.mutate(product.id);
    } else {
      toast({
        title: "Error",
        description: "Product ID is required for deletion",
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
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                This action cannot be undone
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete the product{" "}
            <span className="font-medium" data-testid="delete-product-name">
              "{product?.name}"
            </span>?
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This will permanently remove the product and all associated data.
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
            <span>Delete Product</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}








