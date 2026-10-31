'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Tag,
  Copy,
  Smartphone,
  MessageSquare,
  ExternalLink,
  CheckCheck,
  QrCode
} from 'lucide-react';
import { POINTS_PACKAGES, PointsPackage, calculateCustomPoints } from '../utils/pointsPackages';
import { fireConfetti } from '../utils/confetti';
import { UserProfile } from '../types/user';
import { QRCodeSVG } from 'qrcode.react';

interface BuyPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSuccess?: (newBalance: number) => void;
  onRequireAuth?: () => void;
  initialPackageId?: string;
}

const UPI_ID = '872808728@ybl';
const WHATSAPP_NUMBER = '+918328208263';

export const BuyPointsModal: React.FC<BuyPointsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  onRequireAuth,
  initialPackageId = 'pack_popular',
}) => {
  const [step, setStep] = useState<'select_pack' | 'qr_payment' | 'submitted'>('select_pack');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(initialPackageId);
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [customInr, setCustomInr] = useState<number>(250);

  // User input fields
  const [personName, setPersonName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Status & processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    whatsappUrl: string;
    whatsappMessage: string;
    personName: string;
    amount: number;
    points: number;
    packageName: string;
  } | null>(null);

  // Pre-fill user information when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select_pack');
      setErrorMsg(null);
      setSubmissionResult(null);
      setIsProcessing(false);
      setCopiedUpi(false);
      if (currentUser) {
        setPersonName(currentUser.displayName || '');
      }
      if (initialPackageId) {
        setSelectedPackageId(initialPackageId);
        setIsCustomAmount(false);
      }
    }
  }, [isOpen, currentUser, initialPackageId]);

  if (!isOpen) return null;

  const selectedPack = POINTS_PACKAGES.find(p => p.id === selectedPackageId) || POINTS_PACKAGES[1];

  let price = selectedPack.price;
  let basePoints = selectedPack.points;
  let bonusPoints = selectedPack.bonusPoints;
  let totalPoints = selectedPack.points + selectedPack.bonusPoints;
  let packageName = selectedPack.name;

  if (isCustomAmount) {
    const calc = calculateCustomPoints(customInr);
    price = Math.max(20, Math.floor(customInr));
    basePoints = calc.points;
    bonusPoints = calc.bonusPoints;
    totalPoints = calc.totalPoints;
    packageName = `Custom Pack (₹${price})`;
  }

  const upiPayUrl = `upi://pay?pa=${UPI_ID}&pn=GroupLinks%20Credits&am=${price}&cu=INR&tn=${encodeURIComponent(`Credits_${totalPoints}Pts`)}`;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleProceedToQR = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personName.trim()) {
      setErrorMsg('Please enter your name to proceed with the credits purchase.');
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
      const formattedDate = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const waText = 
`🪙 *GroupLinks Credits Purchase Request*

👤 *Person Name:* ${personName.trim()}
💰 *Payment Amount:* ₹${price}
✨ *Points Package:* ${packageName} (${totalPoints} Points)
📅 *Payment Time:* ${formattedDate}
${utrNumber && utrNumber.trim() ? `🔢 *UTR / Ref No:* ${utrNumber.trim()}\n` : ''}${currentUser ? `🆔 *User ID / Email:* ${currentUser.email || currentUser.id}\n` : ''}
I have made the UPI payment of ₹${price} to 872808728@ybl. Please verify and add ${totalPoints} points to my account!`;

      const whatsappUrl = `https://wa.me/918328208263?text=${encodeURIComponent(waText)}`;

      // Confetti
      fireConfetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#6366f1', '#10b981', '#ec4899']
      });

      setSubmissionResult({
        whatsappUrl,
        whatsappMessage: waText,
        personName: personName.trim(),
        amount: price,
        points: totalPoints,
        packageName,
      });

      setStep('submitted');

      // Automatically open WhatsApp in new tab/app
      if (typeof window !== 'undefined' && whatsappUrl) {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error('Points payment error:', err);
      setErrorMsg(err.message || 'Error processing request.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="buy-points-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        id="buy-points-modal-content"
        className="relative w-full max-w-2xl my-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-md">
                <Coins className="w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-black/25 text-white mb-1">
                  <Sparkles className="w-3 h-3 fill-white" />
                  <span>MANUAL UPI QR CHECKOUT</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                  Buy GroupLinks Credits
                </h2>
              </div>
            </div>

            <button
              id="buy-points-close-btn"
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {currentUser && (
            <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-black/20 text-xs text-white">
              <span>Account: <strong>{currentUser.displayName}</strong></span>
              <span className="font-bold font-mono">Current Balance: {currentUser.creditsBalance} Points</span>
            </div>
          )}
        </div>

        {/* STEP 3: SUBMITTED SUCCESS VIEW */}
        {step === 'submitted' && submissionResult ? (
          <div className="p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCheck className="w-10 h-10 stroke-[3]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <Coins className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400" />
                <span>Credits Request Submitted</span>
              </div>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                Payment Details Sent to WhatsApp!
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Thank you <strong>{submissionResult.personName}</strong>! Your purchase request for <strong>{submissionResult.points} Points (₹{submissionResult.amount})</strong> has been received. Our team will verify and credit your points immediately.
              </p>
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
                Close
              </button>
            </div>
          </div>
        ) : step === 'qr_payment' ? (
          /* STEP 2: UPI QR CODE VIEW */
          <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setStep('select_pack')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Packages</span>
              </button>

              <div className="text-right">
                <span className="text-[11px] text-neutral-400 block font-medium">Amount to Pay</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                  ₹{price}
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
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

            {/* Optional UTR Field */}
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
                After making payment of <strong>₹{price}</strong>, click below to submit and notify our WhatsApp support (+918328208263).
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
                Redirects to WhatsApp <strong>+918328208263</strong> with your points package, name & receipt.
              </p>
            </div>
          </div>
        ) : (
          /* STEP 1: SELECT PACKAGE & ENTER NAME */
          <form onSubmit={handleProceedToQR} className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Package Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Select Points Package</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomAmount(!isCustomAmount)}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{isCustomAmount ? 'View Standard Packs' : 'Custom Amount'}</span>
                </button>
              </div>

              {!isCustomAmount ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {POINTS_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        id={`points-pack-${pkg.id}`}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md ring-1 ring-amber-500'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/60'
                        }`}
                      >
                        {pkg.badge && (
                          <span
                            className={`absolute -top-2 right-3 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full shadow-xs ${
                              pkg.popular
                                ? 'bg-amber-500 text-white'
                                : pkg.bestValue
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {pkg.badge}
                          </span>
                        )}

                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                              {pkg.name}
                            </h4>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                                {pkg.points + pkg.bonusPoints}
                              </span>
                              <span className="text-xs text-neutral-500 font-semibold">Points</span>
                              {pkg.bonusPoints > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                  +{pkg.bonusPoints} Bonus
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-black text-neutral-900 dark:text-white font-mono">
                              ₹{pkg.price}
                            </div>
                            {pkg.savingsPercentage > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                                Save {pkg.savingsPercentage}%
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-1">
                          {pkg.description}
                        </p>

                        {isSelected && (
                          <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected Package</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Custom Amount Input */
                <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Enter Rupee Amount (Min ₹20):
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-neutral-400 font-mono font-bold text-sm">₹</span>
                      <input
                        id="custom-points-inr-input"
                        type="number"
                        min={20}
                        max={50000}
                        value={customInr}
                        onChange={(e) => setCustomInr(Math.max(20, Number(e.target.value) || 20))}
                        className="w-32 pl-7 pr-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono font-bold text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block">Base Points</span>
                      <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">{basePoints}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">Bonus</span>
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">+{bonusPoints}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold block">Total Received</span>
                      <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">{totalPoints}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Name Input */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Your Name & Contact</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
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

                <div>
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

            {/* Submit to Payment Button */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <QrCode className="w-5 h-5 fill-white" />
                <span>Proceed to Pay ₹{price} via UPI QR Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-400 flex-wrap">
                <span>UPI: <strong className="text-neutral-700 dark:text-neutral-200">872808728@ybl</strong></span>
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
