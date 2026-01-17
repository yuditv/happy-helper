import { Users, Shield, Tv, Coins, GraduationCap, LayoutDashboard, Send, Package, Filter, Smartphone, Contact } from "lucide-react";
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

export type AppSection = "clients" | "contatos" | "disparo" | "filtrar" | "conexao" | "revenda" | "vpn" | "iptv" | "creditos" | "mentorias" | "paineis";

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
    id: "contatos" as AppSection,
    title: "Contatos",
    icon: Contact,
  },
  {
    id: "disparo" as AppSection,
    title: "Disparo Em Massa",
    icon: Send,
  },
  {
    id: "filtrar" as AppSection,
    title: "Filtrar Números",
    icon: Filter,
  },
  {
    id: "conexao" as AppSection,
    title: "Conexão WhatsApp",
    icon: Smartphone,
  },
  {
    id: "revenda" as AppSection,
    title: "Área de Revenda",
    icon: Package,
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
    externalUrl: "https://bommesmo.site/#/sign-in",
  },
  {
    id: "creditos" as AppSection,
    title: "Lovable Créditos",
    icon: Coins,
  },
  {
    id: "mentorias" as AppSection,
    title: "Mentorias",
    icon: GraduationCap,
  },
  {
    id: "paineis" as AppSection,
    title: "Painéis",
    icon: LayoutDashboard,
  },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleClick = (item: typeof menuItems[0]) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, "_blank");
    } else {
      onSectionChange(item.id);
    }
  };

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    // Optional: close on mouse leave
    // setOpen(false);
  };

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="transition-all duration-300 ease-in-out"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img
            src={logoFuturistic}
            alt="Logo"
            className="h-8 w-8 rounded-lg object-contain"
          />
          {!isCollapsed && (
            <span className="font-semibold text-foreground animate-fade-in">Painel</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = activeSection === item.id && !item.externalUrl;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleClick(item)}
                      tooltip={item.title}
                      className={cn(
                        "h-11 gap-3 transition-all duration-200",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className={cn(
                        "font-medium text-[15px] transition-opacity duration-200",
                        isCollapsed ? "opacity-0 w-0" : "opacity-100"
                      )}>{item.title}</span>
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
