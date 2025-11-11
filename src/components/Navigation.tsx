
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
            <NavigationMenuItem>
              <Link 
                to="/report"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === "/report" 
                    ? "bg-hive text-white" 
                    : "hover:bg-muted"
                }`}
              >
                Report
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link 
                to="/about"
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === "/about" 
                    ? "bg-hive text-white" 
                    : "hover:bg-muted"
                }`}
              >
                About Hive-Charity
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        {user?.loggedIn && onLogout && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={`https://images.hive.blog/u/${user.username}/avatar`} 
                alt={user.username}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button onClick={onLogout} variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              Ausloggen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigation;
