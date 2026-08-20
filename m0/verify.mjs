import { chromium } from 'playwright';
const URL = 'file://' + process.cwd() + '/bench.html';
// 컨테이너에 사전 설치된 크로미움이 있으면 그것을, 없으면 Playwright 기본 브라우저를 쓴다.
import { existsSync } from 'node:fs';
const PREINSTALLED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOpts = { args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] };
if (existsSync(PREINSTALLED)) launchOpts.executablePath = PREINSTALLED;
const browser = await chromium.launch(launchOpts);

const errors = [];
async function open() {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => !!window.__bench);
  await p.evaluate(() => window.__bench.pause());
  return p;
}

// 1) 부팅
const page = await open();
const boot = await page.evaluate(() => ({ frame: window.__bench.frame, eCount: window.__bench.eCount }));

// 2) 결정론 — 루프 정지 + 리셋 후 순수 스텝만 실행
async function run(seed, steps, target) {
  const p = await open();
  const r = await p.evaluate(({ seed, steps, target }) => {
    const b = window.__bench;
    b.setTarget(target);
    b.resetWorld(seed);
    const checkpoints = [];
    for (let i = 1; i <= steps; i++) {
      b.step();
      if (i % 600 === 0) checkpoints.push([i, b.worldHash()]);
    }
    return { hash: b.worldHash(), kills: b.kills, eCount: b.eCount, checkpoints };
  }, { seed, steps, target });
  await p.close();
  return r;
}

const a = await run(0xC0FFEE, 3600, 400);   // 60초 분량
const b = await run(0xC0FFEE, 3600, 400);   // 동일 시드
const c = await run(0xBADBEEF, 3600, 400);  // 다른 시드

// 3) 파티클(Cosmetic)이 시뮬 해시에 영향을 주지 않는지
async function runWithParticles(on) {
  const p = await open();
  const r = await p.evaluate(({ on }) => {
    const b = window.__bench;
    b.setOpt('particles', on); b.setTarget(400); b.resetWorld(0xC0FFEE);
    for (let i = 0; i < 1800; i++) b.step();
    return b.worldHash();
  }, { on });
  await p.close();
  return r;
}
const partOn = await runWithParticles(true);
const partOff = await runWithParticles(false);

// 4) 로직 성능
const logic = await page.evaluate(() => {
  const b = window.__bench;
  const out = [];
  for (const n of [200, 400, 800, 1200, 1600]) {
    b.setTarget(n); b.resetWorld(0x1111);
    for (let i = 0; i < 400; i++) b.step();
    const t0 = performance.now();
    for (let i = 0; i < 400; i++) b.step();
    const t1 = performance.now();
    out.push({ n, actual: b.eCount, ms: +((t1 - t0) / 400).toFixed(3) });
  }
  return out;
});

// 5) 렌더 경로 예외 여부
const renderOk = await page.evaluate(() => {
  try { for (let i = 0; i < 60; i++) { window.__bench.step(); window.__bench.draw(); } return true; }
  catch (e) { return 'ERR: ' + e.message; }
});
await page.close();

const eq = (x, y) => x === y;
const P = ok => ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';

console.log('\n=== M0 프로토타입 헤드리스 검증 ===\n');
console.log('부팅:', boot);
console.log('\n[1] 결정론 — 같은 시드 3600스텝 2회');
console.log(`    A hash=${a.hash} kills=${a.kills}`);
console.log(`    B hash=${b.hash} kills=${b.kills}`);
console.log('   ', P(eq(a.hash, b.hash) && eq(a.kills, b.kills)));
console.log('\n[2] 체크포인트 해시 일치 (600프레임마다 6회)');
const cpEq = a.checkpoints.every((v, i) => v[1] === b.checkpoints[i][1]);
console.log('    A:', a.checkpoints.map(v => v[1]).join(' '));
console.log('   ', P(cpEq));
console.log('\n[3] 다른 시드는 다른 결과를 내는가');
console.log(`    C hash=${c.hash} kills=${c.kills}`);
console.log('   ', P(!eq(a.hash, c.hash)));
console.log('\n[4] Cosmetic 스트림 분리 — 파티클 ON/OFF가 시뮬 해시에 영향 없음');
console.log(`    ON=${partOn}  OFF=${partOff}`);
console.log('   ', P(eq(partOn, partOff)));
console.log('\n[5] 로직 성능 (렌더 제외, TDD §9 예산 6.0ms/step)');
for (const r of logic) console.log(`    적 ${String(r.n).padStart(4)} (실제 ${String(r.actual).padStart(4)}) : ${String(r.ms).padStart(6)} ms/step  ${r.ms <= 6 ? 'OK' : 'OVER'}`);
console.log('\n[6] 렌더 경로:', renderOk === true ? P(true) + ' (예외 없음)' : renderOk);
console.log('\n[7] 콘솔 에러:', errors.length ? errors : 'PASS (없음)');
console.log('');
await browser.close();
