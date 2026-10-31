'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Tag, 
  Globe, 
  Languages, 
  Image as ImageIcon,
  Check,
  Award,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  User,
  UploadCloud,
  Upload,
  FileImage,
  Edit3,
  Trash2,
  Info,
  ExternalLink,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Platform, Category, Language, Region, ScrapeMetadataResponse } from '../types';
import { detectPlatformFromUrl, validateGroupUrl, ALLOWED_URL_RULES, PLATFORM_CONFIGS, CATEGORIES, GENERAL_CATEGORIES, LANGUAGES, REGIONS, calculateRankScore, calculateRankGrade, getGroupUrlPath, getCommunityFallbackAvatar, getCategoryFallbackImage, resolveValidGroupImage, cleanCommunityTitle, isGenericGroupTitle, isGenericGroupDescription } from '../utils/helpers';
import { analyzeGroupContent } from '../utils/keywordFilter';
import { checkGroupRestrictedContent } from '../utils/moderation';
import { isUserAdminLoggedIn } from '../utils/adminAuth';
import { PlatformIcon } from './PlatformIcon';
import { Footer } from './Footer';
import { Header } from './Header';
import { AuthModal } from './AuthModal';
import { UserDashboardView } from './UserDashboardView';
import { useAuth } from './AuthProvider';
import { getStoredSessionToken } from '../utils/userAuth';
import { submitGroupAction } from '@/src/app/actions/submit-group';
import { analyzeImageUrlHeuristics, analyzeImageFileSkinTone } from '../utils/imageHeuristics';

