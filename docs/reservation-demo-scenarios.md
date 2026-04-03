# 예약 데모 시나리오 문서

## 목적

이 문서는 예약 기능을 실제 데모할 때 필요한 최소 데이터와 진행 순서를 정리한다.

이번 문서의 목적은 2개다.

1. 짧은 데모를 빠르게 재현할 수 있게 한다.
2. 전체 사용자 여정을 긴 데모로 순서대로 보여줄 수 있게 한다.

## 데모 종류

이번 데모는 아래 2종류로 나눈다.

- 짧은 데모
- 긴 데모

짧은 데모는 이미 계정과 기본 연결이 존재하는 상태에서 예약과 승인 흐름만 빠르게 보여주는 버전이다.

긴 데모는 라이센스 발급부터 회원 생성, 승인, 설정, 예약, 승인, 양측 확인까지 전 과정을 보여주는 버전이다.

## 공통 전제

두 데모 모두 아래 전제가 필요하다.

- academy 가 존재해야 한다.
- teacher 와 student 가 같은 academy 소속이어야 한다.
- student 는 primary teacher 가 연결되어 있어야 한다.
- teacher 는 `availableSchedule` 을 가져야 한다.
- teacher 는 `preset` JSON 을 가져야 한다.
- student 는 `skinLValue`, `skinCValue`, `skinHValue`, `skinTraits`, `preferenceRanges` 를 가져야 한다.
- inventory 연동형 preset item 은 참조 대상 inventory item 을 가져야 한다.
- inventory item 은 모두 `COST`, `PRICE`, `L/C/H` 를 가져야 한다.

## 이번 문서에서 확정할 preset item 방향

기존 문서에서는 preset 이 category 별 `SKU 문자열 배열`만 저장하는 것으로 적혀 있었지만, student 화면에서 확정 예약의 화장품을 자세히 보여주려면 이 구조로는 부족하다.

이제 preset item 은 아래 원칙으로 잡는 편이 자연스럽다.

- preset 은 item 을 `문자열 SKU`가 아니라 `객체 배열`로 저장한다.
- 각 item 은 최소한 `itemName` 을 항상 가진다.
- 사진 표시를 위해 `imageUrl` 도 preset item 안에 같이 저장할 수 있어야 한다.
- inventory 에서 가져온 item 은 inventory 연결 정보와 SKU 를 같이 가진다.
- inventory 에 없는 수동 item 은 `itemName` 만으로도 저장 가능해야 한다.
- 즉 `sku` 는 필수가 아니고, inventory 연동 item 일 때만 optional 하게 들어갈 수 있다.

권장 구조는 아래처럼 잡는다.

```ts
type PresetItemSource = 'inventory' | 'manual';

type PresetItemRef = {
  source: PresetItemSource;
  itemName: string;
  imageUrl?: string | null;
  sku?: string | null;
};
```

해석 기준:

- item 이 어느 category 소속인지는 item 객체 안의 `category` 필드가 아니라, 상위 `items` object 의 key 로 판단한다.
- 따라서 item 객체에는 `category` 를 중복 저장하지 않는다.

- `source = 'inventory'`
  - inventory 에서 가져온 item 이다.
  - `itemName` 은 저장 시점의 표시용 snapshot 으로 함께 넣는다.
  - `imageUrl` 도 가능하면 같이 넣는다.
  - `sku` 는 있으면 저장한다.
- `source = 'manual'`
  - inventory 에 없는 item 이다.
  - `itemName` 은 필수다.
  - `sku` 는 없어도 된다.
  - `imageUrl` 은 있으면 넣고, 없으면 비워도 된다.

이 구조를 쓰면 다음 단계에서 아래 요구를 자연스럽게 받을 수 있다.

- inventory 에서 선택한 item 은 이름과 사진이 자동으로 붙는다.
- inventory 에 없는 item 은 teacher 가 이름을 직접 적어 넣을 수 있다.
- student 예약 상세에서는 inventory 조회 실패 여부와 무관하게 preset 안의 표시용 정보로 이름/사진을 보여줄 수 있다.

## 짧은 데모 목표

짧은 데모에서 보여줄 핵심은 아래다.

1. student 가 예약을 신청한다.
2. teacher 가 예약 요청을 확인한다.
3. teacher 가 preset 을 선택하며 예약을 승인한다.
4. 승인 결과가 student 와 teacher 양쪽에서 보인다.

## 짧은 데모용 초기 데이터

짧은 데모를 위해 초기화 시점에 아래 데이터가 함께 준비되어야 한다.

- student 1명
- teacher 1명
- inventory item 여러 개
- teacher schedule 1개
- teacher preset bundle 1개
- student skin data 1개
- student preferenceRanges 1개
- reservation 1개

이때 reservation 은 아래 상태로 시작하는 것이 가장 데모하기 쉽다.

