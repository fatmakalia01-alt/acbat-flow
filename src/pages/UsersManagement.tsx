import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Trash2, Search, Loader2, Users, Mail, Phone,
  ShieldCheck, ShieldAlert, Crown, Briefcase, ShoppingBag,
  Truck, Wrench, HeadphonesIcon, Calculator, Store, Package,
  UserCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Role Definitions ─────────────────────────────────────────────────────────
interface RoleDef {
  label: string;
  shortLabel: string;
  icon: React.FC<any>;
  color: string;      // badge bg+text
  iconBg: string;     // avatar bg
  permissions: string[];
}

const ROLE_DEFS: Record<string, RoleDef> = {
  manager: {
    label: "Manager",
    shortLabel: "Manager",
    icon: Crown,
    color: "bg-red-100 text-red-800 border-red-200",
    iconBg: "bg-red-500",
    permissions: [
      "Accès complet à tous les modules",
      "Validation finale des commandes",
      "Gestion des utilisateurs",
      "Délégation de pouvoirs",
      "Tableau de bord analytique",
    ],
  },
  directeur_exploitation: {
    label: "Directeur Exploitation",
    shortLabel: "Dir. Exploitation",
    icon: ShieldCheck,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    iconBg: "bg-purple-600",
    permissions: [
      "Supervision de toutes les opérations",
      "Validation en absence du Manager",
      "Rapports d'exploitation",
      "Gestion des alertes et retards",
      "Accès analytics complet",
    ],
  },
  responsable_commercial: {
    label: "Responsable Commercial",
    shortLabel: "Resp. Commercial",
    icon: Briefcase,
    color: "bg-amber-100 text-amber-800 border-amber-200",
    iconBg: "bg-amber-500",
    permissions: [
      "Gestion des clients et prospects",
      "Création et validation des devis",
      "Suivi du pipeline commercial",
      "Validation commerciale des commandes",
      "Accès aux rapports ventes",
    ],
  },
  commercial: {
    label: "Commercial",
    shortLabel: "Commercial",
    icon: ShoppingBag,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    iconBg: "bg-yellow-500",
    permissions: [
      "Création de devis et commandes",
      "Gestion de son portefeuille clients",
      "Suivi de ses commandes",
      "Accès au portail client",
    ],
  },
  responsable_achat: {
    label: "Responsable Achat",
    shortLabel: "Resp. Achat",
    icon: Package,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    iconBg: "bg-blue-600",
    permissions: [
      "Gestion des fournisseurs",
      "Création de bons de commande fournisseur",
      "Suivi des réceptions de marchandises",
      "Gestion du stock et des mouvements",
      "Import / export produits",
    ],
  },
  responsable_logistique: {
    label: "Responsable Logistique",
    shortLabel: "Resp. Logistique",
    icon: Truck,
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    iconBg: "bg-cyan-600",
    permissions: [
      "Planification des livraisons",
      "Suivi des livraisons en temps réel",
      "Gestion des transporteurs",
      "Confirmation de réception chantier",
    ],
  },
  responsable_technique: {
    label: "Responsable Technique",
    shortLabel: "Resp. Technique",
    icon: Wrench,
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    iconBg: "bg-indigo-600",
    permissions: [
      "Gestion des équipes techniques",
      "Planification des interventions",
      "Suivi de la préparation technique",
      "Validation des procès-verbaux",
      "Gestion des chantiers",
    ],
  },
  technicien_montage: {
    label: "Technicien Montage",
    shortLabel: "Technicien",
    icon: ShieldAlert,
    color: "bg-violet-100 text-violet-800 border-violet-200",
    iconBg: "bg-violet-600",
    permissions: [
      "Consultation de ses missions",
      "Mise à jour de l'avancement technique",
      "Saisie des notes d'intervention",
      "Upload de photos avant/après",
    ],
  },
  responsable_sav: {
    label: "Responsable SAV",
    shortLabel: "Resp. SAV",
    icon: HeadphonesIcon,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    iconBg: "bg-orange-500",
    permissions: [
      "Gestion de tous les tickets SAV",
      "Affectation des techniciens",
      "Suivi des délais de résolution",
      "Communication client",
      "Rapports SAV mensuel",
    ],
  },
  responsable_comptabilite: {
    label: "Responsable Comptabilité",
    shortLabel: "Comptabilité",
    icon: Calculator,
    color: "bg-green-100 text-green-800 border-green-200",
    iconBg: "bg-green-600",
    permissions: [
      "Gestion des factures et avoirs",
      "Suivi des paiements clients",
      "Rapports financiers",
      "Validation des bons de commande",
      "Export comptable",
    ],
  },
  responsable_showroom: {
    label: "Responsable Showroom",
    shortLabel: "Resp. Showroom",
    icon: Store,
    color: "bg-pink-100 text-pink-800 border-pink-200",
    iconBg: "bg-pink-500",
    permissions: [
      "Gestion du showroom",
      "Création de devis sur place",
      "Présentation du catalogue produits",
      "Gestion des visites clients",
    ],
  },
  livraison: {
    label: "Livreur",
    shortLabel: "Livreur",
    icon: Truck,
    color: "bg-teal-100 text-teal-800 border-teal-200",
    iconBg: "bg-teal-500",
    permissions: [
      "Consultation de ses tournées",
      "Mise à jour du statut de livraison",
      "Upload de photo bon de livraison",
      "Géolocalisation des livraisons",
    ],
  },
  client: {
    label: "Client",
    shortLabel: "Client",
    icon: UserCircle,
    color: "bg-slate-100 text-slate-700 border-slate-200",
    iconBg: "bg-slate-500",
    permissions: [
      "Portail client — Suivi de sa commande",
      "Téléchargement devis et factures",
      "Signalement de problème (SAV)",
      "Validation de réception",
    ],
  },
};

