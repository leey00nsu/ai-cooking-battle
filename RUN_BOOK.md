# RUN BOOK

운영/배포 환경에서 필요한 설정과 점검 절차를 정리합니다.

---

## 1. 용어 정리

- **GAM (Google Ad Manager)**: Google의 광고 서버/인벤토리 관리 플랫폼
- **GPT (Google Publisher Tag)**: 웹에서 GAM 광고를 로드하는 자바스크립트 라이브러리
- **Rewarded Ad**: 사용자가 광고를 끝까지 시청하면 보상이 지급되는 광고 포맷

---

## 2. Rewarded 광고 동작 흐름

1) 사용자가 **광고 CTA를 클릭**한다. (사용자 제스처 필수)
2) 클라이언트가 GPT 스크립트를 로드한다.
3) `/api/ads/reward/request`로 **nonce 발급**
4) Rewarded 광고 슬롯 준비 완료 → **광고 보기 버튼 활성화**
5) 시청 완료 → `/api/ads/reward/confirm` 호출 → **보상 확정**
6) 광고 슬롯 사용 가능 상태로 전환

---

## 3. GAM 인벤토리 설정 가이드

### 3.1 네트워크 확인
- GAM 네트워크 코드(`Network code`)를 확인합니다.

### 3.2 Ad Unit 생성
- Rewarded 광고용 Ad Unit을 생성합니다.
- Ad Unit Path 예시:
  - `/NETWORK_CODE/your-rewarded-unit`

### 3.3 Line Item 생성
- Rewarded Ad Unit을 타겟으로 Line Item을 생성합니다.
- 테스트 단계에서는 **House 라인 아이템**을 사용하면 편리합니다.

### 3.4 Creative 연결
- Rewarded 포맷 크리에이티브를 Line Item에 연결합니다.
- 운영 시에는 정책에 맞는 실제 크리에이티브를 사용합니다.

---

## 4. 환경 변수 설정

`.env.local`에 다음 값을 추가하세요.

```
# Rewarded Ads (Google Ad Manager / GPT)
NEXT_PUBLIC_GAM_REWARDED_AD_UNIT="/NETWORK_CODE/your-rewarded-unit"
```

> `NEXT_PUBLIC_` 접두사는 클라이언트에서 사용하기 위해 필요합니다.

### 이 값은 어떻게 얻나요?

1) GAM 콘솔 → **Inventory > Ad units**로 이동  
2) Rewarded 용도로 만든 Ad Unit을 선택  
3) 화면에 표시된 **Ad unit path**를 복사  
   - 예: `/1234567/rewarded-unit`  
4) 위 값을 그대로 `NEXT_PUBLIC_GAM_REWARDED_AD_UNIT`에 입력

---

## 5. 로컬/스테이징 테스트 체크리스트

- AdBlock/Tracker 차단 해제
- Ad Unit / Line Item 매칭 확인
- CTA 클릭 후에만 광고가 로드되는지 확인
- `RewardedSlotReady` 이벤트 수신 여부 확인
- 광고 시청 완료 후 `/api/ads/reward/confirm` 호출 확인

---

## 6. 트러블슈팅

### 광고가 보이지 않을 때
- House 라인 아이템 매칭 상태 확인
- GPT 스크립트가 **사용자 클릭 이후**에 로드되는지 확인
- Ad Unit Path 오타 여부 확인

### 보상이 지급되지 않을 때
- `/api/ads/reward/request` 응답의 `nonce`가 유효한지 확인
- `/api/ads/reward/confirm` 요청이 실제 호출되는지 확인
- `idempotencyKey`가 중복되지 않았는지 확인

---

## 7. 정책/주의사항

- **Rewarded 광고는 반드시 사용자 제스처 기반으로 로드/표시**해야 합니다.
- 광고 완료 후에만 보상을 확정해야 합니다.
- 광고 차단/닫힘/실패 시 재시도 UI를 제공해야 합니다.
