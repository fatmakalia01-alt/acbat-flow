import React, { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar, { SidebarContent } from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AppLayout = React.forwardRef<HTMLDivElement, {}>(
  (_, ref) => {
    const { session, loading, user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { data: unreadCount = 0 } = useQuery({
      queryKey: ["unread-notifications", user?.id],
      queryFn: async () => {
        if (!user) return 0;
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false);
        return count ?? 0;
      },
      enabled: !!user,
      refetchInterval: 30000,
    });

    if (loading) {
      return (
        <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (!session) return <Navigate to="/login" replace />;

    return (
      <div ref={ref} className="flex min-h-screen bg-background border-none overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden h-[65px] border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-3">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px]">
                  <SidebarContent
                    collapsed={false}
                    unreadCount={unreadCount}
                    onItemClick={() => setIsMobileMenuOpen(false)}
                  />
                </SheetContent>
              </Sheet>
              <span className="font-display font-bold text-lg">ACBAT</span>
            </div>

            <Button variant="ghost" size="icon" className="relative h-10 w-10">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-safe-top pb-safe-bottom px-safe-left px-safe-right">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }
);

AppLayout.displayName = "AppLayout";

export default AppLayout;
