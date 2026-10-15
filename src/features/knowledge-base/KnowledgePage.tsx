import { useEffect, useState } from "react";
import { BookOpen, CirclePlus, Pencil, Search, Trash2, X } from "lucide-react";
import { listBrands, listKnowledge, saveKnowledge, deleteKnowledge } from "../../services/api";
import { readableError } from "../../lib/errors";
import { knowledgeSchema, type KnowledgeForm } from "../../validation/schemas";
import type { Brand, KnowledgeEntry } from "../../types/database";

const categories = [
  { value: "returns", label: "Returns" }, { value: "refunds", label: "Refunds" },
  { value: "shipping", label: "Shipping" }, { value: "cancellations", label: "Cancellations" },
  { value: "general", label: "General" }
] as const;
const blank = (brandId: string): KnowledgeForm => ({ brand_id: brandId, category: "returns", title: "", content: "", active: true });

export default function KnowledgePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [selected, setSelected] = useState<KnowledgeEntry | null>(null);
  const [form, setForm] = useState<KnowledgeForm>(blank(""));
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadBrands() {
    const data = await listBrands(); setBrands(data);
    setBrandId(old => old && data.some(b => b.id === old) ? old : data[0]?.id ?? "");
  }
  async function loadEntries(id: string) {
    const data = await listKnowledge(id); setEntries(data);
    setSelected(old => old && data.some(e => e.id === old.id) ? data.find(e => e.id === old.id) ?? null : data[0] ?? null);
  }
  useEffect(() => { loadBrands().catch(e => setError(readableError(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (brandId) loadEntries(brandId).catch(e => setError(readableError(e))); }, [brandId]);
  const filtered = entries.filter(e => `${e.title} ${e.content} ${e.category}`.toLowerCase().includes(search.toLowerCase()));

  function openCreate() { setEditingId(undefined); setForm(blank(brandId)); setEditorOpen(true); setError(""); }
  function openEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id); setForm({ brand_id: entry.brand_id, category: entry.category, title: entry.title, content: entry.content, active: entry.active }); setEditorOpen(true); setError("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    const parsed = knowledgeSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Please check the form."); return; }
    setBusy(true);
    try {
      const saved = await saveKnowledge(parsed.data, editingId);
      await loadEntries(brandId); setSelected(saved); setEditorOpen(false); setNotice(editingId ? "Policy updated." : "Policy created.");
    } catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }
  async function remove(entry: KnowledgeEntry) {
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setError(""); setNotice(""); setBusy(true);
    try { await deleteKnowledge(entry.id); await loadEntries(brandId); setNotice("Policy deleted."); }
    catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="center-state">Loading knowledge base…</div>;

  return <div className="page-wrap">
    <header className="page-header"><div><p className="eyebrow">POLICY MANAGEMENT</p><h1>Knowledge base</h1><p className="muted">Manage the trusted information behind every AI reply.</p></div><button className="primary-button" disabled={!brandId} onClick={openCreate}><CirclePlus size={16}/> Add entry</button></header>
    {error && <div className="alert error" role="alert">{error}<button className="alert-dismiss" onClick={() => setError("")}>Dismiss</button></div>}
    {notice && <div className="alert success" role="status">{notice}<button className="alert-dismiss" onClick={() => setNotice("")}>Dismiss</button></div>}
    <div className="kb-toolbar"><label className="brand-select-label">BRAND<select value={brandId} onChange={e => setBrandId(e.target.value)} aria-label="Select brand">{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><div className="kb-search"><Search size={16}/><input placeholder="Search policies…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search policies"/></div><span className="muted">{filtered.length} entries</span></div>
    {!brands.length ? <div className="empty-state panel"><BookOpen/><strong>No brands available</strong><span>Ask your administrator to configure brand access.</span></div> : <div className="kb-layout">
      <section className="panel kb-list"><div className="panel-heading"><h2>Policy entries</h2><span className="count-pill">{filtered.length}</span></div>
        {filtered.map(entry => <button key={entry.id} className={`kb-entry ${selected?.id === entry.id ? "selected" : ""}`} onClick={() => setSelected(entry)}><div className="kb-entry-top"><span className="category-tag">{entry.category}</span><span className={`active-label ${entry.active ? "is-active" : ""}`}>{entry.active ? "Active" : "Inactive"}</span></div><strong>{entry.title}</strong><p>{entry.content}</p><span className="kb-updated">Updated {new Date(entry.updated_at).toLocaleDateString()}</span></button>)}
        {!filtered.length && <div className="empty-state small"><BookOpen/><strong>No entries found</strong><span>Create a policy or change your search.</span></div>}
      </section>
      <section className="panel kb-detail">{selected ? <><div className="detail-top"><span className="category-tag">{selected.category}</span><div className="detail-actions"><button className="secondary-button" onClick={() => openEdit(selected)}><Pencil size={14}/> Edit</button><button className="danger-button" disabled={busy} onClick={() => void remove(selected)}><Trash2 size={14}/> Delete</button></div></div><h2>{selected.title}</h2><div className="detail-meta"><span>{brands.find(b => b.id === selected.brand_id)?.name}</span><span>·</span><span>{selected.active ? "Active policy" : "Inactive policy"}</span></div><p className="policy-content">{selected.content}</p><div className="policy-foot"><span>Created {new Date(selected.created_at).toLocaleString()}</span><span>Updated {new Date(selected.updated_at).toLocaleString()}</span></div></> : <div className="empty-state"><BookOpen/><strong>Select a policy</strong><span>View details or create a new entry.</span></div>}</section>
    </div>}
    {editorOpen && <div className="modal-backdrop" role="presentation"><form className="editor-modal" onSubmit={submit} aria-label="Knowledge entry form"><div className="modal-header"><div><p className="eyebrow">{editingId ? "EDIT POLICY" : "NEW POLICY"}</p><h2>{editingId ? "Update knowledge entry" : "Create knowledge entry"}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setEditorOpen(false)}><X/></button></div>
      <label>Brand<select value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })} required>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as KnowledgeForm["category"] })}>{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label>Title<input value={form.title} maxLength={160} onChange={e => setForm({ ...form, title: e.target.value })} required minLength={3}/></label>
      <label>Policy content<textarea value={form.content} maxLength={12000} rows={7} onChange={e => setForm({ ...form, content: e.target.value })} required minLength={10}/></label>
      <label className="checkbox-label"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/> Active — available for AI retrieval</label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save entry"}</button></div>
    </form></div>}
  </div>;
}
