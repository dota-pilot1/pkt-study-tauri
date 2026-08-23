const textNode = (text: string) => ({ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 });
const paragraph = (text: string) => ({ children: [textNode(text)], direction: "ltr", format: "", indent: 0, type: "paragraph", version: 1 });
const heading = (text: string, tag: "h1" | "h2" = "h2") => ({ children: [textNode(text)], direction: "ltr", format: "", indent: 0, tag, type: "heading", version: 1 });
const emptyParagraph = () => ({ children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 });
const quoteBlock = (children: unknown[]) => ({ children, direction: "ltr", format: "", indent: 0, type: "quote", version: 1 });
const bulletList = (items: string[]) => ({ children: items.map((item, index) => ({ children: [textNode(item)], direction: "ltr", format: "", indent: 0, type: "listitem", value: index + 1, version: 1 })), direction: "ltr", format: "", indent: 0, listType: "bullet", start: 1, tag: "ul", type: "list", version: 1 });
const codeBlock = (text: string, language = "typescript") => ({ children: [{ text, type: "code-highlight", version: 1 }], direction: "ltr", format: "", indent: 0, language, type: "code", version: 1 });

const createState = (children: unknown[]) => JSON.stringify({
  root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
});
const sampleStep = (number: number, title: string, description: string, file: string, code: string, language: string) => [
  heading(`Step ${number}. ${title}`),
  quoteBlock([paragraph(description)]),
  paragraph("파일:"),
  codeBlock(file, "text"),
  emptyParagraph(),
  paragraph("코드:"),
  codeBlock(code, language),
  emptyParagraph(),
  emptyParagraph(),
];

const todoPlan = (number: number, title: string, description: string) => [
  heading(`TODO ${number}. ${title}`),
  quoteBlock([paragraph(description)]),
  emptyParagraph(),
  emptyParagraph(),
];

/** 2차 주제 본문 문서: 전체 목표와 TODO 계획만 담는 샘플입니다. */
export const TODO_PLAN_SAMPLE_LEXICAL_STATE = createState([
  heading("LOT 조회 페이지네이션 서버 구현 전체 계획", "h1"),
  quoteBlock([paragraph("LOT 목록 조회 API를 Spring Boot 서버에서 페이지네이션 방식으로 구현하고, 실제 HTTP 조회와 오류 조건까지 검증합니다.")]),
  emptyParagraph(),
  emptyParagraph(),
  heading("TODO 계획"),
  quoteBlock([bulletList([
    "TODO 1. LOT 도메인 모델과 응답 계약 구현",
    "TODO 2. LOT 페이지네이션 조회 API 구현",
    "TODO 3. LOT 샘플 데이터와 서버 검증",
  ])]),
]);

/** TODO 하위 문서: 하나의 TODO 안에서 Step 1~N을 관리하는 샘플입니다. */
export const STEP1_SAMPLE_LEXICAL_STATE = createState([
  heading("TODO 1. 서버 응답과 화면 모델 분리", "h1"),
  quoteBlock([paragraph("TypeScript에서 서버 응답 계약과 화면 모델을 분리하고, 변환 경계가 보이도록 주요 타입에 역할 주석을 작성합니다.")]),
  emptyParagraph(),
  emptyParagraph(),
  ...sampleStep(1, "화면 모델 타입 정의", "화면 컴포넌트가 사용하는 상태 라벨과 페이지 응답 구조를 주요 타입 주석과 함께 정의한다.", "prac-pkt-react/src/features/lot/model/lot.types.ts", `/** LOT 상태를 화면에 표시할 때 사용하는 한글 라벨이다. */
export type LotStatus = "대기" | "진행 중" | "완료" | "이상";

/** LOT 테이블과 선택 상세 패널에서 사용하는 화면 모델이다. */
export type Lot = {
  id: string;
  product: string;
  status: LotStatus;
  process: string;
  updatedAt: string;
};

/** LOT 목록과 페이지네이션 UI가 공유하는 화면용 페이지 모델이다. */
export type LotPage = {
  content: Lot[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};`, "typescript"),
  ...sampleStep(2, "서버 응답 타입 정의", "API 파일에서는 서버의 영문 상태 코드와 원본 필드 구조를 화면 모델과 구분한다.", "prac-pkt-react/src/features/lot/api/lot.api.ts", `/** 서버가 반환하는 LOT 상태 코드다. 화면 라벨과 다르므로 mapLot에서 변환한다. */
type LotApiStatus = "WAITING" | "IN_PROGRESS" | "COMPLETED" | "HOLD";

/** 서버 LOT 목록 한 건의 원본 응답 계약이다. */
type LotApiItem = {
  id: number;
  lotCode: string;
  productCode: string;
  productName: string;
  status: LotApiStatus;
  process: string;
  updatedAt: string;
};`, "typescript"),
]);

/** 기존 호출부 호환용 기본 샘플입니다. */
export const DOCUMENT_API_SAMPLE_LEXICAL_STATE = TODO_PLAN_SAMPLE_LEXICAL_STATE;
