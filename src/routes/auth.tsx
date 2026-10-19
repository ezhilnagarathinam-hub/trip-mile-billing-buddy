import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoAccount } from "@/lib/demo.functions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Car } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login — Raman Travels" },
      { name: "description", content: "Admin and driver login for Raman Travels." },
      { property: "og:title", content: "Login — Raman Travels" },
      { property: "og:description", content: "Admin and driver login for Raman Travels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const demoFn = useServerFn(ensureDemoAccount);
  const [busy, setBusy] = useState<string | null>(null);
  const [f, setF] = useState({ email: "", password: "", name: "", phone: "" });

  const go = () => navigate({ to: "/dashboard" });

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy("login");
    const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    go();
  }
  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setBusy("signup");
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: f.name, phone: f.phone } },
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    if (data.session) go();
    else toast.success("Check your email to confirm. After that, the admin must approve your account.");
  }
  async function demo(role: "admin" | "driver") {
    setBusy(role);
    try {
      const c = await demoFn({ data: { role } });
      const { error } = await supabase.auth.signInWithPassword(c);
      if (error) throw error;
      go();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <div className="stripes h-2" />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl">
          <div className="mb-3"><BackButton to="/" label="Back to home" /></div>
          <Logo className="mb-6 justify-center" />
          <div className="mb-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!!busy} onClick={() => demo("admin")}>
              <ShieldCheck className="mr-1 h-4 w-4" />{busy === "admin" ? "Opening…" : "Demo Admin"}
            </Button>
            <Button disabled={!!busy} onClick={() => demo("driver")}>
              <Car className="mr-1 h-4 w-4" />{busy === "driver" ? "Opening…" : "Demo Driver"}
            </Button>
          </div>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Driver sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={login} className="space-y-3 pt-3">
                <div><Label>Email</Label><Input type="email" required value={f.email} onChange={set("email")} /></div>
                <div><Label>Password</Label><Input type="password" required value={f.password} onChange={set("password")} /></div>
                <Button className="w-full" disabled={!!busy}>Login</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signup} className="space-y-3 pt-3">
                <div><Label>Full name</Label><Input required value={f.name} onChange={set("name")} /></div>
                <div><Label>Phone</Label><Input required value={f.phone} onChange={set("phone")} /></div>
                <div><Label>Email</Label><Input type="email" required value={f.email} onChange={set("email")} /></div>
                <div><Label>Password</Label><Input type="password" minLength={6} required value={f.password} onChange={set("password")} /></div>
                <Button className="w-full" disabled={!!busy}>Create driver account</Button>
                <p className="text-center text-xs text-muted-foreground">New driver accounts need admin approval.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
