import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clipboard, ExternalLink, Link2, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { writeText as writeClipboardText } from "@tauri-apps/plugin-clipboard-manager";
import type { PlaybookDocument } from "../../features/hospital-playbook/api";
import { playbookApi } from "../../features/hospital-playbook/api";
import { lexicalToMarkdown } from "../../features/hospital-playbook/lexicalToMarkdown";
import { ApiError, getApiBase } from "../../shared/api/client";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { useToast } from "../../shared/ui/toast";
import DocumentComments from "./DocumentComments";
import DocumentPane from "./DocumentPane";
import AiEditConnectionDialog from "./AiEditConnectionDialog";

const DRAWER_SIZE_KEY = "pkt-study-document-drawer-size";
const DRAWER_SIZES = [
  { label: "S", value: 40 },
  { label: "M", value: 60 },
  { label: "L", value: 80 },
  { label: "XL", value: 92 },
] as const;

async function copyToClipboard(value: string) {
  try {
    await writeClipboardText(value);
    return;
  } catch {
    // 웹 개발 서버에서는 Tauri 플러그인이 없을 수 있어 브라우저 방식으로 보완한다.
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("CLIPBOARD_UNAVAILABLE");
}

function storedDrawerSize() {
  const value = Number(window.localStorage.getItem(DRAWER_SIZE_KEY));
  return DRAWER_SIZES.some((size) => size.value === value) ? value : 60;
}

/** 문서를 읽고 같은 드로어 안에서 바로 수정할 수 있는 우측 드로어. */
function DocumentDrawer({
  document,
  previous,
  next,
  onNavigate,
  onDelete,
  onClose,
  onOpenPage,
  onChanged,
  deleting = false,
  deleteError,
}: {
  document: PlaybookDocument;
  previous?: PlaybookDocument;
  next?: PlaybookDocument;
  onNavigate: (document: PlaybookDocument) => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenPage?: () => void;
  onChanged: () => void;
  deleting?: boolean;
  deleteError?: string;
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [drawerSize, setDrawerSize] = useState(storedDrawerSize);
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isIssuingAiToken, setIsIssuingAiToken] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [aiContentCopied, setAiContentCopied] = useState(false);
  const [aiEditConnection, setAiEditConnection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClosing(false);
    setIsEditing(false);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
    setSearchMatchCount(0);
    setAiEditConnection(null);
  }, [document.id]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
    setSearchMatchCount(0);
  };

  const openSearch = () => {
    if (isEditing || !document.content.trim()) return;
    setSearchOpen(true);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const selectSearchMatch = (index: number) => {
    if (!searchMatchCount) return;
    setSearchMatchIndex((index + searchMatchCount) % searchMatchCount);
  };

  const moveSearchMatch = (direction: 1 | -1) => {
    selectSearchMatch(searchMatchIndex + direction);
  };

  const copyShareLink = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const { token } = await playbookApi.shareDocument(document.id);
      const url = `${getApiBase()}/api/public/hospital-playbook/documents/${token}`;
      await copyToClipboard(url);
      setShareCopied(true);
      showToast("공유 링크를 복사했습니다.");
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (error) {
      showToast(error instanceof ApiError ? `공유 링크 발급 실패: ${error.message}` : "클립보드에 복사하지 못했습니다.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const copyAiEditConnection = async () => {
    if (isIssuingAiToken) return;
    setIsIssuingAiToken(true);
    try {
      const issued = await playbookApi.issueAiEditToken(document.id);
      const apiBase = getApiBase();
      const endpoint = `${apiBase}/api/public/hospital-playbook/ai-edit/documents/${issued.documentId}`;
      const documentRole = document.parentId === null ? "2차 주제 본문 문서(전체 TODO 계획)" : "TODO 하위 문서(이 TODO의 Step 1~N)";
      const connection = [
        "PKT 2차 주제 개별 문서 편집 API FOR LLM",
        `documentId: ${issued.documentId}`,
        `documentTitle: ${document.title}`,
        `documentRole: ${documentRole}`,
        `parentId: ${document.parentId ?? "null"}`,
        `expectedVersion: ${issued.expectedVersion}`,
        `expiresAt: ${issued.expiresAt}`,
        "",
        "이 토큰은 현재 documentId 하나만 조회·수정합니다.",
        "다른 문서 생성·삭제·정렬은 2차 주제 전체 노트 관리 API를 사용합니다.",
        document.parentId === null
          ? "현재 문서는 본문 문서입니다. 전체 목표와 TODO 1~N 계획만 작성하고 Step 상세는 하위 문서로 분리합니다."
          : "현재 문서는 TODO 하위 문서입니다. 이 문서 안에서 해당 TODO의 Step 1~N을 순서대로 작성합니다.",
        "",
        `GET ${endpoint}`,
        `PATCH ${endpoint}`,
        "Authorization: Bearer <TOKEN>",
        `TOKEN: ${issued.token}`,
        "",
        'PATCH body: {"title":"수정 제목","content":"수정 본문","expectedVersion":<CURRENT_VERSION>}',
        "",
        "CONTENT FORMAT:",
        "content는 Markdown·HTML이 아닌 Lexical EditorState를 JSON.stringify한 문자열입니다.",
        "GET으로 기존 문서 전체를 조회한 뒤 root 구조와 노드를 유지하면서 title·content 전체를 PATCH합니다.",
        "일반 본문은 paragraph, 제목은 heading, 목록은 list/listitem, 설명 묶음은 quote 노드를 사용합니다.",
        "각 섹션은 heading → quote 설명 → 필요 시 파일 경로 code(language: text) → 실제 코드 code(language: java·typescript·tsx·bash·json) 순서로 작성합니다.",
        "code 노드 children에는 type: code-highlight를 두고 실제 원문을 child text에 넣습니다.",
        "섹션 사이에는 children: []인 빈 paragraph 2개를 두고 목록 항목 사이에는 빈 paragraph를 넣지 않습니다.",
        "content에 일반 텍스트·Markdown·HTML을 직접 넣지 말고, 수정 전 최신 version을 expectedVersion에 사용합니다.",
        "이 토큰은 해당 문서에 한 번 저장한 뒤 폐기됩니다.",
      ].join("\n");
      setAiEditConnection(connection);
    } catch (error) {
      showToast(error instanceof ApiError ? `AI 편집 토큰 발급 실패: ${error.message}` : "AI 편집 정보를 클립보드에 복사하지 못했습니다.", "error");
    } finally {
      setIsIssuingAiToken(false);
    }
  };

  const copyAiContent = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const { token } = await playbookApi.shareDocument(document.id);
      const url = `${getApiBase()}/api/public/hospital-playbook/documents/${token}`;
      const markdown = lexicalToMarkdown(document.content);
      await copyToClipboard([`# ${document.title}`, "", markdown, "", "---", `원문 API: ${url}`].join("\n"));
      setAiContentCopied(true);
      showToast("AI용 Markdown 내용을 복사했습니다.");
      window.setTimeout(() => setAiContentCopied(false), 1800);
    } catch (error) {
      showToast(error instanceof ApiError ? `AI용 내용 발급 실패: ${error.message}` : "AI용 내용을 클립보드에 복사하지 못했습니다.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "f" &&
        !isEditing &&
        document.content.trim()
      ) {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "Escape") {
        if (searchOpen) {
          closeSearch();
          return;
        }
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [document.content, isEditing, searchOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/25 ${
        isClosing ? "animate-drawer-fade-out" : "animate-drawer-fade-in"
      }`}
      onMouseDown={handleClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${document.title} 상세 보기`}
        onMouseDown={(event) => event.stopPropagation()}
        className={`relative flex h-full w-full max-w-[760px] flex-col border-l border-surface-border bg-surface-raised shadow-2xl transition-[width] duration-300 ease-in-out ${
          isClosing ? "animate-drawer-slide-out" : "animate-drawer-slide-in"
        }`}
        style={{ width: `${drawerSize}vw`, maxWidth: "none" }}
      >
        {/* 패널 사이드 일체형 도구 레일 */}
        <div
          className="absolute left-0 top-28 z-20 flex -translate-x-full flex-col items-center rounded-l-xl border border-r-0 border-surface-border bg-surface-raised p-1 shadow-[-4px_0_14px_rgba(0,0,0,0.07)]"
          aria-label="상세 패널 도구"
        >
          <button
            type="button"
            className={`grid size-7.5 place-items-center rounded-lg text-xs font-black transition-all ${
              searchOpen
                ? "border border-emerald-500 bg-white text-emerald-600 shadow-xs scale-105"
                : "border border-transparent text-text-muted hover:bg-surface-muted hover:text-text-primary"
            }`}
            onClick={searchOpen ? closeSearch : openSearch}
            disabled={isEditing || !document.content.trim()}
            title="본문 검색 (⌘/Ctrl+F)"
            aria-label="본문 검색"
            aria-pressed={searchOpen}
          >
            <Search className="size-3.5" />
          </button>
          <div className="my-1 h-px w-5 bg-surface-border-soft" />
          {DRAWER_SIZES.map((size) => {
            const selected = drawerSize === size.value;
            return (
              <button
                key={size.label}
                type="button"
                aria-label={`드로워 크기 ${size.label} (${size.value}%)`}
                title={`너비 ${size.label} (${size.value}%)`}
                aria-pressed={selected}
                onClick={() => {
                  setDrawerSize(size.value);
                  window.localStorage.setItem(DRAWER_SIZE_KEY, String(size.value));
                }}
                className={`grid size-7.5 place-items-center rounded-lg text-xs font-black transition-all ${
                  selected
                    ? "bg-brand-primary text-white shadow-xs scale-105"
                    : "text-text-muted hover:bg-surface-muted hover:text-text-primary"
                }`}
              >
                {size.label}
              </button>
            );
          })}

        </div>
        <header className="flex shrink-0 items-center gap-2 border-b border-surface-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-brand-primary">개발 노트 · {isEditing ? "수정" : "상세 보기"}</p>
            {!isEditing && <h2 className="mt-0.5 truncate text-lg font-black text-text-primary">{document.title}</h2>}
          </div>
          <button
            type="button"
            className={`ui-icon-button size-8 ${isEditing ? "bg-brand-primary text-white" : ""}`}
            onClick={() => {
              closeSearch();
              setIsEditing(true);
            }}
            title="수정"
          >
            <Pencil className="size-4" />
          </button>
          {onOpenPage && <button type="button" className="ui-icon-button size-8" onClick={onOpenPage} title="전체 페이지로 보기">
            <ExternalLink className="size-4" />
          </button>}
          <button type="button" className="ui-icon-button size-8 text-brand-primary" onClick={() => void copyShareLink()} disabled={isSharing} title="로그인 없이 읽는 API 링크 복사">
            {shareCopied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          </button>
          <button type="button" className="ui-icon-button size-8" onClick={() => void copyAiContent()} disabled={isSharing} title="AI용 Markdown 내용 복사">
            {aiContentCopied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
          </button>
              <button type="button" className="ui-icon-button size-8 text-brand-primary" onClick={() => void copyAiEditConnection()} disabled={isIssuingAiToken} title="개별 문서 편집 API for LLM 복사">
            <span className="font-mono text-xs font-black leading-none">{"{}"}</span>
          </button>
          <button type="button" className="ui-icon-button size-8 text-destructive" onClick={() => setDeleteConfirmOpen(true)} title="삭제">
            <Trash2 className="size-4" />
          </button>
          <button type="button" className="ui-icon-button size-8" onClick={handleClose} title="닫기">
            <X className="size-4" />
          </button>
        </header>

        {searchOpen && !isEditing && (
          <div className="flex shrink-0 items-center gap-2 border-b border-surface-border-soft bg-surface-muted px-5 py-2">
            <Search className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchMatchIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeSearch();
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  moveSearchMatch(event.shiftKey ? -1 : 1);
                }
              }}
              placeholder="본문에서 검색"
              aria-label="본문에서 검색"
              className="h-8 min-w-0 flex-1 bg-transparent text-xs font-semibold text-text-primary outline-none placeholder:text-text-muted"
            />
            <span className="shrink-0 text-[11px] font-bold text-text-muted">{searchMatchCount ? `${searchMatchIndex + 1}/${searchMatchCount}` : "0/0"}</span>
            <button type="button" onClick={() => moveSearchMatch(-1)} disabled={!searchMatchCount} className="ui-icon-button size-7 disabled:opacity-35" title="이전 검색 결과" aria-label="이전 검색 결과"><ChevronUp className="size-3.5" /></button>
            <button type="button" onClick={() => moveSearchMatch(1)} disabled={!searchMatchCount} className="ui-icon-button size-7 disabled:opacity-35" title="다음 검색 결과" aria-label="다음 검색 결과"><ChevronDown className="size-3.5" /></button>
            <button type="button" onClick={closeSearch} className="ui-icon-button size-7" title="검색 닫기" aria-label="검색 닫기"><X className="size-3.5" /></button>
          </div>
        )}

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-5">
          {isEditing ? (
            <DocumentPane documentId={document.id} onChanged={onChanged} onCancel={() => setIsEditing(false)} />
          ) : document.content.trim() ? (
            <div className="overflow-hidden rounded-lg border border-surface-border-soft bg-white">
              <LexicalEditor
                key={document.id}
                initialState={document.content}
                onChange={() => undefined}
                readOnly
                minHeight="240px"
                searchQuery={searchOpen ? searchQuery : ""}
                searchMatchIndex={searchMatchIndex}
                searchContainerRef={contentRef}
                onSearchMatchesChange={setSearchMatchCount}
              />
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-surface-border bg-surface-muted px-6 text-center">
              <div>
                <p className="text-sm font-black text-text-primary">아직 작성된 내용이 없습니다.</p>
                <p className="mt-1 text-xs font-semibold text-text-muted">상단의 수정 버튼을 눌러 학습 내용을 작성하세요.</p>
              </div>
            </div>
          )}
          <p className="mt-3 text-right text-[11px] font-semibold text-text-muted">
            마지막 수정 {new Date(document.updatedAt).toLocaleString("ko-KR")}
          </p>
          <DocumentComments documentId={document.id} />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-surface-border px-4 py-3">
          <button
            type="button"
            className="ui-icon-button h-9 gap-1.5 px-3 text-xs font-black disabled:opacity-35"
            onClick={() => previous && onNavigate(previous)}
            disabled={isEditing || !previous}
          >
            <ChevronLeft className="size-4" /> 이전 문서
          </button>
          <button
            type="button"
            className="ui-icon-button h-9 gap-1.5 px-3 text-xs font-black disabled:opacity-35"
            onClick={() => next && onNavigate(next)}
            disabled={isEditing || !next}
          >
            다음 문서 <ChevronRight className="size-4" />
          </button>
        </footer>

      {deleteConfirmOpen && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/30 p-5">
            <div className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-raised p-5 shadow-xl">
              <h3 className="text-base font-black text-text-primary">문서를 삭제할까요?</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                <strong>{document.title}</strong> 문서와 하위 문서, 댓글을 함께 삭제합니다. 삭제 후 복구할 수 없습니다.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="ui-icon-button h-9 px-3 text-xs font-black">취소</button>
                <button type="button" disabled={deleting} onClick={onDelete} className="ui-icon-button-danger h-9 px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
              {deleteError && <p className="mt-3 text-xs font-bold text-destructive">{deleteError}</p>}
            </div>
          </div>
        )}
      </aside>
      {aiEditConnection && <AiEditConnectionDialog connection={aiEditConnection} documentTitle={document.title} isChildDocument={document.parentId !== null} onClose={() => setAiEditConnection(null)} />}
    </div>
  );
}

export default DocumentDrawer;
