import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ArrowRight, BarChart3, Boxes, CheckCircle2, ChevronDown, Headphones,
  Menu, PackageCheck, ShieldCheck, Truck, Wallet, X, Zap,
} from "lucide-react";
import { TajerDropLogo, TajerDropMark } from "@/components/tajerdrop-logo";

// Fonds pleins de la page : un bleu profond porte mieux le texte blanc que le
// bleu vif de la marque, reserve aux boutons.
const NAVY = "#0F172A";
const GOLD = "#FF6B35";

export type LandingLang = "ar" | "fr";

/**
 * Une seule page d'accueil pour les deux langues.
 *
 * Les deux versions vendent la meme offre aux memes sellers, avec les memes
 * tarifs. Les tenir dans deux fichiers a fait diverger la francaise, restee
 * sur l'ancien discours TajerGrow (CRM multi-tenant) alors que l'arabe
 * presentait deja TajerDrop : un visiteur qui basculait de langue changeait de
 * produit. Les textes sont donc regroupes ici, et une seule structure les rend.
 *
 * L'arabe n'est pas une traduction du francais : il est ecrit en darija, la
 * langue de travail de ces vendeurs. Les deux colonnes du dictionnaire se
 * lisent cote a cote, ce qui rend visible l'oubli d'un texte a la relecture.
 */
