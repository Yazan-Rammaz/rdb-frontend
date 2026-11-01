'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PinInputs from '@/components/ui/PinInputs';
import { FlexibleSpace } from '@/scaling';

interface ResetSetPasscodeProps {
    onSavePasscode: (passcode: string) => Promise<boolean>;
    onDone?: () => void;
    onSaveFailed?: () => void;
}

type SetStep = 'set' | 'reenter' | 'saving' | 'done';

/**
 * New-passcode set screen for the reset flow (titled "New Passcode"). Copy of
 * PasscodeScreen's set mode; the original is left untouched.
 */
export default function ResetSetPasscode({
    onSavePasscode,
    onDone,
    onSaveFailed,
}: ResetSetPasscodeProps) {
    const [setStep, setSetStep] = useState<SetStep>('set');
    const [passcode, setPasscode] = useState('');
    const [setValue, setSetValue] = useState('');
    const [reenterValue, setReenterValue] = useState('');
    const [setIsValid, setSetIsValid] = useState<'valid' | 'notvalid' | ''>('');

    const handleSetComplete = (value: string) => {
        setPasscode(value);
        setSetStep('reenter');
        setSetValue('');
        setReenterValue('');
    };

    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    });

    const handleReenterComplete = async (value: string) => {
        if (value === passcode) {
            setSetIsValid('valid');
            setSetStep('saving');
            const ok = await onSavePasscode(passcode);
            if (ok) {
                setSetStep('done');
                setTimeout(() => onDoneRef.current?.(), 2000);
            } else {
                onSaveFailed?.();
                setPasscode('');
                setSetValue('');
                setReenterValue('');
                setSetIsValid('');
                setSetStep('set');
            }
        } else {
            setSetIsValid('notvalid');
            setTimeout(() => {
                setSetIsValid('');
                setReenterValue('');
            }, 700);
        }
    };

    const slideVariants = {
        enter: { x: '100%', opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
    };
    const slideTrans = {
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    };

    if (setStep === 'done') {
        return (
            <div className="outer-bg-login w-full h-full flex justify-center items-center bg-[#E0FFEE]">
                <div className="w-xd-430 h-full items-start flex flex-col">
                    <div className="h-1/2 flex flex-col justify-end px-xd-40">
                        <div>
                            <h2 className="text-xd-30 font-bold text-[#1D1D1D]">Done !</h2>
                            <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-5">
                                Your Passcode Has Been Reset
                            </p>
                        </div>
                        <p className="text-xd-12 text-[#1D1D1D] mt-xd-4">Enjoy With Our Services</p>
                        <FlexibleSpace size={80} />
                    </div>
                    <div className="h-1/2 flex flex-col items-center px-xd-40">
                        <FlexibleSpace grow />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="outer-bg-passcode w-full h-full relative overflow-hidden bg-[#F4FFF4]">
            <AnimatePresence mode="wait" initial={false}>
                <div className="flex h-full justify-center items-center w-full">
                    <motion.div
                        key={setStep}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={slideTrans}
                        className="inset-0 w-fit h-full items-start flex flex-col"
                    >
                        <div className="h-1/2 flex flex-col justify-end px-xd-35">
                            <div>
                                <h2 className="text-xd-30 font-bold text-[#1D1D1D]">
                                    {setStep === 'saving' ? 'New Passcode Done' : 'New Passcode'}
                                </h2>
                                <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-5">
                                    Set A New Passcode To Continue
                                </p>
                            </div>
                            <FlexibleSpace size={130} share={0.2} />
                        </div>
                        <div className="h-1/2 flex flex-col items-center px-xd-15">
                            <div className="w-full">
                                {setStep === 'set' && (
                                    <PinInputs
                                        value={setValue}
                                        onChange={setSetValue}
                                        onComplete={handleSetComplete}
                                        disabled={false}
                                        isValidPin=""
                                        label="New Passcode"
                                    />
                                )}
                                {(setStep === 'reenter' || setStep === 'saving') && (
                                    <PinInputs
                                        value={reenterValue}
                                        onChange={setReenterValue}
                                        onComplete={handleReenterComplete}
                                        disabled={setStep === 'saving' || setIsValid === 'valid'}
                                        isValidPin={setStep === 'saving' ? 'valid' : setIsValid}
                                        label="Reenter New Passcode"
                                    />
                                )}
                            </div>
                            <FlexibleSpace grow />
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>
        </div>
    );
}
