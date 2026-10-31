'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Coins, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Flame, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Group } from '../types';
import { BOOST_PLANS, BoostPlan, formatBoostDuration } from '../utils/boostPlans';
import { getStoredSessionToken } from '../utils/userAuth';
import { fireConfetti } from '../utils/confetti';

interface PromoteWithCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  userCredits: number;
  onSuccess?: (updatedGroup: Group, newBalance: number) => void;
  onRequireAuth?: () => void;
  onOpenBuyPoints?: () => void;
  initialPlanId?: string;
}

export const PromoteWithCreditsModal: React.FC<PromoteWithCreditsModalProps> = ({
  isOpen,
  onClose,
  group,
  userCredits,
  onSuccess,
  onRequireAuth,
  onOpenBuyPoints,
  initialPlanId
}) => {
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan>(() => {
    if (initialPlanId) {
      const found = BOOST_PLANS.find(p => p.id === initialPlanId);
      if (found) return found;
    }
    return BOOST_PLANS[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlanId) {
      const found = BOOST_PLANS.find(p => p.id === initialPlanId);
      if (found) setSelectedPlan(found);
    }
  }, [initialPlanId, isOpen]);

  if (!isOpen) return null;

  const creditCost = selectedPlan.price;
  const hasEnoughCredits = userCredits >= creditCost;
  const remainingCreditsAfter = userCredits - creditCost;

  const handlePromote = async () => {
    const token = getStoredSessionToken();
    if (!token) {
      if (onRequireAuth) {
        onClose();
        onRequireAuth();
      } else {
        setError('Please sign in to promote your community.');
      }
      return;
    }

    if (!hasEnoughCredits) {
      setError(`Insufficient promotion credits. You need ${creditCost} credits, but have ${userCredits}.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/promote-with-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: group.id,
          planId: selectedPlan.id
        })
      });

      const data = await res.json();
      if (data.success) {
        try {
          fireConfetti({ particleCount: 60, spread: 80 });
        } catch {}
        setSuccessMsg(data.message || 'Promotion activated successfully!');
        if (onSuccess && data.group) {
          onSuccess(data.group, data.remainingCredits !== undefined ? data.remainingCredits : remainingCreditsAfter);
        }
      } else {
        setError(data.error || 'Failed to activate promotion.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                Promote with Credits
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[320px]">
                {group.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Balance Banner */}
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
            <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Your Available Balance:</span>
          </div>
          <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400 font-mono">
            {userCredits} Credits
          </span>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
              Promotion Activated!
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
              {successMsg}
            </p>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 max-w-xs mx-auto text-xs">
              <div className="flex justify-between text-neutral-500 mb-1">
                <span>Credits Spent:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{creditCost} Credits</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Remaining Balance:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">{remainingCreditsAfter} Credits</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full max-w-xs mx-auto py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Select Promotion Duration & Tier:
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BOOST_PLANS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  const canAfford = userCredits >= plan.price;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-neutral-900 dark:text-white">
                              {plan.name}
                            </span>
                            {plan.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {plan.durationLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                        <div className="flex items-center gap-1 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{plan.price} Credits</span>
                        </div>
                        {!canAfford && (
                          <span className="text-[10px] text-rose-500 font-medium">Need more credits</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Summary Bar */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Plan Cost:</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">{creditCost} Credits</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Remaining Balance:</span>
                <span className={`font-bold font-mono ${remainingCreditsAfter < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {remainingCreditsAfter} Credits
                </span>
              </div>

              <button
                type="button"
                onClick={handlePromote}
                disabled={isLoading || !hasEnoughCredits}
                className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  hasEnoughCredits
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer'
                    : 'bg-neutral-400 cursor-not-allowed opacity-70'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Confirm Promotion ({creditCost} Credits)</span>
                  </>
                )}
              </button>

              {/* Buy Points option when balance is low or on request */}
              {!hasEnoughCredits && onOpenBuyPoints && (
                <button
                  id="promote-modal-buy-points-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBuyPoints();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Buy Points via Payment Gateway (Need {creditCost - userCredits} More)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {hasEnoughCredits && onOpenBuyPoints && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBuyPoints();
                  }}
                  className="w-full text-center text-[11px] font-semibold text-neutral-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors pt-1 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Want more points? Buy via Payment Gateway (UPI, Cards, NetBanking)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
