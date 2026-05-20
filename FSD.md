# Feature-Sliced Design (FSD) 아키텍처 가이드라인 (FSD.md)

이 문서는 본 프로젝트에 적용된 **FSD (Feature-Sliced Design)** 아키텍처의 구조, 레이어 규칙 및 가져오기(Import) 가이드라인을 정의합니다. 모든 코드 추가 및 리팩토링 시 이 규칙을 엄격하게 준수해야 합니다.

---

## 1. 아키텍처 개요 (Layer Overview)

FSD는 코드를 책임과 도메인에 따라 6개의 계층(Layers)으로 분리합니다. 각 계층은 하위 계층에만 의존할 수 있으며, 동일 계층 간의 직접 참조는 금지됩니다. (단방향 의존성 규칙)

```
▲ [최상위] app/          - 전역 설정, 프로바이더, 레이아웃, Next.js 라우트 정의
│         widgets/      - 여러 피처와 엔티티를 조합한 대형 UI 블록 (예: Sidebar, MapView)
│         features/     - 사용자 인터랙션 및 비즈니스 기능 (예: draw-roulette, search-filter)
│         entities/     - 비즈니스 도메인 데이터 모델 및 기초 컴포넌트 (예: restaurant)
▼ [최하위] shared/       - 도메인을 모르는 범용 재사용 가능 모듈 (예: ui/*, lib/*)
```

---

## 2. 계층별 세부 구조 및 책임 (Directory Structure)

본 프로젝트의 FSD 구조는 다음과 같이 매핑됩니다:

### 📂 `src/shared` (최하위 레이어)
비즈니스 로직(식당, 룰렛 등)을 전혀 모르는 **범용적이고 독립적인 유틸리티 및 UI**입니다.
- `shared/ui/`: shadcn/ui 기반의 기초 컴포넌트 (`badge`, `button`, `card`, `dialog`, `input`, `select` 등)
- `shared/lib/`: 공통 유틸리티 헬퍼 (`utils.ts` 등)

### 📂 `src/entities` (엔티티 레이어)
비즈니스 개념의 핵심 도메인 모델과 기초적인 카드/모달을 표현합니다.
- `entities/restaurant/model/types.ts`: `Restaurant`, `Menu` 인터페이스 등 타입 선언
- `entities/restaurant/ui/RestaurantCard.tsx`: 식당의 외관을 렌더링하는 단순 UI 카드
- `entities/restaurant/ui/RestaurantDetailModal.tsx`: 식당의 메뉴 목록과 세부 정보를 보여주는 모달
- `entities/restaurant/index.ts`: 엔티티 외부로 공개할 컴포넌트와 타입을 정의하는 Public API

### 📂 `src/features` (피처 레이어)
사용자에게 실질적인 가치를 제공하는 **동적인 인터랙션 및 비즈니스 액션**입니다.
- `features/search-filter-restaurants/`: 검색어 디바운싱 필터, 카테고리 탭, 정렬 조건 제어
- `features/draw-roulette/`: 룰렛 판 회전(`RouletteSpinner`), 당첨 결과 및 컨페티 모션 연출(`WinnerModal`)
- 각 피처는 폴더 루트에 `index.ts`를 두어 필요한 컴포넌트만 외부로 노출합니다.

### 📂 `src/widgets` (위젯 레이어)
피처와 엔티티들을 조합하여 페이지의 특정 레이아웃 구역을 가득 채우는 **독립적인 대형 UI 블록**입니다.
- `widgets/sidebar/`: `SidebarHeader`, `SearchFilterPanel`, `RestaurantCard` 리스트를 합쳐 왼쪽 영역을 통째로 구성
- `widgets/map-view/`: 카카오 지도(`KakaoMap`) 영역과 그 위에 뜨는 floating `RouletteSpinner` 오버레이를 조합하여 우측 영역 구성

### 📂 `src/app` (최상위 레이어)
앱의 진입점이자 레이아웃 정의 영역입니다.
- `app/page.tsx`: 최상위 뷰로, `<Sidebar />`와 `<KakaoMapView />` 위젯을 결합하고 전역 상태 동기화
- `app/layout.tsx`: 전역 레이아웃 및 폰트 설정
- `app/globals.css`: TailwindCSS 및 테마 스타일 설정
- `app/api/`: 백엔드 라우트 핸들러

---

## 3. 가져오기 및 의존성 규칙 (Import Rules)

FSD 아키텍처의 핵심은 **의존성의 통제**입니다. 코드 작성 시 다음 세 가지 규칙을 반드시 엄격히 지켜야 합니다.

### 🚨 규칙 1: 하향식 단방향 의존성 (No Upward Imports)
하위 레이어는 절대 상위 레이어의 코드를 임포트할 수 없습니다.
- ❌ `entities/restaurant` 내부에서 `features/draw-roulette`에 있는 컴포넌트나 함수를 임포트하면 안 됩니다.
- ❌ `shared/ui/button.tsx` 내부에서 `entities/restaurant` 타입이나 컴포넌트를 가져오면 안 됩니다.
- ⭕ `widgets`는 `features`, `entities`, `shared`를 가져올 수 있습니다.
- ⭕ `features`는 `entities`, `shared`를 가져올 수 있습니다.

### 🚨 규칙 2: 동일 레이어 교차 참조 금지 (No Cross-Slice Imports)
같은 레이어 내의 다른 폴더(Slice)끼리는 서로를 임포트할 수 없습니다.
- ❌ `features/draw-roulette` 내부에서 `features/search-filter-restaurants`를 직접 가져와서 쓰면 안 됩니다.
- 두 피처 간에 공유되거나 상호작용해야 하는 상태가 있다면, 상위 레이어인 `widgets`나 `app/page.tsx`에서 상태(State)를 관리하고Props나 콜백으로 전달해야 합니다.

### 🚨 규칙 3: Public API 사용 (Index.ts)
다른 슬라이스의 파일을 참조할 때는 슬라이스의 루트에 선언된 `index.ts`를 통해서만 가져와야 합니다. 슬라이스 내부의 세부 구현 파일 경로를 직접 참조하는 것을 금지합니다.
- ❌ `import RestaurantCard from '@/entities/restaurant/ui/RestaurantCard'`
- ⭕ `import { RestaurantCard } from '@/entities/restaurant'`

---

## 4. 컴포넌트 추가 시 개발 체크리스트

새로운 비즈니스 로직이나 UI 컴포넌트를 추가할 때는 스스로 질문을 해보고 알맞은 위치를 선정하세요:

1. **비즈니스 개념을 가지고 있는가?**
   - **아니오** ➡️ `src/shared/ui/`에 기초 UI로 추가합니다.
   - **예** ➡️ 맛집이나 메뉴판 등 데이터 자체와 가깝다면 `src/entities/`로 갑니다.
2. **동적인 유저 액션이나 비즈니스 로직(필터링, 추첨 등)을 포함하는가?**
   - **예** ➡️ `src/features/`에 기능 단위 폴더를 생성하고 구현합니다.
3. **여러 도메인을 결합한 하나의 큰 독립 구역인가?**
   - **예** ➡️ `src/widgets/`로 구성하여 상위 페이지의 코드가 비대해지는 것을 방지합니다.
4. **다른 피처에서 해당 기능 내부 파일에 직접 접근하려 하는가?**
   - **금지** ➡️ 반드시 `index.ts`를 생성하고 필요한 것만 `export` 하도록 제한합니다.
