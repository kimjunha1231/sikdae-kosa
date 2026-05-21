# 2026-05-21 실시간 협업 룰렛 방 기능 설계 문서

본 문서에서는 여러 사용자가 각각 다른 컴퓨터나 스마트폰에서 하나의 공유 링크를 통해 같은 룰렛 방(Room)에 입장하여, 실시간으로 식당 후보군(Roulette Pool)을 편집하고 동시에 룰렛 스핀과 그 결과를 공유할 수 있는 협업 시스템의 설계 사양을 정의합니다.

## 1. 아키텍처 개요

프로젝트는 Next.js App Router 기반의 React 웹 애플리케이션이며, 실시간 동기화를 위해 **Firebase Realtime Database (RTDB)**를 사용합니다.

```mermaid
graph TD
    Client1[방장 브라우저] <-->|Real-time Sync SDK| FB[(Firebase RTDB)]
    Client2[조원 A 브라우저] <-->|Real-time Sync SDK| FB
    Client3[조원 B 브라우저] <-->|Real-time Sync SDK| FB

    subgraph Firebase Database Schema
        Rooms[rooms/roomId]
        Rooms --> Pool[restaurants: list of names]
        Rooms --> Users[users: list of {nickname, isHost}]
        Rooms --> Spin[spinEvent: {status, startedAt, winner}]
    end
```

## 2. 세부 데이터 모델 (Firebase RTDB 스키마)

`rooms/[roomId]` 경로 아래에 다음 객체 구조로 데이터가 유지됩니다.

```json
{
  "restaurants": {
    "가락우동": true,
    "김치찌개": true
  },
  "users": {
    "usr_uuid_1": {
      "nickname": "배고픈 사자",
      "isHost": true,
      "lastActive": 1716300000000
    },
    "usr_uuid_2": {
      "nickname": "행복한 쿼카",
      "isHost": false,
      "lastActive": 1716300100000
    }
  },
  "spinEvent": {
    "status": "idle",
    "startedAt": 0,
    "winner": "",
    "triggerUserId": ""
  }
}
```

- **`restaurants`**: 해당 방에 추가된 식당 이름들의 맵. (배열 대신 key-value 맵으로 저장하여 개별 추가/삭제 시 충돌 방지)
- **`users`**: 방에 참여 중인 유저 정보. 유저 ID는 브라우저 `localStorage`에 무작위 생성되어 영구 저장됩니다.
- **`spinEvent`**: 룰렛 스핀 상태 정보.
  - `status`: `"idle" | "spinning" | "completed"`
  - `startedAt`: 룰렛이 회전하기 시작한 서버 시간 (밀리초). 모든 참여자가 동시에 회전 애니메이션을 실행하도록 타이밍을 맞추는 데 사용됩니다.
  - `winner`: 당첨된 식당의 이름.

## 3. 사용자 흐름 (User Experience Flow)

### 3.1. 방 생성 (방장)
- 메인 화면에 **`[실시간 공유방 만들기]`** 버튼 추가.
- 클릭 시, 6자리 영숫자 랜덤 코드(예: `KOSA88`)를 자동 생성.
- `router.push('/room/KOSA88')`을 통해 주소창을 이동시킴.

### 3.2. 방 공유 및 입장 (조원)
- 방장은 화면 상단에 노출된 **`[초대 링크 복사]`** 버튼을 클릭하여 `https://sikdae-kosa.vercel.app/room/KOSA88` 링크를 복사하여 전달.
- 해당 URL로 직접 접속한 유저들은 자동으로 해당 방에 참가.
- 최초 입장 시 닉네임을 설정하거나 무작위 닉네임("맛있는 토끼" 등)을 발급받아 입장.

### 3.3. 실시간 동기화 및 룰렛 돌리기
- 방 내부의 지도나 팝업에서 "룰렛 추가/제외" 클릭 시, Firebase DB의 `rooms/KOSA88/restaurants` 데이터가 업데이트되고 모든 멤버들의 화면에 즉시 동기화됨.
- 방 내부의 참가자 리스트 컴포넌트가 추가되어 현재 접속 중인 팀원들의 이름이 실시간으로 표기됨.
- 방 안의 어떤 유저든 `[룰렛 돌리기]`를 누르면 Firebase의 `spinEvent`가 갱신되며, 해당 방 안의 **모든 참여자의 화면에서 룰렛 다이얼이 동시에 회전**함.
- 3초의 스핀 후 모든 참여자 화면에 동일한 당첨 결과 팝업(`WinnerModal`)이 동시 출력됨.

## 4. 컴포넌트 및 소스코드 구성 계획

### 4.1. [NEW] Firebase Config 설정 파일
- `src/shared/lib/firebase.ts` 생성
  - Firebase SDK 초기화 및 Realtime Database 연결 설정.
  - `.env.local`의 환경 변수 사용.

### 4.2. [NEW] 협업 방 전용 비즈니스 로직 훅
- `src/features/collaboration/lib/useCollaborativeRoom.ts` 생성
  - `roomId`를 입력받아 Firebase 커넥션 유지.
  - 브라우저 LocalStorage 기반 유저 식별자 발급 및 익명 닉네임 부여.
  - `roulettePool` 데이터 실시간 바인딩.
  - 참가자(User) 목록 바인딩 및 본인 정보 상태 관리.
  - `spinEvent` 모니터링을 통한 애니메이션 제어 및 결과 동기화 트리거 함수 제공.

### 4.3. [NEW] 협업 방 메인 페이지 컴포넌트
- `src/app/room/[roomId]/page.tsx` 생성
  - 기존 `src/app/page.tsx` 레이아웃을 완전히 재사용하되, 상태값들을 로컬 React state가 아닌 `useCollaborativeRoom`의 실시간 반환값들로 연결.
  - 상단 헤더 영역에 공유방 정보(방 ID 및 초대 링크 복사 버튼) 및 실시간 참여 조원 목록 컴포넌트 배치.

### 4.4. [MODIFY] [RouletteSpinner.tsx](file:///Users/junha/coding/sikdae-kosa/src/features/draw-roulette/ui/RouletteSpinner.tsx)
- 협업 모드 대응을 위해 props 확장:
  - `isCollaborative?: boolean`
  - `collativeSpinState?: { status: string; startedAt: number; winner: string }`
  - `onTriggerCollaborativeSpin?: () => void`
- 룰렛 회전 트리거 로직 수정:
  - 협업 모드일 때는 자체 3초 타이머만 돌리는 대신, Firebase `spinEvent` 변경값을 수신하여 스핀을 돌리고 끝나면 결과를 띄웁니다.

---

## 5. 단계별 검증 계획

1. **정적 빌드 검증**: TypeScript 컴파일러 실행을 통해 신규 및 변경된 컴포넌트들의 에러 여부 확인 (`tsc --noEmit`).
2. **로컬 테스트(Multi-browser)**:
   - 브라우저 창 2개(일반 창 & 시크릿 창)를 열어 각각 방장과 팀원으로 다른 계정 상태로 접속.
   - 방장이 식당을 추가할 때 팀원의 룰렛 리스트에 추가되는지 확인.
   - 룰렛 돌리기를 실행했을 때 두 화면이 함께 도는지 확인.
