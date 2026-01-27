import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type InsertTransaction } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { ConfirmationModal } from "../shared/confirmation-modal";

interface PayrollConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
}

export function PayrollConfirmationModal({ isOpen, onClose, formData }: PayrollConfirmationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createPayrollMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const processedData = {
        ...data,
        type: "payroll" as const,
        date: data.date ? new Date(data.date).toISOString() : undefined,
        paid_amount: data.paid_amount,
        total_amount: data.paid_amount,
        source_account_id: data.source_account_id,
        destination_account_id: null,
      };

      const foreignKeyFields = ['account_payable_id', 'account_receivable_id', 'purchaser_id'];
      foreignKeyFields.forEach(field => {
        if ((processedData as any)[field] === '') {
          (processedData as any)[field] = null;
        }
      });

      if (user?.id) {
        (processedData as any).user_id = user.id;
      }

      return apiRequest('POST', '/api/transactions', processedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll created successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/stats'] });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creating payroll:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to create payroll",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    createPayrollMutation.mutate(formData);
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={createPayrollMutation.isPending}
      transactionType="payroll"
      formData={{
        date: formData.date,
        sourceAccountName: formData.sourceAccountName || '',
        amount: formData.paid_amount?.toString() || '',
        paymentMode: formData.paymentModeLabel || formData.mode_of_payment || '',
        description: formData.description || '',
      }}
    />
  );
}

