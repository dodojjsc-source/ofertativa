import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (login(email, password)) {
      toast({
        title: "Login realizado com sucesso",
        description: "Redirecionando para o dashboard...",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Erro ao fazer login",
        description: "Email ou senha inválidos",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Oferta Ativa</CardTitle>
          <CardDescription>Sistema de distribuição e atendimento de leads</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">Credenciais de teste:</p>
            <div className="space-y-2 text-xs">
              <div className="bg-muted p-2 rounded">
                <p className="font-semibold">Admin:</p>
                <p>admin@sistema.com</p>
              </div>
              <div className="bg-muted p-2 rounded">
                <p className="font-semibold">Gestor:</p>
                <p>gestor@sistema.com</p>
              </div>
              <div className="bg-muted p-2 rounded">
                <p className="font-semibold">Corretor:</p>
                <p>corretor@sistema.com</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
