import React, { memo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCashier } from './hooks/useCashier';
import CashierHeader from './components/CashierHeader';
import CashierAlerts from './components/CashierAlerts';
import CashierOpenScreen from './components/CashierOpenScreen';
import CashierBlindCount from './components/CashierBlindCount';
import CashierTransactionList from './components/CashierTransactionList';
import CashierReviewStep from './components/CashierReviewStep';
import CashierOrderDetailModal from './components/CashierOrderDetailModal';
import TransactionModal from './components/TransactionModal';
import PendingSettlementsModal from './components/PendingSettlementsModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const stepVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const CashierManagement: React.FC = memo(() => {
  const {
    authUser,
    loading,
    isOpen,
    session,
    hasBlocks,
    summary,
    paymentMethods,
    selectedMethod,
    setSelectedMethod,
    step,
    setStep,
    initialAmount,
    setInitialAmount,
    notes,
    setNotes,
    closingValues,
    setClosingValues,
    cashLeftover,
    setCashLeftover,
    transactionModalType,
    transAmount,
    setTransAmount,
    transDesc,
    setTransDesc,
    pendingSettlementsList,
    showPendingSettlementsModal,
    showConfirmClose,
    isClosing,
    totalInformed,
    cashInHand,
    safeDeposit,
    searchTerm,
    setSearchTerm,
    filteredOrders,
    fetchData,
    handleOpen,
    handleClose,
    executeClose,
    closeConfirmDialog,
    handleTransaction,
    handleShowPendingSettlements,
    handleUpdatePayment,
    getExpectedValue,
    openIncomeModal,
    openExpenseModal,
    closeTransactionModal,
    closeSettlementsModal,
    closeOrderDetailModal,
    handleOrderClick,
    selectedOrder,
    showOrderDetailModal,
  } = useCashier();

  const handleSetStep = useCallback((newStep: 'COUNT' | 'REVIEW') => setStep(newStep), [setStep]);
  const handleCloseValueChange = useCallback((id: string, val: string) => setClosingValues(prev => ({ ...prev, [id]: val })), [setClosingValues]);

  if (loading && !isOpen && !session) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Sincronizando...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4 pb-4">
      {/* Header Premium */}
      <CashierHeader
        isOpen={isOpen}
        session={session}
        authUser={authUser}
        loading={loading}
        onRefresh={fetchData}
        onIncome={openIncomeModal}
        onExpense={openExpenseModal}
      />

      {/* Block alerts */}
      {isOpen && (
        <CashierAlerts
          session={session}
          onShowSettlements={handleShowPendingSettlements}
        />
      )}

      {/* Main content with animated transitions */}
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="open-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            <CashierOpenScreen
              initialAmount={initialAmount}
              onInitialAmountChange={setInitialAmount}
              onSubmit={handleOpen}
            />
          </motion.div>
        ) : step === 'COUNT' ? (
          <motion.div
            key="count-step"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-5"
          >
            {/* Left: Blind count */}
            <div className="xl:col-span-4 space-y-4">
              <CashierBlindCount
                paymentMethods={paymentMethods}
                selectedMethod={selectedMethod}
                onMethodSelect={setSelectedMethod}
                closingValues={closingValues}
                onClosingValueChange={handleCloseValueChange}
                totalInformed={totalInformed}
                hasBlocks={hasBlocks}
                onAuditAndFinalize={() => setStep('REVIEW')}
              />
            </div>

            {/* Right: Transaction list */}
            <div className="xl:col-span-8 space-y-4">
              <CashierTransactionList
                paymentMethods={paymentMethods}
                selectedMethod={selectedMethod}
                filteredOrders={filteredOrders}
                onUpdatePayment={handleUpdatePayment}
                onOrderClick={handleOrderClick}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="review-step"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <CashierReviewStep
              paymentMethods={paymentMethods}
              closingValues={closingValues}
              getExpectedValue={getExpectedValue}
              cashInHand={cashInHand}
              safeDeposit={safeDeposit}
              cashLeftover={cashLeftover}
              onCashLeftoverChange={setCashLeftover}
              notes={notes}
              onNotesChange={setNotes}
              onBack={() => setStep('COUNT')}
              onFinalize={handleClose}
              isLoading={isClosing}
              breakdownByMethod={summary?.breakdownByMethod}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <TransactionModal
        isOpen={transactionModalType}
        amount={transAmount}
        description={transDesc}
        onAmountChange={setTransAmount}
        onDescriptionChange={setTransDesc}
        onSubmit={handleTransaction}
        onClose={closeTransactionModal}
      />

      <PendingSettlementsModal
        isOpen={showPendingSettlementsModal}
        settlements={pendingSettlementsList}
        onClose={closeSettlementsModal}
      />

      <CashierOrderDetailModal
        isOpen={showOrderDetailModal}
        order={selectedOrder}
        paymentMethods={paymentMethods}
        onClose={closeOrderDetailModal}
        onRefresh={fetchData}
      />

      <ConfirmDialog
        isOpen={showConfirmClose}
        onClose={closeConfirmDialog}
        onConfirm={executeClose}
        title="Encerrar Turno?"
        message="Os valores informados serão enviados para auditoria. Esta ação não pode ser desfeita."
        variant="warning"
        confirmText="Sim, Encerrar Turno"
        cancelText="Voltar"
        isLoading={isClosing}
      />
    </div>
  );
});

CashierManagement.displayName = 'CashierManagement';
export default CashierManagement;
