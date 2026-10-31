import { Category, Platform } from '@/src/types';
import { isAdultContentHidden } from '@/src/lib/content-settings';

export interface CategoryDefinition {
  name: Category;
  slug: string;
  shortTitle: string;
  description: string;
  synonyms: string[];
  regexPatterns: RegExp[];
}

// 25 Predefined Taxonomy Categories
export const TAXONOMY_CATEGORIES: CategoryDefinition[] = [
  {
    name: 'Crypto & Web3',
    slug: 'crypto-web3',
    shortTitle: 'Crypto & Web3',
    description: 'Cryptocurrency trading, Bitcoin, Ethereum, Solana, DeFi, Web3 alpha, NFT drops, and blockchain technology.',
    synonyms: [
      'crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol',
      'web3', 'defi', 'airdrop', 'airdrops', 'nft', 'nfts', 'altcoin', 'altcoins',
      'binance', 'bybit', 'coinbase', 'blockchain', 'dao', 'yield-farming', 'crypto-signals',
      'memecoin', 'pepe', 'shib', 'doge', 'trading-bot', 'crypto-news', 'proofium', 'proofiumx', 'infoct'
    ],
    regexPatterns: [
      /\b(crypto|cryptocurrency|bitcoin|btc|ethereum|eth|solana|sol|web3|defi|airdrop|nft|altcoin|binance|blockchain|dao|yield|memecoin|doge|shib|pepe|dex|cex|satosh|tokenomics|uniswap|metamask|smart contract|proofium|proofiumx)\b/i,
      /\b(crypto trading|btc signals|pump and dump|crypto calls|future trading|spot signals)\b/i,
    ],
  },
  {
    name: 'Entertainment & Movies',
    slug: 'entertainment-movies',
    shortTitle: 'Movies & TV',
    description: 'Cinema discussions, movie streaming alerts, Hollywood, Bollywood, anime streaming, Netflix, and web series.',
    synonyms: [
      'movies', 'movie', 'cinema', 'films', 'film', 'series', 'web-series', 'netflix',
      'hollywood', 'bollywood', 'ott', 'streaming', 'boxoffice', 'theatre', 'tv-shows',
      'prime-video', 'disney', 'hbo', 'kdrama', 'k-drama', 'cinematography'
    ],
    regexPatterns: [
      /\b(movies?|cinema|films?|series|netflix|hollywood|bollywood|ott|boxoffice|theatre|tv shows?|kdrama|k-drama|hbo|disney\+|prime video|trailers?|streaming link|movie reviews?|south movie|tamil movie|hindi movie)\b/i,
    ],
  },
  {
    name: 'Gaming & Esports',
    slug: 'gaming-esports',
    shortTitle: 'Gaming & Esports',
    description: 'Video games, competitive esports, tournaments, BGMI, PUBG, Free Fire, Minecraft, Roblox, Valorant, and Discord scrims.',
    synonyms: [
      'gaming', 'games', 'game', 'esports', 'e-sports', 'bgmi', 'pubg', 'freefire', 'free-fire',
      'minecraft', 'roblox', 'valorant', 'gta', 'gta-v', 'gta5', 'cod', 'call-of-duty',
      'fortnite', 'clash-of-clans', 'coc', 'steam', 'playstation', 'ps5', 'xbox', 'nintendo',
      'scrims', 'tournaments', 'gamer', 'gamers', 'apex-legends', 'league-of-legends', 'dota'
    ],
    regexPatterns: [
      /\b(gaming|games?|esports|e-sports|bgmi|pubg|freefire|free fire|minecraft|roblox|valorant|gta|gta v|call of duty|codm?|fortnite|clash of clans|steam|playstation|ps5|xbox|scrims|tournament|mod apk|pc games?|nintendo)\b/i,
    ],
  },
  {
    name: 'Business & Startups',
    slug: 'business-startups',
    shortTitle: 'Business & Startups',
    description: 'Entrepreneurship, startup founders, SaaS, digital marketing, ecommerce, dropshipping, jobs, and networking.',
    synonyms: [
      'business', 'startups', 'startup', 'entrepreneur', 'entrepreneurship', 'marketing',
      'digital-marketing', 'ecommerce', 'e-commerce', 'dropshipping', 'saas', 'sales',
      'agency', 'small-business', 'founders', 'jobs', 'careers', 'hiring', 'freelance',
      'remote-work', 'b2b', 'affiliate-marketing', 'growth-hacking'
    ],
    regexPatterns: [
      /\b(business|startups?|entrepreneurs?|marketing|digital marketing|ecommerce|e-commerce|dropshipping|saas|sales|agency|founders?|jobs?|careers?|hiring|freelanc|remote work|affiliate marketing|b2b|b2c|growth hacking|lead gen)\b/i,
    ],
  },
  {
    name: 'Finance & Investing',
    slug: 'finance-investing',
    shortTitle: 'Finance & Stocks',
    description: 'Stock market, personal finance, investing, forex trading, mutual funds, options, wealth creation, and financial news.',
    synonyms: [
      'finance', 'investing', 'investment', 'stocks', 'stock-market', 'share-market', 'forex',
      'fx', 'mutual-funds', 'nifty', 'banknifty', 'options-trading', 'intraday', 'wealth',
      'real-estate', 'banking', 'dividend', 'shares', 'equity', 'gold', 'personal-finance',
      'wallstreetbets', 'wsb', 'trading'
    ],
    regexPatterns: [
      /\b(finance|investing|investment|stocks?|stock market|share market|forex|wallstreetbets|wsb|trading|options trading|mutual funds?|nifty|banknifty|intraday|equity|dividend|wealth|real estate|banking|demat|zerodha|trading view|financial tips?)\b/i,
    ],
  },
  {
    name: 'Education & Study',
    slug: 'education-study',
    shortTitle: 'Education & Exams',
    description: 'Competitive exam prep, study materials, university students, UPSC, SSC, JEE, NEET, IELTS, and online courses.',
    synonyms: [
      'education', 'study', 'study-group', 'exam', 'exams', 'upsc', 'ssc', 'jee', 'neet',
      'gate', 'ielts', 'toefl', 'students', 'university', 'college', 'school', 'books',
      'notes', 'pdf', 'quiz', 'gk', 'current-affairs', 'syllabus', 'course', 'courses'
    ],
    regexPatterns: [
      /\b(education|study|studies|exams?|upsc|ssc|jee|neet|gate|ielts|toefl|students?|university|college|school|pdf notes|syllabus|quiz|gk|current affairs|cbse|ncert|textbooks?|tuition|academic)\b/i,
    ],
  },
  {
    name: 'Tech & Programming',
    slug: 'tech-programming',
    shortTitle: 'Tech & Coding',
    description: 'Software development, programming languages, Python, JavaScript, React, web development, DevOps, and cloud computing.',
    synonyms: [
      'tech', 'technology', 'programming', 'coding', 'code', 'developer', 'developers',
      'software', 'python', 'javascript', 'typescript', 'react', 'nextjs', 'node', 'nodejs',
      'web-development', 'linux', 'backend', 'frontend', 'cybersecurity', 'devops', 'github',
      'html', 'css', 'java', 'cpp', 'golang', 'rust', 'docker', 'kubernetes', 'aws'
    ],
    regexPatterns: [
      /\b(programming|coding|coder|developers?|software dev|python|javascript|typescript|reactjs?|nextjs|nodejs|web development|linux|backend|frontend|cybersecurity|devops|github|html5?|css3?|java\b|c\+\+|golang|rust lang|docker|kubernetes|aws cloud)\b/i,
    ],
  },
  {
    name: 'Science & AI',
    slug: 'science-ai',
    shortTitle: 'Science & AI',
    description: 'Artificial intelligence, machine learning, ChatGPT, generative AI, robotics, astronomy, physics, and science discoveries.',
    synonyms: [
      'science', 'ai', 'artificial-intelligence', 'chatgpt', 'openai', 'llm', 'machine-learning',
      'deep-learning', 'robotics', 'space', 'astronomy', 'physics', 'biology', 'chemistry',
      'mathematics', 'math', 'quantum', 'prompts', 'midjourney', 'generative-ai',
      'interesting', 'damnthatsinteresting', 'discoveries', 'facts', 'curiosities'
    ],
    regexPatterns: [
      /\b(artificial intelligence|machine learning|deep learning|chatgpt|openai|llms?|generative ai|midjourney|prompt engineering|robotics|astronomy|physics|biology|chemistry|quantum computing|nasa|isro|space science|damnthatsinteresting|interesting things|facts|discoveries)\b/i,
    ],
  },
  {
    name: 'Fitness & Wellness',
    slug: 'fitness-wellness',
    shortTitle: 'Fitness & Gym',
    description: 'Gym workouts, bodybuilding, yoga, weight loss, nutrition plans, mental wellness, and healthy lifestyle routines.',
    synonyms: [
      'fitness', 'gym', 'workout', 'bodybuilding', 'wellness', 'yoga', 'health-tips',
      'weight-loss', 'diet', 'nutrition', 'calisthenics', 'crossfit', 'exercise',
      'muscle', 'cardio', 'fitfam', 'meditation'
    ],
    regexPatterns: [
      /\b(fitness|gym|workout|bodybuilding|wellness|yoga|weight loss|diet plan|nutrition|calisthenics|crossfit|exercise|muscle building|cardio|meditation|health tips|dietician)\b/i,
    ],
  },
  {
    name: 'Music & Audio',
    slug: 'music-audio',
    shortTitle: 'Music & Audio',
    description: 'Music production, songs, playlists, DJ beats, hip-hop, EDM, instrumentalists, singers, and audio engineering.',
    synonyms: [
      'music', 'songs', 'song', 'audio', 'beats', 'beatmaker', 'dj', 'rap', 'hiphop',
      'hip-hop', 'edm', 'producers', 'spotify', 'guitar', 'piano', 'singers', 'vocals',
      'fl-studio', 'soundtracks', 'soundtrack'
    ],
    regexPatterns: [
      /\b(music|songs?|audio|beats?|dj|rap|hiphop|hip hop|edm|spotify playlist|guitar|piano|singers?|vocalist|fl studio|soundtracks?|musicians?|band)\b/i,
    ],
  },
  {
    name: 'Anime & Manga',
    slug: 'anime-manga',
    shortTitle: 'Anime & Manga',
    description: 'Anime discussions, Manga scans, Otaku fandom, cosplay, Naruto, One Piece, Jujutsu Kaisen, and Japanese animation.',
    synonyms: [
      'anime', 'manga', 'otaku', 'cosplay', 'weeb', 'naruto', 'one-piece', 'jujutsu-kaisen',
      'demon-slayer', 'dragon-ball', 'webtoon', 'manhwa', 'light-novel', 'shonen'
    ],
    regexPatterns: [
      /\b(anime|manga|otaku|cosplay|naruto|one piece|jujutsu kaisen|demon slayer|dragon ball|webtoons?|manhwa|light novels?|crunchyroll|shonen)\b/i,
    ],
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    shortTitle: 'Sports & Outdoors',
    description: 'Football, cricket, NBA basketball, Premier League, IPL, tennis, F1 racing, hiking, cycling, and outdoor adventures.',
    synonyms: [
      'sports', 'football', 'soccer', 'cricket', 'basketball', 'tennis', 'nba', 'ipl',
      'premier-league', 'f1', 'formula1', 'formula-1', 'hiking', 'cycling', 'outdoors',
      'badminton', 'running', 'marathon', 'athletics', 'live-score'
    ],
    regexPatterns: [
      /\b(sports?|football|soccer|cricket|basketball|tennis|nba|ipl|premier league|formula ?1|f1|hiking|cycling|badminton|marathon|athletics|live scores?|fifa|champions league)\b/i,
    ],
  },
  {
    name: 'Food & Cooking',
    slug: 'food-cooking',
    shortTitle: 'Food & Recipes',
    description: 'Delicious recipes, cooking tips, home baking, chef secrets, street food, restaurant reviews, and vegan cuisine.',
    synonyms: [
      'food', 'cooking', 'recipes', 'recipe', 'baking', 'chef', 'restaurants', 'restaurant',
      'vegan', 'vegetarian', 'desserts', 'culinary', 'kitchen', 'foodie', 'cocktails'
    ],
    regexPatterns: [
      /\b(food|cooking|recipes?|baking|chef|restaurants?|vegan|vegetarian|desserts?|culinary|kitchen|foodie|cocktails?|dishes|street food)\b/i,
    ],
  },
  {
    name: 'Travel & Adventure',
    slug: 'travel-adventure',
    shortTitle: 'Travel & Trips',
    description: 'World travel guides, backpacking, budget flights, hotel deals, digital nomad hubs, tourism, and scenic road trips.',
    synonyms: [
      'travel', 'adventure', 'trips', 'trip', 'tourism', 'tourist', 'vacation', 'backpacking',
      'flights', 'hotels', 'wanderlust', 'digital-nomad', 'road-trip', 'destinations'
    ],
    regexPatterns: [
      /\b(travel|adventure|trips?|tourism|vacation|backpacking|budget flights?|hotel deals?|digital nomad|road trip|destinations?|trekking|resort)\b/i,
    ],
  },
  {
    name: 'Fashion & Beauty',
    slug: 'fashion-beauty',
    shortTitle: 'Fashion & Style',
    description: 'Fashion trends, skincare routines, makeup tutorials, outfit inspiration, clothing brands, and beauty tips.',
    synonyms: [
      'fashion', 'beauty', 'makeup', 'skincare', 'outfits', 'style', 'models', 'clothing',
      'apparel', 'haircare', 'cosmetics', 'streetwear', 'accessories'
    ],
    regexPatterns: [
      /\b(fashion|beauty|makeup|skincare|outfits?|style|models?|clothing|apparel|haircare|cosmetics|streetwear|perfumes?|hairstyles?)\b/i,
    ],
  },
  {
    name: 'Photography & Video',
    slug: 'photography-video',
    shortTitle: 'Photography & Video',
    description: 'Camera gear, photography presets, Lightroom, video editing, cinematography, Photoshop, and visual arts.',
    synonyms: [
      'photography', 'photo', 'photos', 'video', 'videography', 'filmmaking', 'editing',
      'camera', 'photoshop', 'lightroom', 'premiere-pro', 'drone', 'cinematography'
    ],
    regexPatterns: [
      /\b(photography|photos?|videography|filmmaking|video editing|cameras?|photoshop|lightroom|premiere pro|cinematography|portrait photo|landscape photo|sony alpha|canon|nikon)\b/i,
    ],
  },
  {
    name: 'Art & Design',
    slug: 'art-design',
    shortTitle: 'Art & UI/UX',
    description: 'UI/UX design, graphic design, 3D modeling, Blender, digital illustrations, painting, drawing, and typography.',
    synonyms: [
      'art', 'design', 'ui-ux', 'ui', 'ux', 'graphic-design', 'illustration', 'illustrations',
      'drawing', 'painting', '3d', 'blender', 'figma', 'sketching', 'typography'
    ],
    regexPatterns: [
      /\b(art|design|ui\/ux|ui ux|graphic design|illustrations?|drawing|paintings?|3d modeling|blender 3d|figma|sketching|typography|artists?)\b/i,
    ],
  },
  {
    name: 'Humor & Memes',
    slug: 'humor-memes',
    shortTitle: 'Memes & Comedy',
    description: 'Viral memes, comedy clips, funny videos, sarcasm, dank memes, and entertainment banter.',
    synonyms: [
      'humor', 'memes', 'meme', 'funny', 'jokes', 'comedy', 'dank', 'dank-memes', 'fun',
      'lol', 'trolls', 'humour', 'standup', 'laughter'
    ],
    regexPatterns: [
      /\b(humou?r|memes?|funny|jokes?|comedy|dank memes?|fun|lol|roast|trolling|trolls?|standup|laughter|memers?)\b/i,
    ],
  },
  {
    name: 'Dating & Social',
    slug: 'dating-social',
    shortTitle: 'Dating & Social',
    description: 'Meeting new people, friendships, dating discussions, relationship advice, casual chats, and social lounges.',
    synonyms: [
      'dating', 'social', 'friends', 'friendship', 'singles', 'chat', 'chatting', 'meetup',
      'relationships', 'romance', 'matchmaking', 'connections'
    ],
    regexPatterns: [
      /\b(dating|social group|meet friends|friendship|singles?|chit chat|meetup|relationships?|romance|matchmaking|find friends|hangout)\b/i,
    ],
  },
  {
    name: 'Languages & Learning',
    slug: 'languages-learning',
    shortTitle: 'Languages & Vocab',
    description: 'English practice, Spanish, French, German, Japanese, Korean, vocabulary building, and language exchange.',
    synonyms: [
      'languages', 'language', 'english-learning', 'spoken-english', 'spanish', 'french',
      'german', 'japanese', 'korean', 'chinese', 'vocab', 'vocabulary', 'polyglot',
      'language-exchange'
    ],
    regexPatterns: [
      /\b(languages?|spoken english|learn english|learn spanish|learn french|learn german|learn japanese|learn korean|vocabulary|polyglot|language exchange|grammar)\b/i,
    ],
  },
  {
    name: 'Pets & Animals',
    slug: 'pets-animals',
    shortTitle: 'Pets & Animals',
    description: 'Dogs, cats, puppy care, veterinary advice, aquarium fish, bird watchers, and animal rescue communities.',
    synonyms: [
      'pets', 'pet', 'dogs', 'dog', 'cats', 'cat', 'animals', 'animal', 'puppies', 'puppy',
      'kittens', 'aquarium', 'birds', 'veterinary', 'wildlife', 'kennel', 'kennels'
    ],
    regexPatterns: [
      /\b(pets?|dogs?|cats?|animals?|pupp(y|ies)|kittens?|aquarium fish|birds?|veterinary|animal rescue|wildlife|kennels?)\b/i,
    ],
  },
  {
    name: 'Health & Medical',
    slug: 'health-medical',
    shortTitle: 'Health & Medical',
    description: 'Medical discussions, healthcare professionals, doctor advice, mental health support, and wellness science.',
    synonyms: [
      'health', 'medical', 'medicine', 'doctors', 'doctor', 'healthcare', 'mental-health',
      'nursing', 'pharma', 'therapy', 'counseling', 'wellness-science'
    ],
    regexPatterns: [
      /\b(medical|doctors?|medicine|healthcare|mental health|nursing|pharmacy|pharma|therapy|counseling|psychology|clinical|hospital)\b/i,
    ],
  },
  {
    name: 'Hobbies & Crafts',
    slug: 'hobbies-crafts',
    shortTitle: 'Hobbies & Crafts',
    description: 'DIY projects, woodworking, knitting, embroidery, gardening, home improvement, and creative collecting.',
    synonyms: [
      'hobbies', 'hobby', 'crafts', 'craft', 'diy', 'woodworking', 'knitting', 'crochet',
      'gardening', 'plants', 'collecting', 'coins', 'stamps', 'handmade'
    ],
    regexPatterns: [
      /\b(hobb(y|ies)|crafts?|diy|woodworking|knitting|crochet|gardening|indoor plants|home improvement|collecting|handmade|origami)\b/i,
    ],
  },
  {
    name: 'Local & Regional',
    slug: 'local-regional',
    shortTitle: 'Local & City',
    description: 'City groups, local neighborhood alerts, regional meetups, country communities, and local buy/sell chats.',
    synonyms: [
      'local', 'regional', 'city', 'neighborhood', 'community-hub', 'india', 'usa', 'uk',
      'canada', 'delhi', 'mumbai', 'london', 'bangalore', 'new-york'
    ],
    regexPatterns: [
      /\b(local community|city group|neighborhood|regional group|meetup local|delhi group|mumbai group|london group|bangalore group)\b/i,
    ],
  },
  {
    name: 'Adult / 18+',
    slug: 'adult-18',
    shortTitle: 'Adult / 18+',
    description: 'Mature discussion groups, 18+ content channels, adult dating, and age-restricted social spaces.',
    synonyms: [
      'adult', '18plus', '18-plus', 'nsfw', 'mature', 'onlyfans', 'xxx', 'erotic', 'sensual'
    ],
    regexPatterns: [
      /\b(adult|18\+|18plus|18 plus|nsfw|mature content|onlyfans|xxx|erotic)\b/i,
    ],
  },
];

