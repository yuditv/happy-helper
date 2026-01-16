import { Users, Send, Package, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import logoFuturistic from "@/assets/logo-futuristic.png";
import { cn } from "@/lib/utils";
import { useExternalLinks } from "@/hooks/useExternalLinks";
import { iconMap } from "@/components/ExternalLinksManager";
import { Globe } from "lucide-react";

export type AppSection = "clients" | "disparo" | "revenda" | "settings" | string;

interface AppSidebarProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const coreMenuItems = [
  {
    id: "clients" as AppSection,
    title: "Gerenciador",
    icon: Users,
  },
  {
    id: "disparo" as AppSection,
    title: "Disparo Em Massa",
    icon: Send,
  },
  {
    id: "revenda" as AppSection,
    title: "Área de Revenda",
    icon: Package,
  },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { links } = useExternalLinks();

  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Globe;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img
            src={logoFuturistic}
            alt="Logo"
            className="h-8 w-8 rounded-lg object-contain"
          />
          {!isCollapsed && (
            <span className="font-semibold text-foreground">Painel</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Core Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreMenuItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSectionChange(item.id)}
                      tooltip={item.title}
                      className={cn(
                        "h-10 gap-3",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* External Links */}
        {links.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Atalhos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => {
                  const isActive = activeSection === `external-${link.id}`;
                  const IconComponent = getIcon(link.icon);
                  return (
                    <SidebarMenuItem key={link.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => onSectionChange(`external-${link.id}`)}
                        tooltip={link.title}
                        className={cn(
                          "h-10 gap-3",
                          isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="font-medium">{link.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "settings"}
              onClick={() => onSectionChange("settings")}
              tooltip="Configurações"
              className={cn(
                "h-10 gap-3",
                activeSection === "settings" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
