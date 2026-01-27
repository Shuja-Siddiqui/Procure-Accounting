import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import AccountDetail from "@/pages/account-detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import ProductBatches from "@/pages/product-batches";
import AccountPayables from "@/pages/account-payables";
import AccountPayableDetail from "@/pages/account-payable-detail";
import AccountReceivables from "@/pages/account-receivables";
import AccountReceivableDetail from "@/pages/account-receivable-detail";
import Purchasers from "@/pages/purchasers";
import PurchaserDetail from "@/pages/purchaser-detail";
// import Invoices from "@/pages/invoices";
import InvoiceDetail from "@/pages/invoice-detail";
import Transactions from "@/pages/transactions";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";

import DailyBookPayments from "@/pages/dailybook-payments";
import DailyBookReceipts from "@/pages/dailybook-receipts";
import DailyBookPurchaseInvoices from "./pages/dailybook-purchase-invoices";
import DailyBookSalePageInvoices from "./pages/dailybook-sale-invoices";
// import DailyBookTransfers from "./pages/dailybook-transfers";
import AccountPayableLedger from "./pages/account-payable-ledger";
import AccountReceivableLedger from "./pages/account-receivable-ledger";
import TrialBalance from "./pages/trial-balance";
import UserManagement from "./pages/user-management";
import InternalOperation from "./pages/internal-operation";
import InternalOperationTransfer from "./pages/internal-operation-transfer";
import InternalOperationDeposit from "./pages/internal-operation-deposit";
import InternalOperationPayroll from "./pages/internal-operation-payroll";
import InternalOperationFixedUtility from "./pages/internal-operation-fixed-utility";
import InternalOperationFixedExpense from "./pages/internal-operation-fixed-expense";
import InternalOperationMiscellaneous from "./pages/internal-operation-miscellaneous";
import DashboardNew from "./pages/dashboard-new";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Header />
            <div className="flex-1 overflow-auto bg-background">
              <Switch>
                <Route path="/">
                  <ProtectedRoute>
                    <DashboardNew />
                  </ProtectedRoute>
                </Route>
                <Route path="/accounts">
                  <ProtectedRoute>
                    <Accounts />
                  </ProtectedRoute>
                </Route>
                <Route path="/accounts/:id">
                  <ProtectedRoute>
                    <AccountDetail />
                  </ProtectedRoute>
                </Route>
                <Route path="/products">
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                </Route>
                <Route path="/products/:id">
                  <ProtectedRoute>
                    <ProductDetail />
                  </ProtectedRoute>
                </Route>
                <Route path="/products/:id/productBatchs">
                  <ProtectedRoute>
                    <ProductBatches />
                  </ProtectedRoute>
                </Route>
                <Route path="/account-payables">
                  <ProtectedRoute>
                    <AccountPayables />
                  </ProtectedRoute>
                </Route>
                <Route path="/account-payables/:id">
                  <ProtectedRoute>
                    <AccountPayableDetail />
                  </ProtectedRoute>
                </Route>
                <Route path="/account-receivables">
                  <ProtectedRoute>
                    <AccountReceivables />
                  </ProtectedRoute>
                </Route>
                <Route path="/account-receivables/:id">
                  <ProtectedRoute>
                    <AccountReceivableDetail />
                  </ProtectedRoute>
                </Route>
                <Route path="/purchasers">
                  <ProtectedRoute>
                    <Purchasers />
                  </ProtectedRoute>
                </Route>
                <Route path="/purchasers/:id">
                  <ProtectedRoute>
                    <PurchaserDetail />
                  </ProtectedRoute>
                </Route>
                {/* <Route path="/invoices">
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                </Route> */}
                <Route path="/invoices/:id">
                  <ProtectedRoute>
                    <InvoiceDetail />
                  </ProtectedRoute>
                </Route>
                <Route path="/transactions">
                  <ProtectedRoute>
                    <Transactions />
                  </ProtectedRoute>
                </Route>
                <Route path="/dailybook/purchase-invoices">
                  <ProtectedRoute>
                    <DailyBookPurchaseInvoices />
                  </ProtectedRoute>
                </Route>
                <Route path="/dailybook/sale-invoices">
                  <ProtectedRoute>
                    <DailyBookSalePageInvoices />
                  </ProtectedRoute>
                </Route>
                <Route path="/dailybook/payments">
                  <ProtectedRoute>
                    <DailyBookPayments />
                  </ProtectedRoute>
                </Route>
                <Route path="/dailybook/receipts">
                  <ProtectedRoute>
                    <DailyBookReceipts />
                  </ProtectedRoute>
                </Route>

                <Route path="/account-reports/account-receviable-ledger">
                  <ProtectedRoute>
                    <AccountReceivableLedger />
                  </ProtectedRoute>
                </Route>
                <Route path="/account-reports/account-payable-ledger">
                  <ProtectedRoute>
                    <AccountPayableLedger />
                  </ProtectedRoute>
                </Route>
                <Route path="/account-reports/trial-balance">
                  <ProtectedRoute>
                    <TrialBalance />
                  </ProtectedRoute>
                </Route>
                <Route path="/user-management">
                  <ProtectedRoute requireAdmin>
                    <UserManagement />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation">
                  <ProtectedRoute>
                    <InternalOperation />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation/transfer">
                  <ProtectedRoute>
                    <InternalOperationTransfer />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation/deposit">
                  <ProtectedRoute>
                    <InternalOperationDeposit />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation/payroll">
                  <ProtectedRoute>
                    <InternalOperationPayroll />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation/fixed-utility">
                  <ProtectedRoute>
                    <InternalOperationFixedUtility />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation/fixed-expense">
                  <ProtectedRoute>
                    <InternalOperationFixedExpense />
                  </ProtectedRoute>
                </Route>
                <Route path="/internal-operation/miscellaneous">
                  <ProtectedRoute>
                    <InternalOperationMiscellaneous />
                  </ProtectedRoute>
                </Route>
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <Toaster />
            <Router />
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
