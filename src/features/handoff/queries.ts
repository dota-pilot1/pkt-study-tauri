import { useQuery } from "@tanstack/react-query";
import { handoffApi } from "./api";

export const HANDOFF_ACTIVE_KEY = ["kiosk-handoff", "active"];
export const HANDOFF_COMPLETED_KEY = ["kiosk-handoff", "completed"];

/**
 * 처리 대기 중인 직원 연결 요청.
 * 환자는 언제든 호출 버튼을 누르므로, 화면을 안 보고 있어도 주기적으로 새로 받아 배지에 반영한다.
 */
export function useActiveHandoffs(enabled = true) {
  return useQuery({
    queryKey: HANDOFF_ACTIVE_KEY,
    queryFn: handoffApi.active,
    refetchInterval: 20_000,
    enabled,
  });
}

export function usePendingHandoffCount(enabled = true): number {
  const active = useActiveHandoffs(enabled);
  return (active.data ?? []).filter((handoff) => handoff.status === "PENDING").length;
}
