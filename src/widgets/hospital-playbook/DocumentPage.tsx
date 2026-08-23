import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight, FileText, GripVertical, Loader2, MapPin, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { playbookApi, type PlaybookCategory, type PlaybookDocumentSummary } from "../../features/hospital-playbook/api";
import PageHeader from "../../shared/ui/PageHeader";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";

type DocumentRow = { document: PlaybookDocumentSummary; depth: number; indexPath: number[]; visible: boolean };

function sameSet(left: Set<number>, right: Set<number>) {
  return left.size === right.size && [...left].every((id) => right.has(id));
}

function rowsFor(documents: PlaybookDocumentSummary[], collapsed: Set<number>) {
  const children = new Map<number, PlaybookDocumentSummary[]>();
  const roots: PlaybookDocumentSummary[] = [];
  documents.forEach((document) => {
    if (document.parentId === null) roots.push(document);
    else children.set(document.parentId, [...(children.get(document.parentId) ?? []), document]);
  });
  const rows: DocumentRow[] = [];
  const visit = (items: PlaybookDocumentSummary[], depth: number, path: number[] = [], visible = true) => {
    items.forEach((document, index) => {
      const indexPath = [...path, index + 1];
      rows.push({ document, depth, indexPath, visible });
      visit(children.get(document.id) ?? [], depth + 1, indexPath, visible && !collapsed.has(document.id));
    });
  };
  visit(roots, 0);
  return { rows, children };
}

