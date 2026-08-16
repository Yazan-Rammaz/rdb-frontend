"use client";

import { Transactions } from "@/components/transactions";
import { useTranslation } from "@/context/I18nContext";


// we need to make this page calling <Transactions /> component (like home page)
// to show transactions list and details exactly like home page (pagination)
export default function TransactionsPage() {
  const { t } = useTranslation();
  return (
    <Transactions />
  );
}
