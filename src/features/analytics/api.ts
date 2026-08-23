import { request } from "../../shared/api/client";

export type UnansweredQuestion = { question: string; count: number };

export type KioskSummary = {
  todaySessions: number;
  todayQuestions: number;
  todayUnanswered: number;
  /** 질문이 한 건도 없으면 서버가 null 을 준다(0% 로 오해하지 않도록). */
  answeredRate: number | null;
  pendingHandoffs: number;
  todayHandoffs: number;
  unansweredWindowDays: number;
  topUnanswered: UnansweredQuestion[];
};

export const analyticsApi = {
  summary: () =>
    request<KioskSummary>("/api/kiosk/manage/analytics/summary", {
      errorMessage: "오늘 현황을 불러오지 못했습니다.",
    }),
};
