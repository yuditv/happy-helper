import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";
import { WhatsAppNumberFilter } from "@/components/WhatsAppNumberFilter";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import Index from "@/pages/Index";
import ScheduledMessages from "@/pages/ScheduledMessages";
import ResellerArea from "@/pages/ResellerArea";
import Mentorias from "@/pages/Mentorias";
import Paineis from "@/pages/Paineis";
import Creditos from "@/pages/Creditos";
import Contacts from "@/pages/Contacts";

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");

  const renderContent = () => {
    switch (activeSection) {
      case "clients":
        return <Index />;
      case "contatos":
        return <Contacts />;
      case "disparo":
        return <ScheduledMessages />;
      case "filtrar":
        return <WhatsAppNumberFilter />;
      case "conexao":
        return <WhatsAppConnection />;
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
        return <Creditos />;
      case "mentorias":
        return <Mentorias />;
      case "paineis":
        return <Paineis />;
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
          <main className="flex-1 relative overflow-auto">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
