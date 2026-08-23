import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowUp, Bot, Clock3, MessageCircle, PhoneCall, RotateCcw, Send, Stethoscope } from 'lucide-react';
import PageHeader from '../../shared/ui/PageHeader';
import { handoffApi } from '../../features/handoff/api';
import { getApiBase } from '../../shared/api/client';

type Message = { sender: 'patient' | 'assistant'; content: string; quickReplies?: string[]; handoffRecommended?: boolean };
const API = getApiBase();
const starters = ['오늘 진료시간', '휴진 일정', '의료진 안내', '진료 분야', '진료비', '오시는 길'];

// 환자 안내 챗봇 화면. 직원 콘솔 레일의 '챗봇' 모듈로 노출된다.
export default function ChatbotModule() {
  const [sessionId, setSessionId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([{ sender: 'assistant', content: '안녕하세요. 튼튼정형외과 키오스크입니다.\n원하시는 안내를 선택하거나 질문을 입력해 주세요.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [calling, setCalling] = useState(false);

  const start = async () => {
    try { const r = await fetch(`${API}/api/kiosk/sessions`, { method: 'POST' }); const d = await r.json(); setSessionId(d.id); setOffline(false); }
    catch { setOffline(true); }
  };
  useEffect(() => { void start(); }, []);
  useEffect(() => { const id = window.setTimeout(() => { if (sessionId) void start(); }, 120000); return () => window.clearTimeout(id); }, [sessionId]);
  const send = async (value: string) => {
    const text = value.trim(); if (!text || busy) return;
    setInput(''); setMessages((m) => [...m, { sender: 'patient', content: text }]); setBusy(true);
    try { const r = await fetch(`${API}/api/kiosk/sessions/${sessionId}/messages`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ message: text }) }); const d = await r.json(); setMessages((m) => [...m, { sender:'assistant', content:d.answer, quickReplies:d.quickReplies, handoffRecommended:d.handoffRecommended }]); setOffline(false); }
    catch { setMessages((m) => [...m, { sender:'assistant', content:'잠시 연결이 원활하지 않습니다. 안내 데스크에서 도와드리겠습니다.', handoffRecommended:true }]); setOffline(true); }
    finally { setBusy(false); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void send(input); };
  // 직원 호출은 대화 메시지가 아니라 접수 데스크 대기열에 쌓이는 요청이다.
  const callStaff = async (question?: string) => {
    if (!sessionId || calling) return;
    setCalling(true);
    try {
      await handoffApi.requestFromKiosk(sessionId, question);
      setMessages((m) => [...m, { sender: 'assistant', content: '접수 데스크에 직원 호출을 전달했습니다. 잠시만 기다려 주세요.' }]);
    } catch {
      setMessages((m) => [...m, { sender: 'assistant', content: '직원 호출을 전달하지 못했습니다. 접수 데스크로 직접 문의해 주세요.' }]);
    } finally {
      setCalling(false);
    }
  };
  const reset = async () => { if (sessionId) await fetch(`${API}/api/kiosk/sessions/${sessionId}/finish`, { method:'POST' }).catch(() => {}); setMessages([{ sender:'assistant', content:'새 안내를 시작합니다. 무엇을 도와드릴까요?' }]); await start(); };
  const lastPatientQuestion = useMemo(() => [...messages].reverse().find((m) => m.sender === 'patient')?.content, [messages]);
  const lastQuick = useMemo(() => messages.at(-1)?.quickReplies ?? starters, [messages]);
  return <>
    <PageHeader>
      <Bot className="size-4 text-brand-primary" />
      <span className="text-[14px] font-bold tracking-tight text-text-primary">챗봇</span>
      <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${offline ? 'bg-surface-muted text-text-muted' : 'bg-brand-glass text-brand-primary'}`}>
        {offline ? '연결 확인 중' : '안내 가능'}
      </span>
      <button
        type="button"
        onClick={() => void reset()}
        title="대화 새로 시작"
        aria-label="대화 새로 시작"
        className="ui-icon-button ml-auto h-7 w-7 shrink-0"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </PageHeader>

    <div className="min-h-0 flex-1 overflow-y-auto">
    <main className="kiosk-shell is-embedded">
    <section className="hero"><div><p className="eyebrow">여의도 튼튼척의원</p><h1>무엇을 도와드릴까요?</h1><p>진료시간, 의료진, 진료비와 오시는 길을 안내해 드립니다.</p></div><Stethoscope size={70} strokeWidth={1.3}/></section>
    <section className="chat-card"><div className="messages">{messages.map((m, i) => <div className={`message-row ${m.sender}`} key={i}><div className="bubble">{m.content.split('\n').map((line,j)=><span key={j}>{line}{j < m.content.split('\n').length-1 && <br/>}</span>)}{m.handoffRecommended && <button className="handoff" disabled={calling} onClick={() => void callStaff(lastPatientQuestion) }><PhoneCall size={16}/> 직원 호출 요청</button>}</div></div>)}{busy && <div className="message-row assistant"><div className="bubble typing">안내를 준비하고 있습니다…</div></div>}</div><div className="quick-replies">{lastQuick.slice(0,6).map((q) => <button key={q} onClick={() => void send(q)}>{q}<ArrowUp size={15}/></button>)}</div><form onSubmit={submit} className="composer"><MessageCircle size={22}/><input value={input} onChange={e=>setInput(e.target.value)} placeholder="궁금한 내용을 입력해 주세요"/><button disabled={!input.trim() || busy} aria-label="보내기"><Send size={20}/></button></form></section>
    <footer><Clock3 size={18}/> 안내가 필요하면 화면의 <b>직원 호출</b>을 눌러 주세요. <span>개인정보를 입력하지 마세요.</span></footer>
    </main>
    </div>
  </>;
}
