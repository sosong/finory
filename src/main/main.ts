import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { execFile } from 'child_process';

// ── Data persistence ────────────────────────────────────────────────
const DATA_FILE = path.join(app.getPath('userData'), 'finory-data.json');

const GITHUB_REPO = 'sosong/finory';

interface LoanEntry {
  id: string;
  borrower: string;
  amount: number;
  date: string;            // ISO date string, e.g. "2024-06-01"
  annualRate: number;       // percentage, e.g. 5.0 means 5%
  dueDate?: string;         // ISO date string, optional
  status: 'active' | 'repaid';
  repaidDate?: string;
  repaidAmount?: number;
}

interface AppData {
  loans: LoanEntry[];
}

function loadData(): AppData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as AppData;
    }
  } catch {
    // ignore corrupt file
  }
  return { loans: [] };
}

function saveData(data: AppData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Window ──────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ────────────────────────────────────────────────────
ipcMain.handle('get-loans', () => {
  return loadData().loans;
});

ipcMain.handle('add-loan', (_event, loan: LoanEntry) => {
  const data = loadData();
  data.loans.push(loan);
  saveData(data);
  return data.loans;
});

ipcMain.handle('update-loan', (_event, updated: LoanEntry) => {
  const data = loadData();
  const idx = data.loans.findIndex((l) => l.id === updated.id);
  if (idx !== -1) {
    data.loans[idx] = updated;
    saveData(data);
  }
  return data.loans;
});

ipcMain.handle('delete-loan', (_event, id: string) => {
  const data = loadData();
  data.loans = data.loans.filter((l) => l.id !== id);
  saveData(data);
  return data.loans;
});

ipcMain.handle('repay-loan', (_event, id: string, repaidAmount: number) => {
  const data = loadData();
  const loan = data.loans.find((l) => l.id === id);
  if (loan) {
    loan.status = 'repaid';
    loan.repaidDate = new Date().toISOString().split('T')[0];
    loan.repaidAmount = repaidAmount;
    saveData(data);
  }
  return data.loans;
});

ipcMain.handle('repay-borrower', (_event, borrower: string, repaidAmounts: Record<string, number>) => {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  data.loans.forEach((l) => {
    if (l.borrower === borrower && l.status === 'active') {
      l.status = 'repaid';
      l.repaidDate = today;
      l.repaidAmount = repaidAmounts[l.id] ?? 0;
    }
  });
  saveData(data);
  return data.loans;
});

ipcMain.handle('set-borrower-due-date', (_event, borrower: string, dueDate: string) => {
  const data = loadData();
  data.loans.forEach((l) => {
    if (l.borrower === borrower && l.status === 'active') {
      l.dueDate = dueDate;
    }
  });
  saveData(data);
  return data.loans;
});

ipcMain.handle(
  'export-data',
  async (_event, content: string, defaultFileName: string): Promise<{ ok: boolean; path?: string }> => {
    if (!mainWindow) return { ok: false };
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出借款数据',
      defaultPath: defaultFileName,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false };
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true, path: filePath };
  }
);

ipcMain.handle(
  'import-data',
  async (_event): Promise<{ ok: boolean; content?: string }> => {
    if (!mainWindow) return { ok: false };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '导入借款数据',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) return { ok: false };
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return { ok: true, content };
  }
);

ipcMain.handle('replace-loans', (_event, loans: LoanEntry[]) => {
  saveData({ loans });
  return loans;
});

// ── Auto update (check + download) ──────────────────────────────────
// 跟随重定向的 GET 请求；resolveBuffer 为 true 时收集响应体
function httpsGet(url: string): Promise<{ status: number; body: string; location?: string }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Finory-Updater' } }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          resolve({ status, body: '', location: res.headers.location });
          return;
        }
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status, body }));
      })
      .on('error', reject);
  });
}

async function fetchFollowingRedirects(url: string, maxHops = 5): Promise<{ status: number; body: string }> {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await httpsGet(current);
    if (res.location) {
      current = res.location;
      continue;
    }
    return { status: res.status, body: res.body };
  }
  throw new Error('too many redirects');
}

// 比较语义化版本，a > b 返回正数
function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

interface UpdateInfo {
  hasUpdate: boolean;
  version?: string;
  notes?: string;
  downloadUrl?: string;
  fileName?: string;
}

ipcMain.handle('check-update', async (): Promise<UpdateInfo> => {
  try {
    const { status, body } = await fetchFollowingRedirects(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
    );
    if (status !== 200) return { hasUpdate: false };
    const release = JSON.parse(body);
    const latest: string = release.tag_name ?? '';
    const dmgAsset = (release.assets ?? []).find((a: any) => a.name?.endsWith('.dmg'));
    if (!latest || !dmgAsset) return { hasUpdate: false };
    if (compareVersions(latest, app.getVersion()) <= 0) return { hasUpdate: false };
    return {
      hasUpdate: true,
      version: latest.replace(/^v/, ''),
      notes: release.body ?? '',
      downloadUrl: dmgAsset.browser_download_url,
      fileName: dmgAsset.name,
    };
  } catch {
    return { hasUpdate: false };
  }
});

// 下载 DMG 到临时目录并自动挂载弹出，下载进度通过 'update-progress' 推送
ipcMain.handle(
  'download-update',
  async (_event, downloadUrl: string, fileName: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const destPath = path.join(app.getPath('temp'), fileName);
      await downloadFile(downloadUrl, destPath);
      await new Promise<void>((resolve, reject) => {
        execFile('hdiutil', ['attach', destPath], (err) => (err ? reject(err) : resolve()));
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
);

function downloadFile(url: string, destPath: string, maxHops = 5): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = (current: string, hop: number) => {
      if (hop > maxHops) return reject(new Error('too many redirects'));
      https
        .get(current, { headers: { 'User-Agent': 'Finory-Updater' } }, (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume();
            request(res.headers.location, hop + 1);
            return;
          }
          if (status !== 200) {
            res.resume();
            return reject(new Error(`下载失败：HTTP ${status}`));
          }
          const total = Number(res.headers['content-length'] || 0);
          let received = 0;
          const file = fs.createWriteStream(destPath);
          res.on('data', (chunk) => {
            received += chunk.length;
            if (total > 0 && mainWindow) {
              mainWindow.webContents.send('update-progress', Math.round((received / total) * 100));
            }
          });
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
          file.on('error', reject);
        })
        .on('error', reject);
    };
    request(url, 0);
  });
}
