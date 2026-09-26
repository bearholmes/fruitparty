# 과실 잔치 (Fruit Party)

같은 과일을 합쳐 더 큰 과일을 만드는 수박 게임 스타일의 웹 퍼즐 게임입니다.
물리 엔진 기반 낙하·합체 플레이에 콤보, 피버타임, 온라인 리더보드를 더했습니다.

이 프로젝트는 muse-spark-1.3를 테스트해보기 위한 프로젝트입니다.
Muse 내장 이미지 생성 결과물이 만족스럽지 않아 일부 GPT 6를 사용하였습니다. 또한 리더보드는 GPT Site를 이용하기 위해 일부 사용하였습니다.
- 설계 및 로직 전반 : muse-spark 1.3 MAX
- 리더보드 및 이미지 생성 : GPT 6-Sol High


## 게임 방법

- ← → 키로 이동, 클릭 / Space로 과일 낙하
- ↑ ↓ 키로 박스 흔들기 (2초 쿨다운, 위험 상태에서는 5회 제한)
- 같은 과일 2개가 잠시 맞닿아 있으면 상위 과일 1개로 합체
- 빨간 선 위에 과일이 3초 쌓이면 게임 오버
- P · Esc로 일시정지 (탭 전환 시 자동 정지)

### 진화 단계 (10단계)

방울토마토 → 딸기 → 귤 → 참다래 → 복숭아 → 사과 → 배 → 포도 → 참외 → 단감

### 피버타임

단감 2개가 만나면 폭발과 함께 30초 피버타임이 발동합니다.
피버 중에는 점수 3배, 빠른 낙하 쿨다운, 주변 과일 정리가 적용됩니다.

## 주요 기능

- Matter.js 물리 기반 과일 낙하·충돌·합체
- 콤보 배율, 진화 토스트, 게임 오버 기록 저장(스크린샷 PNG)
- 배경음악 / 효과음 볼륨 조절 (Web Audio)
- 일간 · 주간 · 전체 베스트 20 온라인 리더보드
- 반응형 UI (모바일 도감·설정 패널)

## 기술 스택

- React 19 + TypeScript + Vite
- Matter.js (물리), Zustand (상태), Lucide (아이콘)
- Vinext + Cloudflare Workers (배포), D1 + Drizzle ORM (리더보드 DB)
- Vitest + ESLint

## 시작하기

필요 조건: Node.js 22.13 이상

```bash
npm install
npm run dev      # 개발 서버 실행
npm test         # 테스트 실행
npm run lint     # 린트
npm run build    # 프로덕션 빌드
```

## 프로젝트 구조

```text
src/
  App.tsx          # 게임 UI (보드, 도감, 리더보드, 설정)
  game/
    useSuika.ts    # 게임 루프·물리·합체·피버 로직
    store.ts       # Zustand 전역 상태
    art.ts         # 과일 데이터·스프라이트
    constants.ts   # 보드 치수·타이밍 상수
    bgm.ts / sfx.ts        # 오디오
    leaderboard.ts # 리더보드 API 클라이언트
app/
  api/leaderboard/route.ts # 리더보드 API (GET/POST)
db/
  schema.ts        # leaderboard 테이블 정의
  leaderboard.ts   # TOP 20 조회·등록
  periods.ts       # 일간·주간 집계 기간 계산
public/
  fruits/          # 과일 스프라이트 (10종)
```
