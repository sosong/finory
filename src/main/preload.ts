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
};

contextBridge.exposeInMainWorld('finoryAPI', api);
