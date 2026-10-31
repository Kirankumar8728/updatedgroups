'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Pin,
  Lock,
  Copy,
  MessageSquare,
  ArrowLeft,
  CheckCheck,
  Send,
  QrCode
} from 'lucide-react';
import { Group } from '../types';
import { BOOST_PLANS, BoostPlan } from '../utils/boostPlans';
import { PLATFORM_CONFIGS, isAdultGroup, getCategoryFallbackImage } from '../utils/helpers';
import { PlatformIcon } from './PlatformIcon';
import { fireConfetti } from '../utils/confetti';
import { QRCodeSVG } from 'qrcode.react';

interface BoostPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onBoostSuccess?: (updatedGroup: Group, plan: BoostPlan) => void;
}

const UPI_ID = '872808728@ybl';
const WHATSAPP_NUMBER = '+918328208263';

export const BoostPaymentModal: React.FC<BoostPaymentModalProps> = ({
  isOpen,
  onClose,
  group,
  onBoostSuccess
}) => {
  const [step, setStep] = useState<'select_plan' | 'qr_payment' | 'submitted'>('select_plan');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_1hour');
  const [filterCategory, setFilterCategory] = useState<'all' | 'quick' | 'hourly' | 'extended'>('all');
  
  // User input fields
  const [personName, setPersonName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Status & processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    whatsappUrl: string;
    whatsappMessage: string;
    promoId: string;
    plan: BoostPlan;
    personName: string;
    amount: number;
    submittedAt: string;
  } | null>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select_plan');
      setErrorMsg(null);
      setSubmissionResult(null);
      setIsProcessing(false);
      setCopiedUpi(false);
    }
  }, [isOpen, group]);

  if (!isOpen || !group) return null;

  const platformConfig = PLATFORM_CONFIGS[group.platform] || PLATFORM_CONFIGS.other;
  const isAdult = isAdultGroup(group);
  const selectedPlan = BOOST_PLANS.find(p => p.id === selectedPlanId) || BOOST_PLANS[4] || BOOST_PLANS[0];

  const displayedPlans = filterCategory === 'all'
    ? BOOST_PLANS
    : BOOST_PLANS.filter(p => p.category === filterCategory);

  // Generate UPI Intent and QR Payload
  // upi://pay?pa=872808728@ybl&pn=GroupLinks%20Promotion&am=270&cu=INR&tn=GroupPromotion
  const upiPayUrl = `upi://pay?pa=${UPI_ID}&pn=GroupLinks%20Promotion&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent((group.title || 'Group Boost').slice(0, 25))}`;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleProceedToQR = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personName.trim()) {
      setErrorMsg('Please enter your name to proceed with the promotion payment.');
      return;
    }
    setErrorMsg(null);
    setStep('qr_payment');
  };

  const handlePaymentCompleted = async () => {
    if (!personName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // Step 1: Submit to backend API
      const res = await fetch('/api/boost/manual-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group.id,
          planId: selectedPlan.id,
          personName: personName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          utrNumber: utrNumber.trim() || undefined,
          siteOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit promotion details. Please try again.');
      }

      // Celebrate
      fireConfetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6']
      });

      setSubmissionResult({
        whatsappUrl: data.whatsappUrl,
        whatsappMessage: data.whatsappMessage,
        promoId: data.promotion.id,
        plan: selectedPlan,
        personName: personName.trim(),
        amount: selectedPlan.price,
        submittedAt: data.promotion.submittedAt,
      });

      setStep('submitted');

      // Automatically open WhatsApp in new tab/app
      if (typeof window !== 'undefined' && data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      if (onBoostSuccess) {
        onBoostSuccess(group, selectedPlan);
      }
    } catch (err: any) {
      console.error('Promotion submission error:', err);
      setErrorMsg(err.message || 'Error recording promotion. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 text-neutral-900 dark:text-neutral-100"
      >
        
        {/* Header Ribbon */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-md">
                <Zap className="w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-black/25 text-white mb-1">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>INSTANT PROMOTION & STICKY PIN</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                  Promote Your Community
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-white/90 mt-2 font-medium">
            Pin <strong>{group.title}</strong> to the #1 spot across all platforms & get instant 10x-50x join reach!
          </p>
        </div>

        {/* STEP 3: SUBMITTED SUCCESS VIEW */}
        {step === 'submitted' && submissionResult ? (
          <div className="p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCheck className="w-10 h-10 stroke-[3]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <Pin className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400" />
                <span>Promotion Request Submitted</span>
              </div>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                Payment Details Sent to WhatsApp!
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Thank you <strong>{submissionResult.personName}</strong>! Your promotion request for <strong>{group.title}</strong> has been received. Our team will verify and activate your sticky boost immediately.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                <span>Promoted Group</span>
                <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[200px]">{group.title}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                <span>Selected Plan</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">{submissionResult.plan.name}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                <span>Promoted Period</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{submissionResult.plan.durationLabel}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                <span>Payment Amount</span>
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">₹{submissionResult.amount}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                <span>UPI ID Paid To</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold">{UPI_ID}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-400 text-[10px] pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span>Reference ID</span>
                <span className="font-mono">{submissionResult.promoId}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href={submissionResult.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Open WhatsApp Chat (+918328208263)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onClose}
                className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                Close & View Feed
              </button>
            </div>
          </div>
        ) : step === 'qr_payment' ? (
          /* STEP 2: UPI QR CODE PAYMENT SCREEN */
          <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setStep('select_plan')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Plans</span>
              </button>

              <div className="text-right">
                <span className="text-[11px] text-neutral-400 block font-medium">Amount to Pay</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{selectedPlan.price}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* UPI Payment Instructions, QR Code & UPI ID */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Scan QR with Any UPI App (GPay / PhonePe / Paytm / BHIM)</span>
              </div>

              {/* Dynamic QR Code Box */}
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-center">
                <QRCodeSVG
                  value={upiPayUrl}
                  size={180}
                  level="M"
                  marginSize={2}
                />
              </div>

              {/* UPI ID Info with Copy Button */}
              <div className="space-y-1.5 w-full max-w-sm">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  Or Pay to UPI ID:
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                  <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white pl-2">
                    {UPI_ID}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpiId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy UPI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional UTR / Reference ID Field */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Payment Verification (Optional)
                </label>
                <span className="text-[10px] text-neutral-400">Helps fast approval</span>
              </div>

              <div>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="Enter 12-digit UPI UTR No. or Transaction ID (Optional)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                After making payment of <strong>₹{selectedPlan.price}</strong>, click below to submit and notify our WhatsApp support (+918328208263).
              </p>
            </div>

            {/* Payment Completed CTA */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handlePaymentCompleted}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Payment Details...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-5 h-5" />
                    <span>Payment Completed (Notify on WhatsApp)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-neutral-400">
                Redirects to WhatsApp <strong>+918328208263</strong> with your group link, name & payment receipt.
              </p>
            </div>

          </div>
        ) : (
          /* STEP 1: PRICE CHART & NAME INPUT */
          <form onSubmit={handleProceedToQR} className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* Target Group Preview Bar */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
              <img
                src={group.imageUrl}
                alt={group.title}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = getCategoryFallbackImage(group.category, false, group.title);
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${platformConfig.badgeClass}`}>
                    {platformConfig.name}
                  </span>
                  {group.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate mt-0.5">
                  {group.title}
                </h4>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                  Top #1 Pin Guarantee
                </span>
                <span className="text-[10px] text-neutral-400">
                  Instant activation
                </span>
              </div>
            </div>

            {/* Plan Category Filter Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Choose Promotion Duration & Price</span>
                </label>
                <span className="text-[11px] text-neutral-500 font-medium">
                  {BOOST_PLANS.length} Tiers Available
                </span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filterCategory === 'all'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  All Plans ({BOOST_PLANS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('quick')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filterCategory === 'quick'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Quick (5m - 30m)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('hourly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filterCategory === 'hourly'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Hourly (1h - 12h)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('extended')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    filterCategory === 'extended'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Mega (1d - 1mo)
                </button>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {displayedPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20 shadow-md'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    {/* Badge Overlay */}
                    {plan.discountPercentage ? (
                      <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                        {plan.discountPercentage}% OFF
                      </span>
                    ) : plan.badge ? (
                      <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                        {plan.badge}
                      </span>
                    ) : null}

                    <div>
                      <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-xs font-bold mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{plan.durationLabel}</span>
                      </div>
                      <h5 className="font-black text-lg sm:text-xl text-neutral-900 dark:text-white">
                        ₹{plan.price}
                      </h5>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                      {plan.originalPrice > plan.price ? (
                        <span className="text-neutral-400 line-through">
                          ₹{plan.originalPrice}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[10px]">Regular</span>
                      )}

                      <span className={`font-bold text-[10px] ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Customer Name Input (Required) */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                <span>Your Name & Contact Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                    Phone / WhatsApp No. (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Benefits Checklist */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 stroke-[3]" />
                <span><strong>Sticky #1 Pin:</strong> Highlighted at the absolute top of the feed</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 stroke-[3]" />
                <span><strong>Live Countdown Timer:</strong> Shows "Sticky Promoted" badge to all visitors</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 stroke-[3]" />
                <span><strong>10x Clicks & Growth:</strong> Highest conversion rank on search & category filters</span>
              </div>
            </div>

            {/* Payment Trigger CTA Button */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-white" />
                <span>Proceed to Pay ₹{selectedPlan.price} via UPI QR Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Supported payment badges */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  UPI ID: <strong className="text-neutral-700 dark:text-neutral-200">872808728@ybl</strong>
                </span>
                <span>•</span>
                <span>GPay, PhonePe, Paytm, BHIM</span>
                <span>•</span>
                <span>WhatsApp: <strong className="text-neutral-700 dark:text-neutral-200">+918328208263</strong></span>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