- `STATUS_CODE = 'PENDING'`
- student 와 teacher 가 서로 연결된 상태
- 예약 시각은 teacher schedule 안의 실제 가능한 slot 이어야 한다.
- `PRESET_ID` 는 비워 두거나, teacher 가 승인 시 선택할 수 있게 nullable 상태로 둔다.

## 짧은 데모용 student 데이터 원칙

student 데이터는 단순 샘플이 아니라 preset 비교 데모가 가능해야 한다.

필요 조건:

- 학생 대표 피부값 `skinL/C/H` 가 있어야 한다.
- `preferenceRanges` 는 `point + radius` 구조를 사용해야 한다.
- 최소한 `base_foundation` 와 `lip_color` 또는 `blush` 같은 주요 category 에 대한 선호 범위가 있어야 한다.

예시 방향:

- `base_foundation` 는 비교적 좁은 반경으로 설정한다.
- `lip_color` 는 중간 반경으로 설정한다.
- `blush` 는 조금 더 넓은 반경으로 설정할 수 있다.

## 짧은 데모용 inventory mock 기준

짧은 주입에서 바로 데모하려면 inventory 연동형 preset item 이 참조할 수 있는 inventory mock 이 먼저 있어야 한다.

권장 최소 category:

- `base_foundation`
- `blush`
- `lip_color`
- `eyeshadow`
- `contour`
- `highlighter`
- `etc`

권장 최소 수량:

- category 당 2개 이상
- 전체 10개 이상

이유:

- teacher preset 을 2개 이상 만들려면 같은 category 안에서도 선택지가 있어야 한다.
- 학생 선호에 맞는 item 과 일부러 벗어나는 item 을 같이 준비해야 한다.
- inventory 연동형 preset item 의 이름 / SKU / 사진 snapshot 을 안정적으로 만들 수 있어야 한다.

## 짧은 데모용 inventory mock 예시

아래 정도 구성이면 데모에 충분하다.

```ts
[
  {
    sku: 'FND-001',
    itemName: 'Soft Natural Foundation 01',
    category: 'base_foundation',
    lValue: 64.5,
    cValue: 13.2,
    hValue: 57.0,
    cost: 32000,
    price: 48000,
  },
  {
    sku: 'FND-003',
    itemName: 'Warm Natural Foundation 03',
    category: 'base_foundation',
    lValue: 70.0,
    cValue: 20.0,
    hValue: 74.0,
    cost: 32000,
    price: 48000,
  },
  {
    sku: 'BLS-002',
    itemName: 'Soft Peach Blush',
    category: 'blush',
    lValue: 67.0,
    cValue: 24.0,
    hValue: 44.0,
    cost: 18000,
    price: 29000,
  },
  {
    sku: 'BLS-003',
    itemName: 'Warm Coral Blush',
    category: 'blush',
    lValue: 60.0,
    cValue: 36.0,
    hValue: 28.0,
    cost: 18000,
    price: 29000,
  },
  {
    sku: 'LIP-014',
    itemName: 'Muted Coral Lip',
    category: 'lip_color',
    lValue: 52.0,
    cValue: 40.0,
    hValue: 25.0,
    cost: 15000,
    price: 24000,
  },
  {
    sku: 'LIP-022',
    itemName: 'Warm Peach Lip',
    category: 'lip_color',
    lValue: 58.0,
    cValue: 22.0,
    hValue: 42.0,
    cost: 15000,
    price: 24000,
  },
  {
    sku: 'EYE-021',
    itemName: 'Soft Brown Eyeshadow',
    category: 'eyeshadow',
    lValue: 48.0,
    cValue: 18.0,
    hValue: 42.0,
    cost: 21000,
    price: 34000,
  },
  {
    sku: 'EYE-031',
    itemName: 'Rose Plum Eyeshadow',
    category: 'eyeshadow',
    lValue: 44.0,
    cValue: 26.0,
    hValue: 342.0,
    cost: 21000,
    price: 34000,
  },
  {
    sku: 'CON-004',
    itemName: 'Neutral Soft Contour',
    category: 'contour',
    lValue: 40.0,
    cValue: 14.0,
    hValue: 36.0,
    cost: 17000,
    price: 26000,
  },
  {
    sku: 'HIL-003',
    itemName: 'Soft Gold Highlighter',
    category: 'highlighter',
    lValue: 84.0,
    cValue: 20.0,
    hValue: 52.0,
    cost: 17000,
    price: 27000,
  },
  {
    sku: 'FIX-002',
    itemName: 'Primer Base',
    category: 'etc',
    lValue: 62.0,
    cValue: 6.0,
    hValue: 52.0,
    cost: 14000,
    price: 22000,
  },
]
```

## 짧은 데모용 student 피부값 예시

학생 피부 대표값은 아래 정도로 두면 설명이 쉽다.

