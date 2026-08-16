'use client';

import React from 'react';
import { RdbIcon, Icon } from './icons';
import { AnimatedLoader } from './ui/animation/animated-loader';
import { AnimatedTagline } from './ui/animation/animated-tagline';

import { en as t } from '@/i18n/locales';
interface SplashScreenProps {
    onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    const duration = 4000; // Corrected from 80000 (assumed typo unless intended)

    return (
        <main className="w-full h-full flex items-center justify-center overflow-hidden bg-background">
            <div className="aspect-430/932 h-full max-h-full w-auto max-w-full flex flex-col items-center relative">
                <div className="h-[42.81%] shrink-0 w-full" />

                <div className="w-[32.09%] shrink-0">
                    <RdbIcon className="text-foreground w-full h-auto" />
                </div>

                <div className="h-[21.67%] shrink-0 w-full" />

                <div className="w-[33.95%] shrink-0">
                    <AnimatedLoader
                        duration={duration}
                        onComplete={onComplete}
                        className="w-full h-auto"
                    />
                </div>

                <div className="h-[18.24%] shrink-0 flex flex-col justify-end w-full items-center pb-[1%]">
                    <AnimatedTagline
                        words={t.splash.words as unknown as string[]}
                        duration={duration}
                        className=""
                    />
                </div>

                <div className="w-[23.78%] shrink-0 aspect-[102.25/27.65]">
                    <Icon name="ramaaztech" className="text-foreground w-full h-full" />
                </div>

                <div className="h-[3.33%] shrink-0 w-full" />
            </div>
        </main>
    );
}
