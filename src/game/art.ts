/* 과일 데이터 + 귀여운 캐릭터 스프라이트 공장 (순수 canvas, 프레임워크 무관) */

export interface FruitPalette {
  top: string;
  mid: string;
  bot: string;
  line: string;
}

export interface Fruit {
  name: string;
  r: number;
  score: number;
  pal: FruitPalette;
}

export interface Sprite {
  cv: HTMLCanvasElement;
  cx: number;
  cy: number;
  S: number;
}

export const FRUITS: Fruit[] = [
  { name: '앵두',     r: 15,  score: 1,  pal: { top: '#ff9eb0', mid: '#f43f5e', bot: '#9f1239', line: '#6e0b26' } },
  { name: '매실',     r: 23,  score: 3,  pal: { top: '#f0f5b8', mid: '#a9c93f', bot: '#5c7a1e', line: '#3f5a12' } },
  { name: '자두',     r: 32,  score: 6,  pal: { top: '#e08bb0', mid: '#9d2c5e', bot: '#4d0f2e', line: '#360a20' } },
  { name: '살구',     r: 41,  score: 10, pal: { top: '#ffe3a3', mid: '#ffb347', bot: '#c96a1e', line: '#8a4413' } },
  { name: '한라봉',   r: 52,  score: 15, pal: { top: '#ffd166', mid: '#ff9f1c', bot: '#cc6200', line: '#8a4300' } },
  { name: '사과',     r: 63,  score: 21, pal: { top: '#ff758f', mid: '#e63946', bot: '#8d0801', line: '#590c0c' } },
  { name: '신고배',   r: 73,  score: 28, pal: { top: '#f2e3b3', mid: '#d9b45c', bot: '#8a6420', line: '#5e4212' } },
  { name: '거봉',     r: 84,  score: 36, pal: { top: '#c39bff', mid: '#7b2fbe', bot: '#3c096c', line: '#2a074e' } },
  { name: '참외',     r: 96,  score: 45, pal: { top: '#ffe9a3', mid: '#ffc93c', bot: '#d99a12', line: '#8a5f0b' } },
  { name: '단감', r: 110, score: 60, pal: { top: '#ffc25e', mid: '#f67f17', bot: '#b34a00', line: '#7a3200' } },
];

export const MAX_LEVEL = FRUITS.length - 1;
export const DROP_POOL: number[] = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4];

export function randDrop(): number {
  return DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)] ?? 0;
}

type Ctx = CanvasRenderingContext2D;

function leaf(c: Ctx, x: number, y: number, s: number, ang: number): void {
  c.save(); c.translate(x, y); c.rotate(ang);
  const g = c.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
  g.addColorStop(0, '#80ed99'); g.addColorStop(1, '#2d6a4f');
  c.fillStyle = g; c.strokeStyle = '#1b4332'; c.lineWidth = Math.max(1.2, s * 0.09);
  c.beginPath(); c.moveTo(0, -s * 0.62);
  c.bezierCurveTo(s * 0.62, -s * 0.3, s * 0.5, s * 0.45, 0, s * 0.62);
  c.bezierCurveTo(-s * 0.5, s * 0.45, -s * 0.62, -s * 0.3, 0, -s * 0.62);
  c.fill(); c.stroke();
  c.strokeStyle = 'rgba(27,67,50,.7)'; c.lineWidth = Math.max(1, s * 0.07);
  c.beginPath(); c.moveTo(0, -s * 0.45); c.lineTo(0, s * 0.45); c.stroke();
  c.restore();
}

function stem(c: Ctx, x: number, y: number, w: number, h: number, bend = 0): void {
  c.save(); c.translate(x, y);
  c.strokeStyle = '#6f4e37'; c.lineCap = 'round'; c.lineWidth = w;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(bend, -h * 0.6, bend * 1.4, -h); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = w * 0.35;
  c.beginPath(); c.moveTo(-w * 0.15, 0); c.quadraticCurveTo(bend, -h * 0.6, bend * 1.4, -h); c.stroke();
  c.restore();
}

