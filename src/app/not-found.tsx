"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "@/context/I18nContext";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="w-full h-dvh bg-background flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-r from-[#3066CC] to-[#254E9E] flex items-center justify-center text-white text-2xl font-bold">
          {t.notFound.code}
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#404040]">
          {t.notFound.title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{t.notFound.description}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-[#3066CC] text-white rounded-lg font-medium hover:bg-[#254E9E] transition-colors"
          >
            {t.notFound.goHome}
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 border border-[#3066CC] text-[#3066CC] rounded-lg font-medium hover:bg-[#3066CC] hover:text-white transition-colors"
          >
            {t.notFound.trySignup}
          </Link>
        </div>
      </div>
    </main>
  );
}
