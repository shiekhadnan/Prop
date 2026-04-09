"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  FileText,
  Buildings,
  Layout,
  CheckCircle,
  BookOpen,
  Gear,
  SignOut,
  List,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";

interface User {
  name: string;
  email: string;
  role: string;
  avatar: string | null;
}

interface AppSidebarProps {
  user: User;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/clients", label: "Clients", icon: Buildings },
  { href: "/templates", label: "Templates", icon: Layout },
  { href: "/reviews", label: "Reviews", icon: CheckCircle },
  { href: "/references", label: "References", icon: BookOpen },
];

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Gear },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-neutral-900 text-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-neutral-900 text-sm">
          PF
        </div>
        <span className="text-[15px] font-semibold tracking-tight">
          PropFlow
        </span>
      </div>

      {/* Primary nav */}
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200"
              }`}
            >
              <item.icon
                size={18}
                weight={active ? "fill" : "regular"}
                className={
                  active
                    ? "text-white"
                    : "text-neutral-500 group-hover:text-neutral-300"
                }
              />
              {item.label}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="!my-3 h-px bg-white/[0.08]" />

        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200"
              }`}
            >
              <item.icon
                size={18}
                weight={active ? "fill" : "regular"}
                className={
                  active
                    ? "text-white"
                    : "text-neutral-500 group-hover:text-neutral-300"
                }
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.08] p-3">
        <div className="flex items-center gap-3 rounded-md px-2.5 py-2">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-neutral-200">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-neutral-200">
              {user.name}
            </p>
            <p className="truncate text-[11.5px] text-neutral-500">
              {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
            title="Sign out"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-3.5 z-50 rounded-md bg-neutral-900 p-1.5 text-white shadow-lg md:hidden"
      >
        {mobileOpen ? <X size={20} /> : <List size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        {sidebarContent}
      </aside>
    </>
  );
}
