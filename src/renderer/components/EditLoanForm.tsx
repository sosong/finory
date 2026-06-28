import React, { useState } from 'react';
import { LoanEntry } from '../types';

interface Props {
  loan: LoanEntry;
  onSave: (loan: LoanEntry) => void;
  onCancel: () => void;
}

export default function EditLoanForm({ loan, onSave, onCancel }: Props) {
  const [borrower, setBorrower] = useState(loan.borrower);
  const [amount, setAmount] = useState(String(loan.amount));
  const [date, setDate] = useState(loan.date);
  const [annualRate, setAnnualRate] = useState(String(loan.annualRate));
  const [dueDate, setDueDate] = useState(loan.dueDate || '');
  const [repaidAmount, setRepaidAmount] = useState(
    loan.repaidAmount != null ? String(loan.repaidAmount) : ''
  );
  const [repaidDate, setRepaidDate] = useState(loan.repaidDate || '');

  const isRepaid = loan.status === 'repaid';

  const canSubmit =
    borrower.trim() !== '' &&
    Number(amount) > 0 &&
    Number(annualRate) >= 0 &&
    date !== '' &&
    (dueDate === '' || dueDate >= date);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      ...loan,
      borrower: borrower.trim(),
      amount: Number(amount),
      date,
      annualRate: Number(annualRate),
      dueDate: dueDate || undefined,
      ...(isRepaid
        ? {
            repaidAmount: repaidAmount ? Number(repaidAmount) : undefined,
            repaidDate: repaidDate || loan.repaidDate,
          }
        : {}),
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>编辑借款</h2>

        <label className="field-label">
          借款人姓名
          <input
            type="text"
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            placeholder="请输入借款人姓名"
            autoFocus
          />
        </label>

        <label className="field-label">
          借款金额 (元)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="请输入金额"
          />
        </label>

        <label className="field-label">
          借款日期
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="field-label">
          年利率 (%)
          <input
            type="number"
            min="0"
            step="0.01"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            placeholder="例如 5.0 表示 5%"
          />
        </label>

        <label className="field-label">
          预设还款日期（可选）
          <input
            type="date"
            value={dueDate}
            min={date}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>

        {dueDate && dueDate < date && (
          <p className="error-hint">还款日期不能早于借款日期</p>
        )}

        {isRepaid && (
          <>
            <label className="field-label">
              实际还款日
              <input
                type="date"
                value={repaidDate}
                onChange={(e) => setRepaidDate(e.target.value)}
              />
            </label>
            <label className="field-label">
              实际还款额 (元)
              <input
                type="number"
                min="0"
                step="0.01"
                value={repaidAmount}
                onChange={(e) => setRepaidAmount(e.target.value)}
                placeholder="请输入实际还款金额"
              />
            </label>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
