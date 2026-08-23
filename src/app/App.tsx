import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../features/auth/auth-store";
import LoginScreen from "../features/auth/LoginScreen";
import StaffAppShell from "../widgets/app-shell/StaffAppShell";
import HomeModule from "../widgets/home/HomeModule";
import HospitalPlaybookModule from "../widgets/hospital-playbook/HospitalPlaybookModule";
import SettingsPage from "../widgets/settings/SettingsPage";
import ProfilePage from "../widgets/profile/ProfilePage";
import type { StaffViewId } from "../shared/config/app-modules";
import { ToastProvider } from "../shared/ui/toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function StaffConsole() {
  const [active, setActive] = useState<StaffViewId>("home");

  return (
    <StaffAppShell active={active} onSelect={setActive}>
      {active === "home" ? (
        <HomeModule onSelect={setActive} />
      ) : active === "backend-playbook" ? (
        <HospitalPlaybookModule domain="BACKEND" title="백엔드 노트" />
      ) : active === "spring-boot-playbook" ? (
        <HospitalPlaybookModule domain="SPRING_BOOT" title="Spring Boot 노트" />
      ) : active === "frontend-playbook" ? (
        <HospitalPlaybookModule domain="FRONTEND" title="프론트 노트" />
      ) : active === "react-playbook" ? (
        <HospitalPlaybookModule domain="REACT" title="모던 리액트 스킬" />
      ) : active === "uiux-playbook" ? (
        <HospitalPlaybookModule domain="UIUX" title="리액트 컴퍼넌트 설계" />
      ) : active === "db-playbook" ? (
        <HospitalPlaybookModule domain="DB" title="DB 테이블 설계" />
      ) : active === "pkt-front-lev1" ? (
        <HospitalPlaybookModule domain="PKT_FRONT_LEV1" title="PKT Front Lev1" />
      ) : active === "settings" ? (
        <SettingsPage />
      ) : (
        <ProfilePage />
      )}
    </StaffAppShell>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const restoring = useAuthStore((s) => s.restoring);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  if (restoring) {
    return (
      <div className="grid h-screen place-items-center bg-surface-muted text-text-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        {user ? <StaffConsole /> : <LoginScreen />}
      </QueryClientProvider>
    </ToastProvider>
  );
}