// Map lookup tables
export const CATEGORY_BY_SLUG = new Map<string, CategoryDefinition>();
export const CATEGORY_BY_NAME = new Map<string, CategoryDefinition>();
export const SYNONYM_TO_SLUG = new Map<string, string>();

TAXONOMY_CATEGORIES.forEach(cat => {
  CATEGORY_BY_SLUG.set(cat.slug, cat);
  CATEGORY_BY_NAME.set(cat.name.toLowerCase(), cat);
  SYNONYM_TO_SLUG.set(cat.slug, cat.slug);

  cat.synonyms.forEach(syn => {
    const cleanSyn = syn.toLowerCase().trim();
    SYNONYM_TO_SLUG.set(cleanSyn, cat.slug);
  });
});

/**
 * Normalizes any category slug or synonym keyword to its canonical category slug.
 * Example: 'bitcoin' -> 'crypto-web3', 'cinema' -> 'entertainment-movies', 'jobs' -> 'business-startups'
 */
export function normalizeCategorySlug(rawSlug: string): {
  canonicalSlug: string;
  categoryDef: CategoryDefinition | null;
  isSynonymRedirect: boolean;
} {
  if (!rawSlug) {
    return { canonicalSlug: '', categoryDef: null, isSynonymRedirect: false };
  }

  const clean = rawSlug.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '-');
  
  // If adult content is hidden, intercept adult-18 and adult synonyms and redirect to tech-programming
  if (isAdultContentHidden()) {
    if (clean === 'adult-18' || SYNONYM_TO_SLUG.get(clean) === 'adult-18' || clean.includes('adult') || clean.includes('18plus') || clean.includes('nsfw')) {
      const techDef = CATEGORY_BY_SLUG.get('tech-programming');
      if (techDef) {
        return {
          canonicalSlug: 'tech-programming',
          categoryDef: techDef,
          isSynonymRedirect: true,
        };
      }
    }
  }

  // Exact match on canonical slug
  if (CATEGORY_BY_SLUG.has(clean)) {
    return {
      canonicalSlug: clean,
      categoryDef: CATEGORY_BY_SLUG.get(clean) || null,
      isSynonymRedirect: false,
    };
  }

  // Check synonym dictionary
  if (SYNONYM_TO_SLUG.has(clean)) {
    const canonicalSlug = SYNONYM_TO_SLUG.get(clean)!;
    const categoryDef = CATEGORY_BY_SLUG.get(canonicalSlug) || null;
    return {
      canonicalSlug,
      categoryDef,
      isSynonymRedirect: canonicalSlug !== clean,
    };
  }

  // Fallback: search partial match in taxonomy names
  for (const cat of TAXONOMY_CATEGORIES) {
    if (clean.includes(cat.slug) || cat.slug.includes(clean)) {
      return {
        canonicalSlug: cat.slug,
        categoryDef: cat,
        isSynonymRedirect: true,
      };
    }
  }

  return { canonicalSlug: clean, categoryDef: null, isSynonymRedirect: false };
}

