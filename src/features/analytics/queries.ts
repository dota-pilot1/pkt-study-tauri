import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "./api";

export const KIOSK_SUMMARY_KEY = ["kiosk-analytics", "summary"];

/** 홈 지표. 환자 응대 중에도 숫자가 흐르므로 주기적으로 다시 받는다. */
export function useKioskSummary() {
  return useQuery({
    queryKey: KIOSK_SUMMARY_KEY,
    queryFn: analyticsApi.summary,
    refetchInterval: 60_000,
  });
}
