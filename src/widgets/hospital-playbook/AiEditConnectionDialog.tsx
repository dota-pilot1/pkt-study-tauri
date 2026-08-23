import ApiGuideDialogShell from "./ApiGuideDialogShell";
import LexicalSamplePreview from "./LexicalSamplePreview";

type AiEditConnectionDialogProps = {
  connection: string;
  documentTitle: string;
  isChildDocument: boolean;
  onClose: () => void;
};

export default function AiEditConnectionDialog({ connection, documentTitle, isChildDocument, onClose }: AiEditConnectionDialogProps) {
  return (
    <ApiGuideDialogShell
      title="개별 문서 편집 API for LLM"
      description={`${isChildDocument ? "TODO 하위 문서" : "2차 주제 본문 문서"} · ${documentTitle}`}
      copyText={connection}
      onClose={onClose}
      ariaLabel="개별 문서 편집 API for LLM"
      contentAriaLabel="개별 문서 편집 API for LLM"
      previewAriaLabel="Lexical 본문 샘플"
      previewTitle="개별 문서 편집 Lexical 샘플"
      previewDescription="본문 TODO 계획 샘플과 TODO 하위 문서 Step 1~N 샘플을 탭으로 모두 확인할 수 있습니다."
      preview={<LexicalSamplePreview initialTab={isChildDocument ? "step1" : "todo"} />}
      footer="이 API는 현재 문서 하나만 대상으로 하며 주제 구조나 다른 문서를 변경하지 않습니다. 본문 문서는 TODO 계획만, 하위 문서는 TODO 하나의 Step 1~N만 작성하세요. content는 기존 Lexical 구조를 유지한 JSON 문자열로 보내고, 저장 전 GET으로 최신 version을 확인해 expectedVersion에 사용하세요. 토큰은 한 번 저장한 뒤 폐기되며 만료 시간 이후에는 사용할 수 없습니다."
    >
      <pre className="whitespace-pre-wrap bg-surface-muted px-5 py-4 font-mono text-[11px] leading-5 text-text-primary">{connection}</pre>
    </ApiGuideDialogShell>
  );
}
