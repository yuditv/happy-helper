import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";
import Index from "@/pages/Index";
import ScheduledMessages from "@/pages/ScheduledMessages";
import ResellerArea from "@/pages/ResellerArea";
import Mentorias from "@/pages/Mentorias";

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");

  const renderContent = () => {
    switch (activeSection) {
      case "clients":
        return <Index />;
      case "disparo":
        return <ScheduledMessages />;
      case "revenda":
        return <ResellerArea />;
      case "vpn":
        return (
          <ExternalFrame
            url="https://servex.ws/dashboard"
            title="VPN Dashboard"
          />
        );
      case "iptv":
        // IPTV now opens in new tab via AppSidebar
        return <Index />;
      case "creditos":
        return (
          <ExternalFrame
            url="https://lovable.dev/credits"
            title="Lovable Créditos"
          />
        );
      case "mentorias":
        return <Mentorias />;
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
