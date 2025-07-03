import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import ChayeiMoharanMain from "./ChayeiMoharanMain";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Global error handling for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
  toast({
    title: "Erreur technique",
    description: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    variant: "destructive",
  });
  event.preventDefault();
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={ChayeiMoharanMain} />
        <Route component={ChayeiMoharanMain} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);