import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  transactionType: string;
  formData: {
    date: string;
    sourceAccountName?: string;
    destinationAccountName?: string;
    amount: string;
    paymentMode: string;
    description: string;
  };
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  transactionType,
  formData,
}: ConfirmationModalProps) {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      payroll: 'Payroll',
      fixed_utility: 'Fixed Utility',
      fixed_expense: 'Fixed Expense',
      miscellaneous: 'Miscellaneous',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm {getTransactionTypeLabel(transactionType)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please review the transaction details before confirming.
          </p>

          {/* Transaction Details Table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-muted-foreground">Transaction Type</td>
                  <td className="px-3 py-2">{getTransactionTypeLabel(transactionType)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-muted-foreground">Date</td>
                  <td className="px-3 py-2">{formatDate(formData.date)}</td>
                </tr>
                {(formData.sourceAccountName || formData.destinationAccountName) && (
                  <tr className="border-t">
                    <td className="px-3 py-2 font-medium text-muted-foreground">
                      {transactionType === 'deposit' ? 'Destination Account' : 'Source Account'}
                    </td>
                    <td className="px-3 py-2">
                      {transactionType === 'deposit' 
                        ? (formData.destinationAccountName || '-')
                        : (formData.sourceAccountName || '-')
                      }
                    </td>
                  </tr>
                )}
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-muted-foreground">Amount</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(formData.amount)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-muted-foreground">Payment Mode</td>
                  <td className="px-3 py-2">{formData.paymentMode || '-'}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium text-muted-foreground">Description</td>
                  <td className="px-3 py-2">{formData.description || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm {getTransactionTypeLabel(transactionType)}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