const COPY = {
  dir:        { ar: "rtl" as const,        fr: "ltr" as const },
  locale:     { ar: "ar-MA",               fr: "fr-MA" },
  navHow:     { ar: "كيفاش كايخدم",        fr: "Comment ça marche" },
  navFeat:    { ar: "الخدمات",             fr: "Services" },
  navPrice:   { ar: "الأثمنة",             fr: "Tarifs" },
  navFaq:     { ar: "أسئلة",               fr: "Questions" },
  login:      { ar: "دخول",                fr: "Connexion" },
  signup:     { ar: "سجّل مجاناً",          fr: "Inscription gratuite" },
  menuLabel:  { ar: "القائمة",             fr: "Menu" },

  badge:      { ar: "منصة الدروبشيبينگ رقم 1 فالمغرب", fr: "La plateforme de dropshipping n°1 au Maroc" },
  heroA:      { ar: "بيع أونلاين",         fr: "Vendez en ligne" },
  heroB:      { ar: "بلا ستوك",            fr: "sans stock" },
  heroC:      { ar: "وبلا مخاطرة",         fr: "et sans risque" },
  heroText: {
    ar: "ختار المنتج من الكاطالوگ ديالنا، سوّق ليه، وحنا كانتكلّفو بتأكيد الطلبات، التغليف والتوصيل لجميع المدن. نتا غير كتبيع.",
    fr: "Choisissez un produit dans notre catalogue et faites-en la publicité. Nous nous occupons de la confirmation des commandes, de l'emballage et de la livraison dans toutes les villes. Vous n'avez qu'à vendre.",
  },
  ctaStart:   { ar: "بدا مجاناً دابا",      fr: "Commencer gratuitement" },
  ctaHow:     { ar: "كيفاش كايخدم؟",       fr: "Comment ça marche ?" },

  statCities: { ar: "جميع المدن",          fr: "Toutes les villes" },
  statCitiesL:{ ar: "التغطية ديال التوصيل", fr: "Couverture de livraison" },
  statTrackL: { ar: "تتبّع الطلبات",        fr: "Suivi des commandes" },
  statCapital:{ ar: " درهم",               fr: " DH" },
  statCapitalL:{ ar: "راس مال ديال البداية", fr: "Capital de départ" },

  netProfit:  { ar: "الربح الصافي",         fr: "Bénéfice net" },
  currency:   { ar: " د.م",                fr: " DH" },
  confirmed:  { ar: "مؤكّدة",               fr: "Confirmées" },
  delivered:  { ar: "موصّلة",               fr: "Livrées" },
  returned:   { ar: "مرجّعة",               fr: "Retours" },
  demoP1:     { ar: "ساعة رجالية",          fr: "Montre homme" },
  demoP2:     { ar: "طقم مثبّتات السيارات",  fr: "Support voiture" },
  demoP3:     { ar: "جهاز تدليك",           fr: "Appareil de massage" },

  howTitle:   { ar: "ثلاث خطوات وصافي",     fr: "Trois étapes, c'est tout" },
  howSub: {
    ar: "ما خاصك لا ستوك، لا مستودع، لا فريق. غير الإشهار والبيع.",
    fr: "Ni stock, ni entrepôt, ni équipe. Vous faites la publicité et la vente.",
  },
  sceneTitle: { ar: "نهارك كيدوز هكا",       fr: "Votre journée ressemble à ça" },
  sceneSub: {
    ar: "نتا كتسوّق. الطلبات كايجيو، وحنا كانكملو الباقي.",
    fr: "Vous faites la publicité. Les commandes arrivent, nous faisons le reste.",
  },
  sceneYou:     { ar: "نتا",            fr: "Vous" },
  sceneOrder:   { ar: "طلبية جديدة",    fr: "Nouvelle commande" },
  sceneConfirm: { ar: "تأكيد",          fr: "Confirmation" },
  scenePack:    { ar: "التغليف",        fr: "Emballage" },
  sceneShip:    { ar: "التوصيل",        fr: "Livraison" },
  scenePaid:    { ar: "الأرباح ديالك",  fr: "Vos bénéfices" },
  sceneUs:      { ar: "حنا كانديرو هادشي", fr: "C'est nous qui faisons ça" },
  featTitle:  { ar: "كولشي فبلاصة وحدة",    fr: "Tout au même endroit" },
  featSub: {
    ar: "من المنتج حتى الفلوس فجيبك — بلا ما تخرج من المنصة.",
    fr: "Du produit jusqu'à l'argent encaissé, sans quitter la plateforme.",
  },

  priceTitle: { ar: "كتخلّص غير على اللي توصل", fr: "Vous ne payez que ce qui est livré" },
  priceSub:   { ar: "ما كاينش اشتراك شهري، ما كاينش رسوم مخبّية.", fr: "Aucun abonnement mensuel, aucun frais caché." },
  priceLabel: { ar: "التسجيل والاستعمال",    fr: "Inscription et utilisation" },
  priceFree:  { ar: "مجاناً",               fr: "Gratuit" },
  priceNote:  { ar: "خلّص غير التكاليف ديال الطلبات الموصّلة", fr: "Payez uniquement les frais des commandes livrées" },
  feeConfirm: { ar: "تأكيد الطلبات",        fr: "Confirmation des commandes" },
  feePack:    { ar: "التغليف",              fr: "Emballage" },
  feeShip:    { ar: "التوصيل",              fr: "Livraison" },
  perDelivered:{ ar: "لكل طلبية موصّلة",     fr: "Par commande livrée" },
  allMorocco: { ar: "فكامل المغرب",         fr: "Partout au Maroc" },
  priceFoot: {
    ar: "الطلبية اللي ما توصلاتش ما كتخلّص عليها والو — لا تأكيد، لا توصيل، لا تغليف.",
    fr: "Une commande non livrée ne vous coûte rien : ni confirmation, ni livraison, ni emballage.",
  },
  priceCta:   { ar: "سجّل دابا",            fr: "S'inscrire maintenant" },

  faqTitle:   { ar: "أسئلة كايطرحوها بزاف",  fr: "Questions fréquentes" },
  finalTitle: { ar: "واجد تبدا تبيع؟",      fr: "Prêt à vendre ?" },
  finalText: {
    ar: "التسجيل مجاني وكياخد غير دقيقة. ما خاصك لا ستوك لا رأس مال.",
    fr: "L'inscription est gratuite et prend une minute. Ni stock, ni capital.",
  },
};

const STEPS = {
  ar: [
    { icon: Boxes, title: "ختار المنتج", text: "تصفّح الكاطالوگ ديالنا، شوف الثمن ديال الجملة والربح المتوقع، وطلب الإذن باش تبيعو." },
    { icon: Zap, title: "بيع بلا ستوك", text: "ربّط الستور ديالك مع يوكان، شوپيفاي، ووكومرس ولا گوگل شيت. الطلبات كايوصلو ليك أوتوماتيك." },
    { icon: PackageCheck, title: "حنا كانكملو كولشي", text: "تأكيد الطلبات، التغليف والتوصيل — كولشي علينا. نتا غير ركّز على الإشهار." },
  ],
  fr: [
    { icon: Boxes, title: "Choisissez le produit", text: "Parcourez le catalogue, consultez le prix de gros et le bénéfice attendu, puis demandez l'accès pour le vendre." },
    { icon: Zap, title: "Vendez sans stock", text: "Connectez votre store à YouCan, Shopify, WooCommerce ou Google Sheets. Les commandes arrivent automatiquement." },
    { icon: PackageCheck, title: "Nous faisons le reste", text: "Confirmation des commandes, emballage et livraison : tout est pour nous. Concentrez-vous sur la publicité." },
  ],
};

