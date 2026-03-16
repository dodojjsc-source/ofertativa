

## Plano: Gestores veem filtros de campanha e corretor em todas as páginas, limitado à sua equipe

### Problema
O `FiltersCard` (usado no Histórico e outras páginas) não limita a lista de corretores à equipe do gestor. Quando `filters.gestorId` não está setado (gestor não aparece no filtro de gestor), mostra **todos** os corretores. Além disso, as campanhas não são filtradas pelo gestor.

### O que mudar

**1. `src/components/FiltersCard.tsx`** — Ajustar a lógica de corretores e campanhas para gestores:
- Quando o usuário logado é **gestor**, filtrar corretores por `gestorId === user.id` (em vez de mostrar todos)
- Filtrar campanhas para mostrar apenas as do gestor (via `campanhas.gestor_id === user.id` ou campanhas que tenham leads do gestor)
- Manter o comportamento atual para admin (vê tudo)

Mudança concreta na linha 19-21:
```typescript
const corretores = user?.role === "gestor"
  ? users.filter(u => u.role === "corretor" && u.gestorId === user.id && u.status === "ativo")
  : filters.gestorId
    ? users.filter(u => u.role === "corretor" && u.gestorId === filters.gestorId && u.status === "ativo")
    : users.filter(u => u.role === "corretor" && u.status === "ativo");
```

Filtrar campanhas para gestor:
```typescript
const filteredCampanhas = user?.role === "gestor"
  ? campanhas.filter(c => c.gestorId === user.id)
  : campanhas;
```

**2. `src/components/production/ProductionFilters.tsx`** — Aplicar a mesma lógica de campanhas filtradas para gestores (atualmente usa `leads.map(l => l.campanha)` sem filtro por gestor). Usar campanhas do contexto filtradas por `gestor_id`.

### Resultado
- Gestor vê filtro de **corretor** (apenas sua equipe) e **campanha** (apenas suas campanhas) em todas as páginas
- Admin continua vendo tudo
- Corretor não vê esses filtros

