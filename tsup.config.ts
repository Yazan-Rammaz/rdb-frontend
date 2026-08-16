import { defineConfig } from "tsup";

export default defineConfig([
    {
        entry: {
            "index": "src/rdb/index.ts",
        },
        tsconfig: "tsconfig.build.json",
        format: ["cjs", "esm"],
        dts: true,
        splitting: false,
        clean: true,
        minify: false,
        bundle: true,
        target: "es2020",
        external: ["react", "react-dom", "next", "next/headers"],
        noExternal: [/^@\//, /\.\//],
        loader: {
            '.png': 'dataurl',
            '.svg': 'dataurl'
        },
    },
    {
        entry: {
            "core/index": "src/core/index.ts",
            "server/index": "src/core/server.ts",
        },
        tsconfig: "tsconfig.build.json",
        format: ["esm", "cjs"],
        dts: true,
        splitting: false,
        clean: false,
        minify: false,
        bundle: true,
        outDir: "dist",
        target: "es2020",
        banner: {
            js: '"use server";',
        },
        external: ["react", "react-dom", "next", "next/headers"],
        noExternal: [/^@\//, /\.\//],
    },
    {
        entry: {
            "server/browser": "src/core/server-client-proxy.ts",
        },
        tsconfig: "tsconfig.build.json",
        format: ["esm"],
        dts: true,
        splitting: false,
        clean: false,
        minify: false,
        bundle: true,
        outDir: "dist",
        target: "es2020",
        external: ["react", "react-dom", "next", "next/headers"],
        noExternal: [/^@\//, /\.\//],
    }
]);