```ts
{
  skinLValue: '65.5',
  skinCValue: '14.2',
  skinHValue: '58.1',
  skinTraits: 'Neutral undertone, soft natural finish preferred.',
}
```

의도:

- 너무 밝지도 어둡지도 않은 중간대 피부값이다.
- warm 계열과 neutral 계열 설명이 둘 다 가능하다.
- foundation 과 blush 비교 데모에 적합하다.

## 짧은 데모용 student preferenceRanges 구성안

짧은 데모에서는 모든 category 를 다 정밀하게 넣을 필요는 없다.

권장 방향:

- `base_foundation`, `blush` 처럼 핵심 category 는 여러 point / 여러 radius 를 둔다.
- `lip_color` 는 단일 point 로 두어도 된다.
- `eyeshadow`, `contour`, `highlighter`, `etc` 같은 category 는 아예 설정하지 않을 수 있다.
- 어떤 category 가 `preferenceRanges` 에 아예 없으면, 그 category 는 "학생 선호 없음" 으로 해석한다.
- 이 경우 나중에 preset 비교 화면에서도 mismatch 빨간 글씨가 뜨지 않는 기준으로 간다.

권장 예시:

```ts
{
  version: 3,
  space: 'hcl',
  matchMode: 'point-distance',
  categories: {
    base_foundation: {
      pointMode: 'multi',
      points: [
        {l: 64.5, c: 13.2, h: 57.0, radius: 6.0},
        {l: 66.2, c: 15.0, h: 60.0, radius: 5.0},
      ],
    },
    blush: {
      pointMode: 'multi',
      points: [
        {l: 66.0, c: 22.0, h: 42.0, radius: 10.0},
        {l: 68.0, c: 18.0, h: 48.0, radius: 6.0},
      ],
    },
    lip_color: {
      pointMode: 'single',
      points: [{l: 58.0, c: 22.0, h: 42.0, radius: 8.0}],
    },
  },
}
```

이 구성을 쓰면 해석은 아래처럼 된다.

- `FND-001` 는 foundation 선호 범위 안이다.
- `FND-003` 는 foundation 선호에서 벗어난다.
- `BLS-002` 는 blush 선호 범위 안 또는 경계 안쪽이다.
- `BLS-003` 는 blush 선호에서 다소 벗어날 수 있다.
- `LIP-022` 는 lip 선호 범위 안이다.
- `LIP-014` 는 lip 선호 범위 밖이다.
- `EYE-021`, `EYE-031`, `CON-004`, `HIL-003`, `FIX-002` 는 학생 선호가 아예 설정되지 않은 category 로 본다.
- 따라서 이 category 들은 "불일치"가 아니라 "선호 없음"으로 해석한다.

## 짧은 데모용 teacher preset 구성안

teacher 는 데모용으로 preset 2개를 가지는 편이 좋다.

권장 구조:

1. 비교적 잘 맞는 preset 1개
2. 일부러 부분 mismatch 를 만든 preset 1개

여기서 중요한 점은 `items` 구조를 이제 category 별 `SKU 문자열 배열`이 아니라 `PresetItemRef 객체 배열`로 두는 것이다.

권장 bundle 형태:

```json
{
  "version": 2,
  "presets": [
    {
      "id": "1",
      "name": "Soft Daily Coral",
      "createdAt": "2026-04-02T09:00:00+09:00",
      "updatedAt": "2026-04-02T09:00:00+09:00",
      "note": "Mostly aligned with the student's soft warm preference.",
      "items": {
        "base_foundation": [
          {
            "source": "inventory",
            "sku": "FND-001",
            "itemName": "Soft Natural Foundation 01",
            "imageUrl": "https://example.com/images/fnd-001.jpg"
          }
        ],
        "blush": [
          {
            "source": "inventory",
            "sku": "BLS-002",
            "itemName": "Soft Peach Blush",
            "imageUrl": "https://example.com/images/bls-002.jpg"
          }
        ],
        "lip_color": [
          {
            "source": "inventory",
            "sku": "LIP-022",
            "itemName": "Warm Peach Lip",
            "imageUrl": "https://example.com/images/lip-022.jpg"
          }
        ],
        "eyeshadow": [
          {
            "source": "inventory",
            "sku": "EYE-021",
            "itemName": "Soft Brown Eyeshadow",
            "imageUrl": "https://example.com/images/eye-021.jpg"
          }
        ],
        "contour": [
          {
            "source": "inventory",
            "sku": "CON-004",
            "itemName": "Neutral Soft Contour",
            "imageUrl": "https://example.com/images/con-004.jpg"
          }
        ],
        "highlighter": [
          {
            "source": "inventory",
            "sku": "HIL-003",
            "itemName": "Soft Gold Highlighter",
            "imageUrl": "https://example.com/images/hil-003.jpg"
          }
        ],
        "etc": [
          {
            "source": "inventory",
            "sku": "FIX-002",
            "itemName": "Primer Base",
            "imageUrl": "https://example.com/images/fix-002.jpg"
          }
        ]
      }
    }
  ]
}
```

