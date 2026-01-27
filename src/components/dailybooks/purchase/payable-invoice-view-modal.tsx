import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, X } from "lucide-react";

interface PayableProduct {
    id: string;
    product_id: string;
    quantity: string;
    unit?: string | null;
    per_unit_rate: string;
    total_amount: string;
    discount?: string | null; // NEW: Total discount amount
    discount_per_unit?: string | null; // NEW: Discount per unit
    product: {
        id: string;
        name: string;
        brand?: string | null;
        unit?: string | null;
        current_price?: number | null;
    };
}

interface Payable {
    id: string;
    account_payable_id: string;
    transaction_id: string;
    total_amount: string | number;
    paid_amount: string | number;
    remaining_payment: string | number;
    status: 'pending' | 'partial_pending' | 'paid';
    description?: string | null;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    purchase_invoice_number?: string | null;
    accountPayable?: {
        id: string;
        name: string;
        number?: string | null;
        city?: string | null;
        address?: string | null;
        status: 'active' | 'inactive';
    };
    transaction?: {
        id: string;
        type: string;
        date?: string | null;
        description?: string | null;
        mode_of_payment?: string | null;
        amount?: string | number | null;
        total_payment?: string | number | null;
        remaining_payment?: string | number | null;
        purchase_invoice_number?: string | null;
    };
    products?: PayableProduct[];
}

interface PayableInvoiceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    payableId: string | null;
    onPrint: (payable: Payable) => void;
}

