import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/contexts/FiltersContext";
import { useUsers } from "@/contexts/UsersContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";

export function FiltersCard() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { users } = useUsers();
  const { campanhas } = useCampanhas();
  const { user } = useAuth();

  const gestores = users.filter((u) => u.role === "gestor" && u.status === "ativo");
  const corretores = user?.role === "gestor"
    ? users.filter((u) => u.role === "corretor" && u.gestorId === user.id && u.status === "ativo")
    : filters.gestorId
      ? users.filter((u) => u.role === "corretor" && u.gestorId === filters.gestorId && u.status === "ativo")
      : users.filter((u) => u.role === "corretor" && u.status === "ativo");

  const filteredCampanhas = user?.role === "gestor"
    ? campanhas.filter((c) => c.gestorId === user.id)
    : campanhas;

  const feedbacks = ["interessado", "agendado", "recusou", "optout"];

  // Admin pode ver tudo, Gestor só sua equipe
  const showGestorFilter = user?.role === "admin";
  const showCorretorFilter = user?.role === "admin" || user?.role === "gestor";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Filtros</CardTitle>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showGestorFilter && (
          <div className="space-y-2">
            <Label>Gestor</Label>
            <Select
              value={filters.gestorId || "all"}
              onValueChange={(value) => setFilters({ ...filters, gestorId: value === "all" ? undefined : value, corretorId: undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {gestores.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showCorretorFilter && (
          <div className="space-y-2">
            <Label>Corretor</Label>
            <Select
              value={filters.corretorId || "all"}
              onValueChange={(value) => setFilters({ ...filters, corretorId: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {corretores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Campanha</Label>
          <Select
            value={filters.campanha || "all"}
            onValueChange={(value) => setFilters({ ...filters, campanha: value === "all" ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {campanhas.map((c) => (
                <SelectItem key={c.id} value={c.nome}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Feedback</Label>
          <Select
            value={filters.feedback || "all"}
            onValueChange={(value) => setFilters({ ...filters, feedback: value === "all" ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {feedbacks.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data Inicial</Label>
          <Input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Data Final</Label>
          <Input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
