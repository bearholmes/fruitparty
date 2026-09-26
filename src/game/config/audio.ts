/* BGM 믹싱·스케줄러·효과음 음계 설정 */

export const BGM_VOLUME = 1.0;
export const DUCKED_VOLUME = 0.12;
export const FADE_IN_MS = 800;
export const FADE_OUT_MS = 250;
export const DUCK_MS = 600;
/** 일시정지 메뉴 미리듣기 재생 시간 */
export const PREVIEW_MS = 900;
/** 위험 해제 후 텐션 편곡을 유지하는 시간 */
export const TENSION_RELEASE_SEC = 4;

export const SCHED_INTERVAL_MS = 100;
export const LOOKAHEAD_SEC = 0.35;
export const STEPS_PER_BAR = 16; // 16분음 그리드
export const BAR_COUNT = 4;

/* 파트별 믹싱 볼륨 */
export const SKANK_VOL = 0.06;
export const ARP_VOL = 0.06;
export const ARP_TENSE_VOL = 0.09;
export const BASS_VOL = 0.1;
export const HAT_VOL = 0.025;
export const HAT_SOFT_VOL = 0.018;
export const LEAD_VOL = 0.09;
export const LEAD_SQ_VOL = 0.03;
export const LEAD_OCT_VOL = 0.035;
export const KICK_VOL = 0.14;
export const SNARE_VOL = 0.07;
export const SNARE_TENSE_VOL = 0.09;

/** 합체 음계 (C5~A6 펜타토닉 기반, 레벨별 1음) */
export const MERGE_SCALE = [
  523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1568.0, 1760.0,
];
/** 합체음 콤보 반음 올림 상한 */
export const MERGE_COMBO_MAX_SEMI = 5;
