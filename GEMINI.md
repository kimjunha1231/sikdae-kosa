# GEMINI.md - 지식 축적 (Knowledge Compounding)

본 파일은 후속 AI 에이전트 세션의 원활한 업무 연계를 위해 작성되었습니다. 이번 작업에서 구현된 핵심 아키텍처 변경점과 UI 디자인 의사결정을 명시합니다.

## 1. 구현된 기능 개요
- **실시간 참여 팀원 시각화 강화**:
  - `src/app/room/[roomId]/page.tsx` 헤더 및 지도의 플로팅 카드로 실시간 참여 닉네임과 권한(방장, 본인)을 칩 리스트 형태로 렌더링.
- **악어 게임 (내기 게임) UI/UX 개선**:
  - `src/features/crocodile-game/ui/CrocodileGame.tsx` 가로 2단 레이아웃 분할 및 게임 진행 순서 타임라인 구축.
  - 내 차례 시각 포커싱(테두리 Glowing, 상단 알림 배너, 조작 가능한 이빨 위 깜빡이는 인디케이터 탑재).

## 2. 기술적 의사결정 및 규칙
- **Lucide React 아이콘 타입 제약**:
  - Lucide 컴포넌트(`Crown` 등)에는 직접 `title` 속성을 주면 TS 컴파일 에러(`TS2322`)가 발생합니다. HTML 툴팁 제공 시에는 반드시 `span` 태그 래퍼로 감싼 후 `title` 속성을 적용해야 합니다.
- **반응형 2단 레이아웃**:
  - `lg:flex-row` 브레이크포인트를 적용해 데스크톱 환경에서는 악어 보드(왼쪽)와 타임라인 패널(오른쪽)이 2단 가로 정렬되며, 화면이 좁아지는 모바일 환경에서는 `flex-col`로 안전하게 흘러내리도록 설계했습니다.
- **상태 관리**:
  - 룰렛 방 참여자 수 및 현재 턴 유저(`turnUserId`), 벌칙 패배자(`loserNickname`) 등은 `useCollaborativeRoom.ts` 훅을 통해 Firebase Realtime DB와 실시간 동기화됩니다. UI 측에서 `participants`를 `id` 오름차순으로 정렬하면 Firebase 내 게임 턴 이동 인덱스 계산법과 일관되게 정렬할 수 있습니다.
- **카카오 지도 커스텀 오버레이 클러스터링 & 타입 정의 규칙**:
  - 카카오 지도 SDK의 `MarkerClusterer`는 HTML 커스텀 오버레이(`CustomOverlay`) 객체를 군집화할 수 없습니다. 따라서 Toss UI 스타일 마커 디자인 보존을 위해 **위/경도 및 그리드 기반 순수 JS 클러스터링 알고리즘**을 `KakaoMapView.tsx`에 탑재했습니다. 지도의 줌 레벨 `zoomLevel >= 4`일 때 군집화됩니다.
  - 외부 SDK 스크립트를 동적으로 로드함에 따라 `KakaoMapView.tsx` 상단에 `KakaoMap` 인터페이스를 임시 선언해 활용합니다. 줌 레벨 감지 및 클러스터 클릭 시의 줌인 애니메이션 연동을 위해 반드시 **`getLevel: () => number`** 및 **`setLevel: (level: number, options?: { animate: boolean }) => void`** 메서드 시그니처가 인터페이스 타입에 명시되어야 빌드 에러를 예방할 수 있습니다.
- **Restaurant 엔티티 스키마**:
  - API 가공 로직(`api/restaurants/route.ts`)에서 인스타그램 크롤링 정보를 주입하기 위해 `src/entities/restaurant/model/types.ts` 내 `Restaurant` 인터페이스에는 반드시 **`instagram_link?: string | null;`** 필드가 선언되어 있어야 합니다.

## 3. 크롤링 및 음식점 데이터 관리
- **Naver Place ID 하드코딩 예외**:
  - `scratch/fetch_menus_images.py`에서 네이버 플레이스 검색 시 올바르지 않은 ID를 반환하거나 누락되는 식당(예: `김가네(가락본동점)`, `함경도찹쌀순대(가락점)`)은 스크립트 내부에 `place_id` 및 검색 썸네일을 직접 매핑하여 무중단 크롤링이 가능하도록 조치했습니다.
- **특정 식당 데이터의 빠른 갱신 팁**:
  - 전체 식당 목록(84개)을 재크롤링하면 네이버 검색 API 레이턴시 및 폴라이트니스 딜레이로 인해 스크립트 실행에 수 분 이상 소요될 수 있습니다.
  - 특정 식당만 점검/업데이트하려면 스크립트 내부의 `is_invalid_cache` 조건문에서 특정 식당 명만 `True`로 잡고, 나머지 식당은 캐시 히트로 흘려보내도록 임시 조치하면 수 초 내에 갱신을 완료할 수 있습니다.
