import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { TajerDropLogo, TajerDropMark } from "@/components/tajerdrop-logo";

const NAVY = "#0F172A";
const GOLD = "#FF6B35";

export type GuideLang = "ar" | "fr";

/**
 * Guide « dropshipping au Maroc ».
 *
 * Une page d'accueil se positionne mal : elle vend, elle n'explique pas, et
 * les recherches qui amenent ces vendeurs sont des questions — « kifach nbda
 * dropshipping », « bech7al kayji », « wach khassni stock ». Ce sont ces
 * questions qui manquaient une page pour y repondre.
 *
 * Elle ne vise pas « tajer », mot arabe trop generique et deja tenu par un
 * concurrent installe. Elle vise l'intention : quelqu'un qui tape « vendre
 * sans stock au Maroc » veut commencer, la ou quelqu'un qui tape « tajer »
 * peut chercher n'importe quoi.
 *
 * L'arabe est en darija, comme le reste de la plateforme : c'est la langue
 * dans laquelle ces recherches sont formulees.
 */

const COPY = {
  eyebrow:  { ar: "دليل كامل",  fr: "Guide complet" },
  title: {
    ar: "الدروبشيبينغ فالمغرب: كيفاش تبدا بلا ستوك",
    fr: "Le dropshipping au Maroc : comment démarrer sans stock",
  },
  intro: {
    ar: "بزاف ديال الناس بغاو يبيعو أونلاين فالمغرب، ولكن كايوقفو ف نفس السؤال: منين نجيب المنتجات، وشكون غادي يوصلهم؟ هاد الدليل كايجاوب على هاد السؤال بالتفصيل، بلا كلام زايد.",
    fr: "Beaucoup de Marocains veulent vendre en ligne mais butent sur la même question : où trouver les produits, et qui va les livrer ? Ce guide y répond en détail, sans détour.",
  },
  backHome: { ar: "رجع للصفحة الرئيسية", fr: "Retour à l'accueil" },
  ctaTitle: { ar: "واجد تبدا؟", fr: "Prêt à commencer ?" },
  ctaText: {
    ar: "التسجيل مجاني وكياخد دقيقة. ما خاصك لا ستوك لا رأس مال.",
    fr: "L'inscription est gratuite et prend une minute. Ni stock, ni capital.",
  },
  ctaButton: { ar: "سجّل مجاناً", fr: "S'inscrire gratuitement" },
  otherLang: { ar: "Lire en français", fr: "اقرا بالعربية" },
};

