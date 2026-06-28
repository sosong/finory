import { contextBridge, ipcRenderer } from 'electron';

export interface LoanEntry {
  id: string;
  borrower: string;
  amount: number;
  date: string;
  annualRate: number;
  dueDate?: string;
  status: 'active' | 'repaid';
  repaidDate?: string;
  repaidAmount?: number;
}

const api = {
  getLoans: (): Promise<LoanEntry[]> => ipcRenderer.invoke('get-loans'),
  addLoan: (loan: LoanEntry): Promise<LoanEntry[]> => ipcRenderer.invoke('add-loan', loan),
  updateLoan: (loan: LoanEntry): Promise<LoanEntry[]> => ipcRenderer.invoke('update-loan', loan),
  deleteLoan: (id: string): Promise<LoanEntry[]> => ipcRenderer.invoke('delete-loan', id),
  repayLoan: (id: string, repaidAmount: number): Promise<LoanEntry[]> => ipcRenderer.invoke('repay-loan', id, repaidAmount),
  repayBorrower: (borrower: string, repaidAmounts: Record<string, number>): Promise<LoanEntry[]> =>
    ipcRenderer.invoke('repay-borrower', borrower, repaidAmounts),
  setBorrowerDueDate: (borrower: string, dueDate: string): Promise<LoanEntry[]> =>
    ipcRenderer.invoke('set-borrower-due-date', borrower, dueDate),
  exportData: (content: string, defaultFileName: string): Promise<{ ok: boolean; path?: string }> =>
    ipcRenderer.invoke('export-data', content, defaultFileName),
  importData: (): Promise<{ ok: boolean; content?: string }> => ipcRenderer.invoke('import-data'),
  replaceLoans: (loans: LoanEntry[]): Promise<LoanEntry[]> => ipcRenderer.invoke('replace-loans', loans),
  checkUpdate: (): Promise<{
    hasUpdate: boolean;
    version?: string;
    notes?: string;
    downloadUrl?: string;
    fileName?: string;
  }> => ipcRenderer.invoke('check-update'),
  downloadUpdate: (downloadUrl: string, fileName: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('download-update', downloadUrl, fileName),
  onUpdateProgress: (cb: (percent: number) => void): (() => void) => {
    const listener = (_e: unknown, percent: number) => cb(percent);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
};

contextBridge.exposeInMainWorld('finoryAPI', api);