const ROLES = Object.keys(ROLE_DEFS) as (keyof typeof ROLE_DEFS)[];

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserWithRoles {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
}

// ─── User Card ────────────────────────────────────────────────────────────────
const UserCard = ({
  user,
  onRemoveRole,
  onAddRole,
  isManager,
}: {
  user: UserWithRoles;
  onRemoveRole: (userId: string, role: string) => void;
  onAddRole: (userId: string, role: string) => void;
  isManager: boolean;
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

  const primaryRole = user.roles[0];
  const def = ROLE_DEFS[primaryRole] || ROLE_DEFS.client;
  const Icon = def.icon;

  const availableRoles = ROLES.filter(r => !user.roles.includes(r));

  const handleAdd = () => {
    if (!newRole) return;
    onAddRole(user.user_id, newRole);
    setNewRole("");
    setAddOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Card Header */}
      <div className={cn("px-5 py-4 flex items-center gap-4", def.iconBg + "/10")}>
        {/* Avatar */}
        <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0", def.iconBg)}>
          {user.full_name?.charAt(0)?.toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-900 truncate">{user.full_name || "Sans nom"}</p>
            {/* Primary role badge */}
            {primaryRole && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", def.color)}>
                <Icon className="w-3 h-3" />
                {def.shortLabel}
              </span>
            )}
          </div>
          {user.email && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />{user.email}
            </p>
          )}
          {user.phone && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 flex-shrink-0" />{user.phone}
            </p>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {primaryRole ? "Accès & Permissions" : "Aucun rôle assigné"}
        </p>
        {def.permissions.length > 0 ? (
          <ul className="space-y-1.5">
            {def.permissions.map((perm, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", def.iconBg)} />
                {perm}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 italic">Aucune permission définie</p>
        )}

        {/* Extra roles (if multiple) */}
        {user.roles.length > 1 && (
          <div className="pt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rôles supplémentaires</p>
            <div className="flex flex-wrap gap-1.5">
              {user.roles.slice(1).map(r => {
                const d = ROLE_DEFS[r];
                if (!d) return null;
                return (
                  <span key={r} className={cn("inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-semibold border", d.color)}>
                    {d.shortLabel}
                    {isManager && (
                      <button
                        onClick={() => onRemoveRole(user.user_id, r)}
                        className="ml-0.5 hover:opacity-70 transition-opacity"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {isManager && (
        <div className="px-5 pb-4 flex gap-2">
          {/* Remove primary role */}
          {primaryRole && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200 h-8"
              onClick={() => onRemoveRole(user.user_id, primaryRole)}
            >
              <Trash2 className="w-3 h-3" /> Retirer
            </Button>
          )}

          {/* Add role */}
          {availableRoles.length > 0 && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 ml-auto">
                  <UserPlus className="w-3 h-3" /> Ajouter un rôle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Ajouter un rôle à {user.full_name}</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un nouveau rôle à attribuer à cet utilisateur pour modifier ses permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(r => (
                        <SelectItem key={r} value={r}>
                          <div className="flex items-center gap-2">
                            {(() => { const d = ROLE_DEFS[r]; const I = d.icon; return <I className="w-4 h-4 text-slate-500" />; })()}
                            {ROLE_DEFS[r].label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newRole && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-bold text-slate-600 mb-1.5">Accès obtenus :</p>
                      <ul className="space-y-1">
                        {ROLE_DEFS[newRole]?.permissions.map((p, i) => (
                          <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button onClick={handleAdd} className="w-full" disabled={!newRole}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UsersManagement = () => {
  const { isManager } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "", password: "", full_name: "", phone: "", role: "commercial",
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);
    if (profiles) {
      const mapped: UserWithRoles[] = profiles.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email || null,
        phone: p.phone || null,
        roles: roles?.filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role) || [],
      }));
      setUsers(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rôle ajouté ✓" });
      fetchUsers();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast({ title: "Rôle retiré" });
    fetchUsers();
  };

  const createUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) return;
    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: createForm.email,
          password: createForm.password,
          full_name: createForm.full_name,
          phone: createForm.phone || null,
          role: createForm.role,
        },
      });
      if (error || data?.error) {
        toast({ title: "Erreur création", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Utilisateur créé ✓", description: `${createForm.full_name} a été ajouté.` });
        setCreateOpen(false);
        setCreateForm({ email: "", password: "", full_name: "", phone: "", role: "commercial" });
        fetchUsers();
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || u.full_name?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q)
      || u.roles.some(r => ROLE_DEFS[r]?.label.toLowerCase().includes(q));
    const matchRole = filterRole === "all" || u.roles.includes(filterRole);
    return matchSearch && matchRole;
  });

  if (!isManager()) return <div className="p-6 text-slate-500">Accès réservé au Manager</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {users.length} utilisateur(s) — permissions par rôle
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Créer un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Nouvel utilisateur
                </DialogTitle>
                <DialogDescription>
                  Remplissez les informations ci-dessous pour créer un nouveau compte utilisateur avec un rôle spécifique.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {[
                  { key: "full_name", label: "Nom complet *", placeholder: "Ahmed Ben Ali", type: "text" },
                  { key: "email", label: "Email *", placeholder: "ahmed@acbat.tn", type: "email" },
                  { key: "password", label: "Mot de passe *", placeholder: "Minimum 8 caractères", type: "password" },
                  { key: "phone", label: "Téléphone", placeholder: "+216 XX XXX XXX", type: "tel" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input
                      type={type}
                      value={(createForm as any)[key]}
                      onChange={e => setCreateForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="mt-1"
                    />
                  </div>
                ))}

                <div>
                  <Label>Rôle principal *</Label>
                  <Select value={createForm.role} onValueChange={v => setCreateForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => {
                        const d = ROLE_DEFS[r];
                        const I = d.icon;
                        return (
                          <SelectItem key={r} value={r}>
                            <div className="flex items-center gap-2"><I className="w-4 h-4 text-slate-500" />{d.label}</div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Permission preview */}
                {createForm.role && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Accès obtenus :</p>
                    <ul className="space-y-1">
                      {ROLE_DEFS[createForm.role]?.permissions.map((p, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={createUser}
                  disabled={!createForm.email || !createForm.password || !createForm.full_name || createLoading}
                  className="w-full"
                >
                  {createLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Création...</> : "Créer l'utilisateur"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={filterRole === "all" ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setFilterRole("all")}
          >
            Tous ({users.length})
          </Button>
          {ROLES.filter(r => users.some(u => u.roles.includes(r))).map(r => {
            const d = ROLE_DEFS[r];
            const I = d.icon;
            return (
              <Button
                key={r}
                size="sm"
                variant={filterRole === r ? "default" : "outline"}
                className="h-8 text-xs gap-1"
                onClick={() => setFilterRole(r)}
              >
                <I className="w-3 h-3" />
                {d.shortLabel}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── User Grid ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((u, i) => (
              <motion.div
                key={u.user_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
              >
                <UserCard
                  user={u}
                  onRemoveRole={removeRole}
                  onAddRole={addRole}
                  isManager={!!isManager()}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default UsersManagement;
