'use client';

import React from 'react';
import Link from 'next/link';
import { Link as RouterLink } from 'react-router-dom';
import { useRDBConfig } from '../../context/RDBContext';

interface UniversalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const UniversalLink = ({ href, children, ...props }: UniversalLinkProps) => {
  const { isLibrary } = useRDBConfig();

  if (isLibrary) {
    return (
      <RouterLink to={href} {...props as any}>
        {children}
      </RouterLink>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
};
