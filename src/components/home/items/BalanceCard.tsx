'use client';

import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import StatisticIcon from '@/assets/icons/home/balance/statistic.svg';
import ChartIcon from '@/assets/icons/home/balance/chart.svg';
import QRSmall from '@/assets/icons/home/balance/qrsmall.svg';
import { motion, AnimatePresence } from 'framer-motion';
import { useXdScale } from '@/scaling';

const EASING = [0.4, 0, 0.2, 1] as const;
const DURATION = 0.35;
const SHADOW = '0px 3px 8px rgba(0,0,0,0.16)';

const ROW_H = 28; // px — matches rendered text-xd-25

const EXIT_S = 0.28;
const ENTER_S = 0.38;

interface SlotNumberProps {
    value: string;
    animKey: number;
    onDone?: () => void;
}

/**
 * AnimatePresence mode="wait":
 *   key changes on animKey → old element exits DOWN, then new enters FROM LEFT.
 *   No manual phase tracking — AnimatePresence guarantees exit completes before enter starts.
 */
const SlotNumber: React.FC<SlotNumberProps> = ({ value, animKey, onDone }) => {
    // For animKey=0 (initial load / no animation) always mirror the live value.
    // For animKey>0 lock the value the first time that key is seen — this preserves
    // the OLD balance in the exiting element when value updates a render before animKey does.
    const lockedRef = useRef<Map<number, string>>(new Map());
    let displayValue: string;
    if (animKey === 0) {
        displayValue = value;
    } else {
        if (!lockedRef.current.has(animKey)) {
            lockedRef.current.set(animKey, value);
            // Prune old keys (keep last 3)
            for (const k of lockedRef.current.keys()) {
                if (k < animKey - 2) lockedRef.current.delete(k);
            }
        }
        displayValue = lockedRef.current.get(animKey)!;
    }

    const numberClass =
        'font-medium text-[#FFFFFF] leading-none text-xd-25 select-none whitespace-nowrap';

    return (
        <AnimatePresence mode="wait" onExitComplete={onDone}>
            <motion.span
                key={animKey}
                className={numberClass}
                style={{ textShadow: SHADOW }}
                variants={{
                    enter: {
                        x: 0,
                        opacity: 1,
                        transition: { duration: ENTER_S, ease: [0.25, 0.1, 0.25, 1] },
                    },
                    exit: {
                        y: ROW_H * 1.5,
                        opacity: 0,
                        transition: { duration: EXIT_S, ease: [0.4, 0, 0.8, 1] },
                    },
                }}
                initial={animKey === 0 ? false : { x: -36, opacity: 0 }}
                animate="enter"
                exit="exit"
            >
                {displayValue}
            </motion.span>
        </AnimatePresence>
    );
};

interface BalanceCardProps {
    currencyName: string;
    amount?: string;
    currencyCode: string;
    icon: any;
    onClick?: () => void;
    setShowDeposit: (show: boolean) => void;
    isActive?: boolean;
    isHidden?: boolean;
    isLoading?: boolean;
    balanceHidden?: boolean;
    assetType?: 'currency' | 'metal';
    wsUpdateCount?: number;
    onAnimDone?: () => void;
}

