import React, { useEffect, useState, useRef, useCallback } from 'react';
import BalanceCard from '../items/BalanceCard';
import DollarIcon from '@/assets/icons/home/dollar.svg';
import SpIcon from '@/assets/icons/home/sp.svg';
import Skeleton from 'react-loading-skeleton';
import { useStore } from '@/context/StoreContext';
import { useWS } from '@/context/WSContext';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

// Custom easing for smooth, natural animations
const EASING = [0.4, 0, 0.2, 1] as const; // cubic-bezier(0.4, 0, 0.2, 1)
const DURATION = 0.35; // 350ms - sweet spot between 300-400ms


const BalanceHome = ({
    balances,
    currencies,
    setBalances,
    setCurrencies,
    activeAssetType,
    setActiveAssetType,
    activeAssetSymbol,
    setActiveAssetSymbol,
    setShowDeposit,
}: {
    balances: any;
    currencies: any;
    setBalances: any;
    setCurrencies: any;
    activeAssetSymbol?: string;
    activeAssetType?: string;
    setActiveAssetType: any;
    setActiveAssetSymbol: any;
    setShowDeposit: (show: boolean) => void;
}) => {
    const { isDataLoaded, isLoadingCurrencies, isLoadingBalances, balanceHidden, metals } =
        useStore();
    const { wsBalanceUpdates } = useWS();

    // Track which symbols have had their animation consumed so clicks don't retrigger
    const animatedCountRef = useRef<Record<string, number>>({});
    const [pendingAnim, setPendingAnim] = useState<Record<string, number>>({});

    // Render-phase derivation (not an effect): animKey and the new amount must
    // commit in the same render, otherwise SlotNumber locks the stale value.
    // Gated on balances[sym] existing — for a first-ever balance in a new
    // currency the store entry arrives via an async refetch, and the animation
    // must wait for it.
    {
        const next: Record<string, number> = {};
        Object.entries(wsBalanceUpdates).forEach(([sym, count]) => {
            if (
                (animatedCountRef.current[sym] ?? 0) < count &&
                (pendingAnim[sym] ?? 0) < count &&
                balances?.[sym]
            ) {
                next[sym] = count;
            }
        });
        if (Object.keys(next).length > 0) setPendingAnim((p) => ({ ...p, ...next }));
    }
    const scrollRef = useRef<HTMLDivElement>(null);

    // Derived synchronously from balances — must not lag a render behind, or
    // BalanceCard's SlotNumber locks a stale '0' when an animation triggers in
    // the same render a new symbol appears.
    const loadedSymbols = React.useMemo(() => new Set(Object.keys(balances)), [balances]);

    const handleToggle = (symbol: string | undefined) => {
        setActiveAssetSymbol(activeAssetSymbol === symbol ? undefined : symbol);
    };
    const handleToggleType = (assetType: string | undefined) => {
        setActiveAssetType(activeAssetType === assetType ? undefined : assetType);
    };

    // Instantly reset scroll so active card aligns to left edge
    useEffect(() => {
        if (activeAssetSymbol && scrollRef.current) {
            scrollRef.current.scrollLeft = 0;
        }
    }, [activeAssetSymbol]);

    // Memoized click handler - must be before any early returns
    const handleCardClick = useCallback(
        (asset: any) => {
            handleToggle(asset.symbol);
            handleToggleType(asset.assetType);
        },
        [activeAssetSymbol, setActiveAssetSymbol, activeAssetType, setActiveAssetType],
    );

    // Show skeleton while currencies are loading
    if (isLoadingCurrencies || (currencies.length === 0 && !isDataLoaded)) {
        return (
            <div className="w-full flex items-center gap-1.25 overflow-x-auto no-scrollbar h-xd-152 ps-xd-12 pe-xd-24 pb-xd-16">
                <CurrenciesSkeletons />
            </div>
        );
    }

    // Handle both array and object with items property
    const currencyList = Array.isArray(currencies) ? currencies : currencies?.items || [];
    const metalList = Array.isArray(metals) ? metals : [];

    // Total asset count for allLoaded check
    const totalAssets = currencyList.length + metalList.length;

    // Only sort when all balances are loaded, otherwise keep original order
    const allLoaded = loadedSymbols.size >= totalAssets;

    // Sort currencies by balance (descending)
    const sortedCurrencies = allLoaded
        ? [...currencyList].sort((a: any, b: any) => {
              const balanceA = parseFloat(balances?.[a.symbol]?.available ?? '0');
              const balanceB = parseFloat(balances?.[b.symbol]?.available ?? '0');
              return balanceB - balanceA;
          })
        : currencyList;

    // Sort metals by balance (descending)
    const sortedMetals = allLoaded
        ? [...metalList].sort((a: any, b: any) => {
              const balanceA = parseFloat(balances?.[a.symbol]?.available ?? '0');
              const balanceB = parseFloat(balances?.[b.symbol]?.available ?? '0');
              return balanceB - balanceA;
          })
        : metalList;

    // Combined list: currencies first, then metals
    const baseList = [
        ...sortedCurrencies.map((item: any) => ({ ...item, assetType: 'currency' as const })),
        ...sortedMetals.map((item: any) => ({ ...item, assetType: 'metal' as const })),
    ];

    // When a card is active, move it to the front so hidden cards are to the right
    const displayList = activeAssetSymbol
        ? [
              ...baseList.filter((item: any) => item.symbol === activeAssetSymbol),
              ...baseList.filter((item: any) => item.symbol !== activeAssetSymbol),
          ]
        : baseList;

    const renderCard = (asset: any, index: number) => {
        const isActive = activeAssetSymbol === asset.symbol;
        const isHidden = Boolean(activeAssetSymbol && activeAssetSymbol !== asset.symbol);
        // Get balance for this specific asset from the balances object
        const assetBalance = balances?.[asset.symbol];
        const isBalanceLoaded = loadedSymbols.has(asset.symbol) && !isLoadingBalances;
        const amount = isBalanceLoaded ? (assetBalance?.available?.toString() ?? '0') : undefined; // undefined triggers skeleton in BalanceCard

        return (
            <motion.div
                key={asset.symbol || index}
                layout
                transition={{ layout: { duration: DURATION, ease: EASING } }}
                className="snap-center shrink-0"
                style={{ transformOrigin: 'left center' }}
            >
                <BalanceCard
                    currencyName={asset.displayName}
                    amount={amount}
                    currencyCode={asset?.symbol}
                    icon={asset?.symbolImageUrl}
                    isActive={isActive}
                    isHidden={isHidden}
                    onClick={() => handleCardClick(asset)}
                    setShowDeposit={setShowDeposit}
                    isLoading={isLoadingBalances}
                    balanceHidden={balanceHidden}
                    assetType={asset.assetType}
                    wsUpdateCount={pendingAnim[asset.symbol] ?? 0}
                    onAnimDone={() => {
                        animatedCountRef.current[asset.symbol] = pendingAnim[asset.symbol] ?? 0;
                        setPendingAnim((p) => { const n = { ...p }; delete n[asset.symbol]; return n; });
                    }}
                />
            </motion.div>
        );
    };

    return (
        <LayoutGroup>
            <motion.div
                ref={scrollRef}
                className="w-full flex items-center overflow-x-auto no-scrollbar h-xd-152 ps-xd-12 pe-xd-24 pb-xd-10"
                layout="position"
            >
                <AnimatePresence mode="popLayout">
                    {displayList.map((asset: any, index: number) => renderCard(asset, index))}
                </AnimatePresence>
            </motion.div>
        </LayoutGroup>
    );
};
export default BalanceHome;

const CurrenciesSkeletons = () => {
    return (
        <>
            {Array.from({ length: 4 }).map((_c, index) => (
                <div key={index} className="snap-center shrink-0 w-xd-200 h-xd-120">
                    <Skeleton borderRadius={12} className="w-full h-full" />
                </div>
            ))}
        </>
    );
};
