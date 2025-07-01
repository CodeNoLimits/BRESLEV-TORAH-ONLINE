import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import AppSimple from "./AppSimple";

// Global error handling for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
  toast({
    title: "Erreur système",
    description: "Une erreur inattendue s'est produite. Rechargez la page si nécessaire.",
    variant: "destructive",
  });
  event.preventDefault();
});

// Gestion globale des erreurs JavaScript non gérées  
window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED]", e.reason);
  toast({
    title: "Erreur technique",
    description: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    variant: "destructive"
  });
});