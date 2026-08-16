import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import TransactionItem from '../../transactions/items/TransactionItem';
import PendingPaymentTimer from '../../transactions/items/PendingPaymentTimer';
import type { FinancialLedgerItem } from '@/core/types';

// Import Icons
import CashDepositIcon from '../../../assets/icons/home/cashdeposit.svg';
import CashWithdrawIcon from '../../../assets/icons/home/cashwithdraw.svg';
import RefundOrderIcon from '../../../assets/icons/home/refundorder.svg';
import ArrowDownIcon from '../../../assets/icons/home/arrowdown.svg';
import ArrowUpIcon from '../../../assets/icons/home/arrwoup.svg';
// Transfer icons
import TransferSendIcon from '../../../assets/icons/home/transfer/transfer.svg';
import TransferReceiveIcon from '../../../assets/icons/home/transfer/recieve.svg';
import { useStore } from '@/context/StoreContext';
import { useActions } from '@/hooks/useActions';
import Skeleton from 'react-loading-skeleton';
import { useTranslation } from '@/context/I18nContext';

interface FormattedTransaction {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    description?: React.ReactNode;
    status: string;
    amount: string;
    currency?: string;
    icon: any;
    arrowIcon: any;
    isNegative: boolean;
    requestCode?: string;
    ledger: FinancialLedgerItem;
}

