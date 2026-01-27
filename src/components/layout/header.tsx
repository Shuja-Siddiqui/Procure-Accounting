import { useLocation } from "wouter";
import { Bell, Settings, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarContext } from "@/contexts/sidebar-context";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// const pageInfo = {
//   '/': {
//     title: 'Dashboard',
//     subtitle: 'Overview of your construction procurement system'
//   },
//   '/accounts': {
//     title: 'Accounts',
//     subtitle: 'Manage all accounts in your construction procurement system'
//   }
// };

export function Header() {
  const [location] = useLocation();
  // const info = pageInfo[location as keyof typeof pageInfo] || pageInfo['/'];
  const { toggleMobileSidebar, toggleTabletSidebar } = useSidebarContext();
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-4" data-testid="header">
      {/* Mobile Header (< 760px) */}
      <div className="flex items-center justify-between md:hidden">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </Button>
          <img src="/icons/procureIcon.png" alt="ProcureAccounts" className="w-8 h-8" />
          <h1 className="text-lg font-semibold text-foreground">Procure Accounts</h1>
        </div>
        {/* <Button variant="ghost" size="icon" data-testid="button-notifications">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Button> */}
      </div>

      {/* Tablet Header (760px - 1080px) - No hamburger, sidebar always icon-only */}
      <div className="hidden md:flex xl:hidden items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* No hamburger menu - sidebar is always icon-only */}
        </div>
        <div className="flex items-center space-x-3">
          {/* <Button variant="ghost" size="icon" data-testid="button-notifications">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-settings">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button> */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Desktop Header (> 1080px) */}
      <div className="hidden xl:flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* <div>
            <h2 className="text-2xl font-semibold text-foreground" data-testid="page-title">
              {info.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1" data-testid="page-subtitle">
              {info.subtitle}
            </p>
          </div> */}
        </div>
        <div className="flex items-center space-x-3">
          {/* <Button variant="ghost" size="icon" data-testid="button-notifications">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-settings">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button> */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
