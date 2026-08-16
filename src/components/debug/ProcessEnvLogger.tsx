'use client';

import { useEffect } from 'react';

export default function ProcessEnvLogger() {
    useEffect(() => {
        console.log('[frontend] process.env:', process.env);
    }, []);

    return null;
}
