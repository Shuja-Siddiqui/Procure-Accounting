import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

interface UserViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function UserViewModal({ isOpen, onClose, user }: UserViewModalProps) {
  if (!user) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="mt-1 text-sm font-medium">{user.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-sm">{user.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="mt-1 text-sm">{user.phone || 'N/A'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-1">
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge 
                  variant={user.status === 'active' ? 'default' : 'secondary'}
                  className={user.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' 
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                  }
                >
                  {user.status}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="mt-1 text-sm font-mono text-xs">{user.id}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="mt-1 text-sm">{formatDate(user.created_at)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Updated At</label>
              <p className="mt-1 text-sm">{formatDate(user.updated_at)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

