import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ── Data persistence ────────────────────────────────────────────────
const DATA_FILE = path.join(app.getPath('userData'), 'finory-data.json');

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
