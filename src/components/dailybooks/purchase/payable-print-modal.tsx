import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, FileText } from "lucide-react";

interface PayableProduct {
  id: string;
  product_id: string;
  quantity: string;
  unit?: string | null;
  per_unit_rate: string;
  total_amount: string;
  discount?: string | null;
  discount_per_unit?: string | null;
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
    purchase_invoice_number?: string | null;
  };
  products?: PayableProduct[];
}

interface PayablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: Payable | null;
  keepDetailModalOpen?: boolean; // If true, don't close detail modal when this opens
}

export function PayablePrintModal({ isOpen, onClose, payable, keepDetailModalOpen }: PayablePrintModalProps) {
  const { toast } = useToast();
  const [letterhead, setLetterhead] = useState<'maknisa' | 'adil-steel' | 'hafiz-daniyal' | 'maqbool'>('maknisa');

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDiscount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    // Show decimals for discount values (up to 2 decimal places)
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
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

  const hasProducts = () => {
    return payable?.products && payable.products.length > 0;
  };

  const getAdilSteelHeader = () => {
    const baseUrl = window.location.origin;
    return `
      <div class="adil-header">
        <div class="adil-header-content">
          <div class="adil-logo-section">
            <img src="${baseUrl}/images/adil-steel/logo.png" alt="Adil Steel Logo" class="adil-logo" onerror="this.style.display='none'">
          </div>
          <div class="adil-center-section">
            <div class="adil-company-name">Adil Steel</div>
            <div class="adil-company-tagline">All kind of Graded Steel (Brands) Deformed G-60,G-40</div>
          </div>
          <div class="adil-image-section">
            <img src="${baseUrl}/images/adil-steel/header-image.png" alt="Steel Bars" class="adil-header-image" onerror="this.style.display='none'">
          </div>
        </div>
      </div>
    `;
  };

  const getAdilSteelFooter = () => {
    return `
      <div class="adil-footer">
        <div class="adil-footer-content">
          <p>Godown: Dera Chahal Opposite Elite Police Academy Bedian Road Lahore,</p>
          <p>Phone: 0333489944 (Jameel Siddique) 03004835067 (Asif Noor)</p>
        </div>
      </div>
    `;
  };

  const getMaknisaHeader = (companyName: string, address: string, phone: string, email: string) => {
    return `
      <div class="header">
        <div class="company-name">${companyName}</div>
        <div class="company-details">
          ${address}<br>
          Phone: ${phone} | Email: ${email}
        </div>
      </div>
    `;
  };

  const getMaknisaFooter = () => {
    return `
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    `;
  };

  const getHafizDaniyalHeader = () => {
    const baseUrl = window.location.origin;
    return `
      <div class="hafiz-daniyal-header">
        <div class="hafiz-daniyal-header-content">
          <div class="hafiz-daniyal-logo-section">
            <img src="${baseUrl}/images/hafiz-daniyal/logo.png" alt="Hafiz Daniyal Logo" class="hafiz-daniyal-logo" onerror="this.style.display='none'">
          </div>
          <div class="hafiz-daniyal-text-section">
            <div class="hafiz-daniyal-company-name">HAFIZ DANIYAL HASSAN</div>
            <div class="hafiz-daniyal-company-subtitle">BUILDING MATERIAL & SUPPLIES</div>
            <div class="hafiz-daniyal-company-tagline">We Deals All Kind of Building Material</div>
          </div>
        </div>
      </div>
    `;
  };

  const getHafizDaniyalFooter = () => {
    return `
      <div class="hafiz-daniyal-footer">
        <div class="hafiz-daniyal-footer-content">
          <p>M-16 First Floor 11-12 K1 Commercial Zone Valancia Societu , Lahore</p>
          <p>03009504048 / 03034046948</p>
        </div>
      </div>
    `;
  };

  const getMaqboolHeader = () => {
    const baseUrl = window.location.origin;
    return `
      <div class="maqbool-header">
        <div class="maqbool-header-content">
          <img src="${baseUrl}/images/maqbool/logo.png" alt="Maqbool Building Material Logo" class="maqbool-logo" onerror="this.style.display='none'">
        </div>
      </div>
    `;
  };

  const getMaqboolFooter = () => {
    return `
      <div class="maqbool-footer">
        <div class="maqbool-footer-content">
          <p>Phone: 03034046948</p>
          <p>4th Floor Plaza No 1/ 1CCA Commercial</p>
          <p>Near Jalal Sons Phase 5 DHA</p>
        </div>
      </div>
    `;
  };

  const generatePDF = () => {
    if (!payable) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const letterheadData = {
      maknisa: {
        companyName: "MAKNISA PROCUREMENT",
        address: "123 Business Street, Karachi, Pakistan",
        phone: "+92 300 1234567",
        email: "info@maknisa.com"
      },
      'adil-steel': {
        companyName: "ADIL STEEL",
        address: "456 Steel Avenue, Lahore, Pakistan", 
        phone: "+92 300 7654321",
        email: "info@adilsteel.com"
      }
    };

    const selectedLetterhead = letterheadData[letterhead];
    const products = payable.products || [];
    const transactionType = payable.transaction?.type;
    const invoiceTitle = getInvoiceTitle(transactionType);
    const isAdilSteel = letterhead === 'adil-steel';
    const isHafizDaniyal = letterhead === 'hafiz-daniyal';
    const isMaqbool = letterhead === 'maqbool';

    const invoiceNumber =
      payable.transaction?.purchase_invoice_number ||
      payable.purchase_invoice_number ||
      payable.id.substring(0, 8).toUpperCase();

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${invoiceTitle} ${invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 30px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .company-details {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
          }
          /* Adil Steel Header Styles */
          .adil-header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .adil-header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
          }
          .adil-logo-section {
            flex: 0 0 auto;
            width: 120px;
          }
          .adil-logo {
            max-width: 100%;
            height: auto;
            max-height: 100px;
          }
          .adil-center-section {
            flex: 1;
            text-align: center;
            padding: 0 20px;
          }
          .adil-company-name {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            font-family: 'Times New Roman', serif;
            margin-bottom: 8px;
          }
          .adil-company-tagline {
            font-size: 14px;
            color: #333;
            font-family: 'Times New Roman', serif;
            line-height: 1.4;
          }
          .adil-image-section {
            flex: 0 0 auto;
            width: 150px;
            text-align: right;
          }
          .adil-header-image {
            max-width: 100%;
            height: auto;
            max-height: 100px;
          }
          /* Adil Steel Footer Styles */
          .adil-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .adil-footer-content {
            text-align: center;
            font-size: 13px;
            color: #333;
            line-height: 1.6;
          }
          .adil-footer-content p {
            margin: 4px 0;
          }
          /* Hafiz Daniyal Header Styles */
          .hafiz-daniyal-header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .hafiz-daniyal-header-content {
            display: flex;
            align-items: center;
            gap: 30px;
          }
          .hafiz-daniyal-logo-section {
            width: 30%;
          }
          .hafiz-daniyal-logo {
            max-width: 100%;
            height: auto;
            max-height: 180px;
            object-fit: contain;
          }
          .hafiz-daniyal-text-section {
            width: 70%;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .hafiz-daniyal-company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .hafiz-daniyal-company-subtitle {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .hafiz-daniyal-company-tagline {
            font-size: 14px;
            color: #555;
            font-weight: normal;
          }
          /* Hafiz Daniyal Footer Styles */
          .hafiz-daniyal-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .hafiz-daniyal-footer-content {
            text-align: center;
            font-size: 13px;
            color: #333;
            line-height: 1.6;
          }
          .hafiz-daniyal-footer-content p {
            margin: 4px 0;
          }
          /* Maqbool Header Styles */
          .maqbool-header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .maqbool-header-content {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 30px;
          }
          .maqbool-logo-section {
            flex-shrink: 0;
          }
          .maqbool-logo {
            max-width: 100%;
            height: auto;
            max-height: 150px;
            object-fit: contain;
          }
          .maqbool-text-section {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .maqbool-company-name {
            font-size: 32px;
            font-weight: bold;
            color: #f97316;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.2;
          }
          .maqbool-company-subtitle {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.2;
          }
          /* Maqbool Footer Styles */
          .maqbool-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .maqbool-footer-content {
            text-align: center;
            font-size: 13px;
            color: #333;
            line-height: 1.6;
          }
          .maqbool-footer-content p {
            margin: 4px 0;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .invoice-info, .vendor-info {
            flex: 1;
          }
          .info-section h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .info-section p {
            margin: 5px 0;
            font-size: 14px;
          }
          .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .products-table th,
          .products-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          .products-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .products-table .text-right {
            text-align: right;
          }
          .payment-summary {
            border-top: 2px solid #333;
            padding-top: 15px;
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
          }
          .summary-box {
            width: 260px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 14px;
          }
          .summary-row.total span:last-child {
            font-size: 16px;
            font-weight: 600;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
          }
          .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .invoice-container { border: none; }
            .adil-header-content {
              display: flex !important;
            }
            .hafiz-daniyal-header-content {
              display: flex !important;
            }
            .maqbool-header-content {
              display: flex !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${isAdilSteel ? getAdilSteelHeader() : isHafizDaniyal ? getHafizDaniyalHeader() : isMaqbool ? getMaqboolHeader() : getMaknisaHeader(selectedLetterhead.companyName, selectedLetterhead.address, selectedLetterhead.phone, selectedLetterhead.email)}

          <div class="invoice-title">${invoiceTitle.toUpperCase()}</div>

          <div class="invoice-details">
            <div class="invoice-info">
              <div class="info-section">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Invoice Date:</strong> ${new Date(payable.transaction?.date || payable.created_at).toLocaleDateString()}</p>
                ${payable.due_date ? `<p><strong>Due Date:</strong> ${new Date(payable.due_date).toLocaleDateString()}</p>` : ''}
                ${payable.transaction?.mode_of_payment ? `<p><strong>Payment Mode:</strong> ${payable.transaction.mode_of_payment.replace('_',' ')}</p>` : ''}
              </div>
            </div>
            <div class="vendor-info">
              <div class="info-section">
                <h3>Vendor Details</h3>
                <p><strong>${payable.accountPayable?.name || 'Unknown Vendor'}</strong></p>
                ${payable.accountPayable?.number ? `<p>Phone: ${payable.accountPayable.number}</p>` : ''}
                ${payable.accountPayable?.city ? `<p>City: ${payable.accountPayable.city}</p>` : ''}
                ${payable.accountPayable?.address ? `<p>Address: ${payable.accountPayable.address}</p>` : ''}
              </div>
            </div>
          </div>

          ${products.length > 0 ? `
          <table class="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Unit</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Discount/Unit</th>
                <th class="text-right">Total</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(item => {
                const quantity = parseFloat(item.quantity || '0');
                const discountedUnitPrice = parseFloat(item.per_unit_rate || '0');
                const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                const actualUnitPrice = discountedUnitPrice + discountPerUnit;
                const actualTotal = quantity * actualUnitPrice;
                const totalDiscount = parseFloat(item.discount || '0') || (quantity * discountPerUnit);
                const subtotal = parseFloat(item.total_amount || '0');
                
                return `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.product.brand || '-'}</td>
                  <td>${item.product.unit || item.unit || '-'}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(actualUnitPrice)}</td>
                  <td class="text-right">${discountPerUnit > 0 ? `<span style="color: red;">-${formatDiscount(discountPerUnit)}</span>` : '<span style="color: #999;">-</span>'}</td>
                  <td class="text-right">${formatCurrency(actualTotal)}</td>
                  <td class="text-right">${totalDiscount > 0 ? `<span style="color: red;">-${formatDiscount(totalDiscount)}</span>` : '<span style="color: #999;">-</span>'}</td>
                  <td class="text-right">${formatCurrency(subtotal)}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
          ` : ''}

          <div class="payment-summary">
            <div class="summary-box">
              ${(() => {
                const actualTotal = products.reduce((sum, item) => {
                  const qty = parseFloat(item.quantity || '0');
                  const discountedRate = parseFloat(item.per_unit_rate || '0');
                  const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                  const actualUnitPrice = discountedRate + discountPerUnit;
                  return sum + (qty * actualUnitPrice);
                }, 0);
                
                const totalDiscount = products.reduce((sum, item) => {
                  const discount = parseFloat(item.discount || '0');
                  if (discount > 0) return sum + discount;
                  const qty = parseFloat(item.quantity || '0');
                  const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                  return sum + (qty * discountPerUnit);
                }, 0);
                
                const discountedTotal = parseFloat(payable.total_amount?.toString() || '0');
                const hasDiscount = totalDiscount > 0;
                
                return `
                  <div class="summary-row">
                    <span>Total:</span>
                    <span>${formatCurrency(actualTotal)}</span>
                  </div>
                  ${hasDiscount ? `
                    <div class="summary-row">
                      <span>Discount:</span>
                      <span style="color: red;">-${formatDiscount(totalDiscount)}</span>
                    </div>
                  ` : ''}
                  <div class="summary-row total ${hasDiscount ? 'border-t pt-2' : ''}">
                    <span>Discounted Total:</span>
                    <span>${formatCurrency(discountedTotal)}</span>
                  </div>
                  <div class="summary-row">
                    <span>Amount Paid:</span>
                    <span style="color: green;">${formatCurrency(payable.paid_amount)}</span>
                  </div>
                  <div class="summary-row">
                    <span>Amount Remaining:</span>
                    <span style="color: orange; font-weight: 600;">${formatCurrency(payable.remaining_payment)}</span>
                  </div>
                `;
              })()}
            </div>
          </div>

          ${isAdilSteel ? getAdilSteelFooter() : isHafizDaniyal ? getHafizDaniyalFooter() : isMaqbool ? getMaqboolFooter() : getMaknisaFooter()}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast({
      title: "Success",
      description: `${invoiceTitle} PDF generated successfully`,
    });
  };

  if (!payable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="payable-print-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print {payable ? getInvoiceTitle(payable.transaction?.type) : 'Purchase Invoice'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Letterhead</h3>
            <RadioGroup value={letterhead} onValueChange={(value: 'maknisa' | 'adil-steel' | 'hafiz-daniyal' | 'maqbool') => setLetterhead(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maknisa" id="maknisa" />
                <Label htmlFor="maknisa" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Maknisa Procurement
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adil-steel" id="adil-steel" />
                <Label htmlFor="adil-steel" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Adil Steel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hafiz-daniyal" id="hafiz-daniyal" />
                <Label htmlFor="hafiz-daniyal" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Hafiz Daniyal Building Material
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maqbool" id="maqbool" />
                <Label htmlFor="maqbool" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Maqbool Building Material
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Payable Details</h4>
            <div className="text-sm space-y-1">
              <p><strong>Payable ID:</strong> {payable.id}</p>
              <p><strong>Vendor:</strong> {payable.accountPayable?.name || 'Unknown'}</p>
              <p><strong>Amount:</strong> {formatCurrency(payable.total_amount)}</p>
              <p><strong>Paid:</strong> {formatCurrency(payable.paid_amount)}</p>
              <p><strong>Remaining:</strong> {formatCurrency(payable.remaining_payment)}</p>
              <p><strong>Products:</strong> {payable.products?.length || 0} item(s)</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              generatePDF();
              // Close modal after printing
              setTimeout(() => {
                onClose();
              }, 1000);
            }} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generate PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

