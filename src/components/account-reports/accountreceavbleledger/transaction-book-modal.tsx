import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiUrl } from "@/lib/queryClient";

interface TransactionBookModalProps {
  isOpen: boolean;
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionBookModal({
  isOpen,
  transactionId,
  onClose,
}: TransactionBookModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/transactions", transactionId, "relations"],
    queryFn: async () => {
      if (!transactionId) return null;
      const res = await fetch(getApiUrl(`/api/transactions/${transactionId}/relations`), {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch transaction details");
      }
      return res.json();
    },
    enabled: isOpen && !!transactionId,
  });

  const tx = data?.data;

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return "₨0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen || !transactionId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Book</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !tx ? (
          <p className="text-muted-foreground">Transaction not found.</p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Type</span>
                  <span className="capitalize">{tx.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date</span>
                  <span>{formatDate(tx.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Description</span>
                  <span>{tx.description || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Client</span>
                  <span>{tx.accountReceivable?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount</span>
                  <span>{formatCurrency(tx.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Received</span>
                  <span>{formatCurrency(tx.total_payment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Remaining</span>
                  <span>{formatCurrency(tx.remaining_payment)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


