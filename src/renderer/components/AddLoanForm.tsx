import React, { useState } from 'react';
import { LoanEntry } from '../types';
import { generateId } from '../utils';

interface Props {
  onAdd: (loan: LoanEntry) => void;
  onCancel: () => void;
  existingBorrowers: string[];
}

export default function AddLoanForm({ onAdd, onCancel, existingBorrowers }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [annualRate, setAnnualRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredBorrowers = existingBorrowers.filter(
    (b) => b.includes(borrower) && borrower.length > 0
  );

  const canSubmit =
    borrower.trim() !== '' &&
    Number(amount) > 0 &&
    Number(annualRate) >= 0 &&
    date !== '' &&
    (dueDate === '' || dueDate >= date);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd({
      id: generateId(),
      borrower: borrower.trim(),
      amount: Number(amount),
      date,
      annualRate: Number(annualRate),
      ...(dueDate ? { dueDate } : {}),
      status: 'active',
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>新增借款</h2>

        <label className="field-label">
          借款人姓名
          <div className="autocomplete-wrapper">
            <input
              type="text"
              value={borrower}
              onChange={(e) => {
                setBorrower(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="请输入借款人姓名"
              autoFocus
            />
            {showSuggestions && filteredBorrowers.length > 0 && (
              <ul className="suggestions">
                {filteredBorrowers.map((b) => (
                  <li key={b} onMouseDown={() => { setBorrower(b); setShowSuggestions(false); }}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          {!dueDate && <span className="field-hint">不设置则按当天计算利息</span>}
        </label>

        {dueDate && dueDate < date && (
          <p className="error-hint">还款日期不能早于借款日期</p>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            确认添加
          </button>
        </div>
      </form>
    </div>
  );
}
