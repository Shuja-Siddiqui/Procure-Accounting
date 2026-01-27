import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface ReceivableProduct {
  id: string;
  product_id: string;
  quantity: string;
  unit?: string | null;
  per_unit_rate: string;
  unit_price?: string;
  total_amount: string;
  discount?: string;
  discount_per_unit?: string;
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
  products?: ReceivableProduct[];
  sale_invoice_number?: string | null;
}

interface ReceivablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: Receivable | null;
  keepDetailModalOpen?: boolean; // If true, don't close detail modal when this opens
}

export function ReceivablePrintModal({ isOpen, onClose, receivable, keepDetailModalOpen }: ReceivablePrintModalProps) {
  const { toast } = useToast();

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

  const getMaknisaHeader = () => {
    const baseUrl = window.location.origin;
    return `
      <div class="maknisa-header">
        <div class="maknisa-header-content">
          <img src="${baseUrl}/images/maknisa/logo.png" alt="Maknisa Logo" class="maknisa-logo" onerror="this.style.display='none'">
          <img src="${baseUrl}/images/maknisa/text.png" alt="Maknisa" class="maknisa-text" onerror="this.style.display='none'">
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
          <div class="maqbool-logo-section">
            <img src="${baseUrl}/images/maqbool/logo.png" alt="Maqbool Building Material Logo" class="maqbool-logo" onerror="this.style.display='none'">
          </div>
          <div class="maqbool-text-section">
            <h1 class="maqbool-company-name">MAQBOOL</h1>
            <h3 class="maqbool-company-subtitle">BUILDING MATERIAL</h3>
          </div>
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
    if (!receivable) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Helper function to determine company from products
    const getCompanyFromProducts = () => {
      if (!receivable.products || receivable.products.length === 0) return 'maknisa';
      const companyName = receivable.products[0]?.product?.company_name?.toLowerCase() || '';
      if (companyName.includes('adil steel')) return 'adil-steel';
      if (companyName.includes('hafiz daniyal') || companyName.includes('hafiz daniyal hassan')) return 'hafiz-daniyal';
      if (companyName.includes('maqbool') || companyName.includes('maqbool building material')) return 'maqbool';
      return 'maknisa';
    };

    const detectedCompany = getCompanyFromProducts();
    const products = receivable.products || [];

    const invoiceNumber =
      receivable.transaction?.sale_invoice_number ||
      receivable.sale_invoice_number ||
      receivable.id.replace(/-/g, '').slice(-7).padStart(7, '0').toUpperCase();

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sale Invoice ${invoiceNumber}</title>
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
          /* Maknisa Header Styles */
          .maknisa-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .maknisa-header-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .maknisa-logo {
            max-width: 150px;
            height: auto;
            max-height: 100px;
            object-fit: contain;
          }
          .maknisa-text {
            max-width: 200px;
            height: auto;
            max-height: 50px;
            object-fit: contain;
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
          .invoice-info, .client-info {
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
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
          }
          .summary-box {
            width: 260px;
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 12px 16px;
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
          ${detectedCompany === 'adil-steel' ? getAdilSteelHeader() : detectedCompany === 'hafiz-daniyal' ? getHafizDaniyalHeader() : detectedCompany === 'maqbool' ? getMaqboolHeader() : getMaknisaHeader()}

          <div class="invoice-title">${getInvoiceTitle(receivable.transaction?.type).toUpperCase()}</div>

          <div class="invoice-details">
            <div class="invoice-info">
              <div class="info-section">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Date:</strong> ${new Date(receivable.transaction?.date || receivable.created_at).toLocaleDateString()}</p>
                ${receivable.transaction?.mode_of_payment ? `<p><strong>Payment Mode:</strong> ${receivable.transaction.mode_of_payment.replace('_', ' ').toUpperCase()}</p>` : ''}
              </div>
            </div>
            <div class="client-info">
              <div class="info-section">
                <h3>Client Details</h3>
                <p><strong>${receivable.accountReceivable?.name || 'Unknown Client'}</strong></p>
                ${receivable.accountReceivable?.ar_id ? `<p>AR ID: ${receivable.accountReceivable.ar_id}</p>` : ''}
                ${receivable.accountReceivable?.number ? `<p>Phone: ${receivable.accountReceivable.number}</p>` : ''}
                ${receivable.accountReceivable?.city ? `<p>City: ${receivable.accountReceivable.city}</p>` : ''}
                ${receivable.accountReceivable?.address ? `<p>Address: ${receivable.accountReceivable.address}</p>` : ''}
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
              ${products.map((item: any) => {
                const quantity = parseFloat(item.quantity || '0');
                const discountedUnitPrice = parseFloat(item.unit_price || item.per_unit_rate || '0');
                const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                const actualUnitPrice = discountedUnitPrice + discountPerUnit;
                const actualTotal = quantity * actualUnitPrice;
                const totalDiscount = parseFloat(item.discount || '0') || (quantity * discountPerUnit);
                const subtotal = parseFloat(item.total_amount || '0');
                
                return `
                <tr>
                  <td>${item.product?.name || 'Unknown Product'}</td>
                  <td>${item.product?.brand || '-'}</td>
                  <td>${item.product?.unit || item.unit || '-'}</td>
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
          ` : '<p>No products available</p>'}

          <div class="payment-summary">
            <div class="summary-box">
              ${(() => {
                const transactionType = receivable.transaction?.type;
                
                // For advance_sale_payment, show only total paid amount
                if (transactionType === 'advance_sale_payment') {
                  const totalPaid = parseFloat(receivable.total_payment?.toString() || receivable.amount?.toString() || '0');
                  return `
                    <div class="summary-row total border-t pt-2">
                      <span>Total Paid Amount:</span>
                      <span style="color: green; font-weight: 600;">${formatCurrency(totalPaid)}</span>
                    </div>
                  `;
                }
                
                // For receive_able and receive_able_vendor, show Total, Paid, Remaining
                if (transactionType === 'receive_able' || transactionType === 'receive_able_vendor') {
                  const total = parseFloat(receivable.amount?.toString() || receivable.total_payment?.toString() || '0');
                  const paid = parseFloat(receivable.total_payment?.toString() || '0');
                  const remaining = parseFloat(receivable.remaining_payment?.toString() || '0');
                  
                  return `
                    <div class="summary-row">
                      <span>Total:</span>
                      <span>${formatCurrency(total)}</span>
                    </div>
                    <div class="summary-row">
                      <span>Paid:</span>
                      <span style="color: green;">${formatCurrency(paid)}</span>
                    </div>
                    <div class="summary-row total border-t pt-2">
                      <span>Remaining:</span>
                      <span style="color: orange; font-weight: 600;">${formatCurrency(remaining)}</span>
                    </div>
                  `;
                }
                
                // For sale invoices with products, show detailed breakdown
                if (products.length > 0) {
                  const actualTotal = products.reduce((sum: number, item: any) => {
                    const qty = parseFloat(item.quantity || '0');
                    const discountedRate = parseFloat(item.unit_price || item.per_unit_rate || '0');
                    const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                    const actualUnitPrice = discountedRate + discountPerUnit;
                    return sum + (qty * actualUnitPrice);
                  }, 0);
                  
                  const totalDiscount = products.reduce((sum: number, item: any) => {
                    const discount = parseFloat(item.discount || '0');
                    if (discount > 0) return sum + discount;
                    const qty = parseFloat(item.quantity || '0');
                    const discountPerUnit = parseFloat(item.discount_per_unit || '0');
                    return sum + (qty * discountPerUnit);
                  }, 0);
                  
                  const discountedTotal = parseFloat(receivable.amount?.toString() || '0');
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
                      <span>Amount Received:</span>
                      <span style="color: green;">${formatCurrency(receivable.total_payment)}</span>
                    </div>
                    <div class="summary-row">
                      <span>Amount Remaining:</span>
                      <span style="color: orange; font-weight: 600;">${formatCurrency(receivable.remaining_payment)}</span>
                    </div>
                  `;
                }
                
                // Default fallback
                const total = parseFloat(receivable.amount?.toString() || '0');
                const paid = parseFloat(receivable.total_payment?.toString() || '0');
                const remaining = parseFloat(receivable.remaining_payment?.toString() || '0');
                
                return `
                  <div class="summary-row">
                    <span>Total:</span>
                    <span>${formatCurrency(total)}</span>
                  </div>
                  <div class="summary-row">
                    <span>Paid:</span>
                    <span style="color: green;">${formatCurrency(paid)}</span>
                  </div>
                  <div class="summary-row total border-t pt-2">
                    <span>Remaining:</span>
                    <span style="color: orange; font-weight: 600;">${formatCurrency(remaining)}</span>
                  </div>
                `;
              })()}
            </div>
          </div>

          ${detectedCompany === 'adil-steel' ? getAdilSteelFooter() : detectedCompany === 'hafiz-daniyal' ? getHafizDaniyalFooter() : detectedCompany === 'maqbool' ? getMaqboolFooter() : getMaknisaFooter()}
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
      description: "Sale Invoice PDF generated successfully",
    });
  };

  // Auto-print when modal opens
  useEffect(() => {
    if (isOpen && receivable) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        generatePDF();
        // Close modal after printing
        setTimeout(() => {
          onClose();
        }, 1000);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, receivable]);

  if (!receivable) return null;

  return null; // Modal doesn't show UI, it just triggers print
}

