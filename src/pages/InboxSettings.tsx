import { useState } from "react";
import { ArrowLeft, Settings, Users, UserPlus, Tag, MessageSquare, Zap, Play, ScrollText, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Settings components
import { CannedResponsesSettings } from "@/components/Inbox/Settings/CannedResponsesSettings";
import { LabelsSettings } from "@/components/Inbox/Settings/LabelsSettings";
import { TeamsSettings } from "@/components/Inbox/Settings/TeamsSettings";
import { MacrosSettings } from "@/components/Inbox/Settings/MacrosSettings";
import { AutomationSettings } from "@/components/Inbox/Settings/AutomationSettings";
import { AuditLogsSettings } from "@/components/Inbox/Settings/AuditLogsSettings";
import { BusinessHoursSettings } from "@/components/Inbox/Settings/BusinessHoursSettings";

type SettingsSection = 
  | "canned-responses"
  | "labels"
  | "teams"
  | "macros"
  | "automation"
  | "business-hours"
  | "audit-logs";

interface MenuItem {
  id: SettingsSection;
  title: string;
  description: string;
  icon: React.ElementType;
}

const menuItems: MenuItem[] = [
  {
    id: "canned-responses",
    title: "Respostas Prontas",
    description: "Templates de mensagens rápidas",
    icon: MessageSquare,
  },
  {
    id: "labels",
    title: "Etiquetas",
    description: "Gerenciar etiquetas coloridas",
    icon: Tag,
  },
  {
    id: "teams",
    title: "Equipes",
    description: "Agrupar agentes em times",
    icon: Users,
  },
  {
    id: "macros",
    title: "Macros",
    description: "Ações automáticas pré-definidas",
    icon: Play,
  },
  {
    id: "automation",
    title: "Automação",
    description: "Regras baseadas em eventos",
    icon: Zap,
  },
  {
    id: "business-hours",
    title: "Horário Comercial",
    description: "Expediente por instância",
    icon: Clock,
  },
  {
    id: "audit-logs",
    title: "Auditoria",
    description: "Log de atividades do sistema",
    icon: ScrollText,
  },
];

export default function InboxSettings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>("canned-responses");

  const renderContent = () => {
    switch (activeSection) {
      case "canned-responses":
        return <CannedResponsesSettings />;
      case "labels":
        return <LabelsSettings />;
      case "teams":
        return <TeamsSettings />;
      case "macros":
        return <MacrosSettings />;
      case "automation":
        return <AutomationSettings />;
      case "business-hours":
        return <BusinessHoursSettings />;
      case "audit-logs":
        return <AuditLogsSettings />;
      default:
        return <CannedResponsesSettings />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Configurações do Inbox</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Menu */}
        <aside className="w-64 border-r shrink-0">
          <ScrollArea className="h-full">
            <nav className="p-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 mt-0.5 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <div className={cn(
                        "font-medium text-sm",
                        isActive ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {item.title}
                      </div>
                      <div className={cn(
                        "text-xs mt-0.5 truncate",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
