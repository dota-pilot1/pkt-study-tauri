import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hand, Loader2, PhoneCall } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { handoffApi, type Handoff } from "../../features/handoff/api";
import {
  HANDOFF_ACTIVE_KEY,
  HANDOFF_COMPLETED_KEY,
  useActiveHandoffs,
} from "../../features/handoff/queries";

const TABS = [
  { id: "active", label: "처리 대기" },
  { id: "completed", label: "처리 완료" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * 직원 연결. 환자가 키오스크에서 "직원 호출"을 누르면 여기에 쌓인다.
 * 접수(내가 맡음) → 완료(응대 끝) 두 단계로만 닫는다.
 */
function HandoffModule() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("active");

  const active = useActiveHandoffs();
  const completed = useQuery({
    queryKey: HANDOFF_COMPLETED_KEY,
    queryFn: handoffApi.completed,
    enabled: tab === "completed",
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: HANDOFF_ACTIVE_KEY });
    void queryClient.invalidateQueries({ queryKey: HANDOFF_COMPLETED_KEY });
  };

  const accept = useMutation({ mutationFn: (id: number) => handoffApi.accept(id), onSuccess: invalidate });
  const complete = useMutation({ mutationFn: (id: number) => handoffApi.complete(id), onSuccess: invalidate });

  const query = tab === "active" ? active : completed;
  const rows = query.data ?? [];
  const pendingCount = (active.data ?? []).filter((row) => row.status === "PENDING").length;

  return (
    <>
      <PageHeader>
        <PhoneCall className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">직원 연결</span>
        {pendingCount > 0 && (
          <span className="ml-2 rounded-full bg-brand-glass px-2 py-0.5 text-[11px] font-bold text-brand-primary">
            대기 {pendingCount}건
          </span>
        )}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          <header>
            <h1 className="text-[18px] font-bold tracking-tight text-text-primary">직원 연결 요청</h1>
            <p className="mt-1 text-[12px] text-text-secondary">
              키오스크에서 해결하지 못한 문의입니다. 응대를 시작하면 접수, 끝나면 완료로 표시해 주세요.
            </p>
          </header>

          <div role="tablist" aria-label="요청 상태" className="mt-5 flex gap-1 border-b border-surface-border-soft">
            {TABS.map((item) => {
              const isActive = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(item.id)}
                  className={
                    "relative shrink-0 px-3 py-2.5 text-[12px] font-bold transition-colors " +
                    (isActive ? "text-brand-primary" : "text-text-muted hover:text-text-primary")
                  }
                >
                  {item.label}
                  {isActive && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-primary" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-2.5">
            {query.isPending ? (
              <div className="grid place-items-center py-16 text-text-muted">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : query.isError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] font-semibold text-destructive">
                {query.error instanceof Error ? query.error.message : "요청을 불러오지 못했습니다."}
              </p>
            ) : rows.length === 0 ? (
              <p className="rounded-lg border border-surface-border-soft bg-surface-raised px-4 py-10 text-center text-[13px] font-semibold text-text-muted">
                {tab === "active" ? "대기 중인 직원 연결 요청이 없습니다." : "처리 완료된 요청이 없습니다."}
              </p>
            ) : (
              rows.map((row) => (
                <HandoffCard
                  key={row.id}
                  handoff={row}
                  busy={accept.isPending || complete.isPending}
                  onAccept={() => accept.mutate(row.id)}
                  onComplete={() => complete.mutate(row.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function HandoffCard({
  handoff,
  busy,
  onAccept,
  onComplete,
}: {
  handoff: Handoff;
  busy: boolean;
  onAccept: () => void;
  onComplete: () => void;
}) {
  const pending = handoff.status === "PENDING";
  const done = handoff.status === "COMPLETED";

  return (
    <article
      className={
        "rounded-lg border bg-surface-raised px-4 py-3.5 " +
        (pending ? "border-brand-border" : "border-surface-border-soft")
      }
    >
      <div className="flex items-center gap-2">
        <StatusBadge status={handoff.status} />
        <span className="text-[11px] font-semibold text-text-muted tabular-nums">
          {formatRequestedAt(handoff.requestedAt)}
        </span>
        {handoff.acceptedByName && (
          <span className="text-[11px] font-semibold text-text-muted">· {handoff.acceptedByName} 접수</span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {pending && (
            <button type="button" onClick={onAccept} disabled={busy} className="ui-icon-button-brand h-7 gap-1.5 px-2.5 text-[12px] font-bold disabled:opacity-60">
              <Hand className="size-3.5" /> 접수
            </button>
          )}
          {!done && (
            <button type="button" onClick={onComplete} disabled={busy} className="ui-icon-button h-7 gap-1.5 px-2.5 text-[12px] font-bold disabled:opacity-60">
              <Check className="size-3.5" /> 완료
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-[13px] font-semibold text-text-primary">
        {handoff.lastQuestion ?? "환자가 직원 호출 버튼을 눌렀습니다."}
      </p>
      {handoff.reason && <p className="mt-1 text-[12px] text-text-secondary">사유: {handoff.reason}</p>}
    </article>
  );
}

function StatusBadge({ status }: { status: Handoff["status"] }) {
  const style =
    status === "PENDING"
      ? "bg-brand-primary text-text-on-brand"
      : status === "ACCEPTED"
        ? "bg-brand-glass text-brand-primary"
        : "bg-surface-muted text-text-muted";
  const label = status === "PENDING" ? "대기" : status === "ACCEPTED" ? "접수" : "완료";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${style}`}>{label}</span>;
}

/** 접수 데스크는 "몇 분 전"이 가장 빨리 읽힌다. 하루가 지나면 날짜로 바꾼다. */
function formatRequestedAt(iso: string): string {
  const requested = new Date(iso);
  const minutes = Math.floor((Date.now() - requested.getTime()) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return requested.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default HandoffModule;
