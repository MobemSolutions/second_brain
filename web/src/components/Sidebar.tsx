"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Inbox, Target, CheckSquare,
  Dumbbell, Apple, Heart, Film, CreditCard, HeartHandshake, CalendarClock, ShoppingCart,
  Menu, X,
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
      { href: "/planning", label: "Planning",      icon: CalendarClock },
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
      { href: "/psy",           label: "Psy TCC",      icon: HeartHandshake },
      { href: "/courses",      label: "Courses",      icon: ShoppingCart },
      { href: "/media",        label: "Médiathèque",  icon: Film },
      { href: "/abonnements",  label: "Abonnements",  icon: CreditCard },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile topbar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14"
        style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e4e2de" }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="p-1.5 -ml-1.5 rounded-md"
          style={{ color: "#5a5a58" }}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Image src="/logo.jpg" alt="" width={24} height={24} className="rounded-md shrink-0 object-contain" priority />
          <p className="text-[13px] font-semibold truncate" style={{ color: "#1a1a18" }}>
            Second Brain
          </p>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`w-64 lg:w-52 shrink-0 flex flex-col fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e4e2de" }}
      >
        {/* Brand */}
        <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e4e2de" }}>
          <div className="flex items-center gap-2.5">
            <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded-md shrink-0 object-contain" priority />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "#1a1a18" }}>
                Second Brain
              </p>
              <p className="text-[10px]" style={{ color: "#b0aea9" }}>
                {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="lg:hidden p-1 rounded-md shrink-0"
            style={{ color: "#5a5a58" }}
          >
            <X size={18} />
          </button>
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
    </>
  );
}
