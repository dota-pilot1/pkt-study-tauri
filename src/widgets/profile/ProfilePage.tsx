import { LogOut, ShieldCheck, User } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { useAuthStore } from "../../features/auth/auth-store";

/** 좌하단 계정 메뉴의 "내 정보". */
function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const displayName = user?.username || user?.email || "직원";

  return (
    <>
      <PageHeader>
        <User className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">내 정보</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-2xl px-5 py-6">
          <div className="flex items-center gap-4 rounded-xl border border-surface-border-soft bg-surface-raised p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-glass text-xl font-black uppercase text-brand-primary">
              {displayName.charAt(0) || "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-text-primary">{displayName}</p>
              <p className="truncate text-[13px] font-semibold text-text-secondary">{user?.email}</p>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3">
              <span className="flex items-center gap-2 text-[13px] font-bold text-text-primary">
                <ShieldCheck className="size-4 text-brand-primary" /> 역할
              </span>
              <span className="text-[13px] font-semibold text-text-secondary">
                {user?.role?.name ?? "직원"}
              </span>
            </div>

            {user && user.permissions.length > 0 && (
              <div className="rounded-md border border-surface-border-soft bg-surface-raised px-4 py-3">
                <p className="text-[13px] font-bold text-text-primary">권한 {user.permissions.length}개</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.permissions.map((code) => (
                    <span
                      key={code}
                      className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] font-bold text-text-muted"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="ui-icon-button mt-4 h-10 w-full gap-2 text-[13px] font-black text-destructive hover:border-destructive"
          >
            <LogOut className="size-4" /> 로그아웃
          </button>
        </div>
      </div>
    </>
  );
}

export default ProfilePage;
