"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark";

interface ThemeContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  tema: "light",
  alternarTema: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("light");

  // Inicializa a partir do localStorage ou preferência do sistema
  useEffect(() => {
    const salvo = localStorage.getItem("tema") as Tema | null;
    const prefereDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const inicial = salvo ?? (prefereDark ? "dark" : "light");
    setTema(inicial);
    document.documentElement.classList.toggle("dark", inicial === "dark");
  }, []);

  const alternarTema = () => {
    setTema((prev) => {
      const novo: Tema = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", novo === "dark");
      localStorage.setItem("tema", novo);
      return novo;
    });
  };

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}
