# 2026-05-21 식당 상세 정보 팝업 내 룰렛 추가 버튼 구현 설계 문서

## 1. 개요
사용자가 지도 마커의 상세보기나 리스트의 상세보기를 눌렀을 때 나타나는 팝업(식당 상세 모달)에서 해당 식당을 룰렛 추천 풀에 바로 추가하거나 제외할 수 있는 토글 버튼을 추가합니다. 이를 통해 사용자는 지도를 탐색하면서 먹고 싶은 식당을 직관적으로 룰렛에 골라 담을 수 있습니다.

## 2. 요구사항
- 식당 상세 모달([RestaurantDetailModal.tsx](file:///Users/junha/coding/sikdae-kosa/src/entities/restaurant/ui/RestaurantDetailModal.tsx)) 상단의 식당 이름 바로 우측에 아이콘 형태의 토글 버튼을 배치합니다.
- 식당이 룰렛 추천 후보군(`roulettePool`)에 포함되어 있지 않은 경우:
  - 연한 테두리(`border-border/60`), 회색 아이콘(`text-muted-foreground`), 호버 시 배경 강조 스타일의 버튼을 표시합니다.
  - 클릭 시 룰렛 후보군에 추가하고 아이콘을 체크 표시로 변경합니다.
- 식당이 이미 룰렛 추천 후보군에 포함되어 있는 경우:
  - 프로젝트 주 색상 배경(`bg-primary`), 흰색 체크 아이콘(`text-white`) 스타일의 버튼을 표시합니다.
  - 클릭 시 룰렛 후보군에서 제외하고 원래 상태로 변경합니다.
- 변경된 룰렛 후보군 상태는 메인 페이지 및 사이드바의 룰렛 컴포넌트와 실시간으로 동기화되어야 합니다.

## 3. UI 및 디자인 설계

### 변경할 레이아웃
상세 정보 모달 헤더 부분의 구조를 다음과 같이 수정합니다.

```tsx
<div className="flex items-center justify-between gap-4 mt-1">
  <DialogTitle className="text-xl font-black tracking-tight text-foreground truncate">
    {restaurant.name}
  </DialogTitle>
  {onTogglePool && (
    <Button
      size="icon-sm"
      variant={isInPool ? "default" : "outline"}
      className={`h-7 w-7 rounded-xl shrink-0 transition-all duration-200 cursor-pointer ${
        isInPool 
          ? 'bg-primary text-white hover:bg-primary/90' 
          : 'border-border/60 hover:bg-muted text-muted-foreground'
      }`}
      onClick={() => onTogglePool(restaurant.name)}
      title={isInPool ? "룰렛에서 제외" : "룰렛에 추가"}
    >
      {isInPool ? <Check size={14} className="stroke-[3px]" /> : <Plus size={14} />}
    </Button>
  )}
</div>
```

## 4. 컴포넌트 설계 및 데이터 흐름

### 4.1. [RestaurantDetailModal.tsx](file:///Users/junha/coding/sikdae-kosa/src/entities/restaurant/ui/RestaurantDetailModal.tsx)
- Props 인터페이스에 다음 필드를 선택적(Optional) 속성으로 추가합니다.
  - `isInPool?: boolean`
  - `onTogglePool?: (name: string) => void`
- `lucide-react`에서 `Plus`, `Check` 아이콘을 추가로 임포트합니다.

### 4.2. [page.tsx](file:///Users/junha/coding/sikdae-kosa/src/app/page.tsx)
- `RestaurantDetailModal`을 렌더링하는 코드에 `isInPool`과 `onTogglePool` 속성을 연동합니다.
  - `isInPool={detailRes ? roulettePool.includes(detailRes.name) : false}`
  - `onTogglePool={toggleRouletteSelection}`

## 5. 검증 계획
1. **정상 렌더링 검증**: 상세보기 팝업을 열었을 때 식당 이름 우측에 플러스(+) 아이콘 형태의 버튼이 보이는지 확인합니다.
2. **동작 검증**: 
   - 버튼 클릭 시 체크(✓) 아이콘 및 primary 색상으로 활성화되는지 확인합니다.
   - 활성화된 상태에서 다시 클릭 시 플러스(+) 아이콘 및 원래 연한 아웃라인 형태로 되돌아오는지 확인합니다.
3. **상태 동기화 검증**:
   - 팝업 내에서 룰렛에 추가한 식당이 좌측 사이드바의 룰렛 후보군 리스트 및 카드 체크박스 상태와 실시간으로 연동되는지 검증합니다.
   - 팝업 내에서 룰렛에 추가된 식당을 제외했을 때 사이드바의 룰렛 후보군 목록에서도 즉시 삭제되는지 검증합니다.
