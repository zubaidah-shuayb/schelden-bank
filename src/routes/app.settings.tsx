import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Camera,
  Check,
  FileText,
  Headphones,
  KeyRound,
  Laptop,
  Loader2,
  LockKeyhole,
  LogOut,
  MailCheck,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/app/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme, type Theme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { initialsFrom } from "@/lib/format";
import {
  customerPreferencesQuery,
  profileQuery,
  securityEventsQuery,
  type CustomerPreferences,
  type Profile,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings & profile — Schelden Bank" },
      { name: "description", content: "Manage your Schelden Bank profile, security and preferences." },
      { property: "og:title", content: "Settings & profile — Schelden Bank" },
      { property: "og:description", content: "Manage your profile, security and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name.").max(80),
  last_name: z.string().trim().min(1, "Enter your last name.").max(80),
  phone: z.string().trim().max(30).refine((value) => !value || /^\+?[0-9 ()-]{7,30}$/.test(value), "Enter a valid phone number."),
  date_of_birth: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Enter a valid date."),
  nationality: z.string().trim().max(80),
  address_street: z.string().trim().max(140),
  address_postal_code: z.string().trim().max(16),
  address_city: z.string().trim().max(80),
  address_country: z.string().trim().max(80),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PreferenceKey = keyof Pick<CustomerPreferences, "security_email" | "transaction_email" | "support_email" | "product_email" | "push_enabled">;
type TotpEnrollment = { id: string; qrCode: string; secret: string };

const defaultPreferences: Record<PreferenceKey, boolean> = {
  security_email: true,
  transaction_email: true,
  support_email: true,
  product_email: false,
  push_enabled: true,
};

function toForm(profile: Profile | null | undefined): ProfileForm {
  return {
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    nationality: profile?.nationality ?? "",
    address_street: profile?.address_street ?? "",
    address_postal_code: profile?.address_postal_code ?? "",
    address_city: profile?.address_city ?? "",
    address_country: profile?.address_country ?? "Belgium",
  };
}

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(user) });
  const preferences = useQuery({ ...customerPreferencesQuery(userId), enabled: Boolean(user), retry: false });
  const securityEvents = useQuery({ ...securityEventsQuery(userId), enabled: Boolean(user) });
  const [form, setForm] = useState<ProfileForm>(() => toForm(null));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [totp, setTotp] = useState<TotpEnrollment | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => setForm(toForm(profile.data)), [profile.data]);

  useEffect(() => {
    const path = profile.data?.avatar_path;
    if (!path) {
      setAvatarUrl(null);
      return;
    }
    void supabase.storage.from("avatars").createSignedUrl(path, 3600).then(({ data }) => {
      setAvatarUrl(data?.signedUrl ?? null);
    });
  }, [profile.data?.avatar_path]);

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp.find((factor) => factor.status === "verified");
      setFactorId(verified?.id ?? null);
    });
  }, []);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your details.");
      if (!user) throw new Error("Your session has expired.");
      const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Personal information saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function uploadAvatar(file: File | undefined) {
    if (!file || !user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile pictures must be smaller than 5 MB.");
      return;
    }
    setAvatarBusy(true);
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/profile.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setAvatarBusy(false);
      toast.error("We couldn't upload that picture.");
      return;
    }
    const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    setAvatarBusy(false);
    if (profileError) {
      toast.error("The picture uploaded, but your profile couldn't be updated.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(data?.signedUrl ?? null);
    toast.success("Profile picture updated");
  }

  async function removeAvatar() {
    const path = profile.data?.avatar_path;
    if (!path || !user) return;
    setAvatarBusy(true);
    const { error: storageError } = await supabase.storage.from("avatars").remove([path]);
    const { error: profileError } = storageError
      ? { error: storageError }
      : await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
    setAvatarBusy(false);
    if (profileError) {
      toast.error("We couldn't remove your picture.");
      return;
    }
    setAvatarUrl(null);
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profile picture removed");
  }

  async function savePreference(key: PreferenceKey, value: boolean) {
    if (!user) return;
    const current = preferences.data ?? defaultPreferences;
    const payload = { user_id: user.id, ...defaultPreferences, ...current, [key]: value };
    const { error } = await supabase.from("customer_preferences").upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast.error("We couldn't save that preference. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["customer_preferences", user.id] });
    toast.success("Preference saved");
  }

  async function beginMfa() {
    setMfaBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Schelden Authenticator" });
    setMfaBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "We couldn't start two-step verification.");
      return;
    }
    setTotp({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyMfa() {
    if (!totp || !/^\d{6}$/.test(totpCode)) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setMfaBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: totp.id });
    const result = challenge.data
      ? await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: challenge.data.id, code: totpCode })
      : { error: challenge.error };
    setMfaBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setFactorId(totp.id);
    setTotp(null);
    setTotpCode("");
    toast.success("Two-step verification is active");
  }

  async function removeMfa() {
    if (!factorId) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFactorId(null);
    toast.success("Two-step verification removed");
  }

  async function signOutOthers() {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    error ? toast.error(error.message) : toast.success("Other sessions signed out");
  }

  const initials = initialsFrom(profile.data?.first_name, profile.data?.last_name, user?.email ?? null);
  const prefs = preferences.data ?? defaultPreferences;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Settings & profile" description="Manage your personal details, security and banking preferences." />

      <Tabs defaultValue="profile" className="w-full">
        <div className="scrollbar-hidden -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max justify-start">
            <TabsTrigger value="profile"><UserRound className="mr-2 h-4 w-4" />Profile</TabsTrigger>
            <TabsTrigger value="security"><ShieldCheck className="mr-2 h-4 w-4" />Security</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />Appearance</TabsTrigger>
            <TabsTrigger value="privacy"><LockKeyhole className="mr-2 h-4 w-4" />Privacy & help</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-5 space-y-6">
          <Card className="card-elevated">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24 border border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="Your profile picture" /> : null}
                <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-semibold">Profile picture</h2>
                
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
                    {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Change picture
                  </Button>
                  {profile.data?.avatar_path ? <Button type="button" variant="ghost" onClick={() => void removeAvatar()} disabled={avatarBusy}><Trash2 className="h-4 w-4" />Remove</Button> : null}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Badge variant={profile.data?.verification_status === "verified" ? "default" : "secondary"} className="capitalize">Identity {profile.data?.verification_status?.replace("_", " ") ?? "pending"}</Badge>
                <Badge variant={user?.email_confirmed_at ? "default" : "secondary"}><MailCheck className="mr-1 h-3 w-3" />Email {user?.email_confirmed_at ? "verified" : "unverified"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
            <CardContent>
              {profile.isLoading ? <Skeleton className="h-72 w-full" /> : (
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate(); }}>
                  <Field label="First name" value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} />
                  <Field label="Last name" value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} />
                  <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                  <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(value) => setForm({ ...form, date_of_birth: value })} />
                  <Field label="Nationality" value={form.nationality} onChange={(value) => setForm({ ...form, nationality: value })} />
                  <Field label="Street and number" value={form.address_street} onChange={(value) => setForm({ ...form, address_street: value })} />
                  <Field label="Postal code" value={form.address_postal_code} onChange={(value) => setForm({ ...form, address_postal_code: value })} />
                  <Field label="City" value={form.address_city} onChange={(value) => setForm({ ...form, address_city: value })} />
                  <Field label="Country" value={form.address_country} onChange={(value) => setForm({ ...form, address_country: value })} />
                  <div className="sm:col-span-2"><Button type="submit" disabled={saveProfile.isPending}>{saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save changes</Button></div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-5 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SettingsCard icon={KeyRound} title="Password" description="Change your password and review recent security activity." action={<Button asChild variant="outline"><Link to="/app/security">Open security centre</Link></Button>} />
            <SettingsCard icon={Laptop} title="Active sessions" description="Keep this device signed in and revoke access from your other browsers and devices." action={<Button variant="outline" onClick={() => void signOutOthers()}>Sign out other sessions</Button>} />
            <SettingsCard icon={ShieldCheck} title="Authenticator app" description={factorId ? "A verified authenticator protects your account with a second step." : "Add a time-based code from an authenticator app when you sign in."} action={factorId ? <Button variant="outline" onClick={() => void removeMfa()} disabled={mfaBusy}>Remove authenticator</Button> : <Button onClick={() => void beginMfa()} disabled={mfaBusy}>{mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Set up authenticator</Button>} />
            <SettingsCard icon={LogOut} title="This device" description="End your current secure session on this device." action={<Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>Sign out</Button>} />
          </div>
          <Card><CardHeader><CardTitle>Recent security activity</CardTitle></CardHeader><CardContent className="space-y-3">{securityEvents.isLoading ? <Skeleton className="h-24 w-full" /> : (securityEvents.data ?? []).slice(0, 4).map((event) => <div key={event.id} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0"><div><p className="text-sm font-medium">{event.description}</p><p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("en-BE")}{event.device_label ? ` · ${event.device_label}` : ""}</p></div><Badge variant="secondary" className="capitalize">{event.risk}</Badge></div>)}{!securityEvents.isLoading && (securityEvents.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No security activity has been recorded yet.</p> : null}</CardContent></Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <Card className="card-elevated"><CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader><CardContent className="divide-y divide-border">{([
            ["security_email", "Security alerts", "Important sign-in and account-security messages."],
            ["transaction_email", "Transaction alerts", "Updates when activity is recorded on your accounts."],
            ["support_email", "Support replies", "An email when the support team responds."],
            ["product_email", "Product updates", "Occasional updates about Schelden services."],
            ["push_enabled", "In-app notifications", "Show alerts inside your Schelden banking area."],
          ] as [PreferenceKey, string, string][]).map(([key, title, description]) => <PreferenceRow key={key} title={title} description={description} checked={prefs[key]} onChange={(value) => void savePreference(key, value)} />)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <Card className="card-elevated"><CardHeader><CardTitle>Appearance</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3">{([{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "Use device setting", icon: Laptop }] as { value: Theme; label: string; icon: typeof Sun }[]).map((option) => <Button key={option.value} type="button" variant={theme === option.value ? "default" : "outline"} className="h-auto justify-start px-4 py-5" onClick={() => setTheme(option.value)}><option.icon className="h-5 w-5" />{option.label}</Button>)}</div><p className="mt-4 text-sm text-muted-foreground">Your choice is saved on this device.</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-5 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SettingsCard icon={FileText} title="Documents & statements" description="Open statements, certificates and letters issued to you." action={<Button asChild variant="outline"><Link to="/app/documents">View documents</Link></Button>} />
            <SettingsCard icon={Headphones} title="Account support" description="Ask for help with your account, personal data or access." action={<Button asChild variant="outline"><Link to="/app/support">Contact support</Link></Button>} />
            <SettingsCard icon={LockKeyhole} title="Privacy" description="Your profile and private files are only available to you and authorised Schelden staff. Financial and audit records cannot be removed from this screen." />
            <SettingsCard icon={Trash2} title="Close your account" description="Account closure requires a support review so balances, documents and required records are handled safely." action={<Button asChild variant="outline"><Link to="/app/support">Request account closure</Link></Button>} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(totp)} onOpenChange={(open) => { if (!open) { setTotp(null); setTotpCode(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Set up authenticator</DialogTitle><DialogDescription>Scan this code in your authenticator app, then enter the 6-digit code.</DialogDescription></DialogHeader>
          {totp ? <div className="space-y-4"><img src={totp.qrCode} alt="Authenticator QR code" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" /><div className="rounded-lg bg-muted p-3 text-center"><p className="text-xs text-muted-foreground">Manual setup key</p><code className="mt-1 block break-all text-xs">{totp.secret}</code></div><div className="space-y-2"><Label htmlFor="totp-code">Verification code</Label><Input id="totp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></div><Button className="w-full" onClick={() => void verifyMfa()} disabled={mfaBusy}>{mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Verify and enable</Button></div> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = `settings-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} maxLength={type === "tel" ? 30 : 140} /></div>;
}

function SettingsCard({ icon: Icon, title, description, action }: { icon: typeof ShieldCheck; title: string; description: string; action?: ReactNode }) {
  return <Card className="card-elevated"><CardContent className="flex h-full flex-col items-start p-6"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden /></span><h2 className="mt-4 font-display text-lg font-semibold">{title}</h2><p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</CardContent></Card>;
}

function PreferenceRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"><div><Label className="text-sm font-medium">{title}</Label><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChange} aria-label={title} /></div>;
}