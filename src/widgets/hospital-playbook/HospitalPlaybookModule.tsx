import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Braces, ChevronRight, ExternalLink, FileText, GitBranch, Loader2, Plus, RefreshCw } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import PageHeaderSearch from "../../shared/ui/PageHeaderSearch";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import ColumnResizeHandle from "../../shared/ui/ColumnResizeHandle";
import { playbookApi, type PlaybookCategory, type PlaybookDocumentSummary, type PlaybookDomain } from "../../features/hospital-playbook/api";
import { playbookTreeKey, usePlaybookTree } from "../../features/hospital-playbook/queries";
import DocumentDrawer from "./DocumentDrawer";
import DocumentPage from "./DocumentPage";
import DocumentPane from "./DocumentPane";
import DocumentContextApiDialog from "./DocumentContextApiDialog";
import ListColumn from "./ListColumn";
import LlmApiGuideDialog from "./LlmApiGuideDialog";

const CATEGORY_WIDTH_KEY = "pkt-study-category-width";
const TOPIC_WIDTH_KEY = "pkt-study-topic-width";
const COLLAPSED_COLUMN_WIDTH = 112;
const EMPTY_CATEGORIES: PlaybookCategory[] = [];
const EMPTY_TOPICS: PlaybookCategory["topics"] = [];
const EMPTY_DOCUMENTS: PlaybookDocumentSummary[] = [];

function SortableTreeDocumentRow({
  document,
  depth,
  indexPath,
  childCount,
  expanded,
  isDropTarget,
  onOpen,
  onToggle,
  onAddChild,
  onOpenPage,
  onOpenContextApi,
}: {
  document: PlaybookDocumentSummary;
  depth: number;
  indexPath: number[];
  childCount: number;
  expanded: boolean;
  isDropTarget: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onAddChild: () => void;
  onOpenPage: () => void;
  onOpenContextApi: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: document.id,
    // 드롭 직후 서버/캐시 순서가 바뀌어도 형제 항목이 레이아웃 이동을 애니메이션하도록 한다.
    animateLayoutChanges: () => true,
  });
  const hasChildren = childCount > 0;

  return (
    <div
      ref={setNodeRef}
      style={{ marginLeft: `${depth * 24}px`, transform: CSS.Transform.toString(transform), transition: transition ?? "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)", willChange: "transform" }}
      className={`flex min-h-12 items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-2.5 transition-[background-color,box-shadow,opacity] duration-200 hover:border-brand-border ${isDragging ? "z-10 scale-[1.02] opacity-55 shadow-xl ring-2 ring-brand-border/50" : ""} ${isDropTarget ? "border-brand-border bg-brand-glass ring-2 ring-brand-border/70" : ""}`}
    >
      <button type="button" {...attributes} {...listeners} className="grid size-5 shrink-0 cursor-grab touch-none place-items-center text-text-muted active:cursor-grabbing" title="드래그하여 같은 단계에서 순서 변경" aria-label={`${document.title} 드래그`}>
        ⠿
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-surface-border-soft bg-surface-raised text-[11px] font-black text-text-muted">{indexPath.join(".")}</span>
        <FileText className="size-4 shrink-0 text-brand-primary" />
        {depth > 0 && <span className="text-xs font-bold text-brand-primary">ㄴ</span>}
        <span className="truncate text-sm font-black text-text-primary">{document.title}{hasChildren && <span className="ml-1.5 text-xs font-bold text-text-muted">({childCount})</span>}</span>
      </button>
      {hasChildren && <button type="button" onClick={onToggle} className="ui-icon-button size-7" title={expanded ? "하위 문서 접기" : "하위 문서 펼치기"}><ChevronRight className={(expanded ? "rotate-90 " : "") + "size-4 transition-transform"} /></button>}
      {depth < 1 && <button type="button" onClick={onAddChild} className="ui-icon-button size-7 text-brand-primary" title="하위 문서 추가"><GitBranch className="size-3.5" /></button>}
      {depth === 0 && <button type="button" onClick={onOpenContextApi} className="ui-icon-button size-7 text-brand-primary" title="2차 노트 관리 {}" aria-label="2차 노트 관리 {}"><Braces className="size-3.5" /></button>}
      <button type="button" onClick={onOpenPage} className="ui-icon-button size-7" title="전체 페이지로 보기"><ExternalLink className="size-3.5" /></button>
    </div>
  );
}

function storedWidth(key: string, fallback: number) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? Math.min(560, Math.max(240, value)) : fallback;
}

