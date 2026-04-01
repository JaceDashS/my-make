# Student Preference Point Handoff

## 1. Purpose

이 문서는 `student options`의 다음 단계 작업을 위한 handoff다.

이번 단계의 핵심 목적은 아래 두 가지다.

1. 기존에 검토하던 `3D HCL region` 방식 대신, `화장품별 HCL point + 거리 계산` 방식으로 방향을 확정한다.
2. 1차 MVP에서 기본으로 취급할 화장품 카테고리와 모델링 규칙을 정리한다.

이 문서는 구현 전 설계 기준선이며, 구체적인 DB schema 최종 확정 문서는 아니다.

## 2. Current Product State

현재까지 `student options`에는 아래가 이미 들어가 있다.

### 2.1 Student Skin

학생은 대표 피부색을 가진다.

저장 필드:

* `SKIN_L_VALUE`
* `SKIN_C_VALUE`
* `SKIN_H_VALUE`
* `SKIN_TRAITS_BODY`
* `PREFERENCE_RANGES_BODY`

현재 skin picker는 다음 규칙으로 동작한다.

* 색 공간은 `HCL/LCH`
* picker range는 피부용 합리 범위로 제한
* 현재 범위는 `H 45-75 / C 10-30 / L 35-75`
* 기본값은 `H=57 / C=20 / L=60`
* slider, preview, text field가 서로 연동
* `L/C/H` 텍스트 필드는 `Enter`, `blur`, `end editing` 시 clamp 적용
* 저장은 최하단 `Save Student Skin`을 눌렀을 때만 서버 요청
* 미저장 상태에서 다른 section/page로 이동하려 하면 경고

### 2.2 Existing Preference Region Work

기존에는 `preference`를 polygon/circle 기반 영역으로 다루는 방향을 검토했고, 일부 2D 편집 모델도 구현되어 있다.

하지만 다음 단계에서 핵심 추천 모델은 더 이상 `3D region`을 전제로 하지 않는다.

즉:

* skin tone 편집은 유지
* preference 편집/저장/추천 모델은 새 방향으로 재정의

## 3. Direction Change

### 3.1 Rejected Direction

`preference`를 `3D HCL region`으로 다루는 방식은 이번 MVP 범위에서 제외한다.

제외 이유:

* UI 복잡도가 너무 높다
* 3D boolean/volume 편집은 구현 난이도가 높다
* 테스트/검증 비용이 크다
* 사용자가 직관적으로 다루기 어렵다

### 3.2 Adopted Direction

`preference`는 앞으로 `화장품 카테고리별 HCL point` 기준으로 다룬다.

즉 구조는 대략 아래와 같다.

* student has skin `L/C/H`
* student has category-level cosmetic preference points
* cosmetic products also have category + representative `L/C/H`
* recommendation score is computed by distance between points

핵심 아이디어:

> `preference`는 “선호 영역”이 아니라 “카테고리별 대표 선호 포인트들”이다.

## 4. Matching Model

### 4.1 Base Rule

화장품 추천/매칭은 `HCL` 공간에서 거리 계산으로 처리한다.

기본 개념:

* student preference point
* product point
* distance between them

### 4.2 Distance Rule

기본 계산은 유클리드 거리 기반으로 간다.

다만 `H`는 순환축이므로 단순 차이 대신 circular distance가 필요하다.

즉 구현 레벨에서는 아래와 같은 방향이 바람직하다.

```ts
distance = sqrt(
  wL * (dL ** 2) +
  wC * (dC ** 2) +
  wH * (circularHueDistance(dH) ** 2)
)
```

주의점:

* `H=359`와 `H=1`은 매우 가까워야 한다
* 따라서 `unwrap` 또는 circular hue distance helper 필요

### 4.3 Future-Safe Note

foundation/contour 같이 피부와 상대 관계가 중요한 카테고리는 장기적으로 absolute point만이 아니라 `deltaFromSkin(L,C,H)`를 함께 보는 편이 더 견고하다.

하지만 MVP는 우선 `absolute HCL point` 기반으로 출발해도 된다.

## 5. Research Result To Carry Forward

아래 내용은 외부 리서치 응답을 이번 handoff에 반영한 확정 초안이다.

