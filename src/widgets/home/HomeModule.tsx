import { useState } from "react";
import { ArrowRight, BookOpenText, Code2, Database, GraduationCap, LayoutDashboard, Server, Settings2, Workflow } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import type { StaffViewId } from "../../shared/config/app-modules";

const noteSpaces: Array<{ id: StaffViewId; title: string; description: string; icon: typeof BookOpenText }> = [
  { id: "backend-playbook", title: "백엔드 노트", description: "Spring Boot, Java, API, DDD와 서버 구현 기록", icon: Server },
  { id: "spring-boot-playbook", title: "Spring Boot 노트", description: "공통 에러 처리, 예외 응답, Validation과 Spring 서버 패턴 기록", icon: Server },
  { id: "frontend-playbook", title: "프론트 노트", description: "Next.js, React, FSD와 화면 구현 기록", icon: Workflow },
  { id: "react-playbook", title: "모던 리액트 스킬", description: "Hooks, 상태 관리, 렌더링 최적화와 모던 React 패턴", icon: Code2 },
  { id: "uiux-playbook", title: "리액트 컴퍼넌트 설계", description: "공통 컴포넌트와 화면 조립·사용법 설계 기록", icon: Settings2 },
  { id: "db-playbook", title: "DB 테이블 설계", description: "PostgreSQL, ERD, JPA와 데이터 모델 기록", icon: Database },
  { id: "pkt-front-lev1", title: "PKT Front Lev1", description: "PKT React 실습 30개와 구현 과정을 기록", icon: GraduationCap },
];

const learningGoals = [
  ["LOT 목록 테이블 만들기", "map, component, props"],
  ["LOT 상태별 Badge 표시", "조건부 렌더링"],
  ["LOT 클릭 → 상세 패널 출력", "useState"],
  ["LOT명/ID 검색", "controlled input"],
  ["공정 상태 필터", "filter, Select"],
  ["날짜 범위 조회조건", "DatePicker, 상태관리"],
  ["LOT 등록 Form", "RHF 기초"],
  ["필수값/형식 검증", "Zod + RHF"],
  ["LOT 수정 Modal", "Dialog, Form 재사용"],
  ["삭제 확인 Dialog", "UX + mutation 기초"],
  ["LOT Master → 공정이력 Detail", "Master/Detail 패턴"],
  ["공정이력 Timeline", "배열 렌더링/컴포넌트 설계"],
  ["공정이력 테이블 정렬", "sorting"],
  ["컬럼 숨김/표시", "table state"],
  ["페이지네이션", "server pagination"],
  ["서버 데이터 조회", "TanStack Query"],
  ["조건 변경 시 자동 재조회", "queryKey 설계"],
  ["LOT 수정 후 목록 자동 갱신", "mutation + invalidate"],
  ["Loading/Skeleton/Error UI", "비동기 UX"],
  ["검색조건 URL 유지", "searchParams"],
  ["LOT → Wafer → 공정이력 Drill-down", "계층 UI"],
  ["설비 목록 + 가동상태 Dashboard", "카드 + 집계"],
  ["설비 상태 실시간 갱신", "SSE/WebSocket"],
  ["이상 상태 발생 시 Alert 표시", "실시간 이벤트 처리"],
  ["대량 테이블 10,000건 렌더링", "virtualization"],
  ["LOT 여러 개 체크 후 일괄처리", "row selection"],
  ["사용자별 버튼 권한 처리", "RBAC"],
  ["조회조건 Zustand 전역 저장", "Zustand"],
  ["Excel 다운로드/업로드 화면", "Blob/File API"],
  ["PKT Mini 프로젝트 완성", "전체 아키텍처 통합"],
] as const;

function HomeModule({ onSelect }: { onSelect: (id: StaffViewId) => void }) {
  const [activeTab, setActiveTab] = useState<"spaces" | "goals">("spaces");

  return (
    <>
      <PageHeader>
        <LayoutDashboard className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">홈</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-6xl px-5 py-6">
          <div className="flex items-center gap-1 border-b border-surface-border-soft">
            <button type="button" onClick={() => setActiveTab("spaces")} className={`border-b-2 px-4 py-3 text-[13px] font-black transition-colors ${activeTab === "spaces" ? "border-brand-primary text-brand-primary" : "border-transparent text-text-muted hover:text-text-primary"}`}>노트 영역</button>
            <button type="button" onClick={() => setActiveTab("goals")} className={`border-b-2 px-4 py-3 text-[13px] font-black transition-colors ${activeTab === "goals" ? "border-brand-primary text-brand-primary" : "border-transparent text-text-muted hover:text-text-primary"}`}>학습 목표</button>
          </div>

          {activeTab === "spaces" ? (
            <section className="mt-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-[14px] font-black text-text-primary">노트 영역</h2><span className="text-[11px] font-bold text-text-muted">서버에 저장 · 어디서나 이어서 작성</span></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {noteSpaces.map(({ id, title, description, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => onSelect(id)} className="group rounded-lg border border-surface-border-soft bg-surface-raised p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-brand-glass text-brand-primary"><Icon className="size-4" /></span><ArrowRight className="mt-1 size-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand-primary" /></div>
                    <p className="mt-4 text-[14px] font-black text-text-primary">{title}</p>
                    <p className="mt-1 text-[12px] font-semibold leading-5 text-text-secondary">{description}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-5 overflow-hidden rounded-lg border border-surface-border-soft bg-surface-raised">
              <div className="flex items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-3">
                <div><h2 className="text-[14px] font-black text-text-primary">React + 모던 프론트 실습 30개</h2><p className="mt-0.5 text-[11px] font-semibold text-text-muted">PKT 화면과 업무 흐름을 기준으로 단계별 구현 역량을 쌓습니다.</p></div>
                <span className="shrink-0 rounded-full bg-brand-glass px-2.5 py-1 text-[11px] font-black text-brand-primary">30개 과제</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-[12px]">
                  <thead className="bg-surface-muted text-[11px] font-black text-text-secondary"><tr><th className="w-14 px-4 py-2.5 text-center">#</th><th className="px-4 py-2.5">실습 과제</th><th className="px-4 py-2.5">핵심 스킬</th></tr></thead>
                  <tbody>{learningGoals.map(([task, skill], index) => <tr key={task} className="border-t border-surface-border-soft transition-colors hover:bg-brand-glass/40"><td className="px-4 py-2.5 text-center font-black tabular-nums text-text-muted">{index + 1}</td><td className="px-4 py-2.5 font-bold text-text-primary">{task}</td><td className="px-4 py-2.5 font-semibold text-text-secondary">{skill}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default HomeModule;