const SECTIONS = {
  ar: [
    {
      h: "شنو هو الدروبشيبينغ؟",
      p: [
        "الدروبشيبينغ هو أنك تبيع منتج بلا ما تشريه من قبل. كتسوّق ليه، وملي كايجي شي كليان، الشريك ديالك هو اللي كايغلّف وكايوصل. نتا ما كتشوفش المنتج بعينك.",
        "الفرق مع التجارة العادية: ما كتحتاجش تشري ستوك من قبل. ما كتخاطرش بفلوسك على منتج ممكن ما يتباعش.",
      ],
    },
    {
      h: "علاش الدفع عند التسليم (COD) مهم فالمغرب؟",
      p: [
        "فالمغرب، أغلبية الناس ما كايخلّصوش أونلاين. كايبغيو يشوفو المنتج قبل ما يعطيو الفلوس. على هاد السبب الدفع عند التسليم هو الطريقة الأساسية.",
        "ولكن هادشي كايجيب مشكل آخر: الطلبية خاصها تتأكّد بالتليفون قبل ما تمشي للتوصيل. بلا تأكيد، نسبة كبيرة ديال الطلبيات كايرجعو — وكل رجوع كايكلّف فلوس.",
      ],
    },
    {
      h: "شحال خاصك ديال رأس المال باش تبدا؟",
      p: [
        "فالتجارة العادية، خاصك تشري ستوك. مثلاً 50 قطعة × 130 درهم = 6500 درهم، قبل ما تبيع حتى وحدة.",
        "فالدروبشيبينغ، ما كتخلّص المنتج حتى توصل الطلبية للكليان. راس المال الوحيد اللي خاصك هو ديال الإشهار.",
      ],
    },
    {
      h: "شنو هي الأرقام اللي خاصك تعرف؟",
      p: [
        "ثلاثة أرقام كايقرّرو واش غادي تربح: نسبة التأكيد، نسبة التوصيل، والربح الصافي لكل طلبية.",
        "نسبة التأكيد هي شحال من لِيد كايتأكّد فالتليفون. نسبة التوصيل هي شحال من طلبية مؤكّدة كاتوصل فعلاً. ضرب الجوج فبعضهم وعندك نسبة النجاح الحقيقية.",
        "مثال: 100 لِيد، 60% تأكيد، 70% توصيل = 42 طلبية موصّلة. إيلا كان الربح الصافي 100 درهم للطلبية، هادي 4200 درهم. إيلا صرفتي 2000 درهم فالإشهار، ربحتي 2200.",
      ],
    },
    {
      h: "كيفاش تختار المنتج؟",
      p: [
        "ماشي المنتج الرخيص هو الأحسن. المنتج اللي كايربح هو اللي عندو هامش كافي باش يتحمّل تكاليف التأكيد والتوصيل والإشهار، وباقي ليك ربح.",
        "حسبها قبل: ثمن البيع − ثمن الجملة − التوصيل − التغليف − التأكيد. إيلا خرج ليك أقل من 60-70 درهم، غادي تصعب عليك تربح بعد الإشهار.",
      ],
    },
    {
      h: "شنو كايوقع ملي الطلبية كاترجع؟",
      p: [
        "الرجوع جزء من الخدمة، ماشي استثناء. الطلبية اللي ما وصلاتش ما خاصكش تخلّص عليها: لا تأكيد، لا توصيل، لا تغليف، لا ثمن المنتج.",
        "هادي نقطة خاصك تسوّل عليها أي منصة قبل ما تبدا معاها.",
      ],
    },
  ],
  fr: [
    {
      h: "Qu'est-ce que le dropshipping ?",
      p: [
        "Le dropshipping consiste à vendre un produit sans l'avoir acheté au préalable. Vous en faites la publicité, et lorsqu'un client commande, votre partenaire emballe et livre. Vous ne manipulez jamais la marchandise.",
        "La différence avec le commerce classique : aucun stock à acheter d'avance, donc aucun capital immobilisé sur un produit qui pourrait ne pas se vendre.",
      ],
    },
    {
      h: "Pourquoi le paiement à la livraison compte au Maroc",
      p: [
        "Au Maroc, la majorité des acheteurs ne paient pas en ligne : ils veulent voir le produit avant de donner l'argent. Le paiement à la livraison reste donc le mode dominant.",
        "Cela crée une contrainte : la commande doit être confirmée par téléphone avant d'être expédiée. Sans cette confirmation, une part importante des commandes revient — et chaque retour coûte.",
      ],
    },
    {
      h: "Quel capital faut-il pour commencer ?",
      p: [
        "En commerce classique, il faut acheter le stock. Cinquante pièces à 130 DH représentent 6 500 DH engagés avant la première vente.",
        "En dropshipping, le produit n'est payé qu'une fois la commande livrée au client. Le seul budget nécessaire est celui de la publicité.",
      ],
    },
    {
      h: "Les chiffres qui décident de votre rentabilité",
      p: [
        "Trois indicateurs déterminent si vous gagnez de l'argent : le taux de confirmation, le taux de livraison, et le bénéfice net par commande.",
        "Le taux de confirmation mesure la part des leads confirmés au téléphone. Le taux de livraison mesure la part des commandes confirmées effectivement remises. Leur produit donne le taux de réussite réel.",
        "Exemple : 100 leads, 60 % de confirmation, 70 % de livraison donnent 42 commandes livrées. À 100 DH de bénéfice net l'unité, cela fait 4 200 DH. Avec 2 000 DH de publicité, le bénéfice réel est de 2 200 DH.",
      ],
    },
    {
      h: "Comment choisir un produit",
      p: [
        "Le produit le moins cher n'est pas le meilleur. Un produit rentable est un produit dont la marge absorbe la confirmation, la livraison, l'emballage et la publicité, et laisse encore un bénéfice.",
        "Faites le calcul avant : prix de vente − prix de gros − livraison − emballage − confirmation. En dessous de 60 à 70 DH, la publicité consommera tout.",
      ],
    },
    {
      h: "Que se passe-t-il en cas de retour ?",
      p: [
        "Les retours font partie du métier, ce ne sont pas des exceptions. Une commande non livrée ne doit rien vous coûter : ni confirmation, ni livraison, ni emballage, ni prix du produit.",
        "C'est la première question à poser à toute plateforme avant de travailler avec elle.",
      ],
    },
  ],
};

export default function GuideDropshipping({ lang = "ar" }: { lang?: GuideLang }) {
  const t = <K extends keyof typeof COPY>(k: K) => COPY[k][lang] as string;
  const rtl = lang === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const sections = SECTIONS[lang];
  const otherHref = rtl ? "/fr/dropshipping-maroc" : "/dropshipping-maroc";

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={lang} className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href={rtl ? "/" : "/fr"}><TajerDropLogo /></Link>
          <a href={otherHref} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            {t("otherLang")}
          </a>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          {t("eyebrow")}
        </p>
        {/* Un seul h1 par page : c'est le signal le plus fort envoye au moteur
            sur le sujet traite, et le diluer sur plusieurs titres l'affaiblit. */}
        <h1 className="mt-2 text-3xl font-extrabold leading-snug md:text-4xl" style={{ color: NAVY }}>
          {t("title")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">{t("intro")}</p>

        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-bold md:text-2xl" style={{ color: NAVY }}>{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-3 leading-relaxed text-slate-600">{para}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl p-8 text-center" style={{ background: NAVY }}>
          <TajerDropMark size={44} className="mx-auto" onDark />
          <h2 className="mt-4 text-2xl font-extrabold text-white">{t("ctaTitle")}</h2>
          <p className="mt-2 text-white/70">{t("ctaText")}</p>
          <Link
            href="/tajerdrop-inscription"
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-bold text-white transition-transform hover:scale-[1.03]"
            style={{ background: GOLD }}
          >
            {t("ctaButton")}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>

        <Link
          href={rtl ? "/" : "/fr"}
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <Arrow className={`h-4 w-4 ${rtl ? "" : "rotate-180"}`} />
          {t("backHome")}
        </Link>
      </article>

      <footer className="border-t bg-white py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 text-sm text-slate-400">
          <TajerDropLogo size={26} />
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            © {new Date().getFullYear()} TajerDrop
          </span>
        </div>
      </footer>
    </div>
  );
}