const FEATURES = {
  ar: [
    { icon: Headphones, title: "سونطر ديال تأكيد الطلبات", text: "فريق مغربي كايعيّط على الكليان بالدارجة ويأكّد الطلبات ديالك." },
    { icon: Truck, title: "توصيل لجميع المدن", text: "توصيل لجميع المدن المغربية، مع تتبّع مباشر لكل كولي." },
    { icon: Wallet, title: "الخلاص عند التوصيل", text: "ما كتخلّصش والو حتى توصل الطلبية. لا ستوك، لا مخاطرة." },
    { icon: BarChart3, title: "أرقام واضحة", text: "الربح الصافي ديال كل منتج، نسبة التأكيد ونسبة التوصيل — بلا حسابات." },
    { icon: ShieldCheck, title: "بلا رسوم مخبّية", text: "ثمن الجملة، التوصيل، التغليف والتأكيد باينين قبل ما تبدا." },
    { icon: Boxes, title: "كاطالوگ كايتجدّد", text: "منتجات مختارة على حساب الطلب فالسوق المغربي، مع صور جاهزة للإشهار." },
  ],
  fr: [
    { icon: Headphones, title: "Centre de confirmation", text: "Une équipe marocaine appelle vos clients en darija et confirme vos commandes." },
    { icon: Truck, title: "Livraison dans toutes les villes", text: "Livraison partout au Maroc, avec suivi en direct de chaque colis." },
    { icon: Wallet, title: "Paiement à la livraison", text: "Vous ne payez rien tant que la commande n'est pas livrée. Ni stock, ni risque." },
    { icon: BarChart3, title: "Des chiffres clairs", text: "Bénéfice net par produit, taux de confirmation et taux de livraison, sans calcul de votre côté." },
    { icon: ShieldCheck, title: "Aucun frais caché", text: "Prix de gros, livraison, emballage et confirmation sont affichés avant que vous commenciez." },
    { icon: Boxes, title: "Catalogue renouvelé", text: "Des produits choisis selon la demande du marché marocain, avec des visuels prêts pour la publicité." },
  ],
};

const FAQ = {
  ar: [
    { q: "واش خاصني ستوك ولا رأس مال؟", a: "لا. المنتجات عندنا فالمستودع. نتا كتبيع، وحنا كانغلّفو وكانوصّلو. ما كتخلّصش المنتج حتى توصل الطلبية للكليان." },
    { q: "شحال كانخلّص؟", a: "كتخلّص غير على الطلبات اللي توصلات: ثمن المنتج، التوصيل، التغليف والتأكيد. الطلبية اللي ما توصلاتش ما كتكلّفك والو." },
    { q: "كيفاش كانوصل ليّا الفلوس؟", a: "كل طلبية توصلات كيتحسب الربح ديالها فالفاكتورة ديالك. الخلاص كيتم بشكل دوري على حساب الفاكتورات." },
    { q: "واش خاصني ستور أونلاين؟", a: "ماشي ضروري. تقدر تدخل الطلبات بيدك ولا تجيبهم من فيشي إكسيل. وإلا عندك ستور، ربطو ف دقيقة." },
    { q: "شحال كياخد باش نبدا؟", a: "التسجيل مجاني. من بعد ما يتفعّل الحساب ديالك، تقدر تطلب المنتجات وتبدا تبيع فنفس النهار." },
  ],
  fr: [
    { q: "Ai-je besoin de stock ou de capital ?", a: "Non. Les produits sont dans notre entrepôt. Vous vendez, nous emballons et livrons. Vous ne payez le produit qu'une fois la commande livrée au client." },
    { q: "Combien est-ce que je paie ?", a: "Vous ne payez que sur les commandes livrées : prix du produit, livraison, emballage et confirmation. Une commande non livrée ne vous coûte rien." },
    { q: "Comment suis-je payé ?", a: "Chaque commande livrée voit son bénéfice calculé dans votre facture. Les versements se font périodiquement sur la base de ces factures." },
    { q: "Ai-je besoin d'un store en ligne ?", a: "Ce n'est pas obligatoire. Vous pouvez saisir les commandes à la main ou les importer depuis un fichier Excel. Et si vous avez un store, connectez-le en une minute." },
    { q: "Combien de temps pour démarrer ?", a: "L'inscription est gratuite. Dès que votre compte est activé, vous pouvez demander des produits et vendre le jour même." },
  ],
};

