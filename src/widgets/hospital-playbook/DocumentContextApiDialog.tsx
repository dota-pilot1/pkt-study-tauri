import { useMemo } from "react";
import { getApiBase } from "../../shared/api/client";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import LexicalSamplePreview from "./LexicalSamplePreview";

type DocumentContextApiDialogProps = {
  documentId: number;
  documentTitle: string;
  onClose: () => void;
};

export default function DocumentContextApiDialog({ documentId, documentTitle, onClose }: DocumentContextApiDialogProps) {
  const endpoint = useMemo(() => `${getApiBase()}/api/llm/hospital-playbook/documents/${documentId}/context`, [documentId]);
  const contentEndpoint = useMemo(() => `${getApiBase()}/api/llm/hospital-playbook/documents/${documentId}/content`, [documentId]);

  const guide = useMemo(() => `# PKT Playbook 2차 노트 관리 API

문서: ${documentTitle}
documentId: ${documentId}

## GET 현재 문서 본문 + 하위 문서 전체
GET ${endpoint}
Accept: application/json

## PATCH 본문 저장
PATCH ${contentEndpoint}
Content-Type: application/json

{
  "title": "수정 제목",
  "content": "Lexical JSON 문자열",
  "expectedVersion": <CURRENT_VERSION>,
  "parentId": null
}

GET은 현재 문서 메타데이터·본문·하위 문서 전체를 조회하는 읽기 전용 API입니다.
PATCH는 최신 version을 expectedVersion으로 넣어 문서 본문을 저장합니다.
409가 발생하면 최신 문서를 다시 조회한 뒤 expectedVersion을 갱신합니다.

## 응답 구조
{
  "spaceCode": "PKT_FRONT_LEV1",
  "spaceName": "PKT Front Lev1",
  "categoryId": 5,
  "categoryTitle": "기본 UI 실습",
  "topicId": 23,
  "topicTitle": "기본 테이블",
  "document": {
    "id": ${documentId},
    "parentId": null,
    "title": "${documentTitle}",
    "content": "Lexical JSON 문자열",
    "status": "DRAFT",
    "useForChatbot": true,
    "orderIdx": 0,
    "version": 1,
    "updatedAt": "2026-08-22T00:00:00Z",
    "children": [
      {
        "id": 11,
        "parentId": ${documentId},
        "title": "하위 문서 제목",
        "content": "하위 문서 Lexical JSON 문자열",
        "children": []
      }
    ]
  }
}

children 안에 하위 문서가 재귀적으로 포함됩니다. content는 Lexical EditorState를 JSON.stringify한 문자열입니다.

content 처리 규칙:
- Markdown이나 HTML로 변환하지 않고 Lexical JSON 구조를 유지합니다.
- 일반 본문은 paragraph, 제목은 heading, 목록은 list/listitem 노드입니다.
- 설명과 목록처럼 하나의 묶음으로 보여줄 내용은 quote 노드 안에 함께 넣습니다.
- 제목과 설명 다음에 파일 경로나 실제 코드를 보여줄 때는 quote 밖의 독립된 code 노드로 표현합니다.
- 파일 경로와 실제 코드는 각각 독립된 code 노드로 표현합니다. 파일 경로를 실제 코드 블록의 주석이나 첫 줄에 넣지 않습니다.
- 파일 경로 code 블록은 language: "text", 실제 코드 code 블록은 파일에 맞는 "java", "typescript", "tsx", "bash", "json" 등의 language를 사용합니다. children에는 type: "code-highlight"를 둡니다.
- code 노드의 children에는 type: "code-highlight" 노드를 사용하고, 코드 안의 줄바꿈은 text 값에 그대로 유지합니다.
- 오른쪽은 특정 문서 본문이 아닌, 위 저장 규칙을 보여주는 고정 Lexical 렌더링 샘플입니다.

## 작업 순서
1. GET으로 최신 문서와 version을 조회합니다.
2. 기존 root 구조와 노드를 유지하면서 title·content를 준비합니다.
3. PATCH body에 최신 version을 expectedVersion으로 넣어 저장합니다.
4. GET으로 저장 결과와 하위 문서 구조를 확인합니다.

로컬 공개 LLM API는 토큰 없이 동작하며, 운영 환경에서는 공개 옵션을 활성화하지 않습니다.`, [contentEndpoint, documentId, documentTitle, endpoint]);

  return (
    <ApiGuideDialogShell
      title="2차 노트 관리 API"
      description="2차 노트 조회·저장 형식을 복사하고, 오른쪽에서 공통 Lexical 렌더링 샘플 탭을 확인합니다."
      copyText={guide}
      onClose={onClose}
      ariaLabel="2차 노트 관리 API"
      contentAriaLabel="2차 노트 관리 API 형식"
      previewAriaLabel="Lexical 저장 형식 샘플"
      previewTitle="실제 Lexical 렌더링 샘플"
      previewDescription="TODO 대주제와 각 하위 문서의 Step 1~N에 사용하는 quote·list·code 블록 샘플을 탭으로 보여줍니다."
      preview={<LexicalSamplePreview />}
      footer="왼쪽은 2차 노트 조회·저장 API 형식, 오른쪽은 전체 노트 관리 API와 공유하는 공통 Lexical 샘플 탭입니다. 문서별 본문을 직접 조회해 렌더링하지 않으며 토큰 값도 표시하지 않습니다."
    >
      <div className="border-b border-surface-border-soft bg-surface-raised px-5 py-4">
        <h3 className="text-sm font-black text-text-primary">2차 노트 관리 API</h3>
        <p className="mt-1 text-xs font-semibold text-text-muted">문서 본문 조회와 저장에 사용하는 작업 형식입니다.</p>
      </div>
      <pre className="whitespace-pre-wrap bg-surface-muted px-5 py-4 font-mono text-[11px] leading-5 text-text-primary">{guide}</pre>
    </ApiGuideDialogShell>
  );
}
