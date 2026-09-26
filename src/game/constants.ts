/* 게임 설정 상수 파사드 — 도메인별 config 모듈을 한 곳에서 re-export.
   값 변경은 src/game/config/ 아래 해당 도메인 파일을 볼 것. */

export * from './config/board';
export * from './config/physics';
export * from './config/scoring';
export * from './config/fever';
export * from './config/input';
export * from './config/ui';
