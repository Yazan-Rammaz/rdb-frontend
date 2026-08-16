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
