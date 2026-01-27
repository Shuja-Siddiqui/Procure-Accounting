import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface SidebarContextType {
  isMobileOpen: boolean;
  isTabletOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  setIsTabletOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  toggleTabletSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTabletOpen, setIsTabletOpen] = useState(false); // Default closed on tablet

  // Handle window resize to close tablet sidebar when switching to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1080) {
        setIsTabletOpen(false);
      }
      if (window.innerWidth >= 760) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const toggleTabletSidebar = () => {
    setIsTabletOpen((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        isTabletOpen,
        setIsMobileOpen,
        setIsTabletOpen,
        toggleMobileSidebar,
        toggleTabletSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}

