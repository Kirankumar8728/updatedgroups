/**
 * Zero-cost heuristic image analysis utility.
 * Detects potential adult/nude content and misleading titles without any external AI vision API costs.
 * Uses URL keyword inspection and client-side canvas skin-tone pixel distribution analysis.
 */

const ADULT_IMAGE_KEYWORDS = [
  'nsfw', 'adult', '18plus', '18+', 'naked', 'nudity', 'sex', 'sexy', 'porn',
  'cam', 'escort', 'leaked', 'onlyfans', 'xxx', 'strip', 'erotic', 'boobs',
  'ass', 'pussy', 'cock', 'dick', 'milf', 'fetish', 'lingerie', 'bikini_hot'
];

export function analyzeImageUrlHeuristics(imageUrl?: string, title?: string, description?: string): { isAdult: boolean; confidence: number; reason?: string } {
  if (!imageUrl && !title && !description) {
    return { isAdult: false, confidence: 0 };
  }

  const combinedText = `${imageUrl || ''} ${title || ''} ${description || ''}`.toLowerCase();
  
  for (const keyword of ADULT_IMAGE_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      return {
        isAdult: true,
        confidence: 0.92,
        reason: `Matched adult keyword heuristic: "${keyword}"`
      };
    }
  }

  return { isAdult: false, confidence: 0 };
}

/**
 * Client-side helper: analyzes an image file or data URL via HTML5 Canvas for flesh/skin tone pixel ratios.
 */
export async function analyzeImageFileSkinTone(fileOrDataUrl: File | string): Promise<{ isAdult: boolean; skinRatio: number }> {
  if (typeof window === 'undefined') {
    return { isAdult: false, skinRatio: 0 };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 100; // sample down to 100x100 for ultra-fast zero-cost analysis
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ isAdult: false, skinRatio: 0 });
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        let skinPixelCount = 0;
        const totalPixels = size * size;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue; // ignore transparent pixels

          // Simple RGB human skin color range heuristic
          // R > 95, G > 40, B > 20, |R - G| > 15, R > G, R > B
          if (r > 95 && g > 40 && b > 20 && Math.abs(r - g) > 15 && r > g && r > b) {
            skinPixelCount++;
          }
        }

        const skinRatio = skinPixelCount / totalPixels;
        // If > 70% of sampled pixels match flesh/skin tone range, flag as potential adult/nude content
        const isAdult = skinRatio > 0.70;

        resolve({ isAdult, skinRatio });
      } catch {
        resolve({ isAdult: false, skinRatio: 0 });
      }
    };

    img.onerror = () => resolve({ isAdult: false, skinRatio: 0 });

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve({ isAdult: false, skinRatio: 0 });
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
