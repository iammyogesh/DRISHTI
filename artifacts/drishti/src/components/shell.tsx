import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Archive,
  BarChart3,
  ClipboardCheck,
  Eye,
  FileText,
  Gauge,
  History,
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
      className="btn-quiet !rounded-full !p-2.5"
      onClick={() => setDark((value) => !value)}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const health = useHealthCheck();

  const userRole = user?.role || "Ophthalmologist";

  // Role-Based Navigation Items
  const navGroups = [
    {
      label: "Clinical Operations",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: Gauge, roles: ["Ophthalmologist", "Screening Technician", "Administrator"] },
        { href: "/screening/new", label: "New Screening", icon: Plus, roles: ["Screening Technician", "Ophthalmologist"] },
        { href: "/cases", label: "Cases & Queue", icon: ClipboardCheck, roles: ["Ophthalmologist", "Screening Technician", "Administrator"] },
        { href: "/reports", label: "Clinical Reports", icon: FileText, roles: ["Ophthalmologist"] },
      ],
    },
    {
      label: "System & Management",
      items: [
        { href: "/operations", label: "Analytics & Scale", icon: BarChart3, roles: ["Ophthalmologist", "Administrator"] },
        { href: "/users", label: "User Management", icon: Users, roles: ["Administrator"] },
        { href: "/security/audit", label: "Audit Trail", icon: ShieldCheck, roles: ["Administrator", "Ophthalmologist"] },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);

  const getInitials = (name?: string) => {
    if (!name) return "DR";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* FIXED SIDEBAR - DOES NOT SCROLL */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-[268px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/dashboard" className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Eye size={22} strokeWidth={2.5} />
            </span>
            <div>
              <strong className="block font-serif text-[1.2rem] tracking-tight">DRISHTI</strong>
              <span className="mono text-[9px] font-bold uppercase tracking-[.2em] text-sidebar-primary">
                AI Eye Care
              </span>
            </div>
          </Link>
          <button
            className="text-sidebar-foreground/70 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            data-testid="button-close-navigation"
          >
            <X size={19} />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Health Status Indicator */}
          <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${health.isError ? "bg-amber-400" : "bg-[#5c9565]"}`} />
              <span className="mono text-[10px] font-bold uppercase tracking-[.1em] text-sidebar-foreground/80">
                {health.isError ? "Standalone Mode" : "Clinical API Ready"}
              </span>
            </div>
            <span className="mono text-[9px] text-sidebar-foreground/50">v1.2</span>
          </div>

          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="eyebrow mb-2 px-3 text-sidebar-foreground/40">{group.label}</div>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    location === item.href ||
                    (item.href === "/cases" && location.startsWith("/cases/")) ||
                    (item.href === "/screening/new" && location.startsWith("/analysis/"));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`link-nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sidebar Fixed User & Settings Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-4 bg-sidebar">
          <Link
            href="/settings"
            data-testid="link-settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <Settings size={16} /> Settings
          </Link>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2.5">
            <Link href="/settings" className="flex items-center gap-3 min-w-0 flex-1">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 mono text-[11px] font-bold text-sidebar-primary">
                {getInitials(user?.fullName)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-sidebar-foreground">
                  {user?.fullName || "Authenticated User"}
                </div>
                <div className="truncate text-[10px] text-sidebar-foreground/50">
                  {user?.role || "Staff"} {user?.hospitalName ? `· ${user.hospitalName}` : ""}
                </div>
              </div>
            </Link>

            <button
              onClick={() => { logout(); setLocation("/"); }}
              className="p-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {open && (
        <button
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          data-testid="button-navigation-overlay"
        />
      )}

      {/* MAIN CONTENT AREA - SCROLLS INDEPENDENTLY */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Fixed Top Header (No search bar, clean header with title/status & controls) */}
        <header className="sticky top-0 z-20 flex h-[70px] shrink-0 items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="btn-quiet !p-2 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              data-testid="button-open-navigation"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-foreground">DRISHTI</span>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {userRole} Workstation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 sm:flex">
              <span className="size-2 rounded-full bg-[#5c9565]" />
              <span className="mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                CLINICAL DECISION SUPPORT SYSTEM
              </span>
            </div>
            <ThemeToggle />
            <Link
              href="/security/audit"
              className="relative rounded-full p-2.5 text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Open audit trail"
              data-testid="button-activity"
            >
              <History size={17} />
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="mx-auto max-w-[1480px]">
            {children}
          </div>

          <footer className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-border/60 pt-6 text-[11px] text-muted-foreground gap-2">
            <span>
              <strong>DRISHTI</strong> — AI Eye Care Platform · Retinal Screening & Tele-Ophthalmology
            </span>
            <span className="mono text-[10px]">CLINICAL ACCOUNTABILITY ENABLED</span>
          </footer>
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
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h1 className="display-title text-3xl font-extrabold text-foreground md:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
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
    good: "bg-[#dcebdc] text-[#376344] dark:bg-[#23432a] dark:text-[#a7d5ae]",
    warn: "bg-[#f5e7bd] text-[#7b5d1e] dark:bg-[#4a3a18] dark:text-[#eed281]",
    danger: "bg-[#f2d4cc] text-[#913e32] dark:bg-[#4e2724] dark:text-[#f4aaa0]",
    neutral: "bg-muted text-muted-foreground",
    teal: "bg-[#d5e8e5] text-[#255c58] dark:bg-[#1d403e] dark:text-[#9bd2cb]",
  };
  return (
    <span className={`status-chip ${tones[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function LoadingState({ label = "Loading clinical workspace" }: { label?: string }) {
  return (
    <div className="space-y-4">
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      </div>
      <p className="mono text-center text-[10px] uppercase tracking-[.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="panel border-accent/30 bg-accent/5 p-8 text-center">
      <ShieldCheck className="mx-auto mb-3 text-accent" size={25} />
      <h2 className="font-serif text-xl font-bold">Live API Service Offline</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Operating in standalone resilient mode with offline clinical sample cache.
      </p>
      {retry && (
        <button className="btn-quiet mt-5" onClick={retry} data-testid="button-retry">
          <Archive size={14} /> Retry Connection
        </button>
      )}
    </div>
  );
}