
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { HiveUser } from "@/services/hiveAuth";

interface NavigationProps {
  user?: HiveUser | null;
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const location = useLocation();

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
          </NavigationMenuList>
        </NavigationMenu>
        {user?.loggedIn && onLogout && (
          <Button onClick={onLogout} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            Ausloggen
          </Button>
        )}
      </div>
    </div>
  );
};

export default Navigation;
