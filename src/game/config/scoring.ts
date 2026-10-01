/* 점수·콤보·보상 튜닝값 */

/** 콤보 유지 프레임 수 — 합체 시 리필, 0이 되면 콤보 종료 */
export const COMBO_WINDOW_FRAMES = 120;
/** 콤보 1당 합체 점수 가산율 (점수 × (1 + 콤보 × STEP)) */
export const COMBO_SCORE_STEP = 0.5;
/** 단감 합체(최종 진화) 달성 시 보너스 점수 — 주변 정리 점수와 별도 가산 */
export const FINAL_BONUS = 5000;
/** 진화 축하 토스트를 띄우는 최소 레벨 */
export const EVO_TOAST_MIN_LEVEL = 8;