const BalanceCard: React.FC<BalanceCardProps> = ({
    currencyName,
    amount,
    currencyCode,
    icon,
    setShowDeposit,
    onClick,
    isActive = false,
    isHidden = false,
    isLoading = false,
    balanceHidden = false,
    assetType = 'currency',
    wsUpdateCount = 0,
    onAnimDone,
}) => {
    const scale = useXdScale();

    // animKey is derived directly from wsUpdateCount so it changes in the same render
    // as `amount` — no intermediate render, stableValueRef in SlotNumber stays correct.
    const animKey = wsUpdateCount;

    const animationStyles = useMemo(
        () => ({
            width: isActive ? 406 * scale : isHidden ? 0 : 200 * scale,
            scale: isHidden ? 0.8 : 1,
            opacity: isHidden ? 0 : 1,
            paddingTop: isHidden ? 0 : 10 * scale,
            paddingBottom: isHidden ? 0 : 10 * scale,
            paddingLeft: isHidden ? 0 : 15 * scale,
            paddingRight: isHidden ? 0 : 25 * scale,
        }),
        [isActive, isHidden, scale],
    );

    const transitionConfig = useMemo(
        () => ({
            width: { duration: DURATION, ease: EASING },
            scale: { duration: DURATION, ease: EASING },
            opacity: { duration: DURATION * 0.6, ease: EASING },
            paddingTop: { duration: DURATION, ease: EASING },
            paddingBottom: { duration: DURATION, ease: EASING },
            paddingLeft: { duration: DURATION, ease: EASING },
            paddingRight: { duration: DURATION, ease: EASING },
            layout: { duration: DURATION, ease: EASING },
        }),
        [],
    );

    const displayAmount = balanceHidden ? '••••' : amount === undefined ? '0' : amount;

    return (
        <div className={isHidden ? 'p-0' : 'p-0.5'}>
            <motion.div
                layout
                layoutId={`balance-card-${currencyCode}`}
                initial={false}
                animate={animationStyles}
                transition={transitionConfig}
                className="bg-[#3C3C3C] items-start flex flex-col justify-between shrink-0 overflow-hidden cursor-pointer h-xd-120 rounded-xd-15"
                style={{
                    minWidth: isHidden ? 0 : undefined,
                    boxShadow:
                        '0px 3px 6px rgba(0, 0, 0, 0.16), inset 0px 3px 6px rgba(255, 255, 255, 0.16)',
                    border: '0.5px solid #D3D3D3',
                    pointerEvents: isHidden ? 'none' : 'auto',
                }}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                onClick={onClick}
            >
                <motion.div className="w-full flex items-start justify-between gap-3" layout>
                    <motion.div className="flex flex-col gap-2" layout>
                        <div className="relative size-xd-20">
                            <Image src={icon} alt={currencyName} fill className="object-contain" />
                        </div>
                        <span className="font-light text-[#FFFFFF] leading-tight text-xd-11">
                            {currencyName}
                        </span>
                    </motion.div>
                </motion.div>

                <motion.div className="w-full flex items-end justify-between" layout>
                    <div className="flex items-baseline gap-1">
                        <span
                            className="relative flex items-center overflow-hidden"
                            style={{ height: ROW_H, minWidth: 24 }}
                        >
                            {balanceHidden ? (
                                <span
                                    className="font-medium text-[#FFFFFF] leading-none text-xd-25"
                                    style={{ textShadow: SHADOW }}
                                >
                                    ••••
                                </span>
                            ) : (
                                <SlotNumber
                                    value={displayAmount}
                                    animKey={animKey}
                                    onDone={onAnimDone}
                                />
                            )}
                        </span>
                        {/* Currency code is outside the animated number — never moves */}
                        <span className="font-light text-[#FFFFFF] uppercase text-xd-9 shrink-0">
                            {currencyCode}
                        </span>
                    </div>

                    <AnimatePresence>
                        {isActive && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{
                                    duration: DURATION,
                                    ease: EASING,
                                    delay: DURATION * 0.3,
                                }}
                                className="flex items-end gap-xd-35"
                            >
                                <button
                                    className="flex flex-col items-center gap-1 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <div className="relative size-xd-15">
                                        <Image
                                            src={StatisticIcon}
                                            alt="Statistic"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="font-light text-[#FFFFFF] text-xd-9">
                                        statistic
                                    </span>
                                </button>
                                <button
                                    className="flex flex-col items-center gap-1 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <div className="relative size-xd-15">
                                        <Image
                                            src={ChartIcon}
                                            alt="Chart"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="font-light text-[#FFFFFF] text-xd-9">
                                        Chart
                                    </span>
                                </button>
                                <button
                                    className="flex flex-col items-center gap-1 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <div className="relative size-xd-15">
                                        <Image
                                            src={QRSmall}
                                            alt="Info"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="font-light text-[#FFFFFF] text-xd-9">
                                        Info
                                    </span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default BalanceCard;
