import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Landmark, Lock, Check } from "lucide-react";
import { BANKS, bankById, type Bank } from "@/lib/banks";

const GOLD = "#FF6B35";
const NAVY = "#0F172A";

/**
 * Vignette d'etablissement.
 *
 * Un logo officiel depose dans client/public/banks/<id>.png est utilise s'il
 * existe ; sinon un monogramme sur la couleur de la marque prend sa place. Les
 * logos sont des marques deposees de tiers et ne sont pas embarques dans le
 * depot : le monogramme suffit a reconnaitre un etablissement dans une liste,
 * et l'ajout d'un logo plus tard ne demandera aucune modification de code.
 */
function BankBadge({ bank, size = 36 }: { bank: Bank; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={`/banks/${bank.id}.png`}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-lg border bg-white object-contain p-1"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
      style={{ width: size, height: size, background: bank.color }}
    >
      {bank.short}
    </span>
  );
}

/** Regroupe le RIB par blocs de 4 : 24 chiffres d'affilee sont illisibles. */
const groupRib = (v: string) => (v || "").replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();

function BankSection() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery<any>({ queryKey: ["/api/seller/bank"] });
  const [bank, setBank] = useState<string>("");
  const [holder, setHolder] = useState("");
  const [rib, setRib] = useState("");

  // Le formulaire est amorce une fois la reponse arrivee. Sans cela, les champs
  // resteraient vides alors que des coordonnees existent, et le seller les
  // resaisirait en croyant qu'elles n'ont jamais ete enregistrees.
  useEffect(() => {
    if (!data) return;
    setBank(data.bankName || "");
    setHolder(data.bankHolder || "");
    setRib(groupRib(data.bankRib || ""));
  }, [data]);

  const digits = rib.replace(/\D/g, "");
  const ribValid = digits.length === 0 || digits.length === 24;

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PUT", "/api/seller/bank", {
        bankName: bank || null,
        bankHolder: holder || null,
        bankRib: digits || null,
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message || "Enregistrement impossible");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/seller/bank"] });
      toast({ title: "Coordonnées enregistrées" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4" style={{ color: GOLD }} />
          Coordonnées bancaires
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          C'est sur ce compte que vos bénéfices seront versés.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Établissement</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {BANKS.map(b => {
              const active = bank === b.name;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBank(b.name)}
                  className="flex items-center gap-2.5 rounded-lg border p-2.5 text-start transition-colors hover:bg-slate-50"
                  style={active ? { borderColor: GOLD, background: `${GOLD}0d` } : undefined}
                >
                  <BankBadge bank={b} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: NAVY }}>
                    {b.name}
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" style={{ color: GOLD }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="holder">Titulaire du compte</Label>
          <Input id="holder" value={holder} onChange={e => setHolder(e.target.value)}
            placeholder="Nom exact figurant sur le compte" />
          {/* Le nom doit correspondre au compte, sinon le virement est rejete
              par la banque receptrice et revient plusieurs jours plus tard. */}
          <p className="mt-1 text-xs text-muted-foreground">
            Il doit correspondre exactement au compte, sinon le virement sera rejeté.
          </p>
        </div>

        <div>
          <Label htmlFor="rib">RIB</Label>
          <Input
            id="rib"
            value={rib}
            inputMode="numeric"
            onChange={e => setRib(groupRib(e.target.value))}
            placeholder="0000 0000 0000 0000 0000 0000"
            className={!ribValid ? "border-red-400" : undefined}
          />
          <p className={`mt-1 text-xs ${ribValid ? "text-muted-foreground" : "text-red-600"}`}>
            {digits.length === 0
              ? "24 chiffres."
              : ribValid
                ? "24 chiffres — format correct."
                : `${digits.length} chiffres sur 24.`}
          </p>
        </div>

        <Button
          onClick={() => save.mutate()}
          disabled={!ribValid || save.isPending}
          style={{ background: GOLD }}
          className="w-full text-white"
        >
          <Save className="me-2 h-4 w-4" />
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && next !== confirm;

  const change = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PUT", "/api/user/password", {
        currentPassword: current,
        newPassword: next,
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message || "Changement impossible");
      return body;
    },
    onSuccess: () => {
      setCurrent(""); setNext(""); setConfirm("");
      toast({ title: "Mot de passe modifié" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" style={{ color: GOLD }} />
          Mot de passe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="cur">Mot de passe actuel</Label>
          <Input id="cur" type="password" value={current} onChange={e => setCurrent(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new">Nouveau mot de passe</Label>
          <Input id="new" type="password" value={next} onChange={e => setNext(e.target.value)} />
          {/* Regle annoncee avant la saisie plutot qu'apres le refus du
              serveur : la decouvrir en erreur oblige a tout retaper. */}
          <p className="mt-1 text-xs text-muted-foreground">
            8 caractères minimum, dont une majuscule et un chiffre.
          </p>
        </div>
        <div>
          <Label htmlFor="cfm">Confirmer</Label>
          <Input id="cfm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className={mismatch ? "border-red-400" : undefined} />
          {mismatch && <p className="mt-1 text-xs text-red-600">Les deux mots de passe diffèrent.</p>}
        </div>
        <Button
          onClick={() => change.mutate()}
          disabled={!current || !next || next !== confirm || change.isPending}
          style={{ background: NAVY }}
          className="w-full text-white"
        >
          {change.isPending ? "Modification…" : "Modifier le mot de passe"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TajerDropProfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      username: (user as any)?.username || "",
      email:    (user as any)?.email    || "",
      phone:    (user as any)?.phone    || "",
    },
  });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/user/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profil mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mon profil</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Vos informations de compte Seller</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" style={{ color: GOLD }} />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
            <div>
              <Label htmlFor="username">Nom</Label>
              <Input id="username" {...register("username")} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <Button type="submit" disabled={isSubmitting || save.isPending}
              style={{ background: GOLD }} className="w-full text-white">
              <Save className="me-2 h-4 w-4" /> Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <BankSection />
      <PasswordSection />
    </div>
  );
}
