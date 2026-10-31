/**
 * Dynamic Confetti Launcher
 * Loads canvas-confetti on-demand only when a user interacts (upvotes/boosts),
 * preventing it from blocking initial page load & reducing main bundle size.
 */

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  angle?: number;
  startVelocity?: number;
  ticks?: number;
  shapes?: ('square' | 'circle')[];
  scalar?: number;
  zIndex?: number;
  disableForReducedMotion?: boolean;
}

export const fireConfetti = async (options?: ConfettiOptions): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;
    if (typeof confetti === 'function') {
      confetti(options);
    }
  } catch (err) {
    console.warn('Unable to load confetti animation:', err);
  }
};