초기화 기준:

- 짧은 데모 시드에서는 inventory 연동형 item 위주로 가되, 최소 1개 정도는 `manual` source 예시를 함께 두는 편이 좋다.
- 모든 category 를 반드시 채울 필요는 없다.
- 사용하지 않는 category 는 `null` 로 비워 둘 수 있어야 한다.
- 어떤 category 는 item 1개만, 어떤 category 는 item 2개 이상도 허용되어야 한다.
- 그래야 preset 이 실제 수업 구성처럼 보이고, 이후 수동 입력 흐름을 붙일 때 schema 변경이 다시 필요 없다.

### preset A: 비교적 잘 맞는 구성

```json
{
  "id": "1",
  "name": "Soft Daily Coral",
  "createdAt": "2026-04-02T09:00:00+09:00",
  "updatedAt": "2026-04-02T09:00:00+09:00",
  "note": "Mostly aligned with the student's soft warm preference.",
  "items": {
    "base_foundation": [
      {"source": "inventory", "sku": "FND-001", "itemName": "Soft Natural Foundation 01", "imageUrl": "https://example.com/images/fnd-001.jpg"},
      {"source": "manual", "sku": null, "itemName": "Glow Veil Mixing Base", "imageUrl": "https://example.com/images/manual-glow-veil-base.jpg"}
    ],
    "blush": [
      {"source": "inventory", "sku": "BLS-002", "itemName": "Soft Peach Blush", "imageUrl": "https://example.com/images/bls-002.jpg"}
    ],
    "lip_color": [
      {"source": "inventory", "sku": "LIP-022", "itemName": "Warm Peach Lip", "imageUrl": "https://example.com/images/lip-022.jpg"}
    ],
    "eyeshadow": null,
    "contour": null,
    "highlighter": [
      {"source": "inventory", "sku": "HIL-003", "itemName": "Soft Gold Highlighter", "imageUrl": "https://example.com/images/hil-003.jpg"},
      {"source": "manual", "sku": null, "itemName": "Pearl Balm Topper", "imageUrl": null}
    ],
    "etc": [
      {"source": "inventory", "sku": "FIX-002", "itemName": "Primer Base", "imageUrl": "https://example.com/images/fix-002.jpg"},
      {"source": "manual", "sku": null, "itemName": "Makeup Spatula Set", "imageUrl": null}
    ]
  }
}
```

설명 포인트:

- foundation 은 잘 맞고, 수동 mixing base 를 함께 쓰는 구성으로 설명할 수 있다.
- blush 도 허용 범위 안이다.
- lip 도 비교적 잘 맞는다.
- eyeshadow 와 contour 는 이번 수업에서 사용하지 않으므로 `null` 로 둘 수 있다.
- highlighter 와 etc 는 item 2개를 넣어도 구조상 문제없다.
- 이 preset 은 "학생 취향에 대체로 맞는 안전한 선택" 으로 설명하기 좋다.

### preset B: 부분 mismatch 를 의도한 구성

```json
{
  "id": "2",
  "name": "Warm Contrast Coral",
  "createdAt": "2026-04-02T09:30:00+09:00",
  "updatedAt": "2026-04-02T10:10:00+09:00",
  "note": "Intentionally contains partial mismatch for demo explanation.",
  "items": {
    "base_foundation": [
      {"source": "inventory", "sku": "FND-001", "itemName": "Soft Natural Foundation 01", "imageUrl": "https://example.com/images/fnd-001.jpg"}
    ],
    "blush": [
      {"source": "inventory", "sku": "BLS-003", "itemName": "Warm Coral Blush", "imageUrl": "https://example.com/images/bls-003.jpg"},
      {"source": "manual", "sku": null, "itemName": "Apricot Cream Blush Pot", "imageUrl": "https://example.com/images/manual-apricot-cream-blush.jpg"}
    ],
    "lip_color": [
      {"source": "inventory", "sku": "LIP-014", "itemName": "Muted Coral Lip", "imageUrl": "https://example.com/images/lip-014.jpg"}
    ],
    "eyeshadow": [
      {"source": "inventory", "sku": "EYE-031", "itemName": "Rose Plum Eyeshadow", "imageUrl": "https://example.com/images/eye-031.jpg"}
    ],
    "contour": null,
    "highlighter": null,
    "etc": [
      {"source": "manual", "sku": null, "itemName": "Disposable Lip Brush Set", "imageUrl": null}
    ]
  }
}
```

설명 포인트:

