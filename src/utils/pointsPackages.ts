export interface PointsPackage {
  id: string;
  name: string;
  points: number;
  bonusPoints: number;
  price: number; // in INR
  popular?: boolean;
  bestValue?: boolean;
  description: string;
  savingsPercentage: number;
  badge?: string;
  iconName?: string;
}

export const POINTS_PACKAGES: PointsPackage[] = [
  {
    id: 'pack_starter',
    name: 'Starter Pack',
    points: 50,
    bonusPoints: 0,
    price: 49,
    description: 'Perfect for quick boosts, rating communities, and fast testing.',
    savingsPercentage: 2,
    badge: 'Beginner',
  },
  {
    id: 'pack_popular',
    name: 'Popular Pack',
    points: 120,
    bonusPoints: 21,
    price: 99,
    popular: true,
    badge: 'Most Popular',
    description: 'Our top seller! Unlocks 6h & 12h sticky highlights for groups.',
    savingsPercentage: 18,
  },
  {
    id: 'pack_pro',
    name: 'Pro Pack',
    points: 260,
    bonusPoints: 61,
    price: 199,
    bestValue: true,
    badge: 'Best Value',
    description: 'Full 24-hour top pinned placement with maximum community clicks.',
    savingsPercentage: 23,
  },
  {
    id: 'pack_growth',
    name: 'Growth Pack',
    points: 600,
    bonusPoints: 201,
    price: 399,
    badge: 'Fast Growth',
    description: 'Extended multi-day sticky placement for fast-growing channels.',
    savingsPercentage: 33,
  },
  {
    id: 'pack_super',
    name: 'Creator Power',
    points: 1500,
    bonusPoints: 601,
    price: 899,
    badge: 'Mega Saver',
    description: 'Massive point reservoir for community networks and power creators.',
    savingsPercentage: 40,
  },
];

export function getPointsPackageById(id: string): PointsPackage | undefined {
  return POINTS_PACKAGES.find(p => p.id === id);
}

/**
 * Calculates points for a custom rupee amount.
 * Baseline is 1 point per 1 INR, plus bonus points for higher amounts.
 */
export function calculateCustomPoints(inrAmount: number): { points: number; bonusPoints: number; totalPoints: number } {
  const safeAmount = Math.max(20, Math.floor(inrAmount));
  let bonusPercent = 0;
  if (safeAmount >= 800) {
    bonusPercent = 0.40;
  } else if (safeAmount >= 350) {
    bonusPercent = 0.30;
  } else if (safeAmount >= 150) {
    bonusPercent = 0.20;
  } else if (safeAmount >= 80) {
    bonusPercent = 0.15;
  }

  const bonusPoints = Math.round(safeAmount * bonusPercent);
  const totalPoints = safeAmount + bonusPoints;
  return {
    points: safeAmount,
    bonusPoints,
    totalPoints,
  };
}
