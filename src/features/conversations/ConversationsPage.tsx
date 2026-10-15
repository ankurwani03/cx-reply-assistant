import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, Bot, Check, Clock3, Package, RefreshCw, Send, Sparkles, UserRound } from "lucide-react";
import { generateReply, listConversations, listMessages, sendGeneration, sendMessage, saveGenerationEdit, approveGeneration } from "../../services/api";
import { readableError } from "../../lib/errors";
import type { Conversation, Generation, KnowledgeEntry, Message } from "../../types/database";

function timeLabel(value: string) { return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function key() { return crypto.randomUUID(); }

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"customer" | "agent">("agent");
  const [messageText, setMessageText] = useState("");
  const [draft, setDraft] = useState("");
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const refreshConversations = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    setSelectedId(old => old && rows.some(row => row.id === old) ? old : rows[0]?.id ?? "");
  }, []);
  const refreshMessages = useCallback(async (id: string) => {
    const rows = await listMessages(id);
    setMessages(rows);
  }, []);
  useEffect(() => { refreshConversations().catch(e => setError(readableError(e))).finally(() => setLoading(false)); }, [refreshConversations]);
  useEffect(() => { if (selectedId) { refreshMessages(selectedId).catch(e => setError(readableError(e))); setDraft(""); setGeneration(null); setKnowledge([]); setWarning(""); } }, [selectedId, refreshMessages]);
  const selected = useMemo(() => conversations.find(c => c.id === selectedId), [conversations, selectedId]);
  const filtered = useMemo(() => conversations.filter(c => `${c.subject} ${c.customers?.display_name ?? ""} ${c.brands?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const latestCustomerMessage = [...messages].reverse().find(m => m.sender_type === "customer");

  async function submitMessage() {
    if (!selectedId || !messageText.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await sendMessage(selectedId, messageText.trim(), mode, key());
      setMessageText(""); await refreshMessages(selectedId); await refreshConversations();
      setNotice(mode === "customer" ? "Customer message saved." : "Reply sent to conversation.");
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }
  async function generate() {
    if (!selectedId) return;
    setBusy(true); setError(""); setNotice(""); setWarning("");
    try {
      const result = await generateReply(selectedId, latestCustomerMessage?.id);
      setGeneration(result.generation); setDraft(result.draft); setKnowledge(result.knowledge); setWarning(result.warning ?? "");
      setNotice("Draft generated and saved.");
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }
  async function saveEdit() {
    if (!generation) return;
    setBusy(true); setError(""); setNotice("");
    try { await saveGenerationEdit(generation.id, draft); setNotice("Edited draft saved."); }
    catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!generation) return;
    setBusy(true); setError(""); setNotice("");
    try { await approveGeneration(generation.id); setNotice("Draft approved. You can now send it."); }
    catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }
  async function sendDraft() {
    if (!generation || !selectedId || !draft.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await saveEdit();
      await sendGeneration(generation.id, selectedId, draft.trim(), key());
      await refreshMessages(selectedId); await refreshConversations();
      setNotice("Final response sent and saved to conversation history."); setDraft(""); setGeneration(null);
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="center-state">Loading conversations…</div>;
  return <div className="page-wrap">
    <header className="page-header"><div><p className="eyebrow">CUSTOMER EXPERIENCE</p><h1>Conversations</h1><p className="muted">Understand the context. Respond with confidence.</p></div><button className="secondary-button" onClick={() => { setLoading(true); refreshConversations().catch(e => setError(readableError(e))).finally(() => setLoading(false)); }}><RefreshCw size={15}/> Refresh</button></header>
    {error && <div className="alert error" role="alert"><AlertCircle size={17}/>{error}<button className="alert-dismiss" onClick={() => setError("")}>Dismiss</button></div>}
    {notice && <div className="alert success" role="status"><Check size={17}/>{notice}<button className="alert-dismiss" onClick={() => setNotice("")}>Dismiss</button></div>}
    <div className="conversation-layout">
      <aside className="conversation-list panel">
        <div className="panel-heading"><div><h2>Inbox</h2><span className="count-pill">{filtered.length}</span></div><button className="icon-button" title="Refresh conversations" onClick={() => void refreshConversations()}><RefreshCw size={16}/></button></div>
        <div className="search-wrap"><input aria-label="Search conversations" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)}/></div>
        <div className="conversation-items">
          {filtered.map(c => {
            return <button key={c.id} className={`conversation-item ${selectedId === c.id ? "selected" : ""}`} onClick={() => setSelectedId(c.id)}>
              <div className="avatar">{(c.customers?.display_name ?? "C").slice(0,1).toUpperCase()}</div><div className="conversation-summary"><div className="item-top"><strong>{c.customers?.display_name ?? "Customer"}</strong><span className="tiny-time">{timeLabel(c.updated_at)}</span></div><div className="item-brand">{c.brands?.name ?? "Brand"}</div><p>{c.subject}</p><div className="item-bottom"><span className={`status-dot ${c.status}`}/>{c.status}</div></div>
            </button>;
          })}
          {filtered.length === 0 && <div className="empty-state small"><MessagesSquareIcon/><strong>No conversations found</strong><span>Try another search.</span></div>}
        </div>
      </aside>
      <section className="thread-panel panel">
        {!selected ? <div className="empty-state"><MessagesSquareIcon/><strong>No conversations yet</strong><span>Seed the database or create a conversation.</span></div> : <>
          <div className="thread-header"><div className="avatar large-avatar">{(selected.customers?.display_name ?? "C").slice(0,1).toUpperCase()}</div><div className="thread-customer"><h2>{selected.customers?.display_name ?? "Customer"}</h2><div>{selected.brands?.name ?? "Brand"} <span className="dot-separator">·</span> {selected.subject}</div></div><span className={`status-chip ${selected.status}`}>{selected.status}</span></div>
          <div className="order-strip"><div className="order-icon"><Package size={17}/></div><div><small>ORDER</small><strong>{selected.orders?.order_number ?? "No linked order"}</strong></div><div className="order-product"><small>PRODUCT</small><strong>{selected.orders?.product_name ?? "—"}</strong></div><div><small>DELIVERY</small><strong>{selected.orders?.delivery_status ?? "Unknown"}</strong></div><button className="icon-button" title="Order details"><ArrowUpRight size={15}/></button></div>
          <div className="mode-bar"><div className="mode-label">DEMO MODE</div><div className="segmented"><button className={mode === "customer" ? "active" : ""} onClick={() => setMode("customer")}><UserRound size={15}/> Customer</button><button className={mode === "agent" ? "active" : ""} onClick={() => setMode("agent")}><Bot size={15}/> Agent</button></div><span className="mode-note">Switch to test the full reply loop</span></div>
          <div className="messages-scroll">
            {messages.map(m => <div key={m.id} className={`message-row ${m.sender_type}`}><div className="message-avatar">{m.sender_type === "customer" ? <UserRound size={15}/> : m.sender_type === "agent" ? <Bot size={15}/> : <Sparkles size={15}/>}</div><div className="message-content"><div className="message-meta"><strong>{m.sender_type === "customer" ? selected.customers?.display_name ?? "Customer" : m.sender_type === "agent" ? "Support agent" : "Assistant"}</strong><span><Clock3 size={12}/>{timeLabel(m.created_at)}</span></div><div className="bubble">{m.body}</div></div></div>)}
            {messages.length === 0 && <div className="empty-state small">No messages in this conversation yet.</div>}
          </div>
          <div className="composer"><div className="composer-mode">{mode === "customer" ? "Message as customer" : "Manual agent reply"} <span>·</span> {messageText.length}/4000</div><textarea aria-label="Compose message" maxLength={4000} placeholder={mode === "customer" ? "Type a customer message…" : "Write a response without AI…"} value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submitMessage(); }}/><div className="composer-actions"><span className="muted tiny">Ctrl/⌘ + Enter to send</span><button className="primary-button" disabled={busy || !messageText.trim()} onClick={() => void submitMessage()}><Send size={15}/>{busy ? "Saving…" : "Send message"}</button></div></div>
        </>}
      </section>
      <aside className="ai-panel">
        <div className="ai-panel-header"><div className="ai-icon"><Sparkles size={18}/></div><div><h2>AI reply assistant</h2><p>Grounded in brand knowledge</p></div></div>
        <div className="ai-panel-body">
          {mode !== "agent" && <div className="alert info">Switch to Agent mode to generate and manage replies.</div>}
          <div className="latest-question"><span className="section-kicker">LATEST CUSTOMER MESSAGE</span><p>{latestCustomerMessage?.body ?? "No customer message yet. Switch to Customer mode and send a message to begin."}</p></div>
          {warning && <div className="alert warning"><AlertCircle size={16}/><div><strong>Review required</strong><p>{warning}</p></div></div>}
          <button className="primary-button full generate-button" disabled={busy || mode !== "agent" || !selected || !latestCustomerMessage} onClick={() => void generate()}><Sparkles size={16}/>{busy ? "Working…" : generation ? "Regenerate reply" : "Generate reply"}</button>
          <div className="section-divider"/>
          <div className="section-heading"><h3>Suggested response</h3>{generation && <span className="draft-status">{generation.status}</span>}</div>
          {generation ? <>
            <textarea className="draft-editor" aria-label="AI draft editor" value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000}/>
            <div className="draft-actions"><button className="secondary-button" disabled={busy || !draft.trim()} onClick={() => void saveEdit()}>Save edit</button><button className="secondary-button" disabled={busy} onClick={() => void approve()}><Check size={14}/> Approve</button></div>
            <button className="primary-button full send-draft" disabled={busy || !draft.trim()} onClick={() => void sendDraft()}><Send size={15}/> Send final response</button>
          </> : <div className="draft-placeholder"><Sparkles size={20}/><p>Your suggested reply will appear here.</p><small>Generate a draft to review its evidence and edit before sending.</small></div>}
          <div className="section-divider"/>
          <div className="section-heading"><h3>Retrieved knowledge</h3><span className="count-pill">{knowledge.length}</span></div>
          {knowledge.length ? <div className="knowledge-results">{knowledge.map(entry => <article key={entry.id} className="knowledge-result"><span className="category-tag">{entry.category}</span><strong>{entry.title}</strong><p>{entry.content}</p></article>)}</div> : <div className="knowledge-empty"><BookOpenIcon/><p>Relevant active policies will be shown after generation.</p></div>}
          <p className="ai-disclaimer">AI suggestions may be incomplete. Review the evidence and final wording before sending.</p>
        </div>
      </aside>
    </div>
  </div>;
}
function MessagesSquareIcon() { return <Bot size={22}/>; }
function BookOpenIcon() { return <Package size={20}/>; }
