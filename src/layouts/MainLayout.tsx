import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";
import Index from "@/pages/Index";

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");

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
      case "creditos":
        return (
          <ExternalFrame
            url="https://lovable.dev/credits"
            title="Lovable Créditos"
          />
        );
      case "mentorias":
        return (
          <ExternalFrame
            url="https://mentorias.example.com"
            title="Mentorias"
          />
        );
      case "paineis":
        return (
          <ExternalFrame
            url="https://paineis.example.com"
            title="Painéis"
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
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 relative overflow-auto">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
