import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Gavel,
  Home,
  CreditCard,
  Users,
  ShoppingCart,
  FileText,
  Package,
  User,
  MoreVertical,
  Building2,
  UserCheck,
  ShoppingBag,
  Receipt,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Settings,
  UserCog,
  LogOut,
  Settings2
} from "lucide-react";
import { useSidebarContext } from "@/contexts/sidebar-context";
import { useAuth } from "@/contexts/auth-context";

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, current: true },
  { name: 'Account Payables', href: '/account-payables', icon: Building2, current: false },
  { name: 'Account Receivables', href: '/account-receivables', icon: UserCheck, current: false },
  { name: 'Products', href: '/products', icon: Package, current: false },
  { name: 'Purchasers', href: '/purchasers', icon: ShoppingBag, current: false },
  // { name: 'Invoices', href: '/invoices', icon: FileText, current: false },
  { name: 'Transactions', href: '/transactions', icon: Receipt, current: false },
  { name: 'Accounts', href: '/accounts', icon: CreditCard, current: false },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isDailyBooksOpen, setIsDailyBooksOpen] = useState(false);
  const [isAccountReportsOpen, setIsAccountReportsOpen] = useState(false);
  const { isMobileOpen, setIsMobileOpen } = useSidebarContext();
  const { user, logout } = useAuth();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Daily Books submenu - filter based on role
  const getDailyBooksSubmenu = () => {
    const allItems = [
      { name: 'Purchase', href: '/dailybook/purchase-invoices' },
      { name: 'Sale', href: '/dailybook/sale-invoices' },
      { name: 'Payments', href: '/dailybook/payments' },
      { name: 'Receipts', href: '/dailybook/receipts' },
      // { name: 'Transfer', href: '/dailybook/transfer' },
      { name: 'Internal Operation', href: '/internal-operation' },
    ];

    // Seller can only see Sale and Receipts
    if (user?.role === 'seller') {
      return allItems.filter(item => item.name === 'Sale' || item.name === 'Receipts');
    }

    // All other roles see all items
    return allItems;
  };

  const dailyBooksSubmenu = getDailyBooksSubmenu();

  const accountReportsSubmenu = [
    { name: 'A/R Ledger', href: '/account-reports/account-receviable-ledger' },
    { name: 'A/P Ledger', href: '/account-reports/account-payable-ledger' },
    { name: 'Trial Balance', href: '/account-reports/trial-balance' },
  ];

  const isDailyBooksActive = dailyBooksSubmenu.some(item => location === item.href || location.startsWith('/internal-operation'));
  const isAccountReportsActive = accountReportsSubmenu.some(item => location === item.href || location.startsWith('/account-reports'));

  useEffect(() => {
    if (isDailyBooksActive) {
      setIsDailyBooksOpen(true);
    }

    if (isAccountReportsActive) {
      setIsAccountReportsOpen(true);
    }
  }, [isDailyBooksActive, isAccountReportsActive]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location, setIsMobileOpen]);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe && isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay (< 760px) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Tablet Overlay removed - sidebar always icon-only on tablet */}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out",
          // Mobile (< 760px): Full overlay sidebar
          "w-64 max-w-[80%] h-full overflow-y-auto",
          // Tablet and Desktop (>= 760px): Always visible, full width
          "md:w-72 md:static md:translate-x-0 md:overflow-visible",
          // Mobile: slide in/out
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="p-4 md:p-6 border-b border-border">
          {/* Tablet/Desktop branding */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="rounded-lg flex items-center justify-center flex-shrink-0">
              <img src="/icons/procureIcon.png" alt="ProcureAccounts" className="w-8 h-8" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">ProCure</h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Construction Procurement</p>
            </div>
          </div>
          {/* Mobile branding */}
          <div className="md:hidden flex items-center space-x-3">
            <div className="rounded-lg flex items-center justify-center">
              <img src="/icons/procureIcon.png" alt="ProcureAccounts" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">ProCure</h1>
              <p className="text-xs text-muted-foreground">Construction Procurement</p>
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden absolute top-6 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center shadow-lg"
              aria-label="Close sidebar"
              style={{ transform: 'translateY(-50%)' }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <nav className="flex-1 p-3 md:p-2 xl:p-4 overflow-y-auto">
          <ul className="space-y-2">

            {/* Dashboard */}
            {navigation.slice(0, 1).map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <button
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                        "md:justify-start",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                      title={item.name}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap">{item.name}</span>
                    </button>
                  </Link>
                </li>
              );
            })}

            {/* Daily Books - Show for all roles */}
            <li>
              <button
                onClick={() => setIsDailyBooksOpen(!isDailyBooksOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                  "md:justify-between",
                  isDailyBooksActive && "bg-accent text-accent-foreground"
                )}
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">Daily Books</span>
                </div>

                <div className="flex-shrink-0">
                  {isDailyBooksOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {isDailyBooksOpen && (
                <ul className="mt-1 space-y-1 ml-6">
                  {dailyBooksSubmenu.map((subItem) => {
                    const isSubActive = location === subItem.href;

                    const iconMap: Record<string, any> = {
                      "Purchase": ShoppingCart,
                      "Sale": ShoppingBag,
                      "Payments": CreditCard,
                      "Receipts": Receipt,
                      "Internal Operation": Settings2,
                    };

                    const Icon = iconMap[subItem.name] || ShoppingCart;

                    return (
                      <li key={subItem.name}>
                        <Link href={subItem.href}>
                          <button
                            className={cn(
                              "w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent",
                              "md:justify-start",
                              isSubActive && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">{subItem.name}</span>
                          </button>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Account Reports - Hide for seller */}
            {user?.role !== 'seller' && (
              <li>
                <button
                  onClick={() => setIsAccountReportsOpen(!isAccountReportsOpen)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                    "md:justify-between",
                    isAccountReportsActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">Account Reports</span>
                  </div>

                  <div className="flex-shrink-0">
                    {isAccountReportsOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isAccountReportsOpen && (
                  <ul className={cn(
                    "mt-1 space-y-1 transition-all duration-300",
                    "ml-5",
                    // Tablet: always icon-only, no expansion
                    "md:ml-0",
                    // Desktop: show full menu with text
                    "xl:ml-6",
                    // Always show submenu (icons on tablet, full on desktop)
                    "md:opacity-100 md:max-h-[500px] md:overflow-visible md:pointer-events-auto",
                    "xl:opacity-100 xl:max-h-[500px] xl:overflow-visible xl:pointer-events-auto"
                  )}>
                    {accountReportsSubmenu.map((subItem) => {
                      const isSubActive = location === subItem.href;

                      // Icon mapping for Account Reports submenu
                      const reportIconMap: Record<string, any> = {
                        "A/R Ledger": Receipt,
                        "A/P Ledger": FileText,
                        "Trial Balance": BookOpen,
                      };
                      const ReportIcon = reportIconMap[subItem.name] || FileText;

                      return (
                        <li key={subItem.name}>
                          <Link href={subItem.href}>
                            <button
                              className={cn(
                                "w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent",
                                "md:justify-start",
                                isSubActive && "bg-accent text-accent-foreground"
                              )}
                            >
                              <ReportIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">{subItem.name}</span>
                            </button>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            )}

            {/* Remaining navigation items - filtered by role */}
            {navigation.slice(1).map((item) => {
              // Seller can only see Products
              if (user?.role === 'seller' && item.name !== 'Products') {
                return null;
              }

              // All other roles see all items
              const isActive = location === item.href;
              const button = (
                <Link href={item.href}>
                  <button
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                      "md:justify-start",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">{item.name}</span>
                  </button>
                </Link>
              );

              return (
                <li key={item.name}>
                  {button}
                </li>
              );
            }).filter(Boolean)}

            {/* User Management - Admin Only */}
            {user?.role === 'admin' && (
              <li>
                <Link href="/user-management">
                  <button
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                      "md:justify-start",
                      location === '/user-management' && "bg-accent text-accent-foreground"
                    )}
                    title="User Management"
                  >
                    <UserCog className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">User Management</span>
                  </button>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Mobile Settings */}
        <div className="md:hidden px-4 py-2 border-t border-border">
          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent">
            <Settings className="w-4 h-4" />
            <span className="font-medium">Settings</span>
          </button>
        </div>

        {/* Mobile Logout Button */}
        {user && (
          <div className="md:hidden px-4 py-2 border-t border-border">
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-accent text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}

        {/* User Info */}
        {user && (
          <div className="p-3 md:p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

      </aside>
    </>
  );
}
