import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsers, AppUser } from "@/contexts/UsersContext";
import { UserDialog } from "@/components/UserDialog";
import { InvitationDialog } from "@/components/InvitationDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Search, Mail, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Usuarios() {
  const { users, deleteUser, getUserById, getCorretoresByGestor, canDeleteUser } = useUsers();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [filterGestor, setFilterGestor] = useState<string>("todos");
  const [filterRole, setFilterRole] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const gestores = users.filter(u => u.role === "gestor").sort((a, b) => a.name.localeCompare(b.name));

  const filteredUsers = users.filter((u) => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false;
    }
    if (filterRole !== "todos" && u.role !== filterRole) return false;
    if (filterStatus !== "todos" && u.status !== filterStatus) return false;
    if (filterGestor !== "todos") {
      if (filterGestor === "sem_gestor") {
        if (u.role !== "corretor" || u.gestorId) return false;
      } else {
        // mostra o próprio gestor + seus corretores
        if (u.id !== filterGestor && u.gestorId !== filterGestor) return false;
      }
    }
    return true;
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      gestor: "secondary",
      corretor: "outline",
    };
    return <Badge variant={variants[role]}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "ativo" ? "default" : "outline"}>
        {status}
      </Badge>
    );
  };

  const handleEdit = (user: AppUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    const { canDelete, reason } = await canDeleteUser(userToDelete);
    if (!canDelete) {
      toast({
        title: "Não foi possível excluir",
        description: reason,
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      return;
    }

    if (await deleteUser(userToDelete)) {
      toast({
        title: "Usuário excluído",
        description: "Usuário removido com sucesso",
      });
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingUser(undefined);
  };

  const handleSave = () => {
    toast({
      title: editingUser ? "Usuário atualizado" : "Usuário criado",
      description: "Operação realizada com sucesso",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const confirmBulkDelete = async () => {
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    let ok = 0;
    const falhas: string[] = [];

    for (const id of ids) {
      const u = getUserById(id);
      const sucesso = await deleteUser(id);
      if (sucesso) ok++;
      else falhas.push(u?.name || id);
    }

    setBulkProcessing(false);
    setBulkDialogOpen(false);
    setSelectedIds(new Set());

    toast({
      title: `${ok} usuário(s) removido(s)`,
      description: falhas.length
        ? `Falharam: ${falhas.join(", ")}`
        : "Leads desses corretores ficaram no histórico como 'Sem corretor'.",
      variant: falhas.length ? "destructive" : "default",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerenciar acesso ao sistema</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar selecionados ({selectedIds.size})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Convite
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Usuário Direto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={filterGestor} onValueChange={setFilterGestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os gestores</SelectItem>
                  <SelectItem value="sem_gestor">Corretores sem gestor</SelectItem>
                  {gestores.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} (equipe)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os perfis</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="corretor">Corretor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filteredUsers.length} de {users.length} usuários</span>
                {(filterGestor !== "todos" || filterRole !== "todos" || filterStatus !== "todos" || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFilterGestor("todos");
                      setFilterRole("todos");
                      setFilterStatus("todos");
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Corretores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const gestor = user.gestorId ? getUserById(user.gestorId) : null;
                    const corretoresCount = user.role === "gestor" ? getCorretoresByGestor(user.id).length : 0;

                    return (
                      <TableRow key={user.id} data-state={selectedIds.has(user.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={() => toggleSelect(user.id)}
                            aria-label={`Selecionar ${user.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.telefone || "-"}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{gestor?.name || "-"}</TableCell>
                        <TableCell>
                          {user.role === "gestor" ? (
                            <Badge variant="outline">{corretoresCount}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        user={editingUser}
        onSave={handleSave}
      />

      <InvitationDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      <AlertDialog open={bulkDialogOpen} onOpenChange={(o) => !bulkProcessing && setBulkDialogOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {selectedIds.size} usuário(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os leads e atendimentos desses corretores permanecem no histórico, só ficam sem corretor vinculado. Gestores com corretores ativos não serão apagados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} disabled={bulkProcessing}>
              {bulkProcessing ? "Apagando..." : "Apagar todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
