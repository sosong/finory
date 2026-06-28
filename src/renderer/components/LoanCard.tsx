import React, { useState } from 'react';
import { LoanEntry } from '../types';
import { calcInterest, calcTotalRepayment, formatMoney, formatDate } from '../utils';

interface Props {
  loan: LoanEntry;
  onRepay: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (loan: LoanEntry) => void;
  onUpdateDueDate: (id: string, dueDate: string) => void;
}

export default function LoanCard({ loan, onRepay, onDelete, onEdit, onUpdateDueDate }: Props) {
  const [editing, setEditing] = useState(false);
  const [newDueDate, setNewDueDate] = useState(loan.dueDate || '');
  const interest = calcInterest(loan);
  const total = calcTotalRepayment(loan);
  const today = new Date().toISOString().split('T')[0];
  const hasDueDate = !!loan.dueDate;
  const isOverdue = loan.status === 'active' && hasDueDate && loan.dueDate! < today;

  function handleSaveDueDate() {
    if (newDueDate >= loan.date) {
      onUpdateDueDate(loan.id, newDueDate);
      setEditing(false);
    }
  }

  return (
    <div className={`loan-card ${loan.status === 'repaid' ? 'repaid' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <div className="loan-card-header">
        <div className="loan-amount">¥{formatMoney(loan.amount)}</div>
        <span className={`status-badge ${loan.status}`}>
          {loan.status === 'active' ? (isOverdue ? '已逾期' : '计息中') : '已还款'}
        </span>
      </div>

      <div className="loan-details">
        <div className="detail-row">
          <span className="detail-label">借款日期</span>
          <span className="detail-value">{formatDate(loan.date)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">年利率</span>
          <span className="detail-value">{loan.annualRate}%</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">{hasDueDate ? '还款日期' : '计息截至'}</span>
          <span className="detail-value">
            {editing ? (
              <span className="inline-edit">
                <input
                  type="date"
                  value={newDueDate}
                  min={loan.date}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
                <button className="btn-icon" onClick={handleSaveDueDate} title="保存">✓</button>
                <button className="btn-icon" onClick={() => { setEditing(false); setNewDueDate(loan.dueDate || ''); }} title="取消">✕</button>
              </span>
            ) : (
              <span>
                {hasDueDate ? formatDate(loan.dueDate!) : `${formatDate(today)}（今天）`}
                {loan.status === 'active' && (
                  <button className="btn-icon btn-edit" onClick={() => setEditing(true)} title="修改还款日期">✎</button>
                )}
              </span>
            )}
          </span>
        </div>
        <div className="detail-row highlight">
          <span className="detail-label">应付利息</span>
          <span className="detail-value accent">¥{formatMoney(interest)}</span>
        </div>
        <div className="detail-row highlight">
          <span className="detail-label">总还款额</span>
          <span className="detail-value accent bold">¥{formatMoney(total)}</span>
        </div>
        {loan.status === 'repaid' && loan.repaidDate && (
          <div className="detail-row">
            <span className="detail-label">实际还款日</span>
            <span className="detail-value">{formatDate(loan.repaidDate)}</span>
          </div>
        )}
        {loan.status === 'repaid' && loan.repaidAmount != null && (
          <div className="detail-row">
            <span className="detail-label">实际还款额</span>
            <span className="detail-value bold">¥{formatMoney(loan.repaidAmount)}</span>
          </div>
        )}
      </div>

      <div className="loan-card-actions">
        {loan.status === 'active' && (
          <button className="btn-repay" onClick={() => onRepay(loan.id)}>
            标记还款
          </button>
        )}
        <button className="btn-secondary small" onClick={() => onEdit(loan)}>
          编辑
        </button>
        <button className="btn-delete" onClick={() => onDelete(loan.id)}>
          删除
        </button>
      </div>
    </div>
  );
}
