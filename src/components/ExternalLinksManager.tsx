import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ExternalLink as ExternalLinkIcon,
  Shield,
  Tv,
  Coins,
  GraduationCap,
  LayoutDashboard,
  Globe,
  Link,
  Monitor,
  Smartphone,
  Server,
  Database,
  Cloud,
  Zap,
  Star,
  Heart,
  Settings,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExternalLinks, ExternalLink } from "@/hooks/useExternalLinks";
import { toast } from "sonner";

const iconOptions = [
  { value: "Shield", label: "Escudo", Icon: Shield },
  { value: "Tv", label: "TV", Icon: Tv },
  { value: "Coins", label: "Moedas", Icon: Coins },
  { value: "GraduationCap", label: "Educação", Icon: GraduationCap },
  { value: "LayoutDashboard", label: "Dashboard", Icon: LayoutDashboard },
  { value: "Globe", label: "Globo", Icon: Globe },
  { value: "Link", label: "Link", Icon: Link },
  { value: "Monitor", label: "Monitor", Icon: Monitor },
  { value: "Smartphone", label: "Smartphone", Icon: Smartphone },
  { value: "Server", label: "Servidor", Icon: Server },
  { value: "Database", label: "Banco de Dados", Icon: Database },
  { value: "Cloud", label: "Nuvem", Icon: Cloud },
  { value: "Zap", label: "Raio", Icon: Zap },
  { value: "Star", label: "Estrela", Icon: Star },
  { value: "Heart", label: "Coração", Icon: Heart },
  { value: "Settings", label: "Configurações", Icon: Settings },
  { value: "Home", label: "Casa", Icon: Home },
  { value: "ExternalLink", label: "Link Externo", Icon: ExternalLinkIcon },
];

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Tv,
  Coins,
  GraduationCap,
  LayoutDashboard,
  Globe,
  Link,
  Monitor,
  Smartphone,
  Server,
  Database,
  Cloud,
  Zap,
  Star,
  Heart,
  Settings,
  Home,
  ExternalLink: ExternalLinkIcon,
};

interface LinkFormData {
  title: string;
  url: string;
  icon: string;
}

export function ExternalLinksManager() {
  const { links, addLink, updateLink, deleteLink } = useExternalLinks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);
  const [formData, setFormData] = useState<LinkFormData>({
    title: "",
    url: "",
    icon: "Globe",
  });

  const handleOpenCreate = () => {
    setEditingLink(null);
    setFormData({ title: "", url: "", icon: "Globe" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (link: ExternalLink) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      icon: link.icon,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      toast.error("URL inválida");
      return;
    }

    if (editingLink) {
      updateLink(editingLink.id, formData);
      toast.success("Link atualizado com sucesso!");
    } else {
      addLink({
        ...formData,
        order_index: links.length,
      });
      toast.success("Link adicionado com sucesso!");
    }

    setIsDialogOpen(false);
    setFormData({ title: "", url: "", icon: "Globe" });
  };

  const handleDelete = (id: string) => {
    deleteLink(id);
    toast.success("Link removido com sucesso!");
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Globe;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Atalhos Rápidos</CardTitle>
            <CardDescription>
              Gerencie seus links externos e atalhos do painel
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum atalho configurado. Clique em "Adicionar" para criar.
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="text-muted-foreground cursor-grab">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                  {getIcon(link.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{link.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {link.url}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(link)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Editar Atalho" : "Novo Atalho"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Ex: Meu Painel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Ícone</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingLink ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
