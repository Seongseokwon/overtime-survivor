/**
 * 절차적 효과음 (Web Audio)
 *
 * 타격감의 절반은 소리다. 다만 에셋 조달 전까지는 코드로 만든다 —
 * 오실레이터와 짧은 노이즈만으로 "때렸다 / 죽였다 / 맞았다 / 레벨업"은
 * 충분히 구분된다. 진짜 에셋은 M5에서 이 인터페이스 뒤로 교체된다.
 *
 * 이 파일은 렌더 계층이다. 시뮬레이션은 소리를 모른다.
 *
 * ⚠ 빈도 제어가 핵심이다. 초당 수십 마리가 죽는 게임에서 처치음을
 *   전부 재생하면 소음이 되고 오디오 스레드가 막힌다. 보이스 수와
 *   쿨다운을 모두 건다.
 */

type SfxName = 'hit' | 'kill' | 'multikill' | 'playerHit' | 'levelUp' | 'pickup';

const COOLDOWN_FRAMES: Record<SfxName, number> = {
  hit: 4,
  kill: 5,
  multikill: 18,
  playerHit: 20,
  levelUp: 0,
  pickup: 8,
};

const MAX_VOICES = 12;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private cooldown: Record<string, number> = {};
  private voices = 0;
  private _muted = false;

  get muted(): boolean { return this._muted; }

  /** 브라우저 정책상 사용자 제스처 이후에만 오디오가 열린다. */
  resume(): void {
    if (!this.ctx) this.init();
    void this.ctx?.resume();
  }

  setMuted(v: boolean): void {
    this._muted = v;
    if (this.master) this.master.gain.value = v ? 0 : 0.25;
  }

  private init(): void {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this._muted ? 0 : 0.25;
    master.connect(ctx.destination);

    // 짧은 화이트 노이즈 — 타격음의 재료
    const len = Math.floor(ctx.sampleRate * 0.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx; this.master = master; this.noise = buf;
  }

  /** 매 프레임 호출해 쿨다운을 감쇠시킨다 */
  tick(dt: number): void {
    for (const k in this.cooldown) {
      const v = this.cooldown[k]!;
      if (v > 0) this.cooldown[k] = Math.max(0, v - dt);
    }
  }

  play(name: SfxName): void {
    if (!this.ctx) this.init();
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master || ctx.state !== 'running') return;
    if ((this.cooldown[name] ?? 0) > 0) return;
    if (this.voices >= MAX_VOICES) return;
    this.cooldown[name] = COOLDOWN_FRAMES[name];

    const t = ctx.currentTime;
    switch (name) {
      case 'hit':        this.blip(t, 'square', 420, 300, 0.05, 0.18); break;
      case 'kill':       this.burst(t, 0.07, 1600, 0.22); break;
      case 'multikill':  this.burst(t, 0.14, 900, 0.5); this.blip(t, 'sawtooth', 180, 90, 0.16, 0.3); break;
      case 'playerHit':  this.blip(t, 'sawtooth', 150, 60, 0.22, 0.55); break;
      case 'pickup':     this.blip(t, 'sine', 780, 1180, 0.06, 0.12); break;
      case 'levelUp': {
        [523.25, 659.25, 783.99].forEach((f, i) => this.blip(t + i * 0.07, 'triangle', f, f, 0.12, 0.3));
        break;
      }
    }
  }

  private blip(at: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number): void {
    const ctx = this.ctx!, master = this.master!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur);
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g); g.connect(master);
    this.voices++;
    osc.onended = (): void => { this.voices--; };
    osc.start(at); osc.stop(at + dur);
  }

  private burst(at: number, dur: number, cutoff: number, gain: number): void {
    const ctx = this.ctx!, master = this.master!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(cutoff, at);
    filt.frequency.exponentialRampToValueAtTime(200, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    this.voices++;
    src.onended = (): void => { this.voices--; };
    src.start(at); src.stop(at + dur);
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null; this.master = null;
  }
}
