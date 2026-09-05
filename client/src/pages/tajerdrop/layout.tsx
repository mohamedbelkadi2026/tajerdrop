import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  LayoutDashboard, Package, ShoppingCart, User, LogOut, Menu, ChevronRight,
  BarChart3, Warehouse, Truck, FileText, Send, LineChart,
  Store as StoreIcon, Upload,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Navigation groupée : au-delà d'une dizaine d'entrées, une liste plate oblige
// à relire tous les libellés pour en retrouver un. Les intégrations sont
// listées une par canal plutôt que derrière une page unique — un seller vient
// ici pour brancher YouCan ou sa feuille, pas pour « ouvrir les intégrations ».
const NAV_SECTIONS = [
  {
    title: "Activité",
    items: [
      { href: "/tajerdrop/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/tajerdrop/product-stats", label: "Performance produits", icon: BarChart3 },
      { href: "/tajerdrop/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    title: "Produits",
    items: [
      { href: "/tajerdrop/catalogue", label: "Catalogue", icon: Package },
      { href: "/tajerdrop/my-stock", label: "Mon stock", icon: Warehouse },
      { href: "/tajerdrop/offer-requests", label: "Mes demandes", icon: Send },
    ],
  },
  {
    title: "Commandes",
    items: [
      { href: "/tajerdrop/commandes", label: "Mes commandes", icon: ShoppingCart },
      { href: "/tajerdrop/import", label: "Importer", icon: Upload },
      { href: "/tajerdrop/expeditions", label: "Expéditions", icon: Truck },
      { href: "/tajerdrop/invoices", label: "Factures", icon: FileText },
    ],
  },
  {
    title: "Intégrations",
    items: [
      { href: "/tajerdrop/integrations", label: "Mes boutiques", icon: StoreIcon },
    ],
  },
  {
    title: "Compte",
    items: [{ href: "/tajerdrop/profil", label: "Mon profil", icon: User }],
  },
];

const NAVY  = "#0f1e38";
const GOLD  = "#C5A059";
// Fond gris-bleu plutot que creme : a #f8f4ed, les cartes blanches se
// detachaient a peine et la page paraissait delavee. Un fond neutre et
// legerement plus fonce fait ressortir le blanc, sans concurrencer le bleu
// nuit et l'or de la marque.
const LIGHT = "#eef1f6";

export function TajerDropLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      qc.clear();
      window.location.href = "/login";
    },
  });

  const Sidebar = ({ mobile = false }) => (
    <aside
      style={{ background: NAVY, borderRight: mobile ? "none" : `2px solid ${GOLD}30` }}
      className={mobile
        ? "fixed inset-y-0 left-0 z-50 w-72 flex flex-col"
        : "hidden lg:flex flex-col w-64 shrink-0 min-h-screen"}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: `${GOLD}30` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: GOLD }}>Tajer</span>
          <span className="text-2xl font-black tracking-tight text-white">Drop</span>
        </div>
        <p className="text-xs mt-1" style={{ color: `${GOLD}99` }}>Espace Seller</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.title} className={i === 0 ? "" : "mt-5"}>
            <p
              className="px-3 pb-1.5 text-[11px] font-semibold"
              style={{ color: `${GOLD}80` }}
            >
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = location === href || location.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => mobile && setMobileOpen(false)}
                    style={{
                      background: active ? `${GOLD}20` : "transparent",
                      color: active ? GOLD : "rgba(255,255,255,0.72)",
                      borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                    }}
                    className="flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                    {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: `${GOLD}30` }}>
        <p className="text-xs truncate" style={{ color: `${GOLD}80` }}>
          {(user as any)?.username || (user as any)?.email}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
          onClick={() => logout.mutate()}
        >
          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen" style={{ background: LIGHT }}>
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {mobileOpen && <Sidebar mobile />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: NAVY, borderBottom: `2px solid ${GOLD}30` }}
        >
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" style={{ color: GOLD }} />
          </button>
          <div className="flex items-center gap-1">
            <span className="text-lg font-black" style={{ color: GOLD }}>Tajer</span>
            <span className="text-lg font-black text-white">Drop</span>
          </div>
          <div className="w-5" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
