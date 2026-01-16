import { Users, Shield, Tv } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
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
    title: "Gerenciador",
    icon: Users,
  },
  {
    id: "vpn" as AppSection,
    title: "Internet Ilimitada",
    icon: Shield,
  },
  {
    id: "iptv" as AppSection,
    title: "StreamingTV",
    icon: Tv,
  },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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
      </SidebarContent>
    </Sidebar>
  );
}