### 5.1 Final Recommendation Summary

요약하면, 1차 MVP의 기본 화장품 종류는 아래 6개가 가장 합리적이다.

* `base_foundation`
* `blush`
* `lip_color`
* `eyeshadow`
* `contour`
* `highlighter`

이유:

* 한국/글로벌 양쪽에서 반복적으로 보이는 범용 카테고리
* 실제 선택에서 색이 핵심
* `HCL point matching`과 잘 맞음

반대로 아래는 초기 HCL distance 중심 모델과 덜 맞는다.

* `primer`
* `powder`
* `setting_spray`
* `concealer`
* `corrector`
* `eyebrow`

### 5.2 Recommended Baseline Categories

| category name | is color-driven? | related to skin tone? | HCL point matching fit? | single point vs multi point | notes |
| --- | --- | ---: | ---: | --- | --- |
| base / foundation | mixed | high | medium | single | 글로벌/한국 모두 핵심 base 축. 단 skin type, coverage 등 비색상 요소도 큼 |
| concealer / corrector | mixed | high | low | multi | 피부 매칭, 밝히기, 잡티 커버, 색보정 목적이 섞여 있어 초기 단일 point 모델과 충돌 |
| powder | no | low | low | single or none | translucent 계열이 많고 기능 중심 |
| primer / base | no | low | low | none | 색보다 피부 준비, 지속력, 모공/유분 보정이 핵심 |
| blush | yes | medium | high | single | 대표 flush 색 선호를 point로 두기 적합 |
| lip color | yes | medium | high | multi | 한 사용자가 여러 계열을 동시에 선호할 수 있어 multi-point가 자연스러움 |
| eyeshadow | yes | low | medium | multi | look/palette 성격이 강해 단일점보다 복수점이 적합 |
| eyebrow | mixed | low | low | single | hair color 의존성이 강해 skin-HCL 추천축으로는 우선순위 낮음 |
| contour / shading | yes | high | high | single | complexion 대비 더 차갑고 더 어두운 방향이라 규칙성이 강함 |
| highlighter | yes | medium | high | single | complexion별 추천 계열이 비교적 뚜렷함 |
| setting spray / fixer | no | low | low | none | 지속력/finish 중심 |

### 5.3 Minimum Viable Set

MVP 기본 카테고리:

* `base_foundation`
* `blush`
* `lip_color`
* `eyeshadow`
* `contour`
* `highlighter`

이 세트가 좋은 이유:

* 색 중심 카테고리만 남겨 HCL point recommendation과 결합도가 높다
* 학생이 이해하기 쉽다
* 한국/글로벌 양쪽 모두 설명 가능하다

권장 모델링:

* top-level category는 색 추천 단위만 둔다
* formula는 별도 필드로 분리한다

예:

* `category = lip_color`
* `formula = tint | gloss | lipstick`

또는

* `category = base_foundation`
* `formula = foundation | cushion | BB_CC | tinted_moisturizer`

### 5.4 Extended Set

추후 확장 후보:

* `concealer`
* `corrector`
* `eyebrow`
* `bronzer`
* `powder`

### 5.5 Exclusions For MVP

MVP 기본축에서 제외 권장:

* `primer / makeup base`
* `powder / finishing powder / setting powder`
* `setting_spray / fixer`
* `mascara / eyeliner / lash care`
* `concealer / corrector`

### 5.6 Modeling Recommendation

#### Single HCL point로 시작하기 좋은 카테고리

* `base_foundation`
* `contour`
* `highlighter`
* `blush`

#### Multiple HCL points가 더 맞는 카테고리

* `lip_color`
* `eyeshadow`

#### HCL distance보다 다른 속성이 더 중요한 카테고리

* `primer / makeup base`
* `powder`
* `setting_spray`
* `eyebrow`

### 5.7 Final Research Answer

리서치 응답의 최종 결론:

> 우리 시스템의 1차 MVP에서 기본 화장품 종류는 `base_foundation`, `blush`, `lip_color`, `eyeshadow`, `contour`, `highlighter`로 정의하는 것이 가장 합리적이다.

그리고 실무 모델링 규칙은 아래가 권장된다.

