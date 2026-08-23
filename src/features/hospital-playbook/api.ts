import { request } from "../../shared/api/client";

export type DocumentStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type PlaybookSearchScope = "all" | "category" | "topic" | "document";
export type PlaybookDomain = "BACKEND" | "SPRING_BOOT" | "FRONTEND" | "REACT" | "UIUX" | "DB" | "AX" | "TDD" | "RAG" | "SECURITY" | "DEVOPS" | "PKT_FRONT_LEV1";
export type PlaybookSpace = { id: number; code: string; name: string };

export type PlaybookDocumentSummary = {
  id: number;
  topicId: number;
  parentId: number | null;
  title: string;
  status: DocumentStatus;
  useForChatbot: boolean;
  orderIdx: number;
  version: number;
};

export type PlaybookSearchResult = {
  id: number;
  categoryId: number;
  categoryTitle: string;
  topicId: number;
  topicTitle: string;
  parentId: number | null;
  title: string;
  status: DocumentStatus;
  updatedAt: string;
};

export type PlaybookDocument = PlaybookDocumentSummary & {
  content: string;
  createdBy: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  updatedAt: string;
};

export type PlaybookDocumentComment = {
  id: number;
  documentId: number;
  parentId: number | null;
  title: string | null;
  content: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PlaybookTopic = {
  id: number;
  categoryId: number;
  title: string;
  orderIdx: number;
  documents: PlaybookDocumentSummary[];
};

export type PlaybookCategory = {
  id: number;
  title: string;
  orderIdx: number;
  topics: PlaybookTopic[];
};

const BASE = "/api/hospital-playbook";

export const playbookApi = {
  spaces: () => request<PlaybookSpace[]>(`${BASE}/spaces`, { errorMessage: "플레이북 목록을 불러오지 못했습니다." }),

  createSpace: (code: string, name: string) =>
    request<PlaybookSpace>(`${BASE}/spaces`, {
      method: "POST",
      body: { code, name },
      errorMessage: "플레이북을 만들지 못했습니다.",
    }),

  renameSpace: (id: number, name: string) =>
    request<PlaybookSpace>(`${BASE}/spaces/${id}`, {
      method: "PATCH",
      body: { name },
      errorMessage: "플레이북 이름을 바꾸지 못했습니다.",
    }),

  deleteSpace: (id: number) =>
    request<void>(`${BASE}/spaces/${id}`, { method: "DELETE", errorMessage: "플레이북을 삭제하지 못했습니다." }),

  tree: (domain: PlaybookDomain) => request<PlaybookCategory[]>(`${BASE}?spaceCode=${domain}`, { errorMessage: "플레이북을 불러오지 못했습니다." }),

  document: (id: number) =>
    request<PlaybookDocument>(`${BASE}/documents/${id}`, { errorMessage: "문서를 불러오지 못했습니다." }),

  search: (keyword: string, domain: PlaybookDomain) =>
    request<PlaybookSearchResult[]>(`${BASE}/search?q=${encodeURIComponent(keyword)}&scope=document&spaceCode=${domain}`, {
      errorMessage: "노트 검색에 실패했습니다.",
    }),

  shareDocument: (id: number) =>
    request<{ token: string }>(`${BASE}/documents/${id}/share`, {
      method: "POST",
      errorMessage: "공유 링크를 만들지 못했습니다.",
    }),

  issueAiEditToken: (id: number) =>
    request<{ token: string; documentId: number; expectedVersion: number; expiresAt: string }>(`${BASE}/documents/${id}/ai-edit-token`, {
      method: "POST",
      errorMessage: "AI 편집 토큰을 만들지 못했습니다. 작성자 또는 관리자만 발급할 수 있습니다.",
    }),

  createCategory: (domain: PlaybookDomain, title: string) =>
    request<PlaybookCategory>(`${BASE}/categories?spaceCode=${domain}`, {
      method: "POST",
      body: { title },
      errorMessage: "영역을 만들지 못했습니다.",
    }),

  renameCategory: (id: number, title: string) =>
    request<PlaybookCategory>(`${BASE}/categories/${id}`, {
      method: "PATCH",
      body: { title },
      errorMessage: "영역 이름을 바꾸지 못했습니다.",
    }),

  deleteCategory: (id: number) =>
    request<void>(`${BASE}/categories/${id}`, { method: "DELETE", errorMessage: "영역을 삭제하지 못했습니다." }),

  reorderCategories: (ids: number[]) =>
    request<void>(`${BASE}/categories/reorder`, {
      method: "POST",
      body: { ids },
      errorMessage: "영역 순서를 저장하지 못했습니다.",
    }),

  createTopic: (categoryId: number, title: string) =>
    request<PlaybookTopic>(`${BASE}/categories/${categoryId}/topics`, {
      method: "POST",
      body: { title },
      errorMessage: "주제를 만들지 못했습니다.",
    }),

  renameTopic: (id: number, title: string) =>
    request<PlaybookTopic>(`${BASE}/topics/${id}`, {
      method: "PATCH",
      body: { title },
      errorMessage: "주제 이름을 바꾸지 못했습니다.",
    }),

  deleteTopic: (id: number) =>
    request<void>(`${BASE}/topics/${id}`, { method: "DELETE", errorMessage: "주제를 삭제하지 못했습니다." }),

  reorderTopics: (categoryId: number, ids: number[]) =>
    request<void>(`${BASE}/categories/${categoryId}/topics/reorder`, {
      method: "POST",
      body: { ids },
      errorMessage: "주제 순서를 저장하지 못했습니다.",
    }),

  createDocument: (topicId: number, title: string, parentId: number | null = null) =>
    request<PlaybookDocument>(`${BASE}/topics/${topicId}/documents`, {
      method: "POST",
      body: { title, parentId },
      errorMessage: "문서를 만들지 못했습니다.",
    }),

  updateDocument: (id: number, patch: { title?: string; content?: string; useForChatbot?: boolean; parentId?: number | null }) =>
    request<PlaybookDocument>(`${BASE}/documents/${id}`, {
      method: "PATCH",
      body: patch,
      errorMessage: "문서를 저장하지 못했습니다.",
    }),

  approveDocument: (id: number) =>
    request<PlaybookDocument>(`${BASE}/documents/${id}/approve`, {
      method: "POST",
      errorMessage: "문서를 승인하지 못했습니다.",
    }),

  deleteDocument: (id: number) =>
    request<void>(`${BASE}/documents/${id}`, { method: "DELETE", errorMessage: "문서를 삭제하지 못했습니다." }),

  comments: (documentId: number) =>
    request<PlaybookDocumentComment[]>(`${BASE}/documents/${documentId}/comments`, { errorMessage: "댓글을 불러오지 못했습니다." }),

  createComment: (documentId: number, body: { title?: string; content: string; parentId?: number | null }) =>
    request<PlaybookDocumentComment[]>(`${BASE}/documents/${documentId}/comments`, {
      method: "POST",
      body,
      errorMessage: "댓글을 등록하지 못했습니다.",
    }),

  updateComment: (id: number, body: { title?: string; content: string }) =>
    request<PlaybookDocumentComment[]>(`${BASE}/comments/${id}`, {
      method: "PATCH",
      body,
      errorMessage: "댓글을 수정하지 못했습니다.",
    }),

  deleteComment: (id: number) =>
    request<void>(`${BASE}/comments/${id}`, { method: "DELETE", errorMessage: "댓글을 삭제하지 못했습니다." }),

  reorderDocuments: (topicId: number, ids: number[], parentId: number | null = null) =>
    request<void>(`${BASE}/topics/${topicId}/documents/reorder`, {
      method: "POST",
      body: { ids, parentId },
      errorMessage: "문서 순서를 저장하지 못했습니다.",
    }),
};
