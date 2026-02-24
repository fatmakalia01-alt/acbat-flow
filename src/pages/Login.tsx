import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import acbatLogo from "@/assets/acbat-logo.jpeg";
import { Shield, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={acbatLogo} alt="ACBAT" className="h-20 w-20 rounded-xl object-cover shadow-card" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">ACBAT ERP</h1>
            <p className="text-sm text-muted-foreground mt-1">Partners in architectural solutions</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={isLoading}>
              <Shield className="h-4 w-4 mr-2" />
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-6">
            © 2026 ACBAT — Accessoires Bâtiment
          </p>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Compte de test Manager</p>
            <p className="text-xs text-muted-foreground selection:bg-primary/20">
              Email: <span className="text-foreground font-medium">haithem.kalia@gmail.com</span><br />
              Pass: <span className="text-foreground font-medium">54372272Hk</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
