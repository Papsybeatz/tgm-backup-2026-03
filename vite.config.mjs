import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CP1252_BYTES = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x192, 0x83], [0x201E, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x2C6, 0x88],
  [0x2030, 0x89], [0x160, 0x8A], [0x2039, 0x8B], [0x152, 0x8C],
  [0x17D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
  [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x2DC, 0x98], [0x2122, 0x99], [0x161, 0x9A], [0x203A, 0x9B],
  [0x153, 0x9C], [0x17E, 0x9E], [0x178, 0x9F],
]);

function repairMojibake(source) {
  const mojibakeRun = /[\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201D\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]+/g;
  const repaired = source.replace(mojibakeRun, (run) => {
    if (!/[\u00C2\u00C3\u00E2\u00F0]/.test(run)) return run;
    const bytes = Array.from(run, (character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 0xFF ? codePoint : CP1252_BYTES.get(codePoint);
    });
    if (bytes.some((byte) => byte === undefined)) return run;
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
    } catch {
      return run;
    }
  });
  return repaired
    .replace(/icon: '[^']*',(\s*label: 'Funder-fit check')/, "icon: String.fromCodePoint(0x1F50D),$1")
    .replace(/icon: '[^']*',(\s*title: 'Deterministic guardrails')/, "icon: String.fromCodePoint(0x1F6E1, 0xFE0F),$1")
    .replace(/icon: '[^']*',(\s*title: 'Portfolio intelligence overlay')/, "icon: String.fromCodePoint(0x1F5C2, 0xFE0F),$1")
    .replace(/\{ icon: '[^']*',(\s*title: 'Better applicants')/, "{ icon: String.fromCodePoint(0x1F3C6),$1");
}

const normalizeFunderApiEncoding = {
  name: 'normalize-funder-api-encoding',
  enforce: 'pre',
  transform(source, id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/components/FunderApiLandingPage.jsx')) return null;
    const repaired = repairMojibake(source);
    return repaired === source ? null : { code: repaired, map: null };
  },
};

export default defineConfig({
  plugins: [normalizeFunderApiEncoding, react()],
  base: '/',
  server: {
    port: 5173,
    allowedHosts: ['.gitpod.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
