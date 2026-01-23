import { useState, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSection } from "@/components/AppSidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useToast } from "@/hooks/use-toast";

// Lazy load heavy components
const Index = lazy(() => import("@/pages/Index"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const WhatsApp = lazy(() => import("@/pages/WhatsApp"));
const FilterNumbers = lazy(() => import("@/pages/FilterNumbers"));
const AIAgent = lazy(() => import("@/pages/AIAgent"));
const WarmChips = lazy(() => import("@/pages/WarmChips"));
const Atendimento = lazy(() => import("@/pages/Atendimento"));

const ContentLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Handle section change with toast notification for keyboard shortcuts
  const handleSectionChange = (section: AppSection) => {
    setActiveSection(section);
  };

  // Enable keyboard shortcuts
  const { shortcuts } = useKeyboardShortcuts({
    onSectionChange: (section) => {
      const shortcut = shortcuts.find(s => s.section === section);
      handleSectionChange(section);
      if (shortcut) {
        toast({
          title: `${shortcut.label}`,
          description: `Ctrl+${shortcut.key}`,
          duration: 1500,
        });
      }
    },
  });

  // Check URL params for initial section
  useEffect(() => {
    const section = searchParams.get('section') as AppSection;
    if (section && ['clients', 'contatos', 'whatsapp', 'atendimento', 'filter-numbers', 'ai-agent', 'warm-chips'].includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);
  const renderContent = () => {
    switch (activeSection) {
      case "clients":
        return <Index />;
      case "contatos":
        return <Contacts />;
      case "whatsapp":
        return <WhatsApp />;
      case "filter-numbers":
        return <FilterNumbers />;
      case "ai-agent":
        return <AIAgent />;
      case "warm-chips":
        return <WarmChips />;
      case "atendimento":
        return <Atendimento />;
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
          onSectionChange={handleSectionChange}
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
