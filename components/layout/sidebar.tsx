"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import {
  Zap, LayoutDashboard, LogOut, Settings, BarChart3,
  MessageSquare, Snowflake, Send,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/automations", icon: Zap, label: "Automations" },
  { href: "/dashboard/inbox", icon: MessageSquare, label: "Inbox" },
  { href: "/dashboard/ice-breakers", icon: Snowflake, label: "Ice breakers" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  username?: string
  profilePic?: string | null
  className?: string
  onLogout?: () => void
  onNavigate?: () => void
}

export function Sidebar({ className, username = "creator", profilePic, onLogout, onNavigate, ...props }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn("flex flex-col bg-sidebar text-sidebar-foreground", className)} {...props}>
      {/* Brand + Theme Toggle */}
            <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
              <div className="w-7 h-7 bg-accent-yellow text-accent-yellow-foreground rounded-md flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
              <span className="font-mono-ui text-sm font-bold tracking-tight text-sidebar-foreground flex-1">insta-p8</span>
              <ThemeToggle />
            </div>

            <div className="mx-5 h-px bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                active
                  ? "text-sidebar-foreground bg-sidebar-accent font-medium"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-accent-yellow" />}
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-accent-yellow" : "")} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}

        <div className="pt-5 pb-1 px-3">
          <div className="h-px bg-sidebar-border" />
        </div>

        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            pathname === "/dashboard/settings"
              ? "text-sidebar-foreground bg-sidebar-accent font-medium"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
          )}
        >
          {pathname === "/dashboard/settings" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-accent-yellow" />}
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Settings</span>
        </Link>

        <a
          href="https://t.me/instagramautomationp8"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Send className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Get help</span>
        </a>
      </nav>

      {/* Account */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-sidebar-border group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-500 p-[1.5px] shrink-0">
            <div className="w-full h-full rounded-full bg-sidebar flex items-center justify-center overflow-hidden">
              {profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePic} alt={username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-sidebar-foreground">{username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sidebar-foreground truncate">@{username}</p>
            <p className="font-mono-ui text-[9px] uppercase tracking-wider text-sidebar-foreground/60">connected</p>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}