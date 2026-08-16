import { Timestamps } from './shared';

export interface FeeStructure {
  enabled: boolean;
  type: string;
  percentage: number;
  fixedAmount: number;
}

export interface PaytabConfig {
  paytabEnabled: boolean;
  paytabFees: FeeStructure;
  paytabTax: FeeStructure;
}

export interface BaseAsset {
  id: string;
  name: string;
  symbol: string;
}

export interface AssetItem {
  id: string;
  name: string;
  displayName: string;
  symbol: string;
  symbolImageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BaseBank {
  id: string;
  name: string;
  code: string;
}

export interface Transaction extends Timestamps {
  id: string;
  accountId: string;
  assetType: string;
  assetId: string;
  balanceId: string;
  assetSymbol: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  balanceField: string;
  title: string;
  journalEntryId: string;
}

export interface BankDepositItem extends Timestamps {
  id: string;
  amount: number;
  taxAmount: number;
  feeAmount: number;
  netAmount: number;
  transferImageUrl: string;
  transactionReference: string;
  status: string;
  rejectionReason: string;
  processedBy: string;
  processedAt: string;
  walletCredited: boolean;
  bank: BaseBank;
  currency: BaseAsset;
}
