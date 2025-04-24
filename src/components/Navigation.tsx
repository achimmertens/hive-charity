
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();

  return (
    <div className="border-b">
      <div className="container py-4">
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
      </div>
    </div>
  );
};

export default Navigation;
