import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUsers, UserRole } from "@/contexts/UsersContext";
import { Copy, Mail } from "lucide-react";

interface InvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitationDialog({ open, onOpenChange }: InvitationDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("corretor");
  const [gestorId, setGestorId] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { getGestores } = useUsers();
  const gestores = getGestores();

  const handleGenerateInvite = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Digite um email válido",
        variant: "destructive",
      });
      return;
    }

    if (role === "corretor" && !gestorId) {
      toast({
        title: "Erro",
        description: "Selecione um gestor para o corretor",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/accept-invite`;
      
      const metadata: any = { role };
      if (role === "corretor" && gestorId) {
        metadata.gestor_id = gestorId;
      }

      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: metadata,
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      // O link de convite é enviado por email, mas podemos mostrar uma mensagem de sucesso
      setInviteLink("Link de convite enviado por email!");
      toast({
        title: "Convite Enviado!",
        description: `Convite enviado para ${email}. O usuário receberá um email com o link.`,
      });
    } catch (error: any) {
      console.error("Erro ao gerar convite:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar o convite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("corretor");
    setGestorId("");
    setInviteLink("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!inviteLink ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enviar Convite
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Usuário</Label>
                <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corretor">Corretor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === "corretor" && (
                <div className="space-y-2">
                  <Label htmlFor="gestor">Gestor Vinculado</Label>
                  <Select value={gestorId} onValueChange={setGestorId}>
                    <SelectTrigger id="gestor">
                      <SelectValue placeholder="Selecione um gestor" />
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
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateInvite} disabled={loading}>
                {loading ? "Enviando..." : "Gerar Link"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-success">✅ Convite Gerado!</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Link de Convite Enviado</p>
                <p className="text-sm text-muted-foreground">{inviteLink}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> {email}
                </p>
                <p className="text-sm">
                  <strong>Perfil:</strong> {role === "corretor" ? "Corretor" : "Gestor"}
                </p>
                {role === "corretor" && gestorId && (
                  <p className="text-sm">
                    <strong>Gestor:</strong> {gestores.find(g => g.id === gestorId)?.name}
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                O usuário receberá um email com o link para definir a senha e ativar a conta.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
