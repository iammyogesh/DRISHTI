import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ClipboardCheck,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
  Layers,
  FileCheck2,
} from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("drishti-theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("drishti-theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button
      aria-label="Toggle theme"
      data-testid="button-toggle-theme"
      className="btn-quiet !p-2 !rounded-md"
      onClick={() => setDark((value) => !value)}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const health = useHealthCheck();

  const userRole = user?.role || "Ophthalmologist";

  // Role-Aware Navigation
  const getNavGroups = () => {
    if (userRole === "Administrator") {
      return [
        {
          label: "Administration",
          items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/users", label: "Users", icon: Users },
            { href: "/security/audit", label: "Audit Log", icon: ShieldCheck },
            { href: "/architecture", label: "System Architecture", icon: Layers },
          ],
        },
      ];
    }

    if (userRole === "Screening Technician") {
      return [
        {
          label: "Workspace",
          items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/screening/new", label: "New Screening", icon: Plus },
            { href: "/cases", label: "Screening Queue", icon: ClipboardCheck },
          ],
        },
      ];
    }

    // Default: Ophthalmologist
    return [
      {
        label: "Workspace",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/screening/new", label: "New Screening", icon: Plus },
          { href: "/cases", label: "Cases", icon: ClipboardCheck },
          { href: "/reports", label: "Reports", icon: FileText },
        ],
      },
    ];
  };

  const navGroups = getNavGroups();

  const getInitials = (name?: string) => {
    if (!name) return "MD";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[250px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5" data-testid="link-brand">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-xs">
              <Eye size={18} strokeWidth={2.2} />
            </span>
            <div>
              <strong className="block text-sm font-bold tracking-tight text-sidebar-foreground">DRISHTI</strong>
              <span className="block text-[10px] text-sidebar-foreground/60">
                Ophthalmology Workstation
              </span>
            </div>
          </Link>
          <button
            className="text-sidebar-foreground/70 lg:hidden p-1 rounded hover:bg-sidebar-accent"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            data-testid="button-close-navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="eyebrow mb-1.5 px-3 text-sidebar-foreground/50 text-[10px]">
                {group.label}
              </div>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    location === item.href ||
                    (item.href === "/cases" && (location.startsWith("/cases/") || location.startsWith("/analysis/") || location.startsWith("/review/")));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`link-nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-2xs"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User Account & Station Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-3 space-y-1 bg-sidebar">
          <Link
            href="/settings"
            data-testid="link-settings"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              location === "/settings"
                ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <Settings size={15} />
            <span>Settings</span>
          </Link>

          <div className="flex items-center justify-between rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 p-2 mt-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <div className="grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary/25 text-[11px] font-bold text-sidebar-primary">
                {getInitials(user?.fullName)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user?.fullName || "Practitioner"}
                </div>
                <div className="truncate text-[10px] text-sidebar-foreground/60">
                  {userRole}
                </div>
              </div>
            </Link>

            <button
              onClick={() => {
                logout();
                setLocation("/");
              }}
              className="p-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden backdrop-blur-xs"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          data-testid="button-navigation-overlay"
        />
      )}

      {/* Main Clinical Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Clinical Header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="btn-quiet !p-1.5 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              data-testid="button-open-navigation"
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                {user?.hospitalName || "Clinical Workstation"}
              </span>
              <span className="text-muted-foreground/50 text-xs">·</span>
              <span className="text-[11px] text-muted-foreground">
                {userRole} Station
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 sm:flex text-xs">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-muted-foreground">
                Clinical Decision Support
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Clinical View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end border-b border-border/60 pb-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1 text-[11px]">{eyebrow}</div>}
        <h1 className="display-title text-2xl font-bold text-foreground tracking-tight md:text-[1.65rem]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "good" | "warn" | "danger" | "neutral" | "teal";
}) {
  const tones = {
    good: "bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    warn: "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    danger: "bg-red-50 text-red-800 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    teal: "bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
  };
  return (
    <span className={`status-chip ${tones[tone]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

export function LoadingState({ label = "Loading clinical workspace…" }: { label?: string }) {
  return (
    <div className="space-y-4 py-8">
      <div className="h-16 animate-pulse rounded-lg bg-muted/60" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-28 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-28 animate-pulse rounded-lg bg-muted/60" />
      </div>
      <p className="text-center text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="panel p-6 text-center border-border">
      <ShieldCheck className="mx-auto mb-2 text-primary" size={24} />
      <h2 className="text-sm font-bold text-foreground">API Connection Offline</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Operating in resilient local fallback mode with cached clinical records.
      </p>
      {retry && (
        <button className="btn-quiet mt-4 text-xs" onClick={retry} data-testid="button-retry">
          Retry Connection
        </button>
      )}
    </div>
  );
}