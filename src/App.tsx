
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AnalysisHistory from "./pages/AnalysisHistory";
import Favorites from "./pages/Favorites";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import { useState, useEffect } from "react";
import { HiveUser } from "@/services/hiveAuth";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<HiveUser | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('hiveUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('hiveUser');
      }
    }
  }, []);

  // Handle logout
  const handleLogout = async () => {
    if (user) {
      const { logoutFromHive } = await import('@/services/hiveLogout');
      await logoutFromHive(user);
      setUser(null);
      localStorage.removeItem('hiveUser');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation user={user} onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<Index user={user} setUser={setUser} />} />
            <Route path="/analysis-history" element={<AnalysisHistory />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
