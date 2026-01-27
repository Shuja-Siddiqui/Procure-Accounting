import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CompanySpendingData {
  companyName: string;
  companySlug: string;
  purchaseAmount: number;
  saleAmount: number;
  color: string;
}

interface ProductJunction {
  product_company_name?: string;
  total_amount?: string;
}

interface Transaction {
  id: string;
  type: string;
  total_amount: string;
  account_payable_name?: string;
  account_receivable_name?: string;
  date: string;
  productJunctions?: ProductJunction[];
}

export function CompanySpendingProgress() {
  const [viewMode, setViewMode] = useState<"purchase" | "sale">("purchase");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Past 30 days");

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Calculate date range based on selected period
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    let dateFromDate: Date | undefined;
    
    switch (selectedPeriod) {
      case "Past 7 days":
        dateFromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "Past 90 days":
        dateFromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "All time":
        return { dateFrom: undefined, dateTo: undefined };
      default: // Past 30 days
        dateFromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return {
      dateFrom: dateFromDate ? dateFromDate.toISOString().split('T')[0] : undefined,
      dateTo: now.toISOString().split('T')[0],
    };
  }, [selectedPeriod]);

  // Fetch purchase transactions
  const { data: purchaseData, isLoading: isLoadingPurchases } = useQuery<{
    success: boolean;
    data: Transaction[];
  }>({
    queryKey: ['/api/transactions', 'purchases', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'purchase');
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch purchases');
      return response.json();
    },
  });

  // Fetch sale transactions
  const { data: saleData, isLoading: isLoadingSales } = useQuery<{
    success: boolean;
    data: Transaction[];
  }>({
    queryKey: ['/api/transactions', 'sales', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'sale');
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    },
  });

  // Process transactions to group by company from products
  const processCompanyData = (): CompanySpendingData[] => {
    const companyMap = new Map<string, { purchaseAmount: number; saleAmount: number; name: string }>();

    // Process purchase transactions - group by product company name
    purchaseData?.data?.forEach((transaction) => {
      if (transaction.productJunctions && transaction.productJunctions.length > 0) {
        // Group by product company name
        transaction.productJunctions.forEach((junction) => {
          const companyName = junction.product_company_name || 'Unknown';
          const amount = parseFloat(junction.total_amount || '0');
          
          if (!companyMap.has(companyName)) {
            companyMap.set(companyName, { purchaseAmount: 0, saleAmount: 0, name: companyName });
          }
          const company = companyMap.get(companyName)!;
          company.purchaseAmount += amount;
        });
      } else {
        // Fallback: if no product junctions, use transaction total (shouldn't happen for purchase/sale)
        const companyName = transaction.account_payable_name || 'Unknown';
        const amount = parseFloat(transaction.total_amount || '0');
        
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, { purchaseAmount: 0, saleAmount: 0, name: companyName });
        }
        const company = companyMap.get(companyName)!;
        company.purchaseAmount += amount;
      }
    });

    // Process sale transactions - group by product company name
    saleData?.data?.forEach((transaction) => {
      if (transaction.productJunctions && transaction.productJunctions.length > 0) {
        // Group by product company name
        transaction.productJunctions.forEach((junction) => {
          const companyName = junction.product_company_name || 'Unknown';
          const amount = parseFloat(junction.total_amount || '0');
          
          if (!companyMap.has(companyName)) {
            companyMap.set(companyName, { purchaseAmount: 0, saleAmount: 0, name: companyName });
          }
          const company = companyMap.get(companyName)!;
          company.saleAmount += amount;
        });
      } else {
        // Fallback: if no product junctions, use transaction total (shouldn't happen for purchase/sale)
        const companyName = transaction.account_receivable_name || 'Unknown';
        const amount = parseFloat(transaction.total_amount || '0');
        
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, { purchaseAmount: 0, saleAmount: 0, name: companyName });
        }
        const company = companyMap.get(companyName)!;
        company.saleAmount += amount;
      }
    });

    // Convert to array and assign colors
    const colors = ["#8B5CF6", "#EC4899", "#F97316", "#10B981", "#3B82F6", "#F59E0B"];
    return Array.from(companyMap.entries())
      .filter(([name]) => name !== 'Unknown') // Filter out unknown companies
      .map(([name, data], index) => {
        // Generate slug from company name
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return {
          companyName: name,
          companySlug: slug,
          purchaseAmount: data.purchaseAmount,
          saleAmount: data.saleAmount,
          color: colors[index % colors.length],
        };
      })
      .sort((a, b) => {
        // Sort by the selected view mode amount (descending)
        const aAmount = viewMode === "purchase" ? a.purchaseAmount : a.saleAmount;
        const bAmount = viewMode === "purchase" ? b.purchaseAmount : b.saleAmount;
        return bAmount - aAmount;
      });
  };

  // Process company data with memoization
  const data = useMemo(() => processCompanyData(), [purchaseData, saleData, viewMode]);

  // Calculate totals for the selected view mode
  const totalAmount = useMemo(() => {
    return data.reduce(
      (sum, company) =>
        sum + (viewMode === "purchase" ? company.purchaseAmount : company.saleAmount),
      0
    );
  }, [data, viewMode]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get company logo path - try multiple variations
  const getCompanyLogo = (slug: string, companyName: string): string => {
    // Try the slug path first
    const slugPath = `/images/${slug}/logo.png`;
    return slugPath;
  };

  // Get company initials for fallback
  const getCompanyInitials = (companyName: string): string => {
    const words = companyName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  };

  // Company Item Component
  const CompanyItem = ({ company, amount }: { company: CompanySpendingData; amount: number }) => {
    const [logoError, setLogoError] = useState(false);
    const logoPath = getCompanyLogo(company.companySlug, company.companyName);

    return (
      <div
        className="flex flex-row w-auto rounded-xl items-center justify-start gap-2 flex-1 min-w-[140px]"
        style={{ backgroundColor: company.color + "50" }}
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ 
            backgroundColor: logoError ? company.color : 'transparent',
            color: logoError ? 'white' : company.color
          }}
        >
          {!logoError ? (
            <img
              src={logoPath}
              alt={company.companyName}
              className="w-full h-full object-contain p-1.5"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-xs font-bold">
              {getCompanyInitials(company.companyName)}
            </span>
          )}
        </div>
        <div className="flex flex-col items-start justify-center gap-0.5 flex-1 min-w-0">
          <span className="text-xs font-medium truncate w-full" style={{ color: company.color }}>
            {company.companyName}
          </span>
          <span className="text-sm font-semibold">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Company Spending</CardTitle>
          <div className="flex items-center gap-2">
            {/* Purchase | Sale Toggle */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setViewMode("purchase")}
                className={cn(
                  "px-3 py-1 rounded-md transition-colors",
                  viewMode === "purchase"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted border border-gray-300 text-muted-foreground hover:bg-muted/80"
                )}
              >
                Purchase
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={() => setViewMode("sale")}
                className={cn(
                  "px-3 py-1 rounded-md transition-colors",
                  viewMode === "sale"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted border border-gray-300 text-muted-foreground hover:bg-muted/80"
                )}
              >
                Sale
              </button>
            </div>
            <div className="flex gap-2">
              <select
                className="text-xs border rounded px-2 py-1 bg-background"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="Past 7 days">Past 7 days</option>
                <option value="Past 30 days">Past 30 days</option>
                <option value="Past 90 days">Past 90 days</option>
                <option value="All time">All time</option>
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingPurchases || isLoadingSales ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading company spending data...
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No company spending data found for the selected period.
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="w-full h-10 rounded-lg overflow-hidden flex border border-border/50">
              {data.length > 0 && totalAmount > 0 ? (
                data.map((company, index) => {
                  const amount =
                    viewMode === "purchase" ? company.purchaseAmount : company.saleAmount;
                  const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

                  // Only show segments with actual data
                  if (percentage <= 0) return null;

                  return (
                    <div
                      key={company.companySlug}
                      className={cn("h-full transition-all duration-300 flex-shrink-0")}
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: company.color,
                        minWidth: percentage > 0 ? '2px' : '0',
                      }}
                      title={`${company.companyName}: ${formatCurrency(amount)}`}
                    />
                  );
                })
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No data available</span>
                </div>
              )}
            </div>

            {/* Company Breakdown */}
            <div className="flex flex-wrap gap-4">
              {data.map((company) => {
                const amount =
                  viewMode === "purchase" ? company.purchaseAmount : company.saleAmount;
                return (
                  <CompanyItem key={company.companySlug} company={company} amount={amount} />
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
