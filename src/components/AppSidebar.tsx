import { Users, Shield, Tv, Contact, Search, Bot, Flame, Crown, Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import logoFuturistic from "@/assets/logo-red-futuristic.png";
import { cn } from "@/lib/utils";
import { useUserPermissions } from "@/hooks/useUserPermissions";

// Custom WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export type AppSection = "clients" | "contatos" | "whatsapp" | "filter-numbers" | "ai-agent" | "warm-chips" | "revenda" | "vpn" | "iptv" | "admin" | "atendimento";

interface AppSidebarProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
}

type PermissionKey = 
  | 'can_view_clients'
  | 'can_view_contacts'
  | 'can_view_whatsapp'
  | 'can_view_warming'
  | 'can_view_ai_agent'
  | 'can_view_reseller'
  | 'can_view_inbox';

interface MenuItem {
  id: AppSection;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  activeColor?: string;
  externalUrl?: string;
  adminOnly?: boolean;
  permissionKey?: PermissionKey;
}

const menuItems: MenuItem[] = [
  {
    id: "admin",
    title: "Painel Admin",
    icon: Crown,
    color: "text-red-500",
    activeColor: "bg-red-500 text-white hover:bg-red-600",
    adminOnly: true,
  },
  {
    id: "clients",
    title: "Gerenciador",
    icon: Users,
    color: "text-blue-500",
    activeColor: "bg-blue-500 text-white hover:bg-blue-600",
    permissionKey: "can_view_clients",
  },
  {
    id: "contatos",
    title: "Contatos",
    icon: Contact,
    color: "text-cyan-500",
    activeColor: "bg-cyan-500 text-white hover:bg-cyan-600",
    permissionKey: "can_view_contacts",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    icon: WhatsAppIcon,
    color: "text-green-500",
    activeColor: "bg-green-500 text-white hover:bg-green-600",
    permissionKey: "can_view_whatsapp",
  },
  {
    id: "atendimento",
    title: "Central de Atendimento",
    icon: Headset,
    color: "text-teal-500",
    activeColor: "bg-teal-500 text-white hover:bg-teal-600",
    permissionKey: "can_view_inbox",
  },
  {
    id: "filter-numbers",
    title: "Filtrar Números Ativos",
    icon: Search,
    color: "text-purple-500",
    activeColor: "bg-purple-500 text-white hover:bg-purple-600",
    permissionKey: "can_view_whatsapp",
  },
  {
    id: "ai-agent",
    title: "Agente IA",
    icon: Bot,
    color: "text-indigo-500",
    activeColor: "bg-indigo-500 text-white hover:bg-indigo-600",
    permissionKey: "can_view_ai_agent",
  },
  {
    id: "warm-chips",
    title: "Aquecer Chips",
    icon: Flame,
    color: "text-orange-500",
    activeColor: "bg-orange-500 text-white hover:bg-orange-600",
    permissionKey: "can_view_warming",
  },
  {
    id: "vpn",
    title: "Internet Ilimitada",
    icon: Shield,
    color: "text-emerald-500",
    activeColor: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
  {
    id: "iptv",
    title: "StreamingTV",
    icon: Tv,
    color: "text-rose-500",
    activeColor: "bg-rose-500 text-white hover:bg-rose-600",
    externalUrl: "https://bommesmo.site/#/sign-in",
  },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state, setOpen } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const { permissions, isAdmin, isLoading } = useUserPermissions();

  const handleClick = (item: MenuItem) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, "_blank");
    } else if (item.id === 'admin') {
      navigate('/admin');
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
    setOpen(false);
  };

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => {
    // Admin-only items: only show to admins
    if (item.adminOnly) {
      return isAdmin;
    }
    
    // Items with permission requirements
    if (item.permissionKey) {
      return permissions[item.permissionKey];
    }
    
    // Items without permission requirements are always visible
    return true;
  });

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="transition-all duration-300 ease-in-out"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={logoFuturistic}
              alt="Logo"
              className="h-10 w-10 rounded-lg object-contain glitch-subtle logo-glow"
            />
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse flicker"></div>
          </div>
          {!isCollapsed && (
            <span className="font-bold text-foreground animate-fade-in text-gradient">Painel</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = activeSection === item.id && !item.externalUrl;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleClick(item)}
                      tooltip={item.title}
                      className={cn(
                        "h-11 gap-3 transition-all duration-200",
                        isActive && item.activeColor
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors",
                        isActive ? "text-current" : item.color
                      )} />
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
