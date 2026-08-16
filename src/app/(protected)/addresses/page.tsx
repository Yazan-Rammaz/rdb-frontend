"use client";

import React from "react";
import { useTranslation } from "@/context/I18nContext";

export default function AddressesPage() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full flex items-center justify-center">
      {t.pages.addresses}
    </div>
  );
}
