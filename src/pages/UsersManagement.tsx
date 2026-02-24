import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Users, Search } from "lucide-react";

const ROLES = [
  "manager", "directeur_exploitation", "responsable_achat", "responsable_logistique",
  "responsable_commercial", "commercial", "responsable_technique", "technicien_montage",
  "responsable_sav", "responsable_comptabilite", "responsable_showroom", "livraison", "client"
] as const;

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  directeur_exploitation: "Dir. Exploitation",
  responsable_achat: "Resp. Achat",
  responsable_logistique: "Resp. Logistique",
  responsable_commercial: "Resp. Commercial",
  commercial: "Commercial",
  responsable_technique: "Resp. Technique",
  technicien_montage: "Technicien Montage",
  responsable_sav: "Resp. SAV",
  responsable_comptabilite: "Resp. Comptabilité",
  responsable_showroom: "Resp. Showroom",
  livraison: "Livreur",
  client: "Client",
};

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-red-100 text-red-800",
  directeur_exploitation: "bg-purple-100 text-purple-800",
  responsable_achat: "bg-blue-100 text-blue-800",
  responsable_logistique: "bg-cyan-100 text-cyan-800",
  responsable_commercial: "bg-amber-100 text-amber-800",
  commercial: "bg-yellow-100 text-yellow-800",
  responsable_technique: "bg-indigo-100 text-indigo-800",
  technicien_montage: "bg-violet-100 text-violet-800",
  responsable_sav: "bg-orange-100 text-orange-800",
  responsable_comptabilite: "bg-green-100 text-green-800",
  responsable_showroom: "bg-pink-100 text-pink-800",
  livraison: "bg-teal-100 text-teal-800",
  client: "bg-gray-100 text-gray-800",
};

interface UserWithRoles {
  user_id: string;
  full_name: string;
  phone: string | null;
  roles: string[];
}

const UsersManagement = () => {
  const { isManager } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newRole, setNewRole] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "", password: "", full_name: "", phone: "", role: "commercial"
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (profiles) {
      const mapped = profiles.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        roles: roles?.filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role) || [],
      }));
      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const addRole = async () => {
    if (!selectedUserId || !newRole) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: selectedUserId, role: newRole as any });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rôle ajouté" });
      fetchUsers();
      setNewRole("");
    }
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast({ title: "Rôle supprimé" });
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
        toast({ title: "Utilisateur créé", description: `${createForm.full_name} a été ajouté avec succès.` });
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

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.roles.some(r => ROLE_LABELS[r]?.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isManager()) return <div className="p-6">Accès non autorisé</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{users.length} utilisateur(s) dans le système</p>
        </div>
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
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={createForm.full_name}
                  onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Ahmed Ben Ali"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="ahmed@acbat.tn"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Mot de passe *</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 8 caractères"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={createForm.phone}
                  onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Rôle principal *</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={createUser}
                disabled={!createForm.email || !createForm.password || !createForm.full_name || createLoading}
                className="w-full"
              >
                {createLoading ? "Création en cours..." : "Créer l'utilisateur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôles assignés</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : filtered.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Aucun rôle</span>
                      ) : u.roles.map(r => (
                        <Badge
                          key={r}
                          className={`gap-1 text-xs cursor-default ${ROLE_COLORS[r] || "bg-gray-100 text-gray-800"}`}
                        >
                          {ROLE_LABELS[r] || r}
                          <button
                            onClick={() => removeRole(u.user_id, r)}
                            className="ml-1 hover:opacity-70 transition-opacity"
                            title="Supprimer ce rôle"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setSelectedUserId(u.user_id)}
                        >
                          <UserPlus className="h-3 w-3" /> Rôle
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Ajouter un rôle à {u.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.filter(r => !u.roles.includes(r)).map(r => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={addRole} className="w-full" disabled={!newRole}>Ajouter</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManagement;