function flattenDocuments(documents: PlaybookDocumentSummary[]) {
  const children = new Map<number, PlaybookDocumentSummary[]>();
  const roots: PlaybookDocumentSummary[] = [];
  for (const document of documents) {
    if (document.parentId === null) roots.push(document);
    else children.set(document.parentId, [...(children.get(document.parentId) ?? []), document]);
  }
  const rows: Array<{ document: PlaybookDocumentSummary; depth: number; indexPath: number[] }> = [];
  const visit = (items: PlaybookDocumentSummary[], depth: number, parentPath: number[]) => {
    items.forEach((document, index) => {
      const indexPath = [...parentPath, index + 1];
      rows.push({ document, depth, indexPath });
      visit(children.get(document.id) ?? [], depth + 1, indexPath);
    });
  };
  visit(roots, 0, []);
  return { rows, children };
}

function HospitalPlaybookModule({ domain, title }: { domain: PlaybookDomain; title: string }) {
  const queryClient = useQueryClient();
  const tree = usePlaybookTree(domain);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [drawerDocumentId, setDrawerDocumentId] = useState<number | null>(null);
  const [pageDocumentId, setPageDocumentId] = useState<number | null>(null);
  const [expandedDocumentIds, setExpandedDocumentIds] = useState<Set<number>>(() => new Set());
  const [dragDocumentId, setDragDocumentId] = useState<number | null>(null);
  const [dragOverDocumentId, setDragOverDocumentId] = useState<number | null>(null);
  const [isRefreshingTree, setIsRefreshingTree] = useState(false);
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [pendingTopicSelection, setPendingTopicSelection] = useState<number | null>(null);
  const [llmApiGuideOpen, setLlmApiGuideOpen] = useState(false);
  const [contextApiDocument, setContextApiDocument] = useState<PlaybookDocumentSummary | null>(null);
  const expandedTopicId = useRef<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [categoryWidth, setCategoryWidth] = useState(() => storedWidth(CATEGORY_WIDTH_KEY, 280));
  const [topicWidth, setTopicWidth] = useState(() => storedWidth(TOPIC_WIDTH_KEY, 300));
  const [categoryCollapsed, setCategoryCollapsed] = useState(false);
  const [topicCollapsed, setTopicCollapsed] = useState(false);

  const categories: PlaybookCategory[] = tree.data ?? EMPTY_CATEGORIES;
  const category = useMemo(() => categories.find((item) => item.id === categoryId) ?? null, [categories, categoryId]);
  const topic = useMemo(() => category?.topics.find((item) => item.id === topicId) ?? null, [category, topicId]);
  const documents = topic?.documents ?? EMPTY_DOCUMENTS;
  const { rows: documentRows, children } = useMemo(() => flattenDocuments(documents), [documents]);
  const drawerDocument = useQuery({
    queryKey: ["hospital-playbook", "document", drawerDocumentId],
    queryFn: () => playbookApi.document(drawerDocumentId!),
    enabled: drawerDocumentId !== null,
  });
  const searchResults = useQuery({
    queryKey: ["hospital-playbook", "search", submittedSearch],
    queryFn: () => playbookApi.search(submittedSearch, domain),
    enabled: submittedSearch.length > 0,
    retry: false,
  });

  const resizeCategory = useColumnResize(categoryWidth, setCategoryWidth, { min: 240, max: 560 });
  const resizeTopic = useColumnResize(topicWidth, setTopicWidth, { min: 260, max: 600 });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: playbookTreeKey(domain) });

  useEffect(() => { window.localStorage.setItem(CATEGORY_WIDTH_KEY, String(categoryWidth)); }, [categoryWidth]);
  useEffect(() => { window.localStorage.setItem(TOPIC_WIDTH_KEY, String(topicWidth)); }, [topicWidth]);
  useEffect(() => {
    if (!categories.length) {
      setCategoryId((current) => current === null ? current : null);
      return;
    }
    if (!categories.some((item) => item.id === categoryId)) setCategoryId(categories[0].id);
  }, [categories, categoryId]);
  useEffect(() => {
    const topics = category?.topics ?? EMPTY_TOPICS;
    if (!topics.length) {
      setTopicId((current) => current === null ? current : null);
      return;
    }
    if (pendingTopicSelection !== null && topics.some((item) => item.id === pendingTopicSelection)) {
      setTopicId(pendingTopicSelection);
      setPendingTopicSelection(null);
      return;
    }
    if (!topics.some((item) => item.id === topicId)) setTopicId(topics[0].id);
  }, [category, topicId, pendingTopicSelection]);
  useEffect(() => {
    const ids = new Set(documents.map((item) => item.id));
    const parentIds = new Set(documents.filter((item) => item.parentId !== null).map((item) => item.parentId as number));
    setExpandedDocumentIds((current) => {
      // 주제를 처음 열었을 때는 하위 문서까지 보여줘서 상단의 총 개수와
      // 실제로 보이는 목록 개수가 어긋나지 않게 한다. 이후 사용자가 접은 상태는 유지한다.
      const isNewTopic = expandedTopicId.current !== topicId;
      const next = isNewTopic
        ? new Set(parentIds)
        : new Set([...current].filter((id) => ids.has(id)));
      expandedTopicId.current = topicId;
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
  }, [documents, topicId]);

  const createCategory = useMutation({ mutationFn: (categoryTitle: string) => playbookApi.createCategory(domain, categoryTitle), onSuccess: invalidate });
  const renameCategory = useMutation({ mutationFn: (value: { id: number; title: string }) => playbookApi.renameCategory(value.id, value.title), onSuccess: invalidate });
  const deleteCategory = useMutation({ mutationFn: (id: number) => playbookApi.deleteCategory(id), onSuccess: invalidate });
  const reorderCategories = useMutation({ mutationFn: (ids: number[]) => playbookApi.reorderCategories(ids), onSuccess: invalidate });
  const createTopic = useMutation({ mutationFn: (value: { categoryId: number; title: string }) => playbookApi.createTopic(value.categoryId, value.title), onSuccess: invalidate });
  const renameTopic = useMutation({ mutationFn: (value: { id: number; title: string }) => playbookApi.renameTopic(value.id, value.title), onSuccess: invalidate });
  const deleteTopic = useMutation({ mutationFn: (id: number) => playbookApi.deleteTopic(id), onSuccess: invalidate });
  const reorderTopics = useMutation({ mutationFn: (value: { categoryId: number; ids: number[] }) => playbookApi.reorderTopics(value.categoryId, value.ids), onSuccess: invalidate });
  const createDocument = useMutation({
    mutationFn: (value: { topicId: number; parentId: number | null }) => playbookApi.createDocument(value.topicId, "새 문서", value.parentId),
    onSuccess: (document) => { invalidate(); setEditingDocumentId(document.id); },
  });
  const deleteDocument = useMutation({
    mutationFn: (id: number) => playbookApi.deleteDocument(id),
    onSuccess: () => { setDrawerDocumentId(null); setEditingDocumentId(null); invalidate(); },
  });
  const reorderDocuments = useMutation({
    mutationFn: (value: { topicId: number; ids: number[]; parentId: number | null }) => playbookApi.reorderDocuments(value.topicId, value.ids, value.parentId),
    onMutate: (value) => {
      // 서버 응답을 기다리지 않고 캐시를 먼저 바꿔야 dnd-kit이 이동 경로를 애니메이션으로 계산한다.
      queryClient.setQueryData<PlaybookCategory[]>(playbookTreeKey(domain), (current) => current?.map((category) => ({
        ...category,
        topics: category.topics.map((item) => {
          if (item.id !== value.topicId) return item;
          const moving = item.documents.filter((document) => document.parentId === value.parentId);
          const byId = new Map(moving.map((document) => [document.id, document]));
          const reordered = value.ids.map((id) => byId.get(id)).filter((document): document is PlaybookDocumentSummary => Boolean(document));
          return {
            ...item,
            documents: item.documents.map((document) => document.parentId === value.parentId ? reordered.shift() ?? document : document),
          };
        }),
      })));
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: playbookTreeKey(domain) }); },
    onSuccess: invalidate,
  });

  const isVisible = (document: PlaybookDocumentSummary) => {
    let parentId = document.parentId;
    while (parentId !== null) {
      if (!expandedDocumentIds.has(parentId)) return false;
      parentId = documents.find((item) => item.id === parentId)?.parentId ?? null;
    }
    return true;
  };
  const createNewDocument = (parentId: number | null = null) => { if (topic) createDocument.mutate({ topicId: topic.id, parentId }); };
  const refreshTree = async () => {
    if (isRefreshingTree) return;
    setSubmittedSearch("");
    queryClient.removeQueries({ queryKey: ["hospital-playbook", "search"] });
    setIsRefreshingTree(true);
    const startedAt = Date.now();
    try {
      await tree.refetch();
    } finally {
      const remaining = Math.max(0, 650 - (Date.now() - startedAt));
      window.setTimeout(() => setIsRefreshingTree(false), remaining);
    }
  };
  const submitSearch = (keyword: string) => setSubmittedSearch(keyword);
  const openSearchResult = (result: { categoryId: number; topicId: number; id: number }) => {
    setCategoryId(result.categoryId);
    setPendingTopicSelection(result.topicId);
    setSubmittedSearch("");
    setEditingDocumentId(null);
    setDrawerDocumentId(result.id);
  };
  const handleTreeDragStart = ({ active }: DragStartEvent) => {
    setDragDocumentId(Number(active.id));
    setDragOverDocumentId(null);
  };
  const handleTreeDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) {
      setDragOverDocumentId(null);
      return;
    }
    const source = documents.find((item) => item.id === active.id);
    const target = documents.find((item) => item.id === over.id);
    setDragOverDocumentId(source && target && source.parentId === target.parentId ? Number(over.id) : null);
  };
  const handleTreeDragEnd = ({ active, over }: DragEndEvent) => {
    setDragOverDocumentId(null);
    // DragOverlay가 dnd-kit의 dropAnimation을 재생할 시간을 확보한 뒤 제거한다.
    window.setTimeout(() => setDragDocumentId(null), 700);
    if (!topic || !over || active.id === over.id) return;
    const source = documents.find((item) => item.id === active.id);
    const target = documents.find((item) => item.id === over.id);
    if (!source || !target || source.parentId !== target.parentId) return;
    const siblings = documents.filter((item) => item.parentId === source.parentId);
    const from = siblings.findIndex((item) => item.id === source.id);
    const to = siblings.findIndex((item) => item.id === target.id);
    if (from < 0 || to < 0) return;
    reorderDocuments.mutate({ topicId: topic.id, ids: arrayMove(siblings, from, to).map((item) => item.id), parentId: source.parentId });
  };

  const detail = drawerDocument.data;
  const flatDocuments = documentRows.map((row) => row.document);
  const detailIndex = detail ? flatDocuments.findIndex((item) => item.id === detail.id) : -1;
  const previous = detailIndex > 0 ? flatDocuments[detailIndex - 1] : undefined;
  const next = detailIndex >= 0 ? flatDocuments[detailIndex + 1] : undefined;

  if (pageDocumentId !== null && topic && category) {
    return <DocumentPage
      documentId={pageDocumentId}
      title={title}
      categoryTitle={category.title}
      topicTitle={topic.title}
      categoryId={category.id}
      topicId={topic.id}
      categories={categories}
      documents={documents}
      onClose={() => setPageDocumentId(null)}
      onNavigate={setPageDocumentId}
      onChangeLocation={(nextCategoryId, nextTopicId, nextDocumentId) => {
        setCategoryId(nextCategoryId);
        setTopicId(nextTopicId);
        setPageDocumentId(nextDocumentId);
      }}
      onReorder={(ids, parentId) => reorderDocuments.mutateAsync({ topicId: topic.id, ids, parentId })}
      onRefresh={() => void tree.refetch()}
      onEdit={(id) => { setPageDocumentId(null); setEditingDocumentId(id); }}
      onDelete={(id) => { setPageDocumentId(null); setDrawerDocumentId(id); }}
      deleting={deleteDocument.isPending}
      reordering={reorderDocuments.isPending}
    />;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* 노트 트리만 다시 불러온다. 셸의 전역 새로고침은 본문을 리마운트해 선택 상태까지 초기화하므로 여기서는 감춘다. */}
      <PageHeader
        hideRefresh
        center={
          <div className="flex min-w-0 w-full items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <PageHeaderSearch value={submittedSearch} onSearch={submitSearch} onClear={() => setSubmittedSearch("")} />
            </div>
            <button
              type="button"
              onClick={() => setLlmApiGuideOpen(true)}
              className="ui-icon-button h-9 shrink-0 gap-1.5 px-2.5 text-[11px] font-black text-brand-primary"
              title="전체 노트 관리 {}"
            >
              <span>전체 노트 관리</span> <span className="font-mono text-xs leading-none">{"{}"}</span>
            </button>
          </div>
        }
      >
        <FileText className="size-4 text-brand-primary" />
        <span className="text-[14px] font-bold tracking-tight text-text-primary">{title}</span>
        <button type="button" onClick={() => void refreshTree()} disabled={isRefreshingTree} className="ui-icon-button ml-1 size-7 disabled:opacity-40" title="노트 새로고침"><RefreshCw className={`size-3.5 ${isRefreshingTree ? "refresh-icon-spin" : ""}`} /></button>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-auto bg-surface-muted p-4">
        {tree.isPending ? <div className="grid h-full place-items-center text-text-muted"><Loader2 className="size-6 animate-spin" /></div> : tree.isError ? <div className="grid h-full place-items-center text-sm font-semibold text-text-muted">노트를 불러오지 못했습니다.</div> : (
          <main className="flex h-full min-h-[640px] min-w-[960px] gap-1">
            <div className="h-full min-h-0 shrink-0 transition-[width] duration-200" style={{ width: categoryCollapsed ? COLLAPSED_COLUMN_WIDTH : categoryWidth }}><ListColumn title="1차 메뉴" items={categories.map((item) => ({ id: item.id, title: item.title, count: item.topics.length }))} selectedId={categoryId} onSelect={setCategoryId} onCreate={(title) => createCategory.mutate(title)} onRename={(id, title) => renameCategory.mutate({ id, title })} onDelete={(id) => deleteCategory.mutate(id)} onReorder={(ids) => reorderCategories.mutate(ids)} emptyLabel="아직 영역이 없습니다." createPlaceholder="영역 이름" collapsed={categoryCollapsed} onToggle={() => setCategoryCollapsed((value) => !value)} /></div>
            {!categoryCollapsed && <ColumnResizeHandle onMouseDown={resizeCategory} />}
            <div className="h-full min-h-0 shrink-0 transition-[width] duration-200" style={{ width: topicCollapsed ? COLLAPSED_COLUMN_WIDTH : topicWidth }}><ListColumn title="2차 메뉴" items={(category?.topics ?? EMPTY_TOPICS).map((item) => ({ id: item.id, title: item.title, count: item.documents.length, badge: <FileText className="size-4 shrink-0 text-brand-primary" /> }))} selectedId={topicId} onSelect={setTopicId} onCreate={(title) => category && createTopic.mutate({ categoryId: category.id, title })} onRename={(id, title) => renameTopic.mutate({ id, title })} onDelete={(id) => deleteTopic.mutate(id)} onReorder={(ids) => category && reorderTopics.mutate({ categoryId: category.id, ids })} emptyLabel={category ? "아직 주제가 없습니다." : "먼저 영역을 선택하세요."} createPlaceholder="주제 이름" disabled={!category} collapsed={topicCollapsed} onToggle={() => setTopicCollapsed((value) => !value)} /></div>
            {!topicCollapsed && <ColumnResizeHandle onMouseDown={resizeTopic} />}
            <section className="flex min-h-0 min-w-[420px] flex-1 flex-col rounded-lg border border-surface-border bg-surface-raised shadow-sm">
              <header className="flex h-12 min-h-12 shrink-0 items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-0">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black text-brand-primary">
                    {category?.title ?? "영역 없음"} &gt; {topic?.title ?? "주제 없음"}
                  </p>
                  {topic && <h1 className="mt-0.5 truncate text-lg font-black text-text-primary">
                    {topic.title}
                    <span className="ml-2 text-sm font-semibold text-text-muted">({documents.length})</span>
                  </h1>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={!topic}
                    onClick={() => setLlmApiGuideOpen(true)}
                    className="ui-icon-button h-9 shrink-0 gap-1.5 px-2.5 text-[11px] font-black disabled:opacity-40"
                    title="2차 주제 관리 {}"
                    aria-label="2차 주제 관리 {}"
                  >
                    <span>2차 주제 관리</span>
                    <span className="font-mono text-xs leading-none">{"{}"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!topic || createDocument.isPending}
                    onClick={() => createNewDocument()}
                    className="ui-icon-button-brand h-9 shrink-0 gap-1.5 px-3 text-[13px] font-black disabled:opacity-40"
                  >
                    <Plus className="size-4" /> 문서 추가
                  </button>
                </div>
              </header>
              {editingDocumentId ? (
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  <div className="mb-2 flex justify-end">
                    <button type="button" onClick={() => setEditingDocumentId(null)} className="ui-icon-button h-8 px-3 text-xs font-black">
                      목록으로
                    </button>
                  </div>
                  <DocumentPane documentId={editingDocumentId} onChanged={invalidate} />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {submittedSearch ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1 text-xs font-bold text-text-muted">
                        <span>검색 결과</span>
                        {!searchResults.isPending && <span>{searchResults.data?.length ?? 0}개</span>}
                      </div>
                      {searchResults.isPending ? <div className="grid h-24 place-items-center text-text-muted"><Loader2 className="size-5 animate-spin" /></div> : searchResults.isError ? <div className="grid min-h-24 place-items-center text-sm font-semibold text-destructive">검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</div> : searchResults.data?.length ? searchResults.data.map((result) => (
                        <button key={result.id} type="button" onClick={() => openSearchResult(result)} className="flex w-full items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5 text-left transition-colors hover:border-brand-border hover:bg-brand-glass">
                          <FileText className="size-4 shrink-0 text-brand-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-text-primary">{result.title}</span>
                            <span className="mt-0.5 block truncate text-[11px] font-semibold text-text-muted">{result.categoryTitle} &gt; {result.topicTitle}</span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-text-muted" />
                        </button>
                      )) : <div className="grid h-24 place-items-center text-sm font-semibold text-text-muted">검색 결과가 없습니다.</div>}
                    </div>
                  ) : documentRows.length ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleTreeDragStart}
                      onDragOver={handleTreeDragOver}
                      onDragCancel={() => { setDragDocumentId(null); setDragOverDocumentId(null); }}
                      onDragEnd={handleTreeDragEnd}
                    >
                      <SortableContext items={documentRows.filter(({ document }) => isVisible(document)).map(({ document }) => document.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1.5">
                          {documentRows.map(({ document, depth, indexPath }) => isVisible(document) ? (
                            <SortableTreeDocumentRow
                              key={document.id}
                              document={document}
                              depth={depth}
                              indexPath={indexPath}
                              childCount={children.get(document.id)?.length ?? 0}
                              expanded={expandedDocumentIds.has(document.id)}
                              isDropTarget={dragOverDocumentId === document.id}
                              onOpen={() => { setEditingDocumentId(null); setDrawerDocumentId(document.id); }}
                              onToggle={() => setExpandedDocumentIds((current) => {
                                const nextIds = new Set(current);
                                if (nextIds.has(document.id)) nextIds.delete(document.id); else nextIds.add(document.id);
                                return nextIds;
                              })}
                              onAddChild={() => createNewDocument(document.id)}
                              onOpenPage={() => setPageDocumentId(document.id)}
                              onOpenContextApi={() => setContextApiDocument(document)}
                            />
                          ) : null)}
                        </div>
                      </SortableContext>
                      <DragOverlay dropAnimation={{ duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                        {dragDocumentId !== null ? (
                          <div className="flex min-h-12 items-center gap-2 rounded-md border border-brand-border bg-surface-raised px-3 text-sm font-black text-text-primary shadow-2xl">
                            <span className="text-brand-primary">⠿</span>
                            {documents.find((item) => item.id === dragDocumentId)?.title ?? "문서 이동"}
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="grid min-h-48 place-items-center text-sm font-semibold text-text-muted">
                      문서를 추가해 학습 흐름을 구성하세요.
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>
        )}
      </div>
      {drawerDocument.isPending && drawerDocumentId !== null && <div className="fixed inset-0 z-50 grid place-items-center bg-black/20"><Loader2 className="size-7 animate-spin text-brand-primary" /></div>}
      {detail && <DocumentDrawer document={detail} previous={previous ? { ...detail, id: previous.id, title: previous.title } : undefined} next={next ? { ...detail, id: next.id, title: next.title } : undefined} onNavigate={(target) => setDrawerDocumentId(target.id)} onChanged={invalidate} onOpenPage={() => { setDrawerDocumentId(null); setPageDocumentId(detail.id); }} onDelete={() => deleteDocument.mutate(detail.id)} onClose={() => setDrawerDocumentId(null)} deleting={deleteDocument.isPending} deleteError={deleteDocument.isError ? (deleteDocument.error as Error).message : undefined} />}
      {llmApiGuideOpen && <LlmApiGuideDialog domain={domain} topicId={topicId} parentDocumentId={drawerDocumentId} onClose={() => setLlmApiGuideOpen(false)} />}
      {contextApiDocument && <DocumentContextApiDialog documentId={contextApiDocument.id} documentTitle={contextApiDocument.title} onClose={() => setContextApiDocument(null)} />}
    </div>
  );
}

export default HospitalPlaybookModule;
