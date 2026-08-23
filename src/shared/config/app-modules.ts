import { BookOpenText, GraduationCap, LayoutDashboard, type LucideIcon } from "lucide-react";

export type StaffViewId = "home" | "backend-playbook" | "spring-boot-playbook" | "frontend-playbook" | "react-playbook" | "uiux-playbook" | "db-playbook" | "pkt-front-lev1" | "settings" | "profile";

export type StaffModuleDefinition = {
  id: StaffViewId;
  label: string;
  icon: LucideIcon;
  ready: boolean;
};

/** MES 개발 학습 노트의 좌측 레일 메뉴. 서버의 playbook space 코드와 1:1로 대응한다. */
export const STAFF_MODULES: StaffModuleDefinition[] = [
  { id: "home", label: "노트 홈", icon: LayoutDashboard, ready: true },
  { id: "backend-playbook", label: "백엔드 노트", icon: BookOpenText, ready: true },
  { id: "spring-boot-playbook", label: "Spring Boot 노트", icon: BookOpenText, ready: true },
  { id: "frontend-playbook", label: "프론트 노트", icon: BookOpenText, ready: true },
  { id: "react-playbook", label: "모던 리액트 스킬", icon: BookOpenText, ready: true },
  { id: "uiux-playbook", label: "리액트 컴퍼넌트 설계", icon: BookOpenText, ready: true },
  { id: "db-playbook", label: "DB 테이블 설계", icon: BookOpenText, ready: true },
  { id: "pkt-front-lev1", label: "PKT Front Lev1", icon: GraduationCap, ready: true },
];

export const APP_PROFILE = {
  displayName: "PKT 프로젝트",
  hospitalName: "PKT 프로젝트",
} as const;
