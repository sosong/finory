import React, { useState } from 'react';
import { BorrowerSummary, LoanEntry } from '../types';
import { formatMoney } from '../utils';
import LoanCard from './LoanCard';

interface Props {
  summary: BorrowerSummary;
  onRepayLoan: (id: string) => void;
  onRepayBorrower: (borrower: string) => void;
  onDeleteLoan: (id: string) => void;
  onEditLoan: (loan: LoanEntry) => void;
  onUpdateDueDate: (id: string, dueDate: string) => void;
  onSetBorrowerDueDate: (borrower: string) => void;
}

export default function BorrowerGroup({
  summary,
  onRepayLoan,
  onRepayBorrower,
  onDeleteLoan,
  onEditLoan,
  onUpdateDueDate,
  onSetBorrowerDueDate,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const hasActiveLoans = summary.activeCount > 0;

  return (
    <div className="borrower-group">
      <div className="borrower-header" onClick={() => setExpanded(!expanded)}>
        <div className="borrower-name-row">
          <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▶</span>
          <h3 className="borrower-name">{summary.borrower}</h3>
          <span className="loan-count">
            {summary.activeCount} 笔在借
            {summary.repaidCount > 0 && ` · ${summary.repaidCount} 笔已还`}
          </span>
        </div>
        {hasActiveLoans && (
          <div className="borrower-summary-row">
            <span>本金 ¥{formatMoney(summary.totalPrincipal)}</span>
            <span className="separator">·</span>
            <span>利息 ¥{formatMoney(summary.totalInterest)}</span>
            <span className="separator">·</span>
            <span className="total-highlight">合计 ¥{formatMoney(summary.totalAmount)}</span>
          </div>
        )}
      </div>

      {expanded && (
        <>
          {hasActiveLoans && (
            <div className="borrower-actions">
              <button
                className="btn-secondary small"
                onClick={(e) => { e.stopPropagation(); onSetBorrowerDueDate(summary.borrower); }}
              >
                统一设置还款日
              </button>
              <button
                className="btn-repay small"
                onClick={(e) => { e.stopPropagation(); onRepayBorrower(summary.borrower); }}
              >
                全部标记还款
              </button>
            </div>
          )}
          <div className="loan-cards">
            {summary.loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onRepay={onRepayLoan}
                onDelete={onDeleteLoan}
                onEdit={onEditLoan}
                onUpdateDueDate={onUpdateDueDate}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
