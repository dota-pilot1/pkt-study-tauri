import { useMemo } from "react";
import { getApiBase } from "../../shared/api/client";
import type { PlaybookDomain } from "../../features/hospital-playbook/api";
import ApiGuideDialogShell from "./ApiGuideDialogShell";
import LexicalSamplePreview from "./LexicalSamplePreview";

type LlmApiGuideDialogProps = {
  domain: PlaybookDomain;
  topicId?: number | null;
  parentDocumentId?: number | null;
  onClose: () => void;
};

export default function LlmApiGuideDialog({ domain, topicId = null, parentDocumentId = null, onClose }: LlmApiGuideDialogProps) {
  const guide = useMemo(() => {
    const base = `${getApiBase()}/api/llm/hospital-playbook`;
    return `# PKT Playbook 2차 주제 전체 노트 관리 API

baseUrl: ${base}
spaceCode: ${domain}
topicId: ${topicId ?? "{topicId}"}

이 안내는 선택한 2차 주제(topic)의 본문 문서와 하위 문서를 관리하는 API입니다.
본문 문서는 해당 주제의 전체 구현 계획(TODO)을 담고, 하위 문서는 TODO 하나의 구현 단계(Step 1~N)를 담습니다.

## 0. 이 주제에서 반드시 지킬 문서 구조

이 안내를 실행 지침으로 사용합니다. 예시 제목·파일·API는 실제 작업 대상에 맞게 바꾸되, 문서 계층과 본문 작성 규칙은 유지합니다.

2차 주제(topic)
└── 본문 문서: 전체 구현 계획
    ├── 본문에 TODO 1~N 계획만 작성
    ├── 하위 문서: TODO 1
    │   └── 본문에 TODO 1의 Step 1~N 작성
    ├── 하위 문서: TODO 2
    │   └── 본문에 TODO 2의 Step 1~N 작성
    └── ...

- Step마다 별도 하위 문서를 만들지 않습니다. Step은 해당 TODO 하위 문서 안에서 순서대로 진행합니다.
- TODO와 Step 개수는 작업 범위에 맞게 정합니다. 제목만 늘리기 위해 쪼개지 않습니다.
- 구현 전에는 실제 저장소를 먼저 조회하고, 존재하지 않는 파일 경로·API·응답을 확정된 사실처럼 작성하지 않습니다.
- 구현 완료 후에는 실제 파일 경로, 실제 코드, 실행한 테스트·조회 결과를 문서에 반영합니다.
- 문서 삭제 후 재생성이 필요한 경우에도 먼저 tree를 조회해 대상 문서 ID와 하위 문서 범위를 확인합니다.

## 1. 1차·2차 메뉴를 한 번에 생성
POST ${base}/structure
Content-Type: application/json

{
  "spaceCode": "${domain}",
  "categoryTitle": "기본 UI 실습",
  "topicTitles": ["기본 테이블", "컴포넌트 만들기", "페이지에 적용"]
}

## 2. 2차 주제 조회
GET ${base}/topics/${topicId ?? "{topicId}"}

주제 ID와 기존 문서 목록을 먼저 확인합니다. 기존 문서가 있으면 새로 만들지 않고 최신 문서와 version을 사용합니다.

## 3. 본문 문서 저장
PATCH ${base}/documents/{documentId}/content
Content-Type: application/json

{
  "title": "LOT 조회 페이지네이션 서버 구현 전체 계획",
  "content": "Lexical JSON 문자열",
  "expectedVersion": 3,
  "parentId": null
}

본문 문서에는 전체 목표와 TODO 계획만 작성합니다. 각 TODO의 상세 Step은 본문에 직접 넣지 않고 하위 문서로 분리합니다.

## 4. 본문 문서 생성
POST ${base}/topics/{topicId}/documents
Content-Type: application/json

{
  "title": "LOT 조회 페이지네이션 서버 구현 전체 계획",
  "content": "Lexical JSON 문자열",
  "parentId": null
}

## 5. TODO 하위 문서 생성
POST ${base}/topics/{topicId}/children
Content-Type: application/json

{
  "parentId": ${parentDocumentId ?? "{parentDocumentId}"},
  "title": "TODO 1. LOT 도메인 모델과 응답 계약 구현",
  "content": "TODO 1의 Step 1~N을 담은 Lexical JSON 문자열"
}

하위 문서 하나는 TODO 하나를 담당합니다. Step은 별도 문서로 생성하지 않고 해당 TODO 하위 문서 본문 안에 작성합니다.

## 6. 조회
GET ${base}/tree?spaceCode=${domain}
GET ${base}/categories/{categoryId}
GET ${base}/topics/{topicId}
GET ${base}/documents/{documentId}

## 7. 문서와 하위 문서 삭제
DELETE ${base}/documents/{documentId}

문서를 삭제하면 해당 문서의 하위 문서와 댓글도 함께 삭제됩니다.

## 8. 하위 문서 순서 변경
POST ${base}/topics/{topicId}/documents/reorder
Content-Type: application/json

{
  "ids": [{childDocumentId1}, {childDocumentId2}, {childDocumentId3}],
  "parentId": ${parentDocumentId ?? "{parentDocumentId}"}
}

## 9. Lexical content 저장 형식

content는 Markdown이나 HTML이 아니라 Lexical EditorState를 JSON.stringify한 문자열입니다.

- 최상위 구조는 {"root":{"children":[...]}}입니다.
- root에는 children, direction, format, indent, type: "root", version을 포함합니다.
- 일반 문단은 type: "paragraph", 제목은 type: "heading"과 tag: "h1"~"h6"를 사용합니다.
- 목록은 Lexical의 list와 listitem 노드로 저장합니다.
- 섹션 사이의 간격은 children: []인 빈 paragraph 2개로 표현합니다. CSS 여백만으로 섹션 간격을 만들지 않습니다.
- list에는 children, direction, format, indent, listType, start, tag, type, version을 포함하고 listitem에는 children, checked, direction, format, indent, type, value, version을 포함합니다.
- 목록 항목 사이에는 빈 paragraph를 넣지 않습니다.
- 각 섹션은 h2 제목 다음에 본문 paragraph 또는 list 전체를 하나의 type: "quote" 노드 안에 넣어 파스텔 배경으로 표시합니다.
- 파일 경로와 실제 코드는 섹션 quote 밖에 각각 독립된 type: "code" 블록으로 배치합니다. 파일 경로를 실제 코드 블록의 주석이나 첫 줄에 넣지 않습니다. 코드 블록에는 배경색을 중첩하지 않습니다.
- 코드 블록은 몇 줄만 떼어낸 부분 코드가 아니라 독자가 흐름을 이해할 수 있는 함수·훅·컴포넌트·설정 단위의 실제 코드를 담습니다. 설명용 \`...\`는 사용하지 않습니다.
- 구현 계획 문서는 h1 제목 → quote 목표 → h2 제목 → quote 본문 → 필요 시 code 블록 순서로 작성합니다. 목록 항목 사이에는 빈 paragraph를 넣지 않습니다.
- 섹션 사이에는 children: []인 빈 paragraph 2개를 둡니다.
- 하위 문서 Step에서는 파일 경로 code 뒤에 빈 paragraph 1개, 실제 코드 code 뒤에 빈 paragraph 1개를 둡니다. 다음 Step 전에는 빈 paragraph 2개를 둡니다.
- 주의사항과 검증은 모든 Step에 넣지 않습니다. 비자명한 설계 판단이나 실제 실행한 테스트·조회·화면 확인 결과가 있을 때만 추가합니다.
- 아직 구현하지 않은 계획 단계에서는 확정되지 않은 API 경로·응답 예시를 추가하지 않고, 구현 완료 후 실제 조회 API만 이 안내에 반영합니다.
- 파일 경로는 type: "code" 블록의 language를 "text"로 저장하고, 실제 코드는 파일에 맞는 "java", "typescript", "tsx", "bash", "json" 등의 language를 사용합니다. "code-highlight.text"는 children의 type과 저장 호환 표기이며 실제 코드 언어로 사용하지 않습니다.
- code 블록은 children 안에 type: "code-highlight" 노드를 두고, 코드 전체를 그 노드의 text에 넣습니다. 코드 안의 줄바꿈은 text 값에 그대로 유지합니다.
- content에 Markdown, HTML, 또는 코드 전체를 넣지 않습니다.
- 줄바꿈은 JSON 직렬화에 맡기며 문자 \\n 을 직접 입력하거나 이중 escape하지 않습니다.
- 수정 전 최신 문서를 조회하고 expectedVersion을 맞춥니다.

## 10. 본문 문서 샘플

본문 문서는 h1 전체 제목 → quote 목표 → h2 TODO 계획 → quote 안의 TODO 목록 순서입니다.
오른쪽 '본문 TODO 계획 샘플' 탭이 이 구조를 보여줍니다.

## 11. 하위 문서 샘플

하위 문서는 h1 TODO 제목 → quote 목표 → h2 Step → quote 설명 → 일반 paragraph '파일:' → 파일 경로 code → 일반 paragraph '코드:' → 이해 가능한 실제 코드 단위 code 순서입니다.
각 Step 사이에는 빈 paragraph 2개를 두고, TODO 하나의 모든 Step을 한 문서 안에 작성합니다.
오른쪽 '하위 문서 Step 1~N 샘플' 탭이 이 구조를 보여줍니다.

`; 
  }, [domain, parentDocumentId, topicId]);

  return (
    <ApiGuideDialogShell
      title="2차 주제 전체 노트 관리 API"
      description={`선택한 2차 주제(${topicId ?? "ID 미확인"})의 본문 계획 문서와 TODO 하위 문서를 생성·조회·수정·정렬하는 API입니다.`}
      copyText={guide}
      onClose={onClose}
      ariaLabel="2차 주제 전체 노트 관리 API"
      contentAriaLabel="2차 주제 전체 노트 관리 API 형식"
      previewAriaLabel="2차 주제 본문·하위 문서 Lexical 샘플"
      previewTitle="2차 주제 본문·하위 문서 Lexical 샘플"
      previewDescription="본문 문서에는 TODO 계획을, 각 하위 문서에는 하나의 TODO에 대한 Step 1~N을 작성합니다."
      preview={<LexicalSamplePreview />}
      footer={
        <>
          <p className="font-black text-text-primary">2차 주제 사용 순서</p>
          <p>주제 조회 → 기존 본문 문서 확인 → 없으면 본문 계획 문서 생성 → 본문 저장 → TODO별 하위 문서 생성 → 각 하위 문서 안에 Step 기록 → 하위 문서 순서 정렬 → 다시 조회</p>
          <p className="mt-1">본문 문서는 TODO 계획, 하위 문서는 TODO 하나의 Step 1~N을 담습니다. <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">content</code>는 Lexical EditorState를 JSON.stringify한 문자열이며, 섹션 설명은 quote, 파일 경로와 실제 코드는 독립 code 블록으로 저장합니다. 코드는 이해 가능한 함수·훅·컴포넌트·설정 단위로 기록하고 설명용 생략 부호는 사용하지 않습니다.</p>
          <p className="mt-1">하위 문서는 <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">parentId</code>에 부모 Document ID를 넣어 생성합니다. 409가 나오면 최신 문서를 다시 조회한 뒤 <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">expectedVersion</code>을 갱신합니다.</p>
        </>
      }
    >
      <pre className="whitespace-pre-wrap bg-surface-muted px-5 py-4 font-mono text-[11px] leading-5 text-text-primary">{guide}</pre>
    </ApiGuideDialogShell>
  );
}
