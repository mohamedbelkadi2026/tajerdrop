import { useState } from "react";
import { Check, Copy, ShoppingBag } from "lucide-react";
import { PageHead, useJson, Loading, ErrorState, GOLD, NAVY } from "../shared";

type WebhookInfo = { webhookUrl: string; webhookKey: string };

/**
 * Page WooCommerce de l'espace seller.
 *
 * WooCommerce ne passe pas par OAuth : la boutique pousse ses commandes vers
 * une adresse propre au seller. Toute la page consiste donc à donner cette
 * adresse et à expliquer où la coller côté WordPress.
 */
export default function WooCommerceIntegration() {
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isError, refetch } = useJson<WebhookInfo>(
    "/api/integrations/wordpress/webhook-url",
  );

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState retry={() => refetch()} />;

  function copy() {
    if (!data?.webhookUrl) return;
    navigator.clipboard.writeText(data.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <PageHead
        title="WooCommerce"
        text="Votre boutique WordPress envoie ses commandes ici, sans plugin payant."
      />

      <div className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-3" style={{ background: "#fff4dc" }}>
            <ShoppingBag className="h-6 w-6" style={{ color: GOLD }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Votre adresse de réception</h2>
            <p className="text-sm text-slate-500">Propre à votre compte. Ne la partagez pas.</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-700 sm:text-sm">
            {data?.webhookUrl}
          </code>
          <button
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-white"
            style={{ background: NAVY }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Où la coller</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>1</span>
            <span>Dans WordPress, ouvrez <strong>WooCommerce → Réglages → Avancé → Webhooks</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>2</span>
            <span>Cliquez sur <strong>Ajouter un webhook</strong> et passez son statut à <strong>Actif</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>3</span>
            <span>Choisissez le sujet <strong>Commande créée</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>4</span>
            <span>Collez l'adresse ci-dessus dans <strong>URL de livraison</strong>, puis enregistrez.</span>
          </li>
        </ol>
        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          Passez une commande test sur votre boutique : elle doit apparaître dans
          « Mes commandes » en quelques secondes.
        </p>
      </div>
    </div>
  );
}