- foundation 은 still match 다.
- blush 는 inventory item + manual cream blush 가 같이 들어간 조금 더 강한 구성으로 설명할 수 있다.
- lip color 는 학생 선호 범위를 벗어난다.
- eyeshadow 도 보조적으로 톤이 강하다고 설명할 수 있다.
- contour 와 highlighter 는 비워 둬도 preset 구조상 허용된다.
- etc 는 SKU 없는 manual item 만 단독으로 들어갈 수도 있다.
- 즉 이 preset 은 "전체적으로 사용 가능하지만 일부 category 는 학생 선호와 어긋난다"는 데모용 preset 이다.

## match / mismatch 설명용 매핑 표준안

짧은 데모에서 설명은 아래처럼 고정하는 편이 좋다.

- `FND-001`: match
- `FND-003`: mismatch
- `BLS-002`: match or near-match
- `BLS-003`: partial mismatch
- `LIP-022`: match
- `LIP-014`: mismatch
- `EYE-021`: neutral support item
- `EYE-031`: stronger mismatch support item

이 표준안을 써 두면 데모 중 멘트가 흔들리지 않는다.

## 짧은 데모용 teacher preset 원칙

teacher preset 은 반드시 1개 이상 필요하다.

하지만 데모 목적상 "완전 일치"만 있으면 안 된다.

이번 데모에서는 아래 조건을 같이 만족해야 한다.

1. preset 안에 학생 선호 범위에 들어오는 item 이 일부 있어야 한다.
2. preset 안에 학생 선호 범위 밖에 있는 item 이 일부 있어야 한다.
3. 즉 부분 일치와 부분 불일치를 동시에 보여줘야 한다.

의도:

- teacher 가 preset 을 선택했을 때 "이 preset 은 전체적으로는 사용 가능하지만 일부 category 는 학생 선호와 어긋난다"는 설명이 가능해야 한다.
- 단순히 맞다 / 틀리다 가 아니라 "부분적인 mismatch" 를 데모해야 한다.

## 짧은 데모용 preset 구성 권장안

최소한 아래 category 는 포함하는 편이 좋다.

- `base_foundation`
- `blush`
- `lip_color`
- `eyeshadow`

구성 원칙:

- `base_foundation` 은 학생 선호 범위 안쪽 item 을 넣는다.
- `blush` 는 경계 근처 item 을 넣는다.
- `lip_color` 는 학생 선호 범위 밖 item 을 일부러 넣는다.
- `eyeshadow` 는 선호 비교 보조용으로 사용한다.

예시 설명 방식:

- foundation 은 학생 선호와 잘 맞는다.
- blush 는 애매하지만 허용 범위 안에 있다.
- lip color 는 선호 범위를 벗어나 부분 mismatch 다.

이렇게 해야 teacher 승인 화면에서 preset 선택 이유를 설명하기 쉽다.

## 짧은 데모 진행 순서

1. [x] 테이블을 초기화하고 데모용 데이터를 주입한다.
2. [x] student 계정으로 로그인한다.
3. [x] 예약 화면에서 이미 준비된 slot 또는 생성 가능한 slot 을 확인한다.
4. [x] student 가 예약 신청을 한다.
5. [x] teacher 계정으로 로그인한다.
6. [x] 예약 대기 목록에서 해당 reservation 을 확인한다.
7. [x] teacher 가 preset 목록에서 하나를 선택한다.
8. [x] teacher 가 예약을 승인한다.
9. [x] teacher 화면에서 상태가 `CONFIRMED` 로 바뀐 것을 확인한다.
10. [x] student 화면에서 같은 예약이 보이고 상태가 반영된 것을 확인한다.
11. [ ] student 화면에서 확정된 예약에 사용될 화장품 목록을 확인한다.

## 짧은 데모 확인 포인트

- student 입장에서 reservation 생성이 보인다.
- teacher 입장에서 pending reservation 이 보인다.
- teacher 가 preset 을 선택하지 않으면 승인할 수 없다는 점을 설명할 수 있다.
- teacher 가 preset 을 선택하면 승인할 수 있다.
- 승인 후 student 와 teacher 양쪽 리스트에 같은 reservation 이 보인다.
- preset 은 teacher profile 의 preset bundle 안의 `id` 와 연결된다.

## 긴 데모 목표

긴 데모는 시스템 전체 흐름을 순서대로 보여주는 버전이다.

보여줄 흐름:

