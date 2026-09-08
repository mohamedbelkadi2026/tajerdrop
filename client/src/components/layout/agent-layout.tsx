import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Package, ShoppingCart, User, LogOut, Menu, ChevronRight,
  PlusCircle, ListChecks, Warehouse,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { TajerDropMark } from "@/components/tajerdrop-logo";
import { Button } from "@/components/ui/button";

/**
 * Coque TajerDrop pour les agents de confirmation.
 *
 * Un agent voyait la coque TajerGrow, du nom de l'espace operateur, alors que
 * la plateforme s'appelle TajerDrop partout ailleurs — accueil, espace seller,
 * catalogue. Il travaillait sous une marque que le client au telephone ne
 * reconnait pas.
 *
 * Seule la coque change. Les ecrans de commandes qu'elle contient restent
 * ceux qui existent : ce sont les outils que les agents utilisent toute la
 * journee pour confirmer, et les refaire pour un changement d'apparence
 * risquerait d'arreter le centre d'appel.
 */

const NAVY  = "#0F172A";
const GOLD  = "#FF6B35";
const LIGHT = "#f1f5f9";

/** Etats de commande, dans l'ordre de travail d'un agent de confirmation. */
const CONFIRMATION_STATES = [
  { href: "/orders",                  label: "Nouveaux",         badgeKey: "nouveau" },
  { href: "/orders/confirme",         label: "Confirmés" },
  { href: "/orders/confirme-reporte", label: "Confirmé reporté", badgeKey: "confirmeReporteDueSoon" },
  { href: "/orders/rappel",           label: "Rappel",           badgeKey: "rappel" },
  { href: "/orders/injoignable",      label: "Injoignables" },
  { href: "/orders/pas-reponse",      label: "Pas de réponse" },
  { href: "/orders/boite-vocale",     label: "Boîte vocale" },
  { href: "/orders/annules",          label: "Annulés" },
];

/** Etats suivis par un agent de suivi de colis. */
const TRACKING_STATES = [
  { href: "/orders/suivi",     label: "Suivi des colis" },
  { href: "/orders/en-cours",  label: "En cours" },
  { href: "/orders/livrees",   label: "Livrées" },
  { href: "/orders/refuses",   label: "Refusées" },
  { href: "/orders/retours",   label: "Retours" },
  { href: "/orders/rappel",    label: "Rappel", badgeKey: "rappel" },
];

export function AgentLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => { qc.clear(); window.location.href = "/login"; },
  });

  // La specialite vient des roles poses par l'admin dans la gestion d'equipe.
  // Un agent de suivi n'a rien a faire dans la file de confirmation, et
  // l'inverse : lui montrer les deux allongerait la barre sans rien lui ouvrir.
  // Union sur tous les magasins : un agent peut etre « confirmation » dans
  // l'un et « suivi » dans un autre, et doit voir les files des deux.
  const { data: agentSettingsData } = useQuery<any[]>({ queryKey: ["/api/agents/store-settings"] });
  const specialty = useMemo(() => {
    const roles = new Set(
      (agentSettingsData || [])
        .filter((s: any) => s.agentId === (user as any)?.id)
        .map((s: any) => s.roleInStore),
    );
    if (roles.has("both") || (roles.has("confirmation") && roles.has("suivi"))) return "both";
    if (roles.has("suivi")) return "suivi";
    return "confirmation";
  }, [agentSettingsData, user]);

  const { data: ordersStats } = useQuery<any>({ queryKey: ["/api/stats/filtered"] });
  const badgeCounts: Record<string, number> = {
    nouveau: ordersStats?.nouveau ?? 0,
    confirmeReporteDueSoon: ordersStats?.confirmeReporteDueSoon ?? 0,
    rappel: ordersStats?.rappel ?? 0,
  };

  // L'acces au stock est un droit accorde agent par agent depuis la gestion
  // d'equipe. Le lien et la route lisent le meme drapeau : les separer ferait
  // apparaitre une entree qui renvoie aussitot a l'accueil.
  const hasInventory = !!(user as any)?.dashboardPermissions?.show_inventory;

  const sections = useMemo(() => {
    const orderStates = specialty === "suivi"
      ? TRACKING_STATES
      : specialty === "both"
        ? [...CONFIRMATION_STATES, ...TRACKING_STATES]
        : CONFIRMATION_STATES;

    const out: { title: string; items: any[] }[] = [
      { title: "Activité", items: [{ href: "/", label: "Tableau de bord", icon: LayoutDashboard }] },
      { title: "Commandes", items: [
        ...(specialty !== "suivi"
          ? [{ href: "/orders/add", label: "Nouvelle commande", icon: PlusCircle }]
          : []),
        { href: "/orders/all", label: "Toutes les commandes", icon: ListChecks },
      ]},
      { title: "À traiter", items: orderStates.map(s => ({ ...s, icon: ShoppingCart })) },
      { title: "Produits", items: [
        { href: "/agent/catalogue", label: "Catalogue", icon: Package },
        ...(hasInventory ? [{ href: "/inventory", label: "Stock", icon: Warehouse }] : []),
      ]},
      { title: "Compte", items: [{ href: "/profile", label: "Mon profil", icon: User }] },
    ];
    return out;
  }, [specialty, hasInventory]);

  const Sidebar = ({ mobile = false }) => (
    <aside
      style={{ background: NAVY, borderRight: mobile ? "none" : `2px solid ${GOLD}30` }}
      className={mobile
        ? "fixed inset-y-0 start-0 z-50 w-72 flex flex-col"
        : "hidden lg:flex flex-col w-64 shrink-0 min-h-screen"}
    >
      <div className="px-6 py-6 border-b" style={{ borderColor: `${GOLD}30` }}>
        <div className="flex items-center gap-2">
          <TajerDropMark size={30} onDark />
          <span className="text-2xl font-black tracking-tight text-white">Tajer</span>
          <span className="text-2xl font-black tracking-tight" style={{ color: GOLD }}>Drop</span>
        </div>
        <p className="text-xs mt-1" style={{ color: `${GOLD}99` }}>
          {specialty === "suivi" ? "Espace suivi" : "Espace confirmation"}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <div key={section.title} className={i === 0 ? "" : "mt-5"}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold" style={{ color: `${GOLD}80` }}>
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon, badgeKey }: any) => {
                // Egalite stricte : /orders est un prefixe de /orders/rappel,
                // et un test par prefixe allumerait « Nouveaux » sur toutes les
                // files a la fois.
                const active = location === href;
                const count = badgeKey ? badgeCounts[badgeKey] ?? 0 : 0;
                return (
                  <Link
                    key={href + label}
                    href={href}
                    onClick={() => mobile && setMobileOpen(false)}
                    style={{
                      background: active ? `${GOLD}20` : "transparent",
                      color: active ? GOLD : "rgba(255,255,255,0.72)",
                      borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                    }}
                    className="flex items-center gap-3 rounded-e-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                    {count > 0 && (
                      <span
                        className="ms-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: GOLD }}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                    {active && count === 0 && <ChevronRight className="ms-auto h-3.5 w-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

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
          <LogOut className="w-4 h-4 me-2" /> Déconnexion
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen" style={{ background: LIGHT }}>
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {mobileOpen && <Sidebar mobile />}

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: NAVY, borderBottom: `2px solid ${GOLD}30` }}
        >
          <button onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="w-5 h-5" style={{ color: GOLD }} />
          </button>
          <div className="flex items-center gap-1">
            <TajerDropMark size={24} onDark />
            <span className="text-lg font-black text-white">Tajer</span>
            <span className="text-lg font-black" style={{ color: GOLD }}>Drop</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
