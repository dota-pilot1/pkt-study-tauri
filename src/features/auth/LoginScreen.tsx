import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Factory, Loader2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuthStore } from "./auth-store";
import {
  ApiError,
  getApiBase,
  getApiTarget,
  setApiTarget,
  SESSION_EXPIRED_MESSAGE,
  type ApiTarget,
} from "../../shared/api/client";
import { APP_PROFILE } from "../../shared/config/app-modules";
import WindowControls from "../../shared/ui/WindowControls";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// 이 앱은 MES 개발 학습 전용이므로 로컬 서버의 기본 계정을 미리 채운다.
const DEV_ACCOUNT_EMAIL = "terecal@daum.net";
const DEV_ACCOUNT_PASSWORD = "password123";

/** MES 개발 학습 노트 로그인 화면. */
function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const [email, setEmail] = useState(DEV_ACCOUNT_EMAIL);
  const [password, setPassword] = useState(DEV_ACCOUNT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiTarget, setApiTargetState] = useState<ApiTarget>(() => getApiTarget());

  /** 대상 서버를 바꾸면 저장된 토큰 기준이 달라지므로 새로고침으로 상태를 초기화한다. */
  const changeTarget = (target: ApiTarget) => {
    if (target === apiTarget) return;
    setApiTarget(target);
    setApiTargetState(target);
    window.location.reload();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      // 서버 401 문구와 폴백 문구가 같아서, 상태 코드를 같이 보여야 원인이 구분된다.
      if (cause instanceof ApiError) setError(`${cause.message} (HTTP ${cause.status})`);
      else {
        const detail = cause instanceof Error ? cause.message : "알 수 없는 네트워크 오류";
        setError(`로그인 서버에 연결할 수 없습니다. (${getApiBase()}) ${detail}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-surface-muted">
      <header
        className="flex h-12 shrink-0 select-none items-center justify-between border-b border-surface-border-soft bg-surface-raised px-4"
        onMouseDown={(e) => {
          if (!isTauri || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
          void getCurrentWindow().startDragging();
        }}
      >
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          {APP_PROFILE.displayName}
        </span>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-surface-border-soft bg-surface-muted p-0.5 text-[11px] font-bold">
            {(["local", "deploy"] as const).map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => changeTarget(target)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  apiTarget === target
                    ? "bg-brand-primary text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {target === "local" ? "로컬" : "배포"}
              </button>
            ))}
          </div>
          <WindowControls />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-5">
        <form
          onSubmit={submit}
          className="w-full max-w-[380px] rounded-xl border border-surface-border-soft bg-surface-raised p-7 shadow-sm"
        >
          <div className="flex flex-col items-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand-primary text-white shadow-sm">
              <Factory className="size-8" strokeWidth={2.2} />
            </div>
            <h1 className="mt-4 text-xl font-black tracking-tight text-text-primary">
              {APP_PROFILE.hospitalName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-text-secondary">PKT 프로젝트에 로그인하세요</p>
          </div>

          {sessionExpired && !error && (
            <p className="mt-6 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-[13px] font-semibold text-text-secondary">
              {SESSION_EXPIRED_MESSAGE}
            </p>
          )}

          <label className="mt-6 block text-[13px] font-bold text-text-primary" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="ui-input mt-1.5"
          />

          <label className="mt-4 block text-[13px] font-bold text-text-primary" htmlFor="password">
            비밀번호
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-text-muted transition-colors hover:text-text-primary"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="ui-icon-button-brand mt-6 h-10 w-full gap-2 text-sm font-black disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            로그인
          </button>

          <p className="mt-5 text-center text-[12px] font-semibold leading-5 text-text-muted">
            PKT 프로젝트 업무·설계·코드 내용을 서버에 저장합니다.
            <br />
            현재 연결 대상: {getApiBase()}
          </p>
        </form>
      </main>
    </div>
  );
}

export default LoginScreen;