1. [x] 테이블 초기화 및 데이터 주입
2. [x] 설정창
3. [x] 라이센스 생성
4. [x] myroot 관리자 생성
5. [x] myadmin 등록
6. [x] myroot -> myadmin, myadmin 이 myteacher과 mystudent을 승인
7. [x] mystudent 가 스스로의 profile, skin & preference 수정
8. [x] myteacher 가 스스로의 타임슬롯 설정 및 예외 시간 설정
9. [x] mystudent 가 예약을 함, 예외시간도 확인함
9. [x] myteacher 가 예약을 확인하고 필요하니 preset 설정 + 프리셋 많이 추가
10. [x] myadmin가 mystudent에게 pass 입력, profile, skin & preference 수정(admin은 admin을 수정할수없음. admin-pending을 수락해봄, 루트는 수락됨)
11. [x] myadmin가 myteacher의 타임슬롯 및 예외 시간을 수정
12. [x] myadmin가 myteacher의 preset 을 수정
13. [x] mystudent 가 피부 정보와 선호 정보를 설정
student-hold, teacher-hold보여주기, 로그인은 가능한대 상대화 상호작용을 하게되는 모든 기능은 정지
14. [x] student 가 예약 서로 다른날에 2개 신청
15. [x] teacher 가 예약 승인 및 preset 선택, 예약 거부, 승인 후 취소
16. [x] student 화면에서 확정된 예약에 사용될 화장품 목록을 확인, 예약취소
17. [x] 학원 유저 정보 조회 및 수정
18. [x] 인벤토리 조회 및 수정

## 긴 데모 상세 순서

### 1. 테이블 초기화 및 데이터 주입

- 기존 데이터를 초기화하고 긴 데모에 필요한 기본 시드 데이터를 주입한다.
- 개발자 옵션의 `테이블 초기화 및 주입` 실행 시 `myroot`, `myadmin` 뿐 아니라 `myteacher`, `mystudent` 도 함께 주입한다.
- `myteacher` 와 `mystudent` 는 긴 데모 후반의 예약 흐름과 비교 데모에 바로 사용할 수 있는 고정 계정으로 준비한다.
- 이때 `mystudent` 는 초기 상태에서 `PASS_TOTAL_COUNT = 0`, `PASS_REMAINING_COUNT = 0` 으로 주입한다.
- 이 단계는 데모 시작 전 준비 단계로, 화면에 보여주기보다는 시스템 상태를 초기화하는 데 목적이 있다.

### 2. 설정창

- 앱을 처음 열면 설정창을 먼저 확인한다.
- 현재 academy 에 속한 유저 목록을 조회한다.
- 시스템이 어떤 구조로 운영되는지 전체적인 맥락을 보여주는 출발점으로 사용한다.

### 3. 라이센스 생성

- root 계정 생성 전에 사용할 라이센스를 만든다.
- 이 라이센스는 academy 생성 및 root 등록의 출발점이다.

---

> **4~12단계는 기본 시드 계정(myroot, myadmin 등)을 사용하는 흐름이다.**
> 새로 생성하는 것이 아니라 초기화 시 주입된 고정 계정으로 진행한다.
> 13단계부터는 데모 시드로 주입된 데이터를 사용한다.

---

### 4. root 관리자 생성

- 초기화 시 주입된 myroot 계정으로 로그인한다.
- academy 가 이미 생성된 상태임을 확인한다.
- 이후 승인과 운영의 기준 계정으로 사용한다.

### 5. admin / teacher / student 등록

- myadmin 등 기본 시드 계정으로 접근한다.
- 각 역할(admin, teacher, student)의 계정이 이미 존재함을 확인한다.
- 이때 기본 시드 계정은 최소 `myadmin`, `myteacher`, `mystudent` 까지 포함하는 것으로 본다.
- 필요시 추가 계정을 등록하는 흐름을 보여줄 수 있다.

### 6. root 또는 admin 에 의한 승인

- myroot 또는 myadmin 계정으로 승인 화면에 접근한다.
- admin 과 teacher 를 승인해 academy 소속 활성 계정으로 전환한다.
- student 승인 시 담당 teacher 를 함께 지정한다.

중요:

- student 는 `PRIMARY_TEACHER_ID` 가 연결되어야 이후 예약 흐름이 자연스럽다.

### 7. pass 입력 및 승인된 student 프로필 수정

- 승인된 student profile 로 들어간다.
- `PASS_TOTAL_COUNT`, `PASS_REMAINING_COUNT` 를 데모용으로 입력한다.
- 이어서 같은 student 의 피부 정보와 선호 정보까지 함께 저장한다.

이 단계의 의도:

- 승인 직후 실제 운영에 필요한 student 기본값을 바로 채운다는 흐름을 보여준다.
- 이후 예약 데모에서 "이미 준비된 학생 데이터"가 아니라 "방금 승인한 학생을 바로 예약 가능한 상태로 만든다"는 스토리를 만들 수 있다.

### 8. teacher 타임슬롯 설정

- 기본 시드 teacher 계정으로 로그인한다.
- `availableSchedule` 을 설정한다.
- 데모에서 사용할 날짜에 실제 예약 가능한 slot 이 존재해야 한다.

### 9. teacher preset 설정

