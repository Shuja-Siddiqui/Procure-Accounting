import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Building2, MapPin, Phone, Users } from "lucide-react";
import { AccountPayablesTable } from "@/components/account-payables/account-payables-table";
import { AccountPayableFormModal } from "@/components/account-payables/account-payable-form-modal";
import { AccountPayableDeleteModal } from "@/components/account-payables/account-payable-delete-modal";
import { useToast } from "@/hooks/use-toast";

interface AccountPayable {
  id: string;
  ap_id: string;
  name: string;
  number?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  balance?: string | number;
  created_at: string;
  updated_at: string;
}

interface AccountPayableStats {
  totalAccountPayables: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  cityBreakdown: Array<{ city: string; count: number }>;
}

export default function AccountPayablesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccountPayable, setSelectedAccountPayable] = useState<AccountPayable | null>(null);

  // Fetch accountPayables with filters
  const { data: accountPayablesData, isLoading: accountPayablesLoading, refetch: refetchAccountPayables } = useQuery<{
    success: boolean;
    data: AccountPayable[];
    count: number;
  }>({
    queryKey: ['/api/account-payables'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (cityFilter !== 'all') params.append('city', cityFilter);
      
      const url = `/api/account-payables${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    },
  });

  // Fetch accountPayable statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    success: boolean;
    data: AccountPayableStats;
  }>({
    queryKey: ['/api/account-payables/stats'],
    queryFn: async () => {
      const response = await fetch('/api/account-payables/stats', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    },
  });

  const accountPayables: AccountPayable[] = accountPayablesData?.data || [];
  const stats: AccountPayableStats = statsData?.data || {
    totalAccountPayables: 0,
    statusBreakdown: [],
    cityBreakdown: []
  };

  const handleCreateAccountPayable = () => {
    setSelectedAccountPayable(null);
    setIsCreateModalOpen(true);
  };

  const handleViewAccountPayable = (accountPayable: AccountPayable) => {
    setLocation(`/account-payables/${accountPayable.id}`);
  };

  const handleEditAccountPayable = (accountPayable: AccountPayable) => {
    setSelectedAccountPayable(accountPayable);
    setIsEditModalOpen(true);
  };

  const handleDeleteAccountPayable = (accountPayable: AccountPayable) => {
    setSelectedAccountPayable(accountPayable);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedAccountPayable(null);
  };

  const handleSuccess = () => {
    refetchAccountPayables();
    handleModalClose();
    toast({
      title: "Success",
      description: "AccountPayable operation completed successfully",
    });
  };

  const activeAccountPayables = stats.statusBreakdown.find(s => s.status === 'active')?.count || 0;
  const inactiveAccountPayables = stats.statusBreakdown.find(s => s.status === 'inactive')?.count || 0;

  return (
    <div className="flex-1 overflow-auto p-6" data-testid="accountPayables-page">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AccountPayables</h1>
          <p className="text-muted-foreground">
            Manage your accountPayable relationships and contact information
          </p>
        </div>
        <Button onClick={handleCreateAccountPayable} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add AccountPayable
        </Button>
      </div>

      {/* Stats Cards */}
      {!statsLoading && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AccountPayables</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              <div className="md:text-2xl text-lg font-bold">{stats.totalAccountPayables}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active AccountPayables</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              <div className="md:text-2xl text-lg font-bold text-green-600">{activeAccountPayables}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive AccountPayables</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              <div className="md:text-2xl text-lg font-bold text-red-600">{inactiveAccountPayables}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cities</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground md:block hidden" />
            </CardHeader>
            <CardContent>
              <div className="md:text-2xl text-lg font-bold">{stats.cityBreakdown.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter accountPayables by status, city, or search term</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search accountPayables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {stats.cityBreakdown.map((city) => (
                  <SelectItem key={city.city} value={city.city || 'unknown'}>
                    {city.city || 'Unknown'} ({city.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AccountPayables Table */}
      <Card>
        <CardHeader>
          <CardTitle>AccountPayables</CardTitle>
          <CardDescription>
            {accountPayablesLoading ? "Loading accountPayables..." : `${accountPayables.length} accountPayable${accountPayables.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountPayablesTable
            accountPayables={accountPayables}
            isLoading={accountPayablesLoading}
            onView={handleViewAccountPayable}
            onEdit={handleEditAccountPayable}
            onDelete={handleDeleteAccountPayable}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <AccountPayableFormModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        mode="create"
        accountPayable={null}
        onSuccess={handleSuccess}
      />
      
      <AccountPayableFormModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        mode="edit"
        accountPayable={selectedAccountPayable}
        onSuccess={handleSuccess}
      />
      
      <AccountPayableDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleModalClose}
        accountPayable={selectedAccountPayable}
        onSuccess={handleSuccess}
      />
      </div>
    </div>
  );
}
