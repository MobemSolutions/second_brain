"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, Target, CheckSquare,
  Dumbbell, Apple, Heart, Film, CreditCard, Brain,
} from "lucide-react";

const nav = [
  {
    group: "général", label: null,
    items: [
      { href: "/",         label: "Dashboard",    icon: LayoutDashboard },
      { href: "/inbox",    label: "Inbox",         icon: Inbox },
    ],
  },
  {
    group: "faire", label: "Faire",
    items: [
      { href: "/projets",  label: "Projets",       icon: Target },
      { href: "/taches",   label: "Tâches",        icon: CheckSquare },
    ],
  },
  {
    group: "performer", label: "Performer",
    items: [
      { href: "/sport",      label: "Sport",       icon: Dumbbell },
      { href: "/nutrition",  label: "Nutrition",   icon: Apple },
      { href: "/habitudes",  label: "Habitudes",   icon: Heart },
    ],
  },
  {
    group: "vivre", label: "Vivre",
    items: [
      { href: "/media",        label: "Médiathèque",  icon: Film },
      { href: "/abonnements",  label: "Abonnements",  icon: CreditCard },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-52 shrink-0 flex flex-col"
      style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e4e2de" }}
    >
      {/* Brand */}
      <div className="px-4 py-4" style={{ borderBottom: "1px solid #e4e2de" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center shrink-0"
            style={{ background: "#6d28d9", borderRadius: "5px" }}
          >
            <Brain size={13} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "#1a1a18" }}>
              Second Brain
            </p>
            <p className="text-[10px]" style={{ color: "#b0aea9" }}>
              {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {nav.map((section) => (
          <div key={section.group} className={section.label ? "mt-4" : ""}>
            {section.label && (
              <p className="section-label px-2 mb-1">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "5px 8px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: active ? 500 : 400,
                      color: active ? "#6d28d9" : "#5a5a58",
                      backgroundColor: active ? "rgba(109,40,217,0.07)" : "transparent",
                      transition: "all 0.1s ease",
                      textDecoration: "none",
                    }}
                    className="sidebar-link"
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <style>{`
        .sidebar-link:hover {
          background-color: #eeece9 !important;
          color: #1a1a18 !important;
        }
      `}</style>
    </aside>
  );
}
