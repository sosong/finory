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

export interface BorrowerSummary {
  borrower: string;
  totalPrincipal: number;
  totalInterest: number;
  totalAmount: number;
  activeCount: number;
  repaidCount: number;
  loans: LoanEntry[];
}

declare global {
  interface Window {
    finoryAPI: {
      getLoans: () => Promise<LoanEntry[]>;
      addLoan: (loan: LoanEntry) => Promise<LoanEntry[]>;
      updateLoan: (loan: LoanEntry) => Promise<LoanEntry[]>;
      deleteLoan: (id: string) => Promise<LoanEntry[]>;
      repayLoan: (id: string, repaidAmount: number) => Promise<LoanEntry[]>;
      repayBorrower: (borrower: string, repaidAmounts: Record<string, number>) => Promise<LoanEntry[]>;
      setBorrowerDueDate: (borrower: string, dueDate: string) => Promise<LoanEntry[]>;
    };
  }
}