/**
 * Resolves a category from raw slug, handling synonym aliases.
 */
export function resolveCategoryFromSlug(slug: string): { category: CategoryDefinition; isSynonym: boolean } | null {
  const result = normalizeCategorySlug(slug);
  if (!result.categoryDef) return null;
  return {
    category: result.categoryDef,
    isSynonym: result.isSynonymRedirect,
  };
}

/**
 * Returns taxonomy categories, filtering out adult category if isAdultContentHidden is true.
 */
export function getVisibleTaxonomyCategories(): CategoryDefinition[] {
  if (isAdultContentHidden()) {
    return TAXONOMY_CATEGORIES.filter(c => c.slug !== 'adult-18');
  }
  return TAXONOMY_CATEGORIES;
}

/**
 * Standard platform normalization for Explore URLs.
 */
export const PLATFORM_SLUGS: Record<string, Platform> = {
  'whatsapp': 'whatsapp',
  'whatsapp-groups': 'whatsapp',
  'telegram': 'telegram',
  'telegram-channels': 'telegram',
  'telegram-groups': 'telegram',
  'discord': 'discord',
  'discord-servers': 'discord',
  'discord-groups': 'discord',
  'reddit': 'reddit',
  'reddit-communities': 'reddit',
  'reddit-groups': 'reddit',
  'signal': 'signal',
  'signal-groups': 'signal',
  'facebook': 'facebook',
  'facebook-groups': 'facebook',
  'snapchat': 'snapchat',
  'snapchat-groups': 'snapchat',
  'instagram': 'instagram',
  'instagram-groups': 'instagram',
};

