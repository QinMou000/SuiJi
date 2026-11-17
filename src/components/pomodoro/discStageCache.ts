import type { DiscCarouselInstance } from '../../effects/disc-carousel/effect';

/**
 * 专注页表盘的常驻场景。
 *
 * 一次 mountDiscCarousel 要生成 1024² 盘面纹理、两张 1024² 法线贴图（各百万级像素的循环）、
 * 三张计时盘面并编译一整套 physical 材质着色器，是几百毫秒级的主线程长任务。
 * 之前每次离开专注页都会 destroy()，回来再从头构建一遍，所以切页明显卡顿。
 *
 * 这里把一个已经建好的舞台缓存在模块作用域：离开时 setPaused(true) 并挪进屏幕外的停机坪，
 * WebGL 上下文、纹理、几何体全部保留；回到专注页再挂回页面即可，第二次进入几乎零成本。
 */
interface CachedStage {
  /** 表盘舞台宿主：跟着页面“搬家”，但 WebGL 场景只构建一次。 */
  host: HTMLDivElement;
  fx: DiscCarouselInstance;
  /** 主题 / 时长指纹：盘面文字和雾色都烘焙在纹理里，变了必须重建。 */
  signature: string;
}

let stage: CachedStage | null = null;

export interface StageLease {
  host: HTMLDivElement;
  /** null 表示这是全新舞台，调用方需要 mount 后登记。 */
  fx: DiscCarouselInstance | null;
  /** 命中缓存：场景是上一次留下的，只是被暂停过。 */
  reused: boolean;
}

/** 申请舞台：指纹一致就复用（未销毁），否则释放旧的并给出一个新宿主。 */
export function acquireDiscStage(signature: string): StageLease {
  if (stage && stage.signature === signature && isAlive(stage.fx)) {
    return { host: stage.host, fx: stage.fx, reused: true };
  }
  releaseDiscStage();
  const host = document.createElement('div');
  host.className = 'timer-disc-stage absolute inset-0';
  return { host, fx: null, reused: false };
}

/** 场景可能被自身生命周期销毁（pagehide、准备失败），缓存不能假设它一直有效。 */
function isAlive(fx: DiscCarouselInstance): boolean {
  try {
    return !fx.status().destroyed;
  } catch {
    return false;
  }
}

/** 舞台已插入文档并完成 mount 后登记，供下次进入时复用。 */
export function registerDiscStage(
  host: HTMLDivElement,
  fx: DiscCarouselInstance,
  signature: string,
): void {
  stage = { host, fx, signature };
}

/**
 * 页面离开：暂停渲染，把舞台挪进「停机坪」而不是删除。
 *
 * 停机坪就是一个尺寸和舞台一致、盖在 0,0 上但 visibility:hidden 的固定层：
 * - 尺寸不变 → ResizeObserver 不会把舞台报成 0（否则回来时会先按 1×1 画一帧，画面糊一下）；
 * - 仍在视口内 → IntersectionObserver 的 visible 保持 true，回来时 setPaused(false) 立刻就能恢复渲染，
 *   不用等一次“重新进入视口”的回调；
 * - visibility:hidden + pointer-events:none → 不参与绘制、不挡点击，实际渲染由 setPaused(true) 停掉。
 */
export function parkDiscStage(host: HTMLDivElement): void {
  if (stage?.host !== host) return;
  try {
    // 这一步按约定发生在 React 已经把节点从文档里摘掉之后，直接量 clientWidth 会得到 0，
    // 所以用场景自己记着的最近一次测量值。
    const { width, height } = stage.fx.status();
    stage.fx.setPaused(true);
    const lot = parkingLot(width, height);
    if (host.parentElement !== lot) lot.appendChild(host);
  } catch {
    // 停放失败就退化成直接释放，避免留下一个还在后台跑的场景
    releaseDiscStage();
  }
}

let parking: HTMLDivElement | null = null;

function parkingLot(width: number, height: number): HTMLDivElement {
  if (!parking) {
    parking = document.createElement('div');
    parking.setAttribute('aria-hidden', 'true');
    parking.dataset.dcParking = '';
    parking.style.cssText =
      'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;contain:strict;';
    document.body.appendChild(parking);
  }
  parking.style.width = `${Math.max(1, Math.round(width))}px`;
  parking.style.height = `${Math.max(1, Math.round(height))}px`;
  return parking;
}

/** 真正释放场景（销毁 WebGL 上下文与纹理）：指纹变化、热更新时调用。 */
export function releaseDiscStage(): void {
  const current = stage;
  stage = null;
  if (!current) return;
  current.host.remove();
  try {
    current.fx.destroy();
  } catch {
    // 上下文已经丢失时 destroy 可能抛错，忽略即可
  }
}

if (import.meta.hot) import.meta.hot.dispose(releaseDiscStage);
