import { create } from "zustand";
import { setSessionExpiredHandler, tokenStorage } from "../../shared/api/client";
import * as authApi from "./api";
import type { StaffUser } from "./api";

type AuthState = {
  user: StaffUser | null;
  /** 앱 시작 시 저장된 토큰으로 세션을 복구하는 동안 true. */
  restoring: boolean;
  /** 사용 중 세션이 끊겨 로그인 화면으로 되돌아온 경우 true. 로그인 화면 안내 문구용. */
  sessionExpired: boolean;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  restoring: true,
  sessionExpired: false,

  async restore() {
    if (!tokenStorage.access() && !tokenStorage.refresh()) {
      set({ user: null, restoring: false });
      return;
    }
    try {
      set({ user: await authApi.me(), restoring: false, sessionExpired: false });
    } catch {
      tokenStorage.clear();
      set({ user: null, restoring: false });
    }
  },

  async signIn(email, password) {
    set({ user: await authApi.login(email, password), sessionExpired: false });
  },

  async signOut() {
    await authApi.logout();
    set({ user: null, sessionExpired: false });
  },
}));

/**
 * 토큰 재발급까지 실패하면 어떤 화면에서 요청했든 로그인 화면으로 돌린다.
 * (모듈 안에서 "유효하지 않은 토큰입니다." 만 띄우고 멈춰 있던 문제를 막는다.)
 */
setSessionExpiredHandler(() => {
  const { user, restoring, sessionExpired } = useAuthStore.getState();
  // 앱 시작 시 복구 실패는 restore() 가 처리하므로 안내 문구를 띄우지 않는다.
  const nextExpired = !restoring && user !== null;
  if (user !== null || (!sessionExpired && nextExpired)) {
    useAuthStore.setState({ user: null, sessionExpired: nextExpired });
  }
});
