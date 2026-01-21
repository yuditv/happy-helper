import { useState, lazy, Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";
import { AnimatedBackground } from "@/components/AnimatedBackground";

// Lazy load heavy components
const Index = lazy(() => import("@/pages/Index"));
const ResellerArea = lazy(() => import("@/pages/ResellerArea"));
const Mentorias = lazy(() => import("@/pages/Mentorias"));
const Paineis = lazy(() => import("@/pages/Paineis"));
const Creditos = lazy(() => import("@/pages/Creditos"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const WhatsApp = lazy(() => import("@/pages/WhatsApp"));

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
      case "whatsapp":
        return <WhatsApp />;
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
      <AnimatedBackground />
      <div className="min-h-screen flex w-full relative">
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
