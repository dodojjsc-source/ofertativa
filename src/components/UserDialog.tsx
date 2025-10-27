import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppUser, UserRole, useUsers } from "@/contexts/UsersContext";
import { userSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AppUser;
  onSave: () => void;
}

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
  const { addUser, updateUser, users, getGestores } = useUsers();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telefone: "",
    role: "corretor" as UserRole,
    gestorId: "",
    status: "ativo" as "ativo" | "inativo",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        telefone: user.telefone || "",
        role: user.role,
        gestorId: user.gestorId || "",
        status: user.status,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        telefone: "",
        role: "corretor",
        gestorId: "",
        status: "ativo",
      });
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input data
      const validatedData = userSchema.parse(formData);

      // Validar email único
      const emailExists = users.some((u) => u.email === validatedData.email && u.id !== user?.id);
      if (emailExists) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já está em uso por outro usuário",
          variant: "destructive",
        });
        return;
      }

      // Validar gestor obrigatório para corretor
      if (validatedData.role === "corretor" && !validatedData.gestorId) {
        toast({
          title: "Gestor obrigatório",
          description: "Selecione um gestor para este corretor",
          variant: "destructive",
        });
        return;
      }

      const userData = {
        name: validatedData.name,
        email: validatedData.email,
        telefone: validatedData.telefone || undefined,
        role: validatedData.role,
        gestorId: validatedData.role === "corretor" ? validatedData.gestorId : undefined,
        status: validatedData.status,
      };

      if (user) {
        updateUser(user.id, userData);
      } else {
        addUser(userData);
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Ocorreu um erro ao salvar o usuário",
          variant: "destructive",
        });
      }
    }
  };

  const gestores = getGestores();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(11) 98765-4321"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Perfil *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value, gestorId: value !== "corretor" ? "" : formData.gestorId })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="corretor">Corretor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === "corretor" && (
            <div className="space-y-2">
              <Label htmlFor="gestor">Gestor Vinculado *</Label>
              <Select
                value={formData.gestorId}
                onValueChange={(value) => setFormData({ ...formData, gestorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  {gestores.map((gestor) => (
                    <SelectItem key={gestor.id} value={gestor.id}>
                      {gestor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "ativo" | "inativo") => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {user ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
