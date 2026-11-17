export interface DiscModeMeta {
  key?: string;
  label?: string;
  accent?: string;
  ringTitle?: string;
  minutes?: number;
}

export interface DiscCarouselParams {
  glide?: number;
  gap?: number;
  lean?: number;
  trail?: number;
}

export interface DiscTimerState {
  index: number;
  mode: string;
  label: string;
  accent?: string;
  timeLabel: string;
  progress: number;
  statusLine?: string;
  cycleCount?: number;
  cycleTotal?: number;
}

export interface DiscCarouselStatus {
  destroyed: boolean;
  paused: boolean;
  visible: boolean;
  renderer: 'webgl' | 'css';
  /** 最近一次测量的舞台尺寸（CSS 像素） */
  width: number;
  height: number;
  [key: string]: unknown;
}

export interface DiscCarouselInstance {
  readonly params: DiscCarouselParams;
  setParams(params: DiscCarouselParams): void;
  setPaused(paused: boolean): void;
  reset(): void;
  goTo(index: number): boolean;
  setReducedMotion(reduced: boolean | null): void;
  setTimerState(state: DiscTimerState): void;
  /** 沉浸放大时切换整组三盘的机位（镜头拉正、后退，三盘一起入画） */
  setImmersiveView(enabled: boolean): void;
  /** 运行时状态；常驻缓存用它确认实例没有被 pagehide 等路径销毁。 */
  status(): DiscCarouselStatus;
  destroy(): void;
}

export interface DiscCarouselOptions {
  params?: DiscCarouselParams;
  modeMeta?: DiscModeMeta[];
  reducedMotion?: boolean | null;
}

export function mountDiscCarousel(
  element: HTMLElement,
  options?: DiscCarouselOptions,
): DiscCarouselInstance;
