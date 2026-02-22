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
import { UserPlus, Trash2 } from "lucide-react";

const ROLES = [
  "manager", "directeur_exploitation", "responsable_achat", "responsable_logistique",
  "responsable_commercial", "commercial", "responsable_technique", "technicien_montage",
  "responsable_sav", "responsable_comptabilite", "client"
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
  client: "Client",
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
  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchUsers = async () => {
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
      setShowAdd(false);
    }
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast({ title: "Rôle supprimé" });
    fetchUsers();
  };

  if (!isManager()) return <div className="p-6">Accès non autorisé</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Gestion des utilisateurs</h1>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => (
                        <Badge key={r} variant="secondary" className="gap-1 text-xs">
                          {ROLE_LABELS[r] || r}
                          <button onClick={() => removeRole(u.user_id, r)} className="ml-1 hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedUserId(u.user_id)}>
                          <UserPlus className="h-3 w-3" /> Rôle
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Ajouter un rôle</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                            <SelectContent>
                              {ROLES.filter(r => !u.roles.includes(r)).map(r => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={addRole} className="w-full">Ajouter</Button>
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
