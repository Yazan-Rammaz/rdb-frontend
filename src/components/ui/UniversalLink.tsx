'use client';

import React from 'react';
import Link from 'next/link';

interface UniversalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children: React.ReactNode;
}

/**
 * Thin wrapper over next/link.
 *
 * It used to switch between next/link and react-router's Link depending on
 * whether the app was running standalone or embedded as a library in a host
 * app. There is no library build any more, so only one branch survives. The
 * component is kept so call sites stay unchanged.
 */
export const UniversalLink = ({ href, children, ...props }: UniversalLinkProps) => (
    <Link href={href} {...props}>
        {children}
    </Link>
);
