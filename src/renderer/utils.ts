import { LoanEntry, BorrowerSummary } from './types';

/**
 * 计算某条借款截至指定日期的应付利息（按年复利）
 * 整年部分按复利计算，不满一年的剩余部分按单利计算
 * 整年按真实日历年对齐（按周年日累计，自动处理闰年），
 * 零头按"距上一个周年日的天数 / 当年实际天数"折算
 * 公式：本息 = 本金 × (1 + 年利率)^整年数 × (1 + 年利率 × 当年已过比例)
 */
export function calcInterest(loan: LoanEntry, asOfDate?: string): number {
  return calcInterestBreakdown(loan, asOfDate).interest;
}

export interface InterestBreakdown {
  principal: number;
  annualRate: number;
  startDate: string;
  endDate: string;
  fullYears: number;
  fraction: number;
  partialDays: number;
  yearDays: number;
  compoundedPrincipal: number;
  interest: number;
}

/**
 * 计算某条借款利息的详细分解，用于展示计算过程
 */
export function calcInterestBreakdown(loan: LoanEntry, asOfDate?: string): InterestBreakdown {
  const start = new Date(loan.date);
  const endObj = asOfDate
    ? new Date(asOfDate)
    : loan.dueDate
      ? new Date(loan.dueDate)
      : new Date();
  const rate = loan.annualRate / 100;
  const base: InterestBreakdown = {
    principal: loan.amount,
    annualRate: loan.annualRate,
    startDate: loan.date,
    endDate: endObj.toISOString().split('T')[0],
    fullYears: 0,
    fraction: 0,
    partialDays: 0,
    yearDays: 365,
    compoundedPrincipal: loan.amount,
    interest: 0,
  };
  if (endObj.getTime() <= start.getTime()) return base;

  let fullYears = 0;
  let anniversary = new Date(start);
  while (true) {
    const next = new Date(anniversary);
    next.setFullYear(next.getFullYear() + 1);
    if (next.getTime() <= endObj.getTime()) {
      anniversary = next;
      fullYears++;
    } else {
      break;
    }
  }
  const nextAnniversary = new Date(anniversary);
  nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
  const yearMs = nextAnniversary.getTime() - anniversary.getTime();
  const partialMs = endObj.getTime() - anniversary.getTime();
  const fraction = partialMs / yearMs;
  const compoundedPrincipal = loan.amount * Math.pow(1 + rate, fullYears);
  const totalAmount = compoundedPrincipal * (1 + rate * fraction);

  return {
    ...base,
    fullYears,
    fraction,
    partialDays: Math.round(partialMs / 86400000),
    yearDays: Math.round(yearMs / 86400000),
    compoundedPrincipal,
    interest: totalAmount - loan.amount,
  };
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
