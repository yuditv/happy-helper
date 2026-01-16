import { useState } from "react";
import { Users, Shield, Tv } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import logoFuturistic from "@/assets/logo-futuristic.png";

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
  },
  {
    id: "vpn" as AppSection,
    title: "VPN",
    icon: Shield,
    description: "Painel VPN",
  },
  {
    id: "iptv" as AppSection,
    title: "IPTV",
    icon: Tv,
    description: "Painel IPTV",
  },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 p-2">
          <img
            src={logoFuturistic}
            alt="Logo"
            className="h-8 w-8 rounded-lg object-contain logo-glow"
          />
          {!isCollapsed && (
            <span className="font-semibold text-sidebar-foreground">
              Painel
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onSectionChange(item.id)}
                    tooltip={item.title}
                    className={
                      activeSection === item.id
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : ""
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
