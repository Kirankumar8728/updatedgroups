'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Zap, 
  Flame, 
  ShieldCheck, 
  Check, 
  ArrowLeft, 
  RefreshCw, 
  Smartphone, 
  Mail, 
  User, 
  QrCode, 
  CheckCircle2, 
  Sparkles, 
  Lock,
  Layers,
  ChevronRight,
  HelpCircle,
  ExternalLink,
  Award
} from 'lucide-react';
import { Group } from '@/src/types';
import { BOOST_PLANS, BoostPlan, getBoostPlanById } from '@/src/utils/boostPlans';
import { generateDirectPayContactDetails } from '@/src/utils/directPayContactGenerator';
import { PLATFORM_CONFIGS } from '@/src/utils/helpers';
import { fireConfetti } from '@/src/utils/confetti';

declare global {
  interface Window {
    Cashfree?: any;
  }
}

interface DirectPayCheckoutViewProps {
  initialGroups: Group[];
}

export function DirectPayCheckoutView({ initialGroups }: DirectPayCheckoutViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_20min'); // Default to ₹99 (1% OFF)
  
  // Custom contact details state auto-generated on load
  const [contactDetails, setContactDetails] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Selected UPI provider
  const [selectedUpiProvider, setSelectedUpiProvider] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'qr'>('phonepe');
  const [customUpiId, setCustomUpiId] = useState('');

  // Execution & result state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    orderId: string;
    stickyUntil: string;
    plan: BoostPlan;
    group: Group;
  } | null>(null);

  // Auto-generate contact details on mount & handle URL group query
  useEffect(() => {
    const generated = generateDirectPayContactDetails();
    setContactDetails(generated);

    const qGroupId = searchParams?.get('group_id');
    if (qGroupId) {
      const found = initialGroups.find(g => g.id === qGroupId);
      if (found) {
        setSelectedGroupId(found.id);
      } else if (initialGroups.length > 0) {
        setSelectedGroupId(initialGroups[0].id);
      }
    } else if (initialGroups.length > 0) {
      setSelectedGroupId(initialGroups[0].id);
    }

    const qPlanId = searchParams?.get('plan_id');
    if (qPlanId && getBoostPlanById(qPlanId)) {
      setSelectedPlanId(qPlanId);
    }
  }, [initialGroups, searchParams]);

  // Auto redirect to /direct-promoted-groups on payment confirmation
  useEffect(() => {
    if (successResult) {
      const timer = setTimeout(() => {
        router.push('/direct-promoted-groups');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [successResult, router]);

  // Load Cashfree JS SDK v3
  useEffect(() => {
    if (!document.getElementById('cashfree-js-sdk')) {
      const script = document.createElement('script');
      script.id = 'cashfree-js-sdk';
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleRegenerateContact = () => {
    const newDetails = generateDirectPayContactDetails();
    setContactDetails(newDetails);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const selectedPlan = getBoostPlanById(selectedPlanId) || BOOST_PLANS.find(p => p.id === 'plan_20min') || BOOST_PLANS[0];

  const handleExecuteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      setErrorMsg('Please select a community group to promote.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // Step 1: Create Order on Cashfree API / Backend
      const orderRes = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          planId: selectedPlan.id,
          customerName: contactDetails.name,
          customerPhone: contactDetails.phone,
          customerEmail: contactDetails.email
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Direct UPI Payment order initialization failed.');
      }

      const orderId = orderData.orderId;
      const paymentSessionId = orderData.paymentSessionId;

      // Step 2: Trigger Cashfree Checkout / SDK
      if (window.Cashfree && paymentSessionId && !paymentSessionId.startsWith('session_sim_')) {
        try {
          const cashfree = window.Cashfree({
            mode: orderData.environment === 'production' ? 'production' : 'sandbox'
          });

          await cashfree.checkout({
            paymentSessionId: paymentSessionId,
            redirectTarget: '_modal'
          });
        } catch (sdkErr) {
          console.warn('Notice from Cashfree SDK, verifying order directly:', sdkErr);
        }
      }

      // Step 3: Verify & Activate Payment Order
      const verifyRes = await fetch('/api/cashfree/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          groupId: selectedGroup.id,
          planId: selectedPlan.id,
          isDirectPay: true
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed.');
      }

      // Trigger Confetti Celebratory Effect
      fireConfetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6']
      });

      setSuccessResult({
        orderId,
        stickyUntil: verifyData.stickyUntil,
        plan: selectedPlan,
        group: verifyData.group || selectedGroup
      });

    } catch (err: any) {
      console.error('Direct Checkout Error:', err);
      setErrorMsg(err.message || 'Payment processing encountered an issue. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white py-8 sm:py-12">
      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4">
        {/* Success Screen */}
        {successResult ? (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>#1 Spot Pinned & Active</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                UPI Payment Confirmed!
              </h2>
              <p className="text-sm text-slate-300">
                Randomly selected <strong>{successResult.group.title}</strong> from <strong>Direct Promoted Groups</strong> and pinned it to the top for{' '}
                <strong className="text-amber-400">{successResult.plan.durationLabel}</strong>.
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 text-left max-w-md mx-auto space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Order ID</span>
                <span className="font-mono text-slate-200 font-semibold">{successResult.orderId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Target Group</span>
                <span className="font-bold text-slate-100">{successResult.group.title}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Selected Promotion Plan</span>
                <span className="font-bold text-amber-400">{successResult.plan.name} ({successResult.plan.durationLabel})</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Paid Amount</span>
                <span className="font-black text-emerald-400 text-base">₹{successResult.plan.price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sticky Expiry Time</span>
                <span className="font-semibold text-slate-200">{new Date(successResult.stickyUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/direct-promoted-groups"
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 text-center"
              >
                View Promoted Groups (/direct-promoted-groups)
              </Link>
              <button
                onClick={() => setSuccessResult(null)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-center"
              >
                Promote Another Community
              </button>
            </div>
          </div>
        ) : (
          /* Main Checkout Form */
          <form onSubmit={handleExecuteCheckout} className="max-w-lg mx-auto space-y-6">
            
            {/* Order Summary & Pay Action */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Checkout Summary</h3>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-400 gap-2">
                  <span className="shrink-0">Target Group</span>
                  <span className="font-semibold text-amber-300 text-right">
                    Random Group from Direct Promoted Groups
                  </span>
                </div>

                <div className="flex justify-between text-slate-400 gap-2">
                  <span className="shrink-0">Promotion Plan</span>
                  <span className="font-semibold text-amber-400 text-right">
                    Exclusive Groups
                  </span>
                </div>

                {selectedPlan.discountPercentage && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Applied Discount</span>
                    <span className="font-bold">{selectedPlan.discountPercentage}% OFF</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-base font-bold text-white">Total Amount</span>
                  <span className="text-2xl font-black text-amber-400">₹{selectedPlan.price}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Processing Direct UPI Checkout...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-slate-950" />
                    <span>Pay ₹{selectedPlan.price} via UPI & Activate</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit Encrypted Cashfree UPI Gateway</span>
              </div>
            </div>

          </form>
        )}

      </main>
    </div>
  );
}
