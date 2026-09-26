import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', '.sites-checkout/**', 'build/**', 'coverage/**', 'dist/**', 'next-env.d.ts']),
  {
    files: ['src/game/useSuika.ts'],
    // Input handlers read the latest callbacks through refs owned by this game hook.
    rules: { 'react-hooks/immutability': 'off' },
  },
]);
