import { request } from "../../shared/api/client";

export type HandoffStatus = "PENDING" | "ACCEPTED" | "COMPLETED";

export type Handoff = {
  id: number;
  sessionId: string | null;
  status: HandoffStatus;
  reason: string | null;
  lastQuestion: string | null;
  requestedAt: string;
  acceptedBy: number | null;
  acceptedByName: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
};

const MANAGE = "/api/kiosk/manage/handoffs";

export const handoffApi = {
  /** 처리해야 할 요청(대기·접수 중). */
  active: () => request<Handoff[]>(MANAGE, { errorMessage: "직원 연결 요청을 불러오지 못했습니다." }),

  completed: () =>
    request<Handoff[]>(`${MANAGE}?completed=true`, { errorMessage: "처리된 요청을 불러오지 못했습니다." }),

  accept: (id: number) =>
    request<Handoff>(`${MANAGE}/${id}/accept`, { method: "PATCH", errorMessage: "요청을 접수하지 못했습니다." }),

  complete: (id: number) =>
    request<Handoff>(`${MANAGE}/${id}/complete`, { method: "PATCH", errorMessage: "요청을 완료하지 못했습니다." }),

  /** 환자용. 인증 없이 호출되는 키오스크 경로다. */
  requestFromKiosk: (sessionId: string, reason?: string) =>
    request<Handoff>(`/api/kiosk/sessions/${sessionId}/handoff`, {
      method: "POST",
      body: { reason: reason ?? null },
      skipRefresh: true,
      errorMessage: "직원 호출을 접수하지 못했습니다.",
    }),
};