export const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  discord: 'Discord',
  reddit: 'Reddit',
  signal: 'Signal',
  facebook: 'Facebook',
  snapchat: 'Snapchat',
  instagram: 'Instagram',
  other: 'Community',
};

export const PLATFORM_CANONICAL_HUBS: Record<Platform, string> = {
  whatsapp: '/whatsapp-groups',
  telegram: '/telegram-channels',
  discord: '/discord-servers',
  reddit: '/reddit-communities',
  signal: '/signal-groups',
  facebook: '/facebook-groups',
  snapchat: '/snapchat-groups',
  instagram: '/instagram-groups',
  other: '/',
};

/**
 * Parses an `/explore/:slug` parameter (e.g. `telegram-crypto-web3` or `whatsapp-bitcoin`).
 * Resolves platform, category, synonym redirection, and secondary keywords.
 */
export function parseExploreSlug(slug: string): {
  isValid: boolean;
  platform: Platform | null;
  platformPrefix: string;
  categoryDef: CategoryDefinition | null;
  canonicalExploreSlug: string;
  canonicalCategorySlug: string;
  isSynonymRedirect: boolean;
  secondaryTag: string | null;
} {
  if (!slug) {
    return {
      isValid: false,
      platform: null,
      platformPrefix: '',
      categoryDef: null,
      canonicalExploreSlug: '',
      canonicalCategorySlug: '',
      isSynonymRedirect: false,
      secondaryTag: null,
    };
  }

  const raw = slug.trim().toLowerCase();
  
  // Identify platform prefix (e.g. telegram-, whatsapp-, discord-, reddit-, signal-, facebook-, snapchat-, instagram-)
  const platforms: { prefix: string; platform: Platform }[] = [
    { prefix: 'telegram', platform: 'telegram' },
    { prefix: 'whatsapp', platform: 'whatsapp' },
    { prefix: 'discord', platform: 'discord' },
    { prefix: 'reddit', platform: 'reddit' },
    { prefix: 'signal', platform: 'signal' },
    { prefix: 'facebook', platform: 'facebook' },
    { prefix: 'snapchat', platform: 'snapchat' },
    { prefix: 'instagram', platform: 'instagram' },
  ];

  let matchedPlatform: Platform | null = null;
  let matchedPrefix = '';
  let remainder = raw;

  for (const p of platforms) {
    if (raw.startsWith(`${p.prefix}-`)) {
      matchedPlatform = p.platform;
      matchedPrefix = p.prefix;
      remainder = raw.slice(p.prefix.length + 1);
      break;
    }
  }

  if (!matchedPlatform || !remainder) {
    return {
      isValid: false,
      platform: null,
      platformPrefix: '',
      categoryDef: null,
      canonicalExploreSlug: '',
      canonicalCategorySlug: '',
      isSynonymRedirect: false,
      secondaryTag: null,
    };
  }

  const { canonicalSlug, categoryDef, isSynonymRedirect } = normalizeCategorySlug(remainder);

  if (!categoryDef) {
    return {
      isValid: false,
      platform: matchedPlatform,
      platformPrefix: matchedPrefix,
      categoryDef: null,
      canonicalExploreSlug: '',
      canonicalCategorySlug: canonicalSlug,
      isSynonymRedirect: false,
      secondaryTag: remainder,
    };
  }

  const canonicalExploreSlug = `${matchedPrefix}-${categoryDef.slug}`;
  const isRedirectNeeded = isSynonymRedirect || raw !== canonicalExploreSlug;

  return {
    isValid: true,
    platform: matchedPlatform,
    platformPrefix: matchedPrefix,
    categoryDef,
    canonicalExploreSlug,
    canonicalCategorySlug: categoryDef.slug,
    isSynonymRedirect: isRedirectNeeded,
    secondaryTag: isRedirectNeeded ? `#${remainder}` : null,
  };
}