/**
 * Bascule de langue.
 *
 * La langue non active est un lien vers l'autre URL plutot qu'un etat local :
 * chaque version garde ainsi son adresse propre, indexable et partageable, et
 * les publicites qui pointent deja sur /fr continuent d'arriver au bon endroit.
 */
function LangSwitch({ lang, light = false }: { lang: LandingLang; light?: boolean }) {
  const base = light ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-700";
  const active = light ? "text-white" : "text-slate-800";
  return (
    <div className="flex items-center gap-1.5 text-sm font-semibold">
      {lang === "ar"
        ? <span className={active}>العربية</span>
        : <a href="/" className={base}>العربية</a>}
      <span className={light ? "text-white/25" : "text-slate-300"}>·</span>
      {lang === "fr"
        ? <span className={active}>Français</span>
        : <a href="/fr" className={base}>Français</a>}
    </div>
  );
}

/**
 * Revele un bloc quand il entre dans le viewport.
 *
 * IntersectionObserver plutot qu'un ecouteur de scroll : le navigateur ne
 * reveille le code que lorsque l'element approche, la ou un handler de scroll
 * s'execute a chaque pixel et fait tomber les images longues de cette page.
 * On observe une seule fois puis on se detache — reanimer un bloc deja vu au
 * moindre retour en arriere est desagreable.
 */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respecte prefers-reduced-motion : pour qui a desactive les animations,
    // le contenu doit etre la, pas apparaitre.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(24px)",
        transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Compteur qui s'anime une fois visible. */
function Counter({ to, suffix = "", locale = "ar-MA" }: { to: number; suffix?: string; locale?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1200);
        // easeOutCubic : la valeur finale se pose au lieu de s'arreter net.
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return <span ref={ref}>{n.toLocaleString(locale)}{suffix}</span>;
}


/**
 * Scene animee : la journee d'un seller.
 *
 * La page explique en mots que l'operateur confirme, emballe et livre. Cette
 * scene le montre : une commande entre a gauche, traverse les trois etapes,
 * et l'argent revient. C'est l'argument central de l'offre — le vendeur ne
 * touche a rien — et il se saisit plus vite dessine qu'ecrit.
 *
 * Les formes sont franchement geometriques. Un personnage realiste dessine a
 * la main en SVG rate presque toujours ; la stylisation se lit comme un choix
 * plutot que comme une maladresse.
 *
 * L'animation est purement decorative : le texte sous la scene dit deja tout.
 * Elle s'arrete donc entierement sous prefers-reduced-motion, et rien n'est
 * perdu pour qui la desactive.
 */
