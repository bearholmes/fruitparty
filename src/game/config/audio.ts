/* BGM 믹싱·스케줄러·효과음 음계 설정 */

/** BGM 마스터 볼륨 기준값 — 사용자 볼륨 설정과 곱해져 최종 볼륨 결정 */
export const BGM_VOLUME = 1.0;
/** 효과음 재생 중 BGM을 일시적으로 낮추는 볼륨(더킹) */
export const DUCKED_VOLUME = 0.12;
/** BGM 시작·복귀 시 페이드인 시간(ms) */
export const FADE_IN_MS = 800;
/** BGM 정지·전환 시 페이드아웃 시간(ms) */
export const FADE_OUT_MS = 250;
/** 더킹 유지 시간(ms) — 이후 원래 볼륨으로 복귀 */
export const DUCK_MS = 600;
/** 일시정지 메뉴 미리듣기 재생 시간 */
export const PREVIEW_MS = 900;
/** 위험 해제 후 텐션 편곡을 유지하는 시간 */
export const TENSION_RELEASE_SEC = 4;

/** BGM 스케줄러 tick 간격(ms) — 이 주기마다 예약 큐 확인 */
export const SCHED_INTERVAL_MS = 100;
/** 스케줄러가 미리 음표를 예약하는 시간(초) */
export const LOOKAHEAD_SEC = 0.35;
/** 한 마디당 스텝 수 — 16분음 그리드 */
export const STEPS_PER_BAR = 16;
/** 한 루프당 마디 수 */
export const BAR_COUNT = 4;

/* 파트별 믹싱 볼륨 */
/** 스캥(코드 리듬 타격) 파트 볼륨 */
export const SKANK_VOL = 0.06;
/** 아르페지오 파트 볼륨(평상시) */
export const ARP_VOL = 0.06;
/** 아르페지오 파트 볼륨(텐션/위험 시) */
export const ARP_TENSE_VOL = 0.09;
/** 베이스 파트 볼륨 */
export const BASS_VOL = 0.1;
/** 하이햇 볼륨(텐션 시) */
export const HAT_VOL = 0.025;
/** 하이햇 볼륨(평상시, 소프트) */
export const HAT_SOFT_VOL = 0.018;
/** 리드(트라이앵글) 파트 볼륨 */
export const LEAD_VOL = 0.09;
/** 리드 스퀘어 레이어 볼륨 */
export const LEAD_SQ_VOL = 0.03;
/** 리드 옥타브-업(사인) 레이어 볼륨 */
export const LEAD_OCT_VOL = 0.035;
/** 킥드럼 볼륨 */
export const KICK_VOL = 0.14;
/** 스네어 볼륨(평상시) */
export const SNARE_VOL = 0.07;
/** 스네어 볼륨(텐션 시) */
export const SNARE_TENSE_VOL = 0.09;

/** 합체 음계 (C5~A6 펜타토닉 기반, 레벨별 1음) */
export const MERGE_SCALE = [
  523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1568.0, 1760.0,
];
/** 합체음 콤보 반음 올림 상한 */
export const MERGE_COMBO_MAX_SEMI = 5;
