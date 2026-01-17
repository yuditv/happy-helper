import { useState, lazy, Suspense, memo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";

// Lazy load heavy components
const Index = lazy(() => import("@/pages/Index"));
const ScheduledMessages = lazy(() => import("@/pages/ScheduledMessages"));
const ResellerArea = lazy(() => import("@/pages/ResellerArea"));
const Mentorias = lazy(() => import("@/pages/Mentorias"));
const Paineis = lazy(() => import("@/pages/Paineis"));
const Creditos = lazy(() => import("@/pages/Creditos"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const WhatsAppNumberFilter = lazy(() => import("@/components/WhatsAppNumberFilter").then(m => ({ default: m.WhatsAppNumberFilter })));
const WhatsAppConnection = lazy(() => import("@/components/WhatsAppConnection").then(m => ({ default: m.WhatsAppConnection })));

const ContentLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <SidebarInset className="flex flex-col">
          <main className="flex-1 relative overflow-auto">
            <Suspense fallback={<ContentLoader />}>
              {renderContent()}
            </Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
