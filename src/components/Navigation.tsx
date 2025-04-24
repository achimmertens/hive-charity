
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HiveUser } from "@/services/hiveAuth";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="border-b">
      <div className="container py-4 flex justify-between items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link 
                to="/"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === "/" 
                    ? "bg-hive text-white" 
                    : "hover:bg-muted"
                }`}
              >
                Home
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link 
                to="/analysis-history"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === "/analysis-history" 
                    ? "bg-hive text-white" 
                    : "hover:bg-muted"
                }`}
              >
                Analyse-Historie
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link 
                to="/favorites"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === "/favorites" 
                    ? "bg-hive text-white" 
                    : "hover:bg-muted"
                }`}
              >
                Favoriten
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link 
                to="/archive"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === "/archive" 
                    ? "bg-hive text-white" 
                    : "hover:bg-muted"
                }`}
              >
                Archiv
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Button onClick={handleLogout} variant="outline">
          Ausloggen
        </Button>
      </div>
    </div>
  );
};

export default Navigation;
