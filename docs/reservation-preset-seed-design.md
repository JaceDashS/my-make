# 예약 / 프리셋 / 재고 연계 시드 정리

## 목적

이 문서는 현재 프로젝트 기준으로 아래 4개를 어떻게 연결할지 정리한다.

- student
- teacher
- preset
- reservation

핵심은 "현재 실제 구조로 어디까지 가능한가"와 "무엇을 반드시 전제로 해야 하는가"다.

## 최종 결론

이번 기준에서 유지할 핵심 규칙은 아래다.

1. student preference 는 `preferenceRanges` 로 저장한다.
2. teacher preset 은 우선 teacher profile 의 JSON 문자열로 저장한다.
3. reservation 은 `presetId` 로 preset 과 연결한다.
4. inventory item 은 모두 `COST`, `PRICE`, `L/C/H` 를 가져야 한다.
5. 이후 적합성 판단은 `student preferenceRanges` 와 `inventory item L/C/H` 비교를 기준으로 한다.

## 실제 구조 1. 학생 데이터

student 쪽 핵심 값:

- `skinLValue`
- `skinCValue`
- `skinHValue`
- `skinTraits`
- `preferenceRanges`

현재 의미:

- `skinL/C/H` 는 학생 대표 피부값
- `skinTraits` 는 자유 메모
- `preferenceRanges` 는 학생의 색상 선호 범위 문서

권장 해석 구조:

```ts
{
  skinLValue: '65.5',
  skinCValue: '14.2',
  skinHValue: '58.1',
  skinTraits: 'Neutral undertone, soft natural finish preferred.',
  preferencePoints: {
    version: 3,
    space: 'hcl',
    matchMode: 'point-distance',
    categories: {
      base_foundation: {
        pointMode: 'single',
        points: [{l: 64.5, c: 13.2, h: 57.0, radius: 6.0}],
      },
    },
  },
}
```

중요:

- 이후 매칭을 위해 `preferenceRanges` 는 `point + radius` 구조여야 한다.
- 즉 `radius` 는 저장되어야 한다.

## 실제 구조 2. 선생님 데이터

teacher 쪽 핵심 값:

- `availableSchedule`
- `preset`

`availableSchedule` 은 실제 예약 가능 시간 JSON 으로 사용한다.

예시:

```json
{
  "timezone": "Asia/Seoul",
  "weekly": {
    "mon": [{"start": "10:00", "end": "12:00"}],
    "tue": [],
    "wed": [],
    "thu": [],
    "fri": [],
    "sat": [],
    "sun": []
  },
  "exceptions": []
}
```

`preset` 은 현재 별도 테이블이 아니라 teacher profile 안의 JSON 문자열로 단순 저장한다.

중요:

- category 는 `categoryCode` 라고 부르지 않는다.
- category 값은 별도 코드 객체가 아니라 카테고리 이름 문자열이다.
- teacher 의 `preset` 필드는 프리셋 1개가 아니라 프리셋 묶음 1개를 담는 단일 객체다.
- 각 프리셋은 `presets` 배열 안의 객체 1개다.
- 각 프리셋 객체는 내부에 `id` 를 가진다.
- 각 프리셋 객체는 `createdAt`, `updatedAt` 를 가진다.
- 각 프리셋 객체는 `note` 를 가진다.
- 각 프리셋 내부에서는 category 이름이 `items` 객체의 key 다.
- 같은 category 에 여러 item 을 쓰려면 배열로 넣는다.
- category 에 값이 없으면 빈 배열이 아니라 `null` 을 넣는다.

예시:

```json
{
  "version": 1,
  "presets": [
    {
      "id": 1,
      "name": "Soft Daily Coral",
      "createdAt": "2026-04-02T09:00:00+09:00",
      "updatedAt": "2026-04-02T09:00:00+09:00",
      "note": "Daily coral tone preset for soft warm classes.",
      "items": {
        "base_foundation": ["FND-001"],
        "blush": ["BLS-002", "BLS-003"],
        "lip_color": ["LIP-014"],
        "eyeshadow": ["EYE-021"],
        "contour": ["CON-004"],
        "highlighter": ["HIL-003"],
        "etc": null
      }
    },
    {
      "id": 2,
      "name": "Warm Daily Peach",
      "createdAt": "2026-04-02T09:30:00+09:00",
      "updatedAt": "2026-04-02T10:10:00+09:00",
      "note": "Peach-focused preset for natural daytime looks.",
      "items": {
        "base_foundation": ["FND-003"],
        "blush": ["BLS-006"],
        "lip_color": ["LIP-022"],
        "eyeshadow": null,
        "contour": ["CON-004"],
        "highlighter": null,
        "etc": ["FIX-002"]
      }
    }
  ]
}
```

## 실제 구조 3. 예약 데이터

reservation 은 실제 SQL 테이블이 이미 있다.

실제 테이블 `MAIMEI_LESSON_RESERVATIONS` 기준 핵심 컬럼:

- `RESERVATION_ID`
- `RESERVATION_CODE`
- `ACADEMY_CODE`
- `STUDENT_ID`
- `TEACHER_ID`
- `PRESET_ID`
- `STARTS_AT_UTC`
- `RESERVATION_AT`
- `STATUS_CODE`
- `CANCELED_AT`
- `NOTE_BODY`
- `CREATED_AT`
- `CREATED_BY`
- `UPDATED_AT`
- `UPDATED_BY`

중요한 해석:

