/* BGM 곡 데이터 — 3개 곡을 코드·아르페지오·리드·베이스 그루브로 작곡.
   재생 로직은 ../bgm.ts, 믹싱값은 ../config/audio.ts */

export interface BgmChord {
  /** 3화음 (midi) */
  tones: [number, number, number];
  /** 베이스 (midi) */
  bass: number;
}

export interface BgmTrack {
  name: string;
  bpm: number;
  bars: [BgmChord, BgmChord, BgmChord, BgmChord];
  /** 16스텝 아르페지오 (화음톤 0~2 + 옥타브업 3). 평상시엔 짝수 스텝만 연주 */
  arp: number[];
  /** 리드 멜로디 (8분음 × 4마디 = 32슬롯, midi·null=쉼표) */
  lead: (number | null)[];
  /** 베이스 그루브 (8분음 8슬롯, 코드 베이스 기준 반음 오프셋) */
  groove: number[];
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    name: '아침 산책',
    bpm: 124,
    bars: [
      { tones: [60, 64, 67], bass: 36 },
      { tones: [55, 59, 62], bass: 31 },
      { tones: [57, 60, 64], bass: 33 },
      { tones: [53, 57, 60], bass: 29 },
    ],
    arp: [0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 2, 2, 3, 3, 2],
    lead: [
      76, null, 79, null, 81, 79, 76, null,
      74, null, 79, null, 83, 79, 74, null,
      76, null, 74, 76, null, 72, null, null,
      77, null, 81, null, 79, 77, 76, null,
    ],
    groove: [0, 0, 12, 0, 0, 12, 0, 7],
  },
  {
    name: '노을',
    bpm: 128,
    bars: [
      { tones: [55, 59, 62], bass: 31 },
      { tones: [62, 66, 69], bass: 38 },
      { tones: [64, 67, 71], bass: 40 },
      { tones: [60, 64, 67], bass: 36 },
    ],
    arp: [2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 0],
    lead: [
      79, null, 83, null, 86, 83, 79, null,
      81, null, 79, 76, null, 74, null, null,
      83, null, 81, 79, null, 76, null, null,
      76, null, 79, null, 84, 79, 76, null,
    ],
    groove: [0, 12, 0, 0, 7, 0, 12, 0],
  },
  {
    name: '소풍',
    bpm: 132,
    bars: [
      { tones: [60, 64, 67], bass: 36 },
      { tones: [53, 57, 60], bass: 29 },
      { tones: [55, 59, 62], bass: 31 },
      { tones: [57, 60, 64], bass: 33 },
    ],
    arp: [0, 1, 2, 3, 1, 2, 3, 2, 2, 1, 0, 1, 1, 0, 2, 3],
    lead: [
      72, 76, 79, null, 81, null, 79, 76,
      77, 79, 81, null, 84, null, 81, 79,
      74, null, 79, 83, null, 79, 74, null,
      76, null, 81, null, 79, 76, 74, null,
    ],
    groove: [0, 0, 12, 12, 0, 0, 7, 12],
  },
];
