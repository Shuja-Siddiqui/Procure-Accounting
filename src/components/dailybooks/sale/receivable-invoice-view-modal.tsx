import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, X } from "lucide-react";

interface ReceivableProduct {
    id: string;
    product_id: string;
    quantity: string;
    unit?: string | null;
    per_unit_rate: string;
    unit_price?: string;
    total_amount: string;
    discount?: string | null;
    discount_per_unit?: string | null;
    product: {
        id: string;
        name: string;
        brand?: string | null;
        unit?: string | null;
        current_price?: number | null;
        company_name?: string | null;
    };
}

interface Receivable {
    id: string;
    account_receivable_id: string;
    transaction_id: string;
    amount: string | number;
    total_payment: string | number;
    remaining_payment: string | number;
    status: 'pending' | 'partial_pending' | 'paid';
    description?: string | null;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    accountReceivable?: {
        id: string;
        ar_id?: string | null;
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
        sale_invoice_number?: string | null;
    };
    sale_invoice_number?: string | null;
    products?: ReceivableProduct[];
}

interface ReceivableInvoiceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    receivableId: string | null;
    onPrint?: (receivable: Receivable) => void;
}

export function ReceivableInvoiceViewModal({
    isOpen,
    onClose,
    receivableId,
    onPrint
}: ReceivableInvoiceViewModalProps) {
    // Fetch transaction details (replacing receivables API)
    const { data: receivableResponse, isLoading } = useQuery({
        queryKey: ['/api/transactions', receivableId, 'relations'],
        queryFn: async () => {
            if (!receivableId) return null;
            // receivableId is actually transaction_id now
            const res = await fetch(`/api/transactions/${receivableId}/relations`, { credentials: 'include' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch transaction');
            }
            const data = await res.json();
            // Transform transaction to receivable format for compatibility
            const tx = data.data;
            const status: 'pending' | 'partial_pending' | 'paid' = 
                parseFloat(tx.remaining_payment || '0') === 0 ? 'paid' : 
                (parseFloat(tx.paid_amount || '0') > 0 ? 'partial_pending' : 'pending');
            
            // Fetch full account receivable details if account_receivable_id exists
            let accountReceivableDetails = null;
            if (tx.account_receivable_id) {
                try {
                    const arRes = await fetch(`/api/account-receivables/${tx.account_receivable_id}`, { credentials: 'include' });
                    if (arRes.ok) {
                        const arData = await arRes.json();
                        accountReceivableDetails = arData.data;
                    }
                } catch (error) {
                    console.error('Error fetching account receivable details:', error);
                }
            }
            
            const transformedReceivable: Receivable = {
                id: tx.id,
                account_receivable_id: tx.account_receivable_id,
                transaction_id: tx.id,
                amount: tx.total_amount || '0.00', // Total invoice amount
                total_payment: tx.paid_amount || '0.00', // Amount received/paid
                remaining_payment: tx.remaining_payment || '0.00',
                status,
                description: tx.description,
                due_date: tx.date,
                sale_invoice_number: tx.sale_invoice_number,
                receipt_invoice_number: tx.receipt_invoice_number,
                created_at: tx.created_at,
                updated_at: tx.updated_at,
                accountReceivable: accountReceivableDetails ? {
                    id: accountReceivableDetails.id,
                    ar_id: accountReceivableDetails.ar_id || null,
                    name: accountReceivableDetails.name,
                    number: accountReceivableDetails.number || null,
                    city: accountReceivableDetails.city || null,
                    address: accountReceivableDetails.address || null,
                    status: (accountReceivableDetails.status || 'active') as 'active' | 'inactive',
                } : (tx.account_receivable_name ? {
                    id: tx.account_receivable_id,
                    ar_id: null,
                    name: tx.account_receivable_name,
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
                    per_unit_rate: junction.sale_price || junction.per_unit_rate || junction.unit_price || '0',
                    unit_price: junction.sale_price || junction.per_unit_rate || junction.unit_price || '0',
                    total_amount: junction.total_amount || '0',
                    discount: junction.discount || null,
                    discount_per_unit: junction.discount_per_unit || null,
                    product: {
                        id: junction.product_id,
                        name: junction.product_name || junction.product?.name || 'Unknown Product',
                        brand: junction.product_brand || junction.product?.brand || null,
                        unit: junction.product_unit || junction.product?.unit || junction.unit || null,
                        current_price: junction.product_current_price || junction.product?.current_price || null,
                        company_name: junction.product_company_name || junction.product?.company_name || null,
                    },
                })),
            };
            return { success: true, data: transformedReceivable };
        },
        enabled: !!receivableId && isOpen,
    });

    const receivable: Receivable | null = receivableResponse?.data || null;

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

    const getInvoiceNumber = (receivable: Receivable) => {
        return (
            receivable.transaction?.sale_invoice_number ||
            receivable.sale_invoice_number ||
            receivable.id.substring(0, 8).toUpperCase()
        );
    };

    const getInvoiceTitle = (transactionType?: string) => {
        switch (transactionType) {
            case 'sale':
                return 'Sale Invoice';
            case 'advance_sale_payment':
                return 'Advance Payment Receipt';
            case 'advance_sale_inventory':
                return 'Advance Sale Invoice';
            case 'sale_return':
                return 'Sale Return Invoice';
            case 'receive_able':
                return 'Receipt Invoice';
            case 'receive_able_vendor':
                return 'Vendor Receipt Invoice';
            default:
                return 'Receipt Invoice';
        }
    };

    const hasProducts = (receivable: Receivable | null) => {
        return receivable?.products && receivable.products.length > 0;
    };

    // Helper function to determine company from products
    const detectedCompany = useMemo(() => {
        if (!receivable?.products || receivable.products.length === 0) return 'maknisa';
        const companyName = receivable.products[0]?.product?.company_name?.toLowerCase() || '';
        if (companyName.includes('adil steel')) return 'adil-steel';
        if (companyName.includes('hafiz daniyal') || companyName.includes('hafiz daniyal hassan')) return 'hafiz-daniyal';
        if (companyName.includes('maqbool') || companyName.includes('maqbool building material')) return 'maqbool';
        return 'maknisa';
    }, [receivable]);

    const isAdilSteel = detectedCompany === 'adil-steel';
    const isHafizDaniyal = detectedCompany === 'hafiz-daniyal';
    const isMaqbool = detectedCompany === 'maqbool';

    if (!isOpen || !receivableId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl  max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle>{receivable ? getInvoiceTitle(receivable.transaction?.type) : 'Receipt Invoice'}</DialogTitle>
                        <div className="flex items-center gap-2 mr-6">
                            {receivable && onPrint && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPrint && receivable && onPrint(receivable)}
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
                ) : receivable ? (
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white">
                        {/* Company Header - Adil Steel */}
                        {isAdilSteel && (
                            <div className="border-b-2 border-gray-300 pb-4 mb-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-shrink-0 w-32">
                                        <img 
                                            src="/images/adil-steel/logo.png" 
                                            alt="Adil Steel Logo" 
                                            className="max-w-full h-auto max-h-20 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 text-center px-4">
                                        <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                                            Adil Steel
                                        </div>
                                        <div className="text-sm text-gray-700" style={{ fontFamily: 'Times New Roman, serif' }}>
                                            All kind of Graded Steel (Brands) Deformed G-60,G-40
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 w-40 text-right">
                                        <img 
                                            src="/images/adil-steel/header-image.png" 
                                            alt="Steel Bars" 
                                            className="max-w-full h-auto max-h-20 object-contain ml-auto"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Company Header - Hafiz Daniyal */}
                        {isHafizDaniyal && (
                            <div className="border-b-2 border-gray-300 pb-4 mb-4">
                                <div className="flex items-center gap-6">
                                    <div className="w-[30%]">
                                        <img 
                                            src="/images/hafiz-daniyal/logo.png" 
                                            alt="Hafiz Daniyal Logo" 
                                            className="max-w-full h-auto max-h-40 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="w-[70%] flex flex-col gap-1">
                                        <div className="text-xl sm:text-2xl font-bold text-gray-800 uppercase tracking-wide">
                                            HAFIZ DANIYAL HASSAN
                                        </div>
                                        <div className="text-base sm:text-lg font-bold text-gray-800 uppercase">
                                            BUILDING MATERIAL & SUPPLIES
                                        </div>
                                        <div className="text-sm text-gray-700">
                                            We Deals All Kind of Building Material
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Company Header - Maqbool */}
                        {isMaqbool && (
                            <div className="border-b-2 border-gray-300 pb-4 mb-4">
                                <div className="flex justify-center items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <img 
                                            src="/images/maqbool/logo.png" 
                                            alt="Maqbool Building Material Logo" 
                                            className="max-w-full h-auto max-h-40 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h1 className="text-2xl sm:text-3xl font-bold text-orange-600 uppercase">
                                            MAQBOOL
                                        </h1>
                                        <h3 className="text-base sm:text-lg font-bold text-gray-800 uppercase">
                                            BUILDING MATERIAL
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invoice Header */}
                        <div className="text-center border-b-2 border-gray-300 pb-4 sm:pb-6">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                                {getInvoiceTitle(receivable.transaction?.type).toUpperCase()}
                            </h1>
                            <p className="text-sm text-gray-600">Invoice # {getInvoiceNumber(receivable)}</p>
                        </div>

                        {/* Invoice Details Section */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Client Details */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Client Details</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="font-semibold text-gray-900">{receivable.accountReceivable?.name || 'Unknown Client'}</p>
                                    {receivable.accountReceivable?.ar_id && (
                                        <p className="text-gray-600">AR ID: {receivable.accountReceivable.ar_id}</p>
                                    )}
                                    {receivable.accountReceivable?.number && (
                                        <p className="text-gray-600">Phone: {receivable.accountReceivable.number}</p>
                                    )}
                                    {receivable.accountReceivable?.city && (
                                        <p className="text-gray-600">City: {receivable.accountReceivable.city}</p>
                                    )}
                                    {receivable.accountReceivable?.address && (
                                        <p className="text-gray-600">Address: {receivable.accountReceivable.address}</p>
                                    )}
                                </div>
                            </div>

                            {/* Invoice Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Invoice Information</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Invoice Date:</span>
                                        <span className="font-medium">{formatDate(receivable.transaction?.date || receivable.created_at)}</span>
                                    </div>
                                    {receivable.due_date && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Due Date:</span>
                                            <span className="font-medium">{formatDate(receivable.due_date)}</span>
                                        </div>
                                    )}
                                    {receivable.transaction?.mode_of_payment && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Mode:</span>
                                            <span className="font-medium capitalize">{receivable.transaction.mode_of_payment.replace('_', ' ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Products Table - Only show if products exist */}
                        {hasProducts(receivable) && (
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
                                        {receivable.products!.map((item: any) => {
                                            const quantity = parseFloat(item.quantity || '0');
                                            const discountedUnitPrice = parseFloat(item.unit_price || item.per_unit_rate || '0'); // What we're receiving
                                            const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                                            const actualUnitPrice = discountedUnitPrice + discountPerUnit; // Original price before discount
                                            const actualTotal = quantity * actualUnitPrice; // Total at original price
                                            const totalDiscount = parseFloat(item.discount || '0') || (quantity * discountPerUnit); // Total discount
                                            const subtotal = parseFloat(item.total_amount || '0'); // Discounted total (what we're receiving)
                                            
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
                                        const transactionType = receivable.transaction?.type;
                                        
                                        // For advance_sale_payment, show only total paid amount
                                        if (transactionType === 'advance_sale_payment') {
                                            const totalPaid = parseFloat(receivable.total_payment?.toString() || receivable.amount?.toString() || '0');
                                            return (
                                                <div className="flex justify-between text-sm border-t pt-2">
                                                    <span className="text-gray-600 font-semibold">Total Paid Amount:</span>
                                                    <span className="font-bold text-lg text-green-600">{formatCurrency(totalPaid)}</span>
                                                </div>
                                            );
                                        }
                                        
                                        // For receive_able and receive_able_vendor, show Total, Paid, Remaining
                                        if (transactionType === 'receive_able' || transactionType === 'receive_able_vendor') {
                                            const total = parseFloat(receivable.amount?.toString() || receivable.total_payment?.toString() || '0');
                                            const paid = parseFloat(receivable.total_payment?.toString() || '0');
                                            const remaining = parseFloat(receivable.remaining_payment?.toString() || '0');
                                            
                                            return (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600 font-semibold">Total:</span>
                                                        <span className="font-semibold">{formatCurrency(total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Paid:</span>
                                                        <span className="font-semibold text-green-600">{formatCurrency(paid)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm border-t pt-2">
                                                        <span className="text-gray-600 font-semibold">Remaining:</span>
                                                        <span className="font-bold text-lg text-orange-600">{formatCurrency(remaining)}</span>
                                                    </div>
                                                </>
                                            );
                                        }
                                        
                                        // For sale invoices with products, show detailed breakdown
                                        if (receivable.products && receivable.products.length > 0) {
                                            // Calculate actual total (sum of original prices before discount)
                                            const actualTotal = receivable.products.reduce((sum, item) => {
                                                const qty = parseFloat(item.quantity || '0');
                                                const discountedRate = parseFloat(item.unit_price || item.per_unit_rate || '0');
                                                const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                                                const actualUnitPrice = discountedRate + discountPerUnit;
                                                return sum + (qty * actualUnitPrice);
                                            }, 0);
                                            
                                            // Calculate total discount
                                            const totalDiscount = receivable.products.reduce((sum, item) => {
                                                const discount = parseFloat(item.discount || '0');
                                                if (discount > 0) return sum + discount;
                                                // If discount field is not set, calculate from discount_per_unit
                                                const qty = parseFloat(item.quantity || '0');
                                                const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                                                return sum + (qty * discountPerUnit);
                                            }, 0);
                                            
                                            // Discounted total (what we're actually receiving)
                                            const discountedTotal = parseFloat(receivable.amount?.toString() || '0');
                                            
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
                                                        <span className="text-gray-600">Amount Received:</span>
                                                        <span className="font-semibold text-green-600">{formatCurrency(receivable.total_payment)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm border-t pt-2">
                                                        <span className="text-gray-600 font-semibold">Amount Remaining:</span>
                                                        <span className="font-bold text-lg text-orange-600">{formatCurrency(receivable.remaining_payment)}</span>
                                                    </div>
                                                </>
                                            );
                                        }
                                        
                                        // Default fallback
                                        return (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 font-semibold">Total:</span>
                                                    <span className="font-semibold">{formatCurrency(parseFloat(receivable.amount?.toString() || '0'))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Paid:</span>
                                                    <span className="font-semibold text-green-600">{formatCurrency(parseFloat(receivable.total_payment?.toString() || '0'))}</span>
                                                </div>
                                                <div className="flex justify-between text-sm border-t pt-2">
                                                    <span className="text-gray-600 font-semibold">Remaining:</span>
                                                    <span className="font-bold text-lg text-orange-600">{formatCurrency(parseFloat(receivable.remaining_payment?.toString() || '0'))}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {receivable.description && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
                                <p className="text-sm text-gray-600">{receivable.description}</p>
                            </div>
                        )}

                        {/* Footer */}
                        {isAdilSteel ? (
                            <div className="border-t pt-4 text-center text-sm text-gray-700 space-y-1">
                                <p>Godown: Dera Chahal Opposite Elite Police Academy Bedian Road Lahore,</p>
                                <p>Phone: 0333489944 (Jameel Siddique) 03004835067 (Asif Noor)</p>
                            </div>
                        ) : isHafizDaniyal ? (
                            <div className="border-t pt-4 text-center text-sm text-gray-700 space-y-1">
                                <p>M-16 First Floor 11-12 K1 Commercial Zone Valancia Societu , Lahore</p>
                                <p>03009504048 / 03034046948</p>
                            </div>
                        ) : isMaqbool ? (
                            <div className="border-t pt-4 text-center text-sm text-gray-700 space-y-1">
                                <p>Phone: 03034046948</p>
                                <p>4th Floor Plaza No 1/ 1CCA Commercial</p>
                                <p>Near Jalal Sons Phase 5 DHA</p>
                            </div>
                        ) : (
                            <div className="border-t pt-4 text-center text-xs text-gray-500">
                                <p>Thank you for your business!</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 text-center">
                        <p className="text-muted-foreground">Receivable not found</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

