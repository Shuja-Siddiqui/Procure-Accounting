import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, Users, MapPin, Building2 } from "lucide-react";
import { AccountReceivablesTable } from "@/components/account-receivables/account-receivables-table";
import { AccountReceivableFormModal } from "@/components/account-receivables/account-receivable-form-modal";
import { AccountReceivableDeleteModal } from "@/components/account-receivables/account-receivable-delete-modal";

interface AccountReceivable {
  id: string;
  ar_id: string;
  name: string;
  number?: string;
  cnic?: string;
  city?: string;
  address?: string;
  status: 'active' | 'inactive';
  construction_category?: 'grey' | 'finishing' | 'both';
  balance?: string | number;
  created_at: string;
  updated_at: string;
}

interface AccountReceivableStats {
  totalAccountReceivables: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  cityBreakdown: Array<{ city: string; count: number }>;
  constructionCategoryBreakdown: Array<{ construction_category: string; count: number }>;
}

export default function AccountReceivablesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccountReceivable, setSelectedAccountReceivable] = useState<AccountReceivable | null>(null);

  // Fetch account receivables with filters
  const { data: accountReceivablesData, isLoading: accountReceivablesLoading, refetch: refetchAccountReceivables } = useQuery<{
    success: boolean;
    data: AccountReceivable[];
  }>({
    queryKey: ['/api/account-receivables', searchTerm, statusFilter, cityFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (cityFilter !== 'all') params.append('city', cityFilter);
      if (categoryFilter !== 'all') params.append('construction_category', categoryFilter);

      const response = await fetch(`/api/account-receivables?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  // Fetch account receivable statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    data: AccountReceivableStats;
  }>({
    queryKey: ['/api/account-receivables/stats'],
    queryFn: async () => {
      const response = await fetch('/api/account-receivables/stats', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  const accountReceivables = accountReceivablesData?.data || [];
  const stats = statsData?.data || {
    totalAccountReceivables: 0,
    statusBreakdown: [],
    cityBreakdown: [],
    constructionCategoryBreakdown: []
  };

  const handleCreateAccountReceivable = () => {
    setSelectedAccountReceivable(null);
    setIsCreateModalOpen(true);
  };

  const handleViewAccountReceivable = (accountReceivable: AccountReceivable) => {
    setLocation(`/account-receivables/${accountReceivable.id}`);
  };

  const handleEditAccountReceivable = (accountReceivable: AccountReceivable) => {
    setSelectedAccountReceivable(accountReceivable);
    setIsEditModalOpen(true);
  };

  const handleDeleteAccountReceivable = (accountReceivable: AccountReceivable) => {
    setSelectedAccountReceivable(accountReceivable);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedAccountReceivable(null);
  };

  const handleSuccess = () => {
    refetchAccountReceivables();
    handleModalClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grey':
        return 'bg-gray-100 text-gray-800';
      case 'finishing':
        return 'bg-blue-100 text-blue-800';
      case 'both':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6" data-testid="account-receivables-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account Receivables</h1>
            <p className="text-muted-foreground">
              Manage your account receivables and their information
            </p>
          </div>
          <Button onClick={handleCreateAccountReceivable} data-testid="create-account-receivable-button">
            <Plus className="mr-2 h-4 w-4" />
            Add Account Receivable
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Account Receivables</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="md:text-2xl text-lg font-bold">{stats.totalAccountReceivables}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Account Receivables</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="md:text-2xl text-lg font-bold">
                  {stats.statusBreakdown.find(s => s.status === 'active')?.count || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cities</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="md:text-2xl text-lg font-bold">{stats.cityBreakdown.length}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="md:text-2xl text-lg font-bold">{stats.constructionCategoryBreakdown.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search account receivables..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger data-testid="city-filter">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {stats.cityBreakdown.map((city) => (
                      <SelectItem key={city.city} value={city.city}>
                        {city.city} ({city.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="grey">Grey</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Receivables Table */}
        <Card>
          <CardHeader>
            <CardTitle>Account Receivables</CardTitle>
            <CardDescription>
              {accountReceivablesLoading ? "Loading account receivables..." : `${accountReceivables.length} account receivable${accountReceivables.length !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountReceivablesTable
              accountReceivables={accountReceivables}
              isLoading={accountReceivablesLoading}
              onView={handleViewAccountReceivable}
              onEdit={handleEditAccountReceivable}
              onDelete={handleDeleteAccountReceivable}
            />
          </CardContent>
        </Card>

        {/* Modals */}
        <AccountReceivableFormModal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={handleModalClose}
          mode={isCreateModalOpen ? 'create' : 'edit'}
          accountReceivable={selectedAccountReceivable}
          onSuccess={handleSuccess}
        />

        <AccountReceivableDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
          accountReceivable={selectedAccountReceivable}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}

