import React, { useEffect, useState, useMemo } from 'react';
import { LoanEntry } from './types';
import { groupByBorrower, calcTotalRepayment, formatMoney } from './utils';
import AddLoanForm from './components/AddLoanForm';
import EditLoanForm from './components/EditLoanForm';
import BorrowerGroup from './components/BorrowerGroup';
import './styles.css';

type ViewMode = 'all' | 'active' | 'repaid';

interface ConfirmAction {
  type: 'repay-loan' | 'repay-borrower' | 'delete-loan';
  payload: string;
}

export default function App() {
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [dueDateModal, setDueDateModal] = useState<string | null>(null);
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [editingLoan, setEditingLoan] = useState<LoanEntry | null>(null);
  // 单条还款额
  const [repayAmount, setRepayAmount] = useState('');
  // 批量还款：每条的还款额
  const [bulkRepayAmounts, setBulkRepayAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    window.finoryAPI.getLoans().then(setLoans);
  }, []);

  const filteredLoans = useMemo(() => {
    if (viewMode === 'active') return loans.filter((l) => l.status === 'active');
    if (viewMode === 'repaid') return loans.filter((l) => l.status === 'repaid');
    return loans;
  }, [loans, viewMode]);

  const summaries = useMemo(() => groupByBorrower(filteredLoans), [filteredLoans]);

  const existingBorrowers = useMemo(() => {
    const set = new Set(loans.map((l) => l.borrower));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [loans]);

  const stats = useMemo(() => {
    const active = loans.filter((l) => l.status === 'active');
    const totalPrincipal = active.reduce((s, l) => s + l.amount, 0);
    const borrowerCount = new Set(active.map((l) => l.borrower)).size;
    return { totalPrincipal, activeCount: active.length, borrowerCount };
  }, [loans]);

  async function handleAddLoan(loan: LoanEntry) {
    const updated = await window.finoryAPI.addLoan(loan);
    setLoans(updated);
    setShowAddForm(false);
  }

  function handleRepayLoan(id: string) {
    const loan = loans.find((l) => l.id === id);
    if (loan) {
      setRepayAmount(String(calcTotalRepayment(loan).toFixed(2)));
    }
    setConfirmAction({ type: 'repay-loan', payload: id });
  }

  function handleRepayBorrower(borrower: string) {
    const activeLoans = loans.filter((l) => l.borrower === borrower && l.status === 'active');
    const amounts: Record<string, string> = {};
    activeLoans.forEach((l) => {
      amounts[l.id] = String(calcTotalRepayment(l).toFixed(2));
    });
    setBulkRepayAmounts(amounts);
    setConfirmAction({ type: 'repay-borrower', payload: borrower });
  }

  function handleDeleteLoan(id: string) {
    setConfirmAction({ type: 'delete-loan', payload: id });
  }

  function handleEditLoan(loan: LoanEntry) {
    setEditingLoan(loan);
  }

  async function handleSaveEdit(updated: LoanEntry) {
    const result = await window.finoryAPI.updateLoan(updated);
    setLoans(result);
    setEditingLoan(null);
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    let updated: LoanEntry[];
    switch (confirmAction.type) {
      case 'repay-loan':
        updated = await window.finoryAPI.repayLoan(confirmAction.payload, Number(repayAmount) || 0);
        break;
      case 'repay-borrower': {
        const numAmounts: Record<string, number> = {};
        for (const [id, val] of Object.entries(bulkRepayAmounts)) {
          numAmounts[id] = Number(val) || 0;
        }
        updated = await window.finoryAPI.repayBorrower(confirmAction.payload, numAmounts);
        break;
      }
      case 'delete-loan':
        updated = await window.finoryAPI.deleteLoan(confirmAction.payload);
        break;
      default:
        return;
    }
    setLoans(updated);
    setConfirmAction(null);
    setRepayAmount('');
    setBulkRepayAmounts({});
  }

  async function handleUpdateDueDate(id: string, dueDate: string) {
    const loan = loans.find((l) => l.id === id);
    if (loan) {
      const updated = await window.finoryAPI.updateLoan({ ...loan, dueDate });
      setLoans(updated);
    }
  }

  function handleSetBorrowerDueDate(borrower: string) {
    setDueDateModal(borrower);
    setBulkDueDate('');
  }

  async function handleBulkDueDateConfirm() {
    if (dueDateModal && bulkDueDate) {
      const updated = await window.finoryAPI.setBorrowerDueDate(dueDateModal, bulkDueDate);
      setLoans(updated);
      setDueDateModal(null);
    }
  }

  function handleCancelConfirm() {
    setConfirmAction(null);
    setRepayAmount('');
    setBulkRepayAmounts({});
  }

  // 还款确认弹窗内容
  function renderConfirmContent() {
    if (!confirmAction) return null;

    if (confirmAction.type === 'repay-loan') {
      const loan = loans.find((l) => l.id === confirmAction.payload);
      if (!loan) return null;
      return (
        <>
          <p>确认将 {loan.borrower} 的 ¥{formatMoney(loan.amount)} 借款标记为已还款？</p>
          <label className="field-label">
            实际还款额 (元)
            <input
              type="number"
              min="0"
              step="0.01"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder="请输入实际还款金额"
            />
          </label>
        </>
      );
    }

    if (confirmAction.type === 'repay-borrower') {
      const activeLoans = loans.filter((l) => l.borrower === confirmAction.payload && l.status === 'active');
      return (
        <>
          <p>确认将 {confirmAction.payload} 的所有借款全部标记为已还款？请确认每笔的实际还款额：</p>
          {activeLoans.map((l) => (
            <label className="field-label" key={l.id}>
              ¥{formatMoney(l.amount)}（{l.date}）
              <input
                type="number"
                min="0"
                step="0.01"
                value={bulkRepayAmounts[l.id] || ''}
                onChange={(e) => setBulkRepayAmounts((prev) => ({ ...prev, [l.id]: e.target.value }))}
                placeholder="实际还款额"
              />
            </label>
          ))}
        </>
      );
    }

    if (confirmAction.type === 'delete-loan') {
      const loan = loans.find((l) => l.id === confirmAction.payload);
      if (!loan) return null;
      return <p>确认删除 {loan.borrower} 的 ¥{formatMoney(loan.amount)} 借款记录？此操作不可恢复。</p>;
    }

    return null;
  }

  return (
    <div className="app">
      <div className="titlebar">
        <span className="titlebar-text">Finory</span>
      </div>

      <div className="main-content">
        <div className="stats-banner">
          <div className="stat-item">
            <div className="stat-value">{stats.borrowerCount}</div>
            <div className="stat-label">借款人</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.activeCount}</div>
            <div className="stat-label">在借笔数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">¥{stats.totalPrincipal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
            <div className="stat-label">在借本金</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="view-tabs">
            {(['all', 'active', 'repaid'] as ViewMode[]).map((m) => (
              <button
                key={m}
                className={`tab ${viewMode === m ? 'active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m === 'all' ? '全部' : m === 'active' ? '在借' : '已还'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            + 新增借款
          </button>
        </div>

        <div className="loan-list">
          {summaries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>{viewMode === 'all' ? '暂无借款记录，点击右上角「新增借款」开始' : '无匹配记录'}</p>
            </div>
          ) : (
            summaries.map((s) => (
              <BorrowerGroup
                key={s.borrower}
                summary={s}
                onRepayLoan={handleRepayLoan}
                onRepayBorrower={handleRepayBorrower}
                onDeleteLoan={handleDeleteLoan}
                onEditLoan={handleEditLoan}
                onUpdateDueDate={handleUpdateDueDate}
                onSetBorrowerDueDate={handleSetBorrowerDueDate}
              />
            ))
          )}
        </div>
      </div>

      {showAddForm && (
        <AddLoanForm
          onAdd={handleAddLoan}
          onCancel={() => setShowAddForm(false)}
          existingBorrowers={existingBorrowers}
        />
      )}

      {editingLoan && (
        <EditLoanForm
          loan={editingLoan}
          onSave={handleSaveEdit}
          onCancel={() => setEditingLoan(null)}
        />
      )}

      {/* Confirm dialog with repay amount input */}
      {confirmAction && (
        <div className="modal-overlay" onClick={handleCancelConfirm}>
          <div className="modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{confirmAction.type === 'delete-loan' ? '确认删除' : '确认还款'}</h2>
            {renderConfirmContent()}
            <div className="form-actions">
              <button className="btn-secondary" onClick={handleCancelConfirm}>
                取消
              </button>
              <button
                className={confirmAction.type === 'delete-loan' ? 'btn-danger' : 'btn-primary'}
                onClick={handleConfirm}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {dueDateModal && (
        <div className="modal-overlay" onClick={() => setDueDateModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>统一设置还款日</h2>
            <p>为 <strong>{dueDateModal}</strong> 的所有在借条目设置统一的还款日期：</p>
            <label className="field-label">
              还款日期
              <input type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
            </label>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setDueDateModal(null)}>
                取消
              </button>
              <button className="btn-primary" disabled={!bulkDueDate} onClick={handleBulkDueDateConfirm}>
                确认设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
