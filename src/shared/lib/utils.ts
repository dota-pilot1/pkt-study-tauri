import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// clsx로 조건부 클래스를 합치고 tailwind-merge로 충돌(예: px-3 vs px-4)을 정리.
// shadcn 컴포넌트의 className override가 올바르게 동작하려면 twMerge가 필요하다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
