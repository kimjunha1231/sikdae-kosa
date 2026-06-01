# 🐊 실시간 멀티플레이 악어 이빨 누르기 게임 설계서

이 문서는 **식대 코사 (sikdae-kosa)** 서비스의 실시간 방(Room)에 조원들과 벌칙자를 선정할 수 있는 **악어 이빨 누르기(Crocodile Dentist)** 게임을 실시간 동기화로 구현하기 위한 설계 사양입니다.

---

## 1. 아키텍처 정의 (FSD 패턴)

FSD (Feature-Sliced Design) 아키텍처 규칙에 맞추어 레이어와 슬라이스를 나눕니다.

### A. 신규 슬라이스: `src/features/crocodile-game`
* 비즈니스 로직과 UI 인터랙션을 담아내는 피처 레이어입니다.
* **`ui/CrocodileGame.tsx`**: 악어 모형 렌더링, 프레스 모션, 쾅 닫히는 애니메이션, 턴 표시 상태창을 렌더링합니다.
* **`index.ts`**: 외부로 `CrocodileGame` 컴포넌트만 노출하는 Public API입니다.

### B. 기존 슬라이스 수정: `src/features/collaboration`
* **`lib/useCollaborativeRoom.ts`**: Firebase Realtime Database와의 상태 연동 훅입니다.
* 악어 게임과 연계된 액션들(`startCrocodileGame`, `pressCrocodileTooth`, `resetCrocodileGame`)을 정의합니다.

### C. 최상위 라우터 연동: `src/app/room/[roomId]`
* **`page.tsx`**: 방 페이지에서 지도 뷰와 악어 게임 뷰의 스위칭 상태를 다룹니다.
* Firebase의 `crocodileGame.status`가 `'playing'` 또는 `'bitten'`일 경우 지도 대신 악어 게임 화면을 화면 중앙에 렌더링합니다.

---

## 2. Firebase Database 실시간 동기화 스키마

각 방(`rooms/${roomId}`)의 하위 경로에 `crocodileGame` 노드를 추가하여 실시간 동기화를 구축합니다.

```typescript
interface CrocodileGameState {
  status: 'idle' | 'playing' | 'bitten'; // 게임 상태
  teeth: Record<string, 'unpressed' | 'pressed'>; // 이빨 상태 (0 ~ 7)
  dangerIndex: number; // 벌칙 이빨 번호 (0 ~ 7)
  turnUserId: string; // 현재 클릭해야 하는 유저의 ID
  loserNickname: string; // 물린 사람(패배자)의 닉네임
}
```

---

## 3. 핵심 비즈니스 로직 및 상태 제어

### A. 게임 시작 (Initialize)
방에 속한 모든 사용자는 "내기 게임 시작" 버튼을 눌러 게임을 활성화할 수 있습니다.
1. `status`를 `'playing'`으로 설정합니다.
2. 8개의 이빨 상태를 모두 `'unpressed'`로 초기화합니다.
3. 벌칙 이빨(`dangerIndex`)을 0~7 중 랜덤값으로 지정합니다.
4. 참여자 목록(`participants`)을 유저 ID 기준으로 정렬한 뒤, 가장 첫 번째 참여자를 `turnUserId`로 지정합니다.
5. `loserNickname`을 빈 문자열(`""`)로 비웁니다.

### B. 이빨 클릭 (Click Action)
현재 턴인 사용자(`currentUser.id === turnUserId`)가 이빨 `i`를 클릭하면 트리거됩니다.
1. `teeth[i]`의 상태를 `'pressed'`로 업데이트합니다.
2. **벌칙 이빨 클릭 시 (`i === dangerIndex`)**:
   * `status`를 `'bitten'`으로 변경합니다.
   * `loserNickname`을 현재 클릭한 유저의 닉네임으로 저장합니다.
3. **안전한 이빨 클릭 시 (`i !== dangerIndex`)**:
   * 현재 접속해 있는 유저 리스트(`participants`)를 정렬하여 `turnUserId`의 다음 차례 유저 ID를 계산합니다.
   * 계산된 다음 유저 ID로 `turnUserId`를 업데이트합니다.

### C. 예외 처리: 플레이어 이탈 대응
* 게임 도중 차례를 잡고 있던 유저가 브라우저 종료 등으로 나가버리는 경우를 처리합니다.
* 방의 호스트(`isHost === true`) 클라이언트가 실시간으로 참여자 리스트(`participants`)를 모니터링하여, `turnUserId`를 가진 참여자가 오프라인이 되었을 경우 자동으로 다음 순서의 온라인 참여자로 `turnUserId`를 교체(Skip)합니다.

---

## 4. UI/UX 및 디자인 가이드라인 (Toss UI 스타일)

* **테마**: 어두운 네이비 회색 `#0f1015` 바탕에 부드러운 그린 톤의 입체감 있는 악어 그래픽(HTML/CSS/SVG)을 렌더링합니다.
* **애니메이션**: 
  * `framer-motion`을 사용하여 위턱(`croc-upper-jaw`)이 닫힐 때 강하고 쫀득한 스프링 모션(`stiffness: 400, damping: 15`)을 적용합니다.
  * 물리는 순간 화면 및 악어 본체가 약하게 요동치는 흔들림(Shake) 효과를 추가합니다.
  * 눈동자는 안전할 때는 아래를 주시하거나 눈꺼풀이 미세하게 깜빡이며, 물렸을 때는 빨간색 앵그리 아이 또는 X_X 형태로 교체됩니다.
* **턴 상태 표시 바**:
  * "나의 턴"인 경우, 테두리에 파란색 파동 효과와 함께 버튼 형태로 이빨 클릭이 활성화됨을 암시합니다.
  * 타인의 턴인 경우, 누구의 턴인지 표시하며 마우스 커서가 차단(`cursor-not-allowed`)됩니다.