- 예약은 student 와 teacher 를 직접 연결한다.
- 예약은 academy 소속 데이터다.
- 예약 시각은 단일 컬럼만 보는 구조가 아니라 아래 2개를 함께 본다.
  - `STARTS_AT_UTC`
  - `RESERVATION_AT`
- `RESERVATION_AT` 는 로컬 기준 예약 시작 시각이다.
- `STARTS_AT_UTC` 는 UTC 기준 예약 시작 시각이다.
- `PRESET_ID` 는 nullable 이다.
- `STATUS_CODE` 는 `PENDING`, `CONFIRMED`, `CANCELED` 중 하나다.
- active slot unique index 는 `TEACHER_ID + STARTS_AT_UTC` 기준이다.

정리하면:

- reservation 과 preset 의 연결은 `PRESET_ID` 로 한다.
- reservation 의 실제 핵심 시간 구조는 `STARTS_AT_UTC + RESERVATION_AT` 이다.
- 저장 기준에서 `STARTS_AT_UTC` 가 예약 시작 기준값이고, `RESERVATION_AT` 는 로컬 표현용 시작 시각이다.

## 실제 구조 4. 재고 데이터

inventory 는 아래 컬럼을 공식 구조로 본다.

- `ITEM_ID`
- `ITEM_CODE`
- `ACADEMY_CODE`
- `SKU`
- `ITEM_NAME`
- `CATEGORY_CODE`
- `COST`
- `PRICE`
- `L_VALUE`
- `C_VALUE`
- `H_VALUE`
- `IMAGE_URL`
- `STOCK_COUNT`
- `NOTE_BODY`
- `STATUS_CODE`

중요 규칙:

- 모든 inventory item 은 `L/C/H` 를 가져야 한다.
- 일부 카테고리만 예외로 빼지 않는다.
- student preference 와 비교하려면 item 자체에 색 좌표가 있어야 한다.
- `SKU` 는 반드시 고유해야 한다.
- 애플리케이션 레벨에서는 `categoryCode` 대신 `category` 라는 이름을 쓴다.
- 이 `category` 값은 `base_foundation`, `blush` 같은 카테고리 이름 문자열이다.

역직렬화 예시:

```ts
{
  itemId: 1001,
  itemCode: 'IV0000001001',
  academyCode: 'abc123def456',
  sku: 'FND-001',
  itemName: 'Soft Natural Foundation 01',
  category: 'base_foundation',
  cost: 32000,
  price: 48000,
  lValue: 64.5,
  cValue: 13.2,
  hValue: 57.0,
  imageUrl: 'https://example.com/items/fnd-001.png',
  stockCount: 12,
  note: 'Daily class stock',
  statusCode: 'ACTIVE',
}
```

## 연결 규칙

이번 시드에서 연결 규칙은 단순하다.

1. student 는 `preferenceRanges` 를 가진다.
2. teacher 는 `preset` JSON 을 가진다.
3. teacher `preset` 객체 안에서 `presets` 배열로 개별 preset 을 가진다.
4. 각 preset 은 내부 `id` 를 가진다.
5. 각 preset 의 `items` 값은 inventory 의 `SKU` 배열을 가진다.
6. reservation 은 `presetId` 로 preset 의 `id` 를 가리킨다.
6. 적합성 판단은 preset 이 참조한 inventory item 의 `L/C/H` 와 student preference 를 비교한다.

여기서 category 표현 규칙은 아래와 같다.

- category 는 이름 문자열을 그대로 쓴다.
- 예: `base_foundation`, `blush`, `lip_color`
- preset 내부의 `items` 객체에서 이 이름이 key 다.
- 값이 없으면 빈 배열 대신 `null` 을 사용한다.

## 단일 시드 기준

최소 단위는 아래면 충분하다.

- student 1명
- teacher 1명
- preset 1개
- reservation 1개
- inventory item 4개 이상

inventory item 은 최소한 preset 에 들어가는 SKU 수만큼 필요하다.

## 남은 구현 포인트

현재 바로 결정해야 하는 건 이것들이다.

1. teacher preset JSON 스키마 확정
2. inventory API / UI 를 `COST + PRICE + L/C/H` 기준으로 정식화
3. teacher `preset` 필드를 "단일 객체 안에 여러 preset" 구조로 확정

## 추가 운영 규칙

- preset 의 식별자는 `presetId` 가 아니라 내부 필드 `id` 로 유지한다.
- reservation 의 `presetId` 는 preset 객체의 `id` 를 가리킨다.
- `items` 에서 category 값이 없으면 `[]` 가 아니라 `null` 을 사용한다.
- preset 은 수정 가능하고 삭제도 가능하다.

## 승인 기준

이 문서는 아래 기준이면 승인 가능하다.

1. inventory 는 `COST + PRICE + L/C/H` 를 공식 구조로 사용한다.
2. 모든 inventory item 은 색상 정보가 필수다.
3. preset 은 teacher profile JSON 의 단일 객체 안에 여러 preset 을 저장한다.
4. 각 preset 내부의 `items` 는 category 이름을 key 로 사용한다.
5. 각 preset 은 `createdAt`, `updatedAt`, `note` 를 가진다.
6. 각 category 값은 SKU 배열 또는 `null` 을 가진다.
7. reservation 은 `presetId` 로 해당 preset 의 `id` 와 연결한다.
6. student preference 와 inventory 색상 비교를 적합성 판단의 기준으로 삼는다.
