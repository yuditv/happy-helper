import { useState, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FloatingSidebar, AppSection } from "@/components/FloatingSidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Lazy load heavy components
const Index = lazy(() => import("@/pages/Index"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const WhatsApp = lazy(() => import("@/pages/WhatsApp"));
const FilterNumbers = lazy(() => import("@/pages/FilterNumbers"));
const AIAgent = lazy(() => import("@/pages/AIAgent"));
const WarmChips = lazy(() => import("@/pages/WarmChips"));
const Atendimento = lazy(() => import("@/pages/Atendimento"));

const ContentLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="relative">
      <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
    </div>
  </div>
);

export function MainLayout() {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const handleSectionChange = (section: AppSection) => {
    setActiveSection(section);
  };

  const { shortcuts } = useKeyboardShortcuts({
    onSectionChange: (section) => {
      const shortcut = shortcuts.find(s => s.section === section);
      handleSectionChange(section);
      if (shortcut) {
        toast({
          title: shortcut.label,
          description: `Ctrl+${shortcut.key}`,
          duration: 1500,
        });
      }
    },
  });

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
    <div className="min-h-screen flex w-full relative">
      {/* Floating Sidebar */}
      <FloatingSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      {/* Main Content - with left padding for floating sidebar */}
      <motion.main 
        className="flex-1 ml-20 p-6 overflow-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        key={activeSection}
      >
        <Suspense fallback={<ContentLoader />}>
          {renderContent()}
        </Suspense>
      </motion.main>
    </div>
  );
}
