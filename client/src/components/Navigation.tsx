import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useClerk } from "@clerk/clerk-react";
import { Menu, LogOut } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const navigationItems = [
    { path: "/", label: "Home", testId: "nav-home" },
    { path: "/setup-skills", label: "Setup Skills", testId: "nav-setup" },
    { path: "/view-skills", label: "View Skills", testId: "nav-view" },
    { path: "/my-profile", label: "My Profile", testId: "nav-my-profile" },
  ];

  const adminItems = [
    { path: "/admin", label: "Admin", testId: "nav-admin" },
    { path: "/admin/users", label: "Manage Users", testId: "nav-manage-users" },
  ];

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 safe-area-top">
      <div className="responsive-container">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand - Responsive */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <h1 className="font-caslon text-lg sm:text-xl md:text-2xl font-bold" data-testid="nav-title">
              St Basil's
            </h1>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <h2 className="font-brandon text-sm sm:text-base md:text-lg font-medium text-secondary hidden sm:block" data-testid="nav-subtitle">
              RE Skill Share
            </h2>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-1">
            {navigationItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button 
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="font-brandon font-medium nav-btn"
                  data-testid={item.testId}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            {user?.isAdmin && adminItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button 
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="font-brandon font-medium nav-btn"
                  data-testid={item.testId}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-2">
            {/* Desktop Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-muted-foreground hover:text-foreground nav-btn"
              onClick={() => signOut()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            
            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden nav-btn"
                  data-testid="button-menu"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col space-y-4 pt-6">
                  {/* Mobile Brand */}
                  <div className="pb-4 border-b border-border">
                    <h1 className="font-caslon text-xl font-bold" data-testid="mobile-nav-title">
                      St Basil's
                    </h1>
                    <h2 className="font-brandon text-base font-medium text-secondary" data-testid="mobile-nav-subtitle">
                      RE Skill Share
                    </h2>
                  </div>
                  
                  {/* Mobile Navigation Items */}
                  <nav className="flex flex-col space-y-2">
                    {navigationItems.map((item) => (
                      <Link key={item.path} href={item.path} onClick={handleNavClick}>
                        <Button 
                          variant={isActive(item.path) ? "default" : "ghost"}
                          className="w-full justify-start font-brandon font-medium nav-btn"
                          data-testid={`mobile-${item.testId}`}
                        >
                          {item.label}
                        </Button>
                      </Link>
                    ))}
                    
                    {user?.isAdmin && (
                      <>
                        <div className="pt-2 pb-1">
                          <div className="border-t border-border" />
                          <p className="text-xs text-muted-foreground font-brandon font-medium pt-2 px-3">
                            Administration
                          </p>
                        </div>
                        {adminItems.map((item) => (
                          <Link key={item.path} href={item.path} onClick={handleNavClick}>
                            <Button 
                              variant={isActive(item.path) ? "default" : "ghost"}
                              className="w-full justify-start font-brandon font-medium nav-btn"
                              data-testid={`mobile-${item.testId}`}
                            >
                              {item.label}
                            </Button>
                          </Link>
                        ))}
                      </>
                    )}
                  </nav>
                  
                  {/* Mobile Logout Button */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:text-foreground font-brandon font-medium nav-btn"
                      onClick={() => {
                        handleNavClick();
                        signOut();
                      }}
                      data-testid="mobile-button-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