// Helper to compress and convert uploaded image files to lightweight Data URLs (max 1000px, quality 0.85, max 2MB)
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WEBP, or GIF).'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      reject(new Error(`Image size (${sizeMb} MB) exceeds the maximum allowed limit of 2 MB. Please choose a smaller image.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 150;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
          resolve(canvas.toDataURL('image/webp', 0.8));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const SubmitGroupView = () => {
  const { user: currentUser, setUser } = useAuth();
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<Platform>('other');
  
  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Scraped & Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [category, setCategory] = useState<Category>('Tech & Programming');
  const [language, setLanguage] = useState<Language>('English');
  const [region, setRegion] = useState<Region>('Global');
  const [customTags, setCustomTags] = useState<string[]>(['#community']);
  const [newTagInput, setNewTagInput] = useState('');
  const [memberCount, setMemberCount] = useState<number>(250);
  const [rulesSummary, setRulesSummary] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isNsfw, setIsNsfw] = useState(false);
  const [rankKeywords, setRankKeywords] = useState<string[]>([]);

  // Manual Image Upload states
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const lastScrapeTimeRef = useRef<number>(0);
  const lastSubmitTimeRef = useRef<number>(0);

  // Statuses
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedSuccess, setScrapedSuccess] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manualModeActive, setManualModeActive] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    isDuplicate: boolean;
    reason?: string;
    canUserUpdate?: boolean;
    isUpdateLocked?: boolean;
    updateBlockedReason?: string;
    matchedGroup?: {
      id: string;
      title: string;
      slug?: string;
      platform?: Platform;
      category?: string;
      url?: string;
      isUpdateLocked?: boolean;
      updateBlockedReason?: string;
      canUserUpdate?: boolean;
    };
  } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [telegramApiData, setTelegramApiData] = useState<{
    handle: string;
    isVerified: boolean;
    memberCount: number;
    type: string;
    source: string;
  } | null>(null);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null);

  // Live Duplicate community check (debounced)
  useEffect(() => {
    if (!url.trim() && !title.trim()) {
      setDuplicateCheckResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const params = new URLSearchParams();
        if (url.trim()) params.set('url', url.trim());
        if (title.trim()) params.set('title', title.trim());
        if (platform && platform !== 'other') params.set('platform', platform);

        const res = await fetch(`/api/groups/check-duplicate?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isDuplicate) {
            setDuplicateCheckResult(data);
            if (data.matchedGroup) {
              const mg = data.matchedGroup;
              setTitle(prev => prev.trim() ? prev : (mg.title || ''));
              setDescription(prev => prev.trim() ? prev : (mg.description || ''));
              if (mg.imageUrl) setImageUrl(prev => prev.trim() ? prev : mg.imageUrl);
              if (mg.bannerUrl) setBannerUrl(prev => prev.trim() ? prev : mg.bannerUrl);
              if (mg.category) setCategory(mg.category);
              if (mg.language) setLanguage(mg.language);
              if (mg.region) setRegion(mg.region);
              if (Array.isArray(mg.customTags) && mg.customTags.length > 0) {
                setCustomTags(prev => prev.length > 1 ? prev : mg.customTags);
              }
              if (mg.rulesSummary) setRulesSummary(prev => prev.trim() ? prev : mg.rulesSummary);
              if (mg.memberCount) setMemberCount(prev => (prev && prev !== 250) ? prev : mg.memberCount);
              setManualModeActive(true);
            }
          } else {
            setDuplicateCheckResult(null);
          }
        }
      } catch (err) {
        console.warn('Duplicate check error:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [url, title, platform]);

  // Live Auto-Filter keyword analysis
  const autoFilterAnalysis = analyzeGroupContent({
    title,
    description,
    customTags,
    url,
    rulesSummary
  });

  // Automatically enforce adult classification if adult keywords are detected
  useEffect(() => {
    if (autoFilterAnalysis.isAdult) {
      setIsNsfw(true);
      setCategory('Adult / 18+');
    }
  }, [autoFilterAnalysis.isAdult]);

  // Live Rank Quality Calculation
  const liveRankScore = calculateRankScore(title, description, customTags, rulesSummary);
  const liveRankGrade = calculateRankGrade(liveRankScore);

  // Update detected platform when URL changes
  useEffect(() => {
    if (url) {
      const detected = detectPlatformFromUrl(url);
      setPlatform(detected);
      if (detected !== 'other') {
        const platformTag = `#${detected}`;
        setCustomTags(prev => prev.includes(platformTag) ? prev : [...prev, platformTag]);
      }
      if (detected === 'facebook' || detected === 'signal' || detected === 'snapchat' || detected === 'instagram') {
        setManualModeActive(true);
      }
    }
  }, [url]);

  const detectedPlat = platform !== 'other' ? platform : detectPlatformFromUrl(url);
  const isAutoFetchDisabledPlatform = Boolean(
    url.trim() && (
      detectedPlat === 'facebook' ||
      detectedPlat === 'signal' ||
      detectedPlat === 'snapchat' ||
      detectedPlat === 'instagram' ||
      /facebook\.com|fb\.me|fb\.com|signal\.group|signal\.me|snapchat\.com|instagram\.com|ig\.me/i.test(url)
    )
  );

  // Sync category with adult flag
  useEffect(() => {
    if (category === 'Adult / 18+') {
      setIsNsfw(true);
    }
  }, [category]);

  const handleScrape = async () => {
    if (!url.trim()) {
      setScrapeError('Please enter or paste your group invite link above to auto-fetch details.');
      return;
    }

    const now = Date.now();
    if (now - lastScrapeTimeRef.current < 2000) {
      setScrapeError('⏳ Please wait a moment before requesting another metadata scrape.');
      return;
    }
    lastScrapeTimeRef.current = now;

    if (isAutoFetchDisabledPlatform) {
      setScrapeError(`Auto-fetch is disabled for ${detectedPlat.toUpperCase()} links. Please enter community details manually below.`);
      setManualModeActive(true);
      return;
    }

    const validation = validateGroupUrl(url);
    if (!validation.isValid) {
      setScrapeError(validation.errorMessage || 'Invalid link format. Only supported platform links are allowed.');
      return;
    }

    setIsScraping(true);
    setScrapedSuccess(false);
    setScrapeError(null);

    try {
      const res = await fetch('/api/scrape-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data: ScrapeMetadataResponse = await res.json().catch(() => ({ success: false, error: 'Network error during scraping' } as any));

      // Handle 429 or upstream rate limits with immediate user-facing guidance
      if (res.status === 429 || (data?.error && (data.error.toLowerCase().includes('rate limit') || data.error.toLowerCase().includes('too many requests')))) {
        setScrapeError('⚠️ External rate limit reached for auto-fetching. Manual editing mode is now enabled below so you can enter community details directly without waiting.');
        setManualModeActive(true);
        const detected = platform !== 'other' ? platform : detectPlatformFromUrl(url);
        const platLabel = detected !== 'other' ? (detected.charAt(0).toUpperCase() + detected.slice(1)) : 'Community';
        if (!title.trim()) {
          setTitle(`${platLabel} Community Group`);
        }
        if (!description.trim()) {
          setDescription(`Join this active ${platLabel} community for discussions, updates, and messaging.`);
        }
        return;
      }

      if (!res.ok || !data.success || data.isExpired || (data.title && data.title.toLowerCase().includes('expired'))) {
        const errMsg = (data.title && data.title.toLowerCase().includes('expired')) || data.isExpired
          ? 'This invite link got expired add other active link'
          : (data.error || 'Unable to scrape metadata. You can enter details manually below.');
        setScrapeError(errMsg);
        setSubmitError(errMsg);
        setIsScraping(false);
        return;
      }

      // Populate scraped data with robust cleaning
      if (data.title && !isGenericGroupTitle(data.title)) {
        setTitle(cleanCommunityTitle(data.title, data.platform));
      } else if (data.title) {
        setTitle(cleanCommunityTitle(data.title, data.platform));
      }
      if (data.description && !isGenericGroupDescription(data.description)) {
        setDescription(data.description);
      }
      // Populate image if valid http/https URL (avoid dumping raw SVG data URIs into text input)
      if (data.imageUrl && (data.imageUrl.startsWith('http://') || data.imageUrl.startsWith('https://')) && !data.imageUrl.includes('unsplash.com')) {
        setImageUrl(data.imageUrl);
      } else if (data.imageUrl && data.imageUrl.startsWith('data:image/')) {
        // Keep data URI in background for preview, but don't pollute input field
        setImageUrl(data.imageUrl);
      }
      if (data.bannerUrl && (data.bannerUrl.startsWith('http://') || data.bannerUrl.startsWith('https://')) && !data.bannerUrl.includes('unsplash.com')) {
        setBannerUrl(data.bannerUrl);
      }
      if (data.platform) setPlatform(data.platform);
      if (data.suggestedCategory) {
        setCategory(data.suggestedCategory);
        if (data.suggestedCategory === 'Adult / 18+') setIsNsfw(true);
      }
      if (data.suggestedLanguage) setLanguage(data.suggestedLanguage);
      if (data.rankKeywords && data.rankKeywords.length > 0) {
        setRankKeywords(data.rankKeywords);
      }
      if (data.rulesSummary) {
        setRulesSummary(data.rulesSummary);
      }
      if (data.memberCount) setMemberCount(data.memberCount);
      if (data.telegramData) {
        setTelegramApiData(data.telegramData);
      }

      setScrapedSuccess(true);
    } catch (err: any) {
      console.warn('Scraping notice:', err);
      setScrapeError('Unable to auto-fetch metadata from upstream platform. Manual editing mode is enabled below.');
      setManualModeActive(true);
    } finally {
      setIsScraping(false);
    }
  };

  const handleQuickFillFacebook = () => {
    setManualModeActive(true);
    setPlatform('facebook');
    const match = url.match(/\/(?:groups|share\/g)\/([^/?#]+)/i);
    let guessedTitle = 'Facebook Community Group';
    if (match && match[1]) {
      const cleanSlug = decodeURIComponent(match[1]).trim();
      if (/^\d+$/.test(cleanSlug)) {
        guessedTitle = `Facebook Group ${cleanSlug}`;
      } else {
        guessedTitle = cleanSlug
          .replace(/[/\\_-]+/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
    if (!title || title.toLowerCase().includes('log in') || title.toLowerCase().includes('facebook')) {
      setTitle(guessedTitle);
    }
    if (!description) {
      setDescription('An active Facebook community connecting members to share daily updates, discussions, ideas, and regional networking.');
    }
    setCategory('Community & General');
    setCustomTags(prev => {
      const fbTags = ['#facebook', '#community', '#facebookgroup', '#networking'];
      return Array.from(new Set([...prev, ...fbTags]));
    });
  };

  const handleQuickFillSignal = () => {
    setManualModeActive(true);
    setPlatform('signal');
    if (!title) {
      setTitle('Signal Secure Community');
    }
    if (!description) {
      setDescription('An encrypted Signal group for safe discussions, privacy updates, tech knowledge sharing, and secure community collaboration.');
    }
    setCategory('Tech & Programming');
    setCustomTags(prev => {
      const sigTags = ['#signal', '#privacy', '#security', '#encrypted', '#community'];
      return Array.from(new Set([...prev, ...sigTags]));
    });
  };

  const handleQuickFillSnapchat = () => {
    setManualModeActive(true);
    setPlatform('snapchat');
    if (!title) {
      setTitle('Snapchat Friends & Stories Club');
    }
    if (!description) {
      setDescription('A vibrant Snapchat community to exchange daily snaps, streaks, friend stories, fun media, and lifestyle chat.');
    }
    setCategory('Social & Friends');
    setCustomTags(prev => {
      const snapTags = ['#snapchat', '#streaks', '#friends', '#stories', '#social'];
      return Array.from(new Set([...prev, ...snapTags]));
    });
  };

  const handleQuickFillInstagram = () => {
    setManualModeActive(true);
    setPlatform('instagram');
    if (!title) {
      setTitle('Instagram Broadcast & Group Club');
    }
    if (!description) {
      setDescription('An active Instagram broadcast channel and group for daily updates, exclusive media, reels, stories, and member chat.');
    }
    setCategory('Social & Friends');
    setCustomTags(prev => {
      const igTags = ['#instagram', '#broadcastchannel', '#reels', '#social', '#community'];
      return Array.from(new Set([...prev, ...igTags]));
    });
  };

  const handleQuickFillReddit = () => {
    setManualModeActive(true);
    setPlatform('reddit');
    let subName = '';
    const rMatch = url.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/i);
    if (rMatch && rMatch[1]) {
      subName = rMatch[1];
    }
    if (!title) {
      setTitle(subName ? `r/${subName} Community` : 'Reddit Community Hub');
    }
    if (!description) {
      setDescription(subName 
        ? `Join r/${subName} on Reddit to discover top discussions, trending content, community highlights, and member chats.`
        : 'An active Reddit community for discussions, shared resources, advice, and vibrant discussions.'
      );
    }
    if (!rulesSummary) {
      setRulesSummary(subName 
        ? `1. Be respectful to fellow members. 2. Keep submissions relevant to r/${subName}. 3. No spam, self-promotion, or unsolicited DMs. 4. Comply with Reddit Content Policy.`
        : '1. Be respectful to fellow members. 2. Stay on topic. 3. No spam, self-promotion, or unsolicited DMs. 4. Comply with Reddit Content Policy.'
      );
    }
    if (!imageUrl) {
      setImageUrl(getCommunityFallbackAvatar(subName ? `r/${subName}` : 'Reddit', 'reddit', subName || 'community'));
    }
    if (subName.toLowerCase().includes('cringe') || subName.toLowerCase().includes('meme') || subName.toLowerCase().includes('tiktok')) {
      setCategory('Humor & Memes');
    } else {
      setCategory('Entertainment & Movies');
    }
    setCustomTags(prev => {
      const redditTags = ['#reddit', '#subreddit', '#community', ...(subName ? [`#${subName.toLowerCase()}`] : [])];
      return Array.from(new Set([...prev, ...redditTags]));
    });
  };

  const handleImageFileUpload = async (file: File) => {
    setImageUploadError(null);
    try {
      const dataUrl = await processImageFile(file);
      setImageUrl(dataUrl);
      setBannerUrl(dataUrl);

      // Run zero-cost skin-tone analysis on uploaded image
      const skinCheck = await analyzeImageFileSkinTone(file);
      if (skinCheck.isAdult) {
        setIsNsfw(true);
        setCategory('Adult / 18+');
      }
    } catch (err: any) {
      setImageUploadError(err.message || 'Failed to process image file.');
    }
  };

  const handleBannerFileUpload = async (file: File) => {
    setImageUploadError(null);
    try {
      const dataUrl = await processImageFile(file);
      setBannerUrl(dataUrl);
    } catch (err: any) {
      setImageUploadError(err.message || 'Failed to process banner file.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagInput.trim()) return;

    const formatted = newTagInput.trim().startsWith('#') ? newTagInput.trim() : `#${newTagInput.trim()}`;
    if (!customTags.includes(formatted)) {
      setCustomTags([...customTags, formatted]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(t => t !== tagToRemove));
  };

  // Live Restricted / Zero-Tolerance keyword check
  const liveRestrictedCheck = checkGroupRestrictedContent({
    title,
    description,
    customTags,
    url,
    rulesSummary
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setSubmitError('Please enter your group or community invite URL.');
      return;
    }

    const now = Date.now();
    if (isSubmitting || (now - lastSubmitTimeRef.current < 2500)) {
      setSubmitError('⏳ Submission in progress or sent too rapidly. Please wait a moment.');
      return;
    }
    lastSubmitTimeRef.current = now;

    const cleanDesc = description.trim();
    const descWordCount = cleanDesc ? cleanDesc.split(/\s+/).filter(Boolean).length : 0;
    if (!cleanDesc || descWordCount < 1) {
      setSubmitError('Please fill in a description for your community so prospective members know what it is about (at least 1 word required).');
      return;
    }

    let finalTitle = title.trim();
    if (!finalTitle) {
      const detected = platform !== 'other' ? platform : detectPlatformFromUrl(url);
      const platLabel = detected !== 'other' ? (detected.charAt(0).toUpperCase() + detected.slice(1)) : 'Community';
      finalTitle = `${platLabel} Group (${category})`;
      setTitle(finalTitle);
    }

    // Zero-tolerance restricted keyword check
    const restrictedCheck = checkGroupRestrictedContent({
      title: finalTitle,
      description,
      customTags,
      url,
      rulesSummary
    });

    if (restrictedCheck.isRestricted) {
      setSubmitError(`🚫 Submission Blocked: Your group ${restrictedCheck.matchedField || 'content'} contains strictly prohibited term "${restrictedCheck.matchedKeyword}". Groups violating zero-tolerance safety policies cannot be added.`);
      return;
    }

    if (duplicateCheckResult?.isDuplicate && duplicateCheckResult.matchedGroup) {
      return handleUpdateExistingGroup(duplicateCheckResult.matchedGroup);
    }

    const validation = validateGroupUrl(url);
    if (!validation.isValid) {
      setSubmitError(validation.errorMessage || 'Invalid link format. Other links cannot be published.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUpdateSuccessMessage(null);

    const finalCategory = isNsfw ? 'Adult / 18+' : category;
    const token = getStoredSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const isSvg = (url: string) => url.startsWith('data:image/svg+xml');
    
    const payload = {
      title: finalTitle,
      description,
      url,
      platform,
      category: finalCategory,
      language,
      region,
      customTags,
      imageUrl: (imageUrl && !isSvg(imageUrl)) ? imageUrl : null,
      bannerUrl: (bannerUrl && !isSvg(bannerUrl)) ? bannerUrl : (imageUrl && !isSvg(imageUrl) ? imageUrl : null),
      memberCount,
      authorName: authorName.trim() || 'Anonymous Visitor',
      rulesSummary: rulesSummary || 'Be kind and respect community guidelines.',
      isNsfw: isNsfw || finalCategory === 'Adult / 18+',
      rankKeywords: rankKeywords.length > 0 ? rankKeywords : [`${platform} invite link`, finalTitle.toLowerCase(), finalCategory.toLowerCase()]
    };

    console.log('[SubmitGroupUI] Submitting community payload:', payload);

    try {
      let data: any = null;

      try {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers,
          cache: 'no-store',
          body: JSON.stringify(payload)
        });
        data = await res.json().catch(() => null);
        if (res.status === 429) {
          setSubmitError(`⏳ Rate Limit: ${data?.error || 'Submissions are being sent too quickly. Please wait a few seconds and try again.'}`);
          return;
        }
      } catch (fetchErr: any) {
        console.warn('[SubmitGroupUI] Fetch failed, executing Server Action submitGroupAction fallback...', fetchErr);
        data = await submitGroupAction(payload as any);
      }

      console.log('[SubmitGroupUI] Server response received:', data);

      if (!data || !data.success) {
        if (data?.isExpired || (data?.error && data.error.toLowerCase().includes('expired'))) {
          setSubmitError('This invite link got expired add other active link');
          setIsSubmitting(false);
          return;
        }
        if (data?.isDuplicate && data.matchedGroup) {
          console.warn('[SubmitGroupUI] Duplicate detected:', data.matchedGroup);
          setDuplicateCheckResult({
            isDuplicate: true,
            matchedGroup: data.matchedGroup,
            reason: data.error
          });
          setSubmitError(`This community is already listed as "${data.matchedGroup.title}". Click "Update Existing Group" to update its details.`);
          setIsSubmitting(false);
          return;
        }
        if (data?.diagnosticStep === 'SUBMISSION_THROTTLED' || data?.error?.toLowerCase().includes('rate limit') || data?.error?.toLowerCase().includes('rapidly')) {
          setSubmitError(`⏳ Rate Limit: ${data.error || 'Submissions sent too rapidly. Please wait a moment and try again.'}`);
          setIsSubmitting(false);
          return;
        }
        console.error('[SubmitGroupUI] Submission rejected by server:', data?.error || 'Unknown server rejection');
        throw new Error(data?.error || 'Failed to submit community. Please verify link format and try again.');
      }

      console.log('[SubmitGroupUI] Community successfully created & verified:', data.group);

      if (typeof window !== 'undefined') {
        const dest = data.group ? getGroupUrlPath(data.group) : '/';
        const sep = dest.includes('?') ? '&' : '?';
        window.location.href = `${dest}${sep}t=${Date.now()}`;
      }
    } catch (err: any) {
      console.error('[SubmitGroupUI Exception]:', err?.message, err);
      setSubmitError(err.message || 'Failed to publish group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateExistingGroup = async (matchedGroup: any) => {
    if (!matchedGroup || !matchedGroup.id) {
      setSubmitError('Unable to identify existing community to update.');
      return;
    }

    if (!title.trim()) {
      setSubmitError('Please provide a community title to update.');
      return;
    }

    // Zero-tolerance restricted keyword check
    const restrictedCheck = checkGroupRestrictedContent({
      title,
      description,
      customTags,
      url,
      rulesSummary
    });

    if (restrictedCheck.isRestricted) {
      setSubmitError(`🚫 Submission Blocked: Your group ${restrictedCheck.matchedField || 'content'} contains strictly prohibited term "${restrictedCheck.matchedKeyword}".`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUpdateSuccessMessage(null);

    try {
      const finalCategory = isNsfw ? 'Adult / 18+' : category;
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          existingGroupId: matchedGroup.id,
          updateExisting: true,
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          platform,
          category: finalCategory,
          language,
          region,
          customTags,
          imageUrl: imageUrl || matchedGroup.imageUrl || '',
          bannerUrl: bannerUrl || imageUrl || matchedGroup.bannerUrl || '',
          memberCount,
          authorName: authorName.trim() || 'Anonymous Visitor',
          rulesSummary: rulesSummary || 'Be kind and respect community guidelines.',
          isNsfw: isNsfw || finalCategory === 'Adult / 18+',
          rankKeywords: rankKeywords.length > 0 ? rankKeywords : [`${platform} invite link`, title.toLowerCase(), finalCategory.toLowerCase()]
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update existing community.');
      }

      const updatedGroup = data.group || matchedGroup;
      setUpdateSuccessMessage(`🎉 Community "${updatedGroup.title || title}" has been successfully updated!`);

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const targetPath = getGroupUrlPath(updatedGroup);
          window.location.href = targetPath.includes('?') ? `${targetPath}&updated=${Date.now()}` : `${targetPath}?updated=${Date.now()}`;
        }
      }, 600);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to update existing group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformConfig = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.other;
  const isFacebook = platform === 'facebook' || url.toLowerCase().includes('facebook.com');
  const isSignal = platform === 'signal' || url.toLowerCase().includes('signal.group') || url.toLowerCase().includes('signal.me');
  const isSnapchat = platform === 'snapchat' || url.toLowerCase().includes('snapchat.com');
  const isReddit = platform === 'reddit' || url.toLowerCase().includes('reddit.com') || url.toLowerCase().includes('redd.it');
  const isTelegram = platform === 'telegram' || url.toLowerCase().includes('t.me') || url.toLowerCase().includes('telegram.me');
  const isManualOnlyPlatform = isFacebook || isSignal || isSnapchat;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      <Header 
        activeTab="explore"
        setActiveTab={() => {
          if (typeof window !== 'undefined') window.location.href = '/';
        }}
        searchQuery=""
        setSearchQuery={() => {}}
        onOpenBookmarks={() => {}}
        bookmarkCount={0}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onNavigateHome={() => {
          if (typeof window !== 'undefined') window.location.href = '/';
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDashboard={() => setIsUserDashboardOpen(true)}
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col animate-in fade-in duration-200">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight">
                  Add Community Invite Link
                </h3>
                <p className="text-xs text-neutral-500">
                  {isManualOnlyPlatform 
                    ? 'Enter group information and custom community details below.' 
                    : 'Submit with auto-scrape or use manual details.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          
          {/* Step 1: URL Input with Auto-Scrape and Manual Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Group Invite URL <span className="text-red-500">*</span>
            </label>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://reddit.com/r/... or https://chat.whatsapp.com/... or t.me/... or facebook.com/groups/..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleScrape}
                  disabled={isScraping || isAutoFetchDisabledPlatform}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0 ${
                    isAutoFetchDisabledPlatform
                      ? 'bg-neutral-400 dark:bg-neutral-700 opacity-60 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 cursor-pointer shadow-indigo-600/25'
                  }`}
                  title={
                    isAutoFetchDisabledPlatform
                      ? `Auto-fetch is disabled for ${detectedPlat.toUpperCase()} links. Please enter community details manually below.`
                      : "Automatically fetch title, description, and group icon"
                  }
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Auto-Fetch</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setManualModeActive(true)}
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    manualModeActive
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manual Details</span>
                </button>
              </div>
            </div>

            {/* Quick Auto-Fetch Callout Prompt */}
            {url.trim() && !scrapedSuccess && !isAutoFetchDisabledPlatform && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Link detected! Click <strong>Auto-Fetch</strong> to pull title, description &amp; avatar automatically.</span>
                </div>
                <button
                  type="button"
                  onClick={handleScrape}
                  disabled={isScraping}
                  className="px-3 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Fetch Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Callout Notice when Auto-Fetch is disabled for Facebook, Signal, Snapchat, Instagram */}
            {url.trim() && isAutoFetchDisabledPlatform && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-950 dark:text-amber-200 font-medium">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Auto-fetch is disabled for <strong className="uppercase">{detectedPlat}</strong> links. Please enter community details manually below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setManualModeActive(true)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Enter Manually</span>
                </button>
              </div>
            )}

            {/* Duplicate Community Prevention Warning Banner with Update Action */}
            {duplicateCheckResult?.isDuplicate && duplicateCheckResult.matchedGroup && (() => {
              const isAdmin = typeof window !== 'undefined' ? isUserAdminLoggedIn() : false;
              const canUpdate = isAdmin || duplicateCheckResult.canUserUpdate !== false;
              const isLocked = duplicateCheckResult.isUpdateLocked || duplicateCheckResult.matchedGroup.isUpdateLocked;
              const blockedReason = duplicateCheckResult.updateBlockedReason || duplicateCheckResult.matchedGroup.updateBlockedReason;

              return (
                <div className={`p-4 rounded-2xl border-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-1 duration-200 ${
                  canUpdate
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500/80 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/70 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-start gap-3 min-w-0">
                    {canUpdate ? (
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                        <span className={canUpdate ? 'text-amber-950 dark:text-amber-100' : 'text-rose-950 dark:text-rose-100'}>
                          Community Already Listed
                        </span>
                        {canUpdate ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                            {isAdmin ? '👑 Admin Override' : 'Update Available'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            {isLocked ? 'Updates Disabled' : '1-Week Cooldown'}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${canUpdate ? 'text-amber-800/90 dark:text-amber-300/90' : 'text-rose-800/90 dark:text-rose-300/90'}`}>
                        {blockedReason || duplicateCheckResult.reason || `This group is already listed on GroupLinks as "${duplicateCheckResult.matchedGroup.title}".`}
                        {canUpdate && (
                          <span className="block font-semibold text-indigo-700 dark:text-indigo-300 mt-0.5">
                            You can update its details (title, description, category, tags, and icon) using the Update button below.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleUpdateExistingGroup(duplicateCheckResult.matchedGroup)}
                      disabled={isSubmitting || !canUpdate}
                      title={!canUpdate ? (blockedReason || 'Updates are limited to once per week') : undefined}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        canUpdate
                          ? 'text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50'
                          : 'text-neutral-400 bg-neutral-200 dark:bg-neutral-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : canUpdate ? (
                        <RefreshCw className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      <span>{canUpdate ? 'Update Group' : 'Updates Locked'}</span>
                    </button>

                    <a
                      href={getGroupUrlPath(duplicateCheckResult.matchedGroup as any)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 shadow-2xs transition-all whitespace-nowrap flex items-center gap-1"
                    >
                      <span>View Group</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* Update Success Banner */}
            {updateSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500/80 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-sm">{updateSuccessMessage}</span>
              </div>
            )}

            {/* Dedicated Telegram Channel / Group Live Sync Banner */}
            {isTelegram && (
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-xs space-y-2.5">
                <div className="flex items-center justify-between font-bold text-sky-900 dark:text-sky-200">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform="telegram" className="w-4 h-4 text-sky-500" />
                    <span>Telegram Live Channel Sync</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleScrape}
                    disabled={isScraping || !url.trim()}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    {isScraping ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Sync Telegram API</span>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
                  Directly inspects your channel via official Telegram API. Automatically retrieves authentic channel title, description, real-time subscriber count, and verified badge.
                </p>
                {telegramApiData && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-200/60 dark:border-sky-800/60 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 font-semibold font-mono">
                      @{telegramApiData.handle}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-semibold">
                      👥 {Number(telegramApiData.memberCount || memberCount).toLocaleString()} Subscribers
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold capitalize">
                      📢 {telegramApiData.type || 'Channel'}
                    </span>
                    {telegramApiData.isVerified && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Verified Account</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dedicated Reddit Community Banner */}
            {isReddit && (
              <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-orange-900 dark:text-orange-200">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform="reddit" className="w-4 h-4" />
                    <span>Reddit Community / Subreddit Link</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillReddit}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF4500] text-white hover:bg-orange-600 transition-colors shadow-2xs"
                  >
                    Quick-Fill Info
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-orange-800 dark:text-orange-300">
                  Click <strong>Auto-Fetch</strong> to automatically bypass bot challenges, retrieve authentic community icons, rules, and member stats, or upload a custom subreddit logo directly below.
                </p>
              </div>
            )}

            {/* Dedicated Facebook Manual Upload Banner */}
            {isFacebook && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform="facebook" className="w-4 h-4" />
                    <span>Facebook Group Manual Submission Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillFacebook}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-2xs"
                  >
                    Quick-Fill Info
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                  Facebook protects group pages behind login authentication. You can enter the title, description, and <strong>upload the group icon or cover photo directly from your phone or PC</strong> below without relying on third-party stock photos.
                </p>
              </div>
            )}

            {/* Dedicated Signal Manual Details Banner */}
            {isSignal && (
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-sky-900 dark:text-sky-200">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform="signal" className="w-4 h-4" />
                    <span>Signal Group Manual Submission Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillSignal}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-600 text-white hover:bg-sky-500 transition-colors shadow-2xs"
                  >
                    Quick-Fill Info
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
                  Signal group invite links are end-to-end encrypted and do not allow web scraping. Please fill in the community title, description, and category manually below.
                </p>
              </div>
            )}

            {/* Dedicated Snapchat Manual Details Banner */}
            {isSnapchat && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform="snapchat" className="w-4 h-4" />
                    <span>Snapchat Group Manual Submission Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillSnapchat}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-500 transition-colors shadow-2xs"
                  >
                    Quick-Fill Info
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Snapchat group invites are private in-app links and cannot be auto-scraped over the web. Please enter your group name, description, tags, and category manually below.
                </p>
              </div>
            )}

            {/* Dedicated Instagram Auto cum Manual Banner */}
            {platform === 'instagram' && (
              <div className="p-3.5 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-pink-900 dark:text-pink-200">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform="instagram" className="w-4 h-4" />
                    <span>Instagram Group (Auto cum Manual Mode)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillInstagram}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-pink-600 text-white hover:bg-pink-500 transition-colors shadow-2xs"
                  >
                    Quick-Fill Info
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-pink-800 dark:text-pink-300">
                  Instagram group and broadcast channel metadata is auto-detected. You can review and refine the group description below before publishing.
                </p>
              </div>
            )}

            {/* Allowed Valid Link Format Guide */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Supported Group Link Formats (Total 8):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <div>• <strong className="text-slate-800 dark:text-slate-200">1. WhatsApp Group:</strong> <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(Auto fetched)</span> <code className="text-xs font-mono ml-1">chat.whatsapp.com</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">2. Telegram Group / Channel:</strong> <span className="text-sky-600 dark:text-sky-400 font-semibold">(Auto Fetched)</span> <code className="text-xs font-mono ml-1">t.me/...</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">3. Discord Server:</strong> <span className="text-indigo-600 dark:text-indigo-400 font-semibold">(Auto Fetched)</span> <code className="text-xs font-mono ml-1">discord.gg/...</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">4. Reddit Communities:</strong> <span className="text-orange-600 dark:text-orange-400 font-semibold">(Auto Fetched)</span> <code className="text-xs font-mono ml-1">reddit.com/r/...</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">5. Signal Group:</strong> <span className="text-cyan-600 dark:text-cyan-400 font-semibold">(Manual Edit)</span> <code className="text-xs font-mono ml-1">signal.group/...</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">6. Facebook Group:</strong> <span className="text-blue-700 dark:text-blue-300 font-semibold">(Manual Edit)</span> <code className="text-xs font-mono ml-1">facebook.com/groups/...</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">7. Instagram Group:</strong> <span className="text-pink-600 dark:text-pink-400 font-semibold">(Auto cum Manual)</span> <code className="text-xs font-mono ml-1">instagram.com/j/...</code></div>
                <div>• <strong className="text-slate-800 dark:text-slate-200">8. Snapchat Group:</strong> <span className="text-amber-600 dark:text-amber-400 font-semibold">(Manual Edit)</span> <code className="text-xs font-mono ml-1">snapchat.com/t/...</code></div>
              </div>
            </div>

            {/* Platform indicator badge */}
            {url && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                  Detected Platform: 
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${platformConfig.badgeClass}`}>
                    <PlatformIcon platform={platform} className="w-3 h-3" />
                    {platformConfig.name}
                  </span>
                </span>
                {isScraping ? (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Syncing...
                  </span>
                ) : scrapedSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Metadata auto-filled!
                  </span>
                )}
              </div>
            )}

            {scrapeError && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scrapeError}</span>
              </div>
            )}
          </div>

          {/* Live Community Card Preview (Instant feedback after fetch) */}
          {(scrapedSuccess || title.trim() || imageUrl.trim()) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-purple-50/80 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-indigo-950/30 border-2 border-indigo-200/80 dark:border-indigo-800/60 shadow-lg space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    Live Community Card Preview
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Display</span>
                </div>
              </div>

              {/* Card Container */}
              <div className="bg-white dark:bg-neutral-800/95 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-md overflow-hidden transition-all">
                {/* Banner Header */}
                <div className="h-20 sm:h-24 w-full relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={resolveValidGroupImage(bannerUrl || imageUrl, category, title, true)}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getCategoryFallbackImage(category, true, title);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 dark:bg-neutral-900/90 text-neutral-800 dark:text-neutral-200 shadow-xs backdrop-blur-xs flex items-center gap-1 capitalize">
                      <PlatformIcon platform={platform} className="w-3 h-3" />
                      {platform}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/90 text-white shadow-xs backdrop-blur-xs">
                      {category}
                    </span>
                  </div>
                </div>

                {/* Content & Avatar */}
                <div className="px-4 pb-4 pt-1 relative">
                  <div className="flex items-start gap-3.5 -mt-8">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={resolveValidGroupImage(imageUrl, category, title, false)}
                        alt={title || 'Community avatar'}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-neutral-900 shadow-lg bg-white dark:bg-neutral-800"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getCategoryFallbackImage(category, false, title);
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                      </div>
                    </div>

                    {/* Title & Info */}
                    <div className="flex-1 min-w-0 pt-7">
                      <h4 className="font-extrabold text-base text-neutral-900 dark:text-white truncate leading-tight">
                        {title.trim() || 'Untitled Community'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {memberCount && memberCount > 0 && (
                          <span className="font-bold text-neutral-700 dark:text-neutral-300">
                            👥 {memberCount.toLocaleString()} {platform === 'telegram' ? 'Subscribers' : 'Members'}
                          </span>
                        )}
                        <span>•</span>
                        <span>🌐 {language}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description preview */}
                  <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                    {description.trim() || `Official ${platform} community. Join now to connect with active members.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Community Details and Direct Media Upload */}
          <div className="space-y-4 pt-2">
            
            {/* Title & Members Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Group Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. All India Community & Social Hub"
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Estimated Members
                </label>
                <input
                  type="number"
                  min="1"
                  value={memberCount ?? ''}
                  onChange={(e) => setMemberCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Description &amp; Topics <span className="text-red-500">*</span>
                </label>
                <div className="text-[11px] font-medium flex items-center gap-2">
                  {(() => {
                    const descTrim = description.trim();
                    const words = descTrim ? descTrim.split(/\s+/).filter(Boolean).length : 0;
                    const chars = description.length;
                    if (words < 1) {
                      return (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Required (min 1 word)</span>
                        </span>
                      );
                    }
                    return (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{words} {words === 1 ? 'word' : 'words'} ({chars} chars)</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What topics does this community discuss? Any specific focus, guidelines, or perks? (Minimum 1 word required)"
                className={`w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 ${
                  !description.trim() 
                    ? 'border-amber-300 dark:border-amber-700/80 focus:ring-amber-500/50' 
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-indigo-500/50'
                }`}
              />
            </div>

            {/* Image / Icon Section - Only Facebook gets the Direct Upload Icon / File feature */}
            {isFacebook ? (
              <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Facebook Group Icon / Cover Photo Upload</span>
                  </label>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                    Upload Required for FB
                  </span>
                </div>

                <div className="space-y-2">
                  {imageUrl ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-blue-200 dark:border-neutral-700">
                      <img
                        src={imageUrl}
                        alt="Group cover preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          Facebook Icon / Cover Uploaded
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready for submission
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setBannerUrl('');
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                        isDraggingImage
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                          : 'border-blue-300 dark:border-blue-700/80 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-neutral-900/60'
                      }`}
                    >
                      <UploadCloud className="w-7 h-7 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
                      <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Upload Facebook Group Icon or Cover Photo
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Click or drag & drop (PNG, JPG, WEBP • Max 2 MB)
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {imageUploadError && (
                  <div className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{imageUploadError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                  <span>Community Icon Image (URL or Upload)</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Max 2 MB • Auto-optimized to 150x150 WebP</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0 group">
                    <img
                      src={resolveValidGroupImage(imageUrl, category, title, false)}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-300 dark:border-neutral-700 bg-neutral-100 shadow-xs"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getCategoryFallbackImage(category, false, title);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-transform hover:scale-110 cursor-pointer"
                      title="Upload custom icon image (Max 2MB)"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageUrl(val);
                        const isManual = detectedPlat === 'signal' || detectedPlat === 'snapchat' || detectedPlat === 'facebook' || detectedPlat === 'instagram';
                        if (isManual || !bannerUrl) setBannerUrl(val);
                      }}
                      placeholder="https://... (auto-fetched or custom image URL)"
                      className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>Upload Custom Icon (+ button)</span>
                      </button>
                      {imageUploadError && (
                        <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">{imageUploadError}</span>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            )}

            {/* Auto-Filter Detected Alert Banner */}
            {autoFilterAnalysis.isAdult && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 shadow-2xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Keyword Auto-Filter Detected 18+ Content</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-200/80 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                      Auto-Isolated
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300/90">
                    Matched keyword(s): <span className="font-semibold">{autoFilterAnalysis.matchedKeywords.join(', ')}</span>. To protect public feeds, this community is automatically categorized as <strong>Adult / 18+</strong> and isolated from general discovery categories.
                  </p>
                </div>
              </div>
            )}

            {/* Categorization: Interest Category, Language, Region */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Interest Category {autoFilterAnalysis.isAdult && <span className="text-rose-500 font-normal">(Locked to 18+)</span>}
                </label>
                <select
                  value={category}
                  disabled={autoFilterAnalysis.isAdult}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {GENERAL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="dark:bg-neutral-800">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Primary Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang} className="dark:bg-neutral-800">{lang}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Region / Country
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  className="w-full px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                >
                  {REGIONS.map(reg => (
                    <option key={reg} value={reg} className="dark:bg-neutral-800">{reg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Community Tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Custom Tags (Add #keywords to help people discover)
              </label>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {customTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type tag (e.g. #india, #facebookgroup) and press Add"
                  className="flex-1 px-3.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="px-3 py-1.5 text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 rounded-xl transition-colors"
                >
                  Add Tag
                </button>
              </div>
            </div>

            {/* Author / Submitter Name (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Author / Submitter Name (Optional)</span>
                </label>
                <span className="text-[11px] text-neutral-400">Default: Anonymous Visitor</span>
              </div>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex Rivers (Leave empty for Anonymous Visitor)"
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Provide your name or alias for group attribution. If left empty, it will be credited to <strong>Anonymous Visitor</strong>.
              </p>
            </div>

            {/* Community Rules / Guidelines summary */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Community Rules / Guidelines (Optional)
              </label>
              <input
                type="text"
                value={rulesSummary}
                onChange={(e) => setRulesSummary(e.target.value)}
                placeholder="e.g. Respect everyone, no unsolicited promotional spam, English only"
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Rank Real-Time Scorecard */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Live Rank Index: {liveRankScore}/100
                  </div>
                  <div className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                    Higher quality titles, descriptions & tags elevate group placement in discovery rankings.
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-xs shrink-0">
                Grade: {liveRankGrade}
              </span>
            </div>

            {/* 18+ Adult Content Toggle */}
            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  This community contains mature or Adult (18+) content
                </span>
              </div>
              <input
                type="checkbox"
                checked={isNsfw}
                onChange={(e) => {
                  setIsNsfw(e.target.checked);
                  if (e.target.checked) setCategory('Adult / 18+');
                  else if (category === 'Adult / 18+') setCategory('Tech & Programming');
                }}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
            </div>
            {/* Live Zero-Tolerance Safety Warning if prohibited terms entered */}
            {liveRestrictedCheck.isRestricted && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-900 dark:text-rose-100">
                    Prohibited / Restricted Content Detected ("{liveRestrictedCheck.matchedKeyword}")
                  </div>
                  <div className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                    Titles, descriptions, or groups related to prohibited terms like "{liveRestrictedCheck.matchedKeyword}" violate strict zero-tolerance policies. Submission is blocked.
                  </div>
                </div>
              </div>
            )}
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 rounded-xl transition-colors"
            >
              Cancel
            </button>
            {duplicateCheckResult?.isDuplicate && duplicateCheckResult.matchedGroup ? (() => {
              const isAdmin = typeof window !== 'undefined' ? isUserAdminLoggedIn() : false;
              const canUpdate = isAdmin || duplicateCheckResult.canUserUpdate !== false;
              return (
                <button
                  type="button"
                  onClick={() => handleUpdateExistingGroup(duplicateCheckResult.matchedGroup)}
                  disabled={isSubmitting || !url.trim() || liveRestrictedCheck.isRestricted || !canUpdate}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white flex items-center gap-2 transition-all ${
                    canUpdate
                      ? 'bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 shadow-md shadow-indigo-600/20 hover:scale-105 cursor-pointer disabled:opacity-50'
                      : 'bg-neutral-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Community...</span>
                    </>
                  ) : canUpdate ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Update Existing Group</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Updates Locked (1/week)</span>
                    </>
                  )}
                </button>
              );
            })() : (
              <button
                type="submit"
                disabled={isSubmitting || !url.trim() || liveRestrictedCheck.isRestricted}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Publish Community</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
        </div>
      </main>
      <Footer />

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(u) => {
            setIsAuthModalOpen(false);
            setIsUserDashboardOpen(true);
          }}
        />
      )}

      {isUserDashboardOpen && currentUser && (
        <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-slate-950 animate-in slide-in-from-right duration-300">
          <UserDashboardView
            initialUser={currentUser}
            onNavigateHome={() => setIsUserDashboardOpen(false)}
            onLogout={() => {
              setIsUserDashboardOpen(false);
              if (setUser) setUser(null);
            }}
            onClose={() => setIsUserDashboardOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

