import { Users, Shield, Tv, Sparkles } from "lucide-react";
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

export type AppSection = "clients" | "vpn" | "iptv";

interface AppSidebarProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const menuItems = [
  {
    id: "clients" as AppSection,
    title: "Gerenciador de Clientes",
    icon: Users,
    description: "Gerencie seus clientes",
    gradient: "from-primary to-accent",
  },
  {
    id: "vpn" as AppSection,
    title: "VPN",
    icon: Shield,
    description: "Painel VPN",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "iptv" as AppSection,
    title: "IPTV",
    icon: Tv,
    description: "Painel IPTV",
    gradient: "from-orange-500 to-amber-500",
  },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-b from-sidebar-accent/30 to-transparent">
        <div className="flex items-center gap-3 p-3">
          <div className="relative">
            <img
              src={logoFuturistic}
              alt="Logo"
              className="h-9 w-9 rounded-xl object-contain logo-glow ring-2 ring-primary/20"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-sidebar-background" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground text-gradient">
                Painel Pro
              </span>
              <span className="text-[10px] text-sidebar-foreground/50">
                Gestão Completa
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSectionChange(item.id)}
                      tooltip={item.title}
                      className={cn(
                        "relative overflow-hidden rounded-lg transition-all duration-300",
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-accent/10 text-primary shadow-sm"
                          : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                      )}
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                          isActive
                            ? `bg-gradient-to-br ${item.gradient} text-white shadow-lg`
                            : "bg-sidebar-accent/50 text-sidebar-foreground/70"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "font-medium",
                          isActive ? "text-primary" : "text-sidebar-foreground"
                        )}>
                          {item.title}
                        </span>
                        {!isCollapsed && (
                          <span className="text-[10px] text-sidebar-foreground/50">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 p-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs text-sidebar-foreground/70">
              Versão Premium
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
