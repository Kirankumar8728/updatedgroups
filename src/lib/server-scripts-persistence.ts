import * as fs from 'fs';
import * as path from 'path';

export interface CustomScriptsServerConfig {
  googleAnalyticsId: string;
  googleVerificationCode: string;
  bingVerificationCode: string;
  customHeadCode: string;
  customBodyCode: string;
}

export const DEFAULT_SERVER_SCRIPTS: CustomScriptsServerConfig = {
  googleAnalyticsId: '',
  googleVerificationCode: '',
  bingVerificationCode: '',
  customHeadCode: '',
  customBodyCode: '',
};

export const DEFAULT_ADS_TXT_CONTENT = `# ads.txt - Group Links Directory
# Replace with your actual publisher IDs provided by Google AdSense or your Ad Network
# Format: <Field #1>, <Field #2>, <Field #3>, <Field #4>
google.com, pub-5329614490007911, DIRECT, f08c47fec0942fa0
`;

const globalForServerScripts = globalThis as unknown as {
  nexusCustomScripts: CustomScriptsServerConfig;
  nexusAdsTxtContent: string | null;
};

function getScriptsFilePath(): string {
  return path.join(process.cwd(), 'data', 'custom-scripts.json');
}

function getAdsTxtFilePath(): string {
  return path.join(process.cwd(), 'data', 'ads.txt');
}

function getRootBackupScripts(): Partial<CustomScriptsServerConfig> | null {
  try {
    const backupNames = ['Original 1500.json', 'original-1500.json', 'master-backup.json', 'backup.json'];
    for (const name of backupNames) {
      const fullPath = path.join(process.cwd(), name);
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.customScripts && typeof parsed.customScripts === 'object') {
          return parsed.customScripts;
        }
      }
    }
  } catch {}
  return null;
}

export function getCustomScriptsServer(): CustomScriptsServerConfig {
  try {
    const filePath = getScriptsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        globalForServerScripts.nexusCustomScripts = { ...DEFAULT_SERVER_SCRIPTS, ...parsed };
        return { ...globalForServerScripts.nexusCustomScripts };
      }
    } else {
      const rootBackupScripts = getRootBackupScripts();
      if (rootBackupScripts) {
        globalForServerScripts.nexusCustomScripts = { ...DEFAULT_SERVER_SCRIPTS, ...rootBackupScripts };
        try {
          const dataDir = path.join(process.cwd(), 'data');
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(globalForServerScripts.nexusCustomScripts, null, 2), 'utf-8');
        } catch {}
        return { ...globalForServerScripts.nexusCustomScripts };
      }
    }
  } catch (err) {
    console.warn('Error reading custom scripts config from disk:', err);
  }

  if (!globalForServerScripts.nexusCustomScripts) {
    globalForServerScripts.nexusCustomScripts = { ...DEFAULT_SERVER_SCRIPTS };
  }
  return { ...globalForServerScripts.nexusCustomScripts };
}

export function saveCustomScriptsServer(config: Partial<CustomScriptsServerConfig>): CustomScriptsServerConfig {
  const current = getCustomScriptsServer();
  const updated: CustomScriptsServerConfig = {
    googleAnalyticsId: typeof config.googleAnalyticsId === 'string' ? config.googleAnalyticsId.trim() : current.googleAnalyticsId,
    googleVerificationCode: typeof config.googleVerificationCode === 'string' ? config.googleVerificationCode.trim() : current.googleVerificationCode,
    bingVerificationCode: typeof config.bingVerificationCode === 'string' ? config.bingVerificationCode.trim() : current.bingVerificationCode,
    customHeadCode: typeof config.customHeadCode === 'string' ? config.customHeadCode : current.customHeadCode,
    customBodyCode: typeof config.customBodyCode === 'string' ? config.customBodyCode : current.customBodyCode,
  };

  globalForServerScripts.nexusCustomScripts = updated;

  // Persist to local disk if directory is writable
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const scriptsFilePath = getScriptsFilePath();
    fs.writeFileSync(scriptsFilePath, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write custom-scripts.json to disk:', err);
  }

  return updated;
}

export function getAdsTxtServer(): string {
  try {
    const filePath = getAdsTxtFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content && content.trim() && !content.includes('pub-0000000000000000')) {
        globalForServerScripts.nexusAdsTxtContent = content;
        return content;
      }
    }
  } catch (err) {
    console.warn('Could not read ads.txt file:', err);
  }

  globalForServerScripts.nexusAdsTxtContent = DEFAULT_ADS_TXT_CONTENT;
  try {
    saveAdsTxtServer(DEFAULT_ADS_TXT_CONTENT);
  } catch {}
  return DEFAULT_ADS_TXT_CONTENT;
}

export function saveAdsTxtServer(content: string): string {
  const normalized = typeof content === 'string' ? content : '';
  globalForServerScripts.nexusAdsTxtContent = normalized;

  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = getAdsTxtFilePath();
    fs.writeFileSync(filePath, normalized, 'utf-8');

    // Ensure no conflicting static public/ads.txt exists alongside app/ads.txt/route.ts
    const publicFilePath = path.join(process.cwd(), 'public', 'ads.txt');
    if (fs.existsSync(publicFilePath)) {
      try {
        fs.unlinkSync(publicFilePath);
      } catch {}
    }
  } catch (err) {
    console.warn('Failed to write ads.txt to disk:', err);
  }

  return normalized;
}

