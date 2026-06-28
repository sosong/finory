import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoanEntry } from '../types';
import { calcInterest, calcInterestBreakdown, calcTotalRepayment, formatMoney, formatDate } from '../utils';

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
  const [tooltip, setTooltip] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  const TOOLTIP_WIDTH = 270;
  const TOOLTIP_HEIGHT = 240;

  function showTooltip() {
    const el = iconRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = rect.top < TOOLTIP_HEIGHT + 16;
    // 水平：以图标为基准左对齐，但不超出视口
    let left = rect.left - 10;
    const maxLeft = window.innerWidth - TOOLTIP_WIDTH - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);
    const top = below ? rect.bottom + 8 : rect.top - 8;
    setTooltip({ top, left, below });
  }

  function hideTooltip() {
    setTooltip(null);
  }
  const interest = calcInterest(loan);
  const breakdown = calcInterestBreakdown(loan);
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
          <span className="detail-label">
            应付利息
            <span
              className="info-tooltip"
              tabIndex={0}
              ref={iconRef}
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
              onFocus={showTooltip}
              onBlur={hideTooltip}
            >
              <span className="info-icon">?</span>
            </span>
            {tooltip &&
              createPortal(
                <div
                  className={`tooltip-content ${tooltip.below ? 'below' : ''}`}
                  style={{ top: tooltip.top, left: tooltip.left }}
                >
                  <div className="tooltip-title">利息计算明细</div>
                  <div className="tooltip-line">
                    <span>计息区间</span>
                    <span>{formatDate(breakdown.startDate)} → {formatDate(breakdown.endDate)}</span>
                  </div>
                  <div className="tooltip-line">
                    <span>本金</span>
                    <span>¥{formatMoney(breakdown.principal)}</span>
                  </div>
                  <div className="tooltip-line">
                    <span>年利率</span>
                    <span>{breakdown.annualRate}%（按年复利）</span>
                  </div>
                  <div className="tooltip-line">
                    <span>整年数</span>
                    <span>{breakdown.fullYears} 年</span>
                  </div>
                  <div className="tooltip-line">
                    <span>整年复利后本金</span>
                    <span>¥{formatMoney(breakdown.compoundedPrincipal)}</span>
                  </div>
                  <div className="tooltip-line">
                    <span>不足整年</span>
                    <span>{breakdown.partialDays}/{breakdown.yearDays} 天（{(breakdown.fraction * 100).toFixed(2)}%）</span>
                  </div>
                  <div className="tooltip-formula">
                    本息 = {formatMoney(breakdown.principal)} × (1 + {breakdown.annualRate}%)<sup>{breakdown.fullYears}</sup>
                    {` × (1 + ${breakdown.annualRate}% × ${(breakdown.fraction * 100).toFixed(2)}%)`}
                  </div>
                  <div className="tooltip-line tooltip-result">
                    <span>应付利息</span>
                    <span>¥{formatMoney(breakdown.interest)}</span>
                  </div>
                </div>,
                document.body
              )}
          </span>
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
