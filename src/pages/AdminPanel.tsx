import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminUsers, AdminUser } from "@/hooks/useAdminUsers";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Shield, 
  Users, 
  Trash2, 
  RefreshCw, 
  Crown,
  UserCog,
  User,
  Lock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const roleConfig = {
  admin: { 
    label: 'Admin', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: Crown 
  },
  moderator: { 
    label: 'Moderador', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: UserCog 
  },
  user: { 
    label: 'Usuário', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: User 
  },
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    users, 
    isLoading, 
    isAdmin, 
    checkAdminStatus, 
    fetchUsers, 
    updateUserRole, 
    deleteUser 
  } = useAdminUsers();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsChecking(true);
      const admin = await checkAdminStatus();
      if (admin) {
        await fetchUsers();
      }
      setIsChecking(false);
    };
    init();
  }, [checkAdminStatus, fetchUsers]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full glass-card glow-border">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <Lock className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar o painel de administração.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="btn-futuristic"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20 glow-border">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gradient glitch-subtle">
                Painel Admin
              </h1>
              <p className="text-muted-foreground">
                Gerencie usuários e permissões
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-primary/30"
            >
              Voltar
            </Button>
            <Button
              onClick={fetchUsers}
              disabled={isLoading}
              className="btn-futuristic"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card glow-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card glow-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <Crown className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card glow-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/20">
                  <UserCog className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.role === 'moderator').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Moderadores</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="glass-card glow-border overflow-hidden">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Usuários Registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/10 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Usuário</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">WhatsApp</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Criado em</TableHead>
                    <TableHead className="text-muted-foreground">Último acesso</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const RoleIcon = roleConfig[u.role]?.icon || User;
                    const isCurrentUser = u.id === user?.id;
                    
                    return (
                      <TableRow 
                        key={u.id} 
                        className="border-primary/10 hover:bg-primary/5"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-primary/20">
                              <AvatarImage src={u.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {u.profile?.display_name?.[0] || u.email?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {u.profile?.display_name || 'Sem nome'}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Você
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.profile?.whatsapp || '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value: 'admin' | 'moderator' | 'user') => 
                              updateUserRole(u.id, value)
                            }
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="w-[140px] border-primary/20">
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  <RoleIcon className="h-4 w-4" />
                                  <span>{roleConfig[u.role]?.label || 'Usuário'}</span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-red-400" />
                                  <span>Admin</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="moderator">
                                <div className="flex items-center gap-2">
                                  <UserCog className="h-4 w-4 text-amber-400" />
                                  <span>Moderador</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-blue-400" />
                                  <span>Usuário</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.last_sign_in_at 
                            ? format(new Date(u.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                disabled={isCurrentUser}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-card border-primary/20">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O usuário{' '}
                                  <strong>{u.email}</strong> será permanentemente removido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(u.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {users.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}