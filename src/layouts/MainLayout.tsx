import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { ExternalFrame } from "@/components/ExternalFrame";
import { ExternalLinksManager } from "@/components/ExternalLinksManager";
import { useExternalLinks } from "@/hooks/useExternalLinks";
import Index from "@/pages/Index";
import ScheduledMessages from "@/pages/ScheduledMessages";
import ResellerArea from "@/pages/ResellerArea";

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");
  const { links } = useExternalLinks();

  const renderContent = () => {
    // Core sections
    switch (activeSection) {
      case "clients":
        return <Index />;
      case "disparo":
        return <ScheduledMessages />;
      case "revenda":
        return <ResellerArea />;
      case "settings":
        return (
          <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Configurações</h1>
            <ExternalLinksManager />
          </div>
        );
    }

    // Check for external links
    if (activeSection.startsWith("external-")) {
      const linkId = activeSection.replace("external-", "");
      const link = links.find(l => l.id === linkId);
      if (link) {
        return (
          <ExternalFrame
            url={link.url}
            title={link.title}
          />
        );
      }
    }

    return <Index />;
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