export function PayableInvoiceViewModal({
    isOpen,
    onClose,
    payableId,
    onPrint
}: PayableInvoiceViewModalProps) {
    // Fetch transaction details (replacing payables API)
    const { data: payableResponse, isLoading } = useQuery({
        queryKey: ['/api/transactions', payableId, 'relations'],
        queryFn: async () => {
            if (!payableId) return null;
            // payableId is actually transaction_id now
            const res = await fetch(`/api/transactions/${payableId}/relations`, { credentials: 'include' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch transaction');
            }
            const data = await res.json();
            // Transform transaction to payable format for compatibility
            const tx = data.data;
            const status: 'pending' | 'partial_pending' | 'paid' = 
                parseFloat(tx.remaining_payment || '0') === 0 ? 'paid' : 
                (parseFloat(tx.paid_amount || '0') > 0 ? 'partial_pending' : 'pending');
            
            const transformedPayable: Payable = {
                id: tx.id,
                account_payable_id: tx.account_payable_id,
                transaction_id: tx.id,
                total_amount: tx.total_amount || '0.00',
                paid_amount: tx.paid_amount || '0.00',
                remaining_payment: tx.remaining_payment || '0.00',
                status,
                description: tx.description,
                due_date: tx.date,
                purchase_invoice_number: tx.purchase_invoice_number,
                created_at: tx.created_at,
                updated_at: tx.updated_at,
                accountPayable: tx.accountPayable ? {
                    id: tx.accountPayable.id,
                    name: tx.accountPayable.name,
                    number: tx.accountPayable.number || null,
                    city: tx.accountPayable.city || null,
                    address: tx.accountPayable.address || null,
                    status: (tx.accountPayable.status || 'active') as 'active' | 'inactive',
                } : (tx.account_payable_name ? {
                    id: tx.account_payable_id,
                    name: tx.account_payable_name,
                    number: null,
                    city: null,
                    address: null,
                    status: 'active' as 'active' | 'inactive',
                } : undefined),
                transaction: tx,
                products: (tx.productJunctions || []).map((junction: any) => ({
                    id: junction.id,
                    product_id: junction.product_id,
                    quantity: junction.quantity || '0',
                    unit: junction.unit || junction.product_unit,
                    per_unit_rate: junction.unit_price || junction.per_unit_rate || '0',
                    total_amount: junction.total_amount || '0',
                    discount: junction.discount || null, // NEW: Total discount amount
                    discount_per_unit: junction.discount_per_unit || null, // NEW: Discount per unit
                    product: {
                        id: junction.product_id,
                        name: junction.product_name || junction.product?.name || 'Unknown Product',
                        brand: junction.product_brand || junction.product?.brand || null,
                        unit: junction.product_unit || junction.product?.unit || junction.unit || null,
                        current_price: junction.product_current_price || junction.product?.current_price || null,
                    },
                })),
            };
            return { success: true, data: transformedPayable };
        },
        enabled: !!payableId && isOpen,
    });

    const payable: Payable | null = payableResponse?.data || null;

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

    const formatDiscount = (amount: string | number | null) => {
        if (!amount) return '₨0.00';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        // Show decimals for discount values (up to 2 decimal places)
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            case 'partial_pending':
                return <Badge className="bg-yellow-100 text-yellow-800">Partial Pending</Badge>;
            case 'pending':
                return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getInvoiceNumber = (payable: Payable) => {
        return (
            payable.transaction?.purchase_invoice_number ||
            payable.purchase_invoice_number ||
            payable.id.substring(0, 8).toUpperCase()
        );
    };

    const getInvoiceTitle = (transactionType?: string) => {
        switch (transactionType) {
            case 'purchase':
                return 'Purchase Invoice';
            case 'advance_purchase_payment':
                return 'Advance Payment Invoice';
            case 'advance_purchase_inventory':
                return 'Advance Inventory Invoice';
            case 'purchase_return':
                return 'Purchase Return Invoice';
            default:
                return 'Purchase Invoice';
        }
    };

    const hasProducts = (payable: Payable | null) => {
        return payable?.products && payable.products.length > 0;
    };

    if (!isOpen || !payableId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle>{payable ? getInvoiceTitle(payable.transaction?.type) : 'Purchase Invoice'}</DialogTitle>
                        <div className="flex items-center gap-2 mr-6">
                            {payable && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => payable && onPrint(payable)}
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
                ) : payable ? (
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white">
                        {/* Invoice Header */}
                        <div className="text-center border-b-2 border-gray-300 pb-4 sm:pb-6">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                                {getInvoiceTitle(payable.transaction?.type).toUpperCase()}
                            </h1>
                            <p className="text-sm text-gray-600">Invoice # {getInvoiceNumber(payable)}</p>
                        </div>

                        {/* Invoice Details Section */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Vendor Details */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Vendor Details</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="font-semibold text-gray-900">{payable.accountPayable?.name || 'Unknown Vendor'}</p>
                                    {payable.accountPayable?.number && (
                                        <p className="text-gray-600">Phone: {payable.accountPayable.number}</p>
                                    )}
                                    {payable.accountPayable?.city && (
                                        <p className="text-gray-600">City: {payable.accountPayable.city}</p>
                                    )}
                                    {payable.accountPayable?.address && (
                                        <p className="text-gray-600">Address: {payable.accountPayable.address}</p>
                                    )}
                                </div>
                            </div>

                            {/* Invoice Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Invoice Information</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Invoice Date:</span>
                                        <span className="font-medium">{formatDate(payable.transaction?.date || payable.created_at)}</span>
                                    </div>
                                    {payable.transaction?.mode_of_payment && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Mode:</span>
                                            <span className="font-medium capitalize">{payable.transaction.mode_of_payment.replace('_', ' ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Products Table - Only show if products exist */}
                        {hasProducts(payable) && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Products</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="font-semibold">Product</TableHead>
                                            <TableHead className="font-semibold">Brand</TableHead>
                                            <TableHead className="font-semibold">Unit</TableHead>
                                            <TableHead className="text-right font-semibold">Quantity</TableHead>
                                            <TableHead className="text-right font-semibold">Unit Price</TableHead>
                                            <TableHead className="text-right font-semibold">Discount/Unit</TableHead>
                                            <TableHead className="text-right font-semibold">Total</TableHead>
                                            <TableHead className="text-right font-semibold">Discount</TableHead>
                                            <TableHead className="text-right font-semibold">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payable.products!.map((item) => {
                                            const quantity = parseFloat(item.quantity || '0');
                                            const discountedUnitPrice = parseFloat(item.per_unit_rate || '0'); // What we're paying
                                            const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                                            const actualUnitPrice = discountedUnitPrice + discountPerUnit; // Original price before discount
                                            const actualTotal = quantity * actualUnitPrice; // Total at original price
                                            const totalDiscount = parseFloat(item.discount || '0') || (quantity * discountPerUnit); // Total discount
                                            const subtotal = parseFloat(item.total_amount || '0'); // Discounted total (what we're paying)
                                            
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.product?.name || 'Unknown Product'}</TableCell>
                                                    <TableCell>{item.product?.brand || '-'}</TableCell>
                                                    <TableCell>{item.product?.unit || item.unit || '-'}</TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(actualUnitPrice)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {discountPerUnit > 0 ? (
                                                            <span className="text-red-600">-{formatDiscount(discountPerUnit)}</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(actualTotal)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {totalDiscount > 0 ? (
                                                            <span className="text-red-600">-{formatCurrency(totalDiscount)}</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(subtotal)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Payment Summary */}
                        <div className="border-t-2 border-gray-300 pt-4">
                            <div className="flex justify-end">
                                <div className="w-full sm:w-64 space-y-3">
                                    {(() => {
                                        // Calculate actual total (sum of original prices before discount)
                                        const actualTotal = payable.products?.reduce((sum, item) => {
                                            const qty = parseFloat(item.quantity || '0');
                                            const discountedRate = parseFloat(item.per_unit_rate || '0');
                                            const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                                            const actualUnitPrice = discountedRate + discountPerUnit;
                                            return sum + (qty * actualUnitPrice);
                                        }, 0) || 0;
                                        
                                        // Calculate total discount
                                        const totalDiscount = payable.products?.reduce((sum, item) => {
                                            const discount = parseFloat(item.discount || '0');
                                            if (discount > 0) return sum + discount;
                                            // If discount field is not set, calculate from discount_per_unit
                                            const qty = parseFloat(item.quantity || '0');
                                            const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                                            return sum + (qty * discountPerUnit);
                                        }, 0) || 0;
                                        
                                        // Discounted total (what we're actually paying)
                                        const discountedTotal = parseFloat(payable.total_amount?.toString() || '0');
                                        
                                        const hasDiscount = totalDiscount > 0;
                                        
                                        return (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 font-semibold">Total:</span>
                                                    <span className="font-semibold">{formatCurrency(actualTotal)}</span>
                                                </div>
                                                {hasDiscount && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Discount:</span>
                                                        <span className="font-medium text-red-600">-{formatDiscount(totalDiscount)}</span>
                                                    </div>
                                                )}
                                                <div className={`flex justify-between text-sm ${hasDiscount ? 'border-t pt-2' : ''}`}>
                                                    <span className="text-gray-600 font-semibold">Discounted Total:</span>
                                                    <span className="font-semibold text-lg">{formatCurrency(discountedTotal)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Amount Paid:</span>
                                                    <span className="font-semibold text-green-600">{formatCurrency(payable.paid_amount)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm border-t pt-2">
                                                    <span className="text-gray-600 font-semibold">Amount Remaining:</span>
                                                    <span className="font-bold text-lg text-orange-600">{formatCurrency(payable.remaining_payment)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {payable.description && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
                                <p className="text-sm text-gray-600">{payable.description}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="border-t pt-4 text-center text-xs text-gray-500">
                            <p>Thank you for your business!</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Payable not found</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

