/**
 * 리플레이 입력 로그 (TDD §7.1)
 *
 * 매 프레임 기록하면 8분 × 60fps × 2B = 57.6KB.
 * 입력은 대부분 연속해서 같으므로 "바뀐 프레임만" 기록한다.
 * 실측 예상 2~6KB.
 */
import type { InputFrame } from '../input/InputFrame';
import { INPUT_IDLE } from '../input/InputFrame';

export interface InputChange {
  frame: number;
  input: InputFrame;
}

export class InputLog {
  private changes: InputChange[] = [];
  private last: InputFrame = INPUT_IDLE;
  private started = false;

  record(frame: number, input: InputFrame): void {
    if (!this.started || input !== this.last) {
      this.changes.push({ frame, input });
      this.last = input;
      this.started = true;
    }
  }

  /** 재생: 해당 프레임에 유효한 입력을 돌려준다 */
  static replayer(changes: readonly InputChange[]) {
    let idx = 0;
    let current: InputFrame = INPUT_IDLE;
    return function at(frame: number): InputFrame {
      while (idx < changes.length && changes[idx]!.frame <= frame) {
        current = changes[idx]!.input;
        idx++;
      }
      return current;
    };
  }

  get entries(): readonly InputChange[] { return this.changes; }
  get byteEstimate(): number { return this.changes.length * 6; }

  reset(): void { this.changes = []; this.last = INPUT_IDLE; this.started = false; }
}

export interface ChoiceEntry { frame: number; cardIndex: number }

export interface ReplayHeader {
  engineVersion: number;
  contentVersion: number;
  masterSeed: number;
  mode: number;
  characterId: number;
  stageId: number;
  oathFlags: number;
  totalFrames: number;
}

export interface Replay {
  header: ReplayHeader;
  inputs: InputChange[];
  choices: ChoiceEntry[];
  checkpoints: { frame: number; hash: number }[];
}
