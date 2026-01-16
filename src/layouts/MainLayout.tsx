import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";
import { Users, Shield, Tv } from "lucide-react";
import Index from "@/pages/Index";

const sectionInfo = {
  clients: { title: "Gerenciador de Clientes", icon: Users },
  vpn: { title: "VPN Dashboard", icon: Shield },
  iptv: { title: "IPTV", icon: Tv },
};

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");
  const SectionIcon = sectionInfo[activeSection].icon;

  const renderContent = () => {
    switch (activeSection) {
      case "clients":
        return <Index />;
      case "vpn":
        return (
          <ExternalFrame
            url="https://servex.ws/dashboard"
            title="VPN Dashboard"
          />
        );
      case "iptv":
        return (
          <ExternalFrame
            url="https://bommesmo.site/#/sign-in"
            title="IPTV"
          />
        );
      default:
        return <Index />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <SidebarInset className="flex flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border/50 px-4 bg-gradient-to-r from-background to-card/50 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1 hover:bg-primary/10 hover:text-primary transition-colors" />
            <div className="h-6 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <SectionIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-foreground">
                {sectionInfo[activeSection].title}
              </span>
            </div>
          </header>
          <main className="flex-1 relative overflow-auto">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
