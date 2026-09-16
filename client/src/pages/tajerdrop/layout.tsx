import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  LayoutDashboard, Package, ShoppingCart, User, LogOut, Menu, ChevronRight,
  BarChart3, Warehouse, Truck, FileText, Send, LineChart,
  Store as StoreIcon, Upload, Mail, Phone, MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TajerDropMark } from "@/components/tajerdrop-logo";
import { Button } from "@/components/ui/button";

// Navigation groupée : au-delà d'une dizaine d'entrées, une liste plate oblige
// à relire tous les libellés pour en retrouver un. Les intégrations sont
// listées une par canal plutôt que derrière une page unique — un seller vient
// ici pour brancher YouCan ou sa feuille, pas pour « ouvrir les intégrations ».
const NAV_SECTIONS = [
  {
    title: "secActivity",
    items: [
      { href: "/tajerdrop/dashboard", label: "dashboard", icon: LayoutDashboard },
      { href: "/tajerdrop/product-stats", label: "productStats", icon: BarChart3 },
      { href: "/tajerdrop/analytics", label: "analytics", icon: LineChart },
    ],
  },
  {
    title: "secProducts",
    items: [
      { href: "/tajerdrop/catalogue", label: "catalogue", icon: Package },
      { href: "/tajerdrop/my-stock", label: "myStock", icon: Warehouse },
      { href: "/tajerdrop/offer-requests", label: "myRequests", icon: Send },
    ],
  },
  {
    title: "secOrders",
    items: [
      { href: "/tajerdrop/commandes", label: "myOrders", icon: ShoppingCart },
      { href: "/tajerdrop/import", label: "import", icon: Upload },
      { href: "/tajerdrop/expeditions", label: "shipments", icon: Truck },
      { href: "/tajerdrop/invoices", label: "invoices", icon: FileText },
    ],
  },
  {
    title: "secIntegrations",
    items: [
      { href: "/tajerdrop/integrations", label: "myShops", icon: StoreIcon },
    ],
  },
  {
    title: "secAccount",
    items: [{ href: "/tajerdrop/profil", label: "profile", icon: User }],
  },
];

// Deux bleus, deux roles. #0F172A est vif : parfait sur un bouton de quelques
// centimetres, insoutenable sur une colonne pleine hauteur, ou il eblouit et
// fait perdre au texte blanc son contraste. La barre laterale garde donc un
// bleu profond, et le bleu de marque reste reserve aux actions.
const NAVY  = "#0F172A";
const GOLD  = "#FF6B35";
// Fond gris-bleu plutot que creme : a #f8f4ed, les cartes blanches se
// detachaient a peine et la page paraissait delavee. Un fond neutre et
// legerement plus fonce fait ressortir le blanc, sans concurrencer le bleu
// nuit et l'or de la marque.
const LIGHT = "#f1f5f9";


/**
 * Interlocuteur du seller, en pied de barre laterale.
 *
 * Sa place est ici et non sur le tableau de bord : un contact se cherche
 * quand quelque chose bloque, depuis n'importe quel ecran. Sur le tableau de
 * bord, il fallait y revenir pour trouver un numero — et il occupait une
 * place que les chiffres utilisent mieux.
 *
 * Rien ne s'affiche tant qu'aucun interlocuteur n'est attribue : annoncer un
 * contact absent est pire que ne rien annoncer.
 */
function ManagerBlock() {
  const { data } = useQuery<any>({ queryKey: ["/api/seller/account-manager"] });
  if (!data) return null;

  return (
    <div className="mt-5 rounded-xl p-3" style={{ background: "rgba(255,255,255,.06)" }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: GOLD, color: "#fff" }}>
          {String(data.name || "?").slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{data.name}</p>
          <p className="truncate text-[11px]" style={{ color: `${GOLD}cc` }}>Account Manager</p>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {data.email && (
          <a href={`mailto:${data.email}`}
            className="flex items-center gap-2 text-[11px] text-white/60 hover:text-white">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{data.email}</span>
          </a>
        )}
        {data.phone && (
          <a href={`tel:${data.phone}`}
            className="flex items-center gap-2 text-[11px] text-white/60 hover:text-white">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{data.phone}</span>
          </a>
        )}
        {data.whatsapp && (
          <a href={`https://wa.me/${data.whatsapp}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-[11px] font-semibold"
            style={{ color: "#25D366" }}>
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

export function TajerDropLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
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
        ? "fixed inset-y-0 start-0 z-50 w-72 flex flex-col"
        // sticky + h-screen : la barre restait solidaire de la page et
        // disparaissait vers le haut des qu'on descendait dans un tableau
        // long. Elle occupe maintenant la hauteur de la fenetre et defile
        // pour son propre compte.
        : "hidden lg:flex flex-col w-64 shrink-0 self-start sticky top-0 h-screen"}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: `${GOLD}30` }}>
        <div className="flex items-center gap-2">
          {/* Marque complete : le T-goutte plus le mot. « Drop » en orange,
              comme partout ailleurs — c'est la moitie du nom que l'accent
              doit porter, pas « Tajer ». */}
          <TajerDropMark size={30} onDark />
          <span className="text-2xl font-black tracking-tight text-white">Tajer</span>
          <span className="text-2xl font-black tracking-tight" style={{ color: GOLD }}>Drop</span>
        </div>
        <p className="text-xs mt-1" style={{ color: `${GOLD}99` }}>{t("seller.nav.space")}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.title} className={i === 0 ? "" : "mt-5"}>
            <p
              className="px-3 pb-1.5 text-[11px] font-semibold"
              style={{ color: `${GOLD}80` }}
            >
              {t(`seller.nav.${section.title}`)}
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
                    className="flex items-center gap-3 rounded-e-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t(`seller.nav.${label}`)}
                    {active && <ChevronRight className="ms-auto h-3.5 w-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {/* Sous la derniere entree de navigation : c'est une fiche de contact,
            pas un lien, et elle se lit apres le menu. Placee dans la zone
            defilante, elle ne mange pas la hauteur reservee au menu sur les
            petits ecrans. */}
        <ManagerBlock />
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
          <LogOut className="w-4 h-4 me-2" /> {t("seller.nav.logout")}
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
      {/* min-w-0 : sans lui, un enfant large (tableau, graphique, select)
          impose sa largeur a cette colonne flex, qui deborde alors du viewport
          au lieu de laisser l'enfant defiler dans son propre cadre. C'est la
          cause du debordement horizontal sur mobile. */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: NAVY, borderBottom: `2px solid ${GOLD}30` }}
        >
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" style={{ color: GOLD }} />
          </button>
          <div className="flex items-center gap-1">
            <TajerDropMark size={24} onDark />
            <span className="text-lg font-black text-white">Tajer</span>
            <span className="text-lg font-black" style={{ color: GOLD }}>Drop</span>
          </div>
          <div className="w-5" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