- 동일 teacher 계정에서 preset 설정 화면으로 이동한다.
- teacher profile 의 `preset` 필드에 preset bundle 을 저장한다.
- preset 은 여러 개가 있어도 좋지만 데모용으로는 2개 정도면 충분하다.
- 최소 1개는 부분 mismatch 를 의도적으로 포함해야 한다.

### 10. admin 이 student 정보 보강

- myadmin 계정으로 student-pending 또는 승인된 student 상세 화면에 접근한다.
- `PASS_TOTAL_COUNT`, `PASS_REMAINING_COUNT` 를 데모용으로 입력한다.
- profile, `skinLValue`, `skinCValue`, `skinHValue`, `skinTraits` 를 함께 수정한다.
- 이어서 `preferenceRanges` 도 저장한다.

이 단계의 의도:

- student 본인이 직접 입력하는 흐름과 별개로, 운영자가 초기 세팅을 대신 마무리할 수 있음을 보여준다.
- 승인 직후 관리자가 예약 가능한 상태까지 바로 만들어 주는 운영 시나리오를 설명할 수 있다.

### 11. admin 이 teacher 타임슬롯 및 예외 시간 수정

- myadmin 계정으로 teacher-pending 또는 승인된 teacher 상세 화면에 접근한다.
- `availableSchedule` 을 수정한다.
- 예외 시간도 함께 설정해 실제 예약 가능 시간과 불가 시간을 운영자가 조정할 수 있음을 보여준다.
- 데모에서 사용할 날짜에 실제 예약 가능한 slot 이 존재해야 한다.

이 단계의 의도:

- teacher 본인 설정뿐 아니라 운영자가 시간표를 보정하는 흐름도 데모에 포함한다.
- 학원 운영 관점에서 teacher 일정 관리가 가능하다는 점을 보여준다.

### 12. admin 이 teacher preset 수정

- myadmin 계정으로 teacher 의 preset 설정 화면 또는 상세 수정 화면에 접근한다.
- teacher profile 의 `preset` 필드에 preset bundle 을 저장하거나 수정한다.
- preset 은 여러 개가 있어도 좋지만 데모용으로는 2개 정도면 충분하다.
- 최소 1개는 부분 mismatch 를 의도적으로 포함해야 한다.

이 단계의 의도:

- teacher 본인뿐 아니라 운영자가 preset 구성까지 관리할 수 있음을 보여준다.
- 데모 시드의 preset 을 admin 이 보완하는 운영 시나리오를 자연스럽게 연결한다.

### 13. student 피부정보 및 선호정보 설정

- 기본 시드 student 계정으로 로그인한다.
- 이 계정은 초기 주입 시점에는 pass 가 0인 상태로 시작한다고 본다.
- `skinLValue`, `skinCValue`, `skinHValue`, `skinTraits` 를 입력한다.
- 이어서 `preferenceRanges` 를 저장한다.

여기서 `preferenceRanges` 는 반드시 실제 비교 가능한 구조여야 한다.

---

> **14단계부터는 1단계에서 주입된 데모 데이터를 기반으로 진행한다.**

---

### 14. student 예약 신청

- student 는 연결된 teacher 의 slot 중 하나를 선택한다.
- 예약 생성 시 상태는 기본적으로 `PENDING` 이다.

### 15. teacher 예약 승인 및 preset 선택

- teacher 는 pending reservation 을 확인한다.
- 적절한 preset 을 선택한다.
- 승인 시 reservation 의 `PRESET_ID` 가 선택한 preset 의 `id` 로 연결된다.

### 16. 양측 계정에서 모두 확인

- teacher 화면에서 confirmed reservation 을 본다.
- student 화면에서 예약 상태와 시간 정보를 본다.
- 필요하면 preset 선택 결과까지 설명한다.

### 17. student 화면에서 확정된 예약에 사용될 화장품 목록 확인

- student 계정으로 확정된 reservation 상세 화면으로 이동한다.
- teacher 가 선택한 preset 에 포함된 화장품 목록이 표시되어야 한다.
- 각 화장품의 category, 이름, 사진을 확인할 수 있어야 한다.
- inventory 연동 item 이면 SKU 도 같이 볼 수 있어야 한다.
- manual item 이면 SKU 없이도 이름만으로 표시 가능해야 한다.

이 단계의 의도:

- 예약 승인이 단순한 시간 확정이 아니라 실제 사용할 화장품까지 결정되는 흐름임을 보여준다.
- student 입장에서 예약 결과가 구체적인 정보로 전달된다는 점을 설명한다.

### 18. 학원 유저 정보 조회 및 수정

- root 또는 admin 계정으로 설정창을 연다.
- 학원 소속 유저 목록을 조회한다.
- 특정 유저를 선택해 상세 정보를 확인한다.
- 수정 가능한 필드(예: pass 잔여 수, 담당 teacher, 피부 정보 등)를 변경하고 저장한다.
- 저장 후 해당 유저 화면에서 변경 내용이 반영된 것을 확인한다.

