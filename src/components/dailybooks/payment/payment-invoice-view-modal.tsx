import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentTransaction {
    id: string;
    type: string;
    account_payable_id: string;
    source_account_id?: string | null;
    total_amount: string | number;
    paid_amount?: string | number;
    remaining_payment?: string | number;
    description?: string | null;
    mode_of_payment?: string | null;
    date: string;
    payment_invoice_number?: string | null;
    created_at: string;
    updated_at: string;
    accountPayable?: {
        id: string;
        name: string;
        number?: string;
        city?: string;
        address?: string;
    } | null;
    account_payable?: {
        id: string;
        name: string;
        number?: string;
        city?: string;
        address?: string;
    } | null;
    payable?: {
        id: string;
        total_amount: string | number;
        paid_amount: string | number;
        remaining_payment: string | number;
    } | null;
    source_account?: {
        id: string;
        name: string;
        account_type?: string | null;
    } | null;
}

interface PaymentInvoiceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentId: string | null;
    onPrint: (payment: PaymentTransaction) => void;
}

export function PaymentInvoiceViewModal({
    isOpen,
    onClose,
    paymentId,
    onPrint
}: PaymentInvoiceViewModalProps) {
    // Fetch payment transaction details
    const { data: paymentResponse, isLoading } = useQuery({
        queryKey: ['/api/transactions', paymentId],
        queryFn: async () => {
            if (!paymentId) return null;
            return apiRequest('GET', `/api/transactions/${paymentId}/relations`);
        },
        enabled: !!paymentId && isOpen,
    });

    const payment: PaymentTransaction | null = paymentResponse?.data || null;

    const formatCurrency = (amount: string | number | null) => {
        if (!amount) return '₨0.00';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numAmount);
    };

    const formatDate = (date: string | Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getModeOfPaymentLabel = (mode: string | null) => {
        if (!mode) return '-';
        const modeMap: Record<string, string> = {
            'check': 'Check',
            'cash': 'Cash',
            'bank_transfer': 'Bank Transfer',
            'pay_order': 'Pay Order',
        };
        return modeMap[mode] || mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getPaymentTypeHeading = (type: string | null) => {
        if (type === 'advance_purchase_payment') {
            return 'Advance Payment';
        }
        return 'Payment';
    };

    const getPaymentTypeInvoiceHeading = (type: string | null) => {
        if (type === 'advance_purchase_payment') {
            return 'ADVANCE PAYMENT INVOICE';
        }
        return 'PAYMENT INVOICE';
    };

    if (!isOpen || !paymentId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle>
                            {payment ? `${getPaymentTypeHeading(payment.type)} Invoice` : 'Payment Invoice'}
                        </DialogTitle>
                        <div className="flex items-center gap-2 mr-6">
                            {payment && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => payment && onPrint(payment)}
                                    className="flex items-center gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                ) : payment ? (
                    <div className="p-6 space-y-6 bg-white">
                        {/* Invoice Header */}
                        <div className="text-center border-b-2 border-gray-300 pb-6">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">
                                {getPaymentTypeInvoiceHeading(payment.type)}
                            </h1>
                            <p className="text-sm text-gray-600">Invoice # {payment.payment_invoice_number || payment.id.substring(0, 8).toUpperCase()}</p>
                        </div>

                        {/* Invoice Details Section */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Vendor Details */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Vendor Details</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="font-semibold text-gray-900">{(payment.accountPayable || payment.account_payable)?.name || 'Unknown Vendor'}</p>
                                    {(payment.accountPayable || payment.account_payable)?.number && (
                                        <p className="text-gray-600">Phone: {(payment.accountPayable || payment.account_payable)?.number}</p>
                                    )}
                                    {(payment.accountPayable || payment.account_payable)?.city && (
                                        <p className="text-gray-600">City: {(payment.accountPayable || payment.account_payable)?.city}</p>
                                    )}
                                    {(payment.accountPayable || payment.account_payable)?.address && (
                                        <p className="text-gray-600">Address: {(payment.accountPayable || payment.account_payable)?.address}</p>
                                    )}
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Payment Information</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Date:</span>
                                        <span className="font-medium">{formatDate(payment.date)}</span>
                                    </div>
                                    {payment.mode_of_payment && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Mode:</span>
                                            <span className="font-medium">{getModeOfPaymentLabel(payment.mode_of_payment)}</span>
                                        </div>
                                    )}
                                    {payment.source_account && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Paid From Account:</span>
                                            <span className="font-medium">{payment.source_account.name}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <Badge className="bg-green-100 text-green-800">Paid</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="border-t-2 border-gray-300 pt-4">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-3">
                                    {payment.type === 'advance_purchase_payment' ? (
                                        // For advance payments, only show Advance Amount
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 font-semibold">Advance Amount:</span>
                                            <span className="font-bold text-lg text-green-600">
                                                {formatCurrency(
                                                    typeof payment.paid_amount === 'string' 
                                                        ? parseFloat(payment.paid_amount) 
                                                        : payment.paid_amount || payment.total_amount || 0
                                                )}
                                            </span>
                                        </div>
                                    ) : (
                                        // For regular payments, show Pending Balance, Paid Amount, and Remaining
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Pending Balance:</span>
                                                <span className="font-semibold text-lg text-orange-600">
                                                    {formatCurrency(payment.total_amount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Paid Amount:</span>
                                                <span className="font-semibold text-green-600">
                                                    {formatCurrency(
                                                        typeof payment.paid_amount === 'string' 
                                                            ? parseFloat(payment.paid_amount) 
                                                            : payment.paid_amount || 0
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm border-t pt-2">
                                                <span className="text-gray-600 font-semibold">Remaining:</span>
                                                <span className="font-bold text-lg text-orange-600">
                                                    {formatCurrency(
                                                        typeof payment.remaining_payment === 'string' 
                                                            ? parseFloat(payment.remaining_payment) 
                                                            : payment.remaining_payment || 0
                                                    )}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {payment.description && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
                                <p className="text-sm text-gray-600">{payment.description}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="border-t pt-4 text-center text-xs text-gray-500">
                            <p>Payment received. Thank you!</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Payment not found</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

