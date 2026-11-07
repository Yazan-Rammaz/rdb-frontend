import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        // Adding rules override here
        rules: {
            '@typescript-eslint/no-explicit-any': 'off', // 👈 This disables the 'any' error project-wide
            '@typescript-eslint/no-unused-vars': 'warn', // Optional: set unused vars to warning instead of error
        },
    },
    {
        // KYC capture path: no console.log — it printed names, ID numbers,
        // birthdays and card images (feedback CR-04). warn/error stay allowed,
        // but they are forwarded by the Observe SDK, so they must never carry
        // field values either.
        files: [
            'src/features/kyc/components/screens/IDCaptureScreen.tsx',
            'src/features/kyc/components/screens/IDSummaryScreen.tsx',
            'src/features/kyc/components/screens/ContactSupportScreen.tsx',
            'src/features/kyc/services/backSideVerifier.ts',
        ],
        rules: {
            'no-console': ['error', { allow: ['warn', 'error'] }],
        },
    },
    globalIgnores([
        'node_modules/**',
        '.next/**',
        'out/**',
        'build/**',
        'dist/**',
        'coverage/**',
        '**/*.min.js',
        'next-env.d.ts',
    ]),
]);

export default eslintConfig;
