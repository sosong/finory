import { LoanEntry, BorrowerSummary } from './types';

/**
 * 计算某条借款截至指定日期的应付利息（按年利率，日计息）
 */
export function calcInterest(loan: LoanEntry, asOfDate?: string): number {
  const start = new Date(loan.date);
  const end = asOfDate
    ? new Date(asOfDate)
    : loan.dueDate
      ? new Date(loan.dueDate)
      : new Date();
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  const days = diffMs / (1000 * 60 * 60 * 24);
  return loan.amount * (loan.annualRate / 100) * (days / 365);
}

/**
 * 计算某条借款截至还款日的总还款额
 */
export function calcTotalRepayment(loan: LoanEntry): number {
  return loan.amount + calcInterest(loan);
}

/**
 * 按借款人汇总
 */
export function groupByBorrower(loans: LoanEntry[]): BorrowerSummary[] {
  const map = new Map<string, LoanEntry[]>();
  for (const loan of loans) {
    const list = map.get(loan.borrower) || [];
    list.push(loan);
    map.set(loan.borrower, list);
  }
  const result: BorrowerSummary[] = [];
  for (const [borrower, borrowerLoans] of map) {
    const activeLoans = borrowerLoans.filter((l) => l.status === 'active');
    const repaidLoans = borrowerLoans.filter((l) => l.status === 'repaid');
    const totalPrincipal = activeLoans.reduce((s, l) => s + l.amount, 0);
    const totalInterest = activeLoans.reduce((s, l) => s + calcInterest(l), 0);
    result.push({
      borrower,
      totalPrincipal,
      totalInterest,
      totalAmount: totalPrincipal + totalInterest,
      activeCount: activeLoans.length,
      repaidCount: repaidLoans.length,
      loans: borrowerLoans,
    });
  }
  return result.sort((a, b) => a.borrower.localeCompare(b.borrower, 'zh-CN'));
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 格式化金额
 */
export function formatMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 格式化日期显示
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
