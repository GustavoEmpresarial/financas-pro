import { SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/layouts/AppSidebar";
import { MobileBottomNav } from "@/shared/layouts/MobileBottomNav";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex h-14 items-center justify-between border-b bg-card/50 px-4 backdrop-blur-sm lg:px-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
          <div className="p-4 pb-20 lg:p-6 lg:pb-6">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
