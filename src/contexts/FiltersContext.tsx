import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface Filters {
  gestorId?: string;
  corretorId?: string;
  campanha?: string;
  feedback?: string;
  startDate?: string;
  endDate?: string;
}

export interface FilterPreset {
  name: string;
  filters: Filters;
}

interface FiltersContextType {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  resetFilters: () => void;
  presets: FilterPreset[];
  savePreset: (name: string, filters: Filters) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

const STORAGE_KEY = "localStorage.ui.filters";
const PRESETS_KEY = "localStorage.ui.filterPresets";

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const stored = localStorage.getItem(PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets]);

  const setFilters = (newFilters: Filters) => {
    setFiltersState(newFilters);
  };

  const resetFilters = () => {
    setFiltersState({});
  };

  const savePreset = (name: string, filters: Filters) => {
    const existingIndex = presets.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
      // Atualizar preset existente
      const updated = [...presets];
      updated[existingIndex] = { name, filters };
      setPresets(updated);
    } else {
      // Adicionar novo preset
      setPresets([...presets, { name, filters }]);
    }
  };

  const loadPreset = (name: string) => {
    const preset = presets.find(p => p.name === name);
    if (preset) {
      setFiltersState(preset.filters);
    }
  };

  const deletePreset = (name: string) => {
    setPresets(presets.filter(p => p.name !== name));
  };

  return (
    <FiltersContext.Provider value={{ 
      filters, 
      setFilters, 
      resetFilters,
      presets,
      savePreset,
      loadPreset,
      deletePreset
    }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within FiltersProvider");
  }
  return context;
}