이 단계의 의도:

- 예약 승인 이후에도 관리자가 유저 데이터를 유지 관리할 수 있다는 흐름을 보여준다.
- 설정창이 단순 조회가 아니라 실제 수정 권한이 있는 운영 도구임을 설명한다.

### 19. 인벤토리 조회 및 수정

- root 또는 admin 계정으로 인벤토리 화면을 연다.
- 현재 등록된 inventory item 목록 전체를 조회한다.
- 특정 item 을 선택해 상세 정보(SKU, category, L/C/H, cost, price)를 확인한다.
- 수정이 필요한 항목(예: price, cost, L/C/H 값)을 변경하고 저장한다.
- 새 item 을 추가하거나 기존 item 을 비활성화하는 흐름도 보여줄 수 있다.
- 저장 후 inventory 목록에 변경 내용이 반영된 것을 확인한다.

이 단계의 의도:

- preset 에서 참조하는 inventory item 정보와 표시용 snapshot 이 실제 운영 중 관리된다는 맥락을 보여준다.
- 단순 데이터 주입이 아니라 관리자가 직접 인벤토리를 유지 관리하는 운영 화면임을 설명한다.

## 데모용 시드 정책

초기화 시점에 데모를 쉽게 하려면 아래 두 층을 분리하는 편이 좋다.

1. 기본 시드
2. 데모 시드

기본 시드:

- academy
- root
- 기본 admin / teacher / student
- 고정 데모 계정 `myadmin`, `myteacher`, `mystudent`
- 기본 연결
- `mystudent` 의 초기 pass 값은 `0 / 0`

데모 시드:

- teacher available schedule
- teacher preset bundle
- student skin data
- student preferenceRanges
- inventory item 세트
- pending reservation 1개

이렇게 나누면 "짧은 데모 바로 시작" 과 "긴 데모 처음부터 시작" 을 둘 다 운영하기 쉽다.

## 초기화 시 바로 생성할 예약 기준

초기화 시 reservation 1개를 함께 생성하려면 아래 조건을 만족해야 한다.

1. 해당 student 는 이미 active 상태여야 한다.
2. 해당 student 는 담당 teacher 가 연결되어 있어야 한다.
3. teacher 는 예약 가능한 slot 을 가져야 한다.
4. reservation 시간은 그 slot 안에 있어야 한다.
5. teacher preset bundle 은 미리 저장되어 있어야 한다.
6. student skin / preference 데이터도 미리 저장되어 있어야 한다.

권장 상태:

- reservation 상태는 `PENDING`
- `PRESET_ID` 는 null 또는 비어 있음
- teacher 가 승인 시 preset 선택

이 구성이 가장 자연스럽게 "학생 신청 후 선생님이 선택하여 승인" 흐름을 보여준다.

## 실제 데모 멘트 기준

짧은 데모에서는 아래 정도의 멘트가 가능해야 한다.

- 학생은 이미 자기 피부 정보와 선호 범위를 입력해 둔 상태다.
- 선생님은 preset 을 몇 개 만들어 둔 상태다.
- 이 preset 들은 학생 취향과 완전히 일치하지 않고 일부 category 는 벗어나도록 구성했다.
- 각 preset item 은 이름과 사진을 함께 가져서 student 예약 상세에서 그대로 확인할 수 있다.
- 그래서 승인 시 preset 선택이 단순한 형식 절차가 아니라 실제 추천/판단 단계처럼 보인다.

긴 데모에서는 아래 스토리가 가능해야 한다.

- 시스템에 라이센스를 만들고 academy 를 연다.
- 운영자가 구성원을 승인하고 학생에게 담당 teacher 를 연결한다.
- 운영자가 승인 직후 student 의 pass 와 프로필 데이터를 채운다.
- teacher 는 자기 시간표와 preset 을 세팅한다.
- student 가 예약을 신청하면 teacher 가 preset 을 고르며 승인한다.
- 최종 상태는 양측 계정에서 모두 확인된다.

## 승인 기준

이 문서는 아래 조건이면 충분하다.

1. 짧은 데모와 긴 데모가 명확히 구분되어 있다.
2. 짧은 데모에 필요한 초기 데이터가 정의되어 있다.
3. student skin / preference 데이터 필요성이 명시되어 있다.
4. teacher preset 이 일부 mismatch 를 의도적으로 포함해야 한다는 점이 명시되어 있다.
5. 초기화 시 함께 만들 reservation 의 상태와 전제 조건이 정의되어 있다.
6. preset item 이 SKU 문자열이 아니라 이름 / 사진 / optional SKU 를 포함한 객체 구조라는 점이 명시되어 있다.