const TransactionsHome = ({
    transactions,
    currencies,
    filterByCurrency,
    isLoadingFilter,
    newestWsTxId,
    onWsAnimDone,
    onPaymentRequestTap,
    onTransactionTap,
}: {
    transactions: FinancialLedgerItem[];
    setTransactions: any;
    currencies: any[];
    filterByCurrency?: string;
    isLoadingFilter?: boolean;
    newestWsTxId?: string | null;
    onWsAnimDone?: () => void;
    onPaymentRequestTap?: (requestCode: string) => void;
    onTransactionTap?: (ledger: FinancialLedgerItem) => void;
}) => {
    const { t, language } = useTranslation();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // ── WS transaction animation ──
    // Phase flow: idle → gap (list pushes down) → enter (slide in) → settle (spacer closes) → idle
    const [animTxId, setAnimTxId] = useState<string | null>(null);
    const [phase, setPhase] = useState<'idle' | 'gap' | 'enter' | 'settle'>('idle');
    const seenWsRef = useRef<string | null>(null);

    useEffect(() => {
        if (!newestWsTxId || newestWsTxId === seenWsRef.current) return;
        seenWsRef.current = newestWsTxId;
        setAnimTxId(newestWsTxId);
        setPhase('gap');
    }, [newestWsTxId]);

    // On gap mount, start at 0 then trigger transition to full height on next frame
    const [spacerOpen, setSpacerOpen] = useState(false);
    useEffect(() => {
        if (phase === 'gap') {
            setSpacerOpen(false);
            const raf = requestAnimationFrame(() => {
                requestAnimationFrame(() => setSpacerOpen(true));
            });
            return () => cancelAnimationFrame(raf);
        }
        if (phase === 'settle') {
            setSpacerOpen(false);
        }
    }, [phase]);

    // Drive the phase timeline
    useEffect(() => {
        if (phase === 'idle') return;
        let timer: ReturnType<typeof setTimeout>;

        if (phase === 'gap') {
            // Wait for gap to fully open (1.2s animation + pause)
            timer = setTimeout(() => setPhase('enter'), 1600);
        } else if (phase === 'enter') {
            // Wait for slide-in to finish
            timer = setTimeout(() => setPhase('settle'), 800);
        } else if (phase === 'settle') {
            // Wait for spacer to close
            timer = setTimeout(() => {
                setPhase('idle');
                setAnimTxId(null);
                seenWsRef.current = null;
                onWsAnimDone?.();
            }, 1100);
        }

        return () => clearTimeout(timer!);
    }, [phase, onWsAnimDone]);
    const {
        isLoadingTransactions,
        isLoadingMoreTransactions,
        transactionHasMore,
        loadMoreTransactions,
        activeAssetSymbol,
    } = useStore();
    const actions = useActions();
    const sentinelRef = useRef<HTMLDivElement>(null);
    const currentCurrency = filterByCurrency || activeAssetSymbol;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && transactionHasMore && !isLoadingMoreTransactions) {
                    loadMoreTransactions(actions);
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [transactionHasMore, isLoadingMoreTransactions, loadMoreTransactions, actions]);

    // Check if ledger entry is a payment request
    const isPaymentRequestLedger = (ledger: FinancialLedgerItem): boolean => {
        return ledger.ledgerType === 'PAYMENT_REQUEST' || !!ledger.metadata?.requestCode;
    };

    // Check if ledger entry is a transfer
    const isTransferLedger = (ledger: FinancialLedgerItem): boolean => {
        const titleStr = typeof ledger.title === 'string' ? ledger.title : '';
        return (
            ledger.ledgerType === 'ACCOUNT_TRANSFER' || titleStr.toLowerCase().includes('transfer')
        );
    };

    // Get counterparty account info for subtitle
    const getCounterpartyInfo = (ledger: FinancialLedgerItem): string => {
        const isOutgoing = ledger.direction === 'OUT';

        // Use receiverAccount for outgoing, senderAccount for incoming (when backend adds them)
        const counterpartyAccount = isOutgoing ? ledger.receiverAccount : ledger.senderAccount;

        if (counterpartyAccount) {
            const maskedName = counterpartyAccount.name || '';
            return `| ${counterpartyAccount.accountNumber} | ${maskedName}`;
        }

        // Fallback: use account IDs to generate placeholder
        const accountId = isOutgoing ? ledger.receiverAccountId : ledger.senderAccountId;
        if (accountId) {
            const idNum = accountId.replace(/\D/g, '').slice(-6) || '000000';
            return `${idNum.slice(0, 4)}-${idNum.slice(4, 8) || '0000'}`;
        }

        return '';
    };

    const getTransactionSubtitle = (ledger: FinancialLedgerItem): string => {
        if (isTransferLedger(ledger)) {
            return getCounterpartyInfo(ledger);
        }
        if (ledger.senderAccount) {
            return `${ledger.senderAccount?.name} | ${ledger.senderAccount?.accountNumber}`;
        }
        if (ledger.description || ledger.note) {
            return ledger.description || ledger.note || '';
        }
        return '';
    };

    const getTransactionIcon = (ledger: FinancialLedgerItem) => {
        if (isTransferLedger(ledger)) {
            return ledger.direction === 'OUT' ? TransferSendIcon : TransferReceiveIcon;
        }

        // Default icons based on direction
        if (ledger.direction === 'OUT') {
            return CashWithdrawIcon;
        } else if (ledger.direction === 'IN') {
            return CashDepositIcon;
        }

        return RefundOrderIcon;
    };

    const formatTransactionTitle = (ledger: FinancialLedgerItem): string => {
        if (isTransferLedger(ledger)) {
            return ledger.direction === 'OUT'
                ? t.home.transactions.transferSend
                : t.home.transactions.transferReceive;
        }

        // Use the title from the ledger (WS sends title as {en,ar} object; API sends string)
        const raw = ledger.title as unknown;
        if (raw && typeof raw === 'object') {
            const loc =
                (raw as Record<string, string>)[language] ??
                (raw as Record<string, string>).en ??
                '';
            return loc || t.home.transactions.defaultTitle;
        }
        return (typeof raw === 'string' ? raw : '') || t.home.transactions.defaultTitle;
    };

    // Format date as "DD.Month" (e.g., "03.March")
    const formatTransactionDate = (dateString: string): string => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString(language, { month: 'long' });
        return `${day}.${month}`;
    };

    // Format status for display
    const formatStatus = (status: string): string => {
        switch (status) {
            case 'COMPLETED':
                return t.home.transactionStatus.success;
            case 'PENDING':
                return t.home.transactionStatus.pending;
            case 'FAILED':
                return t.home.transactionStatus.failed;
            default:
                return status;
        }
    };

    const formattedTransactions = useMemo(() => {
        const arr: FormattedTransaction[] = [];
        const seenIds = new Set<string>();

        transactions?.forEach((ledger) => {
            if (seenIds.has(ledger.id)) return;
            seenIds.add(ledger.id);
            const isOutgoing = ledger.direction === 'OUT';

            const isPendingPaymentRequest =
                ledger.ledgerType === 'PAYMENT_REQUEST' &&
                ledger.status === 'PENDING' &&
                !!ledger.metadata?.requestCode;
            arr.push({
                id: ledger.id,
                title: formatTransactionTitle(ledger),
                subtitle: getTransactionSubtitle(ledger),
                date: formatTransactionDate(ledger.createdAt),
                description: isPendingPaymentRequest ? (
                    <PendingPaymentTimer
                        key={ledger.id}
                        requestCode={ledger.metadata!.requestCode!}
                        ledgerId={ledger.id}
                    />
                ) : (
                    ledger.description || ledger.note || ''
                ),
                status: formatStatus(ledger.status),
                amount: ledger.amount.toString(),
                currency:
                    currencies?.find((currency) => currency.symbol === ledger.assetSymbol)
                        ?.symbol || ledger.assetSymbol,
                icon: getTransactionIcon(ledger),
                arrowIcon: isOutgoing ? ArrowUpIcon : ArrowDownIcon,
                isNegative: isOutgoing,
                requestCode: isPaymentRequestLedger(ledger)
                    ? ledger.metadata?.requestCode
                    : undefined,
                ledger,
            });
        });

        return arr;
    }, [transactions, currencies, filterByCurrency, t]);

    return (
        <div className="w-full px-3 mt-[px] flex flex-col flex-1 overflow-hidden items-start">
            <h2 className="font-bold ml-3.75 text-[11px] text-[#1D1D1D] mb-2.25 shrink-0">
                {currentCurrency
                    ? t.home.allTransactionsWithCurrency.replace('{{currency}}', currentCurrency)
                    : t.home.allTransactions}
            </h2>
            {/* key changes on currency switch → remount with no animation */}
            <div
                key={filterByCurrency ?? 'all'}
                className="flex w-full flex-col gap-1.25 overflow-y-auto flex-1 no-scrollbar px-px py-px"
            >
                {(isLoadingTransactions || isLoadingFilter) &&
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={`tr-${i}`} className="w-full max-w-xd-420 h-xd-50">
                            <Skeleton className="w-full max-w-xd-420 h-xd-50" borderRadius={15} />
                        </div>
                    ))}
                {formattedTransactions.map((tx, index) => {
                    const isWsNew = tx.id === newestWsTxId;

                    const item = (
                        <TransactionItem
                            title={tx.title}
                            date={tx.date}
                            description={tx.description || tx.subtitle || ''}
                            status={tx.status}
                            amount={tx.amount}
                            currency={tx.currency!}
                            icon={tx.icon}
                            arrowIcon={tx.arrowIcon}
                            isNegative={tx.isNegative}
                            isFirst={index === 0}
                            isSelected={selectedId === tx.id}
                            onClick={() => {
                                setSelectedId(tx.id);
                                if (tx.requestCode && onPaymentRequestTap) {
                                    onPaymentRequestTap(tx.requestCode);
                                } else if (onTransactionTap) {
                                    onTransactionTap(tx.ledger);
                                }
                            }}
                        />
                    );

                    if (tx.id === animTxId && phase !== 'idle') {
                        const spacerH = spacerOpen ? 50 : 0;
                        const showItem = phase === 'enter' || phase === 'settle';

                        return (
                            <React.Fragment key={tx.id}>
                                {/* The item */}
                                {showItem ? (
                                    phase === 'enter' ? (
                                        <motion.div
                                            key={`ws-slide-${tx.id}`}
                                            initial={{ x: -120, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{
                                                duration: 0.6,
                                                ease: [0.25, 0.1, 0.25, 1] as [
                                                    number,
                                                    number,
                                                    number,
                                                    number,
                                                ],
                                            }}
                                        >
                                            {item}
                                        </motion.div>
                                    ) : (
                                        <div>{item}</div>
                                    )
                                ) : (
                                    // Gap phase: invisible placeholder to measure height
                                    <div style={{ opacity: 0 }}>{item}</div>
                                )}
                                {/* Spacer below — CSS transition, no key changes */}
                                <div
                                    style={{
                                        height: spacerH,
                                        transition: 'height 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                                        overflow: 'hidden',
                                    }}
                                />
                            </React.Fragment>
                        );
                    }

                    return <div key={tx.id}>{item}</div>;
                })}
                {isLoadingMoreTransactions &&
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={`more-${i}`} className="w-full max-w-xd-420 h-xd-50">
                            <Skeleton className="w-full max-w-xd-420 h-xd-50" borderRadius={15} />
                        </div>
                    ))}
                <div ref={sentinelRef} className="h-1 shrink-0" />
            </div>
        </div>
    );
};

export default TransactionsHome;
