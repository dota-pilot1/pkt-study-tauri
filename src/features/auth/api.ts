import { request, tokenStorage } from "../../shared/api/client";

export type StaffUser = {
  id: number;
  email: string;
  username: string;
  role: { id: number; code: string; name: string } | null;
  permissions: string[];
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSec: number;
  user: StaffUser;
};

export async function login(email: string, password: string): Promise<StaffUser> {
  const data = await request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    skipRefresh: true,
    errorMessage: "이메일 또는 비밀번호가 올바르지 않습니다.",
  });
  tokenStorage.save(data.accessToken, data.refreshToken);
  return data.user;
}

export function me() {
  return request<StaffUser>("/api/auth/me", { errorMessage: "로그인 정보를 확인하지 못했습니다." });
}

export async function logout() {
  try {
    await request<void>("/api/auth/logout", { method: "POST" });
  } finally {
    // 서버 호출이 실패해도 로컬 토큰은 반드시 지운다
    tokenStorage.clear();
  }
}
