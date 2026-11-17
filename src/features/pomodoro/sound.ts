import { MODE_META } from './constants';
import type { PomodoroMode } from './types';

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext = new Ctor();
  } catch {
    return null;
  }
  return audioContext;
}

/**
 * 在用户手势中解锁音频上下文（iOS / Android WebView 要求）。
 * 开始计时时调用一次即可。
 */
export function unlockAudio(): void {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }
}

/**
 * 开始专注的短促上行提示音。
 * 比完成音更短、更轻，避免每次开始都显得沉重。
 */
export function playStartCue(): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const notes = [392, 523.25];
  const startAt = context.currentTime + 0.02;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + index * 0.11;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.22, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.34);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.36);
  });
}

/**
 * 暂停 / 重置的短促下行提示音。
 * 和开始音形成一上一下，让「开始」和「暂停」在听觉上也能区分。
 */
export function playPauseCue(): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const notes = [523.25, 392];
  const startAt = context.currentTime + 0.02;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + index * 0.1;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.32);
  });
}

/**
 * 用 WebAudio 合成提示音，无需打包音频文件。
 * 专注结束：上行四音；休息结束：下行三音。
 */
export function playChime(kind: 'focusEnd' | 'breakEnd'): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const notes = kind === 'focusEnd' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 523.25, 392];
  const startAt = context.currentTime + 0.03;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + index * 0.16;

    oscillator.type = index === notes.length - 1 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.24, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.95);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 1);
  });
}

export function vibrateForCompletion(kind: 'focusEnd' | 'breakEnd'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(kind === 'focusEnd' ? [28, 90, 28, 90, 44] : [24, 70, 36]);
  } catch {
    // 部分 WebView 不支持震动，忽略
  }
}

export function completionMessage(mode: PomodoroMode, nextMode?: PomodoroMode): string {
  if (mode === 'focus') {
    return nextMode === 'longBreak'
      ? '一组专注完成，进入长休息。'
      : MODE_META.shortBreak.hint;
  }
  return '休息结束，准备好再开始。';
}
