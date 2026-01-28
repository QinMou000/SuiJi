import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Settings, Wallet, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto border-x border-border shadow-2xl">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
        <div className="container flex h-14 items-center px-4">
          <h1 className="text-xl font-bold tracking-tight">随记</h1>
        </div>
      </header>
      
      <main className="flex-1 container px-4 py-4 overflow-y-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-md max-w-md mx-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around px-4">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 transition-all active:scale-95",
              location.pathname === "/" ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Home className="h-6 w-6" strokeWidth={location.pathname === "/" ? 2.5 : 2} />
            <span className="text-[10px]">首页</span>
          </Link>
          
          <Link
            to="/finance"
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 transition-all active:scale-95",
              location.pathname.startsWith("/finance") ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Wallet className="h-6 w-6" strokeWidth={location.pathname.startsWith("/finance") ? 2.5 : 2} />
            <span className="text-[10px]">记账</span>
          </Link>

          <Link
            to="/create"
            className="flex items-center justify-center -mt-6"
          >
            <div className="bg-primary text-primary-foreground rounded-full p-4 shadow-xl hover:bg-primary/90 transition-transform active:scale-95 border-4 border-background">
              <Plus className="h-7 w-7" />
            </div>
          </Link>

          <Link
            to="/countdowns"
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 transition-all active:scale-95",
              location.pathname === "/countdowns" ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Clock className="h-6 w-6" strokeWidth={location.pathname === "/countdowns" ? 2.5 : 2} />
            <span className="text-[10px]">倒数日</span>
          </Link>

          <Link
            to="/settings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 transition-all active:scale-95",
              location.pathname === "/settings" ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Settings className="h-6 w-6" strokeWidth={location.pathname === "/settings" ? 2.5 : 2} />
            <span className="text-[10px]">设置</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