/* 광택: 번진 타원 하이라이트 + crisp 스파클 */
function gloss(c: Ctx, r: number): void {
  c.save();
  c.filter = `blur(${Math.max(2, r * 0.06)}px)`;
  c.globalAlpha = 0.55;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(-r * 0.38, -r * 0.44, r * 0.24, r * 0.13, -0.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.save();
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.beginPath();
  c.arc(-r * 0.14, -r * 0.56, Math.max(1.5, r * 0.045), 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function bodyBase(c: Ctx, r: number, p: FruitPalette): void {
  const g = c.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.1, 0, 0, r * 1.18);
  g.addColorStop(0, p.top); g.addColorStop(0.55, p.mid); g.addColorStop(1, p.bot);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.save(); // 아래쪽 입체 음영 (에어브러시)
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
  c.filter = `blur(${Math.max(3, r * 0.1)}px)`;
  c.globalAlpha = 0.22; c.fillStyle = p.line;
  c.beginPath(); c.ellipse(0, r * 0.72, r * 0.7, r * 0.34, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  c.lineWidth = Math.max(2, r * 0.055); c.strokeStyle = p.line;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  gloss(c, r);
}

function face(c: Ctx, y: number, s: number, mood: 0 | 1 | 2): void {
  const dx = s, er = s * 0.36;
  for (const sx of [-1, 1]) {
    c.fillStyle = '#2b2118';
    c.beginPath(); c.ellipse(sx * dx, y, er * 0.85, er, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(sx * dx + er * 0.25, y - er * 0.32, er * 0.38, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(sx * dx - er * 0.3, y + er * 0.35, er * 0.16, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = '#2b2118'; c.lineCap = 'round';
  c.lineWidth = Math.max(1.4, s * 0.16);
  c.beginPath();
  if (mood === 2) {
    c.fillStyle = '#7f1d1d';
    c.ellipse(0, y + s * 1.15, s * 0.75, s * 0.55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff8fa3';
    c.ellipse(0, y + s * 1.4, s * 0.35, s * 0.22, 0, 0, Math.PI * 2); c.fill();
  } else if (mood === 1) {
    c.arc(0, y + s * 0.35, s * 0.62, 0.25, Math.PI - 0.25); c.stroke();
  } else {
    c.arc(0, y + s * 0.4, s * 0.45, 0.35, Math.PI - 0.35); c.stroke();
  }
  c.save(); // 볼터치 (에어브러시)
  c.filter = `blur(${Math.max(1.5, s * 0.25)}px)`;
  c.globalAlpha = 0.6; c.fillStyle = '#ff6b8a';
  c.beginPath(); c.ellipse(-dx - er * 1.7, y + s * 0.55, s * 0.52, s * 0.32, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(dx + er * 1.7, y + s * 0.55, s * 0.52, s * 0.32, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/* 과육 물듦 반점 (선 없이 번짐으로만) */
function blushPatch(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.save();
  c.filter = `blur(${Math.max(2, w * 0.15)}px)`;
  c.globalAlpha = 0.4;
  c.fillStyle = color;
  c.beginPath(); c.ellipse(x, y, w, h, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

function freckles(c: Ctx, r: number, n: number, color: string, alpha: number): void {
  c.save(); c.globalAlpha = alpha; c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, d = r * (0.35 + ((i * 41) % 35) / 100);
    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(1, r * 0.028), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

type FruitArt = (c: Ctx, r: number, p: FruitPalette) => void;

const ART: FruitArt[] = [
  function angdu(c, r, p) {
    stem(c, 2, -r * 0.8, Math.max(2, r * 0.12), r * 0.95, r * 0.5);
    leaf(c, r * 0.62, -r * 1.15, r * 0.5, 0.7);
    bodyBase(c, r, p);
    face(c, r * 0.05, r * 0.2, 0);
  },
  function maesil(c, r, p) {
    stem(c, 0, -r * 0.85, Math.max(2, r * 0.09), r * 0.35, r * 0.1);
    bodyBase(c, r, p);
    freckles(c, r, 12, '#5c7a1e', 0.22);
    face(c, r * 0.08, r * 0.2, 0);
  },
  function jadu(c, r, p) {
    stem(c, 0, -r * 0.85, Math.max(2, r * 0.09), r * 0.4, r * 0.2);
    leaf(c, r * 0.4, -r * 0.95, r * 0.42, 0.5);
    bodyBase(c, r, p);
    blushPatch(c, -r * 0.3, -r * 0.3, r * 0.45, r * 0.32, '#ff78a0');
    face(c, r * 0.1, r * 0.2, 0);
  },
  function salgu(c, r, p) {
    stem(c, -2, -r * 0.85, Math.max(2, r * 0.09), r * 0.4, r * 0.15);
    leaf(c, r * 0.36, -r * 0.95, r * 0.44, 0.55);
    bodyBase(c, r, p);
    blushPatch(c, r * 0.25, -r * 0.25, r * 0.5, r * 0.35, '#ff5a3c');
    face(c, r * 0.1, r * 0.2, 1);
  },
  function hallabong(c, r, p) {
    // 꼭지 혹이 솟은 윤곽
    const trace = (): void => {
      c.beginPath();
      const N = 72;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const dd = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
        const rr = r * (1 + 0.14 * Math.exp(-((dd / 0.4) * (dd / 0.4))));
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
    };
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
    g.addColorStop(0, p.top); g.addColorStop(0.55, p.mid); g.addColorStop(1, p.bot);
    c.fillStyle = g;
    trace(); c.fill();
    c.save();
    trace(); c.clip();
    c.filter = `blur(${Math.max(3, r * 0.1)}px)`;
    c.globalAlpha = 0.22; c.fillStyle = p.line;
    c.beginPath(); c.ellipse(0, r * 0.72, r * 0.7, r * 0.34, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.save(); c.globalAlpha = 0.2; c.fillStyle = p.line;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + 0.2, d = r * (0.25 + ((i * 53) % 55) / 100);
      c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(1, r * 0.026), 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.lineWidth = Math.max(2, r * 0.055); c.strokeStyle = p.line;
    trace(); c.stroke();
    gloss(c, r);
    leaf(c, r * 0.2, -r * 1.12, r * 0.46, 0.5);
    face(c, r * 0.12, r * 0.21, 1);
  },
  function apple(c, r, p) {
    leaf(c, r * 0.42, -r * 1.02, r * 0.5, 0.55);
    stem(c, 4, -r * 0.8, Math.max(2.5, r * 0.1), r * 0.6, r * 0.2);
    c.save();
    const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.2);
    g.addColorStop(0, p.top); g.addColorStop(0.55, p.mid); g.addColorStop(1, p.bot);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -r * 0.82);
    c.bezierCurveTo(-r * 0.55, -r * 0.95, -r * 1.02, -r * 0.6, -r * 0.98, 0);
    c.bezierCurveTo(-r * 0.95, r * 0.65, -r * 0.45, r * 0.98, 0, r * 0.95);
    c.bezierCurveTo(r * 0.45, r * 0.98, r * 0.95, r * 0.65, r * 0.98, 0);
    c.bezierCurveTo(r * 1.02, -r * 0.6, r * 0.55, -r * 0.95, 0, -r * 0.82);
    c.closePath(); c.fill();
    c.lineWidth = Math.max(2.5, r * 0.055); c.strokeStyle = p.line; c.stroke();
    gloss(c, r);
    c.restore();
    face(c, r * 0.12, r * 0.2, 1);
  },
  function singobae(c, r, p) {
    stem(c, 2, -r * 0.85, Math.max(2.5, r * 0.09), r * 0.5, r * 0.15);
    leaf(c, r * 0.38, -r * 0.98, r * 0.46, 0.55);
    bodyBase(c, r, p);
    freckles(c, r, 22, '#6b4a12', 0.3);
    face(c, r * 0.12, r * 0.21, 1);
  },
  function geobong(c, r, p) {
    // 포도송이: 낱알 6개 + 잎 + 얼굴 하나
    const gr = r * 0.3;
    const grapes: Array<[number, number]> = [
      [-0.52, -0.42], [0, -0.42], [0.52, -0.42],
      [-0.27, 0.02], [0.27, 0.02],
      [0, 0.44],
    ];
    stem(c, 0, -r * 0.72, Math.max(2.5, r * 0.06), r * 0.4, r * 0.15);
    leaf(c, r * 0.34, -r * 0.88, r * 0.4, 0.55);
    for (const [gx, gy] of grapes) {
      const x = gx * r, y = gy * r;
      const g = c.createRadialGradient(x - gr * 0.35, y - gr * 0.4, gr * 0.1, x, y, gr * 1.15);
      g.addColorStop(0, p.top); g.addColorStop(0.55, p.mid); g.addColorStop(1, p.bot);
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, gr, 0, Math.PI * 2); c.fill();
      c.lineWidth = Math.max(1.5, gr * 0.08); c.strokeStyle = p.line; c.stroke();
      c.save(); c.globalAlpha = 0.8; c.fillStyle = '#fff';
      c.beginPath(); c.arc(x - gr * 0.3, y - gr * 0.35, Math.max(1, gr * 0.14), 0, Math.PI * 2); c.fill();
      c.restore();
    }
    face(c, r * 0.05, r * 0.2, 1);
  },
  function chamoe(c, r, p) {
    c.save(); c.scale(0.88, 1);
    bodyBase(c, r, p);
    c.save();
    c.beginPath(); c.arc(0, 0, r - Math.max(2, r * 0.04), 0, Math.PI * 2); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineCap = 'round';
    c.lineWidth = Math.max(2, r * 0.07);
    for (const x of [-0.62, -0.31, 0, 0.31, 0.62]) {
      c.beginPath(); c.moveTo(x * r, -r); c.lineTo(x * r, r); c.stroke();
    }
    c.restore();
    c.restore();
    stem(c, 0, -r * 0.9, Math.max(2.5, r * 0.07), r * 0.35, r * 0.1);
    face(c, r * 0.12, r * 0.22, 1);
  },
  function gam(c, r, p) {
    c.save(); c.scale(1, 0.94);
    bodyBase(c, r, p);
    c.restore();
    // 꼭지: 4갈래 꽃받침 + 꼭지심
    for (const a of [-0.55, -0.18, 0.18, 0.55]) {
      c.save();
      c.translate(a * r * 0.55, -r * 0.86);
      c.rotate(a * 0.85);
      c.fillStyle = '#556b2f';
      c.strokeStyle = '#2f3d17';
      c.lineWidth = Math.max(1.5, r * 0.02);
      c.beginPath();
      c.ellipse(0, -r * 0.12, r * 0.1, r * 0.17, 0, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.restore();
    }
    c.save();
    c.fillStyle = '#6b7f36';
    c.strokeStyle = '#2f3d17';
    c.lineWidth = Math.max(1.5, r * 0.02);
    c.beginPath(); c.ellipse(0, -r * 0.88, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    c.fill(); c.stroke();
    c.restore();
    stem(c, 0, -r * 0.92, Math.max(2.5, r * 0.06), r * 0.3, r * 0.05);
    face(c, r * 0.15, r * 0.24, 2);
  },
];

/* 각 과일을 오프스크린 캔버스에 3배율로 미리 렌더.
   반환: { cv, cx, cy, S } — (cx, cy)는 스프라이트 내 과일 중심 좌표 */
export function makeSprites(): Sprite[] {
  return FRUITS.map((f, lv) => {
    const r = f.r, pad = 30 + Math.ceil(r * 0.18); // 큰 과일 꼭지·잎 상단 잘림 방지
    const S = Math.ceil(r * 2 + pad * 2), SS = 3;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S * SS;
    const c = cv.getContext('2d');
    if (!c) throw new Error('2d context unavailable');
    c.scale(SS, SS);
    c.lineJoin = 'round';
    const cx = S / 2, cy = S / 2 + 7;
    c.translate(cx, cy);
    const art = ART[lv];
    if (!art) throw new Error(`missing art for level ${lv}`);
    art(c, r, f.pal);
    return { cv, cx, cy, S };
  });
}
