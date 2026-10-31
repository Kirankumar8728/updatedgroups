export interface BoostPlan {
  id: string;
  name: string;
  durationLabel: string;
  durationMinutes: number;
  durationMs: number;
  price: number; // in INR
  originalPrice: number;
  discountPercentage?: number; // e.g. 2, 10, 20, 30, 40, 50, 80, 90
  badge?: string;
  category: 'quick' | 'hourly' | 'extended';
  popular?: boolean;
}

export const BOOST_PLANS: BoostPlan[] = [
  // Quick Promotions
  {
    id: 'plan_5min',
    name: '5 Minutes Spark',
    durationLabel: '5 min',
    durationMinutes: 5,
    durationMs: 5 * 60 * 1000,
    price: 25,
    originalPrice: 25,
    category: 'quick',
    badge: 'Starter'
  },
  {
    id: 'plan_10min',
    name: '10 Minutes Pulse',
    durationLabel: '10 min',
    durationMinutes: 10,
    durationMs: 10 * 60 * 1000,
    price: 49,
    originalPrice: 50,
    discountPercentage: 2,
    category: 'quick'
  },
  {
    id: 'plan_20min',
    name: '20 Minutes Promote',
    durationLabel: '20 min',
    durationMinutes: 20,
    durationMs: 20 * 60 * 1000,
    price: 99,
    originalPrice: 100,
    discountPercentage: 1,
    category: 'quick',
    badge: '1% OFF'
  },
  {
    id: 'plan_30min',
    name: '30 Minutes Surge',
    durationLabel: '30 min',
    durationMinutes: 30,
    durationMs: 30 * 60 * 1000,
    price: 135,
    originalPrice: 150,
    discountPercentage: 10,
    category: 'quick',
    badge: 'Popular'
  },

  // Hourly Promotions
  {
    id: 'plan_1hour',
    name: '1 Hour Spotlight',
    durationLabel: '1 hour',
    durationMinutes: 60,
    durationMs: 60 * 60 * 1000,
    price: 270,
    originalPrice: 300,
    discountPercentage: 10,
    category: 'hourly',
    popular: true,
    badge: 'Best Seller'
  },
  {
    id: 'plan_2hour',
    name: '2 Hours Momentum',
    durationLabel: '2 hour',
    durationMinutes: 120,
    durationMs: 2 * 60 * 60 * 1000,
    price: 480,
    originalPrice: 600,
    discountPercentage: 20,
    category: 'hourly'
  },
  {
    id: 'plan_4hour',
    name: '4 Hours Rush',
    durationLabel: '4 hour',
    durationMinutes: 240,
    durationMs: 4 * 60 * 60 * 1000,
    price: 960,
    originalPrice: 1200,
    discountPercentage: 20,
    category: 'hourly'
  },
  {
    id: 'plan_8hour',
    name: '8 Hours Full Day Reach',
    durationLabel: '8 hour',
    durationMinutes: 480,
    durationMs: 8 * 60 * 60 * 1000,
    price: 1680,
    originalPrice: 2400,
    discountPercentage: 30,
    category: 'hourly'
  },
  {
    id: 'plan_12hour',
    name: '12 Hours Prime Visibility',
    durationLabel: '12 hour',
    durationMinutes: 720,
    durationMs: 12 * 60 * 60 * 1000,
    price: 2160,
    originalPrice: 3600,
    discountPercentage: 40,
    category: 'hourly',
    badge: 'Super Saver'
  },

  // Extended Promotions
  {
    id: 'plan_1day',
    name: '1 Day Full Domination',
    durationLabel: '1 day',
    durationMinutes: 1440,
    durationMs: 24 * 60 * 60 * 1000,
    price: 3600,
    originalPrice: 7200,
    discountPercentage: 50,
    category: 'extended',
    popular: true,
    badge: '50% OFF'
  },
  {
    id: 'plan_7days',
    name: '7 Days Weekly Mega Promotion',
    durationLabel: '7 days',
    durationMinutes: 10080,
    durationMs: 7 * 24 * 60 * 60 * 1000,
    price: 10080,
    originalPrice: 50400,
    discountPercentage: 80,
    category: 'extended',
    badge: '80% OFF'
  },
  {
    id: 'plan_1month',
    name: '1 Month Ultimate Empire',
    durationLabel: '1 month',
    durationMinutes: 43200,
    durationMs: 30 * 24 * 60 * 60 * 1000,
    price: 20160,
    originalPrice: 201600,
    discountPercentage: 90,
    category: 'extended',
    badge: '90% OFF'
  }
];

export function getBoostPlanById(planId: string): BoostPlan | undefined {
  return BOOST_PLANS.find(p => p.id === planId);
}

export function formatBoostDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60} hr`;
  return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''}`;
}
