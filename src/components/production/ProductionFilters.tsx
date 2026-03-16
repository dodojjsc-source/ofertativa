import { useState } from "react";
import { useFilters } from "@/contexts/FiltersContext";
import { useUsers } from "@/contexts/UsersContext";
import { useLeads } from "@/contexts/LeadsContext";
import { useCampanhas } from "@/contexts/CampanhasContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Save, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ProductionFilters() {
  const { filters, setFilters, resetFilters, presets, savePreset, loadPreset, deletePreset } = useFilters();
  const { users } = useUsers();
  const { user } = useAuth();
  const { leads } = useLeads();
  const { campanhas: allCampanhas } = useCampanhas();
  const [presetName, setPresetName] = useState("");

  // Filtrar opções baseado na role do usuário
  const gestores = user?.role === "admin" 
    ? users.filter(u => u.role === "gestor" && u.status === "ativo")
    : [];
    
  const corretores = user?.role === "admin"
    ? users.filter(u => u.role === "corretor" && u.status === "ativo")
    : user?.role === "gestor"
    ? users.filter(u => u.role === "corretor" && u.status === "ativo" && u.gestorId === user.id)
    : [];
  
  const campanhas = user?.role === "gestor"
    ? allCampanhas.filter(c => c.gestorId === user.id)
    : allCampanhas;

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o preset",
        variant: "destructive",
      });
      return;
    }
    savePreset(presetName, filters);
    setPresetName("");
    toast({
      title: "Preset salvo",
      description: `Filtro "${presetName}" salvo com sucesso`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Só mostrar filtros de gestor/corretor para admin e gestor */}
          {user?.role !== "corretor" && (
            <>
              {user?.role === "admin" && (
                <div className="space-y-2">
                  <Label>Gestor</Label>
                  <Select
                    value={filters.gestorId || "all"}
                    onValueChange={(value) => 
                      setFilters({ ...filters, gestorId: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {gestores.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Corretor</Label>
                <Select
                  value={filters.corretorId || "all"}
                  onValueChange={(value) => 
                    setFilters({ ...filters, corretorId: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {corretores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Campanha</Label>
            <Select
              value={filters.campanha || "all"}
              onValueChange={(value) => 
                setFilters({ ...filters, campanha: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {campanhas.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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

          <div className="space-y-2">
            <Label>Feedback</Label>
            <Select
              value={filters.feedback || "all"}
              onValueChange={(value) => 
                setFilters({ ...filters, feedback: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="interessado">Interessado</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="recusou">Recusou</SelectItem>
                <SelectItem value="optout">Opt-out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={resetFilters} className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>

        {/* Presets */}
        <div className="border-t pt-4 space-y-3">
          <Label>Salvar/Carregar Filtros</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do preset"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button onClick={handleSavePreset}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map(preset => (
                <Badge
                  key={preset.name}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                >
                  <span onClick={() => loadPreset(preset.name)}>{preset.name}</span>
                  <X
                    className="ml-2 h-3 w-3"
                    onClick={() => deletePreset(preset.name)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
