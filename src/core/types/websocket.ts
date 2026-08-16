export type ConnectionState = 'CONNECTING' | 'AUTHENTICATED' | 'DISCONNECTED' | 'ERROR';

export type WalletEventType =
  | 'balance:updated'
  | 'balance:snapshot'
  | 'deposit:initiated'
  | 'deposit:processing'
  | 'deposit:completed'
  | 'deposit:failed'
  | 'withdrawal:requested'
  | 'withdrawal:approved'
  | 'withdrawal:processing'
  | 'withdrawal:completed'
  | 'withdrawal:rejected'
  | 'withdrawal:cancelled'
  | 'transfer:sent'
  | 'transfer:received'
  | 'transfer:internal'
  | 'merchant:paymentSent'
  | 'merchant:paymentReceived'
  | 'merchant:refundSent'
  | 'merchant:refundReceived'
  | 'paymentRequest:created'
  | 'paymentRequest:received'
  | 'paymentRequest:fulfilled'
  | 'paymentRequest:cancelled'
  | 'paymentRequest:expired'
  | 'ledger:created'
  | 'ledger:completed'
  | 'ledger:failed'
  | 'ledger:cancelled';

export interface BalanceUpdatePayload {
  userId: string;
  assetSymbol: string;
  assetType: string;
  available: number;
  locked: number;
  reserved: number;
  total: number;
  timestamp: string;
}

export interface BalanceSnapshotPayload {
  balances: BalanceUpdatePayload[];
  timestamp: string;
}

export interface DepositEventPayload {
  orderId: string;
  userId: string;
  amount: number;
  assetSymbol: string;
  depositType: string;
  status: string;
  gatewayRef?: string;
  timestamp: string;
}

export interface WithdrawalEventPayload {
  orderId: string;
  userId: string;
  amount: number;
  assetSymbol: string;
  method: string;
  status: string;
  timestamp: string;
}

export interface TransferEventPayload {
  transferId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  assetSymbol: string;
  transferType: string;
  timestamp: string;
}

export interface MerchantEventPayload {
  checkoutId: string;
  merchantId: string;
  userId: string;
  amount: number;
  assetSymbol: string;
  status: string;
  timestamp: string;
}

export interface PaymentRequestEventPayload {
  requestId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  assetSymbol: string;
  status: string;
  timestamp: string;
}

export interface LedgerEventPayload {
  ledgerId: string;
  userId: string;
  type: string;
  direction: 'credit' | 'debit';
  amount: number;
  assetSymbol: string;
  status: string;
  referenceId?: string;
  timestamp: string;
}

export interface AuthenticatedPayload {
  userId: string;
  namespace: string;
  timestamp: string;
}

export interface WSErrorPayload {
  event: string;
  message: string;
  timestamp: string;
}

export interface WSContextType {
  connectionState: ConnectionState;
  isLive: boolean;
  on: (event: WalletEventType, cb: (data: unknown) => void) => () => void;
  requestBalanceSnapshot: () => void;
  /** Per-symbol update counter — increments each time WS pushes a balance:updated for that symbol */
  wsBalanceUpdates: Record<string, number>;
}
