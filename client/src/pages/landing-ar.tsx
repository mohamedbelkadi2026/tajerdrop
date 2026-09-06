import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, BarChart3, Boxes, CheckCircle2, ChevronDown, Headphones,
  Menu, PackageCheck, ShieldCheck, Truck, Wallet, X, Zap,
} from "lucide-react";
import { TajerDropLogo, TajerDropMark } from "@/components/tajerdrop-logo";

// Fonds pleins de la page : un bleu profond porte mieux le texte blanc que le
// bleu vif de la marque, reserve aux boutons.
const NAVY = "#0F172A";
const GOLD = "#FF6B35";

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
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
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

  return <span ref={ref}>{n.toLocaleString("ar-MA")}{suffix}</span>;
}

const STEPS = [
  {
    icon: Boxes,
    title: "ختار المنتج",
    text: "تصفّح الكاطالوگ ديالنا، شوف الثمن ديال الجملة والربح المتوقع، وطلب المنتج اللي عجبك.",
  },
  {
    icon: Zap,
    title: "بيع بلا ستوك",
    text: "ربط الحانوت ديالك مع يوكان، شوپيفاي، ووكومرس ولا گوگل شيت. الكوموندات كايوصلو ليك أوتوماتيك.",
  },
  {
    icon: PackageCheck,
    title: "حنا كانكملو كولشي",
    text: "التأكيد فالتيليفون، التوضيب، والتوصيل — كولشي علينا. نتا غير ركّز على الإشهار.",
  },
];

const FEATURES = [
  { icon: Headphones, title: "سونطر ديال التأكيد", text: "فريق مغربي كايعيّط على الكليان بالدارجة ويأكّد الكوموندات ديالك." },
  { icon: Truck, title: "توصيل فكامل المغرب", text: "شركاء توصيل مغطّين 60+ مدينة، مع تتبّع مباشر لكل كولي." },
  { icon: Wallet, title: "الخلاص عند التوصيل", text: "ما كتخلّصش والو حتى توصل الكوموندا. لا سطوك، لا مخاطرة." },
  { icon: BarChart3, title: "أرقام واضحة", text: "الربح الصافي ديال كل منتج، نسبة التأكيد ونسبة التوصيل — بلا حسابات." },
  { icon: ShieldCheck, title: "بلا رسوم مخبّية", text: "ثمن الجملة، التوصيل، التوضيب والتأكيد بايْنين قبل ما تبدا." },
  { icon: Boxes, title: "كاطالوگ كايتجدّد", text: "منتجات مختارة على حساب الطلب فالسوق المغربي، مع صور جاهزة للإشهار." },
];

const FAQ = [
  {
    q: "واش خاصني ستوك ولا رأس مال؟",
    a: "لا. المنتجات عندنا فالمستودع. نتا كتبيع، وحنا كانوضّبو وكانوصّلو. ما كتخلّصش المنتج حتى توصل الكوموندا للكليان.",
  },
  {
    q: "شحال كانخلّص؟",
    a: "كتخلّص غير على الكوموندات اللي توصلات: ثمن المنتج، التوصيل، التوضيب والتأكيد. الكوموندا اللي ما توصلاتش ما كتكلّفك والو.",
  },
  {
    q: "كيفاش كانوصل ليّا الفلوس؟",
    a: "كل كوموندا توصلات كايتحسب الربح ديالها فالفاكتورة ديالك. الخلاص كايتم بشكل دوري على حساب الفاكتورات.",
  },
  {
    q: "واش خاصني حانوت أونلاين؟",
    a: "ماشي ضروري. تقدر تدخل الكوموندات بيدك ولا تطلعهم من فيشي إكسيل. وإلا عندك حانوت، ربطو ف دقيقة.",
  },
  {
    q: "شحال كايخذ باش نبدا؟",
    a: "التسجيل مجاني. من بعد ما يتفعّل الحساب ديالك، تقدر تطلب المنتجات وتبدا تبيع فنفس النهار.",
  },
];

