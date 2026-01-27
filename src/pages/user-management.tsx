import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UsersTable } from "@/components/user-management/users-table";
import { UserFormModal } from "@/components/user-management/user-form-modal";
import { UserViewModal } from "@/components/user-management/user-view-modal";
import { UserDeleteModal } from "@/components/user-management/user-delete-modal";
import { getApiUrl } from "@/lib/queryClient";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'seller' | 'purchaser' | 'accountant';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export default function UserManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: usersResponse, isLoading, refetch } = useQuery<{
    success: boolean;
    data: User[];
    count: number;
  }>({
    queryKey: ['/api/users', searchTerm, statusFilter, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const response = await fetch(getApiUrl(`/api/users?${params.toString()}`), { 
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  const users = usersResponse?.data || [];

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseModals();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6" data-testid="user-management-content">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage users and their access to the system
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 w-full sm:w-auto"
          data-testid="button-create-user"
        >
          <Plus className="w-4 h-4" />
          <span>Create User</span>
        </Button>
      </div>

      <UsersTable
        users={users}
        isLoading={isLoading}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onRoleFilterChange={setRoleFilter}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
      />

      <UserFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        mode="create"
        onSuccess={handleSuccess}
      />

      <UserFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        mode="edit"
        user={selectedUser}
        onSuccess={handleSuccess}
      />

      <UserViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseModals}
        user={selectedUser}
      />

      <UserDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseModals}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