/**
 * Automated Category Classifier
 * Analyzes title, description, custom tags, and link URL to assign the most accurate category
 * among the 25 predefined categories. Avoids default fallback to 'Tech & Programming'.
 */
export function classifyGroupCategory(
  title: string = '',
  description: string = '',
  customTags: string[] = [],
  url: string = '',
  explicitCategory?: string
): Category {
  // If explicitly specified and matches a valid category name (and not a lazy default)
  if (explicitCategory && CATEGORY_BY_NAME.has(explicitCategory.toLowerCase())) {
    const found = CATEGORY_BY_NAME.get(explicitCategory.toLowerCase())!;
    // If it was explicitly chosen as something specific, keep it
    if (explicitCategory !== 'Tech & Programming') {
      return found.name;
    }
  }

  const safeTitle = (title || '').toString();
  const safeDesc = (description || '').toString();
  const safeUrl = (url || '').toString();

  const combinedText = [
    safeTitle,
    safeDesc,
    Array.isArray(customTags) ? customTags.join(' ') : '',
    safeUrl
  ].join(' ').toLowerCase();

  // Check Adult / 18+ first for safety
  const adultDef = CATEGORY_BY_SLUG.get('adult-18');
  if (adultDef) {
    for (const pattern of adultDef.regexPatterns) {
      if (pattern.test(combinedText)) {
        return adultDef.name;
      }
    }
  }

  // Score all categories based on regex matches and keyword occurrences
  const scores = new Map<string, number>();

  for (const cat of TAXONOMY_CATEGORIES) {
    if (cat.slug === 'adult-18') continue;
    let score = 0;

    // Regex pattern matching (weight = 5)
    for (const pattern of cat.regexPatterns) {
      const matches = combinedText.match(new RegExp(pattern, 'gi'));
      if (matches) {
        score += matches.length * 5;
      }
    }

    // Synonym keyword matching in title (weight = 4) and body (weight = 2)
    const lowerTitle = safeTitle.toLowerCase();
    for (const syn of cat.synonyms) {
      const synWord = syn.replace(/-/g, ' ');
      if (lowerTitle.includes(synWord)) {
        score += 4;
      }
      if (combinedText.includes(synWord)) {
        score += 2;
      }
    }

    // Tag matching (weight = 3)
    if (Array.isArray(customTags)) {
      for (const t of customTags) {
        const cleanT = t.replace(/^#+/, '').toLowerCase();
        if (cat.synonyms.includes(cleanT) || cleanT === cat.slug) {
          score += 3;
        }
      }
    }

    scores.set(cat.slug, score);
  }

  // Find category with the highest score
  let maxScore = 0;
  let bestCategorySlug = 'Dating & Social'; // Safe, broad community default rather than tech

  scores.forEach((score, slug) => {
    if (score > maxScore) {
      maxScore = score;
      bestCategorySlug = slug;
    }
  });

  if (maxScore > 0 && CATEGORY_BY_SLUG.has(bestCategorySlug)) {
    return CATEGORY_BY_SLUG.get(bestCategorySlug)!.name;
  }

  // If explicitCategory is provided (even Tech), respect it when score is 0
  if (explicitCategory && CATEGORY_BY_NAME.has(explicitCategory.toLowerCase())) {
    return CATEGORY_BY_NAME.get(explicitCategory.toLowerCase())!.name;
  }

  // Default fallback if completely ambiguous
  return 'Dating & Social';
}
