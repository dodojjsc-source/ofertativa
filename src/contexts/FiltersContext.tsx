import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface Filters {
  gestorId?: string;
  corretorId?: string;
  campanha?: string;
  feedback?: string;
  startDate?: string;
  endDate?: string;
}

interface FiltersContextType {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  resetFilters: () => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

const STORAGE_KEY = "localStorage.ui.filters";

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const setFilters = (newFilters: Filters) => {
    setFiltersState(newFilters);
  };

  const resetFilters = () => {
    setFiltersState({});
  };

  return (
    <FiltersContext.Provider value={{ filters, setFilters, resetFilters }}>
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
