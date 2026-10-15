import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "../../lib/supabase";
import { readableError } from "../../lib/errors";
import { Leaf, LockKeyhole } from "lucide-react";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;
export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async values => {
    setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword(values);
    if (authError) setError(readableError(authError));
    setBusy(false);
  });
  return <main className="login-screen"><form className="login-card" onSubmit={submit}>
    <div className="brand-mark large"><Leaf size={24}/></div><p className="eyebrow">DATASTRAW TECHNOLOGIES</p><h1>Welcome back</h1><p className="muted">Sign in to your CX workspace.</p>
    <label>Email address<input type="email" autoComplete="email" {...register("email")}/></label>{errors.email && <p className="field-error">{errors.email.message}</p>}
    <label>Password<input type="password" autoComplete="current-password" {...register("password")}/></label>{errors.password && <p className="field-error">{errors.password.message}</p>}
    {error && <div className="alert error" role="alert">{error}</div>}
    <button className="primary-button full" disabled={busy}>{busy ? "Signing in…" : <><LockKeyhole size={16}/> Sign in securely</>}</button>
    <p className="login-foot">Access is provided by your Supabase administrator.</p>
  </form></main>;
}
