import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const URL = 'file://' + process.cwd() + '/bench.html';
const PRE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const opts = { args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] };
if (existsSync(PRE)) opts.executablePath = PRE;
const browser = await chromium.launch(opts);
const errors = [];

async function open(viewport) {
  const p = await browser.newPage({ viewport });
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => !!window.__bench);
  await p.evaluate(() => window.__bench.pause());
  return p;
}

// [A] 결정론 유지 확인 (봇 이동 로직을 바꿨으므로 재확인)
async function run(seed) {
  const p = await open({ width: 1440, height: 900 });
  const r = await p.evaluate((seed) => {
    const b = window.__bench;
    b.setTarget(400); b.resetWorld(seed);
    for (let i = 0; i < 3600; i++) b.step();
    return { hash: b.worldHash(), kills: b.kills };
  }, seed);
  await p.close(); return r;
}
const a = await run(0xC0FFEE), b2 = await run(0xC0FFEE), c = await run(0xBADBEEF);

// [B] 부하 도달 — 화면에 적이 실제로 몇 마리 그려지는가 (v1의 핵심 결함)
async function loadCheck(viewport, stand) {
  const p = await open(viewport);
  const r = await p.evaluate(({ stand }) => {
    const b = window.__bench;
    b.setOpt('stand', stand);
    const out = [];
    for (const n of [400, 800, 1600]) {
      b.setTarget(n); b.resetWorld(0x777);
      for (let i = 0; i < 900; i++) b.step();     // 15초 진행 — 무리가 따라붙을 시간
      let vis = 0, dc = 0;
      for (let i = 0; i < 60; i++) { b.step(); b.draw(); vis += b.visible; dc += b.drawCalls; }
      out.push({ n, actual: b.eCount, visible: Math.round(vis / 60), drawCalls: Math.round(dc / 60) });
    }
    return out;
  }, { stand });
  await p.close(); return r;
}
const moveLoad = await loadCheck({ width: 393, height: 695 }, false);
const standLoad = await loadCheck({ width: 393, height: 695 }, true);

// [C] 배치 측정이 타이머 클램프 아래서도 값을 내는가 (로직/렌더 µs)
const p = await open({ width: 393, height: 695 });
const perf = await p.evaluate(() => {
  const b = window.__bench;
  const out = [];
  for (const n of [400, 800, 1600]) {
    b.setTarget(n); b.resetWorld(0x999);
    for (let i = 0; i < 900; i++) b.step();
    const t0 = performance.now(); for (let i = 0; i < 200; i++) b.step(); const t1 = performance.now();
    const t2 = performance.now(); for (let i = 0; i < 100; i++) b.draw(); const t3 = performance.now();
    out.push({ n, logicMs: +((t1 - t0) / 200).toFixed(3), renderMs: +((t3 - t2) / 100).toFixed(3), visible: b.visible });
  }
  return out;
});
await p.close();

const P = ok => ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
console.log('\n=== M0 벤치마크 v2 검증 ===\n');
console.log('[A] 결정론 (봇 이동 로직 변경 후 재확인)');
console.log(`    A=${a.hash} B=${b2.hash} C(다른시드)=${c.hash}`);
console.log('   ', P(a.hash === b2.hash && a.hash !== c.hash));
console.log('\n[B] 부하 도달 — 세로 393x695 화면에 실제로 그려지는 적 수');
console.log('    이동 모드:');
for (const r of moveLoad) console.log(`      적 ${String(r.n).padStart(4)} → 화면 ${String(r.visible).padStart(4)}기, 드로우콜 ${r.drawCalls}`);
console.log('    정지 모드:');
for (const r of standLoad) console.log(`      적 ${String(r.n).padStart(4)} → 화면 ${String(r.visible).padStart(4)}기, 드로우콜 ${r.drawCalls}`);
const l800 = moveLoad.find(r => r.n === 800);
console.log('    v1 기준(화면 70기) 대비 개선:', P(l800.visible >= 120), `— 현재 ${l800.visible}기`);
console.log('\n[C] 배치 측정값 (렌더는 SwiftShader라 절대치는 무의미, 0이 아닌지만 확인)');
for (const r of perf) console.log(`    적 ${String(r.n).padStart(4)} : 로직 ${r.logicMs}ms  렌더 ${r.renderMs}ms  (화면 ${r.visible}기)`);
console.log('   ', P(perf.every(r => r.logicMs > 0 && r.renderMs > 0)));
console.log('\n[D] 콘솔 에러:', errors.length ? errors : 'PASS (없음)');
console.log('');
await browser.close();