export default function LandingAr() {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-white text-slate-800">
      {/* ── En-tete ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <TajerDropLogo />

          <nav className="hidden items-center gap-8 md:flex">
            {[
              { href: "#how", label: "كيفاش كايخدم" },
              { href: "#features", label: "الخدمات" },
              { href: "#pricing", label: "الأثمنة" },
              { href: "#faq", label: "أسئلة" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/auth" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              دخول
            </Link>
            <Link
              href="/tajerdrop-inscription"
              className="rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              style={{ background: NAVY }}
            >
              سجّل مجاناً
            </Link>
          </div>

          <button onClick={() => setMenu(!menu)} className="rounded-lg p-2 md:hidden" aria-label="القائمة">
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menu && (
          <div className="border-t bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#how" onClick={() => setMenu(false)} className="py-1.5 font-semibold text-slate-600">كيفاش كايخدم</a>
              <a href="#features" onClick={() => setMenu(false)} className="py-1.5 font-semibold text-slate-600">الخدمات</a>
              <a href="#pricing" onClick={() => setMenu(false)} className="py-1.5 font-semibold text-slate-600">الأثمنة</a>
              <a href="#faq" onClick={() => setMenu(false)} className="py-1.5 font-semibold text-slate-600">أسئلة</a>
              <Link href="/auth" className="py-1.5 font-semibold text-slate-600">دخول</Link>
              <Link
                href="/tajerdrop-inscription"
                className="mt-1 rounded-lg py-3 text-center font-bold text-white"
                style={{ background: NAVY }}
              >
                سجّل مجاناً
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
                  منصة الدروبشيبينگ رقم 1 فالمغرب
                </span>

                <h1 className="mt-5 text-4xl font-extrabold leading-[1.25] text-white md:text-5xl lg:text-6xl">
                  بيع أونلاين
                  <br />
                  <span style={{ color: GOLD }}>بلا ستوك</span> وبلا مخاطرة
                </h1>

                <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                  ختار المنتج من الكاطالوگ ديالنا، سوّق ليه، وحنا كانتكلّفو بالتأكيد
                  فالتيليفون، التوضيب والتوصيل فكامل المغرب. نتا غير كتبيع.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/tajerdrop-inscription"
                    className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white shadow-lg transition-transform hover:scale-[1.03]"
                    style={{ background: GOLD }}
                  >
                    بدا مجاناً دابا
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </Link>
                  <a
                    href="#how"
                    className="rounded-xl border border-white/25 px-6 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
                  >
                    كيفاش كايخدم؟
                  </a>
                </div>

                <div className="mt-10 grid max-w-lg grid-cols-3 gap-6">
                  {[
                    { n: 60, s: "+", l: "مدينة مغطّية" },
                    { n: 24, s: "/7", l: "تتبّع الكوموندات" },
                    { n: 0, s: " درهم", l: "رأس المال البدائي" },
                  ].map((k) => (
                    <div key={k.l}>
                      <p className="text-2xl font-extrabold md:text-3xl" style={{ color: GOLD }}>
                        <Counter to={k.n} suffix={k.s} />
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
                        <p className="text-xs font-semibold text-slate-400">الربح الصافي</p>
                        <p className="text-3xl font-extrabold" style={{ color: NAVY }}>
                          <Counter to={12480} /> د.م
                        </p>
                      </div>
                      <TajerDropMark size={40} />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                      {[
                        { l: "مؤكّدة", v: "60%", c: "#1f8a5f" },
                        { l: "موصّلة", v: "42%", c: "#5b7092" },
                        { l: "مرجّعة", v: "8%", c: "#c0392f" },
                      ].map((b) => (
                        <div key={b.l} className="rounded-lg p-3 text-center" style={{ background: `${b.c}14` }}>
                          <p className="text-lg font-extrabold" style={{ color: b.c }}>{b.v}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{b.l}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        { n: "ساعة رجالية", p: "279 د.م", w: "82%" },
                        { n: "طقم مثبّتات السيارات", p: "199 د.م", w: "64%" },
                        { n: "جهاز تدليك", p: "149 د.م", w: "41%" },
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

      {/* ── Comment ca marche ───────────────────────────────────────────── */}
      <section id="how" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold md:text-4xl" style={{ color: NAVY }}>
                ثلاث خطوات وصافي
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                ما خاصك لا ستوك، لا مستودع، لا فريق. غير الإشهار والبيع.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="group relative h-full rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-xl">
                  <span
                    className="absolute -top-4 left-7 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white"
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
                كولشي فبلاصة وحدة
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                من المنتج حتى الفلوس فجيبك — بلا ما تخرج من المنصة.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
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
                كتخلّص غير على اللي توصل
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                ما كاينش اشتراك شهري، ما كاينش رسوم مخبّية.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-12 overflow-hidden rounded-2xl border-2" style={{ borderColor: GOLD }}>
              <div className="p-8 text-center" style={{ background: NAVY }}>
                <p className="text-sm font-bold" style={{ color: GOLD }}>التسجيل والاستعمال</p>
                <p className="mt-2 text-5xl font-extrabold text-white">مجاناً</p>
                <p className="mt-2 text-white/60">خلّص غير التكاليف ديال الكوموندات الموصّلة</p>
              </div>

              <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
                {[
                  { l: "التأكيد فالتيليفون", v: "10 د.م", d: "لكل كوموندا موصّلة" },
                  { l: "التوضيب", v: "6 د.م", d: "لكل كوموندا موصّلة" },
                  { l: "التوصيل", v: "35 د.م", d: "فكامل المغرب" },
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
                  الكوموندا اللي ما توصلاتش ما كتخلّص عليها والو — لا تأكيد، لا توصيل، لا توضيب.
                </p>
                <Link
                  href="/tajerdrop-inscription"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: GOLD }}
                >
                  سجّل دابا
                  <ArrowLeft className="h-4 w-4" />
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
              أسئلة كايطرحوها بزاف
            </h2>
          </Reveal>

          <div className="mt-12 space-y-3">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setFaq(faq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-right"
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
              واجد تبدا تبيع؟
            </h2>
            <p className="mt-4 text-lg text-white/70">
              التسجيل مجاني وكايخذ دقيقة. ما خاصك لا ستوك لا رأس مال.
            </p>
            <Link
              href="/tajerdrop-inscription"
              className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-xl transition-transform hover:scale-[1.03]"
              style={{ background: GOLD }}
            >
              سجّل مجاناً
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Pied ────────────────────────────────────────────────────────── */}
      <footer className="border-t bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
          <TajerDropLogo />
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-slate-500">
            <a href="#how" className="hover:text-slate-800">كيفاش كايخدم</a>
            <a href="#pricing" className="hover:text-slate-800">الأثمنة</a>
            <a href="#faq" className="hover:text-slate-800">أسئلة</a>
            <Link href="/auth" className="hover:text-slate-800">دخول</Link>
          </div>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} TajerDrop</p>
        </div>
      </footer>
    </div>
  );
}