* `base_foundation`, `contour`, `highlighter`, `blush` -> single HCL point
* `lip_color`, `eyeshadow` -> multiple HCL points
* `concealer/corrector`, `powder`, `primer`, `setting_spray`, `eyebrow` -> MVP 기본축에서는 제외 또는 후순위

## 6. Proposed Data Model Direction

아직 schema 최종 확정은 아니지만, 방향성은 아래처럼 잡는 것이 자연스럽다.

### 6.1 Category Catalog

기본 category catalog:

```json
[
  {"code":"base_foundation","label":"Base / Foundation","pointMode":"single"},
  {"code":"blush","label":"Blush","pointMode":"single"},
  {"code":"lip_color","label":"Lip Color","pointMode":"multi"},
  {"code":"eyeshadow","label":"Eyeshadow","pointMode":"multi"},
  {"code":"contour","label":"Contour","pointMode":"single"},
  {"code":"highlighter","label":"Highlighter","pointMode":"single"}
]
```

### 6.2 Preference Document Draft

`PREFERENCE_RANGES_BODY`는 기존 region 중심 이름이지만, 다음 단계에서 실제 body 내용은 point 중심 JSON으로 재정의할 수 있다.

예시:

```json
{
  "version": 2,
  "space": "hcl",
  "matchMode": "point-distance",
  "categories": [
    {
      "code": "base_foundation",
      "pointMode": "single",
      "points": [
        {"l": 58.0, "c": 18.0, "h": 57.0}
      ]
    },
    {
      "code": "lip_color",
      "pointMode": "multi",
      "points": [
        {"l": 52.0, "c": 28.0, "h": 25.0},
        {"l": 48.0, "c": 22.0, "h": 8.0}
      ]
    }
  ]
}
```

이름상 `PREFERENCE_RANGES_BODY`가 다소 어색해질 수 있으나, MVP에서는 컬럼명을 유지하고 body schema만 바꾸는 방식도 가능하다.

## 7. UI/UX Direction

다음 단계의 preference UI는 region editor보다 category point editor에 맞춰 재설계하는 편이 좋다.

추천 UI 방향:

1. category selector
2. 해당 category의 HCL point picker
3. single-point category는 포인트 1개만 유지
4. multi-point category는 포인트 여러 개 추가 가능
5. 최하단 save 전까지는 서버 요청 없음
6. dirty state 유지
7. 저장하지 않고 이탈 시 경고

## 8. Implementation Work Remaining

다음 구현 작업은 크게 아래 순서가 적절하다.

### 8.1 Phase 1: Contract Definition

* `preference point` JSON schema 확정
* category catalog 상수 정의
* single/multi point 규칙 정의
* hue circular distance helper 정의

### 8.2 Phase 2: Client Model

* region 기반 state와 point 기반 state 분리 또는 대체
* category별 point CRUD model 작성
* dirty state 유지
* save payload 연결

### 8.3 Phase 3: Student Options UI

* category selector UI
* point editor UI
* single-point category 제한
* multi-point category add/remove
* 현재 skin tone과 preference point의 시각적 관계 표현

### 8.4 Phase 4: Matching Logic

* product point와 student preference point 사이 거리 계산
* category별 nearest match 계산
* score 또는 rank 산출

### 8.5 Phase 5: Data Migration / Compatibility

* 기존 `PREFERENCE_RANGES_BODY` 내용과의 호환성 전략
* version field 기반 파서 분기

## 9. Explicit Rules To Keep

다음 규칙은 계속 유지한다.

* 최하단 save 전까지 서버 요청 금지
* dirty 상태에서 이탈 시 경고
* student skin 대표값은 `SKIN_L/C/H_VALUE`
* `SKIN_TRAITS_BODY`는 자유 메모
* `preference`는 다음 단계부터 point-distance 중심으로 재정의

## 10. Final Summary

이번 handoff의 한 줄 요약은 아래와 같다.

> 다음 단계의 `student preference`는 3D region이 아니라, 화장품 카테고리별 `HCL point`를 저장하고 거리로 계산하는 구조로 간다.

그리고 MVP 기본 카테고리는 아래 6개다.

* `base_foundation`
* `blush`
* `lip_color`
* `eyeshadow`
* `contour`
* `highlighter`

