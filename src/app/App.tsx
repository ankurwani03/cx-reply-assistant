import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { BookOpen, MessagesSquare, LogOut, Sparkles, Leaf } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import ConversationsPage from "../features/conversations/ConversationsPage";
import KnowledgePage from "../features/knowledge-base/KnowledgePage";
import LoginPage from "../features/authentication/LoginPage";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!isSupabaseConfigured) return <main className="setup-screen"><div className="setup-card"><div className="brand-mark"><Leaf /></div><p className="eyebrow">DATASTRAW TECHNOLOGIES</p><h1>Connect your Supabase project</h1><p>Create a local <code>.env</code> file from <code>.env.example</code> and fill in the project URL and public anon key. No mock backend is substituted.</p><p className="muted">Then run <code>npm run dev</code> again.</p></div></main>;
  if (!ready) return <div className="center-state">Loading your session…</div>;
  if (!session) return <LoginPage />;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><Leaf size={20}/></div><div><strong>datastraw</strong><small>CX WORKSPACE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><MessagesSquare size={18}/> Conversations</NavLink>
        <NavLink to="/knowledge" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><BookOpen size={18}/> Knowledge base</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="secure-note"><Sparkles size={16}/><span>AI-assisted support<br/><small>Agent remains in control</small></span></div><button className="text-button signout" onClick={() => void supabase.auth.signOut()}><LogOut size={16}/> Sign out</button></div>
    </aside>
    <main className="main-content"><Routes><Route path="/" element={<ConversationsPage />} /><Route path="/knowledge" element={<KnowledgePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main>
  </div>;
}