function SortableDocumentRow({
  row,
  activeId,
  collapsed,
  children,
  onToggle,
  onNavigate,
  dropTarget,
}: {
  row: DocumentRow;
  activeId: number;
  collapsed: Set<number>;
  children: Map<number, PlaybookDocumentSummary[]>;
  onToggle: (id: number) => void;
  onNavigate: (id: number) => void;
  dropTarget: boolean;
}) {
  const { document, depth, indexPath, visible } = row;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: document.id,
    animateLayoutChanges: () => true,
  });
  const hasChildren = (children.get(document.id)?.length ?? 0) > 0;
  const isActive = document.id === activeId;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, paddingLeft: `${8 + depth * 22}px` }}
      className={`${visible ? "flex" : "hidden"} min-h-10 items-center gap-1.5 rounded-md pr-2 transition-[transform,background-color,box-shadow,opacity] duration-200 ${isDragging ? "z-10 scale-[1.02] opacity-60 shadow-lg ring-2 ring-brand-border/40" : ""} ${dropTarget ? "bg-brand-glass ring-2 ring-brand-border/60" : ""} ${isActive ? "border-l-2 border-brand-border bg-brand-glass" : "hover:bg-surface-muted"}`}
    >
      <button type="button" {...attributes} {...listeners} className="grid size-5 shrink-0 cursor-grab touch-none place-items-center text-text-muted active:cursor-grabbing" title="드래그하여 같은 단계에서 순서 변경">
        <GripVertical className="size-3.5" />
      </button>
      {hasChildren ? (
        <button type="button" onClick={() => onToggle(document.id)} className="grid size-5 shrink-0 place-items-center text-text-muted" title={collapsed.has(document.id) ? "하위 문서 펼치기" : "하위 문서 접기"}>
          {collapsed.has(document.id) ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      ) : <span className="w-5 shrink-0" />}
      <button type="button" onClick={() => onNavigate(document.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
        <span className="rounded border border-surface-border-soft bg-surface-raised px-1 py-0.5 text-[10px] font-black text-text-muted">{indexPath.join(".")}</span>
        <FileText className={`size-3.5 shrink-0 ${isActive ? "text-brand-primary" : "text-text-muted"}`} />
        <span className={`${isActive ? "text-brand-primary" : "text-text-secondary"} truncate text-xs font-black`}>{document.title}</span>
      </button>
      {hasChildren && <span className="shrink-0 rounded-md bg-surface-raised px-1.5 py-1 text-[10px] font-black text-text-muted">{children.get(document.id)?.length}개</span>}
    </div>
  );
}

/** 목록 화면에서 독립적으로 읽고, 위치를 옮기고, 순서를 조절하는 전체 문서 보기. */
export default function DocumentPage({
  documentId,
  title,
  categoryTitle,
  topicTitle,
  categoryId,
  topicId,
  categories,
  documents,
  onClose,
  onNavigate,
  onChangeLocation,
  onReorder,
  onRefresh,
  onEdit,
  onDelete,
  deleting = false,
  reordering = false,
}: {
  documentId: number;
  title: string;
  categoryTitle: string;
  topicTitle: string;
  categoryId: number;
  topicId: number;
  categories: PlaybookCategory[];
  documents: PlaybookDocumentSummary[];
  onClose: () => void;
  onNavigate: (id: number) => void;
  onChangeLocation: (categoryId: number, topicId: number, documentId: number) => void;
  onReorder: (ids: number[], parentId: number | null) => Promise<unknown>;
  onRefresh: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  deleting?: boolean;
  reordering?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const [locationOpen, setLocationOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [nextCategoryId, setNextCategoryId] = useState(categoryId);
  const [nextTopicId, setNextTopicId] = useState(topicId);
  const document = useQuery({ queryKey: ["hospital-playbook", "document", documentId], queryFn: () => playbookApi.document(documentId) });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { rows, children } = useMemo(() => rowsFor(documents, collapsed), [documents, collapsed]);
  const nextCategory = useMemo(() => categories.find((item) => item.id === nextCategoryId), [categories, nextCategoryId]);
  const nextTopics = nextCategory?.topics ?? [];

  useEffect(() => {
    const parentIds = new Set(documents.flatMap((item) => item.parentId === null ? [] : [item.parentId]));
    setCollapsed((current) => sameSet(current, parentIds) ? current : parentIds);
  }, [topicId, documents]);

  const toggleCollapsed = (id: number) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const openLocation = () => {
    setNextCategoryId(categoryId);
    setNextTopicId(topicId);
    setLocationOpen(true);
  };

  const handleCategory = (id: number) => {
    setNextCategoryId(id);
    setNextTopicId(categories.find((item) => item.id === id)?.topics[0]?.id ?? 0);
  };

  const confirmLocation = () => {
    const nextTopic = nextTopics.find((item) => item.id === nextTopicId);
    const nextDocument = nextTopic?.documents.find((item) => item.parentId === null) ?? nextTopic?.documents[0];
    if (!nextDocument) return;
    setLocationOpen(false);
    onChangeLocation(nextCategoryId, nextTopicId, nextDocument.id);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setOverId(null);
    window.setTimeout(() => setDraggedId(null), 700);
    if (!over || active.id === over.id) return;
    const source = documents.find((item) => item.id === active.id);
    const target = documents.find((item) => item.id === over.id);
    if (!source || !target || source.parentId !== target.parentId) return;
    const siblings = documents.filter((item) => item.parentId === source.parentId);
    const from = siblings.findIndex((item) => item.id === source.id);
    const to = siblings.findIndex((item) => item.id === target.id);
    if (from < 0 || to < 0) return;
    await onReorder(arrayMove(siblings, from, to).map((item) => item.id), source.parentId);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggedId(Number(active.id));
    setOverId(null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) {
      setOverId(null);
      return;
    }
    const source = documents.find((item) => item.id === active.id);
    const target = documents.find((item) => item.id === over.id);
    setOverId(source && target && source.parentId === target.parentId ? Number(over.id) : null);
  };

  const refresh = async () => {
    await document.refetch();
    onRefresh();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageHeader hideRefresh>
        <FileText className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">{title}</span>
        <span className="text-[12px] font-semibold text-text-muted">페이지 보기</span>
        <button type="button" onClick={() => void refresh()} disabled={document.isFetching} className="ui-icon-button ml-1 size-7 disabled:opacity-40" title="문서 새로고침">
          <RefreshCw className={`size-3.5 ${document.isFetching ? "animate-spin" : ""}`} />
        </button>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted p-3">
        <main className="mx-auto grid w-full max-w-[1800px] gap-3 lg:grid-cols-[420px_minmax(0,1fr)]">
          <button type="button" onClick={onClose} className="ui-icon-button h-9 w-fit gap-1.5 border-brand-border px-3 text-xs font-black text-brand-primary hover:bg-brand-glass lg:col-span-2">
            <ArrowLeft className="size-4" /> 목록으로
          </button>
          <aside className="h-fit rounded-lg border border-surface-border bg-surface-raised p-2 shadow-sm lg:sticky lg:top-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-border-soft px-2 py-2">
              <div><h2 className="text-sm font-black text-text-primary">문서 목록</h2><p className="mt-0.5 text-[10px] font-semibold text-text-muted">같은 단계에서 드래그해 순서를 바꿉니다.</p></div>
              <span className="rounded-md bg-surface-muted px-2 py-1 text-[10px] font-black text-text-muted">{rows.length}</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragCancel={() => { setDraggedId(null); setOverId(null); }}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <SortableContext items={rows.map((row) => row.document.id)} strategy={verticalListSortingStrategy}>
                <div className={`mt-2 space-y-1 ${reordering ? "pointer-events-none opacity-60" : ""}`}>
                  {rows.map((row) => <SortableDocumentRow key={row.document.id} row={row} activeId={documentId} collapsed={collapsed} children={children} onToggle={toggleCollapsed} onNavigate={onNavigate} dropTarget={overId === row.document.id} />)}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                {draggedId !== null ? (
                  <div className="flex min-h-10 items-center gap-2 rounded-md border border-brand-border bg-surface-raised px-3 text-xs font-black text-text-primary shadow-xl">
                    <GripVertical className="size-3.5 text-brand-primary" />
                    {documents.find((item) => item.id === draggedId)?.title ?? "문서 이동"}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </aside>
          <section className="min-w-0 overflow-hidden rounded-lg border border-surface-border bg-surface-raised shadow-sm">
            {document.isPending ? <div className="grid min-h-[560px] place-items-center text-text-muted"><Loader2 className="size-6 animate-spin" /></div> : document.isError || !document.data ? <div className="grid min-h-[560px] place-items-center text-sm font-bold text-destructive">문서를 불러오지 못했습니다.</div> : <>
              <header className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                <div className="min-w-0">
                  <button type="button" onClick={openLocation} className="flex items-center gap-1 text-left text-[11px] font-black text-brand-primary hover:underline" title="문서 위치 선택">
                    <MapPin className="size-3.5" /> {categoryTitle} &gt; {topicTitle}
                  </button>
                  <h1 className="mt-1 text-xl font-black text-text-primary">{document.data.title}</h1>
                  <p className="mt-1 text-[11px] font-semibold text-text-muted">최종 수정 {new Date(document.data.updatedAt).toLocaleString("ko-KR")}</p>
                </div>
                <div className="flex shrink-0 gap-1.5"><button type="button" onClick={() => onEdit(documentId)} className="ui-icon-button-brand size-8" title="수정"><Pencil className="size-3.5" /></button><button type="button" onClick={() => onDelete(documentId)} disabled={deleting} className="ui-icon-button size-8 text-destructive disabled:opacity-40" title="삭제"><Trash2 className="size-3.5" /></button></div>
              </header>
              <div className="p-4">{document.data.content.trim() ? <LexicalEditor key={document.data.id} initialState={document.data.content} onChange={() => undefined} readOnly minHeight="620px" /> : <div className="grid min-h-[620px] place-items-center rounded-md border border-dashed border-surface-border bg-surface-muted text-center"><div><p className="font-black text-text-primary">아직 작성된 내용이 없습니다.</p><button type="button" onClick={() => onEdit(documentId)} className="mt-2 text-sm font-black text-brand-primary hover:underline">지금 작성하기</button></div></div>}</div>
            </>}
          </section>
        </main>
      </div>
      {locationOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="문서 위치 선택">
          <div className="w-full max-w-[680px] rounded-lg border border-surface-border bg-surface-raised p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-text-primary">문서 위치 선택</h2><p className="mt-1 text-xs font-semibold text-text-muted">선택한 주제의 첫 문서로 이동합니다.</p></div><MapPin className="size-5 text-brand-primary" /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2"><span className="flex items-center justify-between text-xs font-black text-text-primary"><span>1차 노트 영역</span><span className="text-[10px] text-text-muted">{categories.length}개</span></span><div className="min-h-40 space-y-1 rounded-md border border-surface-border-soft bg-surface-muted p-1.5">{categories.map((item) => <button key={item.id} type="button" onClick={() => handleCategory(item.id)} className={`w-full rounded-md px-3 py-2.5 text-left text-xs font-black transition-colors ${item.id === nextCategoryId ? "border-l-2 border-brand-border bg-brand-glass text-brand-primary" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}>{item.title}</button>)}</div></div>
            <div className="min-w-0 space-y-2"><span className="flex items-center justify-between text-xs font-black text-text-primary"><span>2차 노트 주제</span><span className="text-[10px] text-text-muted">{nextTopics.length}개</span></span><div className="min-h-40 space-y-1 rounded-md border border-surface-border-soft bg-surface-muted p-1.5">{nextTopics.map((item) => <button key={item.id} type="button" onClick={() => setNextTopicId(item.id)} className={`w-full rounded-md px-3 py-2.5 text-left text-xs font-black transition-colors ${item.id === nextTopicId ? "border-l-2 border-brand-border bg-brand-glass text-brand-primary" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"}`}>{item.title}</button>)}{!nextTopics.length && <p className="px-2 py-3 text-xs font-bold text-text-muted">선택한 영역에 주제가 없습니다.</p>}</div></div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setLocationOpen(false)} className="ui-icon-button h-9 px-3 text-xs font-black">취소</button><button type="button" onClick={confirmLocation} disabled={!nextTopicId || !nextTopics.find((item) => item.id === nextTopicId)?.documents.length} className="ui-icon-button-brand h-9 px-3 text-xs font-black disabled:opacity-40">이동</button></div>
        </div>
      </div>}
    </div>
  );
}