function DayScene({ lang, t }: { lang: LandingLang; t: (k: any) => string }) {
  const rtl = lang === "ar";

  return (
    <section className="py-20 md:py-28" style={{ background: "#f6f8fb" }}>
      <div className="mx-auto max-w-5xl px-5">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold md:text-4xl" style={{ color: NAVY }}>
              {t("sceneTitle")}
            </h2>
            <p className="mt-3 text-lg text-slate-500">{t("sceneSub")}</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
            <style>{`
              @keyframes td-steam {
                0%   { opacity: 0;   transform: translateY(0)    scaleX(1); }
                35%  { opacity: .55; }
                100% { opacity: 0;   transform: translateY(-16px) scaleX(1.7); }
              }
              @keyframes td-parcel {
                0%,   6%  { offset-distance: 0%;   opacity: 0; }
                10%       { opacity: 1; }
                88%       { opacity: 1; }
                94%, 100% { offset-distance: 100%; opacity: 0; }
              }
              @keyframes td-stage {
                0%, 100% { fill-opacity: .10; }
                50%      { fill-opacity: .32; }
              }
              @keyframes td-coin {
                0%,  55% { opacity: 0; transform: translate(0,0) scale(.6); }
                65%      { opacity: 1; }
                100%     { opacity: 0; transform: translate(0,-34px) scale(1); }
              }
              @keyframes td-pulse { 0%,100% { r: 4; opacity: .9 } 50% { r: 7; opacity: .35 } }

              .td-steam  { animation: td-steam 2.6s ease-out infinite; transform-origin: center bottom; }
              .td-parcel { offset-path: path('M 120 168 C 230 168, 250 96, 330 96 S 470 96, 560 96 S 690 120, 742 154');
                           animation: td-parcel 7s cubic-bezier(.5,0,.5,1) infinite; }
              .td-stage  { animation: td-stage 7s ease-in-out infinite; }
              .td-coin   { animation: td-coin 7s ease-in-out infinite; }
              .td-pulse  { animation: td-pulse 2.2s ease-in-out infinite; }

              /* Rien ne bouge pour qui a desactive les animations : les
                 elements sont poses dans leur etat final et restent lisibles. */
              @media (prefers-reduced-motion: reduce) {
                .td-steam, .td-parcel, .td-stage, .td-coin, .td-pulse { animation: none; }
                .td-parcel { offset-distance: 55%; opacity: 1; }
                .td-coin   { opacity: 1; }
              }
            `}</style>

            <svg viewBox="0 0 860 250" className="w-full" role="img"
              aria-label={`${t("sceneYou")} — ${t("sceneConfirm")}, ${t("scenePack")}, ${t("sceneShip")} — ${t("scenePaid")}`}>
              {/* Miroir en arabe : la scene doit se lire dans le sens du texte,
                  sinon le trajet part de la fin. Le texte est remis a l'endroit
                  individuellement, sinon il s'inverserait aussi. */}
              <g transform={rtl ? "translate(860,0) scale(-1,1)" : undefined}>

                {/* ── Le seller, attable ── */}
                <ellipse cx="118" cy="214" rx="86" ry="9" fill={NAVY} opacity=".06" />
                {/* Tete et buste, en aplats : deux formes suffisent a lire
                    « quelqu'un assis », et toute tentative de detail ferait
                    basculer du cote du dessin rate. */}
                <circle cx="96" cy="96" r="21" fill={NAVY} />
                <path d="M62 178c0-22 15-38 34-38s34 16 34 38z" fill={NAVY} />
                {/* Telephone, pose au bord du buste pour se lire comme tenu :
                    plus haut il flottait a cote du personnage. C'est le seul
                    geste que le seller fait de la journee. */}
                <rect x="122" y="143" width="15" height="24" rx="3" fill={GOLD} />

                {/* Table, tasse et vapeur */}
                <rect x="40" y="180" width="156" height="7" rx="3.5" fill={NAVY} opacity=".85" />
                <rect x="58" y="187" width="7" height="26" rx="3" fill={NAVY} opacity=".5" />
                <rect x="171" y="187" width="7" height="26" rx="3" fill={NAVY} opacity=".5" />
                <path d="M150 160h30v13a11 11 0 0 1-11 11h-8a11 11 0 0 1-11-11z" fill={NAVY} opacity=".75" />
                <path d="M180 163h7a6 6 0 0 1 0 12h-7z" fill="none" stroke={NAVY} strokeOpacity=".55" strokeWidth="3" />
                <g className="td-steam">
                  <path d="M160 152c0-6 5-6 5-12" stroke={NAVY} strokeOpacity=".45" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M170 152c0-6 5-6 5-12" stroke={NAVY} strokeOpacity=".45" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </g>

                {/* ── Trajet suivi par la commande ── */}
                <path d="M 120 168 C 230 168, 250 96, 330 96 S 470 96, 560 96 S 690 120, 742 154"
                  fill="none" stroke={NAVY} strokeOpacity=".14" strokeWidth="2.5" strokeDasharray="7 8" />

                {/* ── Les trois etapes, prises en charge par l'operateur ── */}
                {[
                  { x: 330, icon: "phone" },
                  { x: 450, icon: "box" },
                  { x: 570, icon: "truck" },
                ].map((st, i) => (
                  <g key={st.x}>
                    <circle className="td-stage" cx={st.x} cy="96" r="30" fill={GOLD}
                      style={{ animationDelay: `${i * 1.4}s` }} />
                    <circle cx={st.x} cy="96" r="30" fill="none" stroke={GOLD} strokeOpacity=".35" strokeWidth="1.5" />
                    <g transform={`translate(${st.x - 11},85)`} fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {st.icon === "phone" && (
                        <path d="M5 2h12v18H5z M9 17h4" />
                      )}
                      {st.icon === "box" && (
                        <path d="M2 7l9-4 9 4v9l-9 4-9-4z M2 7l9 4 9-4 M11 11v9" />
                      )}
                      {st.icon === "truck" && (
                        <path d="M1 5h12v9H1z M13 8h4l3 3v3h-7z M5 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M16 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                      )}
                    </g>
                  </g>
                ))}

                {/* ── Le colis qui parcourt la chaine ── */}
                <g className="td-parcel">
                  <rect x="-11" y="-11" width="22" height="22" rx="4" fill={GOLD} />
                  <path d="M-11 -2h22 M0 -11v22" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
                </g>

                {/* ── Arrivee : le compte du seller ── */}
                <rect x="706" y="150" width="72" height="52" rx="9" fill={NAVY} />
                <rect x="706" y="166" width="72" height="5" fill="#fff" fillOpacity=".22" />
                <circle className="td-pulse" cx="768" cy="160" r="4" fill={GOLD} />
                {[0, 1, 2].map(i => (
                  <g key={i} className="td-coin" style={{ animationDelay: `${i * 0.35}s` }}>
                    <circle cx={724 + i * 18} cy="142" r="8" fill={GOLD} />
                    <circle cx={724 + i * 18} cy="142" r="4" fill="#fff" fillOpacity=".35" />
                  </g>
                ))}
              </g>

              {/* Les libelles sont poses hors du groupe miroir : ils doivent
                  rester lisibles dans les deux sens de lecture. */}
              <g fontSize="13" fontWeight="700" textAnchor="middle" fill={NAVY}>
                <text x={rtl ? 742 : 118} y="240">{t("sceneYou")}</text>
                <text x={rtl ? 530 : 330} y="152" fillOpacity=".7">{t("sceneConfirm")}</text>
                <text x={rtl ? 410 : 450} y="152" fillOpacity=".7">{t("scenePack")}</text>
                <text x={rtl ? 290 : 570} y="152" fillOpacity=".7">{t("sceneShip")}</text>
                <text x={rtl ? 118 : 742} y="222" fill={GOLD}>{t("scenePaid")}</text>
              </g>
            </svg>

            <p className="mt-2 text-center text-sm font-semibold" style={{ color: GOLD }}>
              {t("sceneUs")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function TajerDropLanding({ lang = "ar" }: { lang?: LandingLang }) {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);

  /** Raccourci de lecture du dictionnaire. */
  const t = <K extends keyof typeof COPY>(k: K) => COPY[k][lang] as string;
  const locale = COPY.locale[lang];
  const rtl = lang === "ar";
  // La fleche des boutons doit pointer vers la suite de la lecture : a gauche
  // en arabe, a droite en francais. Une fleche figee designerait le retour.
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const arrowHover = rtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1";

  const navLinks = [
    { href: "#how", label: t("navHow") },
    { href: "#features", label: t("navFeat") },
    { href: "#pricing", label: t("navPrice") },
    { href: "#faq", label: t("navFaq") },
  ];

  const steps = STEPS[lang];
  const features = FEATURES[lang];
  const faqs = FAQ[lang];

  return (
    <div dir={COPY.dir[lang]} lang={lang} className="min-h-screen bg-white text-slate-800">
      {/* ── En-tete ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <TajerDropLogo />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <LangSwitch lang={lang} />
            <Link href="/auth" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              {t("login")}
            </Link>
            <Link
              href="/tajerdrop-inscription"
              className="rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              style={{ background: NAVY }}
            >
              {t("signup")}
            </Link>
          </div>

          <button onClick={() => setMenu(!menu)} className="rounded-lg p-2 md:hidden" aria-label={t("menuLabel")}>
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menu && (
          <div className="border-t bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="py-1.5 font-semibold text-slate-600">
                  {l.label}
                </a>
              ))}
              <div className="py-1.5"><LangSwitch lang={lang} /></div>
              <Link href="/auth" className="py-1.5 font-semibold text-slate-600">{t("login")}</Link>
              <Link
                href="/tajerdrop-inscription"
                className="mt-1 rounded-lg py-3 text-center font-bold text-white"
                style={{ background: NAVY }}
              >
                {t("signup")}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: NAVY }}>
        {/* Halo dore, pose en fond. Pointer-events desactives : purement
            decoratif, il ne doit pas intercepter les clics du bouton. */}
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute -bottom-56 -right-32 h-[460px] w-[460px] rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        />

        <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold"
                  style={{ background: `${GOLD}22`, color: GOLD }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("badge")}
                </span>

                <h1 className="mt-5 text-4xl font-extrabold leading-[1.25] text-white md:text-5xl lg:text-6xl">
                  {t("heroA")}
                  <br />
                  <span style={{ color: GOLD }}>{t("heroB")}</span> {t("heroC")}
                </h1>

                <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                  {t("heroText")}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/tajerdrop-inscription"
                    className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white shadow-lg transition-transform hover:scale-[1.03]"
                    style={{ background: GOLD }}
                  >
                    {t("ctaStart")}
                    <Arrow className={`h-4 w-4 transition-transform ${arrowHover}`} />
                  </Link>
                  <a
                    href="#how"
                    className="rounded-xl border border-white/25 px-6 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
                  >
                    {t("ctaHow")}
                  </a>
                </div>

                <div className="mt-10 grid max-w-lg grid-cols-3 gap-6">
                  {[
                    { n: null as any, t: t("statCities"), l: t("statCitiesL") },
                    { n: 24, s: "/7", t: null, l: t("statTrackL") },
                    { n: 0, s: t("statCapital"), t: null, l: t("statCapitalL") },
                  ].map((k) => (
                    <div key={k.l}>
                      <p className="text-2xl font-extrabold md:text-3xl" style={{ color: GOLD }}>
                        {/* Une entree peut porter un texte au lieu d'un nombre :
                            « toutes les villes » ne s'anime pas comme un compteur. */}
                        {k.t ? k.t : <Counter to={k.n!} suffix={k.s} locale={locale} />}
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/55">{k.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              {/* Apercu du tableau de bord, dessine en HTML plutot qu'en capture :
                  il reste net a toute densite d'ecran et suit la marque si elle
                  evolue, sans qu'on ait a reprendre une image. */}
              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                  <div className="rounded-xl bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">{t("netProfit")}</p>
                        <p className="text-3xl font-extrabold" style={{ color: NAVY }}>
                          <Counter to={12480} locale={locale} />{t("currency")}
                        </p>
                      </div>
                      <TajerDropMark size={40} />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                      {[
                        { l: t("confirmed"), v: "60%", c: "#1f8a5f" },
                        { l: t("delivered"), v: "42%", c: "#5b7092" },
                        { l: t("returned"), v: "8%", c: "#c0392f" },
                      ].map((b) => (
                        <div key={b.l} className="rounded-lg p-3 text-center" style={{ background: `${b.c}14` }}>
                          <p className="text-lg font-extrabold" style={{ color: b.c }}>{b.v}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{b.l}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        { n: t("demoP1"), p: `279${t("currency")}`, w: "82%" },
                        { n: t("demoP2"), p: `199${t("currency")}`, w: "64%" },
                        { n: t("demoP3"), p: `149${t("currency")}`, w: "41%" },
                      ].map((r) => (
                        <div key={r.n} className="flex items-center gap-3">
                          <span className="w-32 shrink-0 truncate text-xs font-semibold text-slate-600">{r.n}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full" style={{ width: r.w, background: GOLD }} />
                          </span>
                          <span className="shrink-0 text-xs font-bold" style={{ color: NAVY }}>{r.p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <DayScene lang={lang} t={t} />

      {/* ── Comment ca marche ───────────────────────────────────────────── */}
      <section id="how" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold md:text-4xl" style={{ color: NAVY }}>
                {t("howTitle")}
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                {t("howSub")}
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-xl">
                  <span
                    className="absolute -top-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white start-7"
                    style={{ background: NAVY }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="inline-flex rounded-xl p-3 transition-transform group-hover:scale-110"
                    style={{ background: `${GOLD}1a` }}
                  >
                    <s.icon className="h-6 w-6" style={{ color: GOLD }} />
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold" style={{ color: NAVY }}>{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-500">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28" style={{ background: "#f6f8fb" }}>
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold md:text-4xl" style={{ color: NAVY }}>
                {t("featTitle")}
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                {t("featSub")}
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                  <span className="inline-flex rounded-xl p-2.5" style={{ background: `${NAVY}0f` }}>
                    <f.icon className="h-5 w-5" style={{ color: NAVY }} />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold" style={{ color: NAVY }}>{f.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-slate-500">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <div className="text-center">
              <h2 className="text-3xl font-extrabold md:text-4xl" style={{ color: NAVY }}>
                {t("priceTitle")}
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                {t("priceSub")}
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-12 overflow-hidden rounded-2xl border-2" style={{ borderColor: GOLD }}>
              <div className="p-8 text-center" style={{ background: NAVY }}>
                <p className="text-sm font-bold" style={{ color: GOLD }}>{t("priceLabel")}</p>
                <p className="mt-2 text-5xl font-extrabold text-white">{t("priceFree")}</p>
                <p className="mt-2 text-white/60">{t("priceNote")}</p>
              </div>

              <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
                {[
                  { l: t("feeConfirm"), v: `10${t("currency")}`, d: t("perDelivered") },
                  { l: t("feePack"), v: `6${t("currency")}`, d: t("perDelivered") },
                  { l: t("feeShip"), v: `35${t("currency")}`, d: t("allMorocco") },
                ].map((c) => (
                  <div key={c.l} className="bg-white p-6 text-center">
                    <p className="text-sm font-semibold text-slate-500">{c.l}</p>
                    <p className="mt-1.5 text-2xl font-extrabold" style={{ color: NAVY }}>{c.v}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{c.d}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white px-8 pb-8 pt-2 text-center">
                <p className="text-sm text-slate-500">
                  {t("priceFoot")}
                </p>
                <Link
                  href="/tajerdrop-inscription"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: GOLD }}
                >
                  {t("priceCta")}
                  <Arrow className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28" style={{ background: "#f6f8fb" }}>
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold md:text-4xl" style={{ color: NAVY }}>
              {t("faqTitle")}
            </h2>
          </Reveal>

          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setFaq(faq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-start"
                  >
                    <span className="font-bold" style={{ color: NAVY }}>{f.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${faq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {/* Hauteur animee via grid-template-rows : contrairement a
                      max-height, la transition reste fluide quel que soit le
                      volume du texte, sans valeur arbitraire a deviner. */}
                  <div
                    className="grid transition-all duration-300"
                    style={{ gridTemplateRows: faq === i ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 leading-relaxed text-slate-500">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Appel final ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-24" style={{ background: NAVY }}>
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        />
        <Reveal>
          <div className="relative mx-auto max-w-3xl px-5 text-center">
            <TajerDropMark size={56} className="mx-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-white md:text-4xl">
              {t("finalTitle")}
            </h2>
            <p className="mt-4 text-lg text-white/70">
              {t("finalText")}
            </p>
            <Link
              href="/tajerdrop-inscription"
              className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-xl transition-transform hover:scale-[1.03]"
              style={{ background: GOLD }}
            >
              {t("signup")}
              <Arrow className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Pied ────────────────────────────────────────────────────────── */}
      <footer className="border-t bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
          <TajerDropLogo />
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-slate-500">
            <a href="#how" className="hover:text-slate-800">{t("navHow")}</a>
            <a href="#pricing" className="hover:text-slate-800">{t("navPrice")}</a>
            <a href="#faq" className="hover:text-slate-800">{t("navFaq")}</a>
            {/* Lien interne vers le guide : c'est ce qui permet au moteur de
                le decouvrir et lui transmet une part de l'autorite de
                l'accueil. Une page publiee sans lien entrant reste isolee. */}
            <a href={lang === "fr" ? "/fr/dropshipping-maroc" : "/dropshipping-maroc"} className="hover:text-slate-800">
              {lang === "fr" ? "Guide dropshipping" : "دليل الدروبشيبينغ"}
            </a>
            <Link href="/auth" className="hover:text-slate-800">{t("login")}</Link>
            <LangSwitch lang={lang} />
          </div>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} TajerDrop</p>
        </div>
      </footer>
    </div>
  );
}
