"use strict";
"use client";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/rdb/index.ts
var rdb_exports = {};
__export(rdb_exports, {
  I18nProvider: () => I18nProvider,
  RDB: () => RDB,
  useTranslation: () => useTranslation
});
module.exports = __toCommonJS(rdb_exports);

// src/rdb/components/RDB.tsx
var import_react48 = require("react");
var import_react_router_dom3 = require("react-router-dom");

// src/context/RDBContext.tsx
var import_react = require("react");

// src/core/actions/banking.ts
var banking_exports = {};
__export(banking_exports, {
  CalculateFees: () => CalculateFees,
  CreateBankDeposit: () => CreateBankDeposit,
  GetBankDeposits: () => GetBankDeposits,
  GetBanks: () => GetBanks,
  getAccountByBalanceId: () => getAccountByBalanceId,
  getCurrencies: () => getCurrencies,
  getSupportedAssets: () => getSupportedAssets,
  lookupAccountByPhone: () => lookupAccountByPhone,
  validateRecipientAccount: () => validateRecipientAccount
});

// src/core/auth/resolve-token.ts
var DEFAULT_AUTH_COOKIE = "rdb_at";
async function resolveAuthToken(cookieName) {
  const name = cookieName || DEFAULT_AUTH_COOKIE;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value || null;
  } catch (e) {
    return null;
  }
}

// src/rdb/types/RDBProps.ts
var initialData = {
  BaseUrl: "https://trydos_wallet_develop.ramaaz.dev",
  Locale: "en-gb",
  CountryCode: void 0
};

// src/core/utils.ts
async function fetchServerData({
  url,
  method = "GET",
  body,
  headers = {},
  token,
  authCookieName
}) {
  const authToken = token || await resolveAuthToken(authCookieName);
  const local = initialData.Locale || "en-gb";
  const baseUrl = initialData.BaseUrl || "";
  if (!baseUrl) {
    throw new Error("Base URL is not configured in environment variables");
  }
  try {
    const finalHeaders = {
      "Accept-Language": local,
      ...authToken ? { Authorization: `Bearer ${authToken}` } : {},
      ...headers
    };
    if (finalHeaders["ContentType"] === "MULTIPART") {
      delete finalHeaders["ContentType"];
      delete finalHeaders["Content-Type"];
    } else if (!finalHeaders["Content-Type"] && !(body instanceof FormData)) {
      finalHeaders["Content-Type"] = "application/json";
    }
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: finalHeaders,
      body: body instanceof FormData ? body : JSON.stringify(body),
      cache: "no-store"
      // Ensures fresh data for banking/wallet operations
    });
    if (response.status === 204) {
      return {
        error: null,
        success: true,
        data: null,
        status: 204
      };
    }
    const result = await response.json();
    return {
      success: response.ok,
      data: result.data || result,
      error: !response.ok ? result.message || result.error || "Unknown Error" : null,
      status: response.status
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return {
      success: false,
      data: null,
      error: error.message || "Network Request Failed",
      status: 500
    };
  }
}
async function processResponse(response, logContext) {
  if (response?.status === 401) {
    return { error: "UNAUTHENTICATED", ...response };
  }
  if (response?.error) {
    return { error: response.error };
  }
  return response?.data;
}

// src/core/actions/banking.ts
async function getSupportedAssets({
  token,
  authCookieName
} = {}) {
  try {
    const headers = {};
    const countryCode = initialData.CountryCode;
    if (countryCode) {
      headers["x-country-code"] = countryCode;
    }
    let response = await fetchServerData({
      method: "GET",
      url: "/assets/supported",
      token,
      authCookieName,
      headers
    });
    return processResponse(response);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
async function getCurrencies({
  token,
  authCookieName
} = {}) {
  try {
    const result = await getSupportedAssets({ token, authCookieName });
    if ("error" in result) {
      return result;
    }
    return {
      items: result.currencies,
      total: result.currencies.length,
      page: 1,
      limit: result.currencies.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
async function GetBanks({
  token,
  authCookieName
} = {}) {
  try {
    let response = await fetchServerData({
      method: "GET",
      url: "/banks",
      token,
      authCookieName
    });
    return processResponse(response);
  } catch (error) {
    console.error(error);
  }
}
async function CreateBankDeposit({
  bankId,
  currencyId,
  amount,
  transferImageUrl,
  transactionReference,
  idempotencyKey,
  token,
  authCookieName
}) {
  let response = await fetchServerData({
    method: "POST",
    body: JSON.stringify({
      bankId,
      currencyId,
      amount,
      transferImageUrl,
      transactionReference,
      idempotencyKey
    }),
    url: "/bank-deposits",
    token,
    authCookieName
  });
  return processResponse(response);
}
async function CalculateFees({
  bankId,
  currencyId,
  amount,
  token,
  authCookieName
}) {
  let response = await fetchServerData({
    method: "POST",
    body: JSON.stringify({
      bankId,
      currencyId,
      amount
    }),
    url: "/bank-deposits/calculate-fees",
    token,
    authCookieName
  });
  return processResponse(response);
}
async function GetBankDeposits({
  token,
  authCookieName
} = {}) {
  let response = await fetchServerData({
    method: "GET",
    url: "/bank-deposits",
    token,
    authCookieName
  });
  return processResponse(response);
}
async function getAccountByBalanceId({
  balanceId,
  token,
  authCookieName
}) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    const response = {
      accountName: "FirstName LastName",
      accountNumber: balanceId,
      username: "@username.com",
      profilePicture: "",
      // Can be a URL or base64
      currency: "USD",
      initials: "FL"
    };
    return response;
  } catch (error) {
    console.error("Error fetching account by balance ID:", error);
    return { error: "Failed to fetch account details" };
  }
}
async function validateRecipientAccount({
  accountNumber,
  token,
  authCookieName
}) {
  try {
    const formatted = accountNumber.includes("-") ? accountNumber : `${accountNumber.slice(0, 4)}-${accountNumber.slice(4)}`;
    const response = await fetchServerData({
      method: "GET",
      url: `/transfers/lookup-account/${encodeURIComponent(formatted)}`,
      token,
      authCookieName
    });
    const result = await processResponse(response);
    if ("error" in result) {
      return { error: result.error };
    }
    if (!result.found) {
      return { error: "Account not found. Please verify the account number." };
    }
    return {
      found: result.found,
      accountNumber: result.accountNumber,
      name: result.name,
      maskedName: result.name
      // API returns pre-masked name like "P***y W."
    };
  } catch (error) {
    console.error("Error validating recipient account:", error);
    return { error: "Failed to validate account. Please try again." };
  }
}
async function lookupAccountByPhone({
  phoneNumber
}) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const cleaned = phoneNumber.replace(/[\s-]/g, "");
    if (cleaned === "+963980033496" || cleaned === "963911000001") {
      return {
        found: true,
        accountNumber: "0000-0708",
        name: "R***** B***** T***** Y***** L***** S*****",
        maskedName: "R***** B***** T***** Y***** L***** S*****"
      };
    }
    return { error: "Account not found. Please verify the phone number." };
  } catch (error) {
    console.error("Error looking up account by phone:", error);
    return { error: "Failed to lookup account. Please try again." };
  }
}

// src/core/actions/media.ts
var media_exports = {};
__export(media_exports, {
  UploadMedia: () => UploadMedia
});
async function UploadMedia({
  file,
  token,
  authCookieName
}) {
  let formData = new FormData();
  formData.append("file", file);
  formData.append("type", file.type?.split("/")[0]);
  let response = await fetchServerData({
    method: "POST",
    body: formData,
    url: "/media/upload/direct",
    token,
    authCookieName,
    headers: {
      // Using "MULTIPART" flag so your fetch wrapper knows to DELETE the content-type header
      ContentType: "MULTIPART"
    }
  });
  return processResponse(response);
}

// src/core/actions/transactions.ts
var transactions_exports = {};
__export(transactions_exports, {
  CheckoutOrder: () => CheckoutOrder,
  GetAccountBalance: () => GetAccountBalance,
  GetFinancialLedger: () => GetFinancialLedger,
  GetJournalEntries: () => GetJournalEntries,
  GetTransactions: () => GetTransactions,
  GetWalletBalance: () => GetWalletBalance,
  SendTransfer: () => SendTransfer,
  checkTransferBalance: () => checkTransferBalance,
  getDepositRequest: () => getDepositRequest,
  getTransferPurposes: () => getTransferPurposes,
  verifyTransfer: () => verifyTransfer
});
async function GetWalletBalance({
  currencySymbol,
  token,
  authCookieName
}) {
  let response = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/wallets/myAcounts?currencySymbol=${encodeURIComponent(currencySymbol)}`
  });
  return processResponse(response);
}
async function GetAccountBalance({
  assetId,
  token,
  authCookieName
}) {
  let response = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/wallets/my/balances/${encodeURIComponent(assetId)}`
  });
  return processResponse(response);
}
async function GetJournalEntries({
  token,
  authCookieName
} = {}) {
  let response = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/wallets/my/journal-entries`
  });
  return processResponse(response);
}
async function GetFinancialLedger({
  token,
  authCookieName,
  page = 0,
  limit = 10
} = {}) {
  let response = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/financial-ledger?page=${page}&limit=${limit}`
  });
  return processResponse(response);
}
async function GetTransactions({
  token,
  authCookieName
} = {}) {
  let response = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/wallets/my/transactions`
  });
  return processResponse(response);
}
async function CheckoutOrder({
  storeKey = "trydos",
  cartId,
  amount,
  idempotencyKey,
  currencyId,
  token,
  authCookieName
}) {
  let response = await fetchServerData({
    method: "POST",
    body: JSON.stringify({
      currencyId,
      carts: [
        {
          cartId,
          amount
        }
      ],
      idempotencyKey
    }),
    url: `/wallets/${storeKey}/checkout`,
    token,
    authCookieName
  });
  return processResponse(response);
}
async function checkTransferBalance({
  amount,
  currency
}) {
  await new Promise((resolve) => setTimeout(resolve, 1e3));
  const available = 1e3;
  return {
    sufficient: amount <= available,
    available
  };
}
async function getTransferPurposes({
  token,
  authCookieName
} = {}) {
  let response = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/transfer-purpose?type=ALL`,
    headers: {
      "x-lang": (initialData.Locale || "en-gb").split("-")[0]
    }
  });
  return processResponse(response);
}
async function verifyTransfer({
  toAccountNumber,
  assetSymbol,
  assetType,
  amount,
  senderAvailableBalance,
  token,
  authCookieName
}) {
  if (senderAvailableBalance !== void 0 && amount > senderAvailableBalance) {
    return {
      valid: false,
      sender: { accountNumber: "", name: "", availableBalance: senderAvailableBalance },
      receiver: { accountNumber: toAccountNumber, name: "" },
      currency: { symbol: assetSymbol, name: assetSymbol },
      amount
    };
  }
  try {
    const response = await fetchServerData({
      method: "POST",
      url: "/transfers/verify",
      body: {
        toAccountNumber,
        assetSymbol,
        assetType,
        amount
      },
      token,
      authCookieName
    });
    const result = await processResponse(response);
    return result;
  } catch (error) {
    console.error("Error verifying transfer:", error);
    return { error: "Failed to verify transfer. Please try again." };
  }
}
async function SendTransfer({
  toAccountNumber,
  assetSymbol,
  assetType,
  amount,
  purposeId,
  note,
  inputMethod,
  idempotencyKey,
  token,
  authCookieName
}) {
  try {
    const response = await fetchServerData({
      method: "POST",
      url: "/transfers/send",
      body: {
        toAccountNumber,
        assetSymbol,
        assetType,
        amount,
        purposeId,
        note: note || "",
        inputMethod,
        idempotencyKey
      },
      token,
      authCookieName
    });
    const result = await processResponse(response);
    return result;
  } catch (error) {
    console.error("Error sending transfer:", error);
    return { error: "Transfer failed. Please try again." };
  }
}
async function getDepositRequest({
  requestMoneyId
}) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const now = /* @__PURE__ */ new Date();
  if (requestMoneyId === "expired-test") {
    const past = new Date(now.getTime() - 6e4);
    return {
      requestMoneyId: "100",
      accountNumber: "0000-0708",
      accountName: "Primary Funding Wallet",
      maskedName: "R***** B***** T********** Y***** L******* S*****",
      currency: "USD",
      amount: 100,
      reference: "101213",
      purposeId: "work_partnership",
      purposeName: "Work/Partnership",
      type: "Deposit Request",
      expiresAt: past.toISOString(),
      isPaid: false
    };
  }
  if (requestMoneyId === "paid-test") {
    return {
      requestMoneyId: "101",
      accountNumber: "0000-0708",
      accountName: "Primary Funding Wallet",
      maskedName: "R***** B***** T********** Y***** L******* S*****",
      currency: "USD",
      amount: 100,
      reference: "101213",
      purposeId: "work_partnership",
      purposeName: "Work/Partnership",
      type: "Deposit Request",
      expiresAt: new Date(now.getTime() + 18e4).toISOString(),
      isPaid: true,
      transferResult: {
        transferId: "TSCR10012",
        status: "COMPLETED",
        sender: { accountNumber: "100-1128", name: "M***** A*****", balanceAfter: 900 },
        receiver: { accountNumber: "100-708", name: "R***** B*****" },
        currency: { symbol: "USD", name: "US Dollar" },
        amount: 100,
        purpose: "Work/Partnership",
        createdAt: new Date(now.getTime() - 3e5).toISOString()
      }
    };
  }
  if (requestMoneyId === "short-test") {
    return {
      requestMoneyId: "102",
      accountNumber: "0000-0708",
      accountName: "Primary Funding Wallet",
      maskedName: "R***** B***** T********** Y***** L******* S*****",
      currency: "USD",
      amount: 50,
      reference: "998877",
      purposeId: "service_payment",
      purposeName: "Service Payment",
      type: "Deposit Request",
      expiresAt: new Date(now.getTime() + 3e4).toISOString(),
      isPaid: false
    };
  }
  return {
    requestMoneyId,
    accountNumber: "0000-0708",
    accountName: "Primary Funding Wallet",
    maskedName: "R***** B***** T********** Y***** L******* S*****",
    currency: "USD",
    amount: 100,
    reference: "101213",
    purposeId: "work_partnership",
    purposeName: "Work/Partnership",
    type: "Deposit Request",
    expiresAt: new Date(now.getTime() + 18e4).toISOString(),
    isPaid: false,
    note: ""
  };
}

// src/core/actions/wallets.ts
var wallets_exports = {};
__export(wallets_exports, {
  checkWallet: () => checkWallet,
  createWallet: () => createWallet
});
async function checkWallet({
  id,
  token,
  authCookieName
}) {
  let res = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/wallets/myAcounts`
  });
  if (!res || !res.success) {
    await createWallet({
      id,
      authCookieName
    });
  }
}
async function createWallet({
  id,
  token,
  authCookieName
}) {
  let response = await fetchServerData({
    method: "POST",
    body: JSON.stringify({
      userId: id,
      subtype: "MAIN",
      name: "Primary Funding Wallet"
    }),
    url: "/wallets?subtype=MAIN",
    token,
    authCookieName
  });
  await processResponse(response, {
    scenario: "creating wallet for user",
    userId: id
  });
  return response;
}

// src/core/actions/auth.ts
var auth_exports = {};
__export(auth_exports, {
  reSendOtp: () => reSendOtp,
  sendOtp: () => sendOtp,
  verifyMe: () => verifyMe,
  verifyOtp: () => verifyOtp
});
async function verifyMe({
  token,
  authCookieName
} = {}) {
  try {
    const finalBaseUrl = initialData.BaseUrl || "";
    if (!finalBaseUrl)
      throw new Error("baseUrl is not configured for verifyMe");
    const response = await fetchServerData({
      method: "GET",
      url: `/users/me`,
      token,
      authCookieName
    });
    return processResponse(response);
  } catch (error) {
    console.error("verifyMe Error:", error);
    throw error;
  }
}
async function sendOtp({
  phoneNumber,
  channel,
  email,
  type = "signIn"
}) {
  try {
    const response = await fetchServerData({
      method: "POST",
      body: { phoneNumber, type, channel, email },
      url: `/auth/phone/send-otp`
    });
    return processResponse(response);
  } catch (error) {
    console.error("sendOtp Error:", error);
    throw error;
  }
}
async function reSendOtp({
  phoneNumber,
  channel,
  type = "signIn"
}) {
  try {
    const response = await fetchServerData({
      method: "POST",
      body: { phoneNumber, channel, type },
      url: `/auth/phone/resend-otp`
    });
    return processResponse(response);
  } catch (error) {
    console.error("reSendOtp Error:", error);
    throw error;
  }
}
async function verifyOtp({
  phoneNumber,
  otpCode,
  msegatId,
  sessionInfo,
  type = "signIn"
}) {
  try {
    const body = {
      phoneNumber,
      otpCode,
      msegatId,
      sessionInfo,
      ...type === "signIn" ? { type } : {}
    };
    const endpoint = type === "signUp" ? "/users/phone/register" : "/auth/phone/verify";
    const response = await fetchServerData({
      method: "POST",
      body,
      url: `${endpoint}`
    });
    return processResponse(response);
  } catch (error) {
    console.error("verifyOtp Error:", error);
    throw error;
  }
}

// src/core/actions/payment-requests.ts
var payment_requests_exports = {};
__export(payment_requests_exports, {
  cancelPaymentRequest: () => cancelPaymentRequest,
  createPaymentRequest: () => createPaymentRequest,
  fulfillPaymentRequest: () => fulfillPaymentRequest,
  lookupPaymentRequest: () => lookupPaymentRequest
});
async function createPaymentRequest(input) {
  const { token, authCookieName, baseUrl: _baseUrl, local: _local, ...body } = input;
  const response = await fetchServerData({
    method: "POST",
    url: "/payment-requests",
    body,
    token,
    authCookieName
  });
  return processResponse(response);
}
async function lookupPaymentRequest(input) {
  const { code, token, authCookieName } = input;
  const response = await fetchServerData({
    method: "GET",
    url: `/payment-requests/lookup/${encodeURIComponent(code)}`,
    token,
    authCookieName
  });
  return processResponse(response);
}
async function fulfillPaymentRequest(input) {
  const { id, token, authCookieName, baseUrl: _baseUrl, local: _local, ...body } = input;
  const response = await fetchServerData({
    method: "POST",
    url: `/payment-requests/${encodeURIComponent(id)}/fulfill`,
    body,
    token,
    authCookieName
  });
  return processResponse(response);
}
async function cancelPaymentRequest(input) {
  const { id, token, authCookieName, baseUrl: _baseUrl, local: _local, ...body } = input;
  const response = await fetchServerData({
    method: "PATCH",
    url: `/payment-requests/${encodeURIComponent(id)}/cancel`,
    body,
    token,
    authCookieName
  });
  return processResponse(response);
}

// src/core/index.ts
var core = {
  banking: { ...banking_exports },
  media: { ...media_exports },
  transactions: { ...transactions_exports },
  wallets: { ...wallets_exports },
  auth: { ...auth_exports },
  paymentRequests: { ...payment_requests_exports }
};

// src/context/RDBContext.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var defaultConfig = {
  baseUrl: initialData.BaseUrl || "http://localhost:3000",
  local: initialData.Locale || "gb-en",
  handleUnauthenticated: () => console.warn("[RDB] Unauthenticated (Default Handler)"),
  isLibrary: false,
  authCookieName: "rdb_at",
  actions: void 0
};
var RDBContext = (0, import_react.createContext)(defaultConfig);
var RDBProvider = ({
  children,
  config,
  actions
}) => {
  const baseUrl = config?.baseUrl ?? defaultConfig.baseUrl;
  const local = config?.local ?? defaultConfig.local;
  const authCookieName = config?.authCookieName ?? defaultConfig.authCookieName;
  const boundActions = (0, import_react.useMemo)(() => {
    if (actions) return actions;
    const bindModule = (module2) => {
      const wrapped = {};
      Object.keys(module2).forEach((fnName) => {
        const fn = module2[fnName];
        if (typeof fn !== "function") return;
        wrapped[fnName] = (args = {}) => fn({ baseUrl, local, authCookieName, ...args });
      });
      return wrapped;
    };
    return {
      banking: bindModule(core.banking),
      media: bindModule(core.media),
      transactions: bindModule(core.transactions),
      wallets: bindModule(core.wallets),
      auth: bindModule(core.auth),
      paymentRequests: bindModule(core.paymentRequests)
    };
  }, [actions, baseUrl, local, authCookieName]);
  const contextValue = (0, import_react.useMemo)(
    () => ({
      ...defaultConfig,
      ...config,
      baseUrl,
      local,
      authCookieName,
      isLibrary: config?.isLibrary ?? (config ? true : defaultConfig.isLibrary),
      handleUnauthenticated: config?.handleUnauthenticated ?? defaultConfig.handleUnauthenticated,
      actions: boundActions
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boundActions]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RDBContext.Provider, { value: contextValue, children });
};
var useRDBContext = () => (0, import_react.useContext)(RDBContext);
var useRDBConfig = () => {
  const { actions, ...config } = (0, import_react.useContext)(RDBContext);
  return config;
};

// src/context/AuthContext.tsx
var import_react3 = require("react");

// src/core/auth/secure-cookies.ts
async function getCookies() {
  try {
    const { cookies } = await import("next/headers");
    return cookies();
  } catch (e) {
    return null;
  }
}
var isProduction = process.env.NODE_ENV === "production";
var ACCESS_TOKEN_COOKIE = "rdb_at";
var REFRESH_TOKEN_COOKIE = "rdb_rt";
var USER_DATA_COOKIE = "rdb_user";
var SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  // Prevents JavaScript access (XSS protection)
  secure: isProduction,
  // HTTPS only in production
  sameSite: "strict",
  // CSRF protection
  path: "/"
};
var USER_COOKIE_OPTIONS = {
  httpOnly: true,
  // All cookies are httpOnly - fully server-side
  secure: isProduction,
  sameSite: "strict",
  path: "/"
};
async function setAuthCookies(userData) {
  try {
    const cookieStore = await getCookies();
    if (!cookieStore) {
      console.log("Cookie store is not available setAuthCookies");
      return { success: false };
    }
    const accessTokenExpiry = userData.accessToken?.expiresAt ? new Date(userData.accessToken.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1e3);
    const refreshTokenExpiry = userData.refreshToken?.expiresAt ? new Date(userData.refreshToken.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
    if (userData.accessToken?.token) {
      cookieStore.set(ACCESS_TOKEN_COOKIE, userData.accessToken.token, {
        ...SECURE_COOKIE_OPTIONS,
        expires: accessTokenExpiry
      });
    }
    if (userData.refreshToken?.token) {
      cookieStore.set(REFRESH_TOKEN_COOKIE, userData.refreshToken.token, {
        ...SECURE_COOKIE_OPTIONS,
        expires: refreshTokenExpiry
      });
    }
    const safeUserData = userData.user;
    cookieStore.set(USER_DATA_COOKIE, JSON.stringify(safeUserData), {
      ...USER_COOKIE_OPTIONS,
      expires: accessTokenExpiry
    });
    console.log("Auth cookies set successfully");
    return { success: true };
  } catch (error) {
    console.log("set auth cookies Error:", error);
    return { success: false };
  }
}
async function clearAuthCookies() {
  try {
    const cookieStore = await getCookies();
    if (!cookieStore) {
      console.log("Cookie store is not available clearAuthCookies");
      return { success: false };
    }
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
    cookieStore.delete(USER_DATA_COOKIE);
    console.log("Auth cookies cleared successfully");
    return { success: true };
  } catch (error) {
    console.log("clear auth cookies Error:", error);
    return { success: false };
  }
}
async function getAccessToken() {
  try {
    const cookieStore = await getCookies();
    if (!cookieStore) {
      console.log("Cookie store is not available getAccessToken");
      return null;
    }
    console.log(
      "Access token retrieved from cookie:",
      cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
    );
    return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
  } catch (error) {
    console.error("getAccessToken Error:", error);
    return null;
  }
}
async function getServerUserData() {
  try {
    const cookieStore = await getCookies();
    if (!cookieStore) {
      console.log("Cookie store is not available getServerUserData");
      return null;
    }
    const userCookie = cookieStore.get(USER_DATA_COOKIE)?.value;
    if (userCookie) {
      return JSON.parse(userCookie);
    }
    return null;
  } catch (error) {
    console.error("getServerUserData Error:", error);
    return null;
  }
}
async function isAuthenticated() {
  const token = await getAccessToken();
  console.log("Authentication check - access token exists:", !!token);
  return !!token;
}
async function updateUserDataCookie(user) {
  try {
    const cookieStore = await getCookies();
    if (!cookieStore) {
      console.log("Cookie store is not available updateUserDataCookie");
      return { success: false };
    }
    const hasToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const expiry = hasToken ? new Date(Date.now() + 24 * 60 * 60 * 1e3) : new Date(Date.now() + 24 * 60 * 60 * 1e3);
    const safeUserData = user;
    cookieStore.set(USER_DATA_COOKIE, JSON.stringify(safeUserData), {
      ...USER_COOKIE_OPTIONS,
      expires: expiry
    });
    return { success: true };
  } catch (error) {
    console.error("updateUserDataCookie Error:", error);
    return { success: false };
  }
}
async function getCookiesByNames(cookieNames) {
  try {
    const cookieStore = await getCookies();
    if (!cookieStore) {
      console.log("Cookie store is not available getCookiesByNames");
      return {};
    }
    const result = {};
    for (const [key, cookieName] of Object.entries(cookieNames)) {
      result[key] = cookieStore.get(cookieName)?.value || null;
    }
    return result;
  } catch (error) {
    console.error("getCookiesByNames Error:", error);
    return {};
  }
}

// src/hooks/useUniversalRouter.tsx
var import_react2 = require("react");
var import_navigation = require("next/navigation");
var import_react_router_dom = require("react-router-dom");
var import_jsx_runtime2 = require("react/jsx-runtime");
var UniversalRouterContext = (0, import_react2.createContext)(null);
var useUniversalRouter = () => {
  const context = (0, import_react2.useContext)(UniversalRouterContext);
  const { isLibrary } = useRDBConfig();
  let nextRouter = null;
  try {
    nextRouter = (0, import_navigation.useRouter)();
  } catch {
  }
  if (isLibrary) {
    if (!context) {
      return { push: () => {
      }, replace: () => {
      }, back: () => {
      } };
    }
    return context;
  }
  return context || nextRouter;
};
var LibraryRouterAdapter = ({ children }) => {
  const navigate = (0, import_react_router_dom.useNavigate)();
  const value = {
    push: (href) => navigate(href),
    replace: (href) => navigate(href, { replace: true }),
    back: () => navigate(-1)
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(UniversalRouterContext.Provider, { value, children });
};

// src/context/AuthContext.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var AuthContext = (0, import_react3.createContext)(void 0);
function AuthProvider({
  children,
  useCookies = true,
  userData: initialUserData
}) {
  const [isUnlocked, setIsUnlocked] = (0, import_react3.useState)(false);
  const [isLoading, setIsLoading] = (0, import_react3.useState)(useCookies);
  const [userData, setUserDataState] = (0, import_react3.useState)(
    initialUserData || null
  );
  (0, import_react3.useEffect)(() => {
    console.log("AuthContext - userData changed:", userData);
  }, [userData]);
  (0, import_react3.useEffect)(() => {
    if (!useCookies) {
      return;
    }
    const loadUserData = async () => {
      try {
        const [authenticated, serverUser] = await Promise.all([
          isAuthenticated(),
          getServerUserData()
        ]);
        if (authenticated && serverUser) {
          setUserDataState({
            user: serverUser,
            accessToken: { token: "", expiresAt: "" },
            refreshToken: { token: "", expiresAt: "" }
          });
        } else {
          setUserDataState(null);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [useCookies]);
  (0, import_react3.useEffect)(() => {
    if (initialUserData) {
      setIsLoading(false);
      setUserDataState(initialUserData);
    }
  }, [initialUserData]);
  const setUserData = (newUser) => setUserDataState(newUser);
  const saveAuthCookies = async (fullUserData) => {
    setUserDataState(fullUserData);
    setIsUnlocked(true);
    if (!useCookies) return true;
    try {
      const result = await setAuthCookies(fullUserData);
      return result.success;
    } catch (error) {
      console.error("saveAuthCookies error:", error);
      return false;
    }
  };
  const removeAuthCookies = async () => {
    setUserDataState(null);
    setIsUnlocked(false);
    if (!useCookies) return;
    try {
      await clearAuthCookies();
    } catch (error) {
      console.error("removeAuthCookies error:", error);
    }
  };
  const updateUser = async (user) => {
    if (userData) {
      setUserDataState({ ...userData, user });
    }
    if (!useCookies) return true;
    try {
      const result = await updateUserDataCookie(user);
      return result.success;
    } catch (error) {
      console.error("updateUser error:", error);
      return false;
    }
  };
  const checkAuth = (0, import_react3.useCallback)(async () => {
    if (!useCookies) return !!userData;
    try {
      return await isAuthenticated();
    } catch (error) {
      console.error("checkAuth error:", error);
      return false;
    }
  }, [userData, useCookies]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    AuthContext.Provider,
    {
      value: {
        isUnlocked,
        unlock: () => setIsUnlocked(true),
        lock: () => setIsUnlocked(false),
        userData,
        setUserData,
        saveAuthCookies,
        removeAuthCookies,
        updateUser,
        checkAuth,
        isLoading
      },
      children
    }
  );
}
function useAuth() {
  const context = (0, import_react3.useContext)(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
function AuthProtected({ children }) {
  const router = useUniversalRouter();
  const { userData, checkAuth, isLoading } = useAuth();
  const [isVerified, setIsVerified] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    if (isLoading) {
      console.log("AuthProtected - waiting for auth loading...");
      return;
    }
    if (!isLoading)
      console.log("AuthProtected - auth loading complete:", { userData });
    const verifyAuth = async () => {
      const authenticated = await checkAuth();
      console.log(
        "AuthProtected - authentication check result:",
        authenticated
      );
      if (!authenticated || !userData) {
        console.log(
          "AuthProtected - not authenticated, redirecting to login",
          authenticated,
          userData
        );
        console.log("AuthProtected - redirecting to /auth");
        router.push("/auth");
      } else {
        setIsVerified(true);
      }
    };
    verifyAuth();
  }, [userData, router, checkAuth, isLoading]);
  if (isLoading || !isVerified) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children });
}

// src/context/LayoutContext.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var LayoutContext = (0, import_react4.createContext)(void 0);
function LayoutProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = (0, import_react4.useState)(false);
  const [isMobile, setIsMobile] = (0, import_react4.useState)(false);
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };
  (0, import_react4.useEffect)(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    LayoutContext.Provider,
    {
      value: {
        sidebarOpen,
        setSidebarOpen,
        isMobile
      },
      children
    }
  );
}

// src/components/providers/ClientProviders.tsx
var import_react6 = require("react");

// src/hooks/useActions.ts
function useActions() {
  const { actions } = useRDBContext();
  return actions || core;
}

// src/context/StoreContext.tsx
var import_react5 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var StoreContext = (0, import_react5.createContext)(void 0);
function mapWalletBalances(response) {
  const allBalances = {};
  if (response && !("error" in response) && response.wallets?.[0]?.balances) {
    const wallet = response.wallets[0];
    const accountName = wallet.accountName || "";
    console.log("Mapping wallet balances:", wallet);
    wallet.balances.forEach((balance) => {
      if (balance?.id) {
        allBalances[balance.assetSymbol] = {
          ...balance,
          accountType: wallet.accountType || "",
          accountNumber: wallet.accountNumber || ""
        };
      }
    });
  }
  return allBalances;
}
function mapPurposes(result) {
  if (Array.isArray(result)) {
    return result.map((p) => ({ id: p.id, label: p.name }));
  }
  return [];
}
function StoreProvider({ children }) {
  const { userData } = useAuth();
  const [currencies, setCurrencies] = (0, import_react5.useState)([]);
  const [metals, setMetals] = (0, import_react5.useState)([]);
  const [balances, setBalances] = (0, import_react5.useState)({});
  const [account, setAccount] = (0, import_react5.useState)({ name: "", type: "", number: "" });
  const [balanceHidden, setBalanceHidden] = (0, import_react5.useState)(false);
  const [activeAssetSymbol, setActiveAssetSymbol] = (0, import_react5.useState)(void 0);
  const [activeAssetType, setActiveAssetType] = (0, import_react5.useState)(void 0);
  const [transactions, setTransactions] = (0, import_react5.useState)([]);
  const [purposes, setPurposes] = (0, import_react5.useState)([]);
  const [isDataLoaded, setIsDataLoaded] = (0, import_react5.useState)(false);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = (0, import_react5.useState)(false);
  const [isLoadingMetals, setIsLoadingMetals] = (0, import_react5.useState)(false);
  const [isLoadingBalances, setIsLoadingBalances] = (0, import_react5.useState)(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = (0, import_react5.useState)(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = (0, import_react5.useState)(false);
  const [transactionPage, setTransactionPage] = (0, import_react5.useState)(0);
  const [transactionHasMore, setTransactionHasMore] = (0, import_react5.useState)(false);
  const [isLoadingPurposes, setIsLoadingPurposes] = (0, import_react5.useState)(false);
  const preloadStartedRef = (0, import_react5.useRef)(false);
  const previousUserKeyRef = (0, import_react5.useRef)(null);
  const resetStore = (0, import_react5.useCallback)(() => {
    setBalanceHidden(false);
    setCurrencies([]);
    setMetals([]);
    setBalances({});
    setAccount({ name: "", type: "", number: "" });
    setActiveAssetSymbol(void 0);
    setActiveAssetType(void 0);
    setTransactions([]);
    setPurposes([]);
    setIsDataLoaded(false);
    setIsLoadingCurrencies(false);
    setIsLoadingMetals(false);
    setIsLoadingBalances(false);
    setIsLoadingTransactions(false);
    setIsLoadingMoreTransactions(false);
    setTransactionPage(0);
    setTransactionHasMore(false);
    setIsLoadingPurposes(false);
    preloadStartedRef.current = false;
  }, []);
  (0, import_react5.useEffect)(() => {
    const userKey = userData?.user?.id || userData?.user?.phoneNumber || null;
    const previousUserKey = previousUserKeyRef.current;
    if (previousUserKey !== userKey) {
      resetStore();
      previousUserKeyRef.current = userKey;
    }
  }, [userData, resetStore]);
  const preloadData = (0, import_react5.useCallback)(
    async (actions, handleUnauthenticated) => {
      if (preloadStartedRef.current || isDataLoaded) return;
      preloadStartedRef.current = true;
      try {
        setIsLoadingCurrencies(true);
        setIsLoadingMetals(true);
        const assetsRes = await actions.banking.getSupportedAssets({});
        if (!assetsRes || "error" in assetsRes) {
          const errorCode = assetsRes?.error?.toUpperCase() || "";
          if ((errorCode === "UNAUTHENTICATED" || errorCode.includes("USER") && errorCode.includes("NOT") && errorCode.includes("FOUND")) && handleUnauthenticated) {
            handleUnauthenticated();
          }
          setIsLoadingCurrencies(false);
          setIsLoadingMetals(false);
          preloadStartedRef.current = false;
          return;
        }
        const currencyList = assetsRes?.currencies || [];
        const metalList = assetsRes?.metals || [];
        setCurrencies(currencyList);
        setMetals(metalList);
        setIsLoadingCurrencies(false);
        setIsLoadingMetals(false);
        setIsLoadingBalances(true);
        setIsLoadingPurposes(true);
        const [walletResult, purposesResult] = await Promise.allSettled([
          actions.transactions.GetWalletBalance({ currencySymbol: "USD" }),
          actions.transactions.getTransferPurposes()
        ]);
        if (walletResult.status === "fulfilled") {
          setBalances(mapWalletBalances(walletResult.value));
          setAccount({
            name: walletResult.value?.wallets?.[0]?.name || "",
            type: walletResult.value?.wallets?.[0]?.subtype || "",
            number: walletResult.value?.wallets?.[0]?.accountNumber || ""
          });
        } else {
          console.error("Error fetching wallet balances:", walletResult.reason);
        }
        setIsLoadingBalances(false);
        if (purposesResult.status === "fulfilled") {
          setPurposes(mapPurposes(purposesResult.value));
        }
        setIsLoadingPurposes(false);
        setIsLoadingTransactions(true);
        const transactionsRes = await actions.transactions.GetFinancialLedger({ page: 0, limit: 10 });
        if (transactionsRes && !("error" in transactionsRes)) {
          setTransactions(transactionsRes.items || []);
          setTransactionPage(0);
          setTransactionHasMore(transactionsRes.hasNext ?? false);
        }
        setIsLoadingTransactions(false);
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Preload error:", error);
        setIsLoadingCurrencies(false);
        setIsLoadingMetals(false);
        setIsLoadingBalances(false);
        setIsLoadingTransactions(false);
        setIsLoadingPurposes(false);
        preloadStartedRef.current = false;
      }
    },
    [isDataLoaded, userData]
  );
  const refreshTransactions = (0, import_react5.useCallback)(async (actions) => {
    if (!actions) return;
    setIsLoadingTransactions(true);
    try {
      const transactionsRes = await actions.transactions.GetFinancialLedger({ page: 0, limit: 10 });
      if (transactionsRes && !("error" in transactionsRes)) {
        setTransactions(transactionsRes.items || []);
        setTransactionPage(0);
        setTransactionHasMore(transactionsRes.hasNext ?? false);
      }
    } catch (error) {
      console.error("Error refreshing transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);
  const loadMoreTransactions = (0, import_react5.useCallback)(async (actions) => {
    if (!actions || isLoadingMoreTransactions || !transactionHasMore) return;
    setIsLoadingMoreTransactions(true);
    try {
      const nextPage = transactionPage + 1;
      const res = await actions.transactions.GetFinancialLedger({ page: nextPage, limit: 10 });
      if (res && !("error" in res)) {
        setTransactions((prev) => [...prev, ...res.items || []]);
        setTransactionPage(nextPage);
        setTransactionHasMore(res.hasNext ?? false);
      }
    } catch (error) {
      console.error("Error loading more transactions:", error);
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  }, [isLoadingMoreTransactions, transactionHasMore, transactionPage]);
  const refreshBalances = (0, import_react5.useCallback)(async (actions) => {
    if (!actions) return;
    setIsLoadingBalances(true);
    try {
      const walletResult = await actions.transactions.GetWalletBalance({
        currencySymbol: "USD"
      });
      if (walletResult && !("error" in walletResult)) {
        setBalances(mapWalletBalances(walletResult));
      }
    } catch (error) {
      console.error("Error refreshing balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    StoreContext.Provider,
    {
      value: {
        currencies,
        setCurrencies,
        metals,
        setMetals,
        balances,
        setBalances,
        account,
        setAccount,
        balanceHidden,
        setBalanceHidden,
        activeAssetSymbol,
        setActiveAssetSymbol,
        activeAssetType,
        setActiveAssetType,
        transactions,
        setTransactions,
        purposes,
        setPurposes,
        isDataLoaded,
        isLoadingCurrencies,
        isLoadingMetals,
        isLoadingBalances,
        isLoadingTransactions,
        isLoadingMoreTransactions,
        isLoadingPurposes,
        transactionHasMore,
        preloadData,
        refreshTransactions,
        loadMoreTransactions,
        refreshBalances
      },
      children
    }
  );
}
function useStore() {
  const context = (0, import_react5.useContext)(StoreContext);
  if (context === void 0) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}

// src/components/providers/ClientProviders.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
if (typeof window !== "undefined") {
  Number.prototype.toLocaleString = function() {
    return this.toString().replace(/\d/g, (d) => "0123456789"[d]);
  };
}
function ClientProviders({
  children,
  onSplashCompleteAction
}) {
  const router = useUniversalRouter();
  const actions = useActions();
  const { baseUrl, handleUnauthenticated } = useRDBConfig();
  const { userData } = useAuth();
  const { preloadData, isDataLoaded } = useStore();
  (0, import_react6.useEffect)(() => {
    console.log("Checking if we should preload data:", {
      isDataLoaded,
      userData
    });
    if (!isDataLoaded && userData) {
      preloadData(actions, handleUnauthenticated);
    }
  }, [userData, preloadData, actions, handleUnauthenticated, isDataLoaded]);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "relative bg-background h-full w-full max-h-full max-w-full overflow-hidden flex flex-col shadow-none", children });
}

// src/components/layout/RDBLayout.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var RDBLayout = ({
  children,
  onSplashCompleteAction
}) => {
  return (
    // We removed the direct next/font/google dependency to avoid runtime errors in library mode.
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: `antialiased overflow-hidden bg-background flex items-center justify-center h-full w-full font-quicksand`, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ClientProviders, { onSplashCompleteAction, children }) })
  );
};

// src/components/home/index.tsx
var import_react29 = require("react");

// src/components/home/content/nav.tsx
var import_image = __toESM(require("next/image"));

// src/assets/icons/home/addcurrency.svg
var addcurrency_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14" height="14" viewBox="0 0 14 14">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="14" height="14" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_862" data-name="Mask Group 862" clip-path="url(%23clip-path)">%0A    <g id="money-11" transform="translate(0.001)">%0A      <g id="Group_15086" data-name="Group 15086" transform="translate(0 6.08)">%0A        <g id="Group_15085" data-name="Group 15085">%0A          <path id="Path_23771" data-name="Path 23771" d="M5.073,12.579a4.739,4.739,0,0,1,.213-1.406l-.019-.04A4.755,4.755,0,0,1,2.687,8.85a3.932,3.932,0,1,0,3.593,6.884A4.716,4.716,0,0,1,5.073,12.579ZM3.6,12.148h.123a.951.951,0,0,1,.32,1.847v.576H3.284v-.576a.953.953,0,0,1-.631-.9h.764a.188.188,0,0,0,.188.188h.123a.188.188,0,1,0,0-.375H3.6a.951.951,0,0,1-.32-1.847v-.577h.764v.577a.953.953,0,0,1,.631.9H3.914a.188.188,0,0,0-.188-.188H3.6a.188.188,0,1,0,0,.375Z" transform="translate(-0.002 -8.85)" fill="%23388cff"/>%0A        </g>%0A      </g>%0A      <g id="Group_15088" data-name="Group 15088" transform="translate(5.876 6.094)">%0A        <g id="Group_15087" data-name="Group 15087">%0A          <path id="Path_23772" data-name="Path 23772" d="M13.77,8.869a4.761,4.761,0,0,1-1.947,1.986l.673.835.777-.965.595.479-.582.722h.376v.764h-.784v.333h.784v.764h-.784v.733h-.764v-.733h-.766v-.764h.766v-.333h-.766v-.764h.358l-.607-.754a4.986,4.986,0,0,1-1.528.254,4.928,4.928,0,0,1-.821-.071l-.021.065q-.04.129-.071.261a3.943,3.943,0,0,0-.1.9q0,.051,0,.1a3.932,3.932,0,0,0,7.861,0q0-.051,0-.1A3.938,3.938,0,0,0,13.77,8.869Z" transform="translate(-8.553 -8.869)" fill="%23388cff"/>%0A        </g>%0A      </g>%0A      <g id="Group_15090" data-name="Group 15090" transform="translate(2.969)">%0A        <g id="Group_15089" data-name="Group 15089">%0A          <path id="Path_23773" data-name="Path 23773" d="M8.246,0a3.924,3.924,0,1,0,3.924,3.924A3.929,3.929,0,0,0,8.246,0Zm.439,3.53v.764H8.093v.085a1.178,1.178,0,0,1-.077.42h1.57v.764H6.909V4.8h0a.421.421,0,0,0,.42-.42V4.294h-.42V3.53h.42V3.136a1.184,1.184,0,1,1,2.368,0H8.934a.42.42,0,1,0-.841,0V3.53Z" transform="translate(-4.322)" fill="%23388cff"/>%0A        </g>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/addaccount.svg
var addaccount_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14" height="14" viewBox="0 0 14 14">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="14" height="14" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_866" data-name="Mask Group 866" clip-path="url(%23clip-path)">%0A    <g id="_01" data-name="01">%0A      <path id="Path_23806" data-name="Path 23806" d="M0,0H14V14H0Z" fill="none"/>%0A      <g id="Group_15221" data-name="Group 15221">%0A        <path id="Path_23807" data-name="Path 23807" d="M4.813,11.375A3.938,3.938,0,0,1,.875,7.438V1.313a.438.438,0,1,1,.875,0V7.438A3.063,3.063,0,0,0,4.813,10.5a.437.437,0,1,1,0,.875Z" fill="%23388cff"/>%0A        <path id="Path_23808" data-name="Path 23808" d="M4.813,4.813H3.063A2.188,2.188,0,0,1,.875,2.625V1.313a.438.438,0,1,1,.875,0V2.625A1.313,1.313,0,0,0,3.063,3.938h1.75a.438.438,0,0,1,0,.875Z" fill="%23388cff"/>%0A        <path id="Path_23809" data-name="Path 23809" d="M11.813,1.951H9.481l-.324-.805A.438.438,0,0,0,8.75.875H7.438A1.313,1.313,0,0,0,6.125,2.188V5.25A1.312,1.312,0,0,0,7.438,6.563h4.375A1.312,1.312,0,0,0,13.125,5.25V3.264A1.312,1.312,0,0,0,11.813,1.951Z" fill="%23388cff"/>%0A        <path id="Path_23810" data-name="Path 23810" d="M11.813,8.514H9.481l-.324-.805a.438.438,0,0,0-.407-.271H7.438A1.312,1.312,0,0,0,6.125,8.75v3.062a1.313,1.313,0,0,0,1.313,1.313h4.375a1.312,1.312,0,0,0,1.313-1.312V9.826A1.312,1.312,0,0,0,11.813,8.514Z" fill="%23388cff"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/layout/header/eye.svg
var eye_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <g id="Group_14013" data-name="Group 14013" transform="translate(0.267 -0.094)">%0A    <path id="hidden" d="M9.372,8.335a2.5,2.5,0,0,0-2.2-3.665,1.226,1.226,0,0,0-.228.014L6.028,3.314a7.335,7.335,0,0,1,1.141-.086,8.463,8.463,0,0,1,6.717,3.744c.014.029.029.057.043.093a.357.357,0,0,1,0,.2.27.27,0,0,1-.043.093c-.007.007-.007.014-.014.021a9.19,9.19,0,0,1-3.223,2.867ZM.409,7.065C.423,7.03.438,7,.452,6.973a8.968,8.968,0,0,1,4.007-3.23L2.594.945a.357.357,0,0,1,.593-.4l8.557,12.835a.357.357,0,0,1-.1.494.352.352,0,0,1-.2.06.357.357,0,0,1-.3-.159L9.178,10.821a7.4,7.4,0,0,1-2.009.28,8.455,8.455,0,0,1-6.7-3.722C.459,7.372.459,7.365.452,7.358a.27.27,0,0,1-.043-.093.357.357,0,0,1,0-.2ZM4.916,8.237a2.5,2.5,0,0,0,3.326,1.18l-.4-.606a1.773,1.773,0,0,1-1.931-2.9l-.4-.6a2.484,2.484,0,0,0-.59,2.926ZM8.952,7.165A1.778,1.778,0,0,0,7.419,5.4L8.895,7.614A1.845,1.845,0,0,0,8.952,7.165Z" transform="translate(-0.21 -0.299)" fill="%231d1d1d"/>%0A    <rect id="Rectangle_4561" data-name="Rectangle 4561" width="14" height="14" transform="translate(-0.267 0.094)" fill="none"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/layout/header/eye-open.svg
var eye_open_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <g id="Group_eye_open" transform="translate(0.267 -0.094)">%0A    <path id="visible" d="M7.169,3.228A8.463,8.463,0,0,1,13.886,6.972c.014.029.029.057.043.093a.357.357,0,0,1,0,.2.27.27,0,0,1-.043.093A8.463,8.463,0,0,1,7.169,11.1,8.463,8.463,0,0,1,.452,7.358a.27.27,0,0,1-.043-.093.357.357,0,0,1,0-.2c.014-.036.029-.064.043-.093A8.463,8.463,0,0,1,7.169,3.228Zm0,1.415A2.5,2.5,0,1,0,9.669,7.143,2.5,2.5,0,0,0,7.169,4.643Zm0,.714A1.786,1.786,0,1,1,5.383,7.143,1.786,1.786,0,0,1,7.169,5.357Z" transform="translate(-0.21 -0.299)" fill="%231d1d1d"/>%0A    <rect id="Rectangle_4561" data-name="Rectangle 4561" width="14" height="14" transform="translate(-0.267 0.094)" fill="none"/>%0A  </g>%0A</svg>%0A';

// src/context/I18nContext.tsx
var import_react7 = require("react");

// src/i18n/locales/en.ts
var en = {
  // ─── Common ────────────────────────────────────────────
  common: {
    appName: "Ramaaz Digital Banking",
    appDescription: "Ramaaz Digital Banking System",
    logoAlt: "RDB Logo",
    scanCodeAlt: "Scan Code",
    arrowAlt: "arrow",
    lockAlt: "lock",
    flagAlt: "flag",
    cancel: "Cancel",
    history: "History",
    retry: "Retry",
    accessibility: {
      send: "Send",
      receive: "Receive",
      goBack: "Go back",
      back: "Back",
      switchCamera: "Switch camera",
      scanQrCode: "Scan QR code",
      clearInput: "Clear input",
      refreshBalance: "Refresh balance",
      sendPhoneNumber: "Send phone number",
      showBalance: "Show balance",
      hideBalance: "Hide balance"
    }
  },
  // ─── Splash Screen ────────────────────────────────────
  splash: {
    words: ["Safe.", "Easy.", "Transaction.", "Payment."]
  },
  header: {
    receive: "Receive",
    send: "Send"
  },
  // ─── Not Found ────────────────────────────────────────
  notFound: {
    code: "404",
    title: "Page Not Found",
    description: "Sorry, we couldn't find the page you're looking for.",
    goHome: "Go Home",
    trySignup: "Try Signup"
  },
  // ─── Auth ─────────────────────────────────────────────
  auth: {
    getStarted: {
      title: "Get Started !",
      description: "To Take Advantage Of All The Advantages Of The Application, Please Join Us In Quick And Easy Steps And For Just One Time",
      haveAccount: "I Have Already Account",
      newCustomer: "New Customer",
      later: "Later, Take A Look At The App"
    },
    terms: {
      toCreate: "To Create New Account Tap ",
      agreeAndContinueQuoted: '"Agree & Continue"',
      toAccept: " To Accept",
      termsOfServices: "rdb terms of services",
      termsLabel: "Terms Of Services",
      agreeButton: "Agree & Continue",
      later: "Later, Take A Look At The App"
    },
    authLayout: {
      defaultTitle: "Sign Up !"
    },
    enterPhone: {
      signUpTitle: "Sign Up !",
      signInTitle: "Sign In",
      enterPhoneInstruction: "Enter Your Phone Number Registered With Us",
      verificationInfo: "We Will Send A Verification Code To The Number",
      privacyLine1: "Your Privacy Is Completely Safe, We Not Share",
      privacyLine2: "Your Information with Anyone",
      phonePlaceholder: "Phone Number"
    },
    enterPin: {
      title: "Verify Your Account",
      enterCodePrefix: "Enter code sent via ",
      whatsapp: "WhatsApp",
      sms: "SMS",
      resendIn: "Resend code in ",
      resendCode: "Resend Code"
    },
    selectMethod: {
      info: "We Will Send A Verification Code To",
      whatsapp: "WhatsApp",
      sms: "SMS"
    },
    loginForm: {
      usernamePlaceholder: "User Name",
      userFallback: "User"
    },
    loginOptions: {
      clearLogin: "Clear Login",
      changeUser: "Change User",
      forgetPassword: "Forget Password"
    },
    otp: {
      sentSuccess: "OTP sent via {{method}}.",
      sendError: "Failed to send OTP: {{error}}",
      unexpectedError: "Unexpected response while sending OTP. Please try again.",
      invalidExpired: "Invalid or expired OTP. Please request a new code.",
      verificationFailed: "OTP verification failed.",
      verifiedSigningIn: "OTP verified \u2014 signing you in.",
      saveAuthFailed: "Failed to save authentication data."
    }
  },
  // ─── Transfer ─────────────────────────────────────────
  transfer: {
    title: "TRANSFER | SEND",
    amountInput: {
      title: "Amount to Be Sent",
      placeholder: "Enter Amount To Be Sent",
      edit: "Edit",
      error: {
        validation: "Transfer validation failed. Please try a different amount.",
        insufficient: "Insufficient balance. Your available balance is {{amount}} {{currency}}."
      }
    },
    sendTo: "Send To",
    notePlaceholder: "Enter Your Note To See On Receiver Account",
    sendButton: "Send",
    sendingButton: "Sending...",
    error: {
      generic: "Transfer failed. Please try again.",
      validateAccount: "Failed to validate account. Please try again.",
      verifyTransfer: "Failed to verify transfer. Please try again.",
      invalidAmount: "Please enter a valid amount.",
      incorrectFormat: "Incorrect Account Number. It Should Be 8 Digits In Format XXXX-XXXX."
    },
    recipient: {
      edit: "Edit",
      enter: "Enter",
      recipientAccount: "Recipient Account",
      recipientAccountNumber: "Recipient Account Number",
      or: "Or",
      phoneNumber: "Phone Number",
      paste: "Paste",
      placeholderPhone: "Phone Number like 963980033496",
      placeholderAccount: "Recipient Account Number like 0000-0016"
    },
    sender: {
      label: "Sender Account",
      refreshBalance: "Failed to refresh balance"
    },
    deposit: {
      title: "TRANSFER | SEND REQUEST",
      sendButton: "Send Deposits",
      sendingButton: "Sending...",
      expiredButton: "Expired Code ( Time Expired )",
      cancelled: "Cancelled Code",
      amountToBeSent: "Amount To Be Sent",
      referenceId: "Reference | ID",
      purposeOfRequest: "Purpose Of Money Request",
      type: "Type",
      depositRequest: "Deposit Request",
      validUntil: "Valid Until",
      expiryWarning: "Will Not Be Able To Use The Code After Its Expiry Time",
      minutesUntil: "{{minutes}} Minutes Until {{time}} | {{date}}",
      noWallet: "You don't have a wallet in {{currency}}",
      currencyMismatch: "Switched to {{currency}} wallet",
      alreadyPaid: "This request has already been paid",
      enterAmount: "Enter Amount",
      selectCurrency: "Select Currency"
    },
    receipt: {
      moneySentSuccess: "THE MONEY WAS SENT SUCCESSFULLY",
      senderAccountNumber: "Sender Account Number",
      recipientAccountNumber: "Recipient Account Number",
      amountSent: "Amount Sent",
      reference: "Reference",
      dateTime: "Date & Time",
      type: "Type",
      typeValue: "Transfer | Send",
      purpose: "Purpose Of Money Send",
      status: "Status",
      verificationCode: "Verification Code Number {{code}}",
      receiptTitle: "Receipt",
      download: "Download",
      share: "Share",
      done: "Done",
      downloaded: "Receipt downloaded",
      downloadFailed: "Failed to download receipt",
      shared: "Receipt shared",
      sharedCopied: "Receipt copied to clipboard",
      shareFailed: "Failed to share receipt",
      shareTitle: "Transfer Receipt \u2014 {{code}}",
      shareText: "Transfer of {{amount}} {{currency}}",
      statusValue: {
        completed: "Succeeded",
        pending: "Pending",
        failed: "Failed"
      }
    }
  },
  // ─── Home ─────────────────────────────────────────────
  home: {
    totalBalance: "Your Total Balance",
    totalBalanceWithCurrency: "Your Total {{currency}} Balance",
    addCurrency: "Add Currency",
    addCurrencyWithAccount: "Add {{currency}} Account",
    balanceActions: {
      statistic: "statistic",
      chart: "Chart",
      info: "Info"
    },
    allTransactions: "All Transactions",
    allTransactionsWithCurrency: "All {{currency}} Transactions",
    transactionStatus: {
      success: "Success",
      pending: "PENDING",
      failed: "Failed"
    },
    transactions: {
      transferSend: "Transfer | Send",
      transferReceive: "Transfer | Receive",
      defaultTitle: "Transaction"
    },
    deposit: {
      accountName: "Account Name",
      accountNumber: "Account Number",
      currency: "Currency"
    },
    sendChoose: {
      title: "SEND | PAY | CASH WITHDRAWAL",
      transfer: "Transfer | send",
      transferSub: "Send | Transfer Money To rdb | cash | bank",
      cashWithdrawal: "Cash Withdrawal",
      cashWithdrawalSub: "Withdrawal Via Our Centers Or Agents",
      billPayments: "Bill Payments",
      billPaymentsSub: "Pay Invoice | Bill |",
      history: "History",
      nearbyCenters: "Nearby Centers"
    },
    qr: {
      addRequest: "Request",
      generateRequest: "Generate Request",
      generatingRequest: "Generating Request\u2026",
      enterAmount: "Amount",
      enterReference: "Reference | ID",
      selectPurpose: "Purpose of Money Request",
      type: "Type",
      depositRequest: "Deposit Request",
      validUntil: "Valid Until",
      optional: "optional",
      validation: {
        amountRequired: "Amount is required",
        purposeRequired: "Purpose is required",
        validityRequired: "Validity is required",
        incorrectAccountNumber: "Incorrect Account Number. It Should Start With 1 And Consist Of 6 Digits",
        differentCurrency: "The Account Currency Is Different From The Sending Account.",
        insufficientBalance: "The amount entered exceeds your available balance."
      },
      validityDescription: "You will not be able to use the code after its expiry time.",
      note: "Enter Your Note To See On Receiver Account",
      validity: {
        always: "Always",
        m3: "3 Minute",
        m1: "1 Minute",
        m15: "15 Minute",
        h1: "1 Hour",
        h24: "24 Hour"
      },
      copy: "Copy",
      download: "Download",
      share: "Share",
      send: "Send",
      cancel: "Cancel",
      amountToSend: "Amount to Send",
      messages: {
        noWalletIdAvailable: "No Wallet ID available for this currency.",
        qrGenerated: "QR Code generated successfully!",
        qrDownloadError: "Please generate a QR code first.",
        qrDownloadSuccess: "QR Code downloaded successfully!",
        qrDownloadFailed: "Failed to download QR Code. Please try again.",
        qrPreviewError: "Failed to generate QR Code preview. Please try again.",
        qrPreviewSuccess: "QR Code preview generated successfully!",
        qrPreviewFailed: "Failed to generate QR Code preview. Please try again.",
        qrCopied: "QR Code value copied to clipboard!",
        qrCopyFailed: "Failed to copy QR Code value. Please try again.",
        qrShareSuccess: "QR Code shared successfully!",
        qrShareFailed: "Failed to share QR Code. Please try again.",
        invalidQrCode: "Invalid QR code \u2014 not a valid RDB link",
        missingWalletIdAndCurrency: "Invalid QR code \u2014 missing Wallet ID and currency",
        missingWalletId: "Invalid QR code \u2014 missing Wallet ID",
        missingCurrency: "Invalid QR code \u2014 missing currency",
        accountDataNotAvailable: "Account data not available",
        fetchingAccountDetails: "Fetching account details...",
        processingTransfer: "Processing transfer...",
        transferInitiatedSuccessfully: "Transfer initiated successfully!",
        failedToFetchAccountDetails: "Failed to fetch account details. Please try again.",
        failedToFetchAccountData: "Failed to fetch account data. Please try again.",
        invalidAmount: "Please enter a valid amount to send.",
        missingAccountInfo: "Invalid QR code \u2014 missing account information",
        missingAccountNumber: "Invalid QR code \u2014 missing account number",
        missingAccountName: "Invalid QR code \u2014 missing account name"
      },
      scanner: {
        UnableToAccessCamera: "Unable to access camera. Please check permissions.",
        title: "Scan QR Code",
        positionQRCode: "Position the QR code inside the frame",
        initializingCamera: "Initializing camera...",
        settingUpCamera: "Setting up camera...",
        readyToScan: "Ready to scan",
        tipsLabel: "Tips",
        tipsContent: "Make sure the lighting is adequate, hold your phone steady, and center the QR code within the frame.",
        readCode: "Read The Code On The Opposite Side To Take Action",
        orChoose: "Or Choose",
        sendTitle: "Send | Pay | Cash Withdrawal",
        sendDescription: "Send Money Or Pay",
        receiveTitle: "Receive | Charge My Account | Request",
        receiveDescription: "Charge Your Wallet Account Money",
        requestPermission: "Allow Camera",
        CameraNotFound: "Camera not found. Please check your device."
      }
    }
  },
  // ─── Footer Navigation ───────────────────────────────
  footer: {
    home: "Home",
    transactions: "Transactions",
    addresses: "Addresses",
    settings: "Settings"
  },
  // ─── Pages ────────────────────────────────────────────
  pages: {
    settings: "Settings",
    transactions: "Transactions",
    addresses: "Addresses"
  },
  // ─── Language Selector ────────────────────────────────
  languageSelector: {
    label: "Language",
    english: "English",
    arabic: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    turkish: "T\xFCrk\xE7e"
  },
  // ─── Profile ──────────────────────────────────────────
  profile: {
    noUserData: "No user data available",
    profileAlt: "Profile",
    fallbackInitial: "U",
    personalInfo: "Personal Information",
    email: "Email",
    verified: "\u2713 Verified",
    phoneNumber: "Phone Number",
    firstNameIcon: "F",
    firstName: "First Name",
    lastNameIcon: "L",
    lastName: "Last Name",
    addressSection: "Address",
    country: "Country",
    region: "Region",
    city: "City",
    address: "Address",
    zipCode: "Zip Code",
    accountInfo: "Account Information",
    accountStatus: "Account Status",
    blocked: "Blocked",
    active: "Active",
    twoFactor: "Two Factor Authentication",
    enabled: "Enabled",
    disabled: "Disabled",
    memberSince: "Member Since",
    logout: "Logout",
    logoutConfirmation: "Are you sure you want to logout?",
    notProvided: "Not provided"
  },
  // ─── Send ────────────────────────────────────────────────
  send: {
    header_title: "SEND | PAY | CASH WITHDRAWAL",
    purpose_select_label: "Select Purpose Of Money Send",
    note_placeholder: "Enter Your Note To See On Receiver Account",
    transfer: {
      icon_alt: "Transfer",
      label: "Transfer | send",
      description: "Send | Transfer Money To rdb | cash | bank"
    },
    withdraw: {
      icon_alt: "Withdraw",
      label: "Cash Withdrawal",
      description: "Withdrawal Via Our Centers Or Agents",
      nearby_centers: "Nearby Centers"
    },
    bills: {
      icon_alt: "Bills",
      label: "Bill Payments",
      description: "Pay Invoice | Bill |"
    }
  },
  // ─── Phone Input Countries ────────────────────────────
  countries: {
    SY: "Syria",
    TR: "Turkey",
    IQ: "Iraq",
    JO: "Jordan",
    LB: "Lebanon",
    SA: "Saudi Arabia",
    AE: "UAE",
    EG: "Egypt",
    US: "United States",
    GB: "United Kingdom",
    DE: "Germany",
    FR: "France",
    IT: "Italy",
    ES: "Spain",
    NL: "Netherlands",
    SE: "Sweden",
    KW: "Kuwait",
    QA: "Qatar",
    BH: "Bahrain",
    OM: "Oman",
    PS: "Palestine",
    YE: "Yemen",
    LY: "Libya",
    SD: "Sudan",
    TN: "Tunisia",
    DZ: "Algeria",
    MA: "Morocco",
    IN: "India",
    PK: "Pakistan",
    BD: "Bangladesh",
    CN: "China",
    JP: "Japan",
    KR: "South Korea",
    RU: "Russia",
    BR: "Brazil",
    MX: "Mexico",
    CA: "Canada",
    AU: "Australia"
  }
};
var en_default = en;

// src/i18n/locales/ar.ts
var ar = {
  // ─── Common ────────────────────────────────────────────
  common: {
    appName: "\u0631\u0645\u0627\u0632 \u0644\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0641\u064A\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629",
    appDescription: "\u0646\u0638\u0627\u0645 \u0631\u0645\u0627\u0632 \u0644\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0641\u064A\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629",
    logoAlt: "\u0634\u0639\u0627\u0631 RDB",
    scanCodeAlt: "\u0645\u0633\u062D \u0627\u0644\u0631\u0645\u0632",
    arrowAlt: "\u0633\u0647\u0645",
    lockAlt: "\u0642\u0641\u0644",
    flagAlt: "\u0639\u0644\u0645",
    cancel: "\u0625\u0644\u063A\u0627\u0621",
    history: "\u0627\u0644\u0633\u062C\u0644",
    retry: "\u0625\u0639\u0627\u062F\u0629 \u0645\u062D\u0627\u0648\u0644\u0629",
    accessibility: {
      send: "\u0625\u0631\u0633\u0627\u0644",
      receive: "\u0627\u0633\u062A\u0644\u0627\u0645",
      goBack: "\u0631\u062C\u0648\u0639",
      back: "\u0631\u062C\u0648\u0639",
      switchCamera: "\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627",
      scanQrCode: "\u0645\u0633\u062D \u0631\u0645\u0632 QR",
      clearInput: "\u0645\u0633\u062D \u0627\u0644\u0625\u062F\u062E\u0627\u0644",
      refreshBalance: "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0631\u0635\u064A\u062F",
      sendPhoneNumber: "\u0625\u0631\u0633\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
      showBalance: "\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0631\u0635\u064A\u062F",
      hideBalance: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F"
    }
  },
  // ─── Splash Screen ────────────────────────────────────
  splash: {
    words: ["\u0622\u0645\u0646.", "\u0633\u0647\u0644.", "\u062A\u062D\u0648\u064A\u0644.", "\u062F\u0641\u0639."]
  },
  header: {
    receive: "\u0627\u0633\u062A\u0644\u0627\u0645",
    send: "\u0625\u0631\u0633\u0627\u0644"
  },
  // ─── Not Found ────────────────────────────────────────
  notFound: {
    code: "404",
    title: "\u0627\u0644\u0635\u0641\u062D\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629",
    description: "\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0645 \u0646\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u064A \u062A\u0628\u062D\u062B \u0639\u0646\u0647\u0627.",
    goHome: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
    trySignup: "\u062C\u0631\u0651\u0628 \u0627\u0644\u062A\u0633\u062C\u064A\u0644"
  },
  // ─── Auth ─────────────────────────────────────────────
  auth: {
    getStarted: {
      title: "!\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646",
      description: "\u0644\u0644\u0627\u0633\u062A\u0641\u0627\u062F\u0629 \u0645\u0646 \u062C\u0645\u064A\u0639 \u0645\u0632\u0627\u064A\u0627 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u064A\u0646\u0627 \u0628\u062E\u0637\u0648\u0627\u062A \u0633\u0631\u064A\u0639\u0629 \u0648\u0633\u0647\u0644\u0629 \u0648\u0644\u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637",
      haveAccount: "\u0644\u062F\u064A\u0651 \u062D\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644",
      newCustomer: "\u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F",
      later: "\u0644\u0627\u062D\u0642\u0627\u064B\u060C \u0623\u0644\u0642\u0650 \u0646\u0638\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642"
    },
    terms: {
      toCreate: "\u0644\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u062C\u062F\u064A\u062F \u0627\u0636\u063A\u0637 ",
      agreeAndContinueQuoted: '"\u0645\u0648\u0627\u0641\u0642 \u0648\u0645\u062A\u0627\u0628\u0639\u0629"',
      toAccept: " \u0644\u0644\u0642\u0628\u0648\u0644",
      termsOfServices: "\u0634\u0631\u0648\u0637 \u062E\u062F\u0645\u0629 rdb",
      termsLabel: "\u0634\u0631\u0648\u0637 \u0627\u0644\u062E\u062F\u0645\u0629",
      agreeButton: "\u0645\u0648\u0627\u0641\u0642 \u0648\u0645\u062A\u0627\u0628\u0639\u0629",
      later: "\u0644\u0627\u062D\u0642\u0627\u064B\u060C \u0623\u0644\u0642\u0650 \u0646\u0638\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642"
    },
    authLayout: {
      defaultTitle: "!\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628"
    },
    enterPhone: {
      signUpTitle: "!\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628",
      signInTitle: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
      enterPhoneInstruction: "\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641\u0643 \u0627\u0644\u0645\u0633\u062C\u0651\u0644 \u0644\u062F\u064A\u0646\u0627",
      verificationInfo: "\u0633\u0646\u0631\u0633\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 \u0627\u0644\u0631\u0642\u0645",
      privacyLine1: "\u062E\u0635\u0648\u0635\u064A\u062A\u0643 \u0622\u0645\u0646\u0629 \u062A\u0645\u0627\u0645\u0627\u064B\u060C \u0646\u062D\u0646 \u0644\u0627 \u0646\u0634\u0627\u0631\u0643",
      privacyLine2: "\u0645\u0639\u0644\u0648\u0645\u0627\u062A\u0643 \u0645\u0639 \u0623\u064A \u0634\u062E\u0635",
      phonePlaceholder: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641"
    },
    enterPin: {
      title: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0633\u0627\u0628\u0643",
      enterCodePrefix: "\u0623\u062F\u062E\u0644 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0633\u0644 \u0639\u0628\u0631 ",
      whatsapp: "\u0648\u0627\u062A\u0633\u0627\u0628",
      sms: "\u0631\u0633\u0627\u0644\u0629 \u0646\u0635\u064A\u0629",
      resendIn: "\u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632 \u062E\u0644\u0627\u0644 ",
      resendCode: "\u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632"
    },
    selectMethod: {
      info: "\u0633\u0646\u0631\u0633\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649",
      whatsapp: "\u0648\u0627\u062A\u0633\u0627\u0628",
      sms: "\u0631\u0633\u0627\u0644\u0629 \u0646\u0635\u064A\u0629"
    },
    loginForm: {
      usernamePlaceholder: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
      userFallback: "\u0645\u0633\u062A\u062E\u062F\u0645"
    },
    loginOptions: {
      clearLogin: "\u0645\u0633\u062D \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
      changeUser: "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
      forgetPassword: "\u0646\u0633\u064A\u062A \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"
    },
    otp: {
      sentSuccess: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 {{method}}.",
      sendError: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642: {{error}}",
      unexpectedError: "\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639\u0629 \u0623\u062B\u0646\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
      invalidExpired: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629. \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F.",
      verificationFailed: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642.",
      verifiedSigningIn: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632 \u2014 \u062C\u0627\u0631\u064D \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644.",
      saveAuthFailed: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629."
    }
  },
  // ─── Transfer ─────────────────────────────────────────
  transfer: {
    title: "\u062A\u062D\u0648\u064A\u0644 | \u0625\u0631\u0633\u0627\u0644",
    amountInput: {
      title: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647",
      placeholder: "\u0623\u062F\u062E\u0644 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647",
      edit: "\u062A\u0639\u062F\u064A\u0644",
      error: {
        validation: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062A\u062D\u0648\u064A\u0644. \u064A\u0631\u062C\u0649 \u062A\u062C\u0631\u0628\u0629 \u0645\u0628\u0644\u063A \u0622\u062E\u0631.",
        insufficient: "\u0631\u0635\u064A\u062F \u063A\u064A\u0631 \u0643\u0627\u0641. \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u0645\u062A\u0627\u062D \u0647\u0648 {{amount}} {{currency}}."
      }
    },
    sendTo: "\u0625\u0631\u0633\u0627\u0644 \u0625\u0644\u0649",
    notePlaceholder: "\u0623\u062F\u062E\u0644 \u0645\u0644\u0627\u062D\u0638\u062A\u0643 \u0644\u062A\u0638\u0647\u0631 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645",
    sendButton: "\u0625\u0631\u0633\u0627\u0644",
    sendingButton: "\u062C\u0627\u0631\u064D \u0627\u0644\u0625\u0631\u0633\u0627\u0644...",
    error: {
      generic: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0648\u064A\u0644. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
      validateAccount: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0633\u0627\u0628. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
      verifyTransfer: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062A\u062D\u0648\u064A\u0644. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
      invalidAmount: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u0628\u0644\u063A \u0635\u0627\u0644\u062D.",
      incorrectFormat: "\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 8 \u0623\u0631\u0642\u0627\u0645 \u0628\u062A\u0646\u0633\u064A\u0642 XXXX-XXXX."
    },
    recipient: {
      edit: "\u062A\u0639\u062F\u064A\u0644",
      enter: "\u0623\u062F\u062E\u0644",
      recipientAccount: "\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645",
      recipientAccountNumber: "\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645",
      or: "\u0623\u0648",
      phoneNumber: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
      paste: "\u0644\u0635\u0642",
      placeholderPhone: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u062B\u0644 963980033496",
      placeholderAccount: "\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0645\u062B\u0644 0000-0016"
    },
    sender: {
      label: "\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0631\u0633\u0644",
      refreshBalance: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0631\u0635\u064A\u062F"
    },
    deposit: {
      title: "\u062A\u062D\u0648\u064A\u0644 | \u0637\u0644\u0628 \u0625\u0631\u0633\u0627\u0644",
      sendButton: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u064A\u062F\u0627\u0639\u0627\u062A",
      sendingButton: "\u062C\u0627\u0631\u064D \u0627\u0644\u0625\u0631\u0633\u0627\u0644...",
      expiredButton: "\u0631\u0645\u0632 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629 ( \u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0645\u062F\u0629 )",
      cancelled: "\u0631\u0645\u0632 \u0645\u0644\u063A\u0649",
      amountToBeSent: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647",
      referenceId: "\u0627\u0644\u0645\u0631\u062C\u0639 | \u0627\u0644\u0631\u0642\u0645",
      purposeOfRequest: "\u0627\u0644\u063A\u0631\u0636 \u0645\u0646 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644",
      type: "\u0627\u0644\u0646\u0648\u0639",
      depositRequest: "\u0637\u0644\u0628 \u0625\u064A\u062F\u0627\u0639",
      validUntil: "\u0635\u0627\u0644\u062D \u062D\u062A\u0649",
      expiryWarning: "\u0644\u0646 \u062A\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062F \u0627\u0646\u062A\u0647\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u062A\u0647",
      minutesUntil: "{{minutes}} \u062F\u0642\u0627\u0626\u0642 \u062D\u062A\u0649 {{time}} | {{date}}",
      noWallet: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0645\u062D\u0641\u0638\u0629 \u0628\u0639\u0645\u0644\u0629 {{currency}}",
      currencyMismatch: "\u062A\u0645 \u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0625\u0644\u0649 \u0645\u062D\u0641\u0638\u0629 {{currency}}",
      alreadyPaid: "\u062A\u0645 \u062F\u0641\u0639 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0628\u0627\u0644\u0641\u0639\u0644",
      enterAmount: "\u0623\u062F\u062E\u0644 \u0627\u0644\u0645\u0628\u0644\u063A",
      selectCurrency: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0639\u0645\u0644\u0629"
    },
    receipt: {
      moneySentSuccess: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0627\u0644 \u0628\u0646\u062C\u0627\u062D",
      senderAccountNumber: "\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0631\u0633\u0644",
      recipientAccountNumber: "\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645",
      amountSent: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0633\u0644",
      reference: "\u0627\u0644\u0645\u0631\u062C\u0639",
      dateTime: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0648\u0627\u0644\u0648\u0642\u062A",
      type: "\u0627\u0644\u0646\u0648\u0639",
      typeValue: "\u062A\u062D\u0648\u064A\u0644 | \u0625\u0631\u0633\u0627\u0644",
      purpose: "\u0627\u0644\u063A\u0631\u0636 \u0645\u0646 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0627\u0644",
      status: "\u0627\u0644\u062D\u0627\u0644\u0629",
      verificationCode: "\u0631\u0642\u0645 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 {{code}}",
      receiptTitle: "\u0625\u064A\u0635\u0627\u0644",
      download: "\u062A\u062D\u0645\u064A\u0644",
      share: "\u0645\u0634\u0627\u0631\u0643\u0629",
      done: "\u062A\u0645",
      downloaded: "\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u064A\u0635\u0627\u0644",
      downloadFailed: "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u064A\u0635\u0627\u0644",
      shared: "\u062A\u0645\u062A \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0625\u064A\u0635\u0627\u0644",
      sharedCopied: "\u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0625\u064A\u0635\u0627\u0644 \u0625\u0644\u0649 \u0627\u0644\u062D\u0627\u0641\u0638\u0629",
      shareFailed: "\u0641\u0634\u0644 \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0625\u064A\u0635\u0627\u0644",
      shareTitle: "\u0625\u064A\u0635\u0627\u0644 \u062A\u062D\u0648\u064A\u0644 \u2014 {{code}}",
      shareText: "\u062A\u062D\u0648\u064A\u0644 \u0628\u0642\u064A\u0645\u0629 {{amount}} {{currency}}",
      statusValue: {
        completed: "\u0646\u0627\u062C\u062D\u0629",
        pending: "\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631",
        failed: "\u0641\u0634\u0644\u062A"
      }
    }
  },
  // ─── Home ─────────────────────────────────────────────
  home: {
    totalBalance: "\u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A",
    totalBalanceWithCurrency: "\u0625\u062C\u0645\u0627\u0644\u064A \u0631\u0635\u064A\u062F {{currency}}",
    addCurrency: "\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0644\u0629",
    addCurrencyWithAccount: "\u0625\u0636\u0627\u0641\u0629 \u062D\u0633\u0627\u0628 {{currency}}",
    balanceActions: {
      statistic: "\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A",
      chart: "\u0627\u0644\u0631\u0633\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u064A",
      info: "\u0645\u0639\u0644\u0648\u0645\u0627\u062A"
    },
    allTransactions: "\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A",
    allTransactionsWithCurrency: "\u062C\u0645\u064A\u0639 \u0645\u0639\u0627\u0645\u0644\u0627\u062A {{currency}}",
    transactionStatus: {
      success: "\u0646\u0627\u062C\u062D\u0629",
      pending: "\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631",
      failed: "\u0641\u0634\u0644\u062A"
    },
    transactions: {
      transferSend: "\u062A\u062D\u0648\u064A\u0644 | \u0625\u0631\u0633\u0627\u0644",
      transferReceive: "\u062A\u062D\u0648\u064A\u0644 | \u0627\u0633\u062A\u0644\u0627\u0645",
      defaultTitle: "\u0645\u0639\u0627\u0645\u0644\u0629"
    },
    deposit: {
      accountName: "\u0627\u0633\u0645 \u0627\u0644\u062D\u0633\u0627\u0628",
      accountNumber: "\u0631\u0642\u0645 \u0627\u0644\u062D\u0633\u0627\u0628",
      currency: "\u0627\u0644\u0639\u0645\u0644\u0629"
    },
    sendChoose: {
      title: "\u0625\u0631\u0633\u0627\u0644 | \u062F\u0641\u0639 | \u0633\u062D\u0628 \u0646\u0642\u062F\u064A",
      transfer: "\u062A\u062D\u0648\u064A\u0644 | \u0625\u0631\u0633\u0627\u0644",
      transferSub: "\u0625\u0631\u0633\u0627\u0644 | \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0623\u0645\u0648\u0627\u0644 \u0625\u0644\u0649 rdb | \u0646\u0642\u062F | \u0628\u0646\u0643",
      cashWithdrawal: "\u0633\u062D\u0628 \u0646\u0642\u062F\u064A",
      cashWithdrawalSub: "\u0633\u062D\u0628 \u0639\u0628\u0631 \u0645\u0631\u0627\u0643\u0632\u0646\u0627 \u0623\u0648 \u0648\u0643\u0644\u0627\u0626\u0646\u0627",
      billPayments: "\u062F\u0641\u0639 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631",
      billPaymentsSub: "\u062F\u0641\u0639 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 | \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 |",
      history: "\u0627\u0644\u0633\u062C\u0644",
      nearbyCenters: "\u0627\u0644\u0645\u0631\u0627\u0643\u0632 \u0627\u0644\u0642\u0631\u064A\u0628\u0629"
    },
    qr: {
      addRequest: "\u0637\u0644\u0628",
      generateRequest: "\u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628",
      generatingRequest: "\u062C\u0627\u0631\u064D \u0627\u0644\u0625\u0646\u0634\u0627\u0621\u2026",
      enterAmount: "\u0623\u062F\u062E\u0644 \u0627\u0644\u0645\u0628\u0644\u063A",
      enterReference: "\u0623\u062F\u062E\u0644 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639\u064A | \u0627\u0644\u0645\u0639\u0631\u0641",
      selectPurpose: "\u0627\u062E\u062A\u0631 \u0627\u0644\u063A\u0631\u0636 \u0645\u0646 \u0637\u0644\u0628 \u0627\u0644\u0645\u0627\u0644",
      validUntil: "\u0635\u0627\u0644\u062D \u062D\u062A\u0649",
      type: "\u0627\u0644\u0646\u0648\u0639",
      depositRequest: "\u0637\u0644\u0628 \u0625\u064A\u062F\u0627\u0639",
      optional: "\u0627\u062E\u062A\u064A\u0627\u0631\u064A",
      validation: {
        amountRequired: "\u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0637\u0644\u0648\u0628",
        purposeRequired: "\u0627\u0644\u063A\u0631\u0636 \u0645\u0637\u0644\u0648\u0628",
        validityRequired: "\u0645\u062F\u0629 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629",
        incorrectAccountNumber: "\u0631\u0642\u0645 \u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 1 \u0648\u064A\u062A\u0643\u0648\u0646 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645",
        differentCurrency: "\u0639\u0645\u0644\u0629 \u0627\u0644\u062D\u0633\u0627\u0628 \u062A\u062E\u062A\u0644\u0641 \u0639\u0646 \u062D\u0633\u0627\u0628 \u0627\u0644\u0625\u0631\u0633\u0627\u0644.",
        insufficientBalance: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u064F\u062F\u062E\u0644 \u064A\u062A\u062C\u0627\u0648\u0632 \u0631\u0635\u064A\u062F\u0643 \u0627\u0644\u0645\u062A\u0627\u062D."
      },
      validityDescription: "\u0644\u0646 \u062A\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0631\u0645\u0632 \u0628\u0639\u062F \u0627\u0646\u062A\u0647\u0627\u0621 \u0648\u0642\u062A \u0635\u0644\u0627\u062D\u064A\u062A\u0647.",
      note: "\u0623\u062F\u062E\u0644 \u0645\u0644\u0627\u062D\u0638\u062A\u0643 \u0644\u062A\u0638\u0647\u0631 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645",
      validity: {
        always: "\u062F\u0627\u0626\u0645\u0627\u064B",
        m3: "3 \u062F\u0642\u0627\u0626\u0642",
        m1: "1 \u062F\u0642\u0627\u0626\u0642",
        m15: "15 \u062F\u0642\u064A\u0642\u0629",
        h1: "\u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629",
        h24: "24 \u0633\u0627\u0639\u0629"
      },
      copy: "\u0646\u0633\u062E",
      download: "\u062A\u062D\u0645\u064A\u0644",
      share: "\u0645\u0634\u0627\u0631\u0643\u0629",
      amountToSend: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0631\u0633\u0627\u0644\u0647",
      cancel: "\u0625\u0644\u063A\u0627\u0621",
      send: "\u0625\u0631\u0633\u0627\u0644",
      messages: {
        noWalletIdAvailable: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0639\u0631\u0641 \u0645\u062D\u0641\u0638\u0629 \u0645\u062A\u0627\u062D \u0644\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u0629.",
        qrGenerated: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0628\u0646\u062C\u0627\u062D!",
        qrDownloadError: "\u064A\u0631\u062C\u0649 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0623\u0648\u0644\u0627\u064B.",
        qrCopied: "\u062A\u0645 \u0646\u0633\u062E \u0642\u064A\u0645\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0625\u0644\u0649 \u0627\u0644\u062D\u0627\u0641\u0638\u0629!",
        qrCopyFailed: "\u0641\u0634\u0644 \u0641\u064A \u0646\u0633\u062E \u0642\u064A\u0645\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629.",
        qrDownloadFailed: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        qrDownloadSuccess: "\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0628\u0646\u062C\u0627\u062D!",
        qrShareSuccess: "\u0648\u0638\u064A\u0641\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.",
        qrPreviewError: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0639\u0627\u064A\u0646\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        qrPreviewFailed: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0645\u0639\u0627\u064A\u0646\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        qrPreviewSuccess: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0639\u0627\u064A\u0646\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u0628\u0646\u062C\u0627\u062D!",
        qrShareFailed: "\u0641\u0634\u0644 \u0641\u064A \u0645\u0634\u0627\u0631\u0643\u0629 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        invalidQrCode: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0644\u064A\u0633 \u0631\u0627\u0628\u0637 RDB \u0635\u0627\u0644\u062D",
        missingCurrency: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0627\u0644\u0639\u0645\u0644\u0629 \u0645\u0641\u0642\u0648\u062F\u0629",
        missingWalletId: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u062D\u0641\u0638\u0629 \u0645\u0641\u0642\u0648\u062F",
        missingWalletIdAndCurrency: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u062D\u0641\u0638\u0629 \u0648\u0627\u0644\u0639\u0645\u0644\u0629 \u0645\u0641\u0642\u0648\u062F\u0627\u0646",
        accountDataNotAvailable: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629",
        failedToFetchAccountData: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        failedToFetchAccountDetails: "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        fetchingAccountDetails: "\u062C\u0627\u0631\u064D \u062C\u0644\u0628 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628...",
        invalidAmount: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u0628\u0644\u063A \u0635\u0627\u0644\u062D \u0644\u0644\u0625\u0631\u0633\u0627\u0644.",
        processingTransfer: "\u062C\u0627\u0631\u064D \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062A\u062D\u0648\u064A\u0644...",
        transferInitiatedSuccessfully: "\u062A\u0645 \u0628\u062F\u0621 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0628\u0646\u062C\u0627\u062D!",
        missingAccountInfo: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0641\u0642\u0648\u062F\u0629",
        missingAccountName: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0627\u0633\u0645 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0641\u0642\u0648\u062F",
        missingAccountNumber: "\u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u2014 \u0631\u0642\u0645 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0641\u0642\u0648\u062F"
      },
      scanner: {
        UnableToAccessCamera: "\u063A\u064A\u0631 \u0642\u0627\u062F\u0631 \u0639\u0644\u0649 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627. \u064A\u0631\u062C\u0649 \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627 \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629.",
        title: "\u0645\u0633\u062D \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629",
        positionQRCode: "\u0636\u0639 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u0625\u0637\u0627\u0631",
        initializingCamera: "\u062C\u0627\u0631\u064D \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627...",
        settingUpCamera: "\u062C\u0627\u0631\u064D \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627...",
        readyToScan: "\u062C\u0627\u0647\u0632 \u0644\u0644\u0645\u0633\u062D",
        tipsLabel: "\u0646\u0635\u0627\u0626\u062D",
        tipsContent: "\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0627\u0644\u0625\u0636\u0627\u0621\u0629 \u0643\u0627\u0641\u064A\u0629\u060C \u0648\u0627\u0645\u0633\u0643 \u0647\u0627\u062A\u0641\u0643 \u0628\u062B\u0628\u0627\u062A\u060C \u0648\u0645\u0631\u0643\u0632 \u0631\u0645\u0632 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0639\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u0625\u0637\u0627\u0631.",
        readCode: "\u0627\u0642\u0631\u0623 \u0627\u0644\u0643\u0648\u062F \u0641\u064A \u0627\u0644\u062C\u0627\u0646\u0628 \u0627\u0644\u0645\u0642\u0627\u0628\u0644 \u0644\u0627\u062A\u062E\u0627\u0630 \u0644\u0625\u062C\u0631\u0627\u0621",
        orChoose: "\u0623\u0648 \u0627\u062E\u062A\u0631",
        sendTitle: "\u0625\u0631\u0633\u0627\u0644 | \u062F\u0641\u0639 | \u0633\u062D\u0628 \u0646\u0642\u062F\u064A",
        sendDescription: "\u0623\u0631\u0633\u0644 \u0646\u0642\u0648\u062F\u0627\u064B \u0623\u0648 \u0627\u062F\u0641\u0639",
        receiveTitle: "\u0627\u0633\u062A\u0644\u0627\u0645 | \u0634\u062D\u0646 \u062D\u0633\u0627\u0628\u064A | \u0637\u0644\u0628",
        receiveDescription: "\u0627\u0634\u062D\u0646 \u0645\u062D\u0641\u0638\u062A\u0643 \u0628\u0627\u0644\u0645\u0627\u0644",
        requestPermission: "\u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627",
        CameraNotFound: "\u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062C\u0647\u0627\u0632\u0643."
      }
    }
  },
  // ─── Footer Navigation ───────────────────────────────
  footer: {
    home: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
    transactions: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A",
    addresses: "\u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646",
    settings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A"
  },
  // ─── Pages ────────────────────────────────────────────
  pages: {
    settings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
    transactions: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A",
    addresses: "\u0627\u0644\u0639\u0646\u0627\u0648\u064A\u0646"
  },
  // ─── Language Selector ────────────────────────────────
  languageSelector: {
    label: "\u0627\u0644\u0644\u063A\u0629",
    english: "English",
    arabic: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    turkish: "T\xFCrk\xE7e"
  },
  // ─── Profile ──────────────────────────────────────────
  profile: {
    noUserData: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0633\u062A\u062E\u062F\u0645",
    profileAlt: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A",
    fallbackInitial: "\u0645",
    personalInfo: "\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629",
    email: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
    verified: "\u2713 \u0645\u0648\u062B\u0651\u0642",
    phoneNumber: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
    firstNameIcon: "\u0623",
    firstName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644",
    lastNameIcon: "\u0639",
    lastName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629",
    addressSection: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
    country: "\u0627\u0644\u062F\u0648\u0644\u0629",
    region: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629",
    city: "\u0627\u0644\u0645\u062F\u064A\u0646\u0629",
    address: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
    zipCode: "\u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064A\u062F\u064A",
    accountInfo: "\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628",
    accountStatus: "\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0633\u0627\u0628",
    blocked: "\u0645\u062D\u0638\u0648\u0631",
    active: "\u0646\u0634\u0637",
    twoFactor: "\u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629",
    enabled: "\u0645\u0641\u0639\u0651\u0644",
    disabled: "\u0645\u0639\u0637\u0651\u0644",
    memberSince: "\u0639\u0636\u0648 \u0645\u0646\u0630",
    logout: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C",
    logoutConfirmation: "\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0623\u0646\u0643 \u062A\u0631\u064A\u062F \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C\u061F",
    notProvided: "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631"
  },
  // ─── Send ────────────────────────────────────────────────
  send: {
    header_title: "\u0625\u0631\u0633\u0627\u0644 | \u062F\u0641\u0639 | \u0633\u062D\u0628 \u0646\u0642\u062F\u064A",
    purpose_select_label: "\u0627\u062E\u0631 \u063A\u0631\u0636 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0623\u0645\u0648\u0627\u0644",
    note_placeholder: "\u0623\u062F\u062E\u0644 \u0645\u0644\u0627\u062D\u0638\u062A\u0643 \u0644\u062A\u0638\u0647\u0631 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645",
    transfer: {
      icon_alt: "\u062A\u062D\u0648\u064A\u0644",
      label: "\u062A\u062D\u0648\u064A\u0644 | \u0625\u0631\u0633\u0627\u0644",
      description: "\u0625\u0631\u0633\u0627\u0644 | \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0623\u0645\u0648\u0627\u0644 \u0625\u0644\u0649 rdb | \u0646\u0642\u062F | \u0628\u0646\u0643"
    },
    withdraw: {
      icon_alt: "\u0633\u062D\u0628",
      label: "\u0633\u062D\u0628 \u0646\u0642\u062F\u064A",
      description: "\u0633\u062D\u0628 \u0639\u0628\u0631 \u0645\u0631\u0627\u0643\u0632\u0646\u0627 \u0623\u0648 \u0648\u0643\u0644\u0627\u0626\u0646\u0627",
      nearby_centers: "\u0627\u0644\u0645\u0631\u0627\u0643\u0632 \u0627\u0644\u0642\u0631\u064A\u0628\u0629"
    },
    bills: {
      icon_alt: "\u0641\u0648\u0627\u062A\u064A\u0631",
      label: "\u062F\u0641\u0639 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631",
      description: "\u062F\u0641\u0639 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 | \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 |"
    }
  },
  // ─── Phone Input Countries ────────────────────────────
  countries: {
    SY: "\u0633\u0648\u0631\u064A\u0627",
    TR: "\u062A\u0631\u0643\u064A\u0627",
    IQ: "\u0627\u0644\u0639\u0631\u0627\u0642",
    JO: "\u0627\u0644\u0623\u0631\u062F\u0646",
    LB: "\u0644\u0628\u0646\u0627\u0646",
    SA: "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629",
    AE: "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A",
    EG: "\u0645\u0635\u0631",
    US: "\u0627\u0644\u0648\u0644\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u062D\u062F\u0629",
    GB: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629",
    DE: "\u0623\u0644\u0645\u0627\u0646\u064A\u0627",
    FR: "\u0641\u0631\u0646\u0633\u0627",
    IT: "\u0625\u064A\u0637\u0627\u0644\u064A\u0627",
    ES: "\u0625\u0633\u0628\u0627\u0646\u064A\u0627",
    NL: "\u0647\u0648\u0644\u0646\u062F\u0627",
    SE: "\u0627\u0644\u0633\u0648\u064A\u062F",
    KW: "\u0627\u0644\u0643\u0648\u064A\u062A",
    QA: "\u0642\u0637\u0631",
    BH: "\u0627\u0644\u0628\u062D\u0631\u064A\u0646",
    OM: "\u0639\u064F\u0645\u0627\u0646",
    PS: "\u0641\u0644\u0633\u0637\u064A\u0646",
    YE: "\u0627\u0644\u064A\u0645\u0646",
    LY: "\u0644\u064A\u0628\u064A\u0627",
    SD: "\u0627\u0644\u0633\u0648\u062F\u0627\u0646",
    TN: "\u062A\u0648\u0646\u0633",
    DZ: "\u0627\u0644\u062C\u0632\u0627\u0626\u0631",
    MA: "\u0627\u0644\u0645\u063A\u0631\u0628",
    IN: "\u0627\u0644\u0647\u0646\u062F",
    PK: "\u0628\u0627\u0643\u0633\u062A\u0627\u0646",
    BD: "\u0628\u0646\u063A\u0644\u0627\u062F\u064A\u0634",
    CN: "\u0627\u0644\u0635\u064A\u0646",
    JP: "\u0627\u0644\u064A\u0627\u0628\u0627\u0646",
    KR: "\u0643\u0648\u0631\u064A\u0627 \u0627\u0644\u062C\u0646\u0648\u0628\u064A\u0629",
    RU: "\u0631\u0648\u0633\u064A\u0627",
    BR: "\u0627\u0644\u0628\u0631\u0627\u0632\u064A\u0644",
    MX: "\u0627\u0644\u0645\u0643\u0633\u064A\u0643",
    CA: "\u0643\u0646\u062F\u0627",
    AU: "\u0623\u0633\u062A\u0631\u0627\u0644\u064A\u0627"
  }
};
var ar_default = ar;

// src/i18n/locales/tr.ts
var tr = {
  // ─── Common ────────────────────────────────────────────
  common: {
    appName: "Ramaaz Digital Bankac\u0131l\u0131k",
    appDescription: "Ramaaz Dijital Bankac\u0131l\u0131k Sistemi",
    logoAlt: "RDB Logosu",
    scanCodeAlt: "Kodu Tara",
    arrowAlt: "ok",
    lockAlt: "kilit",
    flagAlt: "bayrak",
    cancel: "\u0130ptal",
    history: "Ge\xE7mi\u015F",
    retry: "Yeniden Dene",
    accessibility: {
      send: "G\xF6nder",
      receive: "Al",
      goBack: "Geri d\xF6n",
      back: "Geri",
      switchCamera: "Kamera de\u011Fi\u015Ftir",
      scanQrCode: "QR kodu tara",
      clearInput: "Giri\u015Fi temizle",
      refreshBalance: "Bakiyeyi yenile",
      sendPhoneNumber: "Telefon numaras\u0131 g\xF6nder",
      showBalance: "Bakiyeyi g\xF6ster",
      hideBalance: "Bakiyeyi gizle"
    }
  },
  // ─── Splash Screen ────────────────────────────────────
  splash: {
    words: ["G\xFCvenli.", "Kolay.", "\u0130\u015Flem.", "\xD6deme."]
  },
  header: {
    receive: "Al",
    send: "G\xF6nder"
  },
  // ─── Not Found ────────────────────────────────────────
  notFound: {
    code: "404",
    title: "Sayfa Bulunamad\u0131",
    description: "\xDCzg\xFCn\xFCz, arad\u0131\u011F\u0131n\u0131z sayfay\u0131 bulamad\u0131k.",
    goHome: "Ana Sayfaya D\xF6n",
    trySignup: "Kaydolmay\u0131 Dene"
  },
  // ─── Auth ─────────────────────────────────────────────
  auth: {
    getStarted: {
      title: "Ba\u015Fla !",
      description: "Uygulaman\u0131n T\xFCm Avantajlar\u0131ndan Yararlanmak \u0130\xE7in L\xFCtfen H\u0131zl\u0131 ve Kolay Ad\u0131mlarla Bize Kat\u0131l\u0131n",
      haveAccount: "Zaten Hesab\u0131m Var",
      newCustomer: "Yeni M\xFC\u015Fteri",
      later: "Daha Sonra, Uygulamaya G\xF6z At"
    },
    terms: {
      toCreate: "Yeni Hesap Olu\u015Fturmak \u0130\xE7in Dokunun ",
      agreeAndContinueQuoted: '"Kabul Et & Devam Et"',
      toAccept: " Kabul Etmek \u0130\xE7in",
      termsOfServices: "rdb hizmet \u015Fartlar\u0131",
      termsLabel: "Hizmet \u015Eartlar\u0131",
      agreeButton: "Kabul Et & Devam Et",
      later: "Daha Sonra, Uygulamaya G\xF6z At"
    },
    authLayout: {
      defaultTitle: "Kaydol !"
    },
    enterPhone: {
      signUpTitle: "Kaydol !",
      signInTitle: "Giri\u015F Yap",
      enterPhoneInstruction: "Bizde Kay\u0131tl\u0131 Olan Telefon Numaran\u0131z\u0131 Girin",
      verificationInfo: "Numaraya Bir Do\u011Frulama Kodu G\xF6nderece\u011Fiz",
      privacyLine1: "Gizlili\u011Finiz Tamamen G\xFCvende, Bilgilerinizi",
      privacyLine2: "Kimseyle Payla\u015Fm\u0131yoruz",
      phonePlaceholder: "Telefon Numaras\u0131"
    },
    enterPin: {
      title: "Hesab\u0131n\u0131z\u0131 Do\u011Frulay\u0131n",
      enterCodePrefix: "\u015Eununla g\xF6nderilen kodu girin: ",
      whatsapp: "WhatsApp",
      sms: "SMS",
      resendIn: "Kodu tekrar g\xF6nder: ",
      resendCode: "Kodu Tekrar G\xF6nder"
    },
    selectMethod: {
      info: "Do\u011Frulama Kodunu \u015Euraya G\xF6nderece\u011Fiz",
      whatsapp: "WhatsApp",
      sms: "SMS"
    },
    loginForm: {
      usernamePlaceholder: "Kullan\u0131c\u0131 Ad\u0131",
      userFallback: "Kullan\u0131c\u0131"
    },
    loginOptions: {
      clearLogin: "Giri\u015Fi Temizle",
      changeUser: "Kullan\u0131c\u0131 De\u011Fi\u015Ftir",
      forgetPassword: "\u015Eifremi Unuttum"
    },
    otp: {
      sentSuccess: "OTP {{method}} ile g\xF6nderildi.",
      sendError: "OTP g\xF6nderilemedi: {{error}}",
      unexpectedError: "OTP g\xF6nderilirken beklenmedik yan\u0131t. L\xFCtfen tekrar deneyin.",
      invalidExpired: "Ge\xE7ersiz veya s\xFCresi dolmu\u015F OTP. L\xFCtfen yeni kod isteyin.",
      verificationFailed: "OTP do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z.",
      verifiedSigningIn: "OTP do\u011Fruland\u0131 \u2014 giri\u015F yap\u0131l\u0131yor.",
      saveAuthFailed: "Kimlik do\u011Frulama verileri kaydedilemedi."
    }
  },
  // ─── Transfer ─────────────────────────────────────────
  transfer: {
    title: "TRANSFER | G\xD6NDER",
    amountInput: {
      title: "G\xF6nderilecek Tutar",
      placeholder: "G\xF6nderilecek Tutar\u0131 Girin",
      edit: "D\xFCzenle",
      error: {
        validation: "Transfer do\u011Frulamas\u0131 ba\u015Far\u0131s\u0131z oldu. L\xFCtfen farkl\u0131 bir tutar deneyin.",
        insufficient: "Yetersiz bakiye. Mevcut bakiyeniz {{amount}} {{currency}}."
      }
    },
    sendTo: "Al\u0131c\u0131",
    notePlaceholder: "Al\u0131c\u0131 Hesab\u0131nda G\xF6r\xFCnecek Notunuzu Girin",
    sendButton: "G\xF6nder",
    sendingButton: "G\xF6nderiliyor...",
    error: {
      generic: "Transfer ba\u015Far\u0131s\u0131z oldu. L\xFCtfen tekrar deneyin.",
      validateAccount: "Hesap do\u011Frulanamad\u0131. L\xFCtfen tekrar deneyin.",
      verifyTransfer: "Transfer do\u011Frulanamad\u0131. L\xFCtfen tekrar deneyin.",
      invalidAmount: "L\xFCtfen ge\xE7erli bir tutar girin.",
      incorrectFormat: "Hatal\u0131 Hesap Numaras\u0131. XXXX-XXXX format\u0131nda 8 hane olmal\u0131d\u0131r."
    },
    recipient: {
      edit: "D\xFCzenle",
      enter: "Gir",
      recipientAccount: "Al\u0131c\u0131 Hesab\u0131",
      recipientAccountNumber: "Al\u0131c\u0131 Hesap Numaras\u0131",
      or: "Veya",
      phoneNumber: "Telefon Numaras\u0131",
      paste: "Yap\u0131\u015Ft\u0131r",
      placeholderPhone: "Telefon Numaras\u0131 \xF6rn. 905xxxxxxxxx",
      placeholderAccount: "Al\u0131c\u0131 Hesap Numaras\u0131 \xF6rn. 0000-0016"
    },
    sender: {
      label: "G\xF6nderen Hesab\u0131",
      refreshBalance: "Bakiye yenilenemedi"
    },
    deposit: {
      title: "TRANSFER | G\xD6NDER \u0130STE\u011E\u0130",
      sendButton: "Mevduat G\xF6nder",
      sendingButton: "G\xF6nderiliyor...",
      expiredButton: "S\xFCresi Dolmu\u015F Kod ( S\xFCre Doldu )",
      cancelled: "\u0130ptal Edilmi\u015F Kod",
      amountToBeSent: "G\xF6nderilecek Tutar",
      referenceId: "Referans | Kimlik",
      purposeOfRequest: "Para \u0130ste\u011Fi Amac\u0131",
      type: "T\xFCr",
      depositRequest: "Mevduat \u0130ste\u011Fi",
      validUntil: "Ge\xE7erlilik S\xFCresi",
      expiryWarning: "Sona Erme S\xFCresinden Sonra Kodu Kullanamazs\u0131n\u0131z",
      minutesUntil: "{{minutes}} Dakika Kald\u0131 {{time}} | {{date}}",
      noWallet: "{{currency}} c\xFCzdan\u0131n\u0131z yok",
      currencyMismatch: "{{currency}} c\xFCzdan\u0131na ge\xE7ildi",
      alreadyPaid: "Bu istek zaten \xF6denmi\u015F",
      enterAmount: "Tutar Girin",
      selectCurrency: "Para Birimi Se\xE7in"
    },
    receipt: {
      moneySentSuccess: "PARA BA\u015EARIYLA G\xD6NDER\u0130LD\u0130",
      senderAccountNumber: "G\xF6nderen Hesap Numaras\u0131",
      recipientAccountNumber: "Al\u0131c\u0131 Hesap Numaras\u0131",
      amountSent: "G\xF6nderilen Tutar",
      reference: "Referans",
      dateTime: "Tarih & Saat",
      type: "T\xFCr",
      typeValue: "Transfer | G\xF6nder",
      purpose: "Para G\xF6nderme Amac\u0131",
      status: "Durum",
      verificationCode: "Do\u011Frulama Kodu Numaras\u0131 {{code}}",
      receiptTitle: "Makbuz",
      download: "\u0130ndir",
      share: "Payla\u015F",
      done: "Tamam",
      downloaded: "Makbuz indirildi",
      downloadFailed: "Makbuz indirilemedi",
      shared: "Makbuz payla\u015F\u0131ld\u0131",
      sharedCopied: "Makbuz panoya kopyaland\u0131",
      shareFailed: "Makbuz payla\u015F\u0131lamad\u0131",
      shareTitle: "Transfer Makbuzu \u2014 {{code}}",
      shareText: "{{amount}} {{currency}} transferi",
      statusValue: {
        completed: "Ba\u015Far\u0131l\u0131",
        pending: "Beklemede",
        failed: "Ba\u015Far\u0131s\u0131z"
      }
    }
  },
  // ─── Home ─────────────────────────────────────────────
  home: {
    totalBalance: "Toplam Bakiyeniz",
    totalBalanceWithCurrency: "Toplam {{currency}} Bakiyeniz",
    addCurrency: "Para Birimi Ekle",
    addCurrencyWithAccount: "{{currency}} Hesab\u0131 Ekle",
    balanceActions: {
      statistic: "istatistik",
      chart: "Grafik",
      info: "Bilgi"
    },
    allTransactions: "T\xFCm \u0130\u015Flemler",
    allTransactionsWithCurrency: "T\xFCm {{currency}} \u0130\u015Flemleri",
    transactionStatus: {
      success: "Ba\u015Far\u0131l\u0131",
      pending: "BEKLEMEDE",
      failed: "Ba\u015Far\u0131s\u0131z"
    },
    transactions: {
      transferSend: "Transfer | G\xF6nder",
      transferReceive: "Transfer | Al",
      defaultTitle: "\u0130\u015Flem"
    },
    deposit: {
      accountName: "Hesap Ad\u0131",
      accountNumber: "Hesap Numaras\u0131",
      currency: "Para Birimi"
    },
    sendChoose: {
      title: "G\xD6NDER | \xD6DE | NAK\u0130T \xC7EKME",
      transfer: "Transfer | g\xF6nder",
      transferSub: "G\xF6nder | Para Transferi rdb | nakit | banka",
      cashWithdrawal: "Nakit \xC7ekme",
      cashWithdrawalSub: "Merkezlerimiz veya Acentelerimiz Arac\u0131l\u0131\u011F\u0131yla Para \xC7ekme",
      billPayments: "Fatura \xD6demeleri",
      billPaymentsSub: "Fatura \xD6de | Fatura |",
      history: "Ge\xE7mi\u015F",
      nearbyCenters: "Yak\u0131ndaki Merkezler"
    },
    qr: {
      addRequest: "Talep Et",
      generateRequest: "Talep Olu\u015Ftur",
      generatingRequest: "Talep Olu\u015Fturuluyor\u2026",
      enterAmount: "Tutar",
      enterReference: "Referans | ID",
      selectPurpose: "Para Talep Amac\u0131",
      type: "T\xFCr",
      depositRequest: "Para Yat\u0131rma Talebi",
      validUntil: "Ge\xE7erlilik Tarihi",
      optional: "iste\u011Fe ba\u011Fl\u0131",
      validation: {
        amountRequired: "Tutar gerekli",
        purposeRequired: "Ama\xE7 gerekli",
        validityRequired: "Ge\xE7erlilik s\xFCresi gerekli",
        incorrectAccountNumber: "Hatal\u0131 Hesap Numaras\u0131. 1 ile ba\u015Flamal\u0131 ve 6 haneli olmal\u0131d\u0131r",
        differentCurrency: "Hesap Para Birimi G\xF6nderen Hesaptan Farkl\u0131.",
        insufficientBalance: "Girilen tutar kullan\u0131labilir bakiyenizi a\u015F\u0131yor."
      },
      validityDescription: "S\xFCresi dolduktan sonra kodu kullanamazs\u0131n\u0131z.",
      note: "Al\u0131c\u0131 Hesab\u0131nda G\xF6r\xFCnecek Notunuzu Girin",
      validity: {
        always: "Her Zaman",
        m3: "3 Dakika",
        m1: "1 Dakika",
        m15: "15 Dakika",
        h1: "1 Saat",
        h24: "24 Saat"
      },
      copy: "Kopyala",
      download: "\u0130ndir",
      share: "Payla\u015F",
      send: "G\xF6nder",
      cancel: "\u0130ptal",
      amountToSend: "G\xF6nderilecek Tutar",
      messages: {
        noWalletIdAvailable: "Bu para birimi i\xE7in C\xFCzdan ID mevcut de\u011Fil.",
        qrGenerated: "QR Kodu ba\u015Far\u0131yla olu\u015Fturuldu!",
        qrDownloadError: "L\xFCtfen \xF6nce bir QR kodu olu\u015Fturun.",
        qrDownloadSuccess: "QR Kodu ba\u015Far\u0131yla indirildi!",
        qrDownloadFailed: "QR Kodu indirilemedi. L\xFCtfen tekrar deneyin.",
        qrPreviewError: "QR Kodu \xF6nizlemesi olu\u015Fturulamad\u0131. L\xFCtfen tekrar deneyin.",
        qrPreviewSuccess: "QR Kodu \xF6nizlemesi ba\u015Far\u0131yla olu\u015Fturuldu!",
        qrPreviewFailed: "QR Kodu \xF6nizlemesi olu\u015Fturulamad\u0131. L\xFCtfen tekrar deneyin.",
        qrCopied: "QR Kodu de\u011Feri panoya kopyaland\u0131!",
        qrCopyFailed: "QR Kodu de\u011Feri kopyalanamad\u0131. L\xFCtfen tekrar deneyin.",
        qrShareSuccess: "QR Kodu ba\u015Far\u0131yla payla\u015F\u0131ld\u0131!",
        qrShareFailed: "QR Kodu payla\u015F\u0131lamad\u0131. L\xFCtfen tekrar deneyin.",
        invalidQrCode: "Ge\xE7ersiz QR kodu \u2014 ge\xE7erli bir RDB ba\u011Flant\u0131s\u0131 de\u011Fil",
        missingWalletIdAndCurrency: "Ge\xE7ersiz QR kodu \u2014 C\xFCzdan ID ve para birimi eksik",
        missingWalletId: "Ge\xE7ersiz QR kodu \u2014 C\xFCzdan ID eksik",
        missingCurrency: "Ge\xE7ersiz QR kodu \u2014 para birimi eksik",
        accountDataNotAvailable: "Hesap verisi mevcut de\u011Fil",
        fetchingAccountDetails: "Hesap detaylar\u0131 getiriliyor...",
        processingTransfer: "Transfer i\u015Fleniyor...",
        transferInitiatedSuccessfully: "Transfer ba\u015Far\u0131yla ba\u015Flat\u0131ld\u0131!",
        failedToFetchAccountDetails: "Hesap detaylar\u0131 getirilemedi. L\xFCtfen tekrar deneyin.",
        failedToFetchAccountData: "Hesap verisi getirilemedi. L\xFCtfen tekrar deneyin.",
        invalidAmount: "L\xFCtfen g\xF6nderilecek ge\xE7erli bir tutar girin.",
        missingAccountInfo: "Ge\xE7ersiz QR kodu \u2014 hesap bilgisi eksik",
        missingAccountNumber: "Ge\xE7ersiz QR kodu \u2014 hesap numaras\u0131 eksik",
        missingAccountName: "Ge\xE7ersiz QR kodu \u2014 hesap ad\u0131 eksik"
      },
      scanner: {
        UnableToAccessCamera: "Kameraya eri\u015Filemiyor. L\xFCtfen izinleri kontrol edin.",
        title: "QR Kodu Tara",
        positionQRCode: "QR kodunu \xE7er\xE7evenin i\xE7ine yerle\u015Ftirin",
        initializingCamera: "Kamera ba\u015Flat\u0131l\u0131yor...",
        settingUpCamera: "Kamera ayarlan\u0131yor...",
        readyToScan: "Taramaya haz\u0131r",
        tipsLabel: "\u0130pu\xE7lar\u0131",
        tipsContent: "I\u015F\u0131\u011F\u0131n yeterli oldu\u011Fundan emin olun, telefonunuzu sabit tutun ve QR kodunu \xE7er\xE7eve i\xE7inde ortalay\u0131n.",
        readCode: "\u0130\u015Flem Yapmak \u0130\xE7in Kar\u015F\u0131 Taraftaki Kodu Okuyun",
        orChoose: "Veya Se\xE7in",
        sendTitle: "G\xF6nder | \xD6de | Nakit \xC7ek",
        sendDescription: "Para G\xF6nder Veya \xD6de",
        receiveTitle: "Al | Hesab\u0131m\u0131 Doldur | Talep Et",
        receiveDescription: "C\xFCzdan Hesab\u0131n\u0131za Para Y\xFCkleyin",
        requestPermission: "Kameraya \u0130zin Ver",
        CameraNotFound: "Kamera bulunamad\u0131. L\xFCtfen cihaz\u0131n\u0131z\u0131 kontrol edin."
      }
    }
  },
  // ─── Footer Navigation ───────────────────────────────
  footer: {
    home: "Ana Sayfa",
    transactions: "\u0130\u015Flemler",
    addresses: "Adresler",
    settings: "Ayarlar"
  },
  // ─── Pages ────────────────────────────────────────────
  pages: {
    settings: "Ayarlar",
    transactions: "\u0130\u015Flemler",
    addresses: "Adresler"
  },
  // ─── Language Selector ────────────────────────────────
  languageSelector: {
    label: "Dil",
    english: "English",
    arabic: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    turkish: "T\xFCrk\xE7e"
  },
  // ─── Profile ──────────────────────────────────────────
  profile: {
    noUserData: "Kullan\u0131c\u0131 verisi yok",
    profileAlt: "Profil",
    fallbackInitial: "K",
    personalInfo: "Ki\u015Fisel Bilgiler",
    email: "E-posta",
    verified: "\u2713 Do\u011Fruland\u0131",
    phoneNumber: "Telefon Numaras\u0131",
    firstNameIcon: "A",
    firstName: "Ad",
    lastNameIcon: "S",
    lastName: "Soyad",
    addressSection: "Adres",
    country: "\xDClke",
    region: "B\xF6lge",
    city: "\u015Eehir",
    address: "Adres",
    zipCode: "Posta Kodu",
    accountInfo: "Hesap Bilgileri",
    accountStatus: "Hesap Durumu",
    blocked: "Engellendi",
    active: "Aktif",
    twoFactor: "\u0130ki Fakt\xF6rl\xFC Kimlik Do\u011Frulama",
    enabled: "Etkin",
    disabled: "Devre D\u0131\u015F\u0131",
    memberSince: "\xDCyelik Tarihi",
    logout: "\xC7\u0131k\u0131\u015F Yap",
    logoutConfirmation: "\xC7\u0131k\u0131\u015F yapmak istedi\u011Finize emin misiniz?",
    notProvided: "Belirtilmedi"
  },
  // ─── Send ────────────────────────────────────────────────
  send: {
    header_title: "G\xD6NDER | \xD6DE | NAK\u0130T \xC7EKME",
    purpose_select_label: "Para G\xF6nderme Amac\u0131n\u0131 Se\xE7in",
    note_placeholder: "Al\u0131c\u0131 Hesab\u0131nda G\xF6r\xFCnecek Notunuzu Girin",
    transfer: {
      icon_alt: "Transfer",
      label: "Transfer | g\xF6nder",
      description: "G\xF6nder | Para Transferi rdb | nakit | banka"
    },
    withdraw: {
      icon_alt: "Nakit \xC7ekme",
      label: "Nakit \xC7ekme",
      description: "Merkezlerimiz veya Acentelerimiz Arac\u0131l\u0131\u011F\u0131yla Para \xC7ekme",
      nearby_centers: "Yak\u0131ndaki Merkezler"
    },
    bills: {
      icon_alt: "Faturalar",
      label: "Fatura \xD6demeleri",
      description: "Fatura \xD6de | Fatura |"
    }
  },
  // ─── Phone Input Countries ────────────────────────────
  countries: {
    SY: "Suriye",
    TR: "T\xFCrkiye",
    IQ: "Irak",
    JO: "\xDCrd\xFCn",
    LB: "L\xFCbnan",
    SA: "Suudi Arabistan",
    AE: "BAE",
    EG: "M\u0131s\u0131r",
    US: "ABD",
    GB: "Birle\u015Fik Krall\u0131k",
    DE: "Almanya",
    FR: "Fransa",
    IT: "\u0130talya",
    ES: "\u0130spanya",
    NL: "Hollanda",
    SE: "\u0130sve\xE7",
    KW: "Kuveyt",
    QA: "Katar",
    BH: "Bahreyn",
    OM: "Umman",
    PS: "Filistin",
    YE: "Yemen",
    LY: "Libya",
    SD: "Sudan",
    TN: "Tunus",
    DZ: "Cezayir",
    MA: "Fas",
    IN: "Hindistan",
    PK: "Pakistan",
    BD: "Banglade\u015F",
    CN: "\xC7in",
    JP: "Japonya",
    KR: "G\xFCney Kore",
    RU: "Rusya",
    BR: "Brezilya",
    MX: "Meksika",
    CA: "Kanada",
    AU: "Avustralya"
  }
};
var tr_default = tr;

// src/i18n/index.ts
var RTL_LANGUAGES = ["ar"];
var translations = {
  en: en_default,
  ar: ar_default,
  tr: tr_default
};
function parseLanguageFromLocale(locale) {
  if (!locale) return "en";
  const parts = locale.toLowerCase().split("-");
  const lang = parts.length > 1 ? parts[1] : parts[0];
  return isSupportedLanguage(lang) ? lang : "en";
}
function isSupportedLanguage(lang) {
  return lang in translations;
}
function isRTL(language) {
  return RTL_LANGUAGES.includes(language);
}
function getTranslations(language) {
  return translations[language] ?? translations.en;
}
var LANG_STORAGE_KEY = "rdb-language";
function persistLanguage(language) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, language);
  } catch {
  }
}
function getPersistedLanguage() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) return stored;
  } catch {
  }
  return null;
}

// src/context/I18nContext.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var I18nContext = (0, import_react7.createContext)(void 0);
function I18nProvider({ children, locale }) {
  const isLibraryMode = locale !== void 0;
  const resolveInitial = () => {
    if (isLibraryMode) {
      return parseLanguageFromLocale(locale);
    }
    return getPersistedLanguage() ?? "en";
  };
  const [language, setLanguageState] = (0, import_react7.useState)(resolveInitial);
  (0, import_react7.useEffect)(() => {
    if (isLibraryMode) {
      setLanguageState(parseLanguageFromLocale(locale));
    }
  }, [locale, isLibraryMode]);
  const setLanguage = (0, import_react7.useCallback)(
    (lang) => {
      if (isLibraryMode) {
        console.warn(
          "[RDB i18n] Cannot change language in library mode. Update the `locale` prop instead."
        );
        return;
      }
      setLanguageState(lang);
      persistLanguage(lang);
    },
    [isLibraryMode]
  );
  (0, import_react7.useEffect)(() => {
    if (typeof document === "undefined") return;
    const dir = isRTL(language) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
  }, [language]);
  const translations2 = (0, import_react7.useMemo)(() => getTranslations(language), [language]);
  const tr2 = (0, import_react7.useCallback)(
    (key, params) => {
      const keys = key.split(".");
      let result = translations2;
      for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
          result = result[k];
        } else {
          return key;
        }
      }
      if (typeof result === "string" && params) {
        return result.replace(/{{(\w+)}}/g, (_, p) => params[p] ?? "");
      }
      return typeof result === "string" ? result : key;
    },
    [translations2]
  );
  const value = (0, import_react7.useMemo)(
    () => ({
      language,
      t: getTranslations(language),
      tr: tr2,
      rtl: isRTL(language),
      dir: isRTL(language) ? "rtl" : "ltr",
      setLanguage
    }),
    [language, tr2, setLanguage]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(I18nContext.Provider, { value, children });
}
function useTranslation() {
  const ctx = (0, import_react7.useContext)(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an <I18nProvider>");
  }
  return ctx;
}

// src/components/home/content/nav.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var NavHome = ({ activeAssetSymbol }) => {
  const { tr: tr2, t } = useTranslation();
  const { balanceHidden, setBalanceHidden } = useStore();
  const currencyLabel = activeAssetSymbol ? activeAssetSymbol.toUpperCase() : void 0;
  const totalBalanceLabel = currencyLabel ? tr2("home.totalBalanceWithCurrency", { currency: currencyLabel }) : tr2("home.totalBalance");
  const addCurrencyLabel = currencyLabel ? tr2("home.addCurrencyWithAccount", { currency: currencyLabel }) : tr2("home.addCurrency");
  const icon = activeAssetSymbol ? addaccount_default : addcurrency_default;
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("nav", { className: "w-full h-6 pt-2 pl-6 pr-3 flex items-center justify-between", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "font-quicksand font-bold text-[11px] text-[#1D1D1D] leading-4", children: totalBalanceLabel }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          onClick: () => setBalanceHidden(!balanceHidden),
          className: "relative w-3.5 h-3.5 cursor-pointer",
          "aria-label": balanceHidden ? "Show balance" : "Hide balance",
          children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            import_image.default,
            {
              src: balanceHidden ? eye_default : eye_open_default,
              alt: balanceHidden ? "Balance hidden" : "Balance visible",
              fill: true,
              className: "object-contain"
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center gap-1 cursor-pointer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "relative w-4 h-4", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_image.default, { src: icon, alt: icon, fill: true, className: "object-contain" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "font-quicksand font-normal text-[11px] text-[#388CFF] leading-4", children: addCurrencyLabel })
    ] })
  ] });
};
var nav_default = NavHome;

// src/components/home/content/balance.tsx
var import_react9 = require("react");

// src/components/home/items/BalanceCard.tsx
var import_react8 = require("react");
var import_image2 = __toESM(require("next/image"));

// src/assets/icons/home/balance/statistic.svg
var statistic_default = 'data:image/svg+xml,<svg id="bar-chart" xmlns="http://www.w3.org/2000/svg" width="14.997" height="14.997" viewBox="0 0 14.997 14.997">%0A  <path id="Path_15848" data-name="Path 15848" d="M3.076,451.689a.439.439,0,0,0-.439-.439H.439a.439.439,0,0,0-.439.439v3.544a.439.439,0,0,0,.439.439h2.2a.439.439,0,0,0,.439-.439Zm0,0" transform="translate(0 -440.676)" fill="%23fcfcfc"/>%0A  <path id="Path_15849" data-name="Path 15849" d="M172.636,338.75h-2.2a.439.439,0,0,0-.439.439v6.18a.439.439,0,0,0,.439.439h2.2a.439.439,0,0,0,.439-.439v-6.18A.439.439,0,0,0,172.636,338.75Zm0,0" transform="translate(-166.016 -330.812)" fill="%23fcfcfc"/>%0A  <path id="Path_15850" data-name="Path 15850" d="M341.386,301.25h-2.2a.439.439,0,0,0-.439.439v7.059a.439.439,0,0,0,.439.439h2.2a.439.439,0,0,0,.439-.439v-7.059A.439.439,0,0,0,341.386,301.25Zm0,0" transform="translate(-330.812 -294.191)" fill="%23fcfcfc"/>%0A  <path id="Path_15851" data-name="Path 15851" d="M511.386,151.25h-2.2a.439.439,0,0,0-.439.439v10.574a.439.439,0,0,0,.439.439h2.2a.439.439,0,0,0,.439-.439V151.689A.439.439,0,0,0,511.386,151.25Zm0,0" transform="translate(-496.829 -147.706)" fill="%23fcfcfc"/>%0A  <path id="Path_15852" data-name="Path 15852" d="M11.943,9.666a1.32,1.32,0,0,0,1.318-1.318,1.3,1.3,0,0,0-.054-.354l1.712-1.208a1.309,1.309,0,0,0,2.059-.9l1.753-.369a1.315,1.315,0,0,0,2.34-1.181l2.1-1.869a1.3,1.3,0,0,0,.632.169,1.323,1.323,0,1,0-1.219-.822l-2.1,1.869a1.3,1.3,0,0,0-.632-.169,1.316,1.316,0,0,0-1.3,1.143L16.8,5.027a1.315,1.315,0,0,0-2.439.685,1.3,1.3,0,0,0,.054.354L12.7,7.274a1.317,1.317,0,1,0-.759,2.392Zm0,0" transform="translate(-10.376)" fill="%23fcfcfc"/>%0A</svg>%0A';

// src/assets/icons/home/balance/chart.svg
var chart_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="25.102" height="30.463" viewBox="0 0 25.102 30.463">%0A  <defs>%0A    <filter id="Path_15854" x="2.975" y="7.918" width="22.127" height="22.545" filterUnits="userSpaceOnUse">%0A      <feOffset dy="3" input="SourceAlpha"/>%0A      <feGaussianBlur stdDeviation="3" result="blur"/>%0A      <feFlood flood-opacity="0.161"/>%0A      <feComposite operator="in" in2="blur"/>%0A      <feComposite in="SourceGraphic"/>%0A    </filter>%0A    <filter id="Path_15855" x="0" y="0" width="25.102" height="25.102" filterUnits="userSpaceOnUse">%0A      <feOffset dy="3" input="SourceAlpha"/>%0A      <feGaussianBlur stdDeviation="3" result="blur-2"/>%0A      <feFlood flood-opacity="0.161"/>%0A      <feComposite operator="in" in2="blur-2"/>%0A      <feComposite in="SourceGraphic"/>%0A    </filter>%0A  </defs>%0A  <g id="pie-chart" transform="translate(1.341 6)">%0A    <path id="Path_15853" data-name="Path 15853" d="M12.2,13.143a7.2,7.2,0,0,1-4.856,1.883A7.435,7.435,0,0,1,0,7.519,7.44,7.44,0,0,1,6.889.03V3.171A4.382,4.382,0,0,0,7.348,11.9a4.209,4.209,0,0,0,2.688-.97Z" transform="translate(0 -0.03)" fill="%23fcfcfc"/>%0A    <g transform="matrix(1, 0, 0, 1, -1.34, -6)" filter="url(%23Path_15854)">%0A      <path id="Path_15854-2" data-name="Path 15854" d="M21.577,12.75a7.466,7.466,0,0,1-1.886,4.545L17.45,15.054a4.36,4.36,0,0,0,.95-2.3Z" transform="translate(-5.47 1.17)" fill="%23fcfcfc"/>%0A    </g>%0A    <g transform="matrix(1, 0, 0, 1, -1.34, -6)" filter="url(%23Path_15855)">%0A      <path id="Path_15855-2" data-name="Path 15855" d="M19.852,7.132H16.675A4.418,4.418,0,0,0,12.75,3.208V.03A7.587,7.587,0,0,1,19.852,7.132Z" transform="translate(-3.75 5.97)" fill="%23fcfcfc"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/balance/qrsmall.svg
var qrsmall_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <path id="qr-code-9" d="M5.833,9.167h-2.5A3.337,3.337,0,0,1,0,5.833v-2.5A3.337,3.337,0,0,1,3.333,0h2.5A3.337,3.337,0,0,1,9.167,3.333v2.5A3.337,3.337,0,0,1,5.833,9.167ZM3.333,2.5a.835.835,0,0,0-.833.833v2.5a.835.835,0,0,0,.833.833h2.5a.835.835,0,0,0,.833-.833v-2.5A.835.835,0,0,0,5.833,2.5ZM16.667,9.167h-2.5a3.337,3.337,0,0,1-3.333-3.333v-2.5A3.337,3.337,0,0,1,14.167,0h2.5A3.337,3.337,0,0,1,20,3.333v2.5A3.337,3.337,0,0,1,16.667,9.167ZM14.167,2.5a.834.834,0,0,0-.833.833v2.5a.834.834,0,0,0,.833.833h2.5a.834.834,0,0,0,.833-.833v-2.5a.834.834,0,0,0-.833-.833ZM5.833,20h-2.5A3.337,3.337,0,0,1,0,16.667v-2.5a3.337,3.337,0,0,1,3.333-3.333h2.5a3.337,3.337,0,0,1,3.333,3.333v2.5A3.337,3.337,0,0,1,5.833,20Zm-2.5-6.667a.835.835,0,0,0-.833.833v2.5a.835.835,0,0,0,.833.833h2.5a.835.835,0,0,0,.833-.833v-2.5a.835.835,0,0,0-.833-.833Zm10.833-.417v-.833a1.25,1.25,0,0,0-1.25-1.25h-.833a1.25,1.25,0,0,0-1.25,1.25v.833a1.25,1.25,0,0,0,1.25,1.25h.833A1.25,1.25,0,0,0,14.167,12.917Zm2.5,2.5a1.25,1.25,0,1,0-1.25,1.25A1.25,1.25,0,0,0,16.667,15.417Zm-2.5,3.333v-.833a1.25,1.25,0,0,0-1.25-1.25h-.833a1.25,1.25,0,0,0-1.25,1.25v.833A1.25,1.25,0,0,0,12.083,20h.833A1.25,1.25,0,0,0,14.167,18.75ZM20,12.917v-.833a1.25,1.25,0,0,0-1.25-1.25h-.833a1.25,1.25,0,0,0-1.25,1.25v.833a1.25,1.25,0,0,0,1.25,1.25h.833A1.25,1.25,0,0,0,20,12.917Z" fill="%23fcfcfc"/>%0A</svg>%0A';

// src/components/home/items/BalanceCard.tsx
var import_framer_motion = require("framer-motion");
var import_jsx_runtime10 = require("react/jsx-runtime");
var EASING = [0.4, 0, 0.2, 1];
var DURATION = 0.35;
var BalanceCard = ({
  currencyName,
  amount,
  currencyCode,
  icon,
  setShowDeposit,
  onClick,
  isActive = false,
  isHidden = false,
  isLoading = false,
  balanceHidden = false,
  assetType = "currency"
}) => {
  const isMetal = assetType === "metal";
  const animationStyles = (0, import_react8.useMemo)(
    () => ({
      // Width-based animation for clean expansion (clamped to viewport)
      width: isActive ? 406 : isHidden ? 0 : 200,
      scale: isHidden ? 0.8 : 1,
      opacity: isHidden ? 0 : 1,
      padding: isHidden ? 0 : 16,
      maxWidth: "calc(100vw - 32px)"
      // Prevent overflow on smaller screens
    }),
    [isActive, isHidden]
  );
  const transitionConfig = (0, import_react8.useMemo)(
    () => ({
      // Smooth easing for all properties
      width: { duration: DURATION, ease: EASING },
      scale: { duration: DURATION, ease: EASING },
      opacity: { duration: DURATION * 0.6, ease: EASING },
      padding: { duration: DURATION, ease: EASING },
      layout: { duration: DURATION, ease: EASING }
    }),
    []
  );
  const displayAmount = balanceHidden ? "\u2022\u2022\u2022\u2022" : amount === void 0 ? "0" : amount;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "p-0.5", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
    import_framer_motion.motion.div,
    {
      layout: true,
      layoutId: `balance-card-${currencyCode}`,
      initial: false,
      animate: animationStyles,
      transition: transitionConfig,
      className: `${isMetal ? "bg-[#3C3C3C] " : "bg-[#3C3C3C] "} min-w-50 items-start h-30 bg-[#3C3C3C] rounded-2xl flex flex-col justify-between shrink-0 overflow-hidden cursor-pointer`,
      style: {
        boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.16), inset 0px 3px 6px rgba(255, 255, 255, 0.16)",
        pointerEvents: isHidden ? "none" : "auto"
      },
      role: onClick ? "button" : void 0,
      tabIndex: onClick ? 0 : void 0,
      onClick,
      whileHover: !isHidden ? { scale: 1.02 } : void 0,
      whileTap: !isHidden ? { scale: 0.98 } : void 0,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_framer_motion.motion.div, { className: "w-full flex items-start justify-between gap-3", layout: true, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_framer_motion.motion.div, { className: "flex flex-col gap-2", layout: true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "relative w-4 h-4", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_image2.default, { src: icon, alt: currencyName, fill: true, className: "object-contain" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "font-quicksand font-light text-[11px] text-[#FFFFFF] leading-tight", children: currencyName })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_framer_motion.motion.div, { className: "w-full flex items-end justify-between", layout: true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex items-baseline gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
              import_framer_motion.motion.span,
              {
                className: "relative font-quicksand font-medium text-[25px] text-[#FFFFFF] leading-none bottom-1",
                layout: true,
                children: displayAmount
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "font-quicksand font-light text-[9px] bottom-0 text-[#FFFFFF] uppercase", children: currencyCode })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_framer_motion.AnimatePresence, { children: isActive && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
            import_framer_motion.motion.div,
            {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: 20 },
              transition: {
                duration: DURATION,
                ease: EASING,
                delay: DURATION * 0.3
              },
              className: "flex items-end gap-4",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                  "button",
                  {
                    className: "flex flex-col items-center gap-1 cursor-pointer",
                    onClick: (e) => {
                      e.stopPropagation();
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "relative w-3.75 h-3.75", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        import_image2.default,
                        {
                          src: statistic_default,
                          alt: "Statistic",
                          fill: true,
                          className: "object-contain"
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "font-quicksand font-light text-[8px] text-[#FFFFFF]", children: "statistic" })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                  "button",
                  {
                    className: "flex flex-col items-center gap-1 cursor-pointer",
                    onClick: (e) => {
                      e.stopPropagation();
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "relative w-3.75 h-3.75", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        import_image2.default,
                        {
                          src: chart_default,
                          alt: "Chart",
                          fill: true,
                          className: "object-contain"
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "font-quicksand font-light text-[8px] text-[#FFFFFF]", children: "Chart" })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                  "button",
                  {
                    className: "flex flex-col items-center gap-1 cursor-pointer",
                    onClick: (e) => {
                      e.stopPropagation();
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "relative w-3.75 h-3.75", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                        import_image2.default,
                        {
                          src: qrsmall_default,
                          alt: "Info",
                          fill: true,
                          className: "object-contain"
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "font-quicksand font-light text-[8px] text-[#FFFFFF]", children: "Info" })
                    ]
                  }
                )
              ]
            }
          ) })
        ] })
      ]
    }
  ) });
};
var BalanceCard_default = BalanceCard;

// src/components/home/content/balance.tsx
var import_react_loading_skeleton = __toESM(require("react-loading-skeleton"));
var import_framer_motion2 = require("framer-motion");
var import_jsx_runtime11 = require("react/jsx-runtime");
var EASING2 = [0.4, 0, 0.2, 1];
var DURATION2 = 0.35;
var cardVariants = {
  inactive: {
    scale: 1,
    opacity: 1,
    x: 0,
    width: "auto",
    marginRight: 0
  },
  active: {
    scale: 1,
    opacity: 1,
    width: "auto",
    marginRight: 0
  },
  hidden: {
    scale: 0.8,
    opacity: 0,
    x: -20,
    width: 0,
    marginRight: -5
    // Compensate for gap
  }
};
var BalanceHome = ({
  balances,
  currencies,
  setBalances,
  setCurrencies,
  activeAssetType,
  setActiveAssetType,
  activeAssetSymbol,
  setActiveAssetSymbol,
  setShowDeposit
}) => {
  const { isDataLoaded, isLoadingCurrencies, isLoadingBalances, balanceHidden, metals } = useStore();
  const [loadedSymbols, setLoadedSymbols] = (0, import_react9.useState)(/* @__PURE__ */ new Set());
  (0, import_react9.useEffect)(() => {
    if (Object.keys(balances).length > 0) {
      setLoadedSymbols(new Set(Object.keys(balances)));
    }
  }, [balances]);
  const handleToggle = (symbol) => {
    setActiveAssetSymbol(activeAssetSymbol === symbol ? void 0 : symbol);
  };
  const handleToggleType = (assetType) => {
    setActiveAssetType(activeAssetType === assetType ? void 0 : assetType);
  };
  const handleCardClick = (0, import_react9.useCallback)(
    (asset) => {
      handleToggle(asset.symbol);
      handleToggleType(asset.assetType);
    },
    [activeAssetSymbol, setActiveAssetSymbol, activeAssetType, setActiveAssetType]
  );
  if (isLoadingCurrencies || currencies.length === 0 && !isDataLoaded) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "w-full flex items-center gap-1.25 overflow-x-auto pl-3 pr-6 pb-4 no-scrollbar h-38", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(CurrenciesSkeletons, {}) });
  }
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.items || [];
  const metalList = Array.isArray(metals) ? metals : [];
  const totalAssets = currencyList.length + metalList.length;
  const allLoaded = loadedSymbols.size >= totalAssets;
  const sortedCurrencies = allLoaded ? [...currencyList].sort((a, b) => {
    const balanceA = parseFloat(balances?.[a.symbol]?.available ?? "0");
    const balanceB = parseFloat(balances?.[b.symbol]?.available ?? "0");
    return balanceB - balanceA;
  }) : currencyList;
  const sortedMetals = allLoaded ? [...metalList].sort((a, b) => {
    const balanceA = parseFloat(balances?.[a.symbol]?.available ?? "0");
    const balanceB = parseFloat(balances?.[b.symbol]?.available ?? "0");
    return balanceB - balanceA;
  }) : metalList;
  const displayList = [
    ...sortedCurrencies.map((item) => ({ ...item, assetType: "currency" })),
    ...sortedMetals.map((item) => ({ ...item, assetType: "metal" }))
  ];
  const renderCard = (asset, index) => {
    const isActive = activeAssetSymbol === asset.symbol;
    const isHidden = Boolean(activeAssetSymbol && activeAssetSymbol !== asset.symbol);
    const assetBalance = balances?.[asset.symbol];
    const isBalanceLoaded = loadedSymbols.has(asset.symbol) && !isLoadingBalances;
    const amount = isBalanceLoaded ? assetBalance?.available?.toString() ?? "0" : void 0;
    const animationState = isHidden ? "hidden" : isActive ? "active" : "inactive";
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      import_framer_motion2.motion.div,
      {
        layout: "position",
        variants: cardVariants,
        initial: "inactive",
        animate: animationState,
        exit: "hidden",
        transition: {
          // Use transform-based animations for GPU acceleration
          scale: {
            duration: DURATION2,
            ease: EASING2
          },
          opacity: {
            duration: DURATION2 * 0.6,
            // Faster fade for snappier feel
            ease: EASING2
          },
          // Slide right animation starts after width expansion completes
          x: {
            duration: DURATION2,
            ease: EASING2,
            delay: isActive ? DURATION2 : 0
            // Delay only when becoming active
          },
          width: {
            duration: DURATION2,
            ease: EASING2
          },
          marginRight: {
            duration: DURATION2,
            ease: EASING2
          },
          layout: {
            duration: DURATION2,
            ease: EASING2
          }
        },
        className: "snap-center shrink-0 overflow-hidden",
        style: {
          // Use will-change for GPU layer promotion
          willChange: "transform, opacity",
          pointerEvents: isHidden ? "none" : "auto",
          // Prevent layout thrashing by using fixed dimensions
          transformOrigin: "left center"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          BalanceCard_default,
          {
            currencyName: asset.displayName,
            amount,
            currencyCode: asset?.symbol,
            icon: asset?.symbolImageUrl,
            isActive,
            isHidden,
            onClick: () => handleCardClick(asset),
            setShowDeposit,
            isLoading: isLoadingBalances,
            balanceHidden,
            assetType: asset.assetType
          }
        )
      },
      asset.symbol || index
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_framer_motion2.LayoutGroup, { children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_framer_motion2.motion.div,
    {
      className: "w-full flex items-center overflow-x-auto pl-3 pr-6 pb-4 no-scrollbar h-38",
      layout: "position",
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_framer_motion2.AnimatePresence, { mode: "popLayout", children: displayList.map((asset, index) => renderCard(asset, index)) })
    }
  ) });
};
var balance_default = BalanceHome;
var CurrenciesSkeletons = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_jsx_runtime11.Fragment, { children: Array.from({ length: 4 }).map((_c, index) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "snap-center shrink-0 w-50 h-30", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_loading_skeleton.default,
    {
      borderRadius: 12,
      className: "w-50 h-30 rounded-2xl p-4 flex flex-col justify-between shrink-0"
    }
  ) }, index)) });
};

// src/components/home/content/transactions.tsx
var import_react10 = require("react");

// src/components/transactions/items/TransactionItem.tsx
var import_image3 = __toESM(require("next/image"));
var import_jsx_runtime12 = require("react/jsx-runtime");
var TransactionItem = ({
  title,
  date,
  description,
  status,
  amount,
  currency,
  icon,
  arrowIcon,
  isNegative = false,
  isSelected = false,
  onClick
}) => {
  console.log("TransactionItem rendered :", status);
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
    "div",
    {
      onClick,
      className: `w-full max-w-100 h-12.5 shrink-0 flex  items-center justify-between px-3 ${status === "CANCELLED" || status === "EXPIRED" ? "bg-[#FDF3F3]" : "bg-[#FFFFFF]"} rounded-[15px] last:mb-0 transition-all duration-200 cursor-pointer`,
      style: {
        boxShadow: isSelected ? "0 0 0 0.5px #d3d3d35e" : "none"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "relative w-4 h-4", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_image3.default, { src: icon, alt: title, fill: true, className: "object-contain" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "relative w-3.5 h-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_image3.default, { src: arrowIcon, alt: "arrow", fill: true, className: "object-contain" }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex flex-col items-start", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "font-quicksand font-medium text-[13px] text-[#1D1D1D] leading-tight", children: title }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex items-center gap-1 mt-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "font-quicksand font-light text-[11px] text-[#A0A0A0]", children: date }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "font-quicksand font-normal text-[11px] text-[#8D8D8D]", children: description })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex flex-col items-end", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "flex items-baseline gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { className: "font-quicksand font-bold text-[13px] text-[#1D1D1D]", children: [
              isNegative ? "-" : "",
              amount
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "font-quicksand font-bold text-[13px] text-[#1D1D1D]", children: currency })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "font-quicksand font-normal text-[11px] text-[#1D1D1D]", children: status })
        ] })
      ]
    }
  );
};
var TransactionItem_default = TransactionItem;

// src/assets/icons/home/cashdeposit.svg
var cashdeposit_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="16" height="16" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Group_15140" data-name="Group 15140" transform="translate(-146 -389)">%0A    <g id="Mask_Group_864" data-name="Mask Group 864" transform="translate(146 389)" clip-path="url(%23clip-path)">%0A      <g id="money-12" transform="translate(0 2.106)">%0A        <path id="Path_23774" data-name="Path 23774" d="M15.522,6.464h-.613a.941.941,0,0,0-.669-1.155L3.139,2.342a.942.942,0,0,0-1.155.669L.5,8.559a.944.944,0,0,0,.669,1.158l1.917.512v2.924a.946.946,0,0,0,.945.944H15.522a.946.946,0,0,0,.945-.944V7.409a.946.946,0,0,0-.945-.945ZM1.306,9.2a.411.411,0,0,1-.292-.5L2.5,3.148A.408.408,0,0,1,2.69,2.9.4.4,0,0,1,3,2.857L14.1,5.825a.408.408,0,0,1,.29.5l-.036.137H4.031a.946.946,0,0,0-.945.945V9.676Zm14.627,3.951a.412.412,0,0,1-.411.411H4.031a.412.412,0,0,1-.412-.412V7.409A.412.412,0,0,1,4.031,7H15.522a.412.412,0,0,1,.411.411Z" transform="translate(-0.467 -2.31)" fill="%23388cff"/>%0A        <path id="Path_23775" data-name="Path 23775" d="M8.905,7.238a2.339,2.339,0,1,0,2.339,2.339A2.339,2.339,0,0,0,8.905,7.238Zm0,4.144a1.806,1.806,0,1,1,1.805-1.806,1.806,1.806,0,0,1-1.805,1.806Z" transform="translate(0.404 -1.606)" fill="%23388cff"/>%0A        <path id="Path_23776" data-name="Path 23776" d="M12.442,8.254a1.178,1.178,0,1,0,1.178,1.178,1.178,1.178,0,0,0-1.178-1.178Zm0,1.822a.645.645,0,1,1,.645-.644A.645.645,0,0,1,12.442,10.076Z" transform="translate(1.075 -1.46)" fill="%23388cff"/>%0A        <path id="Path_23777" data-name="Path 23777" d="M5.078,10.61A1.178,1.178,0,1,0,3.9,9.432,1.178,1.178,0,0,0,5.078,10.61Zm0-1.822a.645.645,0,1,1-.644.644A.645.645,0,0,1,5.078,8.787Z" transform="translate(0.024 -1.46)" fill="%23388cff"/>%0A        <path id="Path_23778" data-name="Path 23778" d="M4.185,11.258H4.044a.267.267,0,0,0,0,.533h.141a.267.267,0,0,0,0-.533Z" transform="translate(0.006 -1.031)" fill="%23388cff"/>%0A        <path id="Path_23779" data-name="Path 23779" d="M7.13,11.258H4.755a.267.267,0,0,0,0,.533H7.13a.267.267,0,0,0,0-.533Z" transform="translate(0.108 -1.031)" fill="%23388cff"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/cashwithdraw.svg
var cashwithdraw_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="16" height="16" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Group_15142" data-name="Group 15142" transform="translate(-146 -389)">%0A    <g id="Mask_Group_864" data-name="Mask Group 864" transform="translate(146 389)" clip-path="url(%23clip-path)">%0A      <g id="money-12" transform="translate(0 2.106)">%0A        <path id="Path_23774" data-name="Path 23774" d="M15.522,6.464h-.613a.941.941,0,0,0-.669-1.155L3.139,2.342a.942.942,0,0,0-1.155.669L.5,8.559a.944.944,0,0,0,.669,1.158l1.917.512v2.924a.946.946,0,0,0,.945.944H15.522a.946.946,0,0,0,.945-.944V7.409a.946.946,0,0,0-.945-.945ZM1.306,9.2a.411.411,0,0,1-.292-.5L2.5,3.148A.408.408,0,0,1,2.69,2.9.4.4,0,0,1,3,2.857L14.1,5.825a.408.408,0,0,1,.29.5l-.036.137H4.031a.946.946,0,0,0-.945.945V9.676Zm14.627,3.951a.412.412,0,0,1-.411.411H4.031a.412.412,0,0,1-.412-.412V7.409A.412.412,0,0,1,4.031,7H15.522a.412.412,0,0,1,.411.411Z" transform="translate(-0.467 -2.31)" fill="%23513aaf"/>%0A        <path id="Path_23775" data-name="Path 23775" d="M8.905,7.238a2.339,2.339,0,1,0,2.339,2.339A2.339,2.339,0,0,0,8.905,7.238Zm0,4.144a1.806,1.806,0,1,1,1.805-1.806,1.806,1.806,0,0,1-1.805,1.806Z" transform="translate(0.404 -1.606)" fill="%23513aaf"/>%0A        <path id="Path_23776" data-name="Path 23776" d="M12.442,8.254a1.178,1.178,0,1,0,1.178,1.178,1.178,1.178,0,0,0-1.178-1.178Zm0,1.822a.645.645,0,1,1,.645-.644A.645.645,0,0,1,12.442,10.076Z" transform="translate(1.075 -1.46)" fill="%23513aaf"/>%0A        <path id="Path_23777" data-name="Path 23777" d="M5.078,10.61A1.178,1.178,0,1,0,3.9,9.432,1.178,1.178,0,0,0,5.078,10.61Zm0-1.822a.645.645,0,1,1-.644.644A.645.645,0,0,1,5.078,8.787Z" transform="translate(0.024 -1.46)" fill="%23513aaf"/>%0A        <path id="Path_23778" data-name="Path 23778" d="M4.185,11.258H4.044a.267.267,0,0,0,0,.533h.141a.267.267,0,0,0,0-.533Z" transform="translate(0.006 -1.031)" fill="%23513aaf"/>%0A        <path id="Path_23779" data-name="Path 23779" d="M7.13,11.258H4.755a.267.267,0,0,0,0,.533H7.13a.267.267,0,0,0,0-.533Z" transform="translate(0.108 -1.031)" fill="%23513aaf"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/refundorder.svg
var refundorder_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">%0A  <g id="Group_12947" data-name="Group 12947" transform="translate(0 0)">%0A    <path id="refund" d="M16.374,5.513c-.23-.261-.445-.994-.89-.735-.352.347.264.72.386,1.048a.3.3,0,1,0,.5-.313Zm.766,1.951c-.155-.315-.173-1.075-.67-.94a.3.3,0,0,0-.158.389c.2.291.146,1.009.63.922a.3.3,0,0,0,.2-.37Zm.236,2.084c-.069-.343.111-1.086-.4-1.082a.3.3,0,0,0-.253.334c.115.333-.12,1,.361,1.054a.3.3,0,0,0,.3-.306Zm-.31,2.073c.023-.352.387-1.017-.111-1.15-.495,0-.32.691-.466,1.015a.3.3,0,0,0,.577.135Zm-1.1,2.08c.387-.06.439-.62.614-.909a.3.3,0,1,0-.549-.224C15.946,12.91,15.33,13.586,15.968,13.7Zm-1.475,1.078a.3.3,0,0,0,.216.5c.344-.068.521-.493.751-.73a.3.3,0,1,0-.472-.358,7.436,7.436,0,0,1-.5.588Zm-1.407,1.7a2.817,2.817,0,0,0,.837-.52.3.3,0,0,0,.052-.417c-.347-.352-.718.264-1.046.387a.3.3,0,0,0,.157.549Zm-1.877.735c.31-.106,1.195-.219,1.025-.684-.244-.43-.76.068-1.111.1a.3.3,0,0,0,.086.581ZM1.376,9.4a8.262,8.262,0,0,0,8.3,8,.3.3,0,0,0,0-.594A7.662,7.662,0,0,1,1.968,9.4a7.386,7.386,0,0,1,12.41-5.432H13.2a.3.3,0,0,0,0,.594h1.878a.307.307,0,0,0,.3-.315V2.483a.3.3,0,1,0-.593,0V3.542A7.977,7.977,0,0,0,1.376,9.4Z" transform="translate(-1.376 -1.403)" fill="%23ff7600"/>%0A    <g id="box" transform="translate(4.724 4.331)">%0A      <path id="Path_22816" data-name="Path 22816" d="M7.641,1.071H2.661a.787.787,0,0,0-.786.786V7.624a.787.787,0,0,0,.786.786h4.98a.787.787,0,0,0,.786-.786V1.858A.787.787,0,0,0,7.641,1.071Zm.524,6.553a.524.524,0,0,1-.524.524H2.661a.524.524,0,0,1-.524-.524V1.858a.524.524,0,0,1,.524-.524H3.972v2a.4.4,0,0,0,.569.353l.553-.277a.132.132,0,0,1,.115,0l.553.274a.392.392,0,0,0,.569-.351v-2H7.641a.524.524,0,0,1,.524.524Z" transform="translate(-1.875 -1.071)" fill="%231d1d1d"/>%0A      <path id="Path_22817" data-name="Path 22817" d="M5.984,10.446H4.411a.394.394,0,0,0-.393.393v1.225a.393.393,0,0,0,.393.393H5.984a.393.393,0,0,0,.393-.393V10.84A.394.394,0,0,0,5.984,10.446ZM4.542,11.715a.131.131,0,0,1,.131-.131H5.722a.131.131,0,1,1,0,.262H4.673A.131.131,0,0,1,4.542,11.715Zm1.179-.393H4.673a.131.131,0,1,1,0-.262H5.722a.131.131,0,1,1,0,.262Z" transform="translate(-2.969 -5.86)" fill="%231d1d1d"/>%0A      <path id="Path_22818" data-name="Path 22818" d="M11.2,14.023H9.745a.131.131,0,1,0,0,.262H11.2a.131.131,0,1,0,0-.262Z" transform="translate(-5.828 -7.686)" fill="%231d1d1d"/>%0A      <path id="Path_22819" data-name="Path 22819" d="M11.626,12.77H10.577a.131.131,0,1,0,0,.262h1.048a.131.131,0,1,0,0-.262Z" transform="translate(-6.253 -7.046)" fill="%231d1d1d"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/arrowdown.svg
var arrowdown_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <g id="Group_15094" data-name="Group 15094" transform="translate(-3 -438)">%0A    <circle id="Ellipse_669" data-name="Ellipse 669" cx="7" cy="7" r="7" transform="translate(3 438)" fill="%23fcfcfc"/>%0A    <path id="arrow-button" d="M10.378,12.551a.332.332,0,0,0,.47,0L13.2,10.2a.333.333,0,1,0-.47-.47l-1.784,1.784V6.333a.333.333,0,0,0-.665,0v5.181L8.5,9.729a.333.333,0,0,0-.47.47Z" transform="translate(-0.613 435.676)" fill="%231d1d1d" fill-rule="evenodd"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/arrwoup.svg
var arrwoup_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <g id="Group_15093" data-name="Group 15093" transform="translate(-3 -416)">%0A    <circle id="Ellipse_670" data-name="Ellipse 670" cx="7" cy="7" r="7" transform="translate(3 416)" fill="%23fcfcfc"/>%0A    <path id="arrow-button" d="M10.379,6.1a.332.332,0,0,1,.47,0L13.2,8.45a.333.333,0,0,1-.47.47L10.946,7.136v5.181a.333.333,0,0,1-.665,0V7.136L8.5,8.92a.333.333,0,0,1-.47-.47Z" transform="translate(-0.613 413.676)" fill="%23ff6200" fill-rule="evenodd"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/transfer.svg
var transfer_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40" height="40" viewBox="0 0 40 40">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4609" data-name="Rectangle 4609" width="40" height="40" transform="translate(0 0.311)" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_874" data-name="Mask Group 874" transform="translate(0 -0.311)" clip-path="url(%23clip-path)">%0A    <g id="paper-plane" transform="translate(2.001 0.001)">%0A      <path id="Path_23868" data-name="Path 23868" d="M39.8,2.72c.043.341-2.067,25.67-2.738,26.294-.759.706-3.209-1.046-6.233-3.209-.9-.646-1.858-1.329-2.834-1.993-1.368-.932-2.7-1.85-3.846-2.639l-.842-.583.842-.912,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413ZM20.412,33.45c-.078.117-.135.21-.169.276A1.558,1.558,0,0,0,20.412,33.45ZM16.535,21.06c.237-.146,1.116-.831,2.4-1.857.747-.6,1.632-1.308,2.609-2.1l1.3-1.053L24.77,14.5l0,0h0c2.345-1.9,4.888-3.954,7.205-5.811l1.3-1.043q.673-.537,1.3-1.037c.455-.361.891-.7,1.3-1.028.467-.366.9-.706,1.3-1.015A17.012,17.012,0,0,1,39.8,2.72C39.157,1.458,4.21,20.007,3.878,20.59s12.657.469,12.657.469Z" transform="translate(-3.682 -2.469)" fill="%23388cff" fill-rule="evenodd"/>%0A      <path id="Path_23869" data-name="Path 23869" d="M17.029,13.78c-.125.753-.283,1.661-.462,2.644-.374,2.05-.841,4.427-1.3,6.411A21.5,21.5,0,0,1,14.13,26.64c.226-.34.625-.881,1.133-1.546C17,22.82,20,19.1,21.717,17c-1.368-.932-2.7-1.85-3.846-2.639Z" transform="translate(2.6 4.341)" fill="%23fff"/>%0A      <path id="Path_23870" data-name="Path 23870" d="M18.039,23.211c.179-.983.337-1.891.462-2.644l.842-.912,1.3-1.413,1.3-1.413,1.3-1.413L24.561,14l1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413L34.995,2.7a17.012,17.012,0,0,0-2.608,1.842c-.4.308-.837.649-1.3,1.015-.413.324-.849.668-1.3,1.028q-.63.5-1.3,1.037l-1.3,1.043c-2.317,1.856-4.86,3.914-7.205,5.811h0l0,0-1.921,1.553-1.3,1.053c-.977.788-1.861,1.5-2.609,2.1-1.286,1.026-2.164,1.712-2.4,1.857.34,1.836.848,4.351,1.393,6.663.332,1.408.678,2.74,1.008,3.8.509,1.63.98,2.608,1.307,2.206.034-.066.092-.159.169-.276a21.5,21.5,0,0,0,1.133-3.805c.463-1.984.931-4.361,1.3-6.411Z" transform="translate(1.127 -2.446)" fill="%23fff"/>%0A      <g id="Group_15327" data-name="Group 15327" transform="translate(0 0)">%0A        <path id="Path_23871" data-name="Path 23871" d="M4.1,20.78h0Zm.2-.141q.085-.055.2-.126c.272-.166.662-.393,1.156-.673.987-.56,2.38-1.326,4.047-2.227,3.332-1.8,7.75-4.134,12.179-6.409s8.866-4.493,12.235-6.062c1.685-.785,3.1-1.406,4.112-1.791.323-.123.6-.221.835-.292l-.106.075a19.969,19.969,0,0,0-1.878,1.35c-.331.314-.687.591-1.063.885-.017,0-.241.078-.241.182v.007q-.529.415-1.1.871h-.01a.189.189,0,0,0-.186.156L33.324,7.5a.19.19,0,0,0-.143.114l-1.213.969a.19.19,0,0,0-.064.052c-2.31,1.851-4.842,3.9-7.177,5.788h0l0,0-.012.009L22.873,15.92a.19.19,0,0,0-.121.1L21.539,17a.191.191,0,0,0-.075.06c-.927.748-1.77,1.426-2.49,2a.189.189,0,0,0-.141.112c-.618.493-1.138.9-1.535,1.212-.367.284-.62.474-.748.559H16.46l-.411,0c-.354,0-.86,0-1.466,0-1.212,0-2.824,0-4.426-.025s-3.191-.063-4.358-.134c-.584-.036-1.057-.078-1.37-.13L4.3,20.639Zm12.518.581c.339,1.822.836,4.274,1.369,6.531.332,1.406.676,2.733,1,3.785a10.674,10.674,0,0,0,.706,1.829.954.954,0,0,0,.249.326l.008,0,.006-.005c.038-.071.094-.16.162-.263a21.6,21.6,0,0,0,1.113-3.753c.462-1.98.929-4.354,1.3-6.4.179-.982.337-1.889.462-2.641l.009-.056L38.7,3.788c-.372.275-.815.61-1.315,1-.4.308-.836.648-1.3,1.014-.412.323-.848.667-1.3,1.028q-.629.5-1.3,1.036l-1.3,1.042c-2.316,1.856-4.859,3.913-7.2,5.809h0l0,0-.006,0L23.04,16.272l-1.3,1.053c-.977.788-1.862,1.5-2.609,2.1-.643.513-1.185.942-1.6,1.261-.316.245-.56.43-.714.537ZM39.659,3.307,23.67,20.631l.663.459c1.141.788,2.477,1.706,3.845,2.638.978.666,1.934,1.35,2.836,2h0c1.515,1.084,2.875,2.056,3.95,2.67a5.922,5.922,0,0,0,1.352.61c.358.092.566.054.684-.048l0,0a.5.5,0,0,0,.024-.059,2.434,2.434,0,0,0,.069-.245c.051-.213.107-.512.168-.887.121-.749.258-1.788.4-3.021.291-2.465.616-5.7.919-8.925s.584-6.443.786-8.874c.1-1.216.183-2.235.237-2.961.02-.265.037-.491.049-.673ZM37,28.96h0ZM23.521,20.988l.6.413c1.094.756,2.367,1.631,3.676,2.523-1.732,2.122-4.633,5.718-6.328,7.937l-.326.43c.214-.7.438-1.576.661-2.531.464-1.989.932-4.369,1.306-6.42C23.264,22.481,23.4,21.679,23.521,20.988Zm-2.873,12.63c.224-.335.616-.868,1.119-1.527,1.7-2.223,4.611-5.834,6.341-7.953.924.632,1.828,1.278,2.687,1.893l.008.006c1.506,1.077,2.88,2.06,3.974,2.685a6.274,6.274,0,0,0,1.445.648,1.085,1.085,0,0,0,1.045-.145.359.359,0,0,0,.072-.1.877.877,0,0,0,.045-.105,2.82,2.82,0,0,0,.081-.285c.054-.227.112-.536.173-.914.122-.757.26-1.8.406-3.037.292-2.47.617-5.707.92-8.934s.584-6.445.786-8.878c.1-1.216.183-2.237.238-2.964.027-.363.048-.654.062-.86.007-.1.012-.185.014-.244,0-.03,0-.055,0-.075a.448.448,0,0,0,0-.062l0-.033-.015-.03a.286.286,0,0,0-.156-.135.5.5,0,0,0-.167-.029,1.69,1.69,0,0,0-.394.052,10.1,10.1,0,0,0-1.235.4c-1.025.39-2.449,1.016-4.137,1.8C30.58,6.37,26.138,8.59,21.708,10.867S12.856,15.478,9.522,17.28c-1.667.9-3.063,1.669-4.053,2.231-.495.281-.89.51-1.167.679-.138.084-.249.155-.329.21-.04.027-.074.053-.1.075s-.028.023-.04.036a.27.27,0,0,0-.045.058.231.231,0,0,0-.029.147.239.239,0,0,0,.058.125.4.4,0,0,0,.151.1,2,2,0,0,0,.4.1c.333.054.821.1,1.408.134,1.176.072,2.772.112,4.375.134s3.218.026,4.431.025c.607,0,1.113,0,1.468,0l.4,0c.34,1.823.835,4.265,1.366,6.516.332,1.41.679,2.747,1.011,3.811a11,11,0,0,0,.737,1.9,1.269,1.269,0,0,0,.38.464.384.384,0,0,0,.276.058.411.411,0,0,0,.241-.154,1.712,1.712,0,0,0,.186-.3ZM14.7,25.575a.189.189,0,0,1,0,.268l-3.5,3.379a.189.189,0,1,1-.263-.272l3.5-3.379A.189.189,0,0,1,14.7,25.575ZM31.25,30.282a.189.189,0,0,1,.079.256l-4.506,8.537a.189.189,0,1,1-.335-.177l4.506-8.537a.189.189,0,0,1,.256-.079Zm-16.565.024a.189.189,0,0,1,.021.267l-.406.475c-1.251,1.464-4.445,5.2-5.883,6.763a.189.189,0,1,1-.278-.257C9.571,36,12.757,32.271,14.01,30.8l.408-.478a.189.189,0,0,1,.267-.021Zm10.151,1.809a.189.189,0,0,1,.1.25c-.029.065-.112.212-.229.414s-.284.483-.482.815c-.232.388-.51.853-.823,1.373l-.712,1.187c-1.206,2.014-2.684,4.5-3.869,6.6a.189.189,0,0,1-.33-.186c1.187-2.107,2.667-4.6,3.874-6.61l.712-1.188c.312-.52.591-.984.822-1.372.2-.332.361-.607.48-.812s.192-.336.21-.377a.189.189,0,0,1,.25-.1Z" transform="translate(-3.754 -2.541)" fill-rule="evenodd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/recieve.svg
var recieve_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_6679" data-name="Rectangle 6679" width="16" height="16" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_877" data-name="Mask Group 877" clip-path="url(%23clip-path)">%0A    <g id="paper-plane" transform="translate(0.792 0)">%0A      <path id="Path_23910" data-name="Path 23910" d="M18.1,14.939c.017-.135-.819-10.167-1.084-10.414-.3-.28-1.271.414-2.469,1.271-.358.256-.736.526-1.122.789-.542.369-1.071.733-1.523,1.045l-.333.231.333.361.517.56.517.56.517.56.517.56.517.56.517.56.517.56.517.56.517.56.517.56Zm-7.68-12.17c-.031-.046-.053-.083-.067-.109A.617.617,0,0,1,10.423,2.768ZM8.887,7.675c.094.058.442.329.951.736.3.236.646.518,1.033.83l.517.417.761.615h0c.929.751,1.936,1.566,2.854,2.3l.517.413.517.411.517.407c.185.145.358.28.517.4a6.737,6.737,0,0,0,1.033.73c-.257.5-14.1-6.846-14.228-7.077S8.887,7.675,8.887,7.675Z" transform="translate(-3.797 0.927)" fill="%2337ef9a" fill-rule="evenodd"/>%0A      <path id="Path_23911" data-name="Path 23911" d="M15.278,18.873c-.05-.3-.112-.658-.183-1.047-.148-.812-.333-1.753-.517-2.539a8.514,8.514,0,0,0-.449-1.507c.09.135.248.349.449.612.687.9,1.878,2.374,2.556,3.2-.542.369-1.071.733-1.523,1.045Z" transform="translate(-7.504 -10.085)" fill="%23fff"/>%0A      <path id="Path_23912" data-name="Path 23912" d="M14.226,6.888c.071.389.133.749.183,1.047l.333.361.517.56.517.56.517.56.517.56.517.56.517.56.517.56.517.56.517.56.517.56,1.033,1.119a6.737,6.737,0,0,1-1.033-.73c-.159-.122-.332-.257-.517-.4l-.517-.407-.517-.411-.517-.413c-.918-.735-1.925-1.55-2.854-2.3h0l-.761-.615-.517-.417c-.387-.312-.737-.594-1.033-.83-.509-.407-.857-.678-.951-.736.135-.727.336-1.723.552-2.639.131-.558.268-1.085.4-1.5.2-.645.388-1.033.517-.874.014.026.036.063.067.109a8.514,8.514,0,0,1,.449,1.507c.184.786.369,1.727.517,2.539Z" transform="translate(-6.635 0.853)" fill="%23fff"/>%0A      <g id="Group_15399" data-name="Group 15399">%0A        <path id="Path_23913" data-name="Path 23913" d="M3.89,11.283h0Zm.079.056.08.05c.108.066.262.156.458.267.391.222.943.525,1.6.882,1.32.713,3.069,1.637,4.823,2.538s3.511,1.779,4.846,2.4c.667.311,1.228.557,1.628.709.128.049.239.087.331.116l-.042-.03a7.909,7.909,0,0,1-.744-.535c-.131-.124-.272-.234-.421-.351-.007,0-.1-.031-.1-.072v0L16,16.967h0a.075.075,0,0,1-.074-.062l-.455-.362a.075.075,0,0,1-.057-.045l-.48-.384a.075.075,0,0,1-.026-.02c-.915-.733-1.918-1.544-2.842-2.292h0l0,0-.728-.589a.075.075,0,0,1-.048-.039l-.48-.388a.076.076,0,0,1-.03-.024c-.367-.3-.7-.565-.986-.793a.075.075,0,0,1-.056-.045c-.245-.2-.451-.358-.608-.48s-.246-.188-.3-.221h-.2l-.581,0c-.48,0-1.119,0-1.753.01s-1.264.025-1.726.053c-.231.014-.419.031-.543.051Zm4.958-.23c.134-.722.331-1.693.542-2.587.131-.557.268-1.083.4-1.5a4.228,4.228,0,0,1,.28-.724.378.378,0,0,1,.1-.129l0,0,0,0c.015.028.037.063.064.1a8.555,8.555,0,0,1,.441,1.486c.183.784.368,1.724.516,2.536.071.389.133.748.183,1.046l0,.022,6.136,6.648c-.147-.109-.323-.242-.521-.395-.158-.122-.331-.257-.516-.4l-.516-.407-.516-.41-.516-.413c-.917-.735-1.924-1.55-2.853-2.3h0l0,0-.758-.613-.517-.417c-.387-.312-.737-.594-1.033-.83-.255-.2-.469-.373-.632-.5-.125-.1-.222-.17-.283-.213ZM17.974,18.2l-6.332-6.861.263-.182c.452-.312.981-.676,1.523-1.045.387-.264.766-.535,1.123-.79h0c.6-.429,1.138-.814,1.564-1.057a2.346,2.346,0,0,1,.535-.242c.142-.036.224-.022.271.019h0a.2.2,0,0,1,.01.023.964.964,0,0,1,.027.1c.02.084.042.2.066.351.048.3.1.708.16,1.2.115.976.244,2.257.364,3.535s.231,2.552.311,3.515c.04.482.072.885.094,1.173.008.105.014.195.019.267ZM16.92,8.043h0ZM11.583,11.2l.236-.164c.433-.3.938-.646,1.456-1-.686-.84-1.835-2.265-2.506-3.143l-.129-.17c.085.279.174.624.262,1,.184.788.369,1.73.517,2.543C11.481,10.609,11.537,10.927,11.583,11.2Zm-1.138-5c.089.133.244.344.443.6.672.88,1.826,2.311,2.511,3.15.366-.25.724-.506,1.064-.75l0,0c.6-.426,1.141-.816,1.574-1.063a2.485,2.485,0,0,1,.572-.257.43.43,0,0,1,.414.057.142.142,0,0,1,.028.039.347.347,0,0,1,.018.042,1.117,1.117,0,0,1,.032.113c.021.09.044.212.069.362.048.3.1.714.161,1.2.116.978.244,2.26.365,3.538s.231,2.553.311,3.516c.04.482.072.886.094,1.174.011.144.019.259.024.34,0,.041,0,.073.006.1s0,.022,0,.03a.177.177,0,0,1,0,.024l0,.013-.006.012a.113.113,0,0,1-.062.054.2.2,0,0,1-.066.012.669.669,0,0,1-.156-.021,4,4,0,0,1-.489-.16c-.406-.154-.97-.4-1.638-.713-1.337-.623-3.1-1.5-4.851-2.4s-3.506-1.826-4.826-2.54c-.66-.357-1.213-.661-1.605-.883-.2-.111-.352-.2-.462-.269-.055-.033-.1-.061-.13-.083L3.8,11.4l-.016-.014a.107.107,0,0,1-.018-.023.091.091,0,0,1-.011-.058.1.1,0,0,1,.023-.049.158.158,0,0,1,.06-.039A.794.794,0,0,1,4,11.181c.132-.022.325-.039.558-.053.466-.028,1.1-.044,1.733-.053s1.275-.01,1.755-.01l.581,0h.158c.135-.722.331-1.689.541-2.581.132-.558.269-1.088.4-1.509a4.355,4.355,0,0,1,.292-.753.5.5,0,0,1,.151-.184.152.152,0,0,1,.109-.023.163.163,0,0,1,.1.061.678.678,0,0,1,.074.119ZM8.089,9.384a.075.075,0,0,0,0-.106L6.7,7.939a.075.075,0,1,0-.1.108L7.983,9.385A.075.075,0,0,0,8.089,9.384ZM14.644,7.52a.075.075,0,0,0,.031-.1L12.891,4.037a.075.075,0,1,0-.133.07l1.784,3.381a.075.075,0,0,0,.1.031ZM8.084,7.51A.075.075,0,0,0,8.092,7.4l-.161-.188c-.5-.58-1.76-2.061-2.33-2.679a.075.075,0,1,0-.11.1c.567.615,1.829,2.092,2.325,2.673l.162.189A.075.075,0,0,0,8.084,7.51Zm4.02-.716a.075.075,0,0,0,.038-.1c-.011-.026-.044-.084-.091-.164s-.113-.191-.191-.323l-.326-.544-.282-.47c-.478-.8-1.063-1.782-1.532-2.614a.075.075,0,1,0-.131.074c.47.834,1.056,1.82,1.534,2.618l.282.47.326.543c.078.131.143.24.19.321s.076.133.083.149a.075.075,0,0,0,.1.038Z" transform="translate(-3.754 -2.541)" fill-rule="evenodd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/home/content/transactions.tsx
var import_react_loading_skeleton2 = __toESM(require("react-loading-skeleton"));
var import_jsx_runtime13 = require("react/jsx-runtime");
var TransactionsHome = ({
  transactions,
  currencies,
  filterByCurrency,
  onPaymentRequestTap,
  onTransactionTap
}) => {
  const { t, language } = useTranslation();
  const [selectedId, setSelectedId] = (0, import_react10.useState)(null);
  const {
    isLoadingTransactions,
    isLoadingMoreTransactions,
    transactionHasMore,
    loadMoreTransactions,
    activeAssetSymbol
  } = useStore();
  const actions = useActions();
  const sentinelRef = (0, import_react10.useRef)(null);
  const currentCurrency = filterByCurrency || activeAssetSymbol;
  (0, import_react10.useEffect)(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && transactionHasMore && !isLoadingMoreTransactions) {
          loadMoreTransactions(actions);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [transactionHasMore, isLoadingMoreTransactions, loadMoreTransactions, actions]);
  const isPaymentRequestLedger = (ledger) => {
    return ledger.ledgerType === "PAYMENT_REQUEST" || !!ledger.metadata?.requestCode;
  };
  const isTransferLedger = (ledger) => {
    return ledger.ledgerType === "ACCOUNT_TRANSFER" || ledger.title?.toLowerCase().includes("transfer");
  };
  const getCounterpartyInfo = (ledger) => {
    const isOutgoing = ledger.direction === "OUT";
    const counterpartyAccount = isOutgoing ? ledger.receiverAccount : ledger.senderAccount;
    if (counterpartyAccount) {
      const maskedName = counterpartyAccount.name || "";
      return `| ${counterpartyAccount.accountNumber} | ${maskedName}`;
    }
    const accountId = isOutgoing ? ledger.receiverAccountId : ledger.senderAccountId;
    if (accountId) {
      const idNum = accountId.replace(/\D/g, "").slice(-6) || "000000";
      return `${idNum.slice(0, 4)}-${idNum.slice(4, 8) || "0000"}`;
    }
    return "";
  };
  const getTransactionSubtitle = (ledger) => {
    if (isTransferLedger(ledger)) {
      return getCounterpartyInfo(ledger);
    }
    if (ledger.senderAccount) {
      return `${ledger.senderAccount?.name} | ${ledger.senderAccount?.accountNumber}`;
    }
    if (ledger.description || ledger.note) {
      return ledger.description || ledger.note || "";
    }
    return "";
  };
  const getTransactionIcon = (ledger) => {
    if (isTransferLedger(ledger)) {
      return ledger.direction === "OUT" ? transfer_default : recieve_default;
    }
    if (ledger.direction === "OUT") {
      return cashwithdraw_default;
    } else if (ledger.direction === "IN") {
      return cashdeposit_default;
    }
    return refundorder_default;
  };
  const formatTransactionTitle = (ledger) => {
    if (isTransferLedger(ledger)) {
      return ledger.direction === "OUT" ? t.home.transactions.transferSend : t.home.transactions.transferReceive;
    }
    return ledger.title || t.home.transactions.defaultTitle;
  };
  const formatTransactionDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString(language, { month: "long" });
    return `${day}.${month}`;
  };
  const formatStatus = (status) => {
    switch (status) {
      case "COMPLETED":
        return t.home.transactionStatus.success;
      case "PENDING":
        return t.home.transactionStatus.pending;
      case "FAILED":
        return t.home.transactionStatus.failed;
      default:
        return status;
    }
  };
  const formattedTransactions = (0, import_react10.useMemo)(() => {
    const arr = [];
    transactions?.forEach((ledger) => {
      if (filterByCurrency && ledger.assetSymbol !== filterByCurrency) {
        return;
      }
      const isOutgoing = ledger.direction === "OUT";
      arr.push({
        id: ledger.id,
        title: formatTransactionTitle(ledger),
        subtitle: getTransactionSubtitle(ledger),
        date: formatTransactionDate(ledger.createdAt),
        description: ledger.description || ledger.note || "",
        status: formatStatus(ledger.status),
        amount: ledger.amount.toString(),
        currency: currencies?.find((currency) => currency.symbol === ledger.assetSymbol)?.symbol || ledger.assetSymbol,
        icon: getTransactionIcon(ledger),
        arrowIcon: isOutgoing ? arrwoup_default : arrowdown_default,
        isNegative: isOutgoing,
        requestCode: isPaymentRequestLedger(ledger) ? ledger.metadata?.requestCode : void 0,
        ledger
      });
    });
    return arr;
  }, [transactions, currencies, filterByCurrency, t]);
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "w-full px-3 mt-[px] flex flex-col flex-1 overflow-hidden items-start", children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h2", { className: "font-quicksand font-bold ml-3.75 text-[11px] text-[#1D1D1D] mb-2.25 shrink-0", children: currentCurrency ? t.home.allTransactionsWithCurrency.replace("{{currency}}", currentCurrency) : t.home.allTransactions }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "flex w-full flex-col gap-1.25 overflow-y-auto flex-1 no-scrollbar px-px py-px", children: [
      isLoadingTransactions && Array.from({ length: 10 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        import_react_loading_skeleton2.default,
        {
          width: 400,
          className: "w-full",
          height: 50,
          borderRadius: 15
        },
        i
      )),
      formattedTransactions.map((tx) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        TransactionItem_default,
        {
          title: tx.title,
          date: tx.date,
          description: tx.subtitle || tx.description || "",
          status: tx.status,
          amount: tx.amount,
          currency: tx.currency,
          icon: tx.icon,
          arrowIcon: tx.arrowIcon,
          isNegative: tx.isNegative,
          isSelected: selectedId === tx.id,
          onClick: () => {
            setSelectedId(tx.id);
            if (tx.requestCode && onPaymentRequestTap) {
              onPaymentRequestTap(tx.requestCode);
            } else if (onTransactionTap) {
              onTransactionTap(tx.ledger);
            }
          }
        },
        tx.id
      )),
      isLoadingMoreTransactions && Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        import_react_loading_skeleton2.default,
        {
          width: 400,
          className: "w-full",
          height: 50,
          borderRadius: 15
        },
        `more-${i}`
      )),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { ref: sentinelRef, className: "h-1 shrink-0" })
    ] })
  ] });
};
var transactions_default = TransactionsHome;

// src/components/QR/receive/CreatePaymentRequest.tsx
var import_react22 = require("react");

// src/assets/icons/home/qr/title.svg
var title_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96.681" height="30.004" viewBox="0 0 96.681 30.004">%0A  <g id="Group_13790" data-name="Group 13790" transform="translate(-144 -443)">%0A    <path id="Path_23326" data-name="Path 23326" d="M11.142-46.586a1.056,1.056,0,0,1,.811.431,1.692,1.692,0,0,1,.366,1.133,1.706,1.706,0,0,1-.938,1.452,3.885,3.885,0,0,1-2.114.591,6.144,6.144,0,0,1-3.322-.846q-1.351-.846-1.351-3.591v-8.81H3.13a1.722,1.722,0,0,1-1.272-.511,1.736,1.736,0,0,1-.509-1.277,1.645,1.645,0,0,1,.509-1.229,1.751,1.751,0,0,1,1.272-.495H4.593V-61.78a1.889,1.889,0,0,1,.556-1.389,1.874,1.874,0,0,1,1.383-.559,1.784,1.784,0,0,1,1.335.559,1.918,1.918,0,0,1,.54,1.389v2.043h2.257a1.722,1.722,0,0,1,1.272.511,1.736,1.736,0,0,1,.509,1.277,1.645,1.645,0,0,1-.509,1.229,1.751,1.751,0,0,1-1.272.495H8.408v8.65a1.224,1.224,0,0,0,.35.974,1.407,1.407,0,0,0,.954.3,2.719,2.719,0,0,0,.7-.128A1.893,1.893,0,0,1,11.142-46.586Zm13.8-13.789a2.425,2.425,0,0,1,1.606.543,1.62,1.62,0,0,1,.652,1.277,1.982,1.982,0,0,1-.509,1.484,1.674,1.674,0,0,1-1.208.495A3.161,3.161,0,0,1,24.4-56.8q-.1-.032-.429-.128a2.583,2.583,0,0,0-.715-.1,2.818,2.818,0,0,0-1.59.511,3.723,3.723,0,0,0-1.256,1.548,5.719,5.719,0,0,0-.493,2.474v7.565a1.918,1.918,0,0,1-.54,1.389,1.822,1.822,0,0,1-1.367.559,1.822,1.822,0,0,1-1.367-.559,1.918,1.918,0,0,1-.54-1.389V-58.109a1.918,1.918,0,0,1,.54-1.389,1.822,1.822,0,0,1,1.367-.559,1.822,1.822,0,0,1,1.367.559,1.918,1.918,0,0,1,.54,1.389v.415a4.825,4.825,0,0,1,2.1-1.995A6.43,6.43,0,0,1,24.94-60.376Zm17.74.319a1.821,1.821,0,0,1,1.367.559,1.918,1.918,0,0,1,.54,1.389v13.566q0,4.15-2.225,6.049a8.849,8.849,0,0,1-5.945,1.9,14.365,14.365,0,0,1-2.21-.176,8.261,8.261,0,0,1-1.828-.463q-1.558-.67-1.558-1.851a1.646,1.646,0,0,1,.1-.511,1.98,1.98,0,0,1,.652-1.069,1.575,1.575,0,0,1,1-.367,1.89,1.89,0,0,1,.6.1q.223.1.779.319a8,8,0,0,0,1.176.367,5.687,5.687,0,0,0,1.288.144,4.81,4.81,0,0,0,3.322-.974A4.366,4.366,0,0,0,40.8-44.416v-.319a6.188,6.188,0,0,1-5.15,2.075,5.47,5.47,0,0,1-2.925-.782,5.274,5.274,0,0,1-1.971-2.171,6.965,6.965,0,0,1-.7-3.176v-9.321A1.918,1.918,0,0,1,30.6-59.5a1.822,1.822,0,0,1,1.367-.559,1.822,1.822,0,0,1,1.367.559,1.918,1.918,0,0,1,.54,1.389v8.171a3.986,3.986,0,0,0,.874,2.889,3.46,3.46,0,0,0,2.559.878,3.324,3.324,0,0,0,2.559-.974,3.951,3.951,0,0,0,.906-2.793v-8.171a1.918,1.918,0,0,1,.54-1.389A1.822,1.822,0,0,1,42.68-60.056ZM62.455-66.6a.594.594,0,0,1,.461.192.642.642,0,0,1,.175.447v22.344a.614.614,0,0,1-.191.447.609.609,0,0,1-.445.192.594.594,0,0,1-.461-.192.642.642,0,0,1-.175-.447V-46.65A6.88,6.88,0,0,1,59.4-43.809a6.314,6.314,0,0,1-3.688,1.149,6.711,6.711,0,0,1-3.752-1.1,7.644,7.644,0,0,1-2.655-3.016,9.333,9.333,0,0,1-.97-4.277,9.333,9.333,0,0,1,.97-4.277,7.525,7.525,0,0,1,2.655-3,6.783,6.783,0,0,1,3.752-1.085A6.487,6.487,0,0,1,59.371-58.3a6.487,6.487,0,0,1,2.448,2.9V-65.962a.642.642,0,0,1,.175-.447A.594.594,0,0,1,62.455-66.6ZM55.779-43.873a5.63,5.63,0,0,0,3.179-.926,6.278,6.278,0,0,0,2.194-2.57,8.36,8.36,0,0,0,.795-3.687,8.257,8.257,0,0,0-.795-3.671,6.255,6.255,0,0,0-2.21-2.554,5.653,5.653,0,0,0-3.163-.926,5.6,5.6,0,0,0-3.132.926,6.347,6.347,0,0,0-2.225,2.57,8.15,8.15,0,0,0-.811,3.655,8.122,8.122,0,0,0,.811,3.671,6.537,6.537,0,0,0,2.21,2.57A5.509,5.509,0,0,0,55.779-43.873Zm27.31-7.15a8.88,8.88,0,0,1-1.017,4.261,7.733,7.733,0,0,1-2.814,3,7.484,7.484,0,0,1-3.99,1.1,7.484,7.484,0,0,1-3.99-1.1,7.82,7.82,0,0,1-2.83-3.016,8.8,8.8,0,0,1-1.033-4.245A8.862,8.862,0,0,1,68.448-55.3a7.861,7.861,0,0,1,2.814-3.016,7.46,7.46,0,0,1,4.006-1.1,7.484,7.484,0,0,1,3.99,1.1A7.7,7.7,0,0,1,82.071-55.3,8.974,8.974,0,0,1,83.089-51.023Zm-1.272,0a7.868,7.868,0,0,0-.843-3.671,6.507,6.507,0,0,0-2.337-2.57,6.189,6.189,0,0,0-3.37-.942,6.212,6.212,0,0,0-3.354.942,6.584,6.584,0,0,0-2.369,2.57,7.748,7.748,0,0,0-.858,3.671,7.68,7.68,0,0,0,.858,3.639,6.583,6.583,0,0,0,2.369,2.57,6.212,6.212,0,0,0,3.354.942,6.268,6.268,0,0,0,3.37-.926,6.367,6.367,0,0,0,2.337-2.57A7.9,7.9,0,0,0,81.817-51.023Zm4.705,5.49a1.189,1.189,0,0,1-.223-.606.531.531,0,0,1,.254-.415.519.519,0,0,1,.381-.16.6.6,0,0,1,.509.255,5.923,5.923,0,0,0,5.15,2.649,5.214,5.214,0,0,0,2.957-.846,2.615,2.615,0,0,0,1.272-2.282,2.463,2.463,0,0,0-1.113-2.2,9.9,9.9,0,0,0-3.052-1.213A11.751,11.751,0,0,1,88.6-52.061a3.505,3.505,0,0,1-1.478-3.016,3.859,3.859,0,0,1,1.494-3.112,5.858,5.858,0,0,1,3.847-1.229,6.978,6.978,0,0,1,2.591.511A6.472,6.472,0,0,1,97.4-57.279a.575.575,0,0,1,.223.447.7.7,0,0,1-.223.511.987.987,0,0,1-.413.128.481.481,0,0,1-.381-.192,5.494,5.494,0,0,0-4.26-1.819,4.764,4.764,0,0,0-2.845.83,2.669,2.669,0,0,0-1.16,2.3,2.62,2.62,0,0,0,1.256,2.123,11.862,11.862,0,0,0,3.418,1.325,15.739,15.739,0,0,1,2.686.91,4.224,4.224,0,0,1,1.7,1.389A3.932,3.932,0,0,1,98.031-47a3.767,3.767,0,0,1-1.542,3.176,6.5,6.5,0,0,1-4.022,1.165A7.306,7.306,0,0,1,86.522-45.533Z" transform="translate(142.65 509.6)" fill="%231d1d1d"/>%0A  </g>%0A</svg>%0A';

// src/components/QR/receive/CreatePaymentRequest.tsx
var import_image8 = __toESM(require("next/image"));

// src/components/ui/CustomQR.tsx
var import_react11 = require("react");
var import_qrcode = __toESM(require("qrcode"));
var import_jsx_runtime14 = require("react/jsx-runtime");
function isFinderZone(row, col, moduleCount) {
  if (row < 8 && col < 8) return true;
  if (row < 8 && col >= moduleCount - 8) return true;
  if (row >= moduleCount - 8 && col < 8) return true;
  return false;
}
function CustomQRCode({
  value,
  size = 250,
  errorCorrectionLevel = "L",
  bg = "#FFFFFF"
}) {
  const svgElements = (0, import_react11.useMemo)(() => {
    let qr;
    try {
      qr = import_qrcode.default.create(value, { errorCorrectionLevel });
    } catch {
      return null;
    }
    const moduleCount = qr.modules.size;
    const data = qr.modules.data;
    const moduleSize = size / moduleCount;
    const elements = [];
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (isFinderZone(row, col, moduleCount)) continue;
        if (data[row * moduleCount + col] !== 1) continue;
        const x = col * moduleSize;
        const y = row * moduleSize;
        const s = moduleSize * 0.95;
        const cx = x + moduleSize / 2;
        const cy = y + moduleSize / 2;
        const hs = s / 2;
        const variant = (row * 7 + col * 13 + row * col) % 8;
        let d;
        switch (variant) {
          case 0:
            d = `M${cx - hs + 0.5},${cy - hs}L${cx + hs},${cy - hs - 0.3}L${cx + hs - 0.5},${cy + hs}L${cx - hs},${cy + hs + 0.3}Z`;
            break;
          case 1:
            d = `M${cx - hs},${cy - hs + 0.5}L${cx + hs - 0.3},${cy - hs}L${cx + hs},${cy + hs - 0.5}L${cx - hs + 0.3},${cy + hs}Z`;
            break;
          case 2:
            d = `M${cx - hs + 0.8},${cy - hs}L${cx + hs},${cy - hs + 0.6}L${cx + hs - 0.8},${cy + hs}L${cx - hs},${cy + hs - 0.6}Z`;
            break;
          case 3:
            d = `M${cx - hs + 0.3},${cy - hs}L${cx + hs},${cy - hs + 0.2}L${cx + hs - 0.3},${cy + hs}L${cx - hs},${cy + hs - 0.2}Z`;
            break;
          case 4:
            d = `M${cx - hs},${cy - hs + 0.4}L${cx + hs},${cy - hs}L${cx + hs},${cy + hs - 0.4}L${cx - hs},${cy + hs}Z`;
            break;
          case 5:
            d = `M${cx - hs + 0.6},${cy - hs}L${cx + hs},${cy - hs + 0.4}L${cx + hs - 0.6},${cy + hs}L${cx - hs},${cy + hs - 0.4}Z`;
            break;
          case 6:
            d = `M${cx - hs},${cy - hs + 0.7}L${cx + hs - 0.5},${cy - hs}L${cx + hs},${cy + hs - 0.7}L${cx - hs + 0.5},${cy + hs}Z`;
            break;
          default:
            d = `M${cx - hs + 0.4},${cy - hs + 0.1}L${cx + hs - 0.1},${cy - hs + 0.4}L${cx + hs - 0.4},${cy + hs - 0.1}L${cx - hs + 0.1},${cy + hs - 0.4}Z`;
            break;
        }
        elements.push(/* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d, fill: "black" }, `d-${row}-${col}`));
      }
    }
    const finderSize = 7 * moduleSize;
    const outerR = finderSize * 0.33;
    const strokeW = moduleSize * 0.85;
    const coreSize = 3 * moduleSize;
    const corePad = (finderSize - coreSize) / 2;
    const coreR = coreSize * 0.25;
    const finders = [
      { x: 0, y: 0 },
      { x: (moduleCount - 7) * moduleSize, y: 0 },
      { x: 0, y: (moduleCount - 7) * moduleSize }
    ];
    finders.forEach((pos, i) => {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          "rect",
          {
            x: pos.x - moduleSize * 0.5,
            y: pos.y - moduleSize * 0.5,
            width: finderSize + moduleSize,
            height: finderSize + moduleSize,
            fill: bg
          },
          `fb-${i}`
        )
      );
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          "rect",
          {
            x: pos.x + strokeW / 2,
            y: pos.y + strokeW / 2,
            width: finderSize - strokeW,
            height: finderSize - strokeW,
            rx: outerR,
            ry: outerR,
            fill: "none",
            stroke: "black",
            strokeWidth: strokeW
          },
          `fo-${i}`
        )
      );
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          "rect",
          {
            x: pos.x + corePad,
            y: pos.y + corePad,
            width: coreSize,
            height: coreSize,
            rx: coreR,
            ry: coreR,
            fill: "black"
          },
          `fc-${i}`
        )
      );
    });
    return elements;
  }, [value, size, errorCorrectionLevel]);
  if (!svgElements) {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { width: size, height: size } });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      role: "img",
      "aria-label": `QR Code for ${value}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("rect", { width: size, height: size, fill: bg }),
        svgElements
      ]
    }
  );
}

// src/assets/icons/home/qr/copy.svg
var copy_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <path id="copy-4" d="M23.25,7.536V17.821a3.139,3.139,0,0,1-1.737,2.811c.011-.171.023-.343.023-.526V9.821a4.868,4.868,0,0,0-4.857-4.857H7.113a3.148,3.148,0,0,1,2.8-1.714h9.051A4.287,4.287,0,0,1,23.25,7.536Zm-6.571-.857H6.393A3.145,3.145,0,0,0,3.25,9.821V20.107A3.145,3.145,0,0,0,6.393,23.25H16.679a3.145,3.145,0,0,0,3.143-3.143V9.821A3.145,3.145,0,0,0,16.679,6.679Z" transform="translate(-3.25 -3.25)" fill="%23404040"/>%0A</svg>%0A';

// src/assets/icons/home/qr/addrequest.svg
var addrequest_default = 'data:image/svg+xml,<svg id="add-post" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <path id="Path_23800" data-name="Path 23800" d="M15.333,2V5.333A2.667,2.667,0,0,0,18,8h3.992q.008.1.008.2v8.464A5.333,5.333,0,0,1,16.666,22H7.333A5.333,5.333,0,0,1,2,16.666V7.333A5.333,5.333,0,0,1,7.333,2Zm.333,10a.667.667,0,0,1-.667.667H12.666V15a.667.667,0,0,1-1.333,0V12.666H9a.667.667,0,0,1,0-1.333h2.333V9a.667.667,0,0,1,1.333,0v2.333H15A.667.667,0,0,1,15.666,12Z" transform="translate(-2 -2)" fill="%23404040" fill-rule="evenodd"/>%0A  <path id="Path_23801" data-name="Path 23801" d="M46,2.742V5.828a1.333,1.333,0,0,0,1.333,1.333h3.513a2.665,2.665,0,0,0-.361-.414L46.7,3.212A2.666,2.666,0,0,0,46,2.742Z" transform="translate(-31.334 -2.495)" fill="%23404040"/>%0A</svg>%0A';

// src/assets/icons/home/qr/download.svg
var download_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <path id="download-5" d="M2,12C2,7.286,2,4.929,3.464,3.464S7.286,2,12,2s7.071,0,8.535,1.464S22,7.286,22,12s0,7.071-1.465,8.535S16.714,22,12,22s-7.071,0-8.536-1.464S2,16.714,2,12ZM12,6.25a.75.75,0,0,1,.75.75v5.189l1.72-1.72A.75.75,0,0,1,15.53,11.53l-3,3a.75.75,0,0,1-1.061,0l-3-3A.75.75,0,0,1,9.53,10.47l1.72,1.72V7A.75.75,0,0,1,12,6.25Zm-4,10a.75.75,0,1,0,0,1.5h8a.75.75,0,1,0,0-1.5Z" transform="translate(-2 -2)" fill="%23404040" fill-rule="evenodd"/>%0A</svg>%0A';

// src/assets/icons/home/qr/share.svg
var share_default = 'data:image/svg+xml,<svg id="_20x20" data-name="20x20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4612" data-name="Rectangle 4612" width="20" height="20" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_355" data-name="Mask Group 355" clip-path="url(%23clip-path)">%0A    <path id="send-2" d="M17.092,3.134,7.529,6.311c-6.428,2.15-6.428,5.655,0,7.794l2.838.943.942,2.838c2.139,6.428,5.655,6.428,7.794,0l3.188-9.552c1.419-4.289-.911-6.63-5.2-5.2Zm.339,5.7-4.024,4.046a.793.793,0,0,1-1.123,0,.8.8,0,0,1,0-1.123l4.024-4.046a.794.794,0,0,1,1.123,1.123Z" transform="translate(-2.708 -2.71)" fill="%233c3c3c"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/generate.svg
var generate_default = 'data:image/svg+xml,<svg id="add-post" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <path id="Path_23800" data-name="Path 23800" d="M15.333,2V5.333A2.667,2.667,0,0,0,18,8h3.992q.008.1.008.2v8.464A5.333,5.333,0,0,1,16.666,22H7.333A5.333,5.333,0,0,1,2,16.666V7.333A5.333,5.333,0,0,1,7.333,2Zm.333,10a.667.667,0,0,1-.667.667H12.666V15a.667.667,0,0,1-1.333,0V12.666H9a.667.667,0,0,1,0-1.333h2.333V9a.667.667,0,0,1,1.333,0v2.333H15A.667.667,0,0,1,15.666,12Z" transform="translate(-2 -2)" fill="%238d8d8d" fill-rule="evenodd"/>%0A  <path id="Path_23801" data-name="Path 23801" d="M46,2.742V5.828a1.333,1.333,0,0,0,1.333,1.333h3.513a2.665,2.665,0,0,0-.361-.414L46.7,3.212A2.666,2.666,0,0,0,46,2.742Z" transform="translate(-31.334 -2.495)" fill="%238d8d8d"/>%0A</svg>%0A';

// src/assets/icons/home/qr/generateblue.svg
var generateblue_default = 'data:image/svg+xml,<svg id="add-post" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <path id="Path_23800" data-name="Path 23800" d="M15.333,2V5.333A2.667,2.667,0,0,0,18,8h3.992q.008.1.008.2v8.464A5.333,5.333,0,0,1,16.666,22H7.333A5.333,5.333,0,0,1,2,16.666V7.333A5.333,5.333,0,0,1,7.333,2Zm.333,10a.667.667,0,0,1-.667.667H12.666V15a.667.667,0,0,1-1.333,0V12.666H9a.667.667,0,0,1,0-1.333h2.333V9a.667.667,0,0,1,1.333,0v2.333H15A.667.667,0,0,1,15.666,12Z" transform="translate(-2 -2)" fill="%23388cff" fill-rule="evenodd"/>%0A  <path id="Path_23801" data-name="Path 23801" d="M46,2.742V5.828a1.333,1.333,0,0,0,1.333,1.333h3.513a2.665,2.665,0,0,0-.361-.414L46.7,3.212A2.666,2.666,0,0,0,46,2.742Z" transform="translate(-31.334 -2.495)" fill="%23388cff"/>%0A</svg>%0A';

// src/assets/icons/home/qr/cancel.svg
var cancel_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <g id="Group_15267" data-name="Group 15267" transform="translate(-363 -851)">%0A    <g id="add-post" transform="translate(363 851)">%0A      <path id="Path_23800" data-name="Path 23800" d="M15.333,2V5.333A2.667,2.667,0,0,0,18,8h3.992q.008.1.008.2v8.464A5.333,5.333,0,0,1,16.666,22H7.333A5.333,5.333,0,0,1,2,16.666V7.333A5.333,5.333,0,0,1,7.333,2Z" transform="translate(-2 -2)" fill="%23404040" fill-rule="evenodd"/>%0A      <path id="Path_23801" data-name="Path 23801" d="M46,2.742V5.828a1.333,1.333,0,0,0,1.333,1.333h3.513a2.665,2.665,0,0,0-.361-.414L46.7,3.212A2.666,2.666,0,0,0,46,2.742Z" transform="translate(-31.334 -2.495)" fill="%23404040"/>%0A    </g>%0A    <path id="Path_23812" data-name="Path 23812" d="M1.155-1.531a.642.642,0,0,1-.474-.186A.622.622,0,0,1,.5-2.174a.594.594,0,0,1,.186-.449A.659.659,0,0,1,1.155-2.8H8.1a.642.642,0,0,1,.474.186.622.622,0,0,1,.186.457.594.594,0,0,1-.186.449.659.659,0,0,1-.474.178ZM4.609,2.008a.718.718,0,0,1-.516-.2A.675.675,0,0,1,3.881,1.3V-5.7a.7.7,0,0,1,.212-.525.739.739,0,0,1,.533-.2.682.682,0,0,1,.516.2.727.727,0,0,1,.195.525V1.28a.7.7,0,0,1-.728.728Z" transform="translate(368.168 859.289) rotate(45)" fill="%23fcfcfc"/>%0A  </g>%0A</svg>%0A';

// src/components/QR/receive/ActionButtons.tsx
var import_react12 = require("react");

// src/components/QR/shared/ActionButton.tsx
var import_image4 = __toESM(require("next/image"));
var import_jsx_runtime15 = require("react/jsx-runtime");
function ActionButton({
  icon,
  label,
  labelColor,
  onClick,
  disabled = false,
  filter
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
    "button",
    {
      onClick,
      disabled,
      className: "flex cursor-pointer flex-col items-center gap-1.5 transition-opacity hover:opacity-70 active:opacity-50 disabled:opacity-50",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "flex items-center justify-center w-7 h-7", children: icon && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          import_image4.default,
          {
            width: 20,
            height: 20,
            src: icon,
            alt: label,
            className: "w-5 h-5 object-contain",
            style: { filter: filter || "none" }
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: `text-[11px] font-medium ${labelColor || "text-text"}`, children: label })
      ]
    }
  );
}

// src/components/QR/receive/ActionButtons.tsx
var import_jsx_runtime16 = require("react/jsx-runtime");
function ActionButtons({
  mode,
  isFormValid,
  isLoading = false,
  onRequest,
  onCopy,
  onDownload,
  onShare,
  onGenerate,
  onCancel
}) {
  const { t } = useTranslation();
  const [generated, setGenerated] = (0, import_react12.useState)(false);
  const prevLoading = (0, import_react12.useRef)(false);
  (0, import_react12.useEffect)(() => {
    if (prevLoading.current && !isLoading) {
      setGenerated(true);
    }
    prevLoading.current = isLoading;
  }, [isLoading]);
  (0, import_react12.useEffect)(() => {
    if (mode !== "request") setGenerated(false);
  }, [mode]);
  const hideCancel = isLoading || generated;
  if (mode === "review") {
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "flex items-center justify-center gap-13 px-6 py-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: copy_default, label: t.home.qr.copy, onClick: onCopy }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: download_default, label: t.home.qr.download, onClick: onDownload }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: share_default, label: t.home.qr.share, onClick: onShare })
    ] });
  }
  if (mode === "request") {
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "flex items-center justify-between px-10 py-4 h-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "w-8.75" }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        ActionButton,
        {
          icon: isFormValid ? generateblue_default : generate_default,
          label: isLoading ? t.home.qr.generatingRequest : t.home.qr.generateRequest,
          onClick: onGenerate,
          labelColor: isFormValid ? "text-[#388CFF]" : void 0,
          disabled: !isFormValid || isLoading
        }
      ),
      !hideCancel ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "w-8.75", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: cancel_default, label: t.home.qr.cancel, onClick: onCancel }) }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "w-8.75" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "flex items-center justify-center gap-13 px-6 py-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: addrequest_default, label: t.home.qr.addRequest, onClick: onRequest }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: copy_default, label: t.home.qr.copy, onClick: onCopy }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: download_default, label: t.home.qr.download, onClick: onDownload }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ActionButton, { icon: share_default, label: t.home.qr.share, onClick: onShare })
  ] });
}

// src/context/ToastContext.tsx
var import_react13 = require("react");
var import_jsx_runtime17 = require("react/jsx-runtime");
var ToastContext = (0, import_react13.createContext)(null);
var toastIdCounter = 0;
var ToastProvider = ({
  children,
  theme = "dark"
}) => {
  const [toasts, setToasts] = (0, import_react13.useState)([]);
  const timersRef = (0, import_react13.useRef)(/* @__PURE__ */ new Map());
  const removeToast = (0, import_react13.useCallback)((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const clearAll = (0, import_react13.useCallback)(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);
  const startTimer = (0, import_react13.useCallback)(
    (id, duration) => {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );
  const pauseToast = (0, import_react13.useCallback)((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isPaused: true } : t));
  }, []);
  const resumeToast = (0, import_react13.useCallback)(
    (id) => {
      setToasts((prev) => {
        const toast2 = prev.find((t) => t.id === id);
        if (toast2 && toast2.isPaused) {
          startTimer(id, toast2.duration);
          return prev.map((t) => t.id === id ? { ...t, isPaused: false } : t);
        }
        return prev;
      });
    },
    [startTimer]
  );
  const addToast = (0, import_react13.useCallback)(
    (type, message, options) => {
      const id = `toast-${++toastIdCounter}`;
      const duration = options?.duration ?? 4e3;
      const showProgress = options?.showProgress ?? false;
      const newToast = {
        id,
        type,
        message,
        duration,
        isPaused: false,
        showProgress,
        createdAt: Date.now()
      };
      setToasts((prev) => [...prev, newToast]);
      startTimer(id, duration);
    },
    [startTimer]
  );
  const toast = (0, import_react13.useMemo)(() => ({
    success: (message, options) => addToast("success", message, options),
    error: (message, options) => addToast("error", message, options),
    warn: (message, options) => addToast("warn", message, options),
    info: (message, options) => addToast("info", message, options)
  }), [addToast]);
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
    ToastContext.Provider,
    {
      value: { toasts, theme, toast, removeToast, pauseToast, resumeToast, clearAll },
      children
    }
  );
};
var useToast = () => {
  const context = (0, import_react13.useContext)(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// src/components/QR/receive/CreatePaymentRequest.tsx
var import_html2canvas = __toESM(require("html2canvas"));

// src/hooks/useTransferPurposes.ts
var import_react14 = require("react");
function useTransferPurposes() {
  const { purposes: storePurposes, setPurposes, isLoadingPurposes } = useStore();
  const actions = useActions();
  const [error, setError] = (0, import_react14.useState)(null);
  const [isFetching, setIsFetching] = (0, import_react14.useState)(false);
  const fetchPurposes = (0, import_react14.useCallback)(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const result = await actions.transactions.getTransferPurposes();
      const mapped = mapPurposes(result);
      if (mapped.length > 0) {
        setPurposes(mapped);
      } else if (result && "error" in result) {
        setError(result.error);
      }
    } catch {
      setError("Failed to load purposes. Please try again.");
    } finally {
      setIsFetching(false);
    }
  }, [actions, setPurposes]);
  (0, import_react14.useEffect)(() => {
    if (storePurposes.length === 0 && !isLoadingPurposes && !isFetching) {
      fetchPurposes();
    }
  }, [storePurposes.length, isLoadingPurposes]);
  return {
    purposes: storePurposes,
    isLoading: isLoadingPurposes || isFetching && storePurposes.length === 0,
    error: storePurposes.length > 0 ? null : error,
    retry: fetchPurposes
  };
}

// src/hooks/usePaymentRequestAPI.ts
var import_react15 = require("react");
var RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [1e3, 2e3, 4e3]
};
function usePaymentRequestAPI() {
  const actions = useActions();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = (0, import_react15.useState)(false);
  const withRetry = (0, import_react15.useCallback)(
    async (operation, operationName) => {
      setIsLoading(true);
      let lastError = null;
      for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
        try {
          const result = await operation();
          setIsLoading(false);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (/\b4\d{2}\b/.test(lastError.message)) {
            setIsLoading(false);
            throw lastError;
          }
          if (attempt < RETRY_CONFIG.maxAttempts - 1) {
            await new Promise(
              (resolve) => setTimeout(resolve, RETRY_CONFIG.delays[attempt])
            );
          }
        }
      }
      setIsLoading(false);
      const errorMessage = lastError?.message || `${operationName} failed. Please try again.`;
      toast.error(errorMessage);
      throw lastError;
    },
    [actions, toast]
  );
  return {
    isLoading,
    createPaymentRequest: (input) => withRetry(
      () => actions.paymentRequests.createPaymentRequest(input),
      "Create payment request"
    ),
    lookupPaymentRequest: (code) => withRetry(
      () => actions.paymentRequests.lookupPaymentRequest({ code }),
      "Lookup payment request"
    ),
    fulfillPaymentRequest: (input) => withRetry(
      () => actions.paymentRequests.fulfillPaymentRequest(input),
      "Fulfill payment"
    ),
    cancelPaymentRequest: (input) => withRetry(
      () => actions.paymentRequests.cancelPaymentRequest(input),
      "Cancel payment"
    )
  };
}

// src/hooks/usePaymentRequestEncryption.ts
var import_react16 = require("react");
var ALGORITHM = { name: "AES-GCM", length: 256 };
function usePaymentRequestEncryption(secret) {
  const encrypt = (0, import_react16.useCallback)(
    async (plaintext) => {
      const keyData = new TextEncoder().encode(secret.padEnd(32, "\0").slice(0, 32));
      const key = await window.crypto.subtle.importKey("raw", keyData, ALGORITHM, false, [
        "encrypt"
      ]);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(
        await window.crypto.subtle.encrypt(
          { ...ALGORITHM, iv },
          key,
          new TextEncoder().encode(plaintext)
        )
      );
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv, 0);
      combined.set(ciphertext, iv.length);
      const base64 = btoa(String.fromCharCode(...combined));
      return `PAYREQ:${base64}|${secret}`;
    },
    [secret]
  );
  const decrypt = (0, import_react16.useCallback)(
    async (qrString) => {
      const withoutPrefix = qrString.startsWith("PAYREQ:") ? qrString.slice("PAYREQ:".length) : qrString;
      const pipeIdx = withoutPrefix.lastIndexOf("|");
      const base64 = pipeIdx >= 0 ? withoutPrefix.slice(0, pipeIdx) : withoutPrefix;
      const accountNumber = pipeIdx >= 0 ? withoutPrefix.slice(pipeIdx + 1) : secret;
      const decryptionSecret = accountNumber || secret;
      const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);
      const keyData = new TextEncoder().encode(
        decryptionSecret.padEnd(32, "\0").slice(0, 32)
      );
      const key = await window.crypto.subtle.importKey("raw", keyData, ALGORITHM, false, [
        "decrypt"
      ]);
      const decrypted = await window.crypto.subtle.decrypt(
        { ...ALGORITHM, iv },
        key,
        encryptedData
      );
      return new TextDecoder().decode(decrypted);
    },
    [secret]
  );
  return { encrypt, decrypt };
}

// src/components/ui/Input.tsx
var import_react17 = require("react");
var import_jsx_runtime18 = require("react/jsx-runtime");
var Input = ({
  label,
  reviewMode = false,
  hideRequired = false,
  suffix,
  error,
  className = "",
  containerClassName = "",
  description,
  ...props
}) => {
  const inputRef = (0, import_react17.useRef)(null);
  const { required } = props;
  const { t } = useTranslation();
  const valueStr = String(props.value ?? props.defaultValue ?? "");
  const hasError = !!error;
  const borderColor = hasError ? error.type === "warn" ? "border-amber-400" : "border-red-400" : "border-[#d3d3d35e]";
  const msgColor = error?.type === "warn" ? "text-amber-500" : "text-red-500";
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
    "div",
    {
      className: `flex p-2 flex-col gap-1 rounded-[15px] w-94 cursor-text ${containerClassName} 
            ${props.disabled ? "bg-[#FCFCFC] border-none" : `bg-[#FFFFFF] border ${borderColor}`}`,
      onClick: () => inputRef.current?.focus(),
      children: [
        label && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { className: "text-[11px] text-[#8D8D8D] font-medium", children: [
          label,
          hideRequired || required && !reviewMode && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "text-red-500 ml-0.5", children: "*" }),
          hideRequired || !required && !reviewMode && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { className: "text-[#ADADAD] ml-1", children: [
            "(",
            t.home.qr.optional,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: `flex items-center gap-1 ${suffix ? "w-fit" : "w-full"}`, children: [
          reviewMode ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "p",
            {
              className: `min-w-0 text-[13px] font-medium text-text bg-transparent break-all ${suffix ? "" : "w-full"} ${className}`,
              children: valueStr
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "input",
            {
              ref: inputRef,
              style: suffix ? { width: `${Math.max(1, valueStr.length)}ch` } : void 0,
              disabled: props.disabled,
              readOnly: props.readOnly,
              className: `min-w-0 text-[13px] font-medium text-text hover:outline-0 focus:outline-0 focus:ring-0 focus:border-0 bg-transparent ${suffix ? "" : "w-full"} ${className}`,
              ...props
            }
          ),
          suffix && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "text-[13px] font-medium text-text shrink-0", children: suffix })
        ] }),
        description && description,
        hasError && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: `text-[11px] font-medium ${msgColor}`, children: error.message })
      ]
    }
  );
};
var Input_default = Input;

// src/components/ui/Select.tsx
var import_react18 = require("react");
var import_jsx_runtime19 = require("react/jsx-runtime");
var Select = ({
  label,
  options,
  value,
  onChange,
  variant = "tag",
  error,
  required,
  hideRequired,
  reviewMode,
  disabled,
  description,
  className = ""
}) => {
  const scrollRef = (0, import_react18.useRef)(null);
  const { t } = useTranslation();
  const isDragging = (0, import_react18.useRef)(false);
  const dragStartX = (0, import_react18.useRef)(0);
  const scrollStartLeft = (0, import_react18.useRef)(0);
  const onMouseDown = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e) => {
    if (!isDragging.current || !scrollRef.current) return;
    const delta = dragStartX.current - e.clientX;
    scrollRef.current.scrollLeft = scrollStartLeft.current + delta;
  };
  const onMouseUp = () => {
    isDragging.current = false;
  };
  const radius = variant === "pill" ? "rounded-full" : "rounded-xl";
  const hasError = !!error;
  const borderColor = hasError ? error.type === "warn" ? "border-amber-400" : "border-red-400" : "border-[#d3d3d35e]";
  const chipErrorBorder = hasError ? error.type === "warn" ? "border-amber-300" : "border-red-300" : "";
  const msgColor = error?.type === "warn" ? "text-amber-500" : "text-red-500";
  const selectedOption = options?.find((o) => o.id === value);
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
    "div",
    {
      className: `flex rounded-[15px] gap-1
             flex-col ${className}`,
      children: [
        label && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "text-[11px] text-[#8D8D8D] font-medium", children: [
          label,
          hideRequired || required && !reviewMode && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "text-red-500 ml-0.5", children: "*" }),
          hideRequired || !required && !reviewMode && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "text-[#ADADAD] ml-1", children: [
            "(",
            t.home.qr.optional,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: `flex flex-col gap-2`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            "div",
            {
              ref: scrollRef,
              className: "flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide select-none cursor-grab active:cursor-grabbing pb-0.5",
              onMouseDown,
              onMouseMove,
              onMouseUp,
              onMouseLeave: onMouseUp,
              children: options?.map((opt) => {
                const isSelected = value === opt.id;
                const selectedStyle = variant === "pill" ? "bg-[#1d1d1d] text-white border-[#1d1d1d]" : "bg-[#FCFCFC] text-[#1D1D1D] border-[#79affc]";
                const unselectedStyle = variant === "pill" ? "bg-white text-[#8D8D8D] border-[#EEEEEE]" : "bg-[#FFFFFF] text-[#1D1D1D] border-[#d3d3d35e]";
                return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: () => onChange?.(opt?.id),
                    className: `inline-flex shrink-0 items-center px-4 py-2 border text-[11px] font-medium transition-colors ${radius} ${isSelected ? selectedStyle : unselectedStyle} ${hasError && !isSelected ? chipErrorBorder : ""}`,
                    children: opt.label
                  },
                  opt.id
                );
              })
            }
          ),
          description && description
        ] }),
        hasError && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { className: `text-[11px] font-medium ${msgColor}`, children: error.message })
      ]
    }
  );
};
var Select_default = Select;

// src/components/QR/receive/AccountInfo.tsx
var import_react19 = require("react");
var import_image5 = __toESM(require("next/image"));

// src/components/QR/receive/utils.ts
function maskString(str) {
  return str.split(" ").map((word) => word.length > 0 ? word[0] + "*".repeat(word.length - 1) : "").join(" ");
}
function buildValidityLabel(validityId, validities) {
  const base = validities.find((v) => v.id === validityId)?.label ?? validityId;
  if (validityId === "Always") return base;
  const minutesMap = {
    "1m": 1,
    "3m": 3,
    "15m": 15,
    "1h": 60,
    "24h": 1440
  };
  const minutes = minutesMap[validityId];
  if (!minutes) return base;
  const expiry = new Date(Date.now() + minutes * 60 * 1e3);
  const hh = expiry.getHours().toString().padStart(2, "0");
  const mm = expiry.getMinutes().toString().padStart(2, "0");
  const day = expiry.getDate();
  const month = expiry.toLocaleString("en-US", { month: "long" });
  const year = expiry.getFullYear();
  return `${base} Until ${hh}:${mm} | ${day} ${month} ${year}`;
}
function getPurposeLabel(purposeId, purposes) {
  return purposes.find((p) => p.id === purposeId)?.label ?? purposeId;
}

// src/components/QR/receive/AccountInfo.tsx
var import_jsx_runtime20 = require("react/jsx-runtime");
function AccountInfo({
  accountName,
  accountNumber,
  updateField,
  currency,
  reviewMode = false,
  downloadMode = false,
  hideRequired = false,
  showName: controlledShowName
}) {
  const { t } = useTranslation();
  const [internalShowName, setInternalShowName] = (0, import_react19.useState)(true);
  const showName = controlledShowName ?? internalShowName;
  const toggleShowName = () => {
    setInternalShowName((v) => !v);
    const newDisplayName = showName ? maskString(accountName) : accountName;
    updateField?.("displayedAccountName", newDisplayName);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "flex flex-col gap-2 px-1 w-full", children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "relative w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
        Input_default,
        {
          hideRequired,
          reviewMode,
          disabled: true,
          readOnly: true,
          containerClassName: "w-full",
          label: t.home.deposit.accountName,
          value: showName ? accountName : maskString(accountName)
        }
      ),
      !downloadMode && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
        "button",
        {
          onClick: toggleShowName,
          className: "absolute right-4 top-1/2 -translate-y-1/2 p-2",
          children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
            import_image5.default,
            {
              src: !showName ? eye_default : eye_open_default,
              alt: "toggle visibility",
              width: 16,
              height: 16,
              className: "opacity-50"
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "relative w-full", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      Input_default,
      {
        hideRequired,
        reviewMode,
        disabled: true,
        readOnly: true,
        containerClassName: "w-full",
        label: t.home.deposit.accountNumber,
        value: `${accountNumber}  ${currency}`
      }
    ) })
  ] });
}

// src/components/QR/receive/views/NoteField.tsx
var import_image6 = __toESM(require("next/image"));

// src/assets/icons/home/qr/pin.svg
var pin_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="16" height="16" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_885" data-name="Mask Group 885" clip-path="url(%23clip-path)">%0A    <g id="layer1" transform="translate(-0.531 -581.209)">%0A      <path id="path823" d="M12.776.535A1.6,1.6,0,0,0,11.669,1L10.444,2.224l3.33,3.33L15,4.33a1.61,1.61,0,0,0,0-2.263S13.93,1,13.929,1A1.589,1.589,0,0,0,12.776.535ZM9.69,2.978,2.067,10.6a1.609,1.609,0,0,0-.469,1.13v2.133a.533.533,0,0,0,.536.535l2.133,0a1.6,1.6,0,0,0,1.126-.465l7.628-7.624ZM2.08,15.467h0a.534.534,0,0,0,.055,1.067h12.8a.533.533,0,1,0,0-1.067H2.08Z" transform="translate(0 580.675)" fill="%23d3d3d3"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/QR/receive/views/NoteField.tsx
var import_jsx_runtime21 = require("react/jsx-runtime");
function NoteField({ value, onChange, disabled }) {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "relative", children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      Input_default,
      {
        containerClassName: "border-0",
        placeholder: t.home.qr.note,
        value,
        onChange: onChange ? (e) => onChange(e.target.value) : void 0,
        disabled,
        className: "text-[11px]! pl-8"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "absolute left-2 bottom-3 opacity-40", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(import_image6.default, { src: pin_default, alt: "note", width: 16, height: 16 }) })
  ] });
}

// src/components/QR/receive/views/RequestView.tsx
var import_jsx_runtime22 = require("react/jsx-runtime");
function RequestView({
  purposes,
  validities,
  formData,
  updateField,
  mode,
  errors = {},
  onFieldTouch
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "w-full flex flex-col h-full overflow-hidden relative", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "w-full flex-1 overflow-y-auto pb-20 transition-all duration-300", children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "pt-4 w-full", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      AccountInfo,
      {
        updateField,
        hideRequired: true,
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        currency: formData.currency
      }
    ) }),
    mode === "request" && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "w-full flex flex-col gap-2 pt-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex gap-2 w-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          Input_default,
          {
            id: "amount-hide",
            type: "number",
            required: true,
            label: t.home.qr.enterAmount,
            value: formData.amount,
            suffix: formData.currency,
            error: errors.amount,
            onChange: (e) => updateField("amount", e.target.value),
            onBlur: () => onFieldTouch?.("amount"),
            containerClassName: "w-1/2"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          Input_default,
          {
            label: t.home.qr.enterReference,
            value: formData.reference,
            onChange: (e) => updateField("reference", e.target.value),
            containerClassName: "w-1/2"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: `flex rounded-[15px] p-2
                border border-[#d3d3d35e] bg-[#FFFFFF]
             flex-col gap-1.5 `, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        Select_default,
        {
          required: true,
          label: t.home.qr.selectPurpose,
          options: purposes,
          value: formData.purpose,
          onChange: (value) => {
            updateField("purpose", value);
            onFieldTouch?.("purpose");
          },
          variant: "tag",
          error: errors.purpose,
          description: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            NoteField,
            {
              value: formData.note,
              onChange: (val) => updateField("note", val)
            }
          )
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: `flex rounded-[15px] p-2
                border border-[#d3d3d35e] bg-[#FFFFFF]
             flex-col gap-1.5 `, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        Select_default,
        {
          label: t.home.qr.validUntil,
          options: validities,
          value: formData.validity,
          onChange: (id) => {
            updateField("validity", id);
            onFieldTouch?.("validity");
          },
          variant: "tag",
          error: errors.validity,
          description: formData.validity !== "Always" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "font-quicksand mt-2 text-center text-[11px] font-normal text-[#1D1D1D] px-1", children: t.home.qr.validityDescription })
        }
      ) })
    ] })
  ] }) });
}

// src/components/ui/field-error.ts
function validateField(config, value, isTouched) {
  for (const cond of config.conditions ?? []) {
    if (cond.check(value)) {
      return { message: cond.message, type: cond.type };
    }
  }
  if (config.isRequired && !value && isTouched) {
    return {
      message: config.requiredMessage ?? "This field is required",
      type: "error"
    };
  }
  return void 0;
}

// src/components/QR/send/payment-request/CountdownTimer.tsx
var import_react20 = require("react");
var import_jsx_runtime23 = require("react/jsx-runtime");
function formatExpiryDate(date, locale) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate();
  const month = date.toLocaleString(locale, { month: "long" });
  const year = date.getFullYear();
  return {
    time: `${hours}:${minutes}`,
    date: `${day} ${month} ${year}`
  };
}
function formatCountdown(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
var CountdownTimer = ({ expiryTimestamp, onExpired }) => {
  const { t, language } = useTranslation();
  const onExpiredRef = (0, import_react20.useRef)(onExpired);
  onExpiredRef.current = onExpired;
  const hasFiredRef = (0, import_react20.useRef)(false);
  const getRemaining = (0, import_react20.useCallback)(() => {
    const expiry = new Date(expiryTimestamp).getTime();
    return Math.max(0, Math.floor((expiry - Date.now()) / 1e3));
  }, [expiryTimestamp]);
  const [remainingSeconds, setRemainingSeconds] = (0, import_react20.useState)(getRemaining);
  (0, import_react20.useEffect)(() => {
    if (getRemaining() <= 0) {
      if (!hasFiredRef.current) {
        hasFiredRef.current = true;
        onExpiredRef.current();
      }
      return;
    }
    const interval = setInterval(() => {
      const remaining = getRemaining();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (!hasFiredRef.current) {
          hasFiredRef.current = true;
          onExpiredRef.current();
        }
      }
    }, 1e3);
    return () => clearInterval(interval);
  }, [getRemaining]);
  const isExpired = remainingSeconds <= 0;
  const isWarning = !isExpired && remainingSeconds <= 60;
  const expiryDate = new Date(expiryTimestamp);
  const { time, date } = formatExpiryDate(expiryDate, language);
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "mt-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "text-[11px] text-[#8D8D8D] font-medium", children: t.transfer.deposit.validUntil }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "text-[11px] text-[#8D8D8D] mt-0.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: `tracking-widest ${isWarning ? "text-[#FF4D4D]" : "text-[#1D1D1D]"}`, children: formatCountdown(remainingSeconds) }),
      "  ",
      time,
      " \xB7 ",
      date
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: `text-[11px] ${isWarning ? "text-[#FF4D4D] " : "text-[#1D1D1D]"} mt-1`, children: t.transfer.deposit.expiryWarning })
  ] });
};
var CountdownTimer_default = CountdownTimer;

// src/components/QR/receive/views/ReadOnlyFields.tsx
var import_jsx_runtime24 = require("react/jsx-runtime");
function ReadOnlyFields({
  formData,
  purposes,
  validities,
  hideRequired = true,
  expiresAt,
  isPermanent,
  onExpired
}) {
  const { t } = useTranslation();
  const purposeLabel = getPurposeLabel(formData.purpose, purposes);
  const validityLabel = buildValidityLabel(formData.validity, validities);
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "w-full flex flex-col gap-4 pt-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "flex gap-2 w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
        Input_default,
        {
          hideRequired,
          reviewMode: true,
          id: "amount-hide",
          type: "number",
          required: true,
          disabled: true,
          label: t.home.qr.enterAmount,
          value: formData.amount,
          suffix: formData.currency,
          containerClassName: "w-1/2"
        }
      ),
      formData.reference && /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
        Input_default,
        {
          hideRequired,
          reviewMode: true,
          label: t.home.qr.enterReference,
          value: formData.reference,
          disabled: true,
          containerClassName: "w-1/2"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "flex gap-2 w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
        Input_default,
        {
          hideRequired,
          reviewMode: true,
          label: t.home.qr.selectPurpose,
          value: purposeLabel,
          disabled: true,
          className: "text-[11px]!",
          containerClassName: "w-1/2"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
        Input_default,
        {
          hideRequired,
          reviewMode: true,
          label: t.home.qr.type,
          value: t.home.qr.depositRequest,
          disabled: true,
          className: "text-[11px]!",
          containerClassName: "w-1/2"
        }
      )
    ] }),
    formData.note && /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(NoteField, { value: formData.note, disabled: true }),
    !isPermanent && expiresAt ? /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(CountdownTimer_default, { expiryTimestamp: expiresAt, onExpired: onExpired ?? (() => {
    }) }) : /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
      Input_default,
      {
        hideRequired,
        reviewMode: true,
        label: t.home.qr.validUntil,
        value: validityLabel,
        disabled: true,
        className: "text-[11px]!",
        containerClassName: "w-1/2",
        description: formData.validity !== "Always" && /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "font-quicksand mt-2 text-center text-[11px] font-normal text-[#1D1D1D] px-1", children: t.home.qr.validityDescription })
      }
    )
  ] });
}

// src/components/QR/receive/views/ReviewView.tsx
var import_jsx_runtime25 = require("react/jsx-runtime");
function ReviewView({ formData, purposes, validities, updateField, expiresAt, isPermanent, onExpired }) {
  const isExpired = !isPermanent && expiresAt ? new Date(expiresAt) < /* @__PURE__ */ new Date() : false;
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "w-full flex flex-col h-full overflow-hidden relative", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: `w-full flex-1 ${isExpired ? "pb-0" : "pb-20"}  overflow-y-auto transition-all duration-300`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "pt-4 w-full", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      AccountInfo,
      {
        updateField,
        hideRequired: true,
        reviewMode: true,
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        currency: formData.currency
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      ReadOnlyFields,
      {
        formData,
        purposes,
        validities,
        expiresAt,
        isPermanent,
        onExpired
      }
    ),
    isExpired && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "flex items-center justify-center px-6 py-4", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
      "button",
      {
        disabled: true,
        className: "text-center flex items-center justify-center h-7.5 w-full max-w-[320px] py-3 rounded-xl text-[#FFFFFF] bg-[#FF5F60] text-[11px] font-medium font-quicksand cursor-not-allowed",
        children: t.transfer.deposit.expiredButton
      }
    ) })
  ] }) });
}

// src/components/QR/receive/views/DownloadView.tsx
var import_react21 = require("react");
var import_image7 = __toESM(require("next/image"));
var import_jsx_runtime26 = require("react/jsx-runtime");
var DownloadView = (0, import_react21.forwardRef)(
  ({ qrValue, purposes, validities, formData }, ref) => {
    return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
      "div",
      {
        ref,
        className: "flex relative h-full flex-col items-center justify-center w-full bg-white py-6 px-4",
        style: { minWidth: 320 },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "relative w-22 h-7", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(import_image7.default, { src: title_default, alt: "Title Icon", fill: true, className: "object-contain" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "w-62.5 mt-4 h-62.5 flex flex-col items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(CustomQRCode, { errorCorrectionLevel: "L", value: qrValue, size: 224 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "pt-4 w-full", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
            AccountInfo,
            {
              downloadMode: true,
              reviewMode: true,
              accountName: formData.displayedAccountName,
              accountNumber: formData.accountNumber,
              currency: formData.currency
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
            ReadOnlyFields,
            {
              formData,
              purposes,
              validities
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "mt-4 text-center", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "text-[10px] text-[#8D8D8D]", children: "Powered by Ramaaz Digital Banking" }) })
        ]
      }
    );
  }
);
DownloadView.displayName = "DownloadView";
var DownloadView_default = DownloadView;

// src/components/QR/shared/shareQRImage.ts
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob from canvas"));
    }, "image/png");
  });
}
async function shareQRImage(canvas, title, text) {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], "deposit-qr.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file]
      });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "dismissed";
    }
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    return "copied";
  } catch {
    return "dismissed";
  }
}

// src/components/QR/receive/CreatePaymentRequest.tsx
var import_jsx_runtime27 = require("react/jsx-runtime");
function validityToApiFields(validity) {
  switch (validity) {
    case "Always":
      return { isPermanent: true };
    case "1m":
      return { expiryMinutes: 1, isPermanent: false };
    case "3m":
      return { expiryMinutes: 3, isPermanent: false };
    case "15m":
      return { expiryMinutes: 15, isPermanent: false };
    case "1h":
      return { expiryMinutes: 60, isPermanent: false };
    case "24h":
      return { expiryMinutes: 1440, isPermanent: false };
    default:
      return { isPermanent: true };
  }
}
var CreatePaymentRequest = ({
  account,
  balances,
  activeAssetSymbol
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { purposes } = useTransferPurposes();
  const { refreshTransactions } = useStore();
  const actions = useActions();
  const downloadRef = (0, import_react22.useRef)(null);
  const accountName = account?.name || "";
  const accountNumber = account?.number || "";
  const { createPaymentRequest: createPaymentRequest2, lookupPaymentRequest: lookupPaymentRequest2, isLoading: isApiLoading } = usePaymentRequestAPI();
  const { encrypt } = usePaymentRequestEncryption(accountNumber);
  const [mode, setMode] = (0, import_react22.useState)("address");
  const [qrValue, setQrValue] = (0, import_react22.useState)(null);
  const [hideQR, setHideQR] = (0, import_react22.useState)(false);
  const [showPreview, setShowPreview] = (0, import_react22.useState)(false);
  const [isGenerating, setIsGenerating] = (0, import_react22.useState)(false);
  const [touched, setTouched] = (0, import_react22.useState)({});
  const [showName, setShowName] = (0, import_react22.useState)(true);
  const [requestExpiresAt, setRequestExpiresAt] = (0, import_react22.useState)(null);
  const [requestIsPermanent, setRequestIsPermanent] = (0, import_react22.useState)(false);
  const [requestCode, setRequestCode] = (0, import_react22.useState)(null);
  const [isExpired, setIsExpired] = (0, import_react22.useState)(false);
  const activeBalance = activeAssetSymbol ? balances[activeAssetSymbol] : void 0;
  const accountType = account?.type || "";
  const validities = [
    { id: "Always", label: t.home.qr.validity.always },
    { id: "1m", label: t.home.qr.validity.m1 },
    { id: "3m", label: t.home.qr.validity.m3 },
    { id: "15m", label: t.home.qr.validity.m15 },
    { id: "1h", label: t.home.qr.validity.h1 },
    { id: "24h", label: t.home.qr.validity.h24 }
  ];
  const [formData, setFormData] = (0, import_react22.useState)({
    accountName,
    accountNumber,
    currency: activeAssetSymbol || "USD",
    amount: "",
    reference: "",
    purpose: "",
    validity: "Always",
    note: "",
    displayedAccountName: accountName
  });
  (0, import_react22.useEffect)(() => {
    if (activeBalance) {
      setFormData((prev) => ({
        ...prev,
        accountName,
        accountNumber,
        currency: activeAssetSymbol || prev.currency,
        displayedAccountName: showName ? accountName : maskString(accountName)
      }));
    }
  }, [activeBalance, activeAssetSymbol, accountName, accountNumber, showName]);
  const validationConfig = {
    amount: {
      isRequired: true,
      requiredMessage: t.home.qr.validation.amountRequired,
      conditions: [
        {
          check: (v) => !!v && parseFloat(v) <= 0,
          message: t.home.qr.validation.insufficientBalance,
          type: "warn"
        }
      ]
    },
    purpose: {
      isRequired: true,
      requiredMessage: t.home.qr.validation.purposeRequired
    },
    validity: {
      isRequired: true,
      requiredMessage: t.home.qr.validation.validityRequired
    }
  };
  const errors = {
    amount: validateField(validationConfig.amount, formData.amount, !!touched.amount),
    purpose: validateField(validationConfig.purpose, formData.purpose, !!touched.purpose),
    validity: validateField(validationConfig.validity, formData.validity, !!touched.validity)
  };
  const isFormValid = !!formData.amount && !!formData.purpose && !!formData.validity && !validateField(validationConfig.amount, formData.amount, true) && !validateField(validationConfig.purpose, formData.purpose, true) && !validateField(validationConfig.validity, formData.validity, true);
  const generateQrValue = (0, import_react22.useCallback)(
    async ({ cU, isForceRequest = false }) => {
      const aNa = accountName || formData.accountName;
      const aNu = accountNumber || formData.accountNumber;
      const cUr = cU || formData.currency;
      if (!aNa || aNa === "null") {
        setHideQR(true);
        setQrValue(null);
        return false;
      }
      if (mode === "request" || isForceRequest) {
        const { expiryMinutes, isPermanent } = validityToApiFields(formData.validity);
        const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const result = await createPaymentRequest2({
          accountNumber: aNu,
          assetType: "CURRENCY",
          assetSymbol: cUr,
          amount: parseFloat(formData.amount) || 0,
          purposeId: formData.purpose,
          note: formData.note || void 0,
          reference: formData.reference || void 0,
          expiryMinutes: expiryMinutes !== void 0 ? expiryMinutes : void 0,
          isPermanent,
          idempotencyKey
        });
        if ("error" in result) {
          toast.error(result.error);
          return false;
        }
        const qrString = await encrypt(result.requestCode);
        setQrValue(qrString);
        setHideQR(false);
        setRequestCode(result.requestCode);
        setRequestExpiresAt(result.isPermanent ? null : result.expiresAt ?? null);
        setRequestIsPermanent(result.isPermanent);
        refreshTransactions(actions);
        return true;
      }
      const params = new URLSearchParams();
      params.set("ana", aNa);
      params.set("anu", aNu);
      params.set("cu", cUr);
      setQrValue(params.toString());
      setHideQR(false);
      return true;
    },
    [formData, mode, accountName, accountNumber, createPaymentRequest2, encrypt, toast]
  );
  const handleRequest = (0, import_react22.useCallback)(
    ({
      cU,
      toastMsg = false,
      isForceRequest = false
    }) => {
      return (async () => {
        const success = await generateQrValue({ cU, isForceRequest });
        if (!success) {
          if (toastMsg) {
            toast.warn(t.home.qr.messages.noWalletIdAvailable);
          }
          return false;
        }
        if (toastMsg) {
          toast.success(t.home.qr.messages.qrGenerated);
        }
        return true;
      })();
    },
    [generateQrValue, toast, t]
  );
  (0, import_react22.useEffect)(() => {
    if (accountName && accountNumber && mode === "address") {
      void handleRequest({ cU: activeAssetSymbol });
    }
  }, [accountName, accountNumber, activeAssetSymbol, handleRequest]);
  const touchAll = () => setTouched({ amount: true, purpose: true, validity: true });
  const onFieldTouch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const handleGenerate = () => {
    touchAll();
    if (!isFormValid || isGenerating || isApiLoading) return;
    setIsGenerating(true);
    void handleRequest({ toastMsg: true, isForceRequest: true }).then((success) => {
      setIsGenerating(false);
      if (success) {
        setMode("review");
      }
    });
  };
  const captureCanvas = () => {
    return new Promise((resolve) => {
      if (!qrValue) {
        resolve(null);
        return;
      }
      setShowPreview(true);
      requestAnimationFrame(async () => {
        if (!downloadRef.current) {
          setShowPreview(false);
          resolve(null);
          return;
        }
        try {
          const canvas = await (0, import_html2canvas.default)(downloadRef.current, {
            backgroundColor: "#ffffff",
            scale: 2
          });
          resolve(canvas);
        } catch {
          resolve(null);
        } finally {
          setShowPreview(false);
        }
      });
    });
  };
  const handleDownload = async () => {
    if (!qrValue) {
      toast.warn(t.home.qr.messages.qrDownloadError);
      return;
    }
    const canvas = await captureCanvas();
    if (!canvas) {
      toast.error(t.home.qr.messages.qrDownloadFailed);
      return;
    }
    const link = document.createElement("a");
    link.download = `deposit-qr-${formData.accountNumber}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success(t.home.qr.messages.qrDownloadSuccess);
  };
  const handleShare = async () => {
    if (!qrValue) {
      toast.warn(t.home.qr.messages.qrDownloadError);
      return;
    }
    const canvas = await captureCanvas();
    if (!canvas) {
      toast.error(t.home.qr.messages.qrDownloadFailed);
      return;
    }
    const result = await shareQRImage(
      canvas,
      `Deposit QR \u2014 ${formData.accountNumber}`,
      `Account: ${formData.accountName}
Number: ${formData.accountNumber}`
    );
    if (result === "shared") {
      toast.success(t.home.qr.messages.qrShareSuccess);
    } else if (result === "copied") {
      toast.success(t.home.qr.messages.qrCopied);
    }
  };
  const handleCopy = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      toast.success(t.home.qr.messages.qrCopied);
    } catch {
      toast.error(t.home.qr.messages.qrDownloadFailed);
    }
  };
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleExpired = (0, import_react22.useCallback)(async () => {
    if (requestCode) {
      try {
        const result = await lookupPaymentRequest2(requestCode);
        if (!("error" in result)) {
        }
      } catch {
      }
    }
    setIsExpired(true);
  }, [requestCode, lookupPaymentRequest2]);
  return /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "flex flex-col items-center w-full max-w-100 mx-auto h-full relative overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex-1 w-full flex flex-col pt-2 overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex flex-col items-center w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "relative w-25 h-7", children: /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(import_image8.default, { src: title_default, alt: "Title Icon", fill: true, className: "object-contain" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "w-65 mt-8 shrink-0 h-65 flex flex-col items-center justify-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          "div",
          {
            className: hideQR || isExpired ? "opacity-10 bg-white rounded-xl w-full h-full" : "",
            children: /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
              CustomQRCode,
              {
                errorCorrectionLevel: "L",
                value: qrValue || "",
                size: 250
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "font-quicksand text-4 opacity-100! mb-2 font-light text-text text-center pt-1", children: isExpired ? "Expired Code ( Time Expired )" : formData.accountNumber })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "flex-1 relative overflow-hidden flex flex-col pt-3", children: mode === "review" ? /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
      ReviewView,
      {
        updateField,
        purposes,
        validities,
        formData,
        showName,
        expiresAt: requestExpiresAt,
        isPermanent: requestIsPermanent,
        onExpired: handleExpired
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
      RequestView,
      {
        purposes,
        validities,
        mode,
        formData,
        updateField,
        errors,
        onFieldTouch,
        onGenerate: handleGenerate,
        onCancel: () => {
          setHideQR(false);
          setMode("address");
          setTouched({});
        }
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]", children: !isExpired && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
      ActionButtons,
      {
        isFormValid,
        mode,
        isLoading: isGenerating || isApiLoading,
        onRequest: () => {
          setHideQR(true);
          setMode("request");
        },
        onCopy: handleCopy,
        onDownload: handleDownload,
        onShare: handleShare,
        onGenerate: handleGenerate,
        onCancel: () => {
          setHideQR(false);
          setMode("address");
          setTouched({});
        }
      }
    ) }),
    showPreview && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "fixed max-w-100 -left-2499.75 top-0 h-full", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
      DownloadView_default,
      {
        formData,
        ref: downloadRef,
        qrValue: qrValue || "",
        purposes,
        validities
      }
    ) })
  ] }) });
};
var CreatePaymentRequest_default = CreatePaymentRequest;

// src/components/QR/send/payment-request/PaymentRequestReview.tsx
var import_react27 = require("react");
var import_image12 = __toESM(require("next/image"));

// src/components/ui/ConfirmDialog.tsx
var import_react23 = require("react");
var import_framer_motion3 = require("framer-motion");
var import_jsx_runtime28 = require("react/jsx-runtime");
var EASING3 = [0.4, 0, 0.2, 1];
var DURATION3 = 0.35;
var BACKDROP_COLOR = "rgba(0, 0, 0, 0.4)";
var ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  inputConfig
}) => {
  const [inputValue, setInputValue] = (0, import_react23.useState)(inputConfig?.defaultValue || "");
  (0, import_react23.useEffect)(() => {
    if (open && inputConfig?.defaultValue) {
      setInputValue(inputConfig.defaultValue);
    }
  }, [open, inputConfig?.defaultValue]);
  const handleBackdropClick = (0, import_react23.useCallback)(
    (e) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );
  (0, import_react23.useEffect)(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);
  (0, import_react23.useEffect)(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(import_framer_motion3.AnimatePresence, { children: open && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
    import_framer_motion3.motion.div,
    {
      className: "fixed inset-0 flex items-center justify-center",
      style: { zIndex: 60, backgroundColor: BACKDROP_COLOR },
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: DURATION3 * 0.6, ease: EASING3 } },
      exit: { opacity: 0, transition: { duration: DURATION3 * 0.6, ease: EASING3 } },
      onClick: handleBackdropClick,
      children: /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(
        import_framer_motion3.motion.div,
        {
          className: "bg-white rounded-2xl shadow-xl mx-6 w-full max-w-sm overflow-hidden",
          initial: { scale: 0.9, opacity: 0 },
          animate: {
            scale: 1,
            opacity: 1,
            transition: { duration: DURATION3, ease: EASING3 }
          },
          exit: {
            scale: 0.9,
            opacity: 0,
            transition: { duration: DURATION3 * 0.7, ease: EASING3 }
          },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "px-6 pt-6 pb-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("h3", { className: "text-lg font-bold text-[#404040] text-center", children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("p", { className: "mt-2 text-sm text-gray-500 text-center", children: message }),
              inputConfig && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                "input",
                {
                  type: "text",
                  value: inputValue,
                  onChange: (e) => setInputValue(e.target.value),
                  placeholder: inputConfig.placeholder,
                  className: "w-full mt-3 px-3 py-2.5 text-sm text-[#1D1D1D] bg-gray-50 border border-gray-200 rounded-xl focus:border-[#388CFF] focus:outline-0 transition-colors"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "flex gap-3 px-6 pb-6", children: [
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                "button",
                {
                  type: "button",
                  onClick: onCancel,
                  className: "flex-1 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-[#404040] transition-colors hover:bg-gray-100 active:bg-gray-200",
                  children: cancelLabel
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                "button",
                {
                  type: "button",
                  onClick: () => onConfirm(inputConfig ? inputValue : void 0),
                  className: "flex-1 py-3 rounded-xl bg-[#3066CC] text-sm font-medium text-white transition-colors hover:bg-[#254E9E] active:bg-[#1e3f80]",
                  children: confirmLabel
                }
              )
            ] })
          ]
        }
      )
    }
  ) });
};
var ConfirmDialog_default = ConfirmDialog;

// src/components/QR/shared/DetailRow.tsx
var import_jsx_runtime29 = require("react/jsx-runtime");
var DetailRow = ({
  label,
  value,
  icon,
  valueColor,
  bold
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("p", { className: "text-[11px] text-[#8D8D8D] font-medium", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "flex items-center gap-1.5 mt-0.5", children: [
      icon && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { className: "flex-shrink-0", children: icon }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
        "p",
        {
          className: `text-[13px] ${bold ? "font-bold" : "font-medium"}`,
          style: { color: valueColor || "#1D1D1D" },
          children: value
        }
      )
    ] })
  ] });
};
var DetailRow_default = DetailRow;

// src/components/QR/send/payment-request/SendButton.tsx
var import_image9 = __toESM(require("next/image"));

// src/assets/icons/home/transfer/transferdisabled.svg
var transferdisabled_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="25" viewBox="0 0 25 25">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_6657" data-name="Rectangle 6657" width="25" height="25" transform="translate(0.172 0.311)" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_876" data-name="Mask Group 876" transform="translate(-0.172 -0.311)" clip-path="url(%23clip-path)">%0A    <g id="paper-plane" transform="translate(1.259 0.116)">%0A      <path id="Path_23899" data-name="Path 23899" d="M26.484,2.7c.027.215-1.3,16.154-1.723,16.547-.478.444-2.02-.658-3.923-2.02-.568-.407-1.169-.836-1.783-1.254-.861-.587-1.7-1.164-2.42-1.66l-.53-.367.53-.574.821-.889.821-.889L19.1,10.7l.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889Zm-12.2,19.338c-.049.073-.085.132-.106.174A.981.981,0,0,0,14.281,22.036Zm-2.44-7.8c.149-.092.7-.523,1.511-1.169.47-.375,1.027-.823,1.642-1.319l.821-.663,1.209-.977,0,0h0C18.5,8.914,20.1,7.62,21.56,6.451L22.38,5.8l.821-.653c.286-.227.561-.443.821-.647.294-.23.569-.444.821-.639A10.705,10.705,0,0,1,26.484,2.7C26.076,1.9,4.084,13.576,3.876,13.943s7.965.3,7.965.3Z" transform="translate(-3.753 -2.54)" fill="%238d8d8d" fill-rule="evenodd"/>%0A      <path id="Path_23900" data-name="Path 23900" d="M15.954,13.78c-.079.474-.178,1.045-.291,1.664-.235,1.29-.529,2.786-.821,4.035a13.528,13.528,0,0,1-.713,2.395c.142-.214.393-.555.713-.973,1.092-1.431,2.983-3.773,4.062-5.092-.861-.587-1.7-1.164-2.42-1.66Z" transform="translate(-3.602 -2.376)" fill="%23fff"/>%0A      <path id="Path_23901" data-name="Path 23901" d="M15.7,15.606c.113-.619.212-1.19.291-1.664l.53-.574.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889.821-.889L26.369,2.7a10.705,10.705,0,0,0-1.641,1.159c-.252.194-.527.408-.821.639-.26.2-.534.42-.821.647l-.821.653-.821.656c-1.458,1.168-3.059,2.463-4.534,3.657h0l0,0-1.209.977-.821.663c-.615.5-1.171.944-1.642,1.319-.809.646-1.362,1.077-1.511,1.169.214,1.156.534,2.738.877,4.193.209.886.427,1.724.634,2.39.32,1.026.617,1.641.822,1.388.022-.042.058-.1.106-.174a13.528,13.528,0,0,0,.713-2.395c.292-1.249.586-2.745.821-4.035Z" transform="translate(-3.637 -2.539)" fill="%23fff"/>%0A      <g id="Group_15374" data-name="Group 15374">%0A        <path id="Path_23902" data-name="Path 23902" d="M3.97,14.019h0ZM4.1,13.93l.127-.079c.171-.1.417-.247.727-.424.621-.352,1.5-.835,2.546-1.4,2.1-1.133,4.877-2.6,7.664-4.033s5.579-2.827,7.7-3.815c1.061-.494,1.951-.885,2.587-1.127.2-.077.379-.139.525-.184l-.066.047a12.567,12.567,0,0,0-1.182.849c-.208.2-.432.372-.669.557-.01,0-.152.049-.152.115v0l-.7.548H23.2a.119.119,0,0,0-.117.1l-.723.575a.119.119,0,0,0-.09.072l-.763.61a.119.119,0,0,0-.041.032c-1.453,1.165-3.047,2.454-4.516,3.642h0l0,0-.007.006-1.156.935a.119.119,0,0,0-.076.062l-.763.616a.12.12,0,0,0-.047.038c-.583.471-1.114.9-1.567,1.259a.119.119,0,0,0-.089.071c-.389.31-.716.569-.966.763-.231.179-.39.3-.471.352H11.75l-.259,0-.923,0c-.763,0-1.777,0-2.785-.015s-2.008-.039-2.742-.084c-.368-.022-.665-.049-.862-.082L4.1,13.93Zm7.878.365c.214,1.147.526,2.69.861,4.11.209.885.425,1.72.632,2.382a6.717,6.717,0,0,0,.444,1.151.6.6,0,0,0,.157.205l.005,0,0,0c.024-.044.059-.1.1-.166a13.594,13.594,0,0,0,.7-2.362c.291-1.246.585-2.74.82-4.029.113-.618.212-1.189.291-1.662L16,13.89l9.75-10.564c-.234.173-.513.384-.828.627-.252.194-.526.408-.82.638-.26.2-.534.42-.82.647l-.82.652-.821.656C20.178,7.714,18.578,9.008,17.1,10.2h0l0,0,0,0-1.2.974-.821.663c-.615.5-1.172.944-1.642,1.32-.4.323-.746.593-1,.793-.2.154-.353.27-.45.338ZM26.349,3.023l-10.061,10.9.417.289c.718.5,1.559,1.074,2.42,1.66.615.419,1.217.849,1.785,1.256h0c.954.682,1.809,1.294,2.486,1.68a3.727,3.727,0,0,0,.851.384c.225.058.356.034.431-.03v0a.312.312,0,0,0,.015-.037,1.532,1.532,0,0,0,.043-.154c.032-.134.067-.322.105-.558.076-.471.162-1.125.254-1.9.183-1.551.388-3.586.579-5.616s.367-4.054.495-5.585c.064-.765.115-1.407.149-1.863.013-.167.023-.309.031-.423ZM24.674,19.167h0ZM16.193,14.15l.376.26c.689.476,1.49,1.026,2.313,1.588-1.09,1.336-2.916,3.6-3.982,4.995l-.205.271c.135-.443.276-.992.416-1.593.292-1.251.587-2.75.822-4.04C16.032,15.089,16.12,14.585,16.193,14.15ZM14.386,22.1c.141-.211.388-.546.7-.961,1.068-1.4,2.9-3.671,3.99-5,.581.4,1.15.8,1.691,1.191l.005,0c.947.678,1.812,1.3,2.5,1.69a3.948,3.948,0,0,0,.909.408.683.683,0,0,0,.658-.091.226.226,0,0,0,.045-.062.552.552,0,0,0,.028-.066,1.775,1.775,0,0,0,.051-.179c.034-.143.07-.337.109-.575.077-.476.164-1.134.255-1.911.184-1.554.388-3.591.579-5.622s.367-4.056.495-5.587c.064-.765.115-1.408.15-1.865.017-.229.03-.412.039-.541,0-.065.007-.116.009-.154,0-.019,0-.034,0-.047a.282.282,0,0,0,0-.039l0-.021-.01-.019a.18.18,0,0,0-.1-.085.316.316,0,0,0-.105-.018,1.063,1.063,0,0,0-.248.033,6.354,6.354,0,0,0-.777.254c-.645.245-1.541.639-2.6,1.134-2.124.989-4.92,2.386-7.708,3.819s-5.57,2.9-7.668,4.036c-1.049.567-1.928,1.05-2.551,1.4-.311.177-.56.321-.734.428-.087.053-.157.1-.207.132-.025.017-.047.033-.064.047L3.8,13.85a.17.17,0,0,0-.029.036.145.145,0,0,0-.018.092.15.15,0,0,0,.037.078.251.251,0,0,0,.1.062,1.261,1.261,0,0,0,.253.061c.21.034.517.062.886.084.74.045,1.744.07,2.753.084s2.025.017,2.789.015l.924,0,.251,0c.214,1.147.526,2.684.86,4.1.209.887.427,1.729.636,2.4a6.92,6.92,0,0,0,.464,1.2.8.8,0,0,0,.239.292.242.242,0,0,0,.174.037.259.259,0,0,0,.152-.1,1.077,1.077,0,0,0,.117-.189Zm-3.744-5.061a.119.119,0,0,1,0,.169l-2.2,2.127a.119.119,0,1,1-.166-.171l2.2-2.127A.119.119,0,0,1,10.641,17.037ZM21.057,20a.119.119,0,0,1,.05.161l-2.835,5.372a.119.119,0,1,1-.211-.111L20.9,20.048a.119.119,0,0,1,.161-.05Zm-10.424.015a.119.119,0,0,1,.013.168l-.255.3c-.787.921-2.8,3.275-3.7,4.256a.119.119,0,1,1-.175-.162c.9-.977,2.906-3.325,3.695-4.248l.257-.3a.119.119,0,0,1,.168-.013Zm6.388,1.138a.119.119,0,0,1,.061.157c-.018.041-.07.134-.144.261s-.179.3-.3.513l-.518.864-.448.747c-.759,1.268-1.689,2.831-2.435,4.154a.119.119,0,0,1-.208-.117c.747-1.326,1.679-2.892,2.438-4.16l.448-.747.517-.863c.125-.209.227-.382.3-.511s.121-.211.132-.238a.119.119,0,0,1,.157-.061Z" transform="translate(-3.754 -2.541)" fill-rule="evenodd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/payment-request/SendButton.tsx
var import_jsx_runtime30 = require("react/jsx-runtime");
var SendButton = ({
  isExpired,
  isSending,
  isDisabled,
  onSend
}) => {
  const { t } = useTranslation();
  if (isExpired) {
    return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "flex w-full flex-col items-center py-6", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(
      "button",
      {
        disabled: true,
        className: "w-full max-w-[320px] py-3.5 rounded-xl bg-[#FF4D4D]/10 text-[#FF4D4D] text-[14px] font-semibold cursor-not-allowed",
        children: t.transfer.deposit.expiredButton
      }
    ) });
  }
  const active = !isDisabled && !isSending;
  return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "flex w-full flex-col items-center py-6", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)(
    "button",
    {
      onClick: onSend,
      disabled: !active,
      className: `flex flex-col items-center gap-1 transition-colors ${active ? "text-[#388CFF] cursor-pointer" : "text-[#CCCCCC]"}`,
      children: [
        active ? /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_image9.default, { src: transfer_default, alt: "Send", width: 25, height: 25 }) : /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_image9.default, { src: transferdisabled_default, alt: "Send", width: 25, height: 25 }),
        /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("span", { className: "text-[13px] font-medium", children: isSending ? t.transfer.deposit.sendingButton : t.transfer.deposit.sendButton })
      ]
    }
  ) });
};
var SendButton_default = SendButton;

// src/components/QR/send/shared/SuccessReceipt.tsx
var import_react25 = __toESM(require("react"));

// src/assets/icons/home/transfer/transferdone.svg
var transferdone_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40" height="40" viewBox="0 0 40 40">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4609" data-name="Rectangle 4609" width="40" height="40" transform="translate(0 0.311)" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_874" data-name="Mask Group 874" transform="translate(0 -0.311)" clip-path="url(%23clip-path)">%0A    <g id="paper-plane" transform="translate(2.001 0.001)">%0A      <path id="Path_23868" data-name="Path 23868" d="M39.8,2.72c.043.341-2.067,25.67-2.738,26.294-.759.706-3.209-1.046-6.233-3.209-.9-.646-1.858-1.329-2.834-1.993-1.368-.932-2.7-1.85-3.846-2.639l-.842-.583.842-.912,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413ZM20.412,33.45c-.078.117-.135.21-.169.276A1.558,1.558,0,0,0,20.412,33.45ZM16.535,21.06c.237-.146,1.116-.831,2.4-1.857.747-.6,1.632-1.308,2.609-2.1l1.3-1.053L24.77,14.5l0,0h0c2.345-1.9,4.888-3.954,7.205-5.811l1.3-1.043q.673-.537,1.3-1.037c.455-.361.891-.7,1.3-1.028.467-.366.9-.706,1.3-1.015A17.012,17.012,0,0,1,39.8,2.72C39.157,1.458,4.21,20.007,3.878,20.59s12.657.469,12.657.469Z" transform="translate(-3.682 -2.469)" fill="%2337ef9a" fill-rule="evenodd"/>%0A      <path id="Path_23869" data-name="Path 23869" d="M17.029,13.78c-.125.753-.283,1.661-.462,2.644-.374,2.05-.841,4.427-1.3,6.411A21.5,21.5,0,0,1,14.13,26.64c.226-.34.625-.881,1.133-1.546C17,22.82,20,19.1,21.717,17c-1.368-.932-2.7-1.85-3.846-2.639Z" transform="translate(2.6 4.341)" fill="%23fff"/>%0A      <path id="Path_23870" data-name="Path 23870" d="M18.039,23.211c.179-.983.337-1.891.462-2.644l.842-.912,1.3-1.413,1.3-1.413,1.3-1.413L24.561,14l1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413,1.3-1.413L34.995,2.7a17.012,17.012,0,0,0-2.608,1.842c-.4.308-.837.649-1.3,1.015-.413.324-.849.668-1.3,1.028q-.63.5-1.3,1.037l-1.3,1.043c-2.317,1.856-4.86,3.914-7.205,5.811h0l0,0-1.921,1.553-1.3,1.053c-.977.788-1.861,1.5-2.609,2.1-1.286,1.026-2.164,1.712-2.4,1.857.34,1.836.848,4.351,1.393,6.663.332,1.408.678,2.74,1.008,3.8.509,1.63.98,2.608,1.307,2.206.034-.066.092-.159.169-.276a21.5,21.5,0,0,0,1.133-3.805c.463-1.984.931-4.361,1.3-6.411Z" transform="translate(1.127 -2.446)" fill="%23fff"/>%0A      <g id="Group_15327" data-name="Group 15327" transform="translate(0 0)">%0A        <path id="Path_23871" data-name="Path 23871" d="M4.1,20.78h0Zm.2-.141q.085-.055.2-.126c.272-.166.662-.393,1.156-.673.987-.56,2.38-1.326,4.047-2.227,3.332-1.8,7.75-4.134,12.179-6.409s8.866-4.493,12.235-6.062c1.685-.785,3.1-1.406,4.112-1.791.323-.123.6-.221.835-.292l-.106.075a19.969,19.969,0,0,0-1.878,1.35c-.331.314-.687.591-1.063.885-.017,0-.241.078-.241.182v.007q-.529.415-1.1.871h-.01a.189.189,0,0,0-.186.156L33.324,7.5a.19.19,0,0,0-.143.114l-1.213.969a.19.19,0,0,0-.064.052c-2.31,1.851-4.842,3.9-7.177,5.788h0l0,0-.012.009L22.873,15.92a.19.19,0,0,0-.121.1L21.539,17a.191.191,0,0,0-.075.06c-.927.748-1.77,1.426-2.49,2a.189.189,0,0,0-.141.112c-.618.493-1.138.9-1.535,1.212-.367.284-.62.474-.748.559H16.46l-.411,0c-.354,0-.86,0-1.466,0-1.212,0-2.824,0-4.426-.025s-3.191-.063-4.358-.134c-.584-.036-1.057-.078-1.37-.13L4.3,20.639Zm12.518.581c.339,1.822.836,4.274,1.369,6.531.332,1.406.676,2.733,1,3.785a10.674,10.674,0,0,0,.706,1.829.954.954,0,0,0,.249.326l.008,0,.006-.005c.038-.071.094-.16.162-.263a21.6,21.6,0,0,0,1.113-3.753c.462-1.98.929-4.354,1.3-6.4.179-.982.337-1.889.462-2.641l.009-.056L38.7,3.788c-.372.275-.815.61-1.315,1-.4.308-.836.648-1.3,1.014-.412.323-.848.667-1.3,1.028q-.629.5-1.3,1.036l-1.3,1.042c-2.316,1.856-4.859,3.913-7.2,5.809h0l0,0-.006,0L23.04,16.272l-1.3,1.053c-.977.788-1.862,1.5-2.609,2.1-.643.513-1.185.942-1.6,1.261-.316.245-.56.43-.714.537ZM39.659,3.307,23.67,20.631l.663.459c1.141.788,2.477,1.706,3.845,2.638.978.666,1.934,1.35,2.836,2h0c1.515,1.084,2.875,2.056,3.95,2.67a5.922,5.922,0,0,0,1.352.61c.358.092.566.054.684-.048l0,0a.5.5,0,0,0,.024-.059,2.434,2.434,0,0,0,.069-.245c.051-.213.107-.512.168-.887.121-.749.258-1.788.4-3.021.291-2.465.616-5.7.919-8.925s.584-6.443.786-8.874c.1-1.216.183-2.235.237-2.961.02-.265.037-.491.049-.673ZM37,28.96h0ZM23.521,20.988l.6.413c1.094.756,2.367,1.631,3.676,2.523-1.732,2.122-4.633,5.718-6.328,7.937l-.326.43c.214-.7.438-1.576.661-2.531.464-1.989.932-4.369,1.306-6.42C23.264,22.481,23.4,21.679,23.521,20.988Zm-2.873,12.63c.224-.335.616-.868,1.119-1.527,1.7-2.223,4.611-5.834,6.341-7.953.924.632,1.828,1.278,2.687,1.893l.008.006c1.506,1.077,2.88,2.06,3.974,2.685a6.274,6.274,0,0,0,1.445.648,1.085,1.085,0,0,0,1.045-.145.359.359,0,0,0,.072-.1.877.877,0,0,0,.045-.105,2.82,2.82,0,0,0,.081-.285c.054-.227.112-.536.173-.914.122-.757.26-1.8.406-3.037.292-2.47.617-5.707.92-8.934s.584-6.445.786-8.878c.1-1.216.183-2.237.238-2.964.027-.363.048-.654.062-.86.007-.1.012-.185.014-.244,0-.03,0-.055,0-.075a.448.448,0,0,0,0-.062l0-.033-.015-.03a.286.286,0,0,0-.156-.135.5.5,0,0,0-.167-.029,1.69,1.69,0,0,0-.394.052,10.1,10.1,0,0,0-1.235.4c-1.025.39-2.449,1.016-4.137,1.8C30.58,6.37,26.138,8.59,21.708,10.867S12.856,15.478,9.522,17.28c-1.667.9-3.063,1.669-4.053,2.231-.495.281-.89.51-1.167.679-.138.084-.249.155-.329.21-.04.027-.074.053-.1.075s-.028.023-.04.036a.27.27,0,0,0-.045.058.231.231,0,0,0-.029.147.239.239,0,0,0,.058.125.4.4,0,0,0,.151.1,2,2,0,0,0,.4.1c.333.054.821.1,1.408.134,1.176.072,2.772.112,4.375.134s3.218.026,4.431.025c.607,0,1.113,0,1.468,0l.4,0c.34,1.823.835,4.265,1.366,6.516.332,1.41.679,2.747,1.011,3.811a11,11,0,0,0,.737,1.9,1.269,1.269,0,0,0,.38.464.384.384,0,0,0,.276.058.411.411,0,0,0,.241-.154,1.712,1.712,0,0,0,.186-.3ZM14.7,25.575a.189.189,0,0,1,0,.268l-3.5,3.379a.189.189,0,1,1-.263-.272l3.5-3.379A.189.189,0,0,1,14.7,25.575ZM31.25,30.282a.189.189,0,0,1,.079.256l-4.506,8.537a.189.189,0,1,1-.335-.177l4.506-8.537a.189.189,0,0,1,.256-.079Zm-16.565.024a.189.189,0,0,1,.021.267l-.406.475c-1.251,1.464-4.445,5.2-5.883,6.763a.189.189,0,1,1-.278-.257C9.571,36,12.757,32.271,14.01,30.8l.408-.478a.189.189,0,0,1,.267-.021Zm10.151,1.809a.189.189,0,0,1,.1.25c-.029.065-.112.212-.229.414s-.284.483-.482.815c-.232.388-.51.853-.823,1.373l-.712,1.187c-1.206,2.014-2.684,4.5-3.869,6.6a.189.189,0,0,1-.33-.186c1.187-2.107,2.667-4.6,3.874-6.61l.712-1.188c.312-.52.591-.984.822-1.372.2-.332.361-.607.48-.812s.192-.336.21-.377a.189.189,0,0,1,.25-.1Z" transform="translate(-3.754 -2.541)" fill-rule="evenodd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/success.svg
var success_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="16" height="16" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_760" data-name="Mask Group 760" clip-path="url(%23clip-path)">%0A    <path id="claim" d="M1.143,10.339a.231.231,0,0,1-.446.12,7.976,7.976,0,1,1,5.21,5.51.231.231,0,0,1,.145-.439,7.512,7.512,0,1,0-4.909-5.191ZM11.068,6.06a.656.656,0,0,1,.909.947l-3.86,3.706a.656.656,0,0,1-.9,0L4.84,8.48a.656.656,0,1,1,.9-.955L7.659,9.333ZM5.586,11.413a.231.231,0,0,1-.329-.324l.329-.334a.231.231,0,0,1,.329.324ZM4.2,10.908a.231.231,0,0,1-.447-.116l.118-.454a.231.231,0,0,1,.447.116Zm1.7,2a.231.231,0,1,1-.123-.445l.452-.125a.231.231,0,1,1,.123.445ZM2.643,15.046,1.408,16.28a.165.165,0,0,1-.233,0l-.739-.739a.165.165,0,0,1,0-.233L1.67,14.074l-.783-.432a.165.165,0,0,1,.023-.3l3.563-1.31a.165.165,0,0,1,.212.212l-1.31,3.563a.165.165,0,0,1-.3.023Z" transform="translate(-0.388 -0.388)" fill="%23388cff" fill-rule="evenodd"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/done.svg
var done_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <g id="Group_15395" data-name="Group 15395" transform="translate(-120 -851)">%0A    <path id="download-5" d="M2,12C2,7.286,2,4.929,3.464,3.464S7.286,2,12,2s7.071,0,8.535,1.464S22,7.286,22,12s0,7.071-1.465,8.535S16.714,22,12,22s-7.071,0-8.536-1.464S2,16.714,2,12Z" transform="translate(118 849)" fill="%23404040" fill-rule="evenodd"/>%0A    <path id="Path_23909" data-name="Path 23909" d="M9.146,14.788a1.562,1.562,0,0,1-1.074-.428L3.98,10.487A1.563,1.563,0,0,1,6.129,8.218l2.927,2.771L13.783,5.73a1.562,1.562,0,1,1,2.324,2.089l-5.8,6.451a1.563,1.563,0,0,1-1.1.517Zm0,0" transform="translate(120 851)" fill="%2337ef9a" stroke="%23404040" stroke-width="1.5"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/qrinputmethod.svg
var qrinputmethod_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_6596" data-name="Rectangle 6596" width="16" height="16" transform="translate(353.001 275.694)" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_863" data-name="Mask Group 863" transform="translate(-353.001 -275.694)" clip-path="url(%23clip-path)">%0A    <g id="qr-code-8" transform="translate(353 275.462)">%0A      <g id="Group_14085" data-name="Group 14085" transform="translate(0 0)">%0A        <g id="Group_13485" data-name="Group 13485" transform="translate(5.194)">%0A          <g id="Group_13484" data-name="Group 13484">%0A            <g id="Group_13483" data-name="Group 13483">%0A              <path id="Path_22901" data-name="Path 22901" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13487" data-name="Group 13487" transform="translate(5.869 0.026)">%0A          <g id="Group_13486" data-name="Group 13486" transform="translate(0)">%0A            <path id="Path_22902" data-name="Path 22902" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13489" data-name="Group 13489" transform="translate(6.518 0.026)">%0A          <g id="Group_13488" data-name="Group 13488" transform="translate(0)">%0A            <path id="Path_22903" data-name="Path 22903" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13492" data-name="Group 13492" transform="translate(7.141)">%0A          <g id="Group_13491" data-name="Group 13491">%0A            <g id="Group_13490" data-name="Group 13490">%0A              <path id="Path_22904" data-name="Path 22904" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13495" data-name="Group 13495" transform="translate(8.44)">%0A          <g id="Group_13494" data-name="Group 13494">%0A            <g id="Group_13493" data-name="Group 13493">%0A              <path id="Path_22905" data-name="Path 22905" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13498" data-name="Group 13498" transform="translate(9.121 0.032)">%0A          <g id="Group_13497" data-name="Group 13497" transform="translate(0)">%0A            <g id="Group_13496" data-name="Group 13496">%0A              <path id="Path_22906" data-name="Path 22906" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13500" data-name="Group 13500" transform="translate(5.22 0.675)">%0A          <g id="Group_13499" data-name="Group 13499" transform="translate(0 0)">%0A            <path id="Path_22907" data-name="Path 22907" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13502" data-name="Group 13502" transform="translate(5.869 0.675)">%0A          <g id="Group_13501" data-name="Group 13501" transform="translate(0 0)">%0A            <path id="Path_22908" data-name="Path 22908" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13505" data-name="Group 13505" transform="translate(7.141 0.649)">%0A          <g id="Group_13504" data-name="Group 13504">%0A            <g id="Group_13503" data-name="Group 13503">%0A              <path id="Path_22909" data-name="Path 22909" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13507" data-name="Group 13507" transform="translate(7.816 0.675)">%0A          <g id="Group_13506" data-name="Group 13506" transform="translate(0 0)">%0A            <path id="Path_22910" data-name="Path 22910" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13509" data-name="Group 13509" transform="translate(8.466 0.675)">%0A          <g id="Group_13508" data-name="Group 13508" transform="translate(0 0)">%0A            <path id="Path_22911" data-name="Path 22911" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13512" data-name="Group 13512" transform="translate(10.387 0.649)">%0A          <g id="Group_13511" data-name="Group 13511">%0A            <g id="Group_13510" data-name="Group 13510">%0A              <path id="Path_22912" data-name="Path 22912" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13515" data-name="Group 13515" transform="translate(5.194 1.298)">%0A          <g id="Group_13514" data-name="Group 13514">%0A            <g id="Group_13513" data-name="Group 13513">%0A              <path id="Path_22913" data-name="Path 22913" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13517" data-name="Group 13517" transform="translate(5.869 1.324)">%0A          <g id="Group_13516" data-name="Group 13516" transform="translate(0 0)">%0A            <path id="Path_22914" data-name="Path 22914" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13520" data-name="Group 13520" transform="translate(6.492 1.298)">%0A          <g id="Group_13519" data-name="Group 13519">%0A            <g id="Group_13518" data-name="Group 13518">%0A              <path id="Path_22915" data-name="Path 22915" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13522" data-name="Group 13522" transform="translate(8.466 1.324)">%0A          <g id="Group_13521" data-name="Group 13521" transform="translate(0 0)">%0A            <path id="Path_22916" data-name="Path 22916" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13525" data-name="Group 13525" transform="translate(9.121 1.331)">%0A          <g id="Group_13524" data-name="Group 13524" transform="translate(0 0)">%0A            <g id="Group_13523" data-name="Group 13523">%0A              <path id="Path_22917" data-name="Path 22917" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13528" data-name="Group 13528" transform="translate(10.387 1.298)">%0A          <g id="Group_13527" data-name="Group 13527">%0A            <g id="Group_13526" data-name="Group 13526">%0A              <path id="Path_22918" data-name="Path 22918" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13531" data-name="Group 13531" transform="translate(5.843 1.948)">%0A          <g id="Group_13530" data-name="Group 13530">%0A            <g id="Group_13529" data-name="Group 13529">%0A              <path id="Path_22919" data-name="Path 22919" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13534" data-name="Group 13534" transform="translate(6.492 1.948)">%0A          <g id="Group_13533" data-name="Group 13533">%0A            <g id="Group_13532" data-name="Group 13532">%0A              <path id="Path_22920" data-name="Path 22920" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13537" data-name="Group 13537" transform="translate(8.44 1.948)">%0A          <g id="Group_13536" data-name="Group 13536">%0A            <g id="Group_13535" data-name="Group 13535">%0A              <path id="Path_22921" data-name="Path 22921" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13540" data-name="Group 13540" transform="translate(5.194 2.597)">%0A          <g id="Group_13539" data-name="Group 13539">%0A            <g id="Group_13538" data-name="Group 13538">%0A              <path id="Path_22922" data-name="Path 22922" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13543" data-name="Group 13543" transform="translate(7.79 2.597)">%0A          <g id="Group_13542" data-name="Group 13542">%0A            <g id="Group_13541" data-name="Group 13541">%0A              <path id="Path_22923" data-name="Path 22923" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13546" data-name="Group 13546" transform="translate(9.089 2.597)">%0A          <g id="Group_13545" data-name="Group 13545">%0A            <g id="Group_13544" data-name="Group 13544">%0A              <path id="Path_22924" data-name="Path 22924" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13549" data-name="Group 13549" transform="translate(10.387 2.597)">%0A          <g id="Group_13548" data-name="Group 13548">%0A            <g id="Group_13547" data-name="Group 13547">%0A              <path id="Path_22925" data-name="Path 22925" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13552" data-name="Group 13552" transform="translate(5.843 3.246)">%0A          <g id="Group_13551" data-name="Group 13551">%0A            <g id="Group_13550" data-name="Group 13550">%0A              <path id="Path_22926" data-name="Path 22926" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13555" data-name="Group 13555" transform="translate(7.174 3.278)">%0A          <g id="Group_13554" data-name="Group 13554" transform="translate(0 0)">%0A            <g id="Group_13553" data-name="Group 13553">%0A              <path id="Path_22927" data-name="Path 22927" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13557" data-name="Group 13557" transform="translate(7.816 3.272)">%0A          <g id="Group_13556" data-name="Group 13556" transform="translate(0 0)">%0A            <path id="Path_22928" data-name="Path 22928" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13559" data-name="Group 13559" transform="translate(8.466 3.272)">%0A          <g id="Group_13558" data-name="Group 13558" transform="translate(0 0)">%0A            <path id="Path_22929" data-name="Path 22929" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13561" data-name="Group 13561" transform="translate(9.115 3.272)">%0A          <g id="Group_13560" data-name="Group 13560" transform="translate(0 0)">%0A            <path id="Path_22930" data-name="Path 22930" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13564" data-name="Group 13564" transform="translate(5.194 3.895)">%0A          <g id="Group_13563" data-name="Group 13563">%0A            <g id="Group_13562" data-name="Group 13562">%0A              <path id="Path_22931" data-name="Path 22931" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13567" data-name="Group 13567" transform="translate(6.492 3.895)">%0A          <g id="Group_13566" data-name="Group 13566">%0A            <g id="Group_13565" data-name="Group 13565">%0A              <path id="Path_22932" data-name="Path 22932" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13570" data-name="Group 13570" transform="translate(7.79 3.895)">%0A          <g id="Group_13569" data-name="Group 13569">%0A            <g id="Group_13568" data-name="Group 13568">%0A              <path id="Path_22933" data-name="Path 22933" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13572" data-name="Group 13572" transform="translate(9.115 3.921)">%0A          <g id="Group_13571" data-name="Group 13571" transform="translate(0 0)">%0A            <path id="Path_22934" data-name="Path 22934" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13575" data-name="Group 13575" transform="translate(10.387 3.895)">%0A          <g id="Group_13574" data-name="Group 13574">%0A            <g id="Group_13573" data-name="Group 13573">%0A              <path id="Path_22935" data-name="Path 22935" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13578" data-name="Group 13578" transform="translate(5.843 4.544)">%0A          <g id="Group_13577" data-name="Group 13577">%0A            <g id="Group_13576" data-name="Group 13576">%0A              <path id="Path_22936" data-name="Path 22936" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13581" data-name="Group 13581" transform="translate(6.492 4.544)">%0A          <g id="Group_13580" data-name="Group 13580">%0A            <g id="Group_13579" data-name="Group 13579">%0A              <path id="Path_22937" data-name="Path 22937" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13584" data-name="Group 13584" transform="translate(8.472 4.577)">%0A          <g id="Group_13583" data-name="Group 13583" transform="translate(0 0)">%0A            <g id="Group_13582" data-name="Group 13582">%0A              <path id="Path_22938" data-name="Path 22938" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13586" data-name="Group 13586" transform="translate(9.115 4.57)">%0A          <g id="Group_13585" data-name="Group 13585" transform="translate(0 0)">%0A            <path id="Path_22939" data-name="Path 22939" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13589" data-name="Group 13589" transform="translate(9.77 4.577)">%0A          <g id="Group_13588" data-name="Group 13588" transform="translate(0 0)">%0A            <g id="Group_13587" data-name="Group 13587">%0A              <path id="Path_22940" data-name="Path 22940" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13592" data-name="Group 13592" transform="translate(0 5.194)">%0A          <g id="Group_13591" data-name="Group 13591">%0A            <g id="Group_13590" data-name="Group 13590">%0A              <path id="Path_22941" data-name="Path 22941" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13595" data-name="Group 13595" transform="translate(1.98 5.226)">%0A          <g id="Group_13594" data-name="Group 13594" transform="translate(0 0)">%0A            <g id="Group_13593" data-name="Group 13593">%0A              <path id="Path_22942" data-name="Path 22942" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13597" data-name="Group 13597" transform="translate(2.623 5.22)">%0A          <g id="Group_13596" data-name="Group 13596" transform="translate(0 0)">%0A            <path id="Path_22943" data-name="Path 22943" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13599" data-name="Group 13599" transform="translate(3.272 5.22)">%0A          <g id="Group_13598" data-name="Group 13598" transform="translate(0 0)">%0A            <path id="Path_22944" data-name="Path 22944" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13601" data-name="Group 13601" transform="translate(3.921 5.22)">%0A          <g id="Group_13600" data-name="Group 13600" transform="translate(0 0)">%0A            <path id="Path_22945" data-name="Path 22945" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13603" data-name="Group 13603" transform="translate(4.57 5.22)">%0A          <g id="Group_13602" data-name="Group 13602" transform="translate(0 0)">%0A            <path id="Path_22946" data-name="Path 22946" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13605" data-name="Group 13605" transform="translate(5.22 5.22)">%0A          <g id="Group_13604" data-name="Group 13604" transform="translate(0 0)">%0A            <path id="Path_22947" data-name="Path 22947" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13608" data-name="Group 13608" transform="translate(5.843 5.194)">%0A          <g id="Group_13607" data-name="Group 13607">%0A            <g id="Group_13606" data-name="Group 13606">%0A              <path id="Path_22948" data-name="Path 22948" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13611" data-name="Group 13611" transform="translate(7.141 5.194)">%0A          <g id="Group_13610" data-name="Group 13610">%0A            <g id="Group_13609" data-name="Group 13609">%0A              <path id="Path_22949" data-name="Path 22949" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13614" data-name="Group 13614" transform="translate(10.42 5.226)">%0A          <g id="Group_13613" data-name="Group 13613" transform="translate(0 0)">%0A            <g id="Group_13612" data-name="Group 13612">%0A              <path id="Path_22950" data-name="Path 22950" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13617" data-name="Group 13617" transform="translate(11.036 5.194)">%0A          <g id="Group_13616" data-name="Group 13616">%0A            <g id="Group_13615" data-name="Group 13615">%0A              <path id="Path_22951" data-name="Path 22951" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13620" data-name="Group 13620" transform="translate(12.984 5.194)">%0A          <g id="Group_13619" data-name="Group 13619">%0A            <g id="Group_13618" data-name="Group 13618">%0A              <path id="Path_22952" data-name="Path 22952" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13623" data-name="Group 13623" transform="translate(14.282 5.194)">%0A          <g id="Group_13622" data-name="Group 13622">%0A            <g id="Group_13621" data-name="Group 13621">%0A              <path id="Path_22953" data-name="Path 22953" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13625" data-name="Group 13625" transform="translate(14.958 5.22)">%0A          <g id="Group_13624" data-name="Group 13624" transform="translate(0 0)">%0A            <path id="Path_22954" data-name="Path 22954" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13628" data-name="Group 13628" transform="translate(15.613 5.226)">%0A          <g id="Group_13627" data-name="Group 13627" transform="translate(0 0)">%0A            <g id="Group_13626" data-name="Group 13626">%0A              <path id="Path_22955" data-name="Path 22955" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13631" data-name="Group 13631" transform="translate(3.246 5.843)">%0A          <g id="Group_13630" data-name="Group 13630">%0A            <g id="Group_13629" data-name="Group 13629">%0A              <path id="Path_22956" data-name="Path 22956" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13634" data-name="Group 13634" transform="translate(5.194 5.843)">%0A          <g id="Group_13633" data-name="Group 13633">%0A            <g id="Group_13632" data-name="Group 13632">%0A              <path id="Path_22957" data-name="Path 22957" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13637" data-name="Group 13637" transform="translate(7.79 5.843)">%0A          <g id="Group_13636" data-name="Group 13636">%0A            <g id="Group_13635" data-name="Group 13635">%0A              <path id="Path_22958" data-name="Path 22958" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13639" data-name="Group 13639" transform="translate(8.466 5.869)">%0A          <g id="Group_13638" data-name="Group 13638" transform="translate(0 0)">%0A            <path id="Path_22959" data-name="Path 22959" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13641" data-name="Group 13641" transform="translate(9.115 5.869)">%0A          <g id="Group_13640" data-name="Group 13640" transform="translate(0 0)">%0A            <path id="Path_22960" data-name="Path 22960" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13644" data-name="Group 13644" transform="translate(9.738 5.843)">%0A          <g id="Group_13643" data-name="Group 13643">%0A            <g id="Group_13642" data-name="Group 13642">%0A              <path id="Path_22961" data-name="Path 22961" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13647" data-name="Group 13647" transform="translate(11.036 5.843)">%0A          <g id="Group_13646" data-name="Group 13646">%0A            <g id="Group_13645" data-name="Group 13645">%0A              <path id="Path_22962" data-name="Path 22962" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13650" data-name="Group 13650" transform="translate(12.335 5.843)">%0A          <g id="Group_13649" data-name="Group 13649">%0A            <g id="Group_13648" data-name="Group 13648">%0A              <path id="Path_22963" data-name="Path 22963" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13652" data-name="Group 13652" transform="translate(13.01 5.869)">%0A          <g id="Group_13651" data-name="Group 13651" transform="translate(0 0)">%0A            <path id="Path_22964" data-name="Path 22964" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13654" data-name="Group 13654" transform="translate(13.659 5.869)">%0A          <g id="Group_13653" data-name="Group 13653" transform="translate(0 0)">%0A            <path id="Path_22965" data-name="Path 22965" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13656" data-name="Group 13656" transform="translate(14.308 5.869)">%0A          <g id="Group_13655" data-name="Group 13655" transform="translate(0 0)">%0A            <path id="Path_22966" data-name="Path 22966" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13659" data-name="Group 13659" transform="translate(14.932 5.843)">%0A          <g id="Group_13658" data-name="Group 13658">%0A            <g id="Group_13657" data-name="Group 13657">%0A              <path id="Path_22967" data-name="Path 22967" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13662" data-name="Group 13662" transform="translate(1.298 6.492)">%0A          <g id="Group_13661" data-name="Group 13661">%0A            <g id="Group_13660" data-name="Group 13660">%0A              <path id="Path_22968" data-name="Path 22968" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13665" data-name="Group 13665" transform="translate(3.895 6.492)">%0A          <g id="Group_13664" data-name="Group 13664">%0A            <g id="Group_13663" data-name="Group 13663">%0A              <path id="Path_22969" data-name="Path 22969" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13668" data-name="Group 13668" transform="translate(6.492 6.492)">%0A          <g id="Group_13667" data-name="Group 13667">%0A            <g id="Group_13666" data-name="Group 13666">%0A              <path id="Path_22970" data-name="Path 22970" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13670" data-name="Group 13670" transform="translate(7.167 6.518)">%0A          <g id="Group_13669" data-name="Group 13669" transform="translate(0 0)">%0A            <path id="Path_22971" data-name="Path 22971" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13672" data-name="Group 13672" transform="translate(7.816 6.518)">%0A          <g id="Group_13671" data-name="Group 13671" transform="translate(0 0)">%0A            <path id="Path_22972" data-name="Path 22972" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13675" data-name="Group 13675" transform="translate(8.44 6.492)">%0A          <g id="Group_13674" data-name="Group 13674">%0A            <g id="Group_13673" data-name="Group 13673">%0A              <path id="Path_22973" data-name="Path 22973" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13678" data-name="Group 13678" transform="translate(9.738 6.492)">%0A          <g id="Group_13677" data-name="Group 13677">%0A            <g id="Group_13676" data-name="Group 13676">%0A              <path id="Path_22974" data-name="Path 22974" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13681" data-name="Group 13681" transform="translate(10.387 6.492)">%0A          <g id="Group_13680" data-name="Group 13680">%0A            <g id="Group_13679" data-name="Group 13679">%0A              <path id="Path_22975" data-name="Path 22975" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13684" data-name="Group 13684" transform="translate(11.718 6.524)">%0A          <g id="Group_13683" data-name="Group 13683" transform="translate(0 0)">%0A            <g id="Group_13682" data-name="Group 13682">%0A              <path id="Path_22976" data-name="Path 22976" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13686" data-name="Group 13686" transform="translate(12.361 6.518)">%0A          <g id="Group_13685" data-name="Group 13685" transform="translate(0 0)">%0A            <path id="Path_22977" data-name="Path 22977" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13688" data-name="Group 13688" transform="translate(13.659 6.518)">%0A          <g id="Group_13687" data-name="Group 13687" transform="translate(0 0)">%0A            <path id="Path_22978" data-name="Path 22978" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13691" data-name="Group 13691" transform="translate(15.581 6.492)">%0A          <g id="Group_13690" data-name="Group 13690">%0A            <g id="Group_13689" data-name="Group 13689">%0A              <path id="Path_22979" data-name="Path 22979" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13694" data-name="Group 13694" transform="translate(0.649 7.141)">%0A          <g id="Group_13693" data-name="Group 13693">%0A            <g id="Group_13692" data-name="Group 13692">%0A              <path id="Path_22980" data-name="Path 22980" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13697" data-name="Group 13697" transform="translate(3.246 7.141)">%0A          <g id="Group_13696" data-name="Group 13696">%0A            <g id="Group_13695" data-name="Group 13695">%0A              <path id="Path_22981" data-name="Path 22981" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13700" data-name="Group 13700" transform="translate(4.577 7.174)">%0A          <g id="Group_13699" data-name="Group 13699" transform="translate(0 0)">%0A            <g id="Group_13698" data-name="Group 13698">%0A              <path id="Path_22982" data-name="Path 22982" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13702" data-name="Group 13702" transform="translate(5.22 7.167)">%0A          <g id="Group_13701" data-name="Group 13701" transform="translate(0 0)">%0A            <path id="Path_22983" data-name="Path 22983" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13704" data-name="Group 13704" transform="translate(5.869 7.167)">%0A          <g id="Group_13703" data-name="Group 13703" transform="translate(0 0)">%0A            <path id="Path_22984" data-name="Path 22984" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13706" data-name="Group 13706" transform="translate(6.518 7.167)">%0A          <g id="Group_13705" data-name="Group 13705" transform="translate(0 0)">%0A            <path id="Path_22985" data-name="Path 22985" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13708" data-name="Group 13708" transform="translate(7.167 7.167)">%0A          <g id="Group_13707" data-name="Group 13707" transform="translate(0 0)">%0A            <path id="Path_22986" data-name="Path 22986" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13710" data-name="Group 13710" transform="translate(7.816 7.167)">%0A          <g id="Group_13709" data-name="Group 13709" transform="translate(0 0)">%0A            <path id="Path_22987" data-name="Path 22987" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13712" data-name="Group 13712" transform="translate(10.413 7.167)">%0A          <g id="Group_13711" data-name="Group 13711" transform="translate(0 0)">%0A            <path id="Path_22988" data-name="Path 22988" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13715" data-name="Group 13715" transform="translate(12.335 7.141)">%0A          <g id="Group_13714" data-name="Group 13714">%0A            <g id="Group_13713" data-name="Group 13713">%0A              <path id="Path_22989" data-name="Path 22989" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13718" data-name="Group 13718" transform="translate(13.633 7.141)">%0A          <g id="Group_13717" data-name="Group 13717">%0A            <g id="Group_13716" data-name="Group 13716">%0A              <path id="Path_22990" data-name="Path 22990" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13720" data-name="Group 13720" transform="translate(14.308 7.167)">%0A          <g id="Group_13719" data-name="Group 13719" transform="translate(0 0)">%0A            <path id="Path_22991" data-name="Path 22991" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13722" data-name="Group 13722" transform="translate(14.958 7.167)">%0A          <g id="Group_13721" data-name="Group 13721" transform="translate(0 0)">%0A            <path id="Path_22992" data-name="Path 22992" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13724" data-name="Group 13724" transform="translate(15.607 7.167)">%0A          <g id="Group_13723" data-name="Group 13723" transform="translate(0 0)">%0A            <path id="Path_22993" data-name="Path 22993" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13727" data-name="Group 13727" transform="translate(0.649 7.79)">%0A          <g id="Group_13726" data-name="Group 13726">%0A            <g id="Group_13725" data-name="Group 13725">%0A              <path id="Path_22994" data-name="Path 22994" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13730" data-name="Group 13730" transform="translate(1.298 7.79)">%0A          <g id="Group_13729" data-name="Group 13729">%0A            <g id="Group_13728" data-name="Group 13728">%0A              <path id="Path_22995" data-name="Path 22995" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13733" data-name="Group 13733" transform="translate(3.895 7.79)">%0A          <g id="Group_13732" data-name="Group 13732">%0A            <g id="Group_13731" data-name="Group 13731">%0A              <path id="Path_22996" data-name="Path 22996" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13735" data-name="Group 13735" transform="translate(6.518 7.816)">%0A          <g id="Group_13734" data-name="Group 13734" transform="translate(0 0)">%0A            <path id="Path_22997" data-name="Path 22997" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13737" data-name="Group 13737" transform="translate(7.816 7.816)">%0A          <g id="Group_13736" data-name="Group 13736" transform="translate(0 0)">%0A            <path id="Path_22998" data-name="Path 22998" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13739" data-name="Group 13739" transform="translate(10.413 7.816)">%0A          <g id="Group_13738" data-name="Group 13738" transform="translate(0 0)">%0A            <path id="Path_22999" data-name="Path 22999" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13741" data-name="Group 13741" transform="translate(11.062 7.816)">%0A          <g id="Group_13740" data-name="Group 13740" transform="translate(0 0)">%0A            <path id="Path_23000" data-name="Path 23000" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13744" data-name="Group 13744" transform="translate(11.718 7.823)">%0A          <g id="Group_13743" data-name="Group 13743" transform="translate(0 0)">%0A            <g id="Group_13742" data-name="Group 13742">%0A              <path id="Path_23001" data-name="Path 23001" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13747" data-name="Group 13747" transform="translate(15.581 7.79)">%0A          <g id="Group_13746" data-name="Group 13746">%0A            <g id="Group_13745" data-name="Group 13745">%0A              <path id="Path_23002" data-name="Path 23002" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13750" data-name="Group 13750" transform="translate(0 8.44)">%0A          <g id="Group_13749" data-name="Group 13749">%0A            <g id="Group_13748" data-name="Group 13748">%0A              <path id="Path_23003" data-name="Path 23003" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13753" data-name="Group 13753" transform="translate(1.298 8.44)">%0A          <g id="Group_13752" data-name="Group 13752">%0A            <g id="Group_13751" data-name="Group 13751">%0A              <path id="Path_23004" data-name="Path 23004" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13756" data-name="Group 13756" transform="translate(3.246 8.44)">%0A          <g id="Group_13755" data-name="Group 13755">%0A            <g id="Group_13754" data-name="Group 13754">%0A              <path id="Path_23005" data-name="Path 23005" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13759" data-name="Group 13759" transform="translate(4.544 8.44)">%0A          <g id="Group_13758" data-name="Group 13758">%0A            <g id="Group_13757" data-name="Group 13757">%0A              <path id="Path_23006" data-name="Path 23006" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13761" data-name="Group 13761" transform="translate(6.518 8.466)">%0A          <g id="Group_13760" data-name="Group 13760" transform="translate(0 0)">%0A            <path id="Path_23007" data-name="Path 23007" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13764" data-name="Group 13764" transform="translate(7.79 8.44)">%0A          <g id="Group_13763" data-name="Group 13763">%0A            <g id="Group_13762" data-name="Group 13762">%0A              <path id="Path_23008" data-name="Path 23008" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13767" data-name="Group 13767" transform="translate(9.089 8.44)">%0A          <g id="Group_13766" data-name="Group 13766">%0A            <g id="Group_13765" data-name="Group 13765">%0A              <path id="Path_23009" data-name="Path 23009" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13769" data-name="Group 13769" transform="translate(9.764 8.466)">%0A          <g id="Group_13768" data-name="Group 13768" transform="translate(0 0)">%0A            <path id="Path_23010" data-name="Path 23010" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13771" data-name="Group 13771" transform="translate(10.413 8.466)">%0A          <g id="Group_13770" data-name="Group 13770" transform="translate(0 0)">%0A            <path id="Path_23011" data-name="Path 23011" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13774" data-name="Group 13774" transform="translate(12.984 8.44)">%0A          <g id="Group_13773" data-name="Group 13773">%0A            <g id="Group_13772" data-name="Group 13772">%0A              <path id="Path_23012" data-name="Path 23012" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13777" data-name="Group 13777" transform="translate(14.932 8.44)">%0A          <g id="Group_13776" data-name="Group 13776">%0A            <g id="Group_13775" data-name="Group 13775">%0A              <path id="Path_23013" data-name="Path 23013" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13779" data-name="Group 13779" transform="translate(0.026 9.115)">%0A          <g id="Group_13778" data-name="Group 13778" transform="translate(0 0)">%0A            <path id="Path_23014" data-name="Path 23014" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13782" data-name="Group 13782" transform="translate(0.682 9.121)">%0A          <g id="Group_13781" data-name="Group 13781" transform="translate(0 0)">%0A            <g id="Group_13780" data-name="Group 13780">%0A              <path id="Path_23015" data-name="Path 23015" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13785" data-name="Group 13785" transform="translate(1.98 9.121)">%0A          <g id="Group_13784" data-name="Group 13784" transform="translate(0 0)">%0A            <g id="Group_13783" data-name="Group 13783">%0A              <path id="Path_23016" data-name="Path 23016" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13788" data-name="Group 13788" transform="translate(2.597 9.089)">%0A          <g id="Group_13787" data-name="Group 13787">%0A            <g id="Group_13786" data-name="Group 13786">%0A              <path id="Path_23017" data-name="Path 23017" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13791" data-name="Group 13791" transform="translate(3.895 9.089)">%0A          <g id="Group_13790" data-name="Group 13790">%0A            <g id="Group_13789" data-name="Group 13789">%0A              <path id="Path_23018" data-name="Path 23018" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13794" data-name="Group 13794" transform="translate(5.194 9.089)">%0A          <g id="Group_13793" data-name="Group 13793">%0A            <g id="Group_13792" data-name="Group 13792">%0A              <path id="Path_23019" data-name="Path 23019" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13796" data-name="Group 13796" transform="translate(6.518 9.115)">%0A          <g id="Group_13795" data-name="Group 13795" transform="translate(0 0)">%0A            <path id="Path_23020" data-name="Path 23020" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13799" data-name="Group 13799" transform="translate(9.089 9.089)">%0A          <g id="Group_13798" data-name="Group 13798">%0A            <g id="Group_13797" data-name="Group 13797">%0A              <path id="Path_23021" data-name="Path 23021" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13801" data-name="Group 13801" transform="translate(9.764 9.115)">%0A          <g id="Group_13800" data-name="Group 13800" transform="translate(0 0)">%0A            <path id="Path_23022" data-name="Path 23022" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13803" data-name="Group 13803" transform="translate(10.413 9.115)">%0A          <g id="Group_13802" data-name="Group 13802" transform="translate(0 0)">%0A            <path id="Path_23023" data-name="Path 23023" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13806" data-name="Group 13806" transform="translate(11.069 9.121)">%0A          <g id="Group_13805" data-name="Group 13805" transform="translate(0 0)">%0A            <g id="Group_13804" data-name="Group 13804">%0A              <path id="Path_23024" data-name="Path 23024" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13808" data-name="Group 13808" transform="translate(13.01 9.115)">%0A          <g id="Group_13807" data-name="Group 13807" transform="translate(0 0)">%0A            <path id="Path_23025" data-name="Path 23025" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13810" data-name="Group 13810" transform="translate(13.659 9.115)">%0A          <g id="Group_13809" data-name="Group 13809" transform="translate(0 0)">%0A            <path id="Path_23026" data-name="Path 23026" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13812" data-name="Group 13812" transform="translate(14.308 9.115)">%0A          <g id="Group_13811" data-name="Group 13811" transform="translate(0 0)">%0A            <path id="Path_23027" data-name="Path 23027" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13814" data-name="Group 13814" transform="translate(14.958 9.115)">%0A          <g id="Group_13813" data-name="Group 13813" transform="translate(0 0)">%0A            <path id="Path_23028" data-name="Path 23028" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13817" data-name="Group 13817" transform="translate(15.581 9.089)">%0A          <g id="Group_13816" data-name="Group 13816">%0A            <g id="Group_13815" data-name="Group 13815">%0A              <path id="Path_23029" data-name="Path 23029" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13819" data-name="Group 13819" transform="translate(0.026 9.764)">%0A          <g id="Group_13818" data-name="Group 13818" transform="translate(0 0)">%0A            <path id="Path_23030" data-name="Path 23030" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13822" data-name="Group 13822" transform="translate(1.298 9.738)">%0A          <g id="Group_13821" data-name="Group 13821">%0A            <g id="Group_13820" data-name="Group 13820">%0A              <path id="Path_23031" data-name="Path 23031" d="M0,.032.617,0,.649.617.032.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13824" data-name="Group 13824" transform="translate(2.623 9.764)">%0A          <g id="Group_13823" data-name="Group 13823" transform="translate(0 0)">%0A            <path id="Path_23032" data-name="Path 23032" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13827" data-name="Group 13827" transform="translate(4.544 9.738)">%0A          <g id="Group_13826" data-name="Group 13826">%0A            <g id="Group_13825" data-name="Group 13825">%0A              <path id="Path_23033" data-name="Path 23033" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13830" data-name="Group 13830" transform="translate(5.875 9.77)">%0A          <g id="Group_13829" data-name="Group 13829" transform="translate(0 0)">%0A            <g id="Group_13828" data-name="Group 13828">%0A              <path id="Path_23034" data-name="Path 23034" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13832" data-name="Group 13832" transform="translate(6.518 9.764)">%0A          <g id="Group_13831" data-name="Group 13831" transform="translate(0 0)">%0A            <path id="Path_23035" data-name="Path 23035" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13835" data-name="Group 13835" transform="translate(12.335 9.738)">%0A          <g id="Group_13834" data-name="Group 13834">%0A            <g id="Group_13833" data-name="Group 13833">%0A              <path id="Path_23036" data-name="Path 23036" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13837" data-name="Group 13837" transform="translate(13.01 9.764)">%0A          <g id="Group_13836" data-name="Group 13836" transform="translate(0 0)">%0A            <path id="Path_23037" data-name="Path 23037" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13839" data-name="Group 13839" transform="translate(14.308 9.764)">%0A          <g id="Group_13838" data-name="Group 13838" transform="translate(0 0)">%0A            <path id="Path_23038" data-name="Path 23038" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13842" data-name="Group 13842" transform="translate(15.581 9.738)">%0A          <g id="Group_13841" data-name="Group 13841">%0A            <g id="Group_13840" data-name="Group 13840">%0A              <path id="Path_23039" data-name="Path 23039" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13845" data-name="Group 13845" transform="translate(0 10.387)">%0A          <g id="Group_13844" data-name="Group 13844">%0A            <g id="Group_13843" data-name="Group 13843">%0A              <path id="Path_23040" data-name="Path 23040" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13848" data-name="Group 13848" transform="translate(1.298 10.387)">%0A          <g id="Group_13847" data-name="Group 13847">%0A            <g id="Group_13846" data-name="Group 13846">%0A              <path id="Path_23041" data-name="Path 23041" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13851" data-name="Group 13851" transform="translate(2.597 10.387)">%0A          <g id="Group_13850" data-name="Group 13850">%0A            <g id="Group_13849" data-name="Group 13849">%0A              <path id="Path_23042" data-name="Path 23042" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13853" data-name="Group 13853" transform="translate(3.272 10.413)">%0A          <g id="Group_13852" data-name="Group 13852" transform="translate(0 0)">%0A            <path id="Path_23043" data-name="Path 23043" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13856" data-name="Group 13856" transform="translate(3.928 10.42)">%0A          <g id="Group_13855" data-name="Group 13855" transform="translate(0 0)">%0A            <g id="Group_13854" data-name="Group 13854">%0A              <path id="Path_23044" data-name="Path 23044" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13858" data-name="Group 13858" transform="translate(6.518 10.413)">%0A          <g id="Group_13857" data-name="Group 13857" transform="translate(0 0)">%0A            <path id="Path_23045" data-name="Path 23045" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13860" data-name="Group 13860" transform="translate(7.167 10.413)">%0A          <g id="Group_13859" data-name="Group 13859" transform="translate(0 0)">%0A            <path id="Path_23046" data-name="Path 23046" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13862" data-name="Group 13862" transform="translate(7.816 10.413)">%0A          <g id="Group_13861" data-name="Group 13861" transform="translate(0 0)">%0A            <path id="Path_23047" data-name="Path 23047" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13865" data-name="Group 13865" transform="translate(8.44 10.387)">%0A          <g id="Group_13864" data-name="Group 13864">%0A            <g id="Group_13863" data-name="Group 13863">%0A              <path id="Path_23048" data-name="Path 23048" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13868" data-name="Group 13868" transform="translate(9.738 10.387)">%0A          <g id="Group_13867" data-name="Group 13867">%0A            <g id="Group_13866" data-name="Group 13866">%0A              <path id="Path_23049" data-name="Path 23049" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13870" data-name="Group 13870" transform="translate(10.413 10.413)">%0A          <g id="Group_13869" data-name="Group 13869" transform="translate(0 0)">%0A            <path id="Path_23050" data-name="Path 23050" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13872" data-name="Group 13872" transform="translate(11.062 10.413)">%0A          <g id="Group_13871" data-name="Group 13871" transform="translate(0 0)">%0A            <path id="Path_23051" data-name="Path 23051" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13874" data-name="Group 13874" transform="translate(11.712 10.413)">%0A          <g id="Group_13873" data-name="Group 13873" transform="translate(0 0)">%0A            <path id="Path_23052" data-name="Path 23052" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13876" data-name="Group 13876" transform="translate(12.361 10.413)">%0A          <g id="Group_13875" data-name="Group 13875" transform="translate(0 0)">%0A            <path id="Path_23053" data-name="Path 23053" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13878" data-name="Group 13878" transform="translate(13.01 10.413)">%0A          <g id="Group_13877" data-name="Group 13877" transform="translate(0 0)">%0A            <path id="Path_23054" data-name="Path 23054" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13881" data-name="Group 13881" transform="translate(14.282 10.387)">%0A          <g id="Group_13880" data-name="Group 13880">%0A            <g id="Group_13879" data-name="Group 13879">%0A              <path id="Path_23055" data-name="Path 23055" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13884" data-name="Group 13884" transform="translate(14.932 10.387)">%0A          <g id="Group_13883" data-name="Group 13883">%0A            <g id="Group_13882" data-name="Group 13882">%0A              <path id="Path_23056" data-name="Path 23056" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13887" data-name="Group 13887" transform="translate(5.194 11.036)">%0A          <g id="Group_13886" data-name="Group 13886">%0A            <g id="Group_13885" data-name="Group 13885">%0A              <path id="Path_23057" data-name="Path 23057" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13889" data-name="Group 13889" transform="translate(5.869 11.062)">%0A          <g id="Group_13888" data-name="Group 13888" transform="translate(0 0)">%0A            <path id="Path_23058" data-name="Path 23058" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13891" data-name="Group 13891" transform="translate(6.518 11.062)">%0A          <g id="Group_13890" data-name="Group 13890" transform="translate(0 0)">%0A            <path id="Path_23059" data-name="Path 23059" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13894" data-name="Group 13894" transform="translate(8.44 11.036)">%0A          <g id="Group_13893" data-name="Group 13893">%0A            <g id="Group_13892" data-name="Group 13892">%0A              <path id="Path_23060" data-name="Path 23060" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13897" data-name="Group 13897" transform="translate(9.738 11.036)">%0A          <g id="Group_13896" data-name="Group 13896">%0A            <g id="Group_13895" data-name="Group 13895">%0A              <path id="Path_23061" data-name="Path 23061" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13899" data-name="Group 13899" transform="translate(10.413 11.062)">%0A          <g id="Group_13898" data-name="Group 13898" transform="translate(0 0)">%0A            <path id="Path_23062" data-name="Path 23062" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13901" data-name="Group 13901" transform="translate(13.01 11.062)">%0A          <g id="Group_13900" data-name="Group 13900" transform="translate(0 0)">%0A            <path id="Path_23063" data-name="Path 23063" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13904" data-name="Group 13904" transform="translate(14.932 11.036)">%0A          <g id="Group_13903" data-name="Group 13903">%0A            <g id="Group_13902" data-name="Group 13902">%0A              <path id="Path_23064" data-name="Path 23064" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13906" data-name="Group 13906" transform="translate(5.22 11.712)">%0A          <g id="Group_13905" data-name="Group 13905" transform="translate(0 0)">%0A            <path id="Path_23065" data-name="Path 23065" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13908" data-name="Group 13908" transform="translate(5.869 11.712)">%0A          <g id="Group_13907" data-name="Group 13907" transform="translate(0 0)">%0A            <path id="Path_23066" data-name="Path 23066" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13910" data-name="Group 13910" transform="translate(6.518 11.712)">%0A          <g id="Group_13909" data-name="Group 13909" transform="translate(0 0)">%0A            <path id="Path_23067" data-name="Path 23067" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13912" data-name="Group 13912" transform="translate(7.167 11.712)">%0A          <g id="Group_13911" data-name="Group 13911" transform="translate(0 0)">%0A            <path id="Path_23068" data-name="Path 23068" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13915" data-name="Group 13915" transform="translate(7.823 11.718)">%0A          <g id="Group_13914" data-name="Group 13914" transform="translate(0 0)">%0A            <g id="Group_13913" data-name="Group 13913">%0A              <path id="Path_23069" data-name="Path 23069" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13917" data-name="Group 13917" transform="translate(10.413 11.712)">%0A          <g id="Group_13916" data-name="Group 13916" transform="translate(0 0)">%0A            <path id="Path_23070" data-name="Path 23070" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13920" data-name="Group 13920" transform="translate(11.686 11.686)">%0A          <g id="Group_13919" data-name="Group 13919">%0A            <g id="Group_13918" data-name="Group 13918">%0A              <path id="Path_23071" data-name="Path 23071" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13922" data-name="Group 13922" transform="translate(13.01 11.712)">%0A          <g id="Group_13921" data-name="Group 13921" transform="translate(0 0)">%0A            <path id="Path_23072" data-name="Path 23072" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13925" data-name="Group 13925" transform="translate(13.666 11.718)">%0A          <g id="Group_13924" data-name="Group 13924" transform="translate(0 0)">%0A            <g id="Group_13923" data-name="Group 13923">%0A              <path id="Path_23073" data-name="Path 23073" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13928" data-name="Group 13928" transform="translate(15.581 11.686)">%0A          <g id="Group_13927" data-name="Group 13927">%0A            <g id="Group_13926" data-name="Group 13926">%0A              <path id="Path_23074" data-name="Path 23074" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13930" data-name="Group 13930" transform="translate(5.22 12.361)">%0A          <g id="Group_13929" data-name="Group 13929" transform="translate(0 0)">%0A            <path id="Path_23075" data-name="Path 23075" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13932" data-name="Group 13932" transform="translate(7.167 12.361)">%0A          <g id="Group_13931" data-name="Group 13931" transform="translate(0 0)">%0A            <path id="Path_23076" data-name="Path 23076" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13935" data-name="Group 13935" transform="translate(8.472 12.367)">%0A          <g id="Group_13934" data-name="Group 13934" transform="translate(0 0)">%0A            <g id="Group_13933" data-name="Group 13933">%0A              <path id="Path_23077" data-name="Path 23077" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13937" data-name="Group 13937" transform="translate(9.115 12.361)">%0A          <g id="Group_13936" data-name="Group 13936" transform="translate(0 0)">%0A            <path id="Path_23078" data-name="Path 23078" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13939" data-name="Group 13939" transform="translate(9.764 12.361)">%0A          <g id="Group_13938" data-name="Group 13938" transform="translate(0 0)">%0A            <path id="Path_23079" data-name="Path 23079" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13941" data-name="Group 13941" transform="translate(10.413 12.361)">%0A          <g id="Group_13940" data-name="Group 13940" transform="translate(0 0)">%0A            <path id="Path_23080" data-name="Path 23080" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13943" data-name="Group 13943" transform="translate(13.01 12.361)">%0A          <g id="Group_13942" data-name="Group 13942" transform="translate(0 0)">%0A            <path id="Path_23081" data-name="Path 23081" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13945" data-name="Group 13945" transform="translate(5.22 13.01)">%0A          <g id="Group_13944" data-name="Group 13944" transform="translate(0 0)">%0A            <path id="Path_23082" data-name="Path 23082" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13948" data-name="Group 13948" transform="translate(6.524 13.016)">%0A          <g id="Group_13947" data-name="Group 13947" transform="translate(0 0)">%0A            <g id="Group_13946" data-name="Group 13946">%0A              <path id="Path_23083" data-name="Path 23083" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13950" data-name="Group 13950" transform="translate(7.167 13.01)">%0A          <g id="Group_13949" data-name="Group 13949" transform="translate(0 0)">%0A            <path id="Path_23084" data-name="Path 23084" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13953" data-name="Group 13953" transform="translate(7.823 13.016)">%0A          <g id="Group_13952" data-name="Group 13952" transform="translate(0 0)">%0A            <g id="Group_13951" data-name="Group 13951">%0A              <path id="Path_23085" data-name="Path 23085" d="M.165.1.1.619.619.684.684.165Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13955" data-name="Group 13955" transform="translate(9.115 13.01)">%0A          <g id="Group_13954" data-name="Group 13954" transform="translate(0 0)">%0A            <path id="Path_23086" data-name="Path 23086" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13957" data-name="Group 13957" transform="translate(9.764 13.01)">%0A          <g id="Group_13956" data-name="Group 13956" transform="translate(0 0)">%0A            <path id="Path_23087" data-name="Path 23087" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13959" data-name="Group 13959" transform="translate(10.413 13.01)">%0A          <g id="Group_13958" data-name="Group 13958" transform="translate(0 0)">%0A            <path id="Path_23088" data-name="Path 23088" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13961" data-name="Group 13961" transform="translate(11.062 13.01)">%0A          <g id="Group_13960" data-name="Group 13960" transform="translate(0 0)">%0A            <path id="Path_23089" data-name="Path 23089" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13963" data-name="Group 13963" transform="translate(11.712 13.01)">%0A          <g id="Group_13962" data-name="Group 13962" transform="translate(0 0)">%0A            <path id="Path_23090" data-name="Path 23090" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13965" data-name="Group 13965" transform="translate(12.361 13.01)">%0A          <g id="Group_13964" data-name="Group 13964" transform="translate(0 0)">%0A            <path id="Path_23091" data-name="Path 23091" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13967" data-name="Group 13967" transform="translate(13.01 13.01)">%0A          <g id="Group_13966" data-name="Group 13966" transform="translate(0 0)">%0A            <path id="Path_23092" data-name="Path 23092" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13970" data-name="Group 13970" transform="translate(13.633 12.984)">%0A          <g id="Group_13969" data-name="Group 13969">%0A            <g id="Group_13968" data-name="Group 13968">%0A              <path id="Path_23093" data-name="Path 23093" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13973" data-name="Group 13973" transform="translate(5.194 13.633)">%0A          <g id="Group_13972" data-name="Group 13972">%0A            <g id="Group_13971" data-name="Group 13971">%0A              <path id="Path_23094" data-name="Path 23094" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13975" data-name="Group 13975" transform="translate(7.167 13.659)">%0A          <g id="Group_13974" data-name="Group 13974" transform="translate(0 0)">%0A            <path id="Path_23095" data-name="Path 23095" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13978" data-name="Group 13978" transform="translate(8.472 13.666)">%0A          <g id="Group_13977" data-name="Group 13977" transform="translate(0 0)">%0A            <g id="Group_13976" data-name="Group 13976">%0A              <path id="Path_23096" data-name="Path 23096" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13981" data-name="Group 13981" transform="translate(9.089 13.633)">%0A          <g id="Group_13980" data-name="Group 13980">%0A            <g id="Group_13979" data-name="Group 13979">%0A              <path id="Path_23097" data-name="Path 23097" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13983" data-name="Group 13983" transform="translate(11.062 13.659)">%0A          <g id="Group_13982" data-name="Group 13982" transform="translate(0 0)">%0A            <path id="Path_23098" data-name="Path 23098" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13985" data-name="Group 13985" transform="translate(11.712 13.659)">%0A          <g id="Group_13984" data-name="Group 13984" transform="translate(0 0)">%0A            <path id="Path_23099" data-name="Path 23099" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13987" data-name="Group 13987" transform="translate(12.361 13.659)">%0A          <g id="Group_13986" data-name="Group 13986" transform="translate(0 0)">%0A            <path id="Path_23100" data-name="Path 23100" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_13990" data-name="Group 13990" transform="translate(13.633 13.633)">%0A          <g id="Group_13989" data-name="Group 13989">%0A            <g id="Group_13988" data-name="Group 13988">%0A              <path id="Path_23101" data-name="Path 23101" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13993" data-name="Group 13993" transform="translate(14.932 13.633)">%0A          <g id="Group_13992" data-name="Group 13992">%0A            <g id="Group_13991" data-name="Group 13991">%0A              <path id="Path_23102" data-name="Path 23102" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13996" data-name="Group 13996" transform="translate(15.581 13.633)">%0A          <g id="Group_13995" data-name="Group 13995">%0A            <g id="Group_13994" data-name="Group 13994">%0A              <path id="Path_23103" data-name="Path 23103" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_13998" data-name="Group 13998" transform="translate(7.167 14.308)">%0A          <g id="Group_13997" data-name="Group 13997" transform="translate(0 0)">%0A            <path id="Path_23104" data-name="Path 23104" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14001" data-name="Group 14001" transform="translate(10.42 14.315)">%0A          <g id="Group_14000" data-name="Group 14000" transform="translate(0 0)">%0A            <g id="Group_13999" data-name="Group 13999">%0A              <path id="Path_23105" data-name="Path 23105" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14003" data-name="Group 14003" transform="translate(11.062 14.308)">%0A          <g id="Group_14002" data-name="Group 14002" transform="translate(0 0)">%0A            <path id="Path_23106" data-name="Path 23106" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14005" data-name="Group 14005" transform="translate(12.361 14.308)">%0A          <g id="Group_14004" data-name="Group 14004" transform="translate(0 0)">%0A            <path id="Path_23107" data-name="Path 23107" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14008" data-name="Group 14008" transform="translate(12.984 14.282)">%0A          <g id="Group_14007" data-name="Group 14007">%0A            <g id="Group_14006" data-name="Group 14006">%0A              <path id="Path_23108" data-name="Path 23108" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14011" data-name="Group 14011" transform="translate(14.282 14.282)">%0A          <g id="Group_14010" data-name="Group 14010">%0A            <g id="Group_14009" data-name="Group 14009">%0A              <path id="Path_23109" data-name="Path 23109" d="M0,.078.571,0,.649.571.078.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14013" data-name="Group 14013" transform="translate(14.958 14.308)">%0A          <g id="Group_14012" data-name="Group 14012" transform="translate(0 0)">%0A            <path id="Path_23110" data-name="Path 23110" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14015" data-name="Group 14015" transform="translate(15.607 14.308)">%0A          <g id="Group_14014" data-name="Group 14014" transform="translate(0 0)">%0A            <path id="Path_23111" data-name="Path 23111" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14018" data-name="Group 14018" transform="translate(5.875 14.964)">%0A          <g id="Group_14017" data-name="Group 14017" transform="translate(0 0)">%0A            <g id="Group_14016" data-name="Group 14016">%0A              <path id="Path_23112" data-name="Path 23112" d="M.1.23.554.1l.13.454L.23.684Z" transform="translate(-0.1 -0.1)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14020" data-name="Group 14020" transform="translate(6.518 14.958)">%0A          <g id="Group_14019" data-name="Group 14019" transform="translate(0 0)">%0A            <path id="Path_23113" data-name="Path 23113" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14022" data-name="Group 14022" transform="translate(7.167 14.958)">%0A          <g id="Group_14021" data-name="Group 14021" transform="translate(0 0)">%0A            <path id="Path_23114" data-name="Path 23114" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14025" data-name="Group 14025" transform="translate(7.79 14.932)">%0A          <g id="Group_14024" data-name="Group 14024">%0A            <g id="Group_14023" data-name="Group 14023">%0A              <path id="Path_23115" data-name="Path 23115" d="M.143,0,0,.506.506.649.649.143Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14028" data-name="Group 14028" transform="translate(11.036 14.932)">%0A          <g id="Group_14027" data-name="Group 14027">%0A            <g id="Group_14026" data-name="Group 14026">%0A              <path id="Path_23116" data-name="Path 23116" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14030" data-name="Group 14030" transform="translate(11.712 14.958)">%0A          <g id="Group_14029" data-name="Group 14029" transform="translate(0 0)">%0A            <path id="Path_23117" data-name="Path 23117" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14032" data-name="Group 14032" transform="translate(12.361 14.958)">%0A          <g id="Group_14031" data-name="Group 14031" transform="translate(0 0)">%0A            <path id="Path_23118" data-name="Path 23118" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14035" data-name="Group 14035" transform="translate(12.984 14.932)">%0A          <g id="Group_14034" data-name="Group 14034">%0A            <g id="Group_14033" data-name="Group 14033">%0A              <path id="Path_23119" data-name="Path 23119" d="M0,.11.539,0l.11.539L.11.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14038" data-name="Group 14038" transform="translate(14.282 14.932)">%0A          <g id="Group_14037" data-name="Group 14037">%0A            <g id="Group_14036" data-name="Group 14036">%0A              <path id="Path_23120" data-name="Path 23120" d="M.084,0,0,.565.565.649.649.084Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14040" data-name="Group 14040" transform="translate(14.958 14.958)">%0A          <g id="Group_14039" data-name="Group 14039" transform="translate(0 0)">%0A            <path id="Path_23121" data-name="Path 23121" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14042" data-name="Group 14042" transform="translate(15.607 14.958)">%0A          <g id="Group_14041" data-name="Group 14041" transform="translate(0 0)">%0A            <path id="Path_23122" data-name="Path 23122" d="M.106.08.08.651.651.677.677.106Z" transform="translate(-0.08 -0.08)"/>%0A          </g>%0A        </g>%0A        <g id="Group_14045" data-name="Group 14045" transform="translate(5.194 15.581)">%0A          <g id="Group_14044" data-name="Group 14044">%0A            <g id="Group_14043" data-name="Group 14043">%0A              <path id="Path_23123" data-name="Path 23123" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14048" data-name="Group 14048" transform="translate(6.492 15.581)">%0A          <g id="Group_14047" data-name="Group 14047">%0A            <g id="Group_14046" data-name="Group 14046">%0A              <path id="Path_23124" data-name="Path 23124" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14051" data-name="Group 14051" transform="translate(7.79 15.581)">%0A          <g id="Group_14050" data-name="Group 14050">%0A            <g id="Group_14049" data-name="Group 14049">%0A              <path id="Path_23125" data-name="Path 23125" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14054" data-name="Group 14054" transform="translate(10.387 15.581)">%0A          <g id="Group_14053" data-name="Group 14053">%0A            <g id="Group_14052" data-name="Group 14052">%0A              <path id="Path_23126" data-name="Path 23126" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14057" data-name="Group 14057" transform="translate(11.686 15.581)">%0A          <g id="Group_14056" data-name="Group 14056">%0A            <g id="Group_14055" data-name="Group 14055">%0A              <path id="Path_23127" data-name="Path 23127" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14060" data-name="Group 14060" transform="translate(13.633 15.581)">%0A          <g id="Group_14059" data-name="Group 14059">%0A            <g id="Group_14058" data-name="Group 14058">%0A              <path id="Path_23128" data-name="Path 23128" d="M0,.1.552,0l.1.552L.1.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14063" data-name="Group 14063" transform="translate(15.581 15.581)">%0A          <g id="Group_14062" data-name="Group 14062">%0A            <g id="Group_14061" data-name="Group 14061">%0A              <path id="Path_23129" data-name="Path 23129" d="M0,.065.584,0,.649.584.065.649Z"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14066" data-name="Group 14066" transform="translate(0 0)">%0A          <g id="Group_14065" data-name="Group 14065">%0A            <g id="Group_14064" data-name="Group 14064">%0A              <path id="Path_23130" data-name="Path 23130" d="M4.411,2.1H2.97a.878.878,0,0,0-.5.154.865.865,0,0,0-.266.292.833.833,0,0,0-.105.406V4.429a.862.862,0,0,0,.87.853H4.411a.862.862,0,0,0,.87-.852V2.953A.862.862,0,0,0,4.411,2.1Z" transform="translate(-1.418 -1.419)" fill="none"/>%0A              <path id="Path_23131" data-name="Path 23131" d="M2.993,0H1.552A1.552,1.552,0,0,0,.064,1.1a1.505,1.505,0,0,0-.046.2A1.525,1.525,0,0,0,0,1.535V3.01A1.545,1.545,0,0,0,1.552,4.545H2.993A1.545,1.545,0,0,0,4.544,3.01V1.535A1.545,1.545,0,0,0,2.993,0Zm.87,3.009a.862.862,0,0,1-.87.853H1.552a.862.862,0,0,1-.87-.852V1.535a.834.834,0,0,1,.105-.406A.865.865,0,0,1,1.053.837a.877.877,0,0,1,.5-.154H2.993a.862.862,0,0,1,.87.852Z" transform="translate(0 -0.001)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14069" data-name="Group 14069" transform="translate(11.686 0)">%0A          <g id="Group_14068" data-name="Group 14068" transform="translate(0)">%0A            <g id="Group_14067" data-name="Group 14067">%0A              <path id="Path_23132" data-name="Path 23132" d="M4.411,2.1H2.97a.878.878,0,0,0-.5.154.865.865,0,0,0-.266.292.833.833,0,0,0-.105.406V4.429a.862.862,0,0,0,.87.853H4.411a.862.862,0,0,0,.87-.852V2.953A.862.862,0,0,0,4.411,2.1Z" transform="translate(-1.418 -1.419)" fill="none"/>%0A              <path id="Path_23133" data-name="Path 23133" d="M2.993,0H1.552A1.552,1.552,0,0,0,.064,1.1a1.505,1.505,0,0,0-.046.2A1.525,1.525,0,0,0,0,1.535V3.01A1.545,1.545,0,0,0,1.552,4.545H2.993A1.545,1.545,0,0,0,4.544,3.01V1.535A1.545,1.545,0,0,0,2.993,0Zm.87,3.009a.862.862,0,0,1-.87.853H1.552a.862.862,0,0,1-.87-.852V1.535a.834.834,0,0,1,.105-.406A.865.865,0,0,1,1.053.837a.877.877,0,0,1,.5-.154H2.993a.862.862,0,0,1,.87.852Z" transform="translate(0 -0.001)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14072" data-name="Group 14072" transform="translate(0 11.686)">%0A          <g id="Group_14071" data-name="Group 14071" transform="translate(0 0)">%0A            <g id="Group_14070" data-name="Group 14070">%0A              <path id="Path_23134" data-name="Path 23134" d="M4.411,2.1H2.97a.878.878,0,0,0-.5.154.865.865,0,0,0-.266.292.833.833,0,0,0-.105.406V4.429a.862.862,0,0,0,.87.853H4.411a.862.862,0,0,0,.87-.852V2.953A.862.862,0,0,0,4.411,2.1Z" transform="translate(-1.418 -1.419)" fill="none"/>%0A              <path id="Path_23135" data-name="Path 23135" d="M2.993,0H1.552A1.552,1.552,0,0,0,.064,1.1a1.505,1.505,0,0,0-.046.2A1.525,1.525,0,0,0,0,1.535V3.01A1.545,1.545,0,0,0,1.552,4.545H2.993A1.545,1.545,0,0,0,4.544,3.01V1.535A1.545,1.545,0,0,0,2.993,0Zm.87,3.009a.862.862,0,0,1-.87.853H1.552a.862.862,0,0,1-.87-.852V1.535a.834.834,0,0,1,.105-.406A.865.865,0,0,1,1.053.837a.877.877,0,0,1,.5-.154H2.993a.862.862,0,0,1,.87.852Z" transform="translate(0 -0.001)"/>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14076" data-name="Group 14076" transform="translate(1.298 1.298)">%0A          <g id="Group_14075" data-name="Group 14075" transform="translate(0 0)">%0A            <g id="Group_14074" data-name="Group 14074">%0A              <g id="XMLID_1_">%0A                <g id="Group_14073" data-name="Group 14073">%0A                  <path id="Path_23136" data-name="Path 23136" d="M.532,1.948A.528.528,0,0,1,0,1.425v-.9A.512.512,0,0,1,.063.273.527.527,0,0,1,.226.095.538.538,0,0,1,.532,0h.883a.528.528,0,0,1,.533.522v.9a.528.528,0,0,1-.533.522H.532Z" transform="translate(0.001 0)"/>%0A                </g>%0A              </g>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14080" data-name="Group 14080" transform="translate(12.984 1.298)">%0A          <g id="Group_14079" data-name="Group 14079" transform="translate(0 0)">%0A            <g id="Group_14078" data-name="Group 14078">%0A              <g id="XMLID_1_2" data-name="XMLID_1_">%0A                <g id="Group_14077" data-name="Group 14077">%0A                  <path id="Path_23137" data-name="Path 23137" d="M.532,1.948A.528.528,0,0,1,0,1.425v-.9A.512.512,0,0,1,.063.273.527.527,0,0,1,.226.095.538.538,0,0,1,.532,0h.883a.528.528,0,0,1,.533.522v.9a.528.528,0,0,1-.533.522H.532Z" transform="translate(0.001 0)"/>%0A                </g>%0A              </g>%0A            </g>%0A          </g>%0A        </g>%0A        <g id="Group_14084" data-name="Group 14084" transform="translate(1.298 12.984)">%0A          <g id="Group_14083" data-name="Group 14083" transform="translate(0 0)">%0A            <g id="Group_14082" data-name="Group 14082">%0A              <g id="XMLID_1_3" data-name="XMLID_1_">%0A                <g id="Group_14081" data-name="Group 14081">%0A                  <path id="Path_23138" data-name="Path 23138" d="M.532,1.948A.528.528,0,0,1,0,1.425v-.9A.512.512,0,0,1,.063.273.527.527,0,0,1,.226.095.538.538,0,0,1,.532,0h.883a.528.528,0,0,1,.533.522v.9a.528.528,0,0,1-.533.522H.532Z" transform="translate(0.001 0)"/>%0A                </g>%0A              </g>%0A            </g>%0A          </g>%0A        </g>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/trydos.svg
var trydos_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80.556" height="25" viewBox="0 0 80.556 25">%0A  <g id="Group_13790" data-name="Group 13790" transform="translate(-144 -443)">%0A    <path id="Path_23326" data-name="Path 23326" d="M9.509-49.924a.88.88,0,0,1,.675.359,1.41,1.41,0,0,1,.3.944,1.421,1.421,0,0,1-.781,1.21,3.237,3.237,0,0,1-1.762.492,5.119,5.119,0,0,1-2.768-.7q-1.126-.7-1.126-2.992v-7.34H2.833a1.435,1.435,0,0,1-1.06-.426,1.446,1.446,0,0,1-.424-1.064,1.371,1.371,0,0,1,.424-1.024,1.459,1.459,0,0,1,1.06-.412H4.052v-1.7a1.574,1.574,0,0,1,.464-1.157,1.561,1.561,0,0,1,1.152-.465,1.487,1.487,0,0,1,1.113.465,1.6,1.6,0,0,1,.45,1.157v1.7H9.112a1.435,1.435,0,0,1,1.06.426,1.446,1.446,0,0,1,.424,1.064,1.371,1.371,0,0,1-.424,1.024,1.459,1.459,0,0,1-1.06.412H7.231v7.207a1.02,1.02,0,0,0,.291.811,1.172,1.172,0,0,0,.795.253,2.265,2.265,0,0,0,.583-.106A1.577,1.577,0,0,1,9.509-49.924Zm11.5-11.489a2.021,2.021,0,0,1,1.338.452,1.35,1.35,0,0,1,.543,1.064,1.652,1.652,0,0,1-.424,1.237,1.4,1.4,0,0,1-1.007.412,2.634,2.634,0,0,1-.9-.186q-.079-.027-.358-.106a2.152,2.152,0,0,0-.6-.08,2.348,2.348,0,0,0-1.324.426,3.1,3.1,0,0,0-1.046,1.29,4.765,4.765,0,0,0-.411,2.061v6.3a1.6,1.6,0,0,1-.45,1.157,1.518,1.518,0,0,1-1.139.465,1.518,1.518,0,0,1-1.139-.465,1.6,1.6,0,0,1-.45-1.157V-59.526a1.6,1.6,0,0,1,.45-1.157,1.518,1.518,0,0,1,1.139-.465,1.518,1.518,0,0,1,1.139.465,1.6,1.6,0,0,1,.45,1.157v.346a4.02,4.02,0,0,1,1.748-1.662A5.357,5.357,0,0,1,21.005-61.414Zm14.781.266a1.518,1.518,0,0,1,1.139.465,1.6,1.6,0,0,1,.45,1.157v11.3q0,3.457-1.854,5.04A7.373,7.373,0,0,1,30.568-41.6a11.969,11.969,0,0,1-1.841-.146,6.884,6.884,0,0,1-1.523-.386q-1.3-.559-1.3-1.543a1.371,1.371,0,0,1,.079-.426,1.649,1.649,0,0,1,.543-.891,1.312,1.312,0,0,1,.834-.306,1.575,1.575,0,0,1,.5.08q.185.08.649.266a6.662,6.662,0,0,0,.98.306,4.739,4.739,0,0,0,1.073.12,4.007,4.007,0,0,0,2.768-.811,3.638,3.638,0,0,0,.887-2.779v-.266a5.156,5.156,0,0,1-4.291,1.729A4.557,4.557,0,0,1,27.5-47.3a4.394,4.394,0,0,1-1.642-1.809,5.8,5.8,0,0,1-.583-2.646v-7.766a1.6,1.6,0,0,1,.45-1.157,1.518,1.518,0,0,1,1.139-.465A1.518,1.518,0,0,1,28-60.682a1.6,1.6,0,0,1,.45,1.157v6.809a3.321,3.321,0,0,0,.728,2.407,2.883,2.883,0,0,0,2.132.731,2.77,2.77,0,0,0,2.132-.811,3.292,3.292,0,0,0,.755-2.327v-6.809a1.6,1.6,0,0,1,.45-1.157A1.518,1.518,0,0,1,35.787-61.148ZM52.263-66.6a.5.5,0,0,1,.384.16.535.535,0,0,1,.146.372v18.617a.511.511,0,0,1-.159.372.507.507,0,0,1-.371.16.5.5,0,0,1-.384-.16.535.535,0,0,1-.146-.372v-2.527a5.732,5.732,0,0,1-2.013,2.367,5.261,5.261,0,0,1-3.073.957,5.592,5.592,0,0,1-3.126-.918,6.369,6.369,0,0,1-2.212-2.513,7.776,7.776,0,0,1-.808-3.564,7.776,7.776,0,0,1,.808-3.564,6.27,6.27,0,0,1,2.212-2.5,5.652,5.652,0,0,1,3.126-.9,5.4,5.4,0,0,1,3.046.931,5.405,5.405,0,0,1,2.04,2.42v-8.8a.535.535,0,0,1,.146-.372A.5.5,0,0,1,52.263-66.6ZM46.7-47.664a4.691,4.691,0,0,0,2.649-.771,5.231,5.231,0,0,0,1.828-2.141,6.966,6.966,0,0,0,.662-3.072,6.88,6.88,0,0,0-.662-3.059,5.212,5.212,0,0,0-1.841-2.128,4.71,4.71,0,0,0-2.636-.771,4.666,4.666,0,0,0-2.609.771,5.288,5.288,0,0,0-1.854,2.141,6.791,6.791,0,0,0-.675,3.045,6.767,6.767,0,0,0,.675,3.059,5.446,5.446,0,0,0,1.841,2.141A4.59,4.59,0,0,0,46.7-47.664Zm22.755-5.957a7.4,7.4,0,0,1-.848,3.551,6.443,6.443,0,0,1-2.344,2.5,6.236,6.236,0,0,1-3.324.918,6.236,6.236,0,0,1-3.324-.918,6.516,6.516,0,0,1-2.358-2.513,7.329,7.329,0,0,1-.861-3.537,7.384,7.384,0,0,1,.861-3.564A6.55,6.55,0,0,1,59.6-59.7a6.216,6.216,0,0,1,3.338-.918,6.236,6.236,0,0,1,3.324.918,6.419,6.419,0,0,1,2.344,2.513A7.477,7.477,0,0,1,69.455-53.621Zm-1.06,0a6.555,6.555,0,0,0-.7-3.058,5.422,5.422,0,0,0-1.947-2.141,5.156,5.156,0,0,0-2.808-.785,5.176,5.176,0,0,0-2.795.785,5.485,5.485,0,0,0-1.973,2.141,6.456,6.456,0,0,0-.715,3.058,6.4,6.4,0,0,0,.715,3.032,5.485,5.485,0,0,0,1.973,2.141,5.176,5.176,0,0,0,2.795.785,5.223,5.223,0,0,0,2.808-.771,5.305,5.305,0,0,0,1.947-2.141A6.578,6.578,0,0,0,68.4-53.621Zm3.92,4.574a.991.991,0,0,1-.185-.505.443.443,0,0,1,.212-.346.433.433,0,0,1,.318-.133.5.5,0,0,1,.424.213,4.935,4.935,0,0,0,4.291,2.207,4.344,4.344,0,0,0,2.464-.7,2.179,2.179,0,0,0,1.06-1.9,2.052,2.052,0,0,0-.927-1.835,8.252,8.252,0,0,0-2.543-1.011,9.791,9.791,0,0,1-3.377-1.423A2.921,2.921,0,0,1,72.82-57a3.215,3.215,0,0,1,1.245-2.593,4.881,4.881,0,0,1,3.205-1.024,5.814,5.814,0,0,1,2.159.426,5.393,5.393,0,0,1,1.947,1.356.479.479,0,0,1,.185.372.587.587,0,0,1-.185.426.822.822,0,0,1-.344.106.4.4,0,0,1-.318-.16,4.578,4.578,0,0,0-3.55-1.516,3.969,3.969,0,0,0-2.371.692A2.224,2.224,0,0,0,73.826-57a2.183,2.183,0,0,0,1.046,1.769,9.883,9.883,0,0,0,2.848,1.1,13.116,13.116,0,0,1,2.238.758,3.519,3.519,0,0,1,1.417,1.157,3.276,3.276,0,0,1,.53,1.941,3.139,3.139,0,0,1-1.285,2.646,5.412,5.412,0,0,1-3.351.971A6.088,6.088,0,0,1,72.316-49.047Z" transform="translate(142.65 509.6)" fill="%23404040"/>%0A  </g>%0A</svg>%0A';

// src/components/QR/shared/formatDateTime.ts
function formatDateTime(isoString, locale) {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString(locale, { month: "long" });
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}.${month} | ${hours}:${minutes}`;
}

// src/components/QR/send/shared/DownloadView.tsx
var import_react24 = require("react");
var import_jsx_runtime31 = require("react/jsx-runtime");
var DownloadView2 = (0, import_react24.forwardRef)(
  ({ show, data }, ref) => {
    const { t, language, tr: tr2 } = useTranslation();
    if (!show) return null;
    const dateTime = formatDateTime(data.createdAt, language);
    const getStatusText = (status) => {
      const key = status.toLowerCase();
      return t.transfer.receipt.statusValue[key] || status;
    };
    const displayStatus = getStatusText(data.status);
    return /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(
      "div",
      {
        ref,
        dir: "ltr",
        style: {
          position: "absolute",
          insetInlineStart: "-9999px",
          top: 0,
          width: "375px",
          backgroundColor: "#FFFFFF",
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("div", { style: { textAlign: "center", marginBottom: "16px" }, children: /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
            "p",
            {
              style: {
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1D1D1D",
                letterSpacing: "2px"
              },
              children: "trydos"
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
            "h2",
            {
              style: {
                textAlign: "center",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#1D1D1D",
                marginBottom: "20px"
              },
              children: t.transfer.receipt.receiptTitle
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("div", { style: { display: "flex", justifyContent: "center", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(QRCodeDisplay, { value: data.referenceCode, size: 120 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
            "p",
            {
              style: {
                textAlign: "center",
                fontSize: "13px",
                color: "#1D1D1D",
                marginBottom: "24px"
              },
              children: tr2("transfer.receipt.verificationCode", { code: data.referenceCode })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("div", { style: { borderTop: "1px solid #E8E8E8", margin: "16px 0" } }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { marginBottom: "16px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.senderAccountNumber }),
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: [
              data.senderAccountNumber,
              " ",
              data.senderMaskedName
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("div", { style: { borderTop: "1px solid #E8E8E8", margin: "16px 0" } }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { marginBottom: "16px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: [
              t.transfer.receipt.recipientAccountNumber,
              " ",
              data.inputMethod === "QR" ? "\u{1F4F1}" : ""
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: [
              data.recipientAccountNumber,
              " ",
              data.recipientMaskedName
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("div", { style: { borderTop: "1px solid #E8E8E8", margin: "16px 0" } }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { display: "flex", marginBottom: "16px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.amountSent }),
              /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { style: { fontSize: "16px", color: "#1D1D1D", fontWeight: "bold" }, children: [
                data.amount,
                " ",
                data.currency
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.reference }),
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: data.referenceCode })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { display: "flex", marginBottom: "16px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.dateTime }),
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: dateTime })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.type }),
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: t.transfer.receipt.typeValue })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { display: "flex", marginBottom: "16px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.purpose }),
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: data.purposeLabel })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { style: { fontSize: "11px", color: "#8D8D8D", marginBottom: "4px" }, children: t.transfer.receipt.status }),
              /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("p", { style: { fontSize: "13px", color: "#1D1D1D", fontWeight: "500" }, children: [
                displayStatus,
                " \u2713"
              ] })
            ] })
          ] })
        ]
      }
    );
  }
);
DownloadView2.displayName = "DownloadView";
var DownloadView_default2 = DownloadView2;

// src/components/QR/send/shared/SuccessReceipt.tsx
var import_image10 = __toESM(require("next/image"));
var import_jsx_runtime32 = require("react/jsx-runtime");
function QRCodeDisplay({ value, size, bg }) {
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(CustomQRCode, { value, size, errorCorrectionLevel: "L", bg });
}
var SuccessReceipt = ({ data, onClose }) => {
  const { toast } = useToast();
  const { t, language, tr: tr2 } = useTranslation();
  const downloadRef = (0, import_react25.useRef)(null);
  const [showPreview, setShowPreview] = (0, import_react25.useState)(false);
  const dateTime = formatDateTime(data.createdAt, language);
  const getStatusText = (status) => {
    const key = status.toLowerCase();
    return t.transfer.receipt.statusValue[key] || status;
  };
  const displayStatus = getStatusText(data.status);
  import_react25.default.useEffect(() => {
    const bottomSheet = document.getElementById("bottom-sheet");
    if (!bottomSheet) return;
    const previousBackgroundColor = bottomSheet.style.backgroundColor;
    bottomSheet.style.backgroundColor = "#F4FFFA";
    return () => {
      bottomSheet.style.backgroundColor = previousBackgroundColor;
    };
  }, []);
  const captureCanvas = () => {
    return new Promise((resolve) => {
      setShowPreview(true);
      requestAnimationFrame(async () => {
        try {
          const html2canvas2 = (await import("html2canvas")).default;
          const canvas = await html2canvas2(downloadRef.current, {
            backgroundColor: "#FFFFFF",
            scale: 2
          });
          resolve(canvas);
        } finally {
          setShowPreview(false);
        }
      });
    });
  };
  const handleDownload = async () => {
    try {
      const canvas = await captureCanvas();
      const link = document.createElement("a");
      link.download = `transfer-receipt-${data.referenceCode}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(t.transfer.receipt.downloaded);
    } catch {
      toast.error(t.transfer.receipt.downloadFailed);
    }
  };
  const handleShare = async () => {
    try {
      const canvas = await captureCanvas();
      const result = await shareQRImage(
        canvas,
        tr2("transfer.receipt.shareTitle", { code: data.referenceCode }),
        tr2("transfer.receipt.shareText", { amount: data.amount, currency: data.currency })
      );
      if (result === "shared") {
        toast.success(t.transfer.receipt.shared);
      } else if (result === "copied") {
        toast.success(t.transfer.receipt.sharedCopied);
      }
    } catch {
      toast.error(t.transfer.receipt.shareFailed);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "flex flex-col relative bg-[#F4FFFA] h-full items-center px-6 pb-6 w-full overflow-y-auto", children: [
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "mt-4 mb-3", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(import_image10.default, { src: transferdone_default, alt: "Transfer Done", width: 48, height: 48 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("h2", { className: "text-[13px] font-bold text-[#1D1D1D] tracking-widest text-center mb-4 uppercase", children: t.transfer.receipt.moneySentSuccess }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "mb-2", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(CustomQRCode, { value: data.referenceCode, bg: "#F4FFFA", size: 140 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "text-[13px] text-[#1D1D1D] font-medium mb-6", children: data.referenceCode }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "max-w-md space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
        DetailRow_default,
        {
          label: t.transfer.receipt.senderAccountNumber,
          value: `${data.senderAccountNumber}  ${data.senderMaskedName}`
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "text-[11px] text-[#8D8D8D] font-medium", children: t.transfer.receipt.recipientAccountNumber }),
          data.inputMethod === "QR" && /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
            import_image10.default,
            {
              src: qrinputmethod_default,
              alt: "QR Input",
              width: 14,
              height: 14,
              className: "object-contain"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("p", { className: "text-[13px] text-[#1D1D1D] font-medium", children: [
          data.recipientAccountNumber,
          " ",
          data.recipientMaskedName
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "grid grid-cols-2 gap-y-4 gap-x-12", children: [
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          DetailRow_default,
          {
            label: t.transfer.receipt.amountSent,
            value: `${data.amount} ${data.currency}`,
            bold: true
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          DetailRow_default,
          {
            label: t.transfer.receipt.reference,
            value: data.referenceCode
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(DetailRow_default, { label: t.transfer.receipt.dateTime, value: dateTime }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
          DetailRow_default,
          {
            label: t.transfer.receipt.type,
            value: t.transfer.receipt.typeValue
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(DetailRow_default, { label: t.transfer.receipt.purpose, value: data.purposeLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "text-[11px] text-[#8D8D8D] font-medium", children: t.transfer.receipt.status }),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "text-[13px] text-[#1D1D1D] font-medium", children: displayStatus }),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(import_image10.default, { src: success_default, alt: "Success", width: 16, height: 16 })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "mt-6 mb-4", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { className: "text-[18px] w-20 font-quicksand font-bold text-[#1D1D1D] tracking-wider", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(import_image10.default, { alt: "trydos", width: 80, height: 25, src: trydos_default }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "flex bg-[#F4FFFA] absolute bottom-0 max-w-100 items-center justify-around w-full m-4 pt-4 border-t border-gray-100", children: [
      /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(
        "button",
        {
          onClick: onClose,
          className: "flex flex-col cursor-pointer items-center gap-1 text-[#1D1D1D]",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(import_image10.default, { src: done_default, alt: "Done", width: 24, height: 24 }),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "text-[11px] font-medium", children: t.transfer.receipt.done })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(
        "button",
        {
          onClick: handleDownload,
          className: "flex flex-col cursor-pointer items-center gap-1 text-[#1D1D1D]",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(import_image10.default, { src: download_default, alt: "Download", width: 24, height: 24 }),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "text-[11px] font-medium", children: t.transfer.receipt.download })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(
        "button",
        {
          onClick: handleShare,
          className: "flex flex-col cursor-pointer items-center gap-1 text-[#1D1D1D]",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(import_image10.default, { src: share_default, alt: "Share", width: 24, height: 24 }),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("span", { className: "text-[11px] font-medium", children: t.transfer.receipt.share })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(DownloadView_default2, { ref: downloadRef, show: showPreview, data })
  ] });
};
var SuccessReceipt_default = SuccessReceipt;

// src/assets/icons/home/qr/sendT.svg
var sendT_default = 'data:image/svg+xml,<svg id="_25x25_Back" data-name="25x25 Back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="25" viewBox="0 0 25 25">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4609" data-name="Rectangle 4609" width="25" height="25" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_874" data-name="Mask Group 874" clip-path="url(%23clip-path)">%0A    <g id="paper-plane" transform="translate(-2.514 -2.541)">%0A      <path id="Path_23868" data-name="Path 23868" d="M26.157,2.7c.026.212-1.282,15.92-1.7,16.307-.471.438-1.99-.649-3.866-1.99-.56-.4-1.152-.824-1.757-1.236-.849-.578-1.677-1.147-2.385-1.636l-.522-.362.522-.566.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876ZM14.13,21.755c-.048.072-.084.13-.1.171A.967.967,0,0,0,14.13,21.755Zm-2.4-7.685c.147-.09.692-.515,1.489-1.152.463-.37,1.012-.811,1.618-1.3l.809-.653L16.832,10l0,0h0c1.454-1.176,3.032-2.452,4.469-3.6l.809-.647.809-.643c.282-.224.553-.437.809-.638.29-.227.561-.438.809-.629A10.55,10.55,0,0,1,26.157,2.7c-.4-.783-22.075,10.721-22.281,11.083s7.85.291,7.85.291Z" fill="%23388cff" fill-rule="evenodd"/>%0A      <path id="Path_23869" data-name="Path 23869" d="M15.928,13.78c-.078.467-.176,1.03-.287,1.64-.232,1.271-.521,2.745-.809,3.976a13.332,13.332,0,0,1-.7,2.36c.14-.211.388-.546.7-.959,1.076-1.41,2.94-3.718,4-5.019-.849-.578-1.677-1.147-2.385-1.636l-.522-.362Z" fill="%23fff"/>%0A      <path id="Path_23870" data-name="Path 23870" d="M15.641,15.419c.111-.61.209-1.172.287-1.64l.522-.566.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876.809-.876L26.157,2.7A10.55,10.55,0,0,0,24.539,3.84c-.248.191-.519.4-.809.629-.256.2-.527.414-.809.638l-.809.643L21.3,6.4c-1.437,1.151-3.014,2.427-4.469,3.6h0l0,0-1.191.963-.809.653c-.606.489-1.154.93-1.618,1.3-.8.637-1.342,1.062-1.489,1.152.211,1.139.526,2.7.864,4.132.206.873.42,1.7.625,2.355.315,1.011.608,1.617.81,1.368.021-.041.057-.1.1-.171a13.332,13.332,0,0,0,.7-2.36c.287-1.231.577-2.7.809-3.976Z" fill="%23fff"/>%0A      <g id="Group_15327" data-name="Group 15327">%0A        <path id="Path_23871" data-name="Path 23871" d="M3.967,13.853h0Zm.124-.087.125-.078c.168-.1.411-.244.717-.418.612-.347,1.476-.823,2.51-1.381C9.51,10.772,12.25,9.325,15,7.914s5.5-2.787,7.588-3.76c1.045-.487,1.922-.872,2.55-1.111.2-.076.374-.137.518-.181l-.066.046a12.385,12.385,0,0,0-1.165.837c-.205.195-.426.366-.659.549-.01,0-.15.048-.15.113v0l-.685.54h-.006a.118.118,0,0,0-.116.1l-.713.567A.118.118,0,0,0,22,5.686l-.752.6a.118.118,0,0,0-.04.032c-1.432,1.148-3,2.418-4.451,3.589h0l0,0-.007.006-1.14.922a.118.118,0,0,0-.075.061l-.752.607a.118.118,0,0,0-.046.037c-.575.464-1.1.884-1.544,1.241a.117.117,0,0,0-.087.07c-.383.306-.706.561-.952.752-.227.176-.384.294-.464.347h-.056l-.255,0-.909,0c-.752,0-1.752,0-2.745-.015s-1.979-.039-2.7-.083c-.362-.022-.655-.049-.85-.08l-.081-.015Zm7.764.36c.211,1.13.519,2.651.849,4.051.206.872.419,1.7.623,2.347a6.62,6.62,0,0,0,.438,1.134.591.591,0,0,0,.154.2l0,0,0,0c.024-.044.058-.1.1-.163a13.4,13.4,0,0,0,.69-2.328c.287-1.228.576-2.7.808-3.97.111-.609.209-1.171.286-1.638l.006-.035L25.427,3.315c-.231.17-.505.379-.816.618-.248.191-.519.4-.808.629-.256.2-.526.414-.808.637l-.809.643-.809.646c-1.437,1.151-3.014,2.427-4.468,3.6h0l0,0,0,0-1.188.96-.809.653c-.606.489-1.155.93-1.618,1.3-.4.318-.735.584-.99.782-.2.152-.348.266-.443.333ZM26.022,3.016,16.106,13.76l.411.284c.708.489,1.536,1.058,2.384,1.636.606.413,1.2.837,1.759,1.237h0c.94.672,1.783,1.275,2.45,1.656a3.673,3.673,0,0,0,.838.379c.222.057.351.034.425-.03v0a.307.307,0,0,0,.015-.037,1.509,1.509,0,0,0,.043-.152c.031-.132.066-.318.1-.55.075-.464.16-1.109.25-1.873.181-1.529.382-3.534.57-5.535s.362-4,.487-5.5c.063-.754.113-1.386.147-1.836.012-.165.023-.3.03-.417Zm-1.65,15.909h0Zm-8.358-4.944.37.256c.679.469,1.468,1.011,2.28,1.565-1.074,1.316-2.874,3.546-3.924,4.922l-.2.267c.133-.436.272-.978.41-1.57.288-1.233.578-2.71.81-3.982C15.854,14.908,15.941,14.41,16.013,13.982Zm-1.782,7.833c.139-.208.382-.538.694-.947,1.052-1.378,2.86-3.618,3.932-4.932.573.392,1.133.793,1.666,1.174l.005,0c.934.668,1.786,1.278,2.465,1.665a3.891,3.891,0,0,0,.9.4.673.673,0,0,0,.648-.09.223.223,0,0,0,.045-.061.544.544,0,0,0,.028-.065,1.75,1.75,0,0,0,.05-.177c.033-.141.069-.332.107-.567.076-.469.161-1.118.252-1.883C25.2,14.8,25.4,12.8,25.59,10.8s.362-4,.488-5.506c.063-.754.113-1.387.147-1.838.017-.225.03-.406.038-.533,0-.064.007-.115.009-.151,0-.018,0-.034,0-.046a.278.278,0,0,0,0-.038l0-.021-.009-.018a.178.178,0,0,0-.1-.084.311.311,0,0,0-.1-.018,1.048,1.048,0,0,0-.244.033,6.262,6.262,0,0,0-.766.25c-.636.242-1.519.63-2.565,1.117-2.094.975-4.849,2.352-7.6,3.764s-5.49,2.86-7.557,3.977c-1.034.559-1.9,1.035-2.514,1.383-.307.174-.552.316-.724.421-.086.052-.155.1-.2.13-.025.017-.046.033-.063.046l-.025.022a.168.168,0,0,0-.028.036.143.143,0,0,0-.018.091.148.148,0,0,0,.036.077.248.248,0,0,0,.094.061,1.243,1.243,0,0,0,.249.06c.207.034.509.061.873.083.729.044,1.719.069,2.714.083s2,.016,2.748.015l.91,0,.248,0c.211,1.131.518,2.645.847,4.041.206.874.421,1.7.627,2.363a6.82,6.82,0,0,0,.457,1.179.787.787,0,0,0,.236.288.238.238,0,0,0,.171.036.255.255,0,0,0,.149-.1,1.062,1.062,0,0,0,.115-.186Zm-3.69-4.988a.117.117,0,0,1,0,.166l-2.169,2.1a.117.117,0,1,1-.163-.169l2.169-2.1A.117.117,0,0,1,10.542,16.827Zm10.265,2.919a.117.117,0,0,1,.049.159L18.062,25.2a.117.117,0,1,1-.208-.11l2.794-5.295a.117.117,0,0,1,.159-.049Zm-10.273.015a.117.117,0,0,1,.013.166l-.252.294c-.776.908-2.757,3.227-3.649,4.194a.117.117,0,1,1-.173-.159c.888-.963,2.864-3.277,3.641-4.186l.253-.3a.117.117,0,0,1,.166-.013Zm6.3,1.122a.117.117,0,0,1,.06.155c-.018.04-.069.132-.142.257s-.176.3-.3.506l-.51.852-.441.736c-.748,1.249-1.665,2.79-2.4,4.094a.117.117,0,0,1-.2-.115c.736-1.307,1.654-2.85,2.4-4.1l.442-.737.51-.851c.123-.206.224-.376.3-.5s.119-.208.13-.234a.117.117,0,0,1,.155-.06Z" fill-rule="evenodd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/transfer/SenderCard.tsx
var import_react26 = require("react");
var import_image11 = __toESM(require("next/image"));

// src/assets/icons/home/dollar.svg
var dollar_default = 'data:image/svg+xml,<svg id="_15x15_photo_back" data-name="15x15 photo back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="20" height="20" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_860" data-name="Mask Group 860" clip-path="url(%23clip-path)">%0A    <g id="dollar-2" transform="translate(4.281 0)">%0A      <g id="Group_15064" data-name="Group 15064">%0A        <path id="Path_23751" data-name="Path 23751" d="M10.884,8.75V4.306A5.925,5.925,0,0,1,13.5,5.443a.935.935,0,0,0,.518.164A1.085,1.085,0,0,0,15.1,4.534a.964.964,0,0,0-.278-.682,6.662,6.662,0,0,0-3.952-1.591V.771A.77.77,0,0,0,10.1,0h-.027A.783.783,0,0,0,9.28.771V2.211C6.44,2.413,4.508,4.168,4.508,6.5c0,2.866,2.437,3.661,4.772,4.292v5.05a6.553,6.553,0,0,1-3.346-1.477,1.051,1.051,0,0,0-.631-.227,1.1,1.1,0,0,0-1.023,1.111.964.964,0,0,0,.278.682A7.435,7.435,0,0,0,9.293,17.84v1.389c0,.009,0,.018,0,.027a.781.781,0,0,0,.819.744.77.77,0,0,0,.77-.77V17.815c3.447-.227,4.835-2.323,4.835-4.545C15.719,10.291,13.219,9.382,10.884,8.75Zm-1.591-.4c-1.376-.4-2.449-.821-2.449-1.995s.972-2.02,2.449-2.134Zm1.591,7.524v-4.6c1.427.4,2.538.947,2.525,2.272C13.409,14.507,12.752,15.643,10.884,15.871Z" transform="translate(-4.281 0)" fill="%23fff"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/refresh.svg
var refresh_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="20" height="20" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_194" data-name="Mask Group 194" clip-path="url(%23clip-path)">%0A    <g id="dollar" transform="translate(0.398 0.042)">%0A      <g id="Group_7904" data-name="Group 7904">%0A        <g id="Group_7903" data-name="Group 7903">%0A          <path id="Path_19173" data-name="Path 19173" d="M18.937,7.173a.425.425,0,0,0-.425.425c0,.309-.016.614-.046.913s-.077.6-.136.887a8.513,8.513,0,0,1-.219.856c-.088.279-.188.554-.3.82s-.238.527-.377.782-.286.5-.447.737-.333.467-.513.687-.374.432-.577.634-.414.395-.634.577-.449.354-.688.514-.484.31-.736.447-.514.263-.781.375-.542.213-.819.3-.566.16-.857.219-.587.1-.885.136a9.367,9.367,0,0,1-1.827,0c-.3-.031-.6-.077-.887-.136a8.513,8.513,0,0,1-.856-.219c-.279-.088-.554-.188-.82-.3s-.528-.239-.781-.375-.5-.287-.737-.449-.467-.333-.687-.513-.432-.374-.634-.577-.395-.414-.577-.634-.353-.449-.513-.687c-.069-.1-.128-.21-.191-.315H4.479a.425.425,0,0,0,0-.85h-3.4a.425.425,0,0,0-.425.425v3.4a.425.425,0,1,0,.85,0V13.108c.168.246.344.484.533.712s.409.474.63.694.452.431.694.631.492.387.753.562.529.339.807.491.562.287.856.412.591.233.9.329.619.175.937.241a9.807,9.807,0,0,0,.972.148,9.692,9.692,0,0,0,1,.052c.337,0,.67-.018,1-.051s.652-.083.97-.148.63-.146.939-.241.606-.206.9-.33.578-.261.856-.412.546-.314.805-.489.512-.364.753-.564.474-.409.694-.63.431-.452.631-.694.387-.492.562-.753.339-.53.489-.806a9.46,9.46,0,0,0,.413-.856q.185-.438.329-.9t.241-.937a9.807,9.807,0,0,0,.148-.972c.032-.328.05-.662.05-1A.425.425,0,0,0,18.937,7.173Z" transform="translate(0.198 2.18)" fill="%23fcfcfc"/>%0A          <path id="Path_19174" data-name="Path 19174" d="M.9,8.867c.031-.3.077-.6.136-.887a8.514,8.514,0,0,1,.219-.856c.087-.279.187-.554.3-.82s.239-.528.376-.781.287-.5.449-.737.333-.467.512-.687.374-.432.577-.634.414-.395.634-.577.45-.354.688-.514.484-.31.736-.447.515-.263.781-.376.542-.213.819-.3.566-.16.857-.219.587-.1.885-.136a9.367,9.367,0,0,1,1.827,0c.3.031.6.077.887.136a8.514,8.514,0,0,1,.856.219c.279.088.554.188.82.3s.528.239.781.375.5.287.737.449.467.333.687.513.432.374.634.577.395.414.577.634.354.449.514.688c.069.1.127.21.191.315H14.883a.425.425,0,1,0,0,.85h3.4a.425.425,0,0,0,.425-.425v-3.4a.425.425,0,1,0-.85,0V4.27c-.168-.246-.344-.484-.533-.712s-.409-.474-.63-.694-.452-.432-.695-.632-.492-.387-.753-.562-.529-.339-.807-.491-.562-.287-.856-.412-.591-.233-.9-.329S12.068.264,11.75.2A9.806,9.806,0,0,0,10.778.05a10.077,10.077,0,0,0-2,0c-.328.033-.652.083-.97.148s-.628.145-.936.241-.606.206-.9.329-.578.261-.856.412-.545.315-.805.49-.511.364-.753.564-.474.409-.695.63-.431.452-.631.695-.387.492-.562.752-.34.529-.491.808-.287.562-.412.855-.233.592-.328.9S.265,7.491.2,7.809a9.806,9.806,0,0,0-.148.972,9.922,9.922,0,0,0-.051,1,.425.425,0,1,0,.85,0C.85,9.471.867,9.165.9,8.867Z" transform="translate(0 -0.001)" fill="%23fcfcfc"/>%0A        </g>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/layout/header/eye-white.svg
var eye_white_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11">%0A  <g id="Group_15329" data-name="Group 15329" transform="translate(0.204)">%0A    <path id="hidden" d="M7.268,6.475A1.911,1.911,0,0,0,5.581,3.669a.939.939,0,0,0-.175.011l-.7-1.048a5.616,5.616,0,0,1,.874-.066,6.479,6.479,0,0,1,5.143,2.866c.011.022.022.044.033.071a.273.273,0,0,1,0,.153.207.207,0,0,1-.033.071c-.005.005-.005.011-.011.016A7.036,7.036,0,0,1,8.246,7.938ZM.406,5.5c.011-.027.022-.049.033-.071A6.866,6.866,0,0,1,3.507,2.959L2.078.817a.273.273,0,0,1,.454-.3l6.552,9.827a.273.273,0,0,1-.076.378.27.27,0,0,1-.151.046.273.273,0,0,1-.227-.122L7.119,8.379a5.669,5.669,0,0,1-1.538.215A6.474,6.474,0,0,1,.449,5.743C.444,5.738.444,5.732.438,5.727a.207.207,0,0,1-.033-.071.273.273,0,0,1,0-.153Zm3.451.9A1.911,1.911,0,0,0,6.4,7.3l-.31-.464A1.358,1.358,0,0,1,4.615,4.622L4.308,4.16A1.9,1.9,0,0,0,3.856,6.4Zm3.09-.821A1.361,1.361,0,0,0,5.772,4.231L6.9,5.923A1.413,1.413,0,0,0,6.946,5.58Z" transform="translate(-0.049 -0.114)" fill="%23d3d3d3"/>%0A    <rect id="Rectangle_4561" data-name="Rectangle 4561" width="11" height="11" transform="translate(-0.204 0)" fill="none"/>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/transfer/SenderCard.tsx
var import_lucide_react = require("lucide-react");
var import_jsx_runtime33 = require("react/jsx-runtime");
var SenderCard = () => {
  const { account, balances, activeAssetSymbol, balanceHidden, setBalanceHidden, setBalances } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const { t, rtl, language } = useTranslation();
  const [isRefreshing, setIsRefreshing] = (0, import_react26.useState)(false);
  const balance = activeAssetSymbol ? balances[activeAssetSymbol] : void 0;
  const currencySymbol = balance?.asset?.symbol || "USD";
  const currencyName = balance?.asset?.name || "American Dollars";
  const available = balance?.available ?? 0;
  const accountNumber = account?.number || "";
  const accountType = account?.type || "Main";
  const accountName = account?.name || "";
  const handleRefresh = async () => {
    console.log(account, "account info before refresh");
    console.log("Refreshing balances:", balances);
    if (isRefreshing) return;
    console.log("Initiating balance refresh for asset:", balance);
    if (balance?.assetId) {
      setIsRefreshing(true);
      try {
        const response = await actions.transactions.GetAccountBalance({
          assetId: balance?.assetId
        });
        console.log("Balance refresh response:", response);
        const updated = mapWalletBalances(response);
        if (Object.keys(updated).length > 0) {
          setBalances({ ...balances, ...updated });
        }
        setIsRefreshing(false);
      } catch {
        toast.error(t.transfer.sender.refreshBalance);
      } finally {
        setIsRefreshing(false);
      }
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "bg-[#3C3C3C] rounded-2xl h-30 p-4 max-w-92.5 relative", children: [
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
      "button",
      {
        disabled: isRefreshing,
        onClick: handleRefresh,
        className: `absolute cursor-pointer disabled:cursor-not-allowed top-4 z-50 ${rtl ? "left-4" : "right-4"} text-white hover:text-white transition-colors`,
        "aria-label": t.common.accessibility.refreshBalance,
        children: /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(import_image11.default, { src: refresh_default, alt: "Refresh", width: 20, height: 20 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(import_image11.default, { src: dollar_default, alt: "Currency", width: 20, height: 20 }),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("p", { className: "text-white text-[11px] font-light font-quicksand mt-1", children: t.transfer.sender.label }),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("p", { className: "text-[#FCFCFC] font-light font-quicksand text-[13px] mt-0.5", children: [
      accountType,
      " | ",
      accountNumber,
      " | ",
      accountName
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "flex items-end gap-2 mt-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("span", { className: "text-white text-[25px] font-medium font-quicksand leading-none", children: isRefreshing ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(import_lucide_react.Loader2, { className: "w-12 h-6.5 text-white animate-spin" }) : balanceHidden ? "\u2022\u2022\u2022\u2022" : available.toLocaleString(language) }),
      /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "flex items-center gap-1.5 pb-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("span", { className: "text-white font-light font-quicksand text-[9px]", children: [
          currencySymbol,
          " | ",
          currencyName
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
          "button",
          {
            onClick: () => setBalanceHidden(!balanceHidden),
            className: "text-white hover:text-white transition-colors",
            "aria-label": balanceHidden ? t.common.accessibility.showBalance : t.common.accessibility.hideBalance,
            children: balanceHidden ? /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(import_image11.default, { src: eye_white_default, alt: "Show", width: 14, height: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(import_image11.default, { src: eye_white_default, alt: "Hide", width: 14, height: 14 })
          }
        )
      ] })
    ] })
  ] });
};
var SenderCard_default = SenderCard;

// src/components/QR/send/payment-request/PaymentRequestReview.tsx
var import_jsx_runtime34 = require("react/jsx-runtime");
var BLOCKED_STATUSES = ["EXPIRED", "FULFILLED", "CANCELLED"];
var PaymentRequestReview = ({
  parsedQR,
  requestCode: directRequestCode,
  onDone,
  onBack
}) => {
  const { activeAssetSymbol, balances, account, refreshTransactions } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isRequesterMode = !!directRequestCode;
  const requesterAccount = parsedQR?.requesterAccount || "";
  const encryptedRequestCode = parsedQR?.encryptedRequestCode || "";
  const cryptoAccount = isRequesterMode ? account?.number || "" : requesterAccount;
  const api = usePaymentRequestAPI();
  const { encrypt, decrypt } = usePaymentRequestEncryption(cryptoAccount);
  const apiRef = (0, import_react27.useRef)(api);
  apiRef.current = api;
  const encryptRef = (0, import_react27.useRef)(encrypt);
  encryptRef.current = encrypt;
  const decryptRef = (0, import_react27.useRef)(decrypt);
  decryptRef.current = decrypt;
  const toastRef = (0, import_react27.useRef)(toast);
  toastRef.current = toast;
  const onBackRef = (0, import_react27.useRef)(onBack);
  onBackRef.current = onBack;
  const [loading, setLoading] = (0, import_react27.useState)(true);
  const [fetchError, setFetchError] = (0, import_react27.useState)(null);
  const [data, setData] = (0, import_react27.useState)(null);
  const [requestId, setRequestId] = (0, import_react27.useState)("");
  const [qrValue, setQrValue] = (0, import_react27.useState)(null);
  const captureRef = (0, import_react27.useRef)(null);
  const [showPreview, setShowPreview] = (0, import_react27.useState)(false);
  const [isExpired, setIsExpired] = (0, import_react27.useState)(false);
  const [isSending, setIsSending] = (0, import_react27.useState)(false);
  const [isCancelling, setIsCancelling] = (0, import_react27.useState)(false);
  const [receiptData, setReceiptData] = (0, import_react27.useState)(null);
  const [sendError, setSendError] = (0, import_react27.useState)(null);
  const [showCancelDialog, setShowCancelDialog] = (0, import_react27.useState)(false);
  const [showCancelInput, setShowCancelInput] = (0, import_react27.useState)(false);
  const [cancelReason, setCancelReason] = (0, import_react27.useState)("");
  const senderBalance = activeAssetSymbol ? balances[activeAssetSymbol] : void 0;
  const senderAccountNumber = senderBalance?.accountNumber || account?.number || "";
  (0, import_react27.useEffect)(() => {
    if (!isRequesterMode || !data) return;
    const isCancelledOrExpired = data.status === "CANCELLED" || data.status === "EXPIRED" || isExpired;
    if (!isCancelledOrExpired) return;
    const bottomSheet = document.getElementById("bottom-sheet");
    if (!bottomSheet) return;
    const previousBg = bottomSheet.style.backgroundColor;
    bottomSheet.style.backgroundColor = "#FFF5F5";
    return () => {
      bottomSheet.style.backgroundColor = previousBg;
    };
  }, [isRequesterMode, data, isExpired]);
  const fetchData = (0, import_react27.useCallback)(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let code;
      if (directRequestCode) {
        code = directRequestCode;
      } else if (encryptedRequestCode && requesterAccount) {
        try {
          code = await decryptRef.current(encryptedRequestCode);
        } catch {
          toastRef.current.error("Could not read QR code. Please try again.");
          onBackRef.current();
          return;
        }
      } else {
        setFetchError("Invalid payment request data");
        setLoading(false);
        return;
      }
      const result = await apiRef.current.lookupPaymentRequest(code);
      if ("error" in result) {
        setFetchError(result.error);
        toastRef.current.error(result.error);
        setLoading(false);
        return;
      }
      setData(result);
      setRequestId(result.id);
      if (!result.isPermanent) {
        const expiryTime = new Date(result.expiresAt).getTime();
        if (Date.now() >= expiryTime) {
          setIsExpired(true);
        }
      }
      if (directRequestCode && result.requestCode) {
        try {
          const qrString = await encryptRef.current(result.requestCode);
          setQrValue(qrString);
        } catch {
        }
      }
      setLoading(false);
    } catch {
      setFetchError("Failed to load payment request");
      toastRef.current.error("Failed to load payment request");
      setLoading(false);
    }
  }, [encryptedRequestCode, requesterAccount, directRequestCode]);
  (0, import_react27.useEffect)(() => {
    void fetchData();
  }, [fetchData]);
  const handleExpired = (0, import_react27.useCallback)(async () => {
    try {
      let code = null;
      if (directRequestCode) {
        code = directRequestCode;
      } else if (encryptedRequestCode && requesterAccount) {
        code = await decryptRef.current(encryptedRequestCode);
      }
      if (code) {
        const result = await apiRef.current.lookupPaymentRequest(code);
        if (!("error" in result)) {
          setData(result);
        }
      }
    } catch {
    }
    setIsExpired(true);
  }, [directRequestCode, encryptedRequestCode, requesterAccount]);
  const handleSend = async () => {
    if (!data || !requestId || isSending) return;
    if (!data.isPermanent) {
      const expiryTime = new Date(data.expiresAt).getTime();
      if (Date.now() >= expiryTime) {
        setIsExpired(true);
        return;
      }
    }
    setIsSending(true);
    setSendError(null);
    const idempotencyKey = `fulfill-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const result = await apiRef.current.fulfillPaymentRequest({
      id: requestId,
      accountNumber: senderAccountNumber,
      idempotencyKey
    });
    if ("error" in result) {
      setSendError(result.error);
      toastRef.current.error(result.error);
      setIsSending(false);
      return;
    }
    refreshTransactions(actions);
    setReceiptData({
      referenceCode: data.requestCode || requestId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "COMPLETED",
      senderAccountNumber,
      senderMaskedName: account?.name || "",
      recipientAccountNumber: data.requesterAccountNumber,
      recipientMaskedName: data.requesterAccountName,
      amount: String(data.amount),
      currency: data.assetSymbol,
      purposeLabel: data.purpose?.name || "",
      inputMethod: isRequesterMode ? "MANUAL" : "QR"
    });
    setIsSending(false);
  };
  const handleCancelConfirm = async (reason) => {
    if (!requestId || isCancelling) return;
    const finalReason = reason?.trim() || "no reason";
    setIsCancelling(true);
    setShowCancelDialog(false);
    const result = await apiRef.current.cancelPaymentRequest({
      id: requestId,
      reason: finalReason
    });
    if ("error" in result) {
      toastRef.current.error(result.error);
      setIsCancelling(false);
      return;
    }
    setData((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    setIsCancelling(false);
    toastRef.current.success("Payment request cancelled");
    refreshTransactions(actions);
  };
  const handleCancelInline = async () => {
    if (!requestId || isCancelling || !cancelReason.trim()) return;
    setIsCancelling(true);
    const result = await apiRef.current.cancelPaymentRequest({
      id: requestId,
      reason: cancelReason.trim()
    });
    if ("error" in result) {
      toastRef.current.error(result.error);
      setIsCancelling(false);
      return;
    }
    setData((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    setShowCancelInput(false);
    setCancelReason("");
    setIsCancelling(false);
    toastRef.current.success("Payment request cancelled");
    refreshTransactions(actions);
  };
  const captureCanvas = () => {
    return new Promise((resolve) => {
      setShowPreview(true);
      requestAnimationFrame(async () => {
        if (!captureRef.current) {
          setShowPreview(false);
          resolve(null);
          return;
        }
        try {
          const html2canvas2 = (await import("html2canvas")).default;
          const canvas = await html2canvas2(captureRef.current, {
            backgroundColor: "#FFFFFF",
            scale: 2
          });
          resolve(canvas);
        } catch {
          resolve(null);
        } finally {
          setShowPreview(false);
        }
      });
    });
  };
  const handleCopy = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      toastRef.current.success(t.home.qr.messages.qrCopied);
    } catch {
      toastRef.current.error(t.home.qr.messages.qrDownloadFailed);
    }
  };
  const handleDownload = async () => {
    const canvas = await captureCanvas();
    if (!canvas) {
      toastRef.current.error(t.home.qr.messages.qrDownloadFailed);
      return;
    }
    const link = document.createElement("a");
    link.download = `payment-request-${data?.requestCode || requestId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toastRef.current.success(t.home.qr.messages.qrDownloadSuccess);
  };
  const handleShareQR = async () => {
    const canvas = await captureCanvas();
    if (!canvas) {
      toastRef.current.error(t.home.qr.messages.qrDownloadFailed);
      return;
    }
    const result = await shareQRImage(
      canvas,
      `Payment Request \u2014 ${data?.requesterAccountNumber || ""}`,
      `Amount: ${data?.amount} ${data?.assetSymbol}`
    );
    if (result === "shared") {
      toastRef.current.success(t.home.qr.messages.qrShareSuccess);
    } else if (result === "copied") {
      toastRef.current.success(t.home.qr.messages.qrCopied);
    }
  };
  const isBlocked = isExpired || (data ? BLOCKED_STATUSES.includes(data.status) : false);
  const canSend = !isBlocked && !isSending && !!requestId;
  const isRequesterDead = isRequesterMode && (data?.status === "EXPIRED" || data?.status === "CANCELLED");
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "w-full h-full flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex flex-col items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "w-8 h-8 border-2 border-[#388CFF] border-t-transparent rounded-full animate-spin" }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("p", { className: "text-[13px] text-[#8D8D8D]", children: [
        t.transfer.deposit.title,
        "\u2026"
      ] })
    ] }) });
  }
  if (fetchError || !data) {
    return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "w-full h-full flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex flex-col items-center gap-3 px-6 text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "text-[13px] text-[#FF4D4D]", children: fetchError || "Failed to load request" }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        "button",
        {
          onClick: () => void fetchData(),
          className: "text-[13px] text-[#388CFF] font-medium underline",
          children: "Retry"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("button", { onClick: onBack, className: "text-[13px] text-[#8D8D8D] mt-1", children: "Go back" })
    ] }) });
  }
  if (receiptData) {
    return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SuccessReceipt_default, { data: receiptData, onClose: onDone });
  }
  if (isRequesterMode && data.status === "FULFILLED") {
    const fulfilledReceipt = {
      referenceCode: data.requestCode || requestId,
      createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      status: "COMPLETED",
      senderAccountNumber: "",
      senderMaskedName: "",
      recipientAccountNumber: data.requesterAccountNumber,
      recipientMaskedName: data.requesterAccountName,
      amount: String(data.amount),
      currency: data.assetSymbol,
      purposeLabel: data.purpose?.name || "",
      inputMethod: "MANUAL"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SuccessReceipt_default, { data: fulfilledReceipt, onClose: onDone });
  }
  if (isRequesterMode) {
    const isActive = data.status === "ACTIVE" && !isExpired;
    return /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex flex-col items-center w-full h-full relative overflow-hidden", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: `flex-1 w-full flex flex-col ${isRequesterMode ? " pb-0" : " pb-24"} pt-2 overflow-y-auto max-w-100`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex flex-col items-center w-full", children: [
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "relative w-25 h-7", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            import_image12.default,
            {
              src: title_default,
              alt: "Title Icon",
              fill: true,
              className: "object-contain"
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "w-62.5 mt-3 shrink-0 h-62.5 flex flex-col items-center justify-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { ref: captureRef, className: isRequesterDead ? "opacity-10" : "", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
              CustomQRCode,
              {
                errorCorrectionLevel: "L",
                value: qrValue || "",
                size: 224
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "font-quicksand text-4 font-light text-text text-center pt-1", children: isRequesterDead ? "Expired Code ( Time Expired )" : data.requesterAccountNumber })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "px-2 mt-2 space-y-0 bg-transparent", children: [
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            Input_default,
            {
              containerClassName: "bg-transparent w-full",
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              readOnly: true,
              label: t.home.deposit.accountName,
              value: data.requesterAccountName
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              readOnly: true,
              containerClassName: "bg-transparent w-full",
              label: t.home.deposit.accountNumber,
              value: `${data.requesterAccountNumber}  ${data.assetSymbol}`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex gap-2 w-full", children: [
            /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                disabled: true,
                label: t.home.qr.enterAmount,
                value: String(data.amount),
                suffix: data.assetSymbol,
                containerClassName: "bg-transparent w-1/2"
              }
            ),
            data.reference && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                disabled: true,
                label: t.home.qr.enterReference,
                value: data.reference,
                containerClassName: "bg-transparent w-1/2"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex gap-2 w-full", children: [
            data.purpose?.name && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                disabled: true,
                label: t.home.qr.selectPurpose,
                value: data.purpose.name,
                className: "text-[11px]!",
                containerClassName: "bg-transparent w-1/2"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                disabled: true,
                label: t.home.qr.type,
                value: t.home.qr.depositRequest,
                className: "text-[11px]!",
                containerClassName: "bg-transparent w-1/2"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex gap-2 w-full", children: data.note && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: "Note",
              value: data.note,
              className: "text-[11px]!",
              containerClassName: "bg-transparent "
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex gap-2 w-full px-2", children: data.isPermanent ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: t.home.qr.validUntil,
              value: t.home.qr.validity.always,
              className: "text-[11px]!",
              containerClassName: "bg-transparent w-1/2"
            }
          ) : data.expiresAt ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            CountdownTimer_default,
            {
              expiryTimestamp: data.expiresAt,
              onExpired: handleExpired
            }
          ) : null }),
          isRequesterDead && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex w-full flex-col items-center py-4", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            "button",
            {
              disabled: true,
              className: "text-center flex items-center justify-center h-7.5 w-89 py-3 rounded-xl text-[#FFFFFF] bg-[#FF5F60] text-[11px] font-medium font-quicksand cursor-not-allowed",
              children: data.status === "CANCELLED" ? t.transfer.deposit.cancelled : t.transfer.deposit.expiredButton
            }
          ) })
        ] })
      ] }),
      isActive && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex items-center justify-center gap-13 px-6 py-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          ActionButton,
          {
            icon: copy_default,
            label: t.home.qr.copy,
            onClick: () => void handleCopy()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          ActionButton,
          {
            icon: download_default,
            label: t.home.qr.download,
            onClick: () => void handleDownload()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          ActionButton,
          {
            icon: share_default,
            label: t.home.qr.share,
            onClick: () => void handleShareQR()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          ActionButton,
          {
            icon: cancel_default,
            label: t.home.qr.cancel,
            onClick: () => setShowCancelDialog(true)
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        ConfirmDialog_default,
        {
          open: showCancelDialog,
          onCancel: () => setShowCancelDialog(false),
          onConfirm: (reason) => void handleCancelConfirm(reason),
          title: t.home.qr.cancel,
          message: "Are you sure you want to cancel this payment request?",
          confirmLabel: t.common.cancel,
          cancelLabel: "Keep",
          inputConfig: {
            placeholder: "Reason for cancellation",
            defaultValue: "no reason"
          }
        }
      )
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "w-full h-full overflow-y-auto relative flex flex-col", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "max-w-93.75 mx-auto relative w-full flex flex-col flex-1", children: [
    /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex flex-col items-center mb-4 pt-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "mb-3", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(import_image12.default, { src: sendT_default, alt: "Transfer", width: 40, height: 40 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("h2", { className: "font-quicksand text-[13px] font-medium tracking-widest text-[#1D1D1D] uppercase", children: t.transfer.deposit.title })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SenderCard_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "text-[13px] text-[#1D1D1D] font-medium text-center mt-4 mb-2", children: t.transfer.sendTo }),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "overflow-auto pb-40 px-2 space-y-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        DetailRow_default,
        {
          label: t.transfer.recipient.recipientAccountNumber,
          value: `${data.requesterAccountNumber}  ${data.requesterAccountName}`,
          icon: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            import_image12.default,
            {
              src: qrinputmethod_default,
              alt: "QR",
              width: 14,
              height: 14,
              className: "object-contain"
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        DetailRow_default,
        {
          label: t.transfer.deposit.amountToBeSent,
          value: `${data.amount} ${data.assetSymbol}`,
          bold: true
        }
      ),
      data.purpose?.name && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        DetailRow_default,
        {
          label: t.transfer.deposit.purposeOfRequest,
          value: data.purpose.name
        }
      ),
      data.reference && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(DetailRow_default, { label: t.transfer.deposit.referenceId, value: data.reference }),
      data.note && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(DetailRow_default, { label: "Note", value: data.note }),
      !data.isPermanent && data.expiresAt && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        CountdownTimer_default,
        {
          expiryTimestamp: data.expiresAt,
          onExpired: handleExpired
        }
      ),
      sendError && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "bg-[#FFF0F0] border border-[#FF4D4D]/20 rounded-lg p-3 mt-2", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "text-[12px] text-[#FF4D4D]", children: sendError }) }),
      showCancelInput && /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "mt-3 flex flex-col gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          "input",
          {
            type: "text",
            value: cancelReason,
            onChange: (e) => setCancelReason(e.target.value),
            placeholder: "Reason for cancellation",
            className: "w-full text-[13px] text-[#1D1D1D] bg-transparent border-b border-[#E0E0E0] focus:border-[#388CFF] focus:outline-0 pb-1 transition-colors"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            "button",
            {
              onClick: () => void handleCancelInline(),
              disabled: !cancelReason.trim() || isCancelling,
              className: "flex-1 py-2 rounded-lg bg-[#FF4D4D]/10 text-[#FF4D4D] text-[12px] font-medium disabled:opacity-50",
              children: isCancelling ? "Cancelling\u2026" : "Confirm Cancel"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
            "button",
            {
              onClick: () => {
                setShowCancelInput(false);
                setCancelReason("");
              },
              className: "flex-1 py-2 rounded-lg bg-[#F5F5F5] text-[#8D8D8D] text-[12px] font-medium",
              children: "Keep"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex-1" }),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "absolute bottom-0 w-full bg-white", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex flex-col gap-2 px-4", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
      SendButton_default,
      {
        isExpired: isExpired || data.status === "EXPIRED",
        isSending,
        isDisabled: !canSend,
        onSend: () => void handleSend()
      }
    ) }) })
  ] }) });
};
var PaymentRequestReview_default = PaymentRequestReview;

// src/components/transactions/items/TransactionDetails.tsx
var import_image13 = __toESM(require("next/image"));
var import_jsx_runtime35 = require("react/jsx-runtime");
var TransactionDetails = ({ ledger, onClose }) => {
  const { t, language } = useTranslation();
  const isOutgoing = ledger.direction === "OUT";
  const counterparty = isOutgoing ? ledger.receiverAccount : ledger.senderAccount;
  const dateTime = formatDateTime(ledger.createdAt, language);
  const getStatusColor = () => {
    switch (ledger.status) {
      case "COMPLETED":
        return "bg-[#E8F8F0] text-[#2DB56D]";
      case "FAILED":
        return "bg-[#FFF0F0] text-[#FF4D4D]";
      case "PENDING":
        return "bg-[#FFF8E8] text-[#F5A623]";
      default:
        return "bg-[#F5F5F5] text-[#8D8D8D]";
    }
  };
  const getStatusLabel = () => {
    switch (ledger.status) {
      case "COMPLETED":
        return t.home.transactionStatus.success;
      case "PENDING":
        return t.home.transactionStatus.pending;
      case "FAILED":
        return t.home.transactionStatus.failed;
      default:
        return ledger.status;
    }
  };
  const getTypeLabel = () => {
    switch (ledger.ledgerType) {
      case "ACCOUNT_TRANSFER":
        return isOutgoing ? t.home.transactions.transferSend : t.home.transactions.transferReceive;
      case "PAYMENT_REQUEST":
        return t.home.qr.depositRequest;
      case "DEPOSIT":
        return "Deposit";
      case "WITHDRAWAL":
        return "Withdrawal";
      default:
        return ledger.title || t.home.transactions.defaultTitle;
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "flex flex-col items-center w-full h-full relative overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "flex-1 w-full flex flex-col pt-2 overflow-y-auto pb-20", children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "flex flex-col items-center w-full mb-4", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "relative w-25 h-7", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(import_image13.default, { src: title_default, alt: "Title Icon", fill: true, className: "object-contain" }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
        "div",
        {
          className: `mx-4 mb-4 py-2 px-3 rounded-lg text-center text-[12px] font-medium ${getStatusColor()}`,
          children: getStatusLabel()
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "px-2 space-y-0", children: [
        ledger.senderAccount && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          Input_default,
          {
            hideRequired: true,
            reviewMode: true,
            disabled: true,
            readOnly: true,
            containerClassName: "w-full",
            label: t.transfer.receipt.senderAccountNumber,
            value: `${ledger.senderAccount.accountNumber}  ${ledger.senderAccount.name}`
          }
        ),
        counterparty && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          Input_default,
          {
            hideRequired: true,
            reviewMode: true,
            disabled: true,
            readOnly: true,
            containerClassName: "w-full",
            label: isOutgoing ? t.transfer.receipt.recipientAccountNumber : t.transfer.receipt.senderAccountNumber,
            value: `${counterparty.accountNumber}  ${counterparty.name}`
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "flex gap-2 w-full", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: t.transfer.receipt.amountSent,
              value: `${ledger.amount}`,
              suffix: ledger.assetSymbol,
              containerClassName: "w-1/2"
            }
          ),
          ledger.referenceId && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: t.home.qr.enterReference,
              value: ledger.referenceId,
              containerClassName: "w-1/2"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "flex gap-2 w-full", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: t.home.qr.type,
              value: getTypeLabel(),
              className: "text-[11px]!",
              containerClassName: "w-1/2"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: t.transfer.receipt.dateTime,
              value: dateTime,
              className: "text-[11px]!",
              containerClassName: "w-1/2"
            }
          )
        ] }),
        ledger.metadata?.purposeName && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          Input_default,
          {
            hideRequired: true,
            reviewMode: true,
            disabled: true,
            label: t.home.qr.selectPurpose,
            value: ledger.metadata.purposeName,
            className: "text-[11px]!",
            containerClassName: "w-1/2"
          }
        ),
        (ledger.feeAmount > 0 || ledger.taxAmount > 0) && /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "flex gap-2 w-full", children: [
          ledger.feeAmount > 0 && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: "Fee",
              value: `${ledger.feeAmount} ${ledger.assetSymbol}`,
              className: "text-[11px]!",
              containerClassName: "w-1/2"
            }
          ),
          ledger.taxAmount > 0 && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              disabled: true,
              label: "Tax",
              value: `${ledger.taxAmount} ${ledger.assetSymbol}`,
              className: "text-[11px]!",
              containerClassName: "w-1/2"
            }
          )
        ] }),
        (ledger.note || ledger.metadata?.note) && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          Input_default,
          {
            hideRequired: true,
            reviewMode: true,
            disabled: true,
            label: "Note",
            value: ledger.note || ledger.metadata?.note || "",
            className: "text-[11px]!"
          }
        ),
        ledger.description && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          Input_default,
          {
            hideRequired: true,
            reviewMode: true,
            disabled: true,
            label: "Description",
            value: ledger.description,
            className: "text-[11px]!"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "flex items-center justify-center py-4 px-4", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(
      "button",
      {
        onClick: onClose,
        className: "flex flex-col cursor-pointer items-center gap-1 text-[#1D1D1D]",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(import_image13.default, { src: done_default, alt: "Done", width: 24, height: 24 }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("span", { className: "text-[11px] font-medium", children: t.transfer.receipt.done })
        ]
      }
    ) }) })
  ] });
};
var TransactionDetails_default = TransactionDetails;

// src/components/ui/BottomSheet.tsx
var import_react28 = require("react");
var import_framer_motion4 = require("framer-motion");
var import_jsx_runtime36 = require("react/jsx-runtime");
var iosEasing = [0.12, 1, 0.99, 1];
var iosEasingReverse = [0.64, 0, 0.78, 0];
var SHEET_ANIMATION_DURATION = 0.6;
var BACKDROP_ANIMATION_DURATION = 0.3;
var BACKGROUND_SCALE_DURATION = 0.18;
var SHEET_HEIGHT = "97dvh";
var SHEET_MAX_HEIGHT = "97dvh";
var SHEET_BORDER_RADIUS = "24px";
var SHEET_BORDER_COLOR = "#707070";
var SHEET_SHADOW = "0 -4px 32px rgba(0, 0, 0, 0.15)";
var BACKDROP_COLOR2 = "rgba(0, 0, 0, 0.3)";
var BACKDROP_BLUR = "1px";
var DRAG_CLOSE_THRESHOLD = 0.2;
var DRAG_ELASTICITY = 0.7;
var BACKGROUND_SCALE = 0.96;
var BACKGROUND_BORDER_RADIUS = "16px";
var HANDLE_WIDTH = "40px";
var HANDLE_HEIGHT = "4px";
var HANDLE_COLOR = "rgba(156, 163, 175, 0.6)";
var HANDLE_HOVER_COLOR = "rgba(156, 163, 175, 0.8)";
var HANDLE_PADDING = "12px";
var backdropVariants = {
  hidden: {
    opacity: 0,
    backdropFilter: "blur(0px)"
  },
  visible: {
    opacity: 1,
    backdropFilter: `blur(${BACKDROP_BLUR})`,
    transition: {
      duration: BACKDROP_ANIMATION_DURATION,
      ease: iosEasing
    }
  },
  exit: {
    opacity: 1,
    backdropFilter: "blur(0px)",
    transition: {
      duration: SHEET_ANIMATION_DURATION,
      // must be >= sheet exit duration so parent stays in DOM
      ease: iosEasing
    }
  }
};
var BottomSheet = ({
  open,
  onClose,
  children,
  height = SHEET_HEIGHT,
  showDragHandle = true,
  enableDrag = true,
  enableBackdropBlur = true,
  backgroundRef,
  zIndex = 50,
  className = ""
}) => {
  const sheetRef = (0, import_react28.useRef)(null);
  const dragControls = (0, import_framer_motion4.useDragControls)();
  const [sheetHeight, setSheetHeight] = (0, import_react28.useState)(0);
  const [isVisible, setIsVisible] = (0, import_react28.useState)(open);
  (0, import_react28.useEffect)(() => {
    if (open) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [open]);
  (0, import_react28.useEffect)(() => {
    if (sheetRef.current && isVisible) {
      setSheetHeight(sheetRef.current.offsetHeight);
    }
  }, [isVisible]);
  (0, import_react28.useEffect)(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isVisible]);
  (0, import_react28.useEffect)(() => {
    if (backgroundRef?.current) {
      const element = backgroundRef.current;
      const transition = `transform ${BACKGROUND_SCALE_DURATION}s cubic-bezier(${iosEasing.join(", ")}), border-radius ${BACKGROUND_SCALE_DURATION}s cubic-bezier(${iosEasing.join(", ")})`;
      if (isVisible) {
        element.style.transition = transition;
        element.style.transform = `scale(${BACKGROUND_SCALE})`;
        element.style.borderRadius = BACKGROUND_BORDER_RADIUS;
        element.style.overflow = "hidden";
      } else {
        element.style.transition = transition;
        element.style.transform = "scale(1)";
        element.style.borderRadius = "0px";
      }
    }
  }, [isVisible, backgroundRef]);
  (0, import_react28.useEffect)(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isVisible) {
        setIsVisible(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible]);
  const handleBackdropClick = (0, import_react28.useCallback)((e) => {
    if (e.target === e.currentTarget) {
      setIsVisible(false);
    }
  }, []);
  const handleDragEnd = (0, import_react28.useCallback)(
    (_, info) => {
      const threshold = sheetHeight * DRAG_CLOSE_THRESHOLD;
      if (info.offset.y > threshold) {
        setIsVisible(false);
      }
    },
    [sheetHeight]
  );
  const handlePointerDown = (0, import_react28.useCallback)(
    (e) => {
      dragControls.start(e);
    },
    [dragControls]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(import_framer_motion4.AnimatePresence, { mode: "wait", onExitComplete: onClose, children: isVisible && // BACKDROP OVERLAY
  /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
    import_framer_motion4.motion.div,
    {
      className: "fixed inset-0 flex items-end justify-center",
      style: {
        zIndex,
        backgroundColor: BACKDROP_COLOR2,
        ...enableBackdropBlur && {
          WebkitBackdropFilter: `blur(${BACKDROP_BLUR})`
        }
      },
      variants: backdropVariants,
      initial: "hidden",
      animate: "visible",
      exit: "exit",
      onClick: handleBackdropClick,
      children: /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)(
        import_framer_motion4.motion.div,
        {
          ref: sheetRef,
          id: "bottom-sheet",
          className: `w-full bg-background border-t border-x relative will-change-transform ${className}`,
          style: {
            height,
            borderTopLeftRadius: SHEET_BORDER_RADIUS,
            borderTopRightRadius: SHEET_BORDER_RADIUS,
            maxHeight: SHEET_MAX_HEIGHT,
            borderColor: SHEET_BORDER_COLOR,
            boxShadow: SHEET_SHADOW,
            opacity: 1,
            touchAction: "none"
          },
          initial: { y: "100%" },
          animate: {
            y: 0,
            transition: { duration: SHEET_ANIMATION_DURATION, ease: iosEasing }
          },
          exit: {
            y: "100%",
            transition: {
              duration: SHEET_ANIMATION_DURATION,
              ease: iosEasingReverse
            }
          },
          drag: enableDrag ? "y" : false,
          dragControls,
          dragListener: false,
          dragConstraints: { top: 0, bottom: 0 },
          dragElastic: { top: 0, bottom: DRAG_ELASTICITY },
          onDragEnd: handleDragEnd,
          onClick: (e) => e.stopPropagation(),
          children: [
            showDragHandle && /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
              import_framer_motion4.motion.div,
              {
                className: "w-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none",
                style: {
                  touchAction: "none",
                  paddingTop: HANDLE_PADDING,
                  paddingBottom: HANDLE_PADDING
                },
                onPointerDown: handlePointerDown,
                children: /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
                  import_framer_motion4.motion.div,
                  {
                    className: "rounded-full",
                    style: {
                      width: HANDLE_WIDTH,
                      height: HANDLE_HEIGHT,
                      backgroundColor: HANDLE_COLOR
                    },
                    whileHover: {
                      scale: 1.1,
                      backgroundColor: HANDLE_HOVER_COLOR
                    },
                    whileTap: { scale: 0.95 },
                    transition: { duration: 0.3 }
                  }
                )
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
              "div",
              {
                className: "flex-1 overflow-y-auto overscroll-contain ",
                style: {
                  height: showDragHandle ? "calc(100% - 28px)" : "100%"
                },
                children
              }
            )
          ]
        }
      )
    }
  ) });
};
var BottomSheet_default = BottomSheet;

// src/components/home/index.tsx
var import_jsx_runtime37 = require("react/jsx-runtime");
var Home = () => {
  const {
    account,
    balances,
    currencies,
    setBalances,
    setCurrencies,
    activeAssetSymbol,
    setActiveAssetSymbol,
    activeAssetType,
    setActiveAssetType,
    transactions,
    setTransactions
  } = useStore();
  const [showDeposit, setShowDeposit] = (0, import_react29.useState)(false);
  const [activeRequestCode, setActiveRequestCode] = (0, import_react29.useState)(null);
  const [activeTransaction, setActiveTransaction] = (0, import_react29.useState)(null);
  const handlePaymentRequestTap = (0, import_react29.useCallback)((requestCode) => {
    setActiveRequestCode(requestCode);
  }, []);
  const handlePaymentRequestClose = (0, import_react29.useCallback)(() => {
    setActiveRequestCode(null);
  }, []);
  const handleTransactionTap = (0, import_react29.useCallback)((ledger) => {
    setActiveTransaction(ledger);
  }, []);
  const handleTransactionClose = (0, import_react29.useCallback)(() => {
    setActiveTransaction(null);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("div", { className: "flex flex-col items-start justify-start w-full h-full overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "w-full shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(nav_default, { activeAssetSymbol }) }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "w-full shrink-0 ", children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
      balance_default,
      {
        setActiveAssetType,
        activeAssetType,
        balances,
        currencies,
        setBalances,
        setCurrencies,
        activeAssetSymbol,
        setActiveAssetSymbol,
        setShowDeposit
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
      transactions_default,
      {
        transactions,
        setTransactions,
        currencies,
        filterByCurrency: activeAssetSymbol,
        onPaymentRequestTap: handlePaymentRequestTap,
        onTransactionTap: handleTransactionTap
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(BottomSheet_default, { height: "95dvh", open: showDeposit, onClose: () => setShowDeposit(false), children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
      CreatePaymentRequest_default,
      {
        account,
        balances,
        activeAssetSymbol
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
      BottomSheet_default,
      {
        height: "95dvh",
        open: !!activeRequestCode,
        onClose: handlePaymentRequestClose,
        children: activeRequestCode && /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
          PaymentRequestReview_default,
          {
            requestCode: activeRequestCode,
            onDone: handlePaymentRequestClose,
            onBack: handlePaymentRequestClose
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
      BottomSheet_default,
      {
        height: "95dvh",
        open: !!activeTransaction,
        onClose: handleTransactionClose,
        children: activeTransaction && /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
          TransactionDetails_default,
          {
            ledger: activeTransaction,
            onClose: handleTransactionClose
          }
        )
      }
    )
  ] });
};

// src/app/(protected)/home/page.tsx
var import_jsx_runtime38 = require("react/jsx-runtime");
function HomePage() {
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(Home, {});
}

// src/app/(protected)/addresses/page.tsx
var import_jsx_runtime39 = require("react/jsx-runtime");
function AddressesPage() {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("div", { className: "w-full h-full flex items-center justify-center", children: t.pages.addresses });
}

// src/components/profile/ProfileContent.tsx
var import_react31 = require("react");
var import_lucide_react3 = require("lucide-react");
var import_image14 = __toESM(require("next/image"));

// src/components/ui/LanguageSelector.tsx
var import_react30 = require("react");
var import_lucide_react2 = require("lucide-react");
var import_jsx_runtime40 = require("react/jsx-runtime");
var LANGUAGES = [
  { code: "en", flag: "gb", labelKey: "english", nativeName: "English" },
  { code: "ar", flag: "sa", labelKey: "arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "tr", flag: "tr", labelKey: "turkish", nativeName: "T\xFCrk\xE7e" }
];
function LanguageSelector() {
  const { language, setLanguage, t, dir } = useTranslation();
  const [isOpen, setIsOpen] = (0, import_react30.useState)(false);
  const dropdownRef = (0, import_react30.useRef)(null);
  const selected = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  (0, import_react30.useEffect)(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  (0, import_react30.useEffect)(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);
  const handleSelect = (lang) => {
    setLanguage(lang.code);
    setIsOpen(false);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)(
    "div",
    {
      ref: dropdownRef,
      className: "max-w-50 w-full relative  flex justify-end",
      dir,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => setIsOpen((prev) => !prev),
            className: `
          group w-full flex items-center justify-between gap-3
          px-4 h-12 rounded-xl border bg-gray-50
          transition-all duration-200 cursor-pointer
          ${isOpen ? "border-[#3066CC] ring-2 ring-[#3066CC]/10 bg-white" : "border-gray-200 hover:border-gray-300 hover:bg-white"}
        `,
            "aria-haspopup": "listbox",
            "aria-expanded": isOpen,
            "aria-label": `${t.languageSelector.label}: ${selected.nativeName}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("span", { className: "text-xl leading-none", children: /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(
                  "img",
                  {
                    src: `https://flagcdn.com/w40/${selected?.flag.toLowerCase()}.png`,
                    alt: selected.nativeName,
                    className: "w-3.75 h-5 object-contain"
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("span", { className: "text-sm font-medium text-gray-800", children: t.languageSelector[selected.labelKey] }),
                /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("span", { className: "text-xs text-gray-400 font-normal", children: selected.code.toUpperCase() })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(
                import_lucide_react2.ChevronDown,
                {
                  className: `w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(
          "div",
          {
            className: `
          absolute z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white
          shadow-lg shadow-black/5 overflow-hidden
          transition-all duration-200 origin-top
          ${isOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"}
        `,
            role: "listbox",
            "aria-label": t.languageSelector.label,
            children: LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)(
                "button",
                {
                  type: "button",
                  role: "option",
                  "aria-selected": isSelected,
                  onClick: () => handleSelect(lang),
                  className: `
                w-full flex items-center justify-between gap-3 px-4 py-3
                transition-colors duration-150 cursor-pointer
                ${isSelected ? "bg-[#3066CC]/5" : "hover:bg-gray-50"}
              `,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("span", { className: "text-xl leading-none", children: /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(
                        "img",
                        {
                          src: `https://flagcdn.com/w40/${lang.flag.toLowerCase()}.png`,
                          alt: lang.nativeName,
                          className: "w-3.75 h-5 object-contain"
                        }
                      ) }),
                      /* @__PURE__ */ (0, import_jsx_runtime40.jsxs)("div", { className: "flex flex-col items-start", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(
                          "span",
                          {
                            className: `text-sm font-medium ${isSelected ? "text-[#3066CC]" : "text-gray-800"}`,
                            children: t.languageSelector[lang.labelKey]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("span", { className: "text-[11px] text-gray-400", children: lang.nativeName })
                      ] })
                    ] }),
                    isSelected && /* @__PURE__ */ (0, import_jsx_runtime40.jsx)("div", { className: "w-5 h-5 rounded-full bg-[#3066CC] flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime40.jsx)(import_lucide_react2.Check, { className: "w-3 h-3 text-white", strokeWidth: 3 }) })
                  ]
                },
                lang.code
              );
            })
          }
        )
      ]
    }
  );
}

// src/components/profile/ProfileContent.tsx
var import_react_loading_skeleton3 = __toESM(require("react-loading-skeleton"));
var import_jsx_runtime41 = require("react/jsx-runtime");
var ProfileContent = () => {
  const { userData, removeAuthCookies, isLoading } = useAuth();
  const router = useUniversalRouter();
  const { t, language } = useTranslation();
  const [showLogoutDialog, setShowLogoutDialog] = (0, import_react31.useState)(false);
  const [imgError, setImgError] = (0, import_react31.useState)(false);
  const handleLogout = async () => {
    await removeAuthCookies();
    router.push("/auth");
  };
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex flex-col w-full h-full overflow-y-auto bg-white p-4 gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex flex-col items-center gap-3 bg-gray-50 rounded-[15px] p-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { circle: true, width: 64, height: 64 }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { width: 140, height: 20, borderRadius: 8 }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { width: 80, height: 14, borderRadius: 8 })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { width: 160, height: 18, borderRadius: 8 }),
      [1, 2, 3, 4].map((i) => /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { height: 56, borderRadius: 15 }, i)),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { width: 160, height: 18, borderRadius: 8 }),
      [1, 2, 3, 4].map((i) => /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_loading_skeleton3.default, { height: 56, borderRadius: 15 }, `acc-${i}`))
    ] });
  }
  if (!userData) {
    return /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "w-full h-full flex items-center justify-center text-gray-500", children: t.profile.noUserData });
  }
  const user = userData.user;
  const isArabic = language === "ar";
  const getLocalizedName = (entity) => {
    if (!entity) return null;
    return isArabic ? entity.nameAr || entity.name : entity.name;
  };
  const renderInfoItem = (icon, label, value, badge) => /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex items-start gap-3 p-3 bg-gray-50 rounded-[15px]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "w-5 h-5 text-[#3066CC] mt-1 shrink-0", children: icon }),
    /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-xs text-gray-500", children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-sm font-medium text-gray-800 truncate", children: value || /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "text-gray-400 italic", children: t.profile.notProvided }) }),
        badge
      ] })
    ] })
  ] });
  const verifiedBadge = /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "text-[#10b981] text-xs font-medium shrink-0", children: t.profile.verified });
  return /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex flex-col w-full h-full overflow-y-auto bg-white", children: [
    /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex flex-col items-center gap-3 bg-gray-50 rounded-[15px] p-6", children: [
        user.profilePictureURL && !imgError ? /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "relative w-16 h-16 rounded-full ring-2 ring-[#3066CC] ring-offset-2 overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
          import_image14.default,
          {
            src: user.profilePictureURL,
            alt: t.profile.profileAlt,
            fill: true,
            className: "object-cover",
            onError: () => setImgError(true)
          }
        ) }) : /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "w-16 h-16 bg-[#3066CC] rounded-full ring-2 ring-[#3066CC] ring-offset-2 flex items-center justify-center text-xl font-bold text-white", children: [
          user.firstName?.[0] || t.profile.fallbackInitial,
          user.lastName?.[0]
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("h1", { className: "text-lg font-bold text-[#404040] truncate max-w-62.5", children: [
            user.firstName,
            " ",
            user.lastName
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-xs text-gray-500 mt-0.5", children: user.userType })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h2", { className: "text-lg font-bold text-[#404040]", children: t.profile.personalInfo }),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.Mail, { className: "w-5 h-5" }),
          t.profile.email,
          user.email,
          user.isEmailVerified ? verifiedBadge : void 0
        ),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.Phone, { className: "w-5 h-5" }),
          t.profile.phoneNumber,
          user.phoneNumber,
          user.isPhoneVerified ? verifiedBadge : void 0
        ),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.User, { className: "w-5 h-5" }),
          t.profile.firstName,
          user.firstName
        ),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.User, { className: "w-5 h-5" }),
          t.profile.lastName,
          user.lastName
        )
      ] }),
      user.address && /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h2", { className: "text-lg font-bold text-[#404040]", children: t.profile.addressSection }),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.MapPin, { className: "w-5 h-5" }),
          t.profile.country,
          getLocalizedName(user.address.countryId)
        ),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.MapPin, { className: "w-5 h-5" }),
          t.profile.region,
          getLocalizedName(user.address.regionId)
        ),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.MapPin, { className: "w-5 h-5" }),
          t.profile.city,
          getLocalizedName(user.address.cityId)
        ),
        user.address.address1 && renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.MapPin, { className: "w-5 h-5" }),
          t.profile.address,
          user.address.address1
        ),
        user.address.zipCode && renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.MapPin, { className: "w-5 h-5" }),
          t.profile.zipCode,
          user.address.zipCode
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h2", { className: "text-lg font-bold text-[#404040]", children: t.profile.accountInfo }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex items-start gap-3 p-3 bg-gray-50 rounded-[15px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.Shield, { className: "w-5 h-5 text-[#3066CC] mt-1 shrink-0" }),
          /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-xs text-gray-500", children: t.profile.accountStatus }),
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
              "p",
              {
                className: `text-sm font-medium ${user.isBlocked ? "text-[#ef4444]" : "text-[#10b981]"}`,
                children: user.isBlocked ? t.profile.blocked : t.profile.active
              }
            ),
            user.isBlocked && user.blockReason && /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-xs text-[#ef4444] mt-1", children: user.blockReason })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex items-start gap-3 p-3 bg-gray-50 rounded-[15px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.Eye, { className: "w-5 h-5 text-[#3066CC] mt-1 shrink-0" }),
          /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-xs text-gray-500", children: t.profile.twoFactor }),
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
              "p",
              {
                className: `text-sm font-medium ${user.isTwoFactorEnabled ? "text-[#10b981]" : "text-gray-500"}`,
                children: user.isTwoFactorEnabled ? t.profile.enabled : t.profile.disabled
              }
            )
          ] })
        ] }),
        renderInfoItem(
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.Calendar, { className: "w-5 h-5" }),
          t.profile.memberSince,
          new Date(user.createdAt).toLocaleDateString()
        ),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex items-start gap-3 p-3 bg-gray-50 rounded-[15px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.Globe, { className: "w-5 h-5 text-[#3066CC] mt-1 shrink-0" }),
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-xs text-gray-500 mt-1", children: t.languageSelector.label }),
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "flex justify-end flex-row w-full", children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(LanguageSelector, {}) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setShowLogoutDialog(true),
          className: "w-full flex items-center justify-center gap-2 p-3 bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c] text-white font-medium rounded-[15px] transition-colors",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_lucide_react3.LogOut, { className: "w-5 h-5" }),
            t.profile.logout
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
      ConfirmDialog_default,
      {
        open: showLogoutDialog,
        onConfirm: handleLogout,
        onCancel: () => setShowLogoutDialog(false),
        title: t.profile.logout,
        message: t.profile.logoutConfirmation,
        confirmLabel: t.profile.logout,
        cancelLabel: t.common.cancel
      }
    )
  ] });
};
var ProfileContent_default = ProfileContent;

// src/app/(protected)/settings/page.tsx
var import_jsx_runtime42 = require("react/jsx-runtime");
function SettingsPage() {
  return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(ProfileContent_default, {});
}

// src/components/transactions/index.tsx
var import_react32 = require("react");
var import_jsx_runtime43 = require("react/jsx-runtime");
var Transactions = () => {
  const {
    currencies,
    transactions,
    setTransactions
  } = useStore();
  const [activeRequestCode, setActiveRequestCode] = (0, import_react32.useState)(null);
  const [activeTransaction, setActiveTransaction] = (0, import_react32.useState)(null);
  const handlePaymentRequestTap = (0, import_react32.useCallback)((requestCode) => {
    setActiveRequestCode(requestCode);
  }, []);
  const handleTransactionTap = (0, import_react32.useCallback)((ledger) => {
    setActiveTransaction(ledger);
  }, []);
  const handleTransactionClose = (0, import_react32.useCallback)(() => {
    setActiveTransaction(null);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsxs)("div", { className: "flex mt-4 flex-col items-start justify-start w-full h-full overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
      transactions_default,
      {
        transactions,
        setTransactions,
        currencies,
        onPaymentRequestTap: handlePaymentRequestTap,
        onTransactionTap: handleTransactionTap
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
      BottomSheet_default,
      {
        height: "95dvh",
        open: !!activeTransaction,
        onClose: handleTransactionClose,
        children: activeTransaction && /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
          TransactionDetails_default,
          {
            ledger: activeTransaction,
            onClose: handleTransactionClose
          }
        )
      }
    )
  ] });
};

// src/app/(protected)/transactions/page.tsx
var import_jsx_runtime44 = require("react/jsx-runtime");
function TransactionsPage() {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(Transactions, {});
}

// src/components/layout/Footer/index.tsx
var import_navigation2 = require("next/navigation");

// src/components/layout/Footer/Icons.tsx
var import_jsx_runtime45 = require("react/jsx-runtime");
var HomeIcon = ({ active = false, ...props }) => {
  const fillColor = active ? "#404040" : "transparent";
  const strokeColor = !active ? "#a2a0a0" : "none";
  const fillBgColor = !active ? "#404040" : "transparent";
  return /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "25", height: "25", viewBox: "0 0 25 25", ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("clipPath", { id: "clip-path-home", children: /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("rect", { width: "25", height: "25", transform: "translate(0 0.382)", fill: fillBgColor }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("g", { transform: "translate(-93 -533.407)", children: /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("g", { transform: "translate(93 533.025)", children: /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("g", { clipPath: "url(#clip-path-home)", children: /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("g", { transform: "translate(-0.102 3.068)", children: [
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("circle", { cx: "0.953", cy: "0.953", r: "0.953", transform: "translate(19.86 8.757)", fill: fillColor, stroke: strokeColor, strokeWidth: "0.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { d: "M42.081,21.2H37.324a2.868,2.868,0,0,0,0,5.737h4.757a1.166,1.166,0,0,0,1.165-1.165V22.367A1.166,1.166,0,0,0,42.081,21.2Zm-3.23,4.457A1.589,1.589,0,1,1,40.44,24.07,1.591,1.591,0,0,1,38.851,25.659Z", transform: "translate(-18.038 -14.36)", fill: fillColor, stroke: strokeColor, strokeWidth: "0.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { d: "M17.674,17.342a3.508,3.508,0,0,1,3.5-3.5h4V9.644a2.015,2.015,0,0,0-2.012-2.012H3.9A2.015,2.015,0,0,0,1.891,9.644v4.414H4.372L5.2,12.124a.318.318,0,0,1,.293-.193H7.613a1.59,1.59,0,1,1,0,.636H5.7L4.875,14.5a.318.318,0,0,1-.293.193H1.891v2.33h5.72a1.589,1.589,0,1,1,0,.636H1.891v2.33H4.583a.318.318,0,0,1,.293.193L5.7,22.117H7.61a1.588,1.588,0,1,1,0,.636H5.489a.318.318,0,0,1-.293-.193l-.824-1.934H1.891v4.414A2.015,2.015,0,0,0,3.9,27.052H23.161a2.015,2.015,0,0,0,2.012-2.012V20.845h-4A3.508,3.508,0,0,1,17.674,17.342Z", transform: "translate(-1.891 -7.632)", fill: fillColor, stroke: strokeColor, strokeWidth: "0.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("circle", { cx: "0.953", cy: "0.953", r: "0.953", transform: "translate(6.324 13.841)", fill: fillColor, stroke: strokeColor, strokeWidth: "0.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("circle", { cx: "0.953", cy: "0.953", r: "0.953", transform: "translate(6.324 3.673)", fill: fillColor, stroke: strokeColor, strokeWidth: "0.5" }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("circle", { cx: "0.953", cy: "0.953", r: "0.953", transform: "translate(6.324 8.757)", fill: fillColor, stroke: strokeColor, strokeWidth: "0.5" })
    ] }) }) }) })
  ] });
};
var TransactionIcon = ({ active = false, ...props }) => {
  const fgColor = active ? "#F4F5F5" : "#a2a0a0";
  const bgColor = active ? "#404040" : "#F4F5F5";
  return /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "25", height: "25", viewBox: "0 0 25 25", ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("circle", { cx: "12.5", cy: "12.5", r: "12.5", fill: bgColor }),
    /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("g", { id: "Group_12972", "data-name": "Group 12972", transform: "translate(-333 -261)", children: [
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "Path_22466_-_Outline", "data-name": "Path 22466 - Outline", d: "M12.5.625A11.875,11.875,0,1,0,24.375,12.5,11.888,11.888,0,0,0,12.5.625M12.5,0A12.5,12.5,0,1,1,0,12.5,12.5,12.5,0,0,1,12.5,0Z", transform: "translate(333 261)", fill: fgColor }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "arrow-button", d: "M12.261,6.172a.588.588,0,0,1,.832,0l4.159,4.159a.588.588,0,0,1-.832.832L13.265,8.008v9.16a.588.588,0,0,1-1.176,0V8.008L8.933,11.163a.588.588,0,0,1-.832-.832Z", transform: "translate(336.994 261.621)", fill: fgColor, fillRule: "evenodd" }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "arrow-button-2", "data-name": "arrow-button", d: "M12.261,17.584a.588.588,0,0,0,.832,0l4.159-4.159a.588.588,0,0,0-.832-.832l-3.155,3.155V6.588a.588.588,0,0,0-1.176,0v9.16L8.933,12.593a.588.588,0,1,0-.832.832Z", transform: "translate(328.658 261.621)", fill: fgColor, fillRule: "evenodd" })
    ] })
  ] });
};
var AddressIcon = ({ active = false, ...props }) => {
  const fgColor = active ? "#F4F5F5" : "#a2a0a0";
  const bgColor = active ? "#404040" : "#F4F5F5";
  return /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "25", height: "25", viewBox: "0 0 25 25", ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("rect", { width: "25", height: "25", rx: "5", fill: bgColor }),
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("g", { id: "Mask_Group_613", "data-name": "Mask Group 613", children: /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "wallet-2", d: "M24.166,13.827V8.75a1.231,1.231,0,0,0-.417-.922V4.584a1.25,1.25,0,0,0-1.25-1.25H19.676a5.369,5.369,0,0,0-6.524-1.576A5.409,5.409,0,0,0,4.167,3.334H2.5A2.508,2.508,0,0,0,0,5.834V22.5A2.5,2.5,0,0,0,2.5,25H22.916a1.25,1.25,0,0,0,1.25-1.25V18.673A1.25,1.25,0,0,0,25,17.5V15a1.25,1.25,0,0,0-.833-1.173Zm-1.25-9.243V7.5H20.761a5.442,5.442,0,0,0,.071-.833,5.382,5.382,0,0,0-.611-2.5H22.5A.417.417,0,0,1,22.916,4.584Zm-3.776-.59A4.476,4.476,0,0,1,19.916,7.5h-9A4.579,4.579,0,0,1,19.14,3.994ZM9.166.834A4.57,4.57,0,0,1,12.4,2.169,5.343,5.343,0,0,0,10.071,7.5H5.091A4.572,4.572,0,0,1,9.166.834Zm-8.333,5A1.673,1.673,0,0,1,2.5,4.167H3.9A5.369,5.369,0,0,0,4.164,7.5H2.587A1.732,1.732,0,0,1,.837,5.987a1.282,1.282,0,0,1,0-.15ZM22.916,24.166H2.5A1.667,1.667,0,0,1,.833,22.5V19.166H3.579a.839.839,0,0,1,.642.3l.677.815a1.692,1.692,0,1,0,.642-.531l-.679-.816a1.667,1.667,0,0,0-1.284-.6H.833V16.666H7.976a1.667,1.667,0,1,0,0-.833H.833V14.167H3.579a1.67,1.67,0,0,0,1.283-.6l.68-.817a1.647,1.647,0,0,0,.708.167,1.678,1.678,0,1,0-1.351-.7l-.676.813a.84.84,0,0,1-.644.3H.833V7.667a2.642,2.642,0,0,0,1.754.667H22.916a.417.417,0,0,1,.417.417v5H21.249a2.5,2.5,0,0,0,0,5h2.083v5A.417.417,0,0,1,22.916,24.166ZM6.25,20.416a.833.833,0,1,1-.833.833A.833.833,0,0,1,6.25,20.416Zm2.5-4.167a.833.833,0,1,1,.833.833A.833.833,0,0,1,8.75,16.25Zm-3.333-5a.833.833,0,1,1,.833.833A.833.833,0,0,1,5.416,11.25ZM24.166,17.5a.417.417,0,0,1-.417.417h-2.5a1.667,1.667,0,0,1,0-3.333h2.5a.417.417,0,0,1,.417.417Z", transform: "translate(0 0)", fill: fgColor }) })
  ] });
};
var SettingIcon = ({ active = false, ...props }) => {
  const fgColor = active ? "#F4F5F5" : "#a2a0a0";
  const bgColor = active ? "#404040" : "#F4F5F5";
  return /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("svg", { id: "_25x25_Back", "data-name": "25x25 Back", xmlns: "http://www.w3.org/2000/svg", width: "25", height: "25", viewBox: "0 0 25 25", ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("rect", { width: "25", height: "25", rx: "2", fill: bgColor }),
    /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("g", { id: "Mask_Group_618", "data-name": "Mask Group 618", children: /* @__PURE__ */ (0, import_jsx_runtime45.jsxs)("g", { id: "settings-11", transform: "translate(0 1.251)", children: [
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "Path_22821", "data-name": "Path 22821", d: "M.417,3.332H2.95a2.913,2.913,0,0,0,5.767,0H24.583a.417.417,0,1,0,0-.833H8.717a2.913,2.913,0,0,0-5.767,0H.417a.417.417,0,1,0,0,.833ZM5.833.832A2.083,2.083,0,1,1,3.75,2.916,2.083,2.083,0,0,1,5.833.832Zm0,0", fill: fgColor }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "Path_22822", "data-name": "Path 22822", d: "M.417,11.666h14.2a2.913,2.913,0,0,0,5.767,0h4.2a.417.417,0,1,0,0-.833h-4.2a2.913,2.913,0,0,0-5.767,0H.417a.417.417,0,1,0,0,.833ZM17.5,9.166a2.083,2.083,0,1,1-2.083,2.083A2.083,2.083,0,0,1,17.5,9.166Zm0,0", fill: fgColor }),
      /* @__PURE__ */ (0, import_jsx_runtime45.jsx)("path", { id: "Path_22823", "data-name": "Path 22823", d: "M.417,20H5.45a2.913,2.913,0,0,0,5.767,0H24.583a.417.417,0,1,0,0-.833H11.217a2.913,2.913,0,0,0-5.767,0H.417a.417.417,0,1,0,0,.833Zm7.917-2.5A2.083,2.083,0,1,1,6.25,19.582,2.083,2.083,0,0,1,8.333,17.5Zm0,0", fill: fgColor })
    ] }) })
  ] });
};

// src/components/ui/UniversalLink.tsx
var import_link = __toESM(require("next/link"));
var import_react_router_dom2 = require("react-router-dom");
var import_jsx_runtime46 = require("react/jsx-runtime");
var UniversalLink = ({ href, children, ...props }) => {
  const { isLibrary } = useRDBConfig();
  if (isLibrary) {
    return /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(import_react_router_dom2.Link, { to: href, ...props, children });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(import_link.default, { href, ...props, children });
};

// src/components/layout/Footer/index.tsx
var import_jsx_runtime47 = require("react/jsx-runtime");
var Footer = () => {
  const pathname = (0, import_navigation2.usePathname)();
  const { t } = useTranslation();
  const items = [
    { name: t.footer.home, icon: HomeIcon, href: "/home" },
    {
      name: t.footer.transactions,
      icon: TransactionIcon,
      href: "/transactions"
    },
    { name: t.footer.addresses, icon: AddressIcon, href: "/addresses" },
    { name: t.footer.settings, icon: SettingIcon, href: "/settings" }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime47.jsx)("footer", { className: "w-full bg-[#F4F5F5] py-2 px-6 md:px-16 lg:px-24", children: /* @__PURE__ */ (0, import_jsx_runtime47.jsx)("div", { className: "flex items-center justify-between w-full", children: items.map((item) => {
    const isActive = pathname.startsWith(item.href);
    const IconComponent = item.icon;
    return /* @__PURE__ */ (0, import_jsx_runtime47.jsxs)(
      UniversalLink,
      {
        href: item.href,
        className: "flex flex-col items-center justify-center gap-1 cursor-pointer group",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime47.jsx)("div", { className: "w-10.5 h-6 relative flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime47.jsx)(IconComponent, { className: "object-contain", active: isActive }) }),
          /* @__PURE__ */ (0, import_jsx_runtime47.jsx)(
            "span",
            {
              className: `text-[10px] font-['SF_Pro_Rounded',sans-serif] tracking-wide ${isActive ? "text-[#404040] font-medium" : "text-[#A2A0A0] font-light"}`,
              children: item.name
            }
          )
        ]
      },
      item.name
    );
  }) }) });
};
var Footer_default = Footer;

// src/components/layout/Header/index.tsx
var import_image15 = __toESM(require("next/image"));

// src/assets/icons/layout/header/rdbsmall.svg
var rdbsmall_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="144.207" height="71.673" viewBox="0 0 144.207 71.673">%0A  <path id="Path_19227" data-name="Path 19227" d="M-41.523-47.1a7.231,7.231,0,0,1,4.3,1.29,3.82,3.82,0,0,1,1.816,3.2A4.726,4.726,0,0,1-36.6-39.125a3.966,3.966,0,0,1-2.915,1.195A9.1,9.1,0,0,1-42.1-38.5a10.728,10.728,0,0,0-3.154-.669,9.718,9.718,0,0,0-5.782,2.055,15.041,15.041,0,0,0-4.587,5.638,17.789,17.789,0,0,0-1.768,7.98V-.469a4.508,4.508,0,0,1-1.29,3.249,4.381,4.381,0,0,1-3.3,1.338,4.307,4.307,0,0,1-3.249-1.29,4.558,4.558,0,0,1-1.242-3.3v-40.9a4.508,4.508,0,0,1,1.29-3.249,4.268,4.268,0,0,1,3.2-1.338,4.381,4.381,0,0,1,3.3,1.338,4.508,4.508,0,0,1,1.29,3.249V-36.5a18.091,18.091,0,0,1,6.307-7.6A16.924,16.924,0,0,1-41.523-47.1ZM11.516-66.6a4.465,4.465,0,0,1,3.3,1.29,4.465,4.465,0,0,1,1.29,3.3V-.469a4.508,4.508,0,0,1-1.29,3.249,4.381,4.381,0,0,1-3.3,1.338,4.307,4.307,0,0,1-3.249-1.29,4.558,4.558,0,0,1-1.242-3.3V-3.145A19.332,19.332,0,0,1,.287,2.684,19.049,19.049,0,0,1-9.031,5.073,21.436,21.436,0,0,1-20.785,1.729,23.417,23.417,0,0,1-29.1-7.589a29.032,29.032,0,0,1-3.058-13.427,29.412,29.412,0,0,1,3.01-13.427,23.076,23.076,0,0,1,8.266-9.318A21.107,21.107,0,0,1-9.317-47.1,21.034,21.034,0,0,1,.048-45a20.023,20.023,0,0,1,6.976,5.447V-62.013a4.558,4.558,0,0,1,1.242-3.3A4.307,4.307,0,0,1,11.516-66.6ZM-7.979-3.336A14.2,14.2,0,0,0,0-5.63a15.5,15.5,0,0,0,5.447-6.307,20.431,20.431,0,0,0,1.959-9.079,20.515,20.515,0,0,0-1.959-9.031A15.437,15.437,0,0,0,0-36.4,14.2,14.2,0,0,0-7.979-38.7a14.2,14.2,0,0,0-7.98,2.294,15.437,15.437,0,0,0-5.447,6.355,20.515,20.515,0,0,0-1.959,9.031,20.431,20.431,0,0,0,1.959,9.079A15.5,15.5,0,0,0-15.959-5.63,14.2,14.2,0,0,0-7.979-3.336ZM54.711-47.1A21.436,21.436,0,0,1,66.465-43.76a23.147,23.147,0,0,1,8.266,9.27,29.117,29.117,0,0,1,3.01,13.379,29.709,29.709,0,0,1-3.01,13.475,23.008,23.008,0,0,1-8.266,9.365A21.107,21.107,0,0,1,54.9,5.073a20.076,20.076,0,0,1-9.27-2.2,21.625,21.625,0,0,1-6.976-5.447V.2a4.508,4.508,0,0,1-1.29,3.249,4.381,4.381,0,0,1-3.3,1.338,4.347,4.347,0,0,1-3.2-1.29A4.465,4.465,0,0,1,29.577.2V-62.013a4.558,4.558,0,0,1,1.242-3.3,4.307,4.307,0,0,1,3.249-1.29,4.381,4.381,0,0,1,3.3,1.338,4.508,4.508,0,0,1,1.29,3.249V-38.7a19.141,19.141,0,0,1,6.69-5.925A18.737,18.737,0,0,1,54.711-47.1ZM53.66-3.336a14.049,14.049,0,0,0,7.932-2.341,15.649,15.649,0,0,0,5.495-6.4,20.515,20.515,0,0,0,1.959-9.031,20.208,20.208,0,0,0-1.959-8.983A15.375,15.375,0,0,0,61.592-36.4,14.261,14.261,0,0,0,53.66-38.7,14.426,14.426,0,0,0,45.632-36.4a15.442,15.442,0,0,0-5.495,6.259,20.126,20.126,0,0,0-1.959,9.031,20.431,20.431,0,0,0,1.959,9.079,15.717,15.717,0,0,0,5.495,6.355A14.211,14.211,0,0,0,53.66-3.336Z" transform="translate(66.465 66.6)"/>%0A</svg>%0A';

// src/assets/icons/layout/header/scannercode.svg
var scannercode_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="25.002" height="25.002" viewBox="0 0 25.002 25.002">%0A  <g id="Group_15219" data-name="Group 15219" transform="translate(-380.998 -72)">%0A    <g id="Group_15218" data-name="Group 15218" transform="translate(48 -285)">%0A      <path id="qr-code-9" d="M4.375,6.874H2.5A2.5,2.5,0,0,1,0,4.375V2.5A2.5,2.5,0,0,1,2.5,0H4.375a2.5,2.5,0,0,1,2.5,2.5V4.375A2.5,2.5,0,0,1,4.375,6.874Zm-1.875-5a.626.626,0,0,0-.625.625V4.375A.626.626,0,0,0,2.5,5H4.375A.626.626,0,0,0,5,4.375V2.5a.626.626,0,0,0-.625-.625Zm10,5H10.624a2.5,2.5,0,0,1-2.5-2.5V2.5a2.5,2.5,0,0,1,2.5-2.5H12.5A2.5,2.5,0,0,1,15,2.5V4.375A2.5,2.5,0,0,1,12.5,6.874Zm-1.875-5A.626.626,0,0,0,10,2.5V4.375A.626.626,0,0,0,10.624,5H12.5a.626.626,0,0,0,.625-.625V2.5a.626.626,0,0,0-.625-.625ZM4.375,15H2.5A2.5,2.5,0,0,1,0,12.5V10.624a2.5,2.5,0,0,1,2.5-2.5H4.375a2.5,2.5,0,0,1,2.5,2.5V12.5A2.5,2.5,0,0,1,4.375,15ZM2.5,10a.626.626,0,0,0-.625.625V12.5a.626.626,0,0,0,.625.625H4.375A.626.626,0,0,0,5,12.5V10.624A.626.626,0,0,0,4.375,10Zm8.124-.312V9.062a.938.938,0,0,0-.937-.937H9.062a.938.938,0,0,0-.937.937v.625a.938.938,0,0,0,.937.937h.625A.938.938,0,0,0,10.624,9.687ZM12.5,11.562a.937.937,0,1,0-.937.937A.938.938,0,0,0,12.5,11.562Zm-1.875,2.5v-.625a.938.938,0,0,0-.937-.937H9.062a.938.938,0,0,0-.937.937v.625A.938.938,0,0,0,9.062,15h.625A.938.938,0,0,0,10.624,14.061ZM15,9.687V9.062a.938.938,0,0,0-.937-.937h-.625a.938.938,0,0,0-.937.937v.625a.938.938,0,0,0,.937.937h.625A.938.938,0,0,0,15,9.687Z" transform="translate(338.001 362)" fill="%23d3d3d3"/>%0A      <g id="Group_15216" data-name="Group 15216" transform="translate(332.998 357)">%0A        <path id="Path_23802" data-name="Path 23802" d="M5.334,2A3.334,3.334,0,0,0,2,5.334V8.667a.833.833,0,0,0,1.667,0V5.334A1.667,1.667,0,0,1,5.334,3.667H8.667A.833.833,0,0,0,8.667,2Z" transform="translate(-2 -2)" fill="%23404040"/>%0A        <path id="Path_23803" data-name="Path 23803" d="M44.833,2a.833.833,0,0,0,0,1.667h3.334a1.667,1.667,0,0,1,1.667,1.667V8.667a.833.833,0,0,0,1.667,0V5.334A3.334,3.334,0,0,0,48.167,2Z" transform="translate(-26.499 -2)" fill="%23404040"/>%0A        <path id="Path_23804" data-name="Path 23804" d="M3.667,44.833a.833.833,0,0,0-1.667,0v3.334A3.334,3.334,0,0,0,5.334,51.5H8.667a.833.833,0,0,0,0-1.667H5.334a1.667,1.667,0,0,1-1.667-1.667Z" transform="translate(-2 -26.499)" fill="%23404040"/>%0A        <path id="Path_23805" data-name="Path 23805" d="M51.5,44.833a.833.833,0,0,0-1.667,0v3.334a1.667,1.667,0,0,1-1.667,1.667H44.833a.833.833,0,0,0,0,1.667h3.334A3.334,3.334,0,0,0,51.5,48.167Z" transform="translate(-26.499 -26.499)" fill="%23404040"/>%0A      </g>%0A    </g>%0A    <path id="Path_15626" data-name="Path 15626" d="M21.23,15.042H3.521a.521.521,0,0,1,0-1.042H21.23a.521.521,0,1,1,0,1.042Z" transform="translate(381.123 72.543)" fill="%23fc3434"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/layout/header/send.svg
var send_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25">%0A  <g id="Group_15220" data-name="Group 15220" transform="translate(-168 -553)">%0A    <g id="add-post" transform="translate(168 553)">%0A      <path id="Path_23800" data-name="Path 23800" d="M18.667,2V6.167A3.333,3.333,0,0,0,22,9.5h4.99q.01.126.01.253v10.58A6.667,6.667,0,0,1,20.333,27H8.667A6.667,6.667,0,0,1,2,20.333V8.667A6.667,6.667,0,0,1,8.667,2Z" transform="translate(-2 -2)" fill="%23404040" fill-rule="evenodd"/>%0A      <path id="Path_23801" data-name="Path 23801" d="M46,2.742V6.6a1.666,1.666,0,0,0,1.666,1.666h4.39a3.33,3.33,0,0,0-.45-.517L46.872,3.329A3.331,3.331,0,0,0,46,2.742Z" transform="translate(-27.664 -2.433)" fill="%23404040"/>%0A    </g>%0A    <path id="arrow-button" d="M11.241,6.132a.449.449,0,0,1,.636,0l3.181,3.18a.45.45,0,1,1-.636.636L12.009,7.536v7.005a.45.45,0,0,1-.9,0V7.536L8.7,9.948a.45.45,0,0,1-.636-.636Z" transform="translate(168.941 555.005)" fill="%23fcfcfc" fill-rule="evenodd"/>%0A    <path id="arrow-button_-_Outline" data-name="arrow-button - Outline" d="M11.6,5.85a.636.636,0,0,1,.451.187l3.181,3.18a.637.637,0,0,1-.9.9L12.234,8.026v6.553a.637.637,0,0,1-1.274,0V8.026L8.867,10.118a.637.637,0,1,1-.9-.9l3.181-3.18A.633.633,0,0,1,11.6,5.85Zm3.181,4.08a.262.262,0,0,0,.186-.448L11.782,6.3a.264.264,0,0,0-.041-.034.268.268,0,0,0-.33.034L8.231,9.482a.262.262,0,0,0,.371.371l2.733-2.733v7.458a.262.262,0,0,0,.525,0V7.121l2.733,2.733A.261.261,0,0,0,14.777,9.93Z" transform="translate(168.904 554.968)" fill="%23fcfcfc"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/layout/header/receive.svg
var receive_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">%0A  <g id="Group_15233" data-name="Group 15233" transform="translate(-168 -553)">%0A    <g id="add-post" transform="translate(168 553)">%0A      <path id="Path_23800" data-name="Path 23800" d="M15.333,2V5.333A2.667,2.667,0,0,0,18,8h3.992q.008.1.008.2v8.464A5.333,5.333,0,0,1,16.667,22H7.333A5.333,5.333,0,0,1,2,16.667V7.333A5.333,5.333,0,0,1,7.333,2Z" transform="translate(-2 -2)" fill="%23404040" fill-rule="evenodd"/>%0A      <path id="Path_23801" data-name="Path 23801" d="M46,2.742V5.827A1.333,1.333,0,0,0,47.333,7.16h3.512a2.665,2.665,0,0,0-.36-.414L46.7,3.212A2.665,2.665,0,0,0,46,2.742Z" transform="translate(-31.331 -2.495)" fill="%23404040"/>%0A    </g>%0A    <g id="Group_15232" data-name="Group 15232" transform="translate(174.947 559.253)">%0A      <path id="arrow-button" d="M10.578,13.087a.359.359,0,0,0,.509,0l2.544-2.544a.36.36,0,0,0-.509-.509l-1.93,1.93V6.36a.36.36,0,1,0-.72,0v5.6l-1.93-1.93a.36.36,0,0,0-.509.509Z" transform="translate(-7.779 -5.852)" fill="%23fcfcfc" fill-rule="evenodd"/>%0A      <path id="arrow-button_-_Outline" data-name="arrow-button - Outline" d="M10.833,13.342a.509.509,0,0,0,.36-.149l2.544-2.544a.51.51,0,1,0-.721-.721L11.343,11.6V6.36a.51.51,0,1,0-1.019,0V11.6L8.649,9.928a.51.51,0,0,0-.721.721l2.544,2.544A.506.506,0,0,0,10.833,13.342Zm2.544-3.264a.21.21,0,0,1,.148.358l-2.544,2.544a.211.211,0,0,1-.033.027.214.214,0,0,1-.264-.027L8.14,10.437a.21.21,0,0,1,.3-.3l2.186,2.186V6.36a.21.21,0,1,1,.42,0v5.966l2.186-2.186A.208.208,0,0,1,13.377,10.078Z" transform="translate(-7.779 -5.85)" fill="%23fcfcfc"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/context/ScannerContext.tsx
var import_react33 = require("react");
var import_jsx_runtime48 = require("react/jsx-runtime");
var ScannerContext = (0, import_react33.createContext)(void 0);
var ScannerProvider = ({ children }) => {
  const [open, setOpen] = (0, import_react33.useState)(null);
  const [isTransferScan, setIsTransferScan] = (0, import_react33.useState)(false);
  const onQrScannedRef = (0, import_react33.useRef)(null);
  const scannerNavRef = (0, import_react33.useRef)({});
  const setOnQrScanned = (0, import_react33.useCallback)((cb) => {
    onQrScannedRef.current = cb;
    if (!cb) setIsTransferScan(false);
  }, []);
  const setScannerNav = (0, import_react33.useCallback)((nav) => {
    scannerNavRef.current = nav;
  }, []);
  const openScannerWithCallback = (0, import_react33.useCallback)((callback) => {
    onQrScannedRef.current = callback;
    setIsTransferScan(true);
    scannerNavRef.current.toScan?.();
  }, []);
  const callOnQrScanned = (0, import_react33.useCallback)((value) => {
    if (onQrScannedRef.current) {
      onQrScannedRef.current(value);
      onQrScannedRef.current = null;
      setIsTransferScan(false);
      scannerNavRef.current.toTransfer?.();
      return true;
    }
    return false;
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime48.jsx)(
    ScannerContext.Provider,
    {
      value: {
        open,
        setOpen,
        setOnQrScanned,
        setScannerNav,
        openScannerWithCallback,
        callOnQrScanned,
        isTransferScan
      },
      children
    }
  );
};
var useScanner = () => {
  const context = (0, import_react33.useContext)(ScannerContext);
  if (context === void 0) {
    throw new Error("useScanner must be used within a ScannerProvider");
  }
  return context;
};

// src/components/layout/Header/index.tsx
var import_jsx_runtime49 = require("react/jsx-runtime");
var Header = () => {
  const { t } = useTranslation();
  const { setOpen } = useScanner();
  const { activeAssetSymbol } = useStore();
  return /* @__PURE__ */ (0, import_jsx_runtime49.jsxs)("header", { className: "relative w-full h-[min(16.37vw,7.6vh)] bg-white flex items-end justify-between px-[min(5.58vw,2.57vh)]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime49.jsx)("div", { className: "flex h-full items-center gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime49.jsx)("div", { className: "relative w-[min(13.95vw,6.44vh)] h-[min(8.98vw,4.22vh)]", children: /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(
      import_image15.default,
      {
        src: rdbsmall_default,
        alt: t.common.logoAlt,
        fill: true,
        className: "object-contain object-left"
      }
    ) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime49.jsxs)("div", { className: "flex items-center gap-7.5 mb-2", children: [
      activeAssetSymbol && /* @__PURE__ */ (0, import_jsx_runtime49.jsxs)("div", { className: "flex flex-col items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(
          "div",
          {
            className: "relative w-5 h-5 cursor-pointer hover:opacity-70 transition-opacity",
            onClick: () => setOpen("receive"),
            role: "button",
            tabIndex: 0,
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen("receive");
              }
            },
            "aria-label": t.common.accessibility.receive,
            children: /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(
              import_image15.default,
              {
                src: receive_default,
                alt: "Receive",
                fill: true,
                className: "object-contain"
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime49.jsx)("span", { className: "font-quicksand font-normal text-[11px] text-[#404040] leading-none", children: t.header.receive })
      ] }),
      activeAssetSymbol && /* @__PURE__ */ (0, import_jsx_runtime49.jsxs)("div", { className: "flex flex-col items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(
          "div",
          {
            className: "relative w-5 h-5 cursor-pointer hover:opacity-70 transition-opacity",
            onClick: () => setOpen("send"),
            role: "button",
            tabIndex: 0,
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen("send");
              }
            },
            "aria-label": t.common.accessibility.send,
            children: /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(import_image15.default, { src: send_default, alt: "Send", fill: true, className: "object-contain" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime49.jsx)("span", { className: "font-quicksand font-normal text-[11px] text-[#404040] leading-none", children: t.header.send })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime49.jsxs)("div", { className: "flex flex-col justify-start items-start gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(
          "div",
          {
            className: "relative w-6.25 h-6.25 cursor-pointer hover:opacity-70 transition-opacity",
            onClick: () => setOpen("scan"),
            role: "button",
            tabIndex: 0,
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen("scan");
              }
            },
            "aria-label": t.common.scanCodeAlt,
            children: /* @__PURE__ */ (0, import_jsx_runtime49.jsx)(
              import_image15.default,
              {
                src: scannercode_default,
                alt: t.common.scanCodeAlt,
                fill: true,
                className: "object-contain"
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime49.jsx)("span", { className: "font-quicksand font-normal text-[11px] text-[#404040] leading-none" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime49.jsx)("div", { className: "absolute bottom-0 left-[min(5.58vw,2.57vh)] right-[min(5.58vw,2.57vh)] h-px bg-[#d3d3d35e]" })
  ] });
};
var Header_default = Header;

// src/components/QR/scanner/GlobalQrScanner.tsx
var import_react40 = require("react");

// src/components/QR/send/index.tsx
var import_react39 = __toESM(require("react"));

// src/components/QR/send/Scan.tsx
var import_react34 = require("react");
var import_image16 = __toESM(require("next/image"));

// src/assets/icons/home/qr/smallscanner.svg
var smallscanner_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="25.002" height="25.002" viewBox="0 0 25.002 25.002">%0A  <g id="Group_15219" data-name="Group 15219" transform="translate(-380.998 -72)">%0A    <g id="Group_15218" data-name="Group 15218" transform="translate(48 -285)">%0A      <path id="qr-code-9" d="M4.375,6.874H2.5A2.5,2.5,0,0,1,0,4.375V2.5A2.5,2.5,0,0,1,2.5,0H4.375a2.5,2.5,0,0,1,2.5,2.5V4.375A2.5,2.5,0,0,1,4.375,6.874Zm-1.875-5a.626.626,0,0,0-.625.625V4.375A.626.626,0,0,0,2.5,5H4.375A.626.626,0,0,0,5,4.375V2.5a.626.626,0,0,0-.625-.625Zm10,5H10.624a2.5,2.5,0,0,1-2.5-2.5V2.5a2.5,2.5,0,0,1,2.5-2.5H12.5A2.5,2.5,0,0,1,15,2.5V4.375A2.5,2.5,0,0,1,12.5,6.874Zm-1.875-5A.626.626,0,0,0,10,2.5V4.375A.626.626,0,0,0,10.624,5H12.5a.626.626,0,0,0,.625-.625V2.5a.626.626,0,0,0-.625-.625ZM4.375,15H2.5A2.5,2.5,0,0,1,0,12.5V10.624a2.5,2.5,0,0,1,2.5-2.5H4.375a2.5,2.5,0,0,1,2.5,2.5V12.5A2.5,2.5,0,0,1,4.375,15ZM2.5,10a.626.626,0,0,0-.625.625V12.5a.626.626,0,0,0,.625.625H4.375A.626.626,0,0,0,5,12.5V10.624A.626.626,0,0,0,4.375,10Zm8.124-.312V9.062a.938.938,0,0,0-.937-.937H9.062a.938.938,0,0,0-.937.937v.625a.938.938,0,0,0,.937.937h.625A.938.938,0,0,0,10.624,9.687ZM12.5,11.562a.937.937,0,1,0-.937.937A.938.938,0,0,0,12.5,11.562Zm-1.875,2.5v-.625a.938.938,0,0,0-.937-.937H9.062a.938.938,0,0,0-.937.937v.625A.938.938,0,0,0,9.062,15h.625A.938.938,0,0,0,10.624,14.061ZM15,9.687V9.062a.938.938,0,0,0-.937-.937h-.625a.938.938,0,0,0-.937.937v.625a.938.938,0,0,0,.937.937h.625A.938.938,0,0,0,15,9.687Z" transform="translate(338.001 362)" fill="%23d3d3d3"/>%0A      <g id="Group_15216" data-name="Group 15216" transform="translate(332.998 357)">%0A        <path id="Path_23802" data-name="Path 23802" d="M5.334,2A3.334,3.334,0,0,0,2,5.334V8.667a.833.833,0,0,0,1.667,0V5.334A1.667,1.667,0,0,1,5.334,3.667H8.667A.833.833,0,0,0,8.667,2Z" transform="translate(-2 -2)" fill="%23fcfcfc"/>%0A        <path id="Path_23803" data-name="Path 23803" d="M44.833,2a.833.833,0,0,0,0,1.667h3.334a1.667,1.667,0,0,1,1.667,1.667V8.667a.833.833,0,0,0,1.667,0V5.334A3.334,3.334,0,0,0,48.167,2Z" transform="translate(-26.499 -2)" fill="%23fcfcfc"/>%0A        <path id="Path_23804" data-name="Path 23804" d="M3.667,44.833a.833.833,0,0,0-1.667,0v3.334A3.334,3.334,0,0,0,5.334,51.5H8.667a.833.833,0,0,0,0-1.667H5.334a1.667,1.667,0,0,1-1.667-1.667Z" transform="translate(-2 -26.499)" fill="%23fcfcfc"/>%0A        <path id="Path_23805" data-name="Path 23805" d="M51.5,44.833a.833.833,0,0,0-1.667,0v3.334a1.667,1.667,0,0,1-1.667,1.667H44.833a.833.833,0,0,0,0,1.667h3.334A3.334,3.334,0,0,0,51.5,48.167Z" transform="translate(-26.499 -26.499)" fill="%23fcfcfc"/>%0A      </g>%0A    </g>%0A    <path id="Path_15626" data-name="Path 15626" d="M21.23,15.042H3.521a.521.521,0,0,1,0-1.042H21.23a.521.521,0,1,1,0,1.042Z" transform="translate(381.123 72.543)" fill="%23fc3434"/>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/Scan.tsx
var import_jsx_runtime50 = require("react/jsx-runtime");
var DEFAULT_CAMERA = "environment";
var QrScanner = ({ onScan, onClose, onSend }) => {
  const { t } = useTranslation();
  const videoRef = (0, import_react34.useRef)(null);
  const scannerRef = (0, import_react34.useRef)(null);
  const { open: openType, isTransferScan } = useScanner();
  const [error, setError] = (0, import_react34.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react34.useState)(true);
  const [facingMode, setFacingMode] = (0, import_react34.useState)(DEFAULT_CAMERA);
  const [retryCount, setRetryCount] = (0, import_react34.useState)(0);
  const switchCamera = (0, import_react34.useCallback)(async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    try {
      await scannerRef.current?.setCamera(newMode);
    } catch (err) {
      console.error("Failed to switch camera:", err);
    }
  }, [facingMode]);
  (0, import_react34.useEffect)(() => {
    if (!openType) {
      return;
    }
    let isActive = true;
    const startScanner = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { default: QrScannerLib } = await import("qr-scanner");
        if (scannerRef.current) {
          scannerRef.current.stop();
          scannerRef.current.destroy();
          scannerRef.current = null;
        }
        if (!videoRef.current || !isActive) {
          return;
        }
        scannerRef.current = new QrScannerLib(
          videoRef.current,
          (result) => {
            if (!isActive) {
              return;
            }
            if (result?.data) {
              onScan(result.data);
            }
          },
          {
            returnDetailedScanResult: true,
            preferredCamera: facingMode,
            maxScansPerSecond: 25,
            highlightScanRegion: false,
            highlightCodeOutline: false,
            calculateScanRegion: (video) => {
              const videoWidth = video.videoWidth;
              const videoHeight = video.videoHeight;
              const smallerDimension = Math.min(videoWidth, videoHeight);
              const scanSize = Math.round(smallerDimension * 0.85);
              const x = Math.round((videoWidth - scanSize) / 2);
              const y = Math.round((videoHeight - scanSize) / 2);
              return {
                x,
                y,
                width: scanSize,
                height: scanSize,
                downScaledWidth: 400,
                downScaledHeight: 400
              };
            }
          }
        );
        await scannerRef.current.setCamera(facingMode);
        await scannerRef.current.start();
        setIsLoading(false);
      } catch (err) {
        console.error("QR scanner error:", err);
        if (isActive) {
          const msg = err.message || typeof err === "string" ? err : "";
          if (msg.includes("Camera not found") || msg.includes("NotFoundError")) {
            setError(t.home.qr.scanner.CameraNotFound || "Camera not found");
          } else {
            setError(t.home.qr.scanner.UnableToAccessCamera);
          }
          setIsLoading(false);
        }
      }
    };
    startScanner();
    return () => {
      isActive = false;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [openType, onClose, onScan, facingMode, retryCount, t.home.qr.scanner.UnableToAccessCamera]);
  return /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "w-full h-full flex-1 flex flex-col items-center px-6 pt-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "relative w-full aspect-square max-w-85 bg-black rounded-[40px] overflow-hidden shadow-2xl flex items-center justify-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
        "video",
        {
          ref: videoRef,
          className: "absolute inset-0 w-full h-full object-cover",
          playsInline: true,
          muted: true,
          autoPlay: true
        }
      ),
      !isLoading && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
        "button",
        {
          onClick: switchCamera,
          className: "absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:bg-white/30 transition-all border border-white/30",
          "aria-label": t.common.accessibility.switchCamera,
          children: /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(
            "svg",
            {
              xmlns: "http://www.w3.org/2000/svg",
              width: "20",
              height: "20",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "white",
              strokeWidth: "2.5",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("path", { d: "M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("path", { d: "M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("circle", { cx: "12", cy: "12", r: "3" }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("path", { d: "m18 22-3-3 3-3" })
              ]
            }
          )
        }
      ),
      isLoading && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "absolute bottom-0 inset-x-0 z-10 flex flex-col items-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "w-12 h-12 flex items-center justify-center text-white", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
          import_image16.default,
          {
            src: smallscanner_default,
            alt: "Scan",
            width: 25,
            height: 25,
            className: "opacity-90 grayscale brightness-200"
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "font-quicksand text-[#FCFCFC] text-[11px] font-normal text-center px-1 pb-2 leading-tight opacity-90", children: t.home.qr.scanner.readCode })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "absolute inset-0 border-[3px] border-white/10 pointer-events-none rounded-[40px]" })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "mt-4 px-4 py-2 bg-red-50 rounded-full border border-red-100 flex items-center gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-red-500 text-xs font-medium flex-1", children: error }) }),
    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "flex-1 min-h-5" }),
    openType === "send" && !isTransferScan && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "w-full flex items-center gap-4 mb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "h-px flex-1 bg-gray-100/60" }),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "text-[#1D1D1D] text-[13px] font-normal", children: t.home.qr.scanner.orChoose }),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "h-px flex-1 bg-gray-100/60" })
    ] }),
    openType === "send" && !isTransferScan && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "w-full flex flex-col gap-1 px-1 pb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(
        "button",
        {
          onClick: onSend,
          className: "cursor-pointer w-full flex items-center gap-4 p-4 bg-[#F8F8F8] rounded-2xl transition-colors group",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "w-6.25 h-6.25 rounded-lg flex items-center justify-center shadow-sm", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(import_image16.default, { src: send_default, alt: "Send", width: 22, height: 22 }) }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "flex-1 text-left", children: [
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("h3", { className: "font-quicksand text-[#1D1D1D] text-[13px] font-medium leading-tight", children: t.home.qr.scanner.sendTitle }),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-[#8D8D8D] text-[11px] mt-0.5 font-normal", children: t.home.qr.scanner.sendDescription })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("button", { className: "cursor-pointer w-full flex items-center gap-4 p-4 bg-[#F8F8F8] rounded-2xl transition-colors group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "w-6.25 h-6.25 rounded-lg flex items-center justify-center shadow-sm", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(import_image16.default, { src: receive_default, alt: "Receive", width: 22, height: 22 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "flex-1 text-left", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("h3", { className: "font-quicksand text-[#1D1D1D] text-[13px] font-medium leading-tight", children: t.home.qr.scanner.receiveTitle }),
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-[#8D8D8D] text-[11px] mt-0.5 font-normal", children: t.home.qr.scanner.receiveDescription })
        ] })
      ] })
    ] })
  ] });
};
var Scan_default = QrScanner;

// src/components/QR/send/SendChoose.tsx
var import_image17 = __toESM(require("next/image"));

// src/assets/icons/home/qr/cashwithdraw.svg
var cashwithdraw_default2 = 'data:image/svg+xml,<svg id="_25x25_Back" data-name="25x25 Back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="25" viewBox="0 0 25 25">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4609" data-name="Rectangle 4609" width="25" height="25" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_871" data-name="Mask Group 871" clip-path="url(%23clip-path)">%0A    <g id="money-gift" transform="translate(-1.016 -1.016)">%0A      <g id="Group_15324" data-name="Group 15324">%0A        <g id="Group_15323" data-name="Group 15323">%0A          <g id="Group_15306" data-name="Group 15306">%0A            <g id="Group_15304" data-name="Group 15304">%0A              <path id="Path_23822" data-name="Path 23822" d="M25.259,13.2V24.059a1.814,1.814,0,0,1-1.812,1.812H3.582A1.814,1.814,0,0,1,1.77,24.059V13.2a2.431,2.431,0,0,1,.878-1.862l9.329-7.7a2.416,2.416,0,0,1,3.076,0l9.329,7.7a2.431,2.431,0,0,1,.878,1.862Z" fill="%23fff"/>%0A            </g>%0A            <g id="Group_15305" data-name="Group 15305">%0A              <path id="Path_23823" data-name="Path 23823" d="M24.994,12.107l-10.71,8.842a1.208,1.208,0,0,1-1.538,0L2.036,12.107a2.386,2.386,0,0,1,.612-.765l9.329-7.7a2.416,2.416,0,0,1,3.076,0l9.329,7.7A2.386,2.386,0,0,1,24.994,12.107Z" fill="%23fff"/>%0A            </g>%0A          </g>%0A          <g id="Group_15317" data-name="Group 15317">%0A            <g id="Group_15311" data-name="Group 15311">%0A              <g id="Group_15307" data-name="Group 15307">%0A                <path id="Path_23824" data-name="Path 23824" d="M21.136,6.236l-.727,1.826L15.759,19.73l-1.475,1.219a1.2,1.2,0,0,1-1.14.218,1.291,1.291,0,0,1-.288-.136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1.062,1.062,0,0,1-.106-.079l-1.494-1.231,0,0L8.595,17.522,6.163,15.515l-1.015-.839,3.2-8.043,1.888-4.738a1.165,1.165,0,0,1,1.514-.651l8.731,3.479A1.166,1.166,0,0,1,21.136,6.236Z" fill="%232fbc75"/>%0A              </g>%0A              <g id="Group_15308" data-name="Group 15308">%0A                <path id="Path_23825" data-name="Path 23825" d="M19.393,7.222v0L13.827,21.185a1.2,1.2,0,0,1-.683-.018,1.291,1.291,0,0,1-.288-.136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1.062,1.062,0,0,1-.106-.079l-1.494-1.231,0,0L8.595,17.522,6.163,15.515l4.2-10.545.462-1.162a1.386,1.386,0,0,0,1.641-.483,1.317,1.317,0,0,0,.16-.292l.312.125,2.949,1.174L18.618,5.42a1.39,1.39,0,0,0,.125,1.268,1.372,1.372,0,0,0,.646.532Z" fill="%2348da97"/>%0A              </g>%0A              <g id="Group_15309" data-name="Group 15309">%0A                <path id="Path_23826" data-name="Path 23826" d="M14.661,7.264l.334.777a.324.324,0,0,1-.169.425l-.777.335a.324.324,0,0,1-.426-.17l-.334-.777a.324.324,0,0,1,.17-.425l.777-.334A.324.324,0,0,1,14.661,7.264Z" fill="%23fff"/>%0A              </g>%0A              <g id="Group_15310" data-name="Group 15310">%0A                <path id="Path_23827" data-name="Path 23827" d="M10.326,18.14l.777-.334a.324.324,0,0,0,.17-.425l-.334-.778a.324.324,0,0,0-.426-.17l-.777.335a.324.324,0,0,0-.169.425l.334.777A.324.324,0,0,0,10.326,18.14Z" fill="%23fff"/>%0A              </g>%0A            </g>%0A            <g id="Group_15316" data-name="Group 15316">%0A              <g id="Group_15312" data-name="Group 15312">%0A                <path id="Path_23828" data-name="Path 23828" d="M25.071,8.475l-1.457,2.231-3.589,5.5-3.248,2.681,0,0-2.49,2.055a1.2,1.2,0,0,1-1.14.218,1.291,1.291,0,0,1-.288-.136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1.062,1.062,0,0,1-.106-.079l-1.494-1.231,0,0L8.595,17.522,7.338,16.484l-.974-.8,8.091-12.4.793-1.215a1.166,1.166,0,0,1,1.613-.338l7.871,5.136A1.164,1.164,0,0,1,25.071,8.475Z" fill="%2379e9b3"/>%0A              </g>%0A              <g id="Group_15313" data-name="Group 15313">%0A                <path id="Path_23829" data-name="Path 23829" d="M23.166,9.1l-.527.806-5.863,8.988-2.492,2.057a1.2,1.2,0,0,1-1.14.218,1.291,1.291,0,0,1-.288-.136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1.062,1.062,0,0,1-.106-.079l-1.494-1.231,0,0L8.595,17.522,7.338,16.484,15.445,4.058a1.4,1.4,0,0,0,.283.141,1.387,1.387,0,0,0,1.637-.543l5.4,3.522A1.388,1.388,0,0,0,23.166,9.1Z" fill="%23b4ffc5"/>%0A              </g>%0A              <g id="Group_15314" data-name="Group 15314">%0A                <path id="Path_23830" data-name="Path 23830" d="M18.518,8.2l.174.827a.324.324,0,0,1-.25.383l-.828.175a.324.324,0,0,1-.384-.25l-.173-.828a.324.324,0,0,1,.25-.383l.827-.174A.324.324,0,0,1,18.518,8.2Z" fill="%23fff"/>%0A              </g>%0A              <g id="Group_15315" data-name="Group 15315">%0A                <path id="Path_23831" data-name="Path 23831" d="M12.121,18.008l.827-.174a.324.324,0,0,0,.25-.383l-.173-.828a.324.324,0,0,0-.384-.25l-.828.175a.324.324,0,0,0-.25.383l.174.827A.324.324,0,0,0,12.121,18.008Z" fill="%23fff"/>%0A              </g>%0A            </g>%0A          </g>%0A          <g id="Group_15318" data-name="Group 15318">%0A            <path id="Path_23832" data-name="Path 23832" d="M24.565,25.484a1.8,1.8,0,0,1-1.117.386H3.582a1.8,1.8,0,0,1-1.117-.386l10.281-8.49a1.208,1.208,0,0,1,1.538,0Z" fill="%23fff"/>%0A          </g>%0A          <g id="Group_15322" data-name="Group 15322">%0A            <g id="Group_15319" data-name="Group 15319">%0A              <path id="Path_23833" data-name="Path 23833" d="M12.045,22.909a.5.5,0,1,1-.5-.5A.5.5,0,0,1,12.045,22.909Z" fill="%2377b4ff"/>%0A            </g>%0A            <g id="Group_15320" data-name="Group 15320">%0A              <path id="Path_23834" data-name="Path 23834" d="M14.013,22.909a.5.5,0,1,1-.5-.5A.5.5,0,0,1,14.013,22.909Z" fill="%2377b4ff"/>%0A            </g>%0A            <g id="Group_15321" data-name="Group 15321">%0A              <path id="Path_23835" data-name="Path 23835" d="M15.98,22.909a.5.5,0,1,1-.5-.5A.5.5,0,0,1,15.98,22.909Z" fill="%2377b4ff"/>%0A            </g>%0A          </g>%0A        </g>%0A        <path id="Path_23836" data-name="Path 23836" d="M24.81,6.743,16.94,1.607a1.315,1.315,0,0,0-1.815.378l-.231.354-3.086-1.23a1.308,1.308,0,0,0-1.7.731l-1.873,4.7L2.554,11.23A2.578,2.578,0,0,0,1.625,13.2V24.059a1.959,1.959,0,0,0,1.956,1.956H23.448A1.96,1.96,0,0,0,25.4,24.059V13.2a2.566,2.566,0,0,0-.931-1.975l-.668-.552,1.386-2.125A1.305,1.305,0,0,0,24.81,6.743ZM10.375,1.948a1.019,1.019,0,0,1,1.326-.57l3.033,1.209-.585.9L12.685,2.9a.145.145,0,0,0-.189.081,1.244,1.244,0,0,1-1.613.693.145.145,0,0,0-.188.081C9.729,6.185,7.838,10.922,6.1,15.275l-.779-.644ZM7.53,16.454l7.961-12.2a1.539,1.539,0,0,0,1.91-.4c.352.232,2.171,1.418,5.165,3.37a1.536,1.536,0,0,0,.4,1.91l-6.3,9.647-2.3-1.9a1.347,1.347,0,0,0-1.153-.275l-.05.011-.006-.027a.471.471,0,0,0-.556-.361l-.826.174a.469.469,0,0,0-.363.556l.169.8-1.238,1.022Zm4.312,1.1L11.7,16.9a.179.179,0,0,1,.139-.213l.826-.174a.179.179,0,0,1,.213.137l.016.076a1.346,1.346,0,0,0-.244.156ZM10.913,3.989a1.534,1.534,0,0,0,1.792-.77l1.281.512-7.637,11.7ZM8.01,7.1,5.088,14.438,2.223,12.072a2.255,2.255,0,0,1,.516-.619ZM1.915,24.059V13.2a2.25,2.25,0,0,1,.176-.866l3.977,3.284,0,0,.2.166h0l3.852,3.18L2.466,25.3A1.656,1.656,0,0,1,1.915,24.059Zm21.534,1.666H3.581a1.645,1.645,0,0,1-.878-.25c10.877-8.981,10.218-8.456,10.413-8.533h0a1.061,1.061,0,0,1,1.073.165l10.135,8.369A1.644,1.644,0,0,1,23.448,25.726Zm1.666-1.666a1.656,1.656,0,0,1-.551,1.236L16.9,18.972l3.221-2.658,0-.005,4.808-3.969a2.25,2.25,0,0,1,.176.866Zm-.308-11.987-4.141,3.419,2.981-4.569A4.151,4.151,0,0,1,24.807,12.072ZM24.949,8.4l-5.034,7.718-2.5,2.063,5.872-9a.145.145,0,0,0-.042-.2,1.244,1.244,0,0,1-.363-1.719.145.145,0,0,0-.042-.2c-2.647-1.727-4.965-3.238-5.3-3.458l-.021-.014h0l-.036-.023h0l-.008-.005L17.45,3.54a.137.137,0,0,0-.043-.016.132.132,0,0,0-.027-.01H17.37a.1.1,0,0,0-.062.013l-.009,0,0,0a.145.145,0,0,0-.051.049s0,0-.006.006a1.247,1.247,0,0,1-1.715.352.142.142,0,0,0-.109-.02c-.085.018-.1.09-.141.14L7.305,16.269l-.749-.619L15.368,2.144a1.024,1.024,0,0,1,1.414-.294l7.87,5.136A1.016,1.016,0,0,1,24.949,8.4Z"/>%0A        <path id="Path_23837" data-name="Path 23837" d="M12.782,11.624l.257.168a1.276,1.276,0,0,0,2.209,1.269h0a.986.986,0,1,1,.285,1.365.145.145,0,0,0-.158.242,1.274,1.274,0,0,0,1.68-.253l.258.168a.145.145,0,1,0,.158-.242l-.257-.168A1.276,1.276,0,0,0,15.007,12.9h0a.986.986,0,1,1-.285-1.365.145.145,0,1,0,.158-.242,1.279,1.279,0,0,0-1.682.255l-.257-.168a.145.145,0,0,0-.158.242Z"/>%0A        <path id="Path_23838" data-name="Path 23838" d="M17.09,9.369a.468.468,0,0,0,.457.371,8.512,8.512,0,0,0,.928-.185.482.482,0,0,0,.11-.043l.019-.007a.47.47,0,0,0,.23-.5l-.174-.828a.472.472,0,0,0-.555-.362l-.828.174a.47.47,0,0,0-.361.556Zm.247-1.1.828-.174a.179.179,0,0,1,.213.139l.174.825a.181.181,0,0,1-.139.213l-.828.174a.178.178,0,0,1-.211-.137L17.2,8.481A.18.18,0,0,1,17.337,8.269Z"/>%0A        <path id="Path_23839" data-name="Path 23839" d="M11.547,22.266a.644.644,0,1,0,.643.643A.644.644,0,0,0,11.547,22.266Zm0,1a.354.354,0,1,1,.353-.355A.355.355,0,0,1,11.547,23.264Z"/>%0A        <path id="Path_23840" data-name="Path 23840" d="M13.515,22.266a.644.644,0,1,0,.643.643A.644.644,0,0,0,13.515,22.266Zm0,1a.354.354,0,1,1,.353-.355A.355.355,0,0,1,13.515,23.264Z"/>%0A        <path id="Path_23841" data-name="Path 23841" d="M15.482,22.266a.644.644,0,1,0,.643.643A.644.644,0,0,0,15.482,22.266Zm0,1a.354.354,0,1,1,.353-.355A.355.355,0,0,1,15.482,23.264Z"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/billpayments.svg
var billpayments_default = 'data:image/svg+xml,<svg id="_25x25_Back" data-name="25x25 Back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="25" viewBox="0 0 25 25">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4609" data-name="Rectangle 4609" width="25" height="25" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_872" data-name="Mask Group 872" clip-path="url(%23clip-path)">%0A    <g id="smartphone-5" transform="translate(0.018)">%0A      <g id="Group_15325" data-name="Group 15325">%0A        <path id="Path_23842" data-name="Path 23842" d="M24.117,18.478,20.467,23.6a2.478,2.478,0,0,1-3.967.514L.961,7.784a2.121,2.121,0,0,1,.7-2.883L9.117,1.943s1.285-.459,3.232,1.892C13.993,5.82,21.672,14.3,24.024,16.892a1.267,1.267,0,0,1,.093,1.587Z" fill="%23a7c6ff"/>%0A        <path id="Path_23843" data-name="Path 23843" d="M23.321,19.595l-2.854,4a2.478,2.478,0,0,1-3.967.514L.961,7.784a2.121,2.121,0,0,1,.7-2.883L7.573,2.556C9.581,6.6,14.789,15.512,23.321,19.595Z" fill="%23a7c6ff"/>%0A        <path id="Path_23844" data-name="Path 23844" d="M22.939,18.235c-.652.914-3.372,4.73-3.376,4.736a.9.9,0,0,1-1.431.138L3.114,6.694a.9.9,0,0,1,.332-1.443l.772-.306.452.384a1.267,1.267,0,0,0,1.353.185L8,4.6a1.267,1.267,0,0,0,.7-1.433l.4-.159s1.185-.422,2.979,1.745C13.6,6.582,20.7,14.416,22.855,16.793A1.151,1.151,0,0,1,22.939,18.235Z" fill="%23fff"/>%0A        <path id="Path_23845" data-name="Path 23845" d="M22.329,19.091c-2.838,3.982-2.762,3.874-2.766,3.881a.9.9,0,0,1-1.431.138L3.114,6.694a.9.9,0,0,1,.332-1.443l.772-.306.452.384a1.267,1.267,0,0,0,1.353.185L8,4.6a1.27,1.27,0,0,0,.453-.353C10.8,8.511,15.4,15.363,22.329,19.091Z" fill="%23fff"/>%0A        <path id="Path_23846" data-name="Path 23846" d="M8.22,21.988c-1.244,2.6-4.207,3.733-6.289,2.244A4.622,4.622,0,0,1,.843,18.46a4.621,4.621,0,0,1,5.177-2.776c2.478.689,3.44,3.713,2.2,6.3Z" fill="%23edd15a"/>%0A        <path id="Path_23847" data-name="Path 23847" d="M7.107,21.455a4.621,4.621,0,0,1-5.176,2.776A4.622,4.622,0,0,1,.843,18.46a4.621,4.621,0,0,1,5.177-2.776A4.621,4.621,0,0,1,7.107,21.455Z" fill="%23fae26b"/>%0A        <ellipse id="Ellipse_671" data-name="Ellipse 671" cx="3.289" cy="2.328" rx="3.289" ry="2.328" transform="matrix(0.431, -0.902, 0.902, 0.431, 0.058, 21.892)" fill="%23edd15a"/>%0A        <path id="Path_23848" data-name="Path 23848" d="M22.248,14.826a1.308,1.308,0,0,1-.11.536,15.981,15.981,0,0,1-4.024,5.06,1.307,1.307,0,0,1-2.145-.714C14.5,12.555,10.792,9.19,8.909,7.9A1.3,1.3,0,0,1,8.6,6.048a27.855,27.855,0,0,1,5.923-5.7,1.307,1.307,0,0,1,1.759.216c5.565,6.572,5.95,12.876,5.963,14.262Z" fill="%2379e9b3"/>%0A        <path id="Path_23849" data-name="Path 23849" d="M22.248,14.826a1.308,1.308,0,0,1-.11.536,15.981,15.981,0,0,1-4.024,5.06,1.309,1.309,0,0,1-1.838-.1c1.882-8.343-.584-16.16-2.045-19.757q.155-.114.295-.215a1.307,1.307,0,0,1,1.759.216C21.85,7.136,22.234,13.44,22.248,14.826Z" fill="%2314d2aa"/>%0A        <path id="Path_23850" data-name="Path 23850" d="M20.662,14.968a15.061,15.061,0,0,1-2.325,2.674c-.381-1.052-1.823-.9-1.84-.922a19.8,19.8,0,0,0-5.534-8.868,2.128,2.128,0,0,0-.116-2.68,17.609,17.609,0,0,1,2.979-2.948,2.181,2.181,0,0,0,2.674.065A29.048,29.048,0,0,1,21.094,12.1a2.516,2.516,0,0,0-.431,2.867Z" fill="%23b4ffc6"/>%0A        <path id="Path_23851" data-name="Path 23851" d="M20.662,14.968a15.061,15.061,0,0,1-2.325,2.674,1.577,1.577,0,0,0-1.5-.914A34.965,34.965,0,0,0,15.024,2.707,2.253,2.253,0,0,0,16.5,2.289,29.048,29.048,0,0,1,21.094,12.1a2.516,2.516,0,0,0-.431,2.867Z" fill="%2379e9b3"/>%0A        <path id="Path_23852" data-name="Path 23852" d="M23.373,8.147c-1.77,1.412-4.539.556-5.713-1.9C16.535,3.895,17.471,1.34,19.474.688a4.072,4.072,0,0,1,4.743,2.423A4.142,4.142,0,0,1,23.373,8.147Z" fill="%23edd15a"/>%0A        <path id="Path_23853" data-name="Path 23853" d="M23.373,8.147a4.073,4.073,0,0,1-4.742-2.424A4.143,4.143,0,0,1,19.474.688a4.072,4.072,0,0,1,4.743,2.423A4.142,4.142,0,0,1,23.373,8.147Z" fill="%23fae26b"/>%0A        <ellipse id="Ellipse_672" data-name="Ellipse 672" cx="2.069" cy="2.923" rx="2.069" ry="2.923" transform="matrix(0.902, -0.431, 0.431, 0.902, 18.651, 2.687)" fill="%23edd15a"/>%0A      </g>%0A      <g id="Group_15326" data-name="Group 15326">%0A        <path id="Path_23854" data-name="Path 23854" d="M22.352,14.89c0-.022,0-.044,0-.066a19.369,19.369,0,0,0-1.126-5.9,3.269,3.269,0,0,0,1.594-.313c1.86-.889,2.529-3.379,1.491-5.55A4.73,4.73,0,0,0,22,.758a3.348,3.348,0,0,0-4.384,1.325C17.223,1.546,16.8,1.013,16.365.5a1.419,1.419,0,0,0-1.9-.233,30.318,30.318,0,0,0-3.021,2.486c-1.42-1.22-2.324-.918-2.366-.9C1.291,4.934,1.617,4.8,1.606,4.81A2.235,2.235,0,0,0,.869,7.835c.01.018,15.557,16.353,15.564,16.359a2.909,2.909,0,0,0,2.332.769,2.894,2.894,0,0,0,1.79-1.308L24.2,18.539a1.38,1.38,0,0,0-.1-1.719c-.429-.472-1.035-1.141-1.75-1.93ZM21.915.951a4.52,4.52,0,0,1,2.207,2.207c.988,2.066.363,4.43-1.392,5.269S18.743,8.268,17.755,6.2a4.52,4.52,0,0,1-.332-3.1A3.164,3.164,0,0,1,21.915.951ZM19.83,8.577a31.619,31.619,0,0,1,1.147,3.5,2.614,2.614,0,0,0-.434,2.884,14.813,14.813,0,0,1-2.169,2.506,1.879,1.879,0,0,0-1.8-.849A19.97,19.97,0,0,0,11.1,7.84a2.2,2.2,0,0,0-.126-2.665,17.355,17.355,0,0,1,2.849-2.819,2.26,2.26,0,0,0,2.646.075c.229.307.454.627.672.952A4.907,4.907,0,0,0,19.83,8.577ZM14.587.434a1.208,1.208,0,0,1,1.617.2c.456.539.894,1.1,1.3,1.656a3.9,3.9,0,0,0-.3.81c-.2-.3-.412-.591-.624-.872A.105.105,0,0,0,16.44,2.2a2.081,2.081,0,0,1-2.552-.062.105.105,0,0,0-.128,0,17.564,17.564,0,0,0-3,2.966.105.105,0,0,0,0,.127,2.025,2.025,0,0,1,.118,2.553.105.105,0,0,0,.011.142,19.754,19.754,0,0,1,5.5,8.819.106.106,0,0,0,.1.077c.648-.014,1.475.123,1.739.852a.105.105,0,0,0,.17.041,14.884,14.884,0,0,0,2.341-2.693.105.105,0,0,0,.009-.1,2.422,2.422,0,0,1,.411-2.754.105.105,0,0,0,.025-.1,31.776,31.776,0,0,0-1.1-3.386,3.813,3.813,0,0,0,.9.22,19.212,19.212,0,0,1,1.145,5.917,1.209,1.209,0,0,1-.1.493,15.9,15.9,0,0,1-4,5.023,1.2,1.2,0,0,1-1.973-.657c-1.2-5.843-4.059-9.788-7.1-11.873a1.2,1.2,0,0,1-.282-1.7,28.084,28.084,0,0,1,5.9-5.678ZM8.826,3.23l.315-.125a1.893,1.893,0,0,1,1.5.43,24.289,24.289,0,0,0-2.12,2.449,1.406,1.406,0,0,0,.332,2c2,1.371,5.576,4.72,7.016,11.741a1.411,1.411,0,0,0,2.318.772,17.154,17.154,0,0,0,3.779-4.535l.814.9a1.052,1.052,0,0,1,.076,1.31c-3.531,4.953-3.375,4.733-3.38,4.743a.793.793,0,0,1-1.263.121L3.191,6.623a.794.794,0,0,1,.293-1.274L4.2,5.067l.4.343a1.375,1.375,0,0,0,1.466.2l1.98-.917A1.379,1.379,0,0,0,8.826,3.23ZM24.031,18.417c-3.667,5.144-3.651,5.12-3.655,5.127a2.733,2.733,0,0,1-1.65,1.212,2.673,2.673,0,0,1-2.155-.722L1.048,7.722a2.783,2.783,0,0,1-.28-1.008A1.741,1.741,0,0,1,1.706,5L9.151,2.043c.008,0,.831-.263,2.139.852q-.249.237-.5.489a2.051,2.051,0,0,0-1.721-.475l-.4.159a.105.105,0,0,0-.064.121A1.167,1.167,0,0,1,7.959,4.5l-1.98.917A1.164,1.164,0,0,1,4.738,5.25l-.452-.384a.1.1,0,0,0-.107-.018l-.772.306a1,1,0,0,0-.371,1.612L18.055,23.18a1,1,0,0,0,1.6-.156c-.021.032.133-.187,3.37-4.728a1.263,1.263,0,0,0-.092-1.573l-.868-.957q.089-.179.169-.361a1.415,1.415,0,0,0,.08-.241l1.631,1.8a1.168,1.168,0,0,1,.085,1.455Z"/>%0A        <path id="Path_23855" data-name="Path 23855" d="M6.644,15.806a3.89,3.89,0,0,0-3.3.018A5.309,5.309,0,0,0,.748,18.414C-.417,20.85.333,23.644,2.419,24.641c2.144,1.025,4.764-.24,5.9-2.608C9.48,19.6,8.73,16.8,6.644,15.806Zm1.482,6.136c-1.082,2.263-3.578,3.483-5.616,2.509C.528,23.5-.177,20.836.938,18.505a5.1,5.1,0,0,1,2.49-2.489A3.687,3.687,0,0,1,6.553,16C8.535,16.944,9.24,19.611,8.126,21.942Z"/>%0A        <path id="Path_23856" data-name="Path 23856" d="M4.8,23.76a.105.105,0,0,0,.108.18,6.283,6.283,0,0,0,2.853-5.5.105.105,0,0,0-.21.012A6.073,6.073,0,0,1,4.8,23.76Z"/>%0A        <path id="Path_23857" data-name="Path 23857" d="M6.174,18.53a2.144,2.144,0,0,0-1.128-1.657c-1.211-.579-2.853.324-3.661,2.013S.906,22.42,2.116,23a2.156,2.156,0,0,0,2-.162A4.409,4.409,0,0,0,6.174,18.53ZM4.012,22.653a1.941,1.941,0,0,1-1.8.156C1.1,22.28.817,20.561,1.575,18.977c.728-1.523,2.234-2.462,3.38-1.914a1.941,1.941,0,0,1,1.012,1.5A4.2,4.2,0,0,1,4.012,22.653Z"/>%0A        <path id="Path_23858" data-name="Path 23858" d="M20.6,7.992a.105.105,0,0,0,.108-.18A5.386,5.386,0,0,1,18.264,3.1a.105.105,0,1,0-.21-.012A5.6,5.6,0,0,0,20.6,7.992Z"/>%0A        <path id="Path_23859" data-name="Path 23859" d="M21.3,7.012a1.926,1.926,0,0,0,1.787.144c1.082-.517,1.376-2.164.656-3.671s-2.187-2.312-3.269-1.794S19.1,3.855,19.821,5.362A3.7,3.7,0,0,0,21.3,7.012Zm-.115-5.269a2.923,2.923,0,0,1,2.367,1.833c.67,1.4.421,2.923-.557,3.39a1.714,1.714,0,0,1-1.593-.138,3.492,3.492,0,0,1-1.4-1.557c-.814-1.7-.252-3.528,1.178-3.528Z"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/shein.svg
var shein_default = 'data:image/svg+xml,<svg id="Group_15451" data-name="Group 15451" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_678" data-name="Ellipse 678" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Ellipse_673" data-name="Ellipse 673" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_886" data-name="Mask Group 886" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <path id="shein-1" d="M9.359,9.047a2.469,2.469,0,0,1-.312,1.248,3.377,3.377,0,0,1-.884,1.04,3.755,3.755,0,0,1-1.352.728,5.935,5.935,0,0,1-1.716.26,12.179,12.179,0,0,1-1.508-.1,9.565,9.565,0,0,1-1.3-.26,7.487,7.487,0,0,1-1.143-.468C.78,11.283.416,11.022,0,10.763L1.82,9.151a4.571,4.571,0,0,0,1.56.832,5.508,5.508,0,0,0,1.612.26,2.63,2.63,0,0,0,.676-.1,1.923,1.923,0,0,0,.572-.26A2.449,2.449,0,0,0,6.6,9.515a.84.84,0,0,0,.156-.468,1.534,1.534,0,0,0-.1-.52.8.8,0,0,0-.416-.416A4.1,4.1,0,0,0,5.407,7.7a9.933,9.933,0,0,0-1.352-.468c-.468-.156-.936-.312-1.4-.52a4.823,4.823,0,0,1-1.144-.728,2.863,2.863,0,0,1-.78-.988A2.886,2.886,0,0,1,.364,3.535a3.1,3.1,0,0,1,.312-1.4A3.09,3.09,0,0,1,1.612,1.04,4.7,4.7,0,0,1,2.964.364,5.861,5.861,0,0,1,4.627.1,7.34,7.34,0,0,1,7.175.468a5.713,5.713,0,0,1,1.82,1.04L7.227,3.12a3.873,3.873,0,0,0-1.092-.676,3.987,3.987,0,0,0-1.4-.208,2.627,2.627,0,0,0-.676.1,1.468,1.468,0,0,0-.572.26,1.406,1.406,0,0,0-.364.416.84.84,0,0,0-.156.468A.879.879,0,0,0,3.12,4c.052.156.208.26.416.416a4.1,4.1,0,0,0,.832.416,11.979,11.979,0,0,0,1.3.468,8.477,8.477,0,0,1,1.664.676,4.991,4.991,0,0,1,1.144.832,3.046,3.046,0,0,1,.676.988A3.147,3.147,0,0,1,9.359,9.047Zm14.61,3.12H21.421v-5.2H16.69v5.2H14.142V.364H16.69V5.044h4.732V.364h2.547Zm14.09,0H28.752V.364h9.307V2.236H31.248V5.044h6.291v1.82H31.248v3.223h6.811Zm7.539,0H43.05V.364H45.6ZM60,.364V12.478L52.877,6.291v5.771h-2.5V0L57.5,6.187V.364Z" transform="translate(0 23.762)"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/amazon.svg
var amazon_default = 'data:image/svg+xml,<svg id="Group_15450" data-name="Group 15450" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_679" data-name="Ellipse 679" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Ellipse_674" data-name="Ellipse 674" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_887" data-name="Mask Group 887" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <g id="logo-amazon" transform="translate(0 20.975)">%0A      <path id="Path_23941" data-name="Path 23941" d="M12.769,4.308v5.8a.355.355,0,0,1-.355.355H10.582a.355.355,0,0,1-.355-.355V.671a.355.355,0,0,1,.355-.355h1.7a.355.355,0,0,1,.355.355V2a2.732,2.732,0,0,1,2.4-1.9,2.447,2.447,0,0,1,2.5,1.76A2.687,2.687,0,0,1,19.984.1,2.529,2.529,0,0,1,22.717,2.77l.021,1.558v5.8a.355.355,0,0,1-.355.355H20.551a.355.355,0,0,1-.355-.355L20.179,3.8c.052-1.434-1.108-1.33-1.108-1.33-1.46.026-1.319,1.857-1.319,1.857v5.8a.355.355,0,0,1-.355.355H15.565a.355.355,0,0,1-.355-.355V3.943s.107-1.486-1.2-1.486C14.014,2.457,12.723,2.288,12.769,4.308ZM60,4.291v5.8a.355.355,0,0,1-.355.355l-1.906.037a.355.355,0,0,1-.355-.355V3.943s.107-1.486-1.2-1.486c0,0-1.245-.061-1.245,2.269v5.387a.355.355,0,0,1-.355.355H52.756a.355.355,0,0,1-.355-.355V.671a.355.355,0,0,1,.355-.355h1.7a.355.355,0,0,1,.355.355V2a2.732,2.732,0,0,1,2.4-1.9,2.372,2.372,0,0,1,2.576,1.723A7.213,7.213,0,0,1,60,4.291ZM46.77.065c-2.343,0-4.243,1.975-4.243,5.3,0,2.926,1.466,5.3,4.243,5.3,2.62,0,4.243-2.372,4.243-5.3,0-3.265-1.9-5.3-4.243-5.3Zm1.479,5.416A9.267,9.267,0,0,1,48.093,7.4C47.87,8.72,46.91,8.722,46.768,8.715S45.647,8.707,45.447,7.4a9.267,9.267,0,0,1-.156-1.916V5.273a9.267,9.267,0,0,1,.156-1.916c.2-1.31,1.169-1.324,1.322-1.318s1.1-.005,1.324,1.318a9.267,9.267,0,0,1,.156,1.916ZM41.464,1.988V.633a.355.355,0,0,0-.355-.355H35.053A.355.355,0,0,0,34.7.633V1.977a.355.355,0,0,0,.355.355h3.159L34.472,7.757a.914.914,0,0,0-.142.463v1.65s-.024.566.617.237A6.318,6.318,0,0,1,38,9.418a6.889,6.889,0,0,1,3.145.748s.522.237.522-.285V8.445s.047-.38-.451-.617a6.654,6.654,0,0,0-3.347-.665ZM8.813,8.779l-.574-.873a1.474,1.474,0,0,1-.169-.691V3.187C8.148-.293,4.29.007,4.29.007.86.007.353,2.676.353,2.676c-.143.537.273.55.273.55L2.3,3.4a.338.338,0,0,0,.39-.275A1.465,1.465,0,0,1,4.147,1.956,1.181,1.181,0,0,1,5.476,3.109v.965a8.778,8.778,0,0,0-3.923.834A3.189,3.189,0,0,0,0,7.71a2.735,2.735,0,0,0,2.894,2.907A4.04,4.04,0,0,0,5.841,9.261a5.507,5.507,0,0,0,.926,1.121.429.429,0,0,0,.613.052l1.356-1.16A.334.334,0,0,0,8.813,8.779ZM3.8,8.741c-.871,0-1.194-.865-1.05-1.715s.9-1.519,2.727-1.5v.517c.065,2.258-.953,2.7-1.678,2.7Zm29.364.038-.573-.873a1.475,1.475,0,0,1-.17-.691V3.187c.078-3.48-3.78-3.18-3.78-3.18-3.43,0-3.937,2.669-3.937,2.669-.143.537.273.55.273.55l1.676.17a.338.338,0,0,0,.39-.275A1.465,1.465,0,0,1,28.5,1.956a1.181,1.181,0,0,1,1.329,1.153v.965a8.778,8.778,0,0,0-3.923.834,3.189,3.189,0,0,0-1.551,2.8,2.735,2.735,0,0,0,2.894,2.907A4.04,4.04,0,0,0,30.19,9.261a5.515,5.515,0,0,0,.925,1.121.429.429,0,0,0,.613.052l1.356-1.16a.334.334,0,0,0,.078-.5Zm-5.015-.038c-.871,0-1.194-.865-1.05-1.715s.9-1.519,2.727-1.5v.517c.065,2.258-.953,2.7-1.678,2.7Z" transform="translate(0 0)"/>%0A      <g id="Group_15446" data-name="Group 15446" transform="translate(8.46 10.905)">%0A        <path id="Path_23942" data-name="Path 23942" d="M37.775,16.4s-.153.267.035.326a.482.482,0,0,0,.478-.163A6.759,6.759,0,0,0,40.27,11.8s.014-.384-.14-.489c0,0-.606-.536-2.786-.373a5.774,5.774,0,0,0-2.937,1.049.284.284,0,0,0-.093.186s-.022.226.548.128a15.118,15.118,0,0,1,3.03-.128s.583.07.746.268c0,0,.268.221.128.956A13.967,13.967,0,0,1,37.775,16.4Z" transform="translate(-8.46 -10.905)" fill="%23f3971b"/>%0A        <path id="Path_23943" data-name="Path 23943" d="M37.392,13.45a.461.461,0,0,1-.174.685,22.226,22.226,0,0,1-13.1,3.912,23.389,23.389,0,0,1-15.511-6s-.247-.217-.094-.419c0,0,.137-.186.493.016a31.911,31.911,0,0,0,15.36,4.137,31.7,31.7,0,0,0,12.279-2.424s.5-.257.75.089Z" transform="translate(-8.46 -10.905)" fill="%23f3971b"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/paypal.svg
var paypal_default = 'data:image/svg+xml,<svg id="Group_15449" data-name="Group 15449" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_679" data-name="Ellipse 679" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Ellipse_674" data-name="Ellipse 674" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_888" data-name="Mask Group 888" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <g id="paypal-4" transform="translate(4.425 0)">%0A      <path id="Path_23944" data-name="Path 23944" d="M22.367,59.668l1.04-6.605-2.316-.054H10.03L17.717,4.271a.643.643,0,0,1,.215-.382.628.628,0,0,1,.41-.151h18.65c6.191,0,10.464,1.288,12.7,3.832a8.736,8.736,0,0,1,2.034,3.811,13.762,13.762,0,0,1,.014,5.257l-.024.153v1.344l1.046.592a7.336,7.336,0,0,1,2.117,1.615A7.517,7.517,0,0,1,56.591,24.2a16.3,16.3,0,0,1-.245,5.591,19.688,19.688,0,0,1-2.29,6.329,13.014,13.014,0,0,1-3.629,3.976A14.722,14.722,0,0,1,45.541,42.3,24.375,24.375,0,0,1,39.433,43H37.981a4.365,4.365,0,0,0-4.317,3.684l-.109.595L31.718,58.922l-.084.428a.367.367,0,0,1-.115.248.307.307,0,0,1-.191.07Z" transform="translate(-5.585 -1.614)" fill="%23253b80"/>%0A      <path id="Path_23945" data-name="Path 23945" d="M51.411,16.858q-.086.548-.191,1.094C48.76,30.579,40.346,34.941,29.6,34.941H24.128A2.657,2.657,0,0,0,21.5,37.192L18.7,54.959,17.906,60a1.4,1.4,0,0,0,1.382,1.618h9.7A2.336,2.336,0,0,0,31.3,59.645l.1-.493,1.827-11.6.117-.636a2.334,2.334,0,0,1,2.306-1.972H37.1c9.4,0,16.763-3.818,18.914-14.864.9-4.615.433-8.468-1.945-11.178a9.278,9.278,0,0,0-2.656-2.048Z" transform="translate(-5.585 -1.614)" fill="%23179bd7"/>%0A      <path id="Path_23946" data-name="Path 23946" d="M48.838,15.832q-.576-.167-1.161-.3-.612-.134-1.231-.233a30.393,30.393,0,0,0-4.824-.352H27a2.33,2.33,0,0,0-2.3,1.972l-3.11,19.7-.089.575a2.657,2.657,0,0,1,2.626-2.251H29.6c10.747,0,19.161-4.364,21.621-16.99.074-.374.135-.738.191-1.094A13.1,13.1,0,0,0,49.388,16q-.274-.091-.551-.173Z" transform="translate(-5.585 -1.614)" fill="%23222d65"/>%0A      <path id="Path_23947" data-name="Path 23947" d="M24.7,16.921a2.332,2.332,0,0,1,2.3-1.97H41.622a30.393,30.393,0,0,1,4.824.352q.632.1,1.231.233t1.161.3c.187.056.372.113.553.171a13.3,13.3,0,0,1,2.022.853c.732-4.666-.006-7.844-2.529-10.721C46.1,2.97,41.081,1.614,34.657,1.614H16.007a2.665,2.665,0,0,0-2.634,2.253L5.6,53.106a1.6,1.6,0,0,0,1.581,1.853H18.7L21.59,36.617Z" transform="translate(-5.585 -1.614)" fill="%23253b80"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/syriatel.svg
var syriatel_default = 'data:image/svg+xml,<svg id="Group_15448" data-name="Group 15448" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_679" data-name="Ellipse 679" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Ellipse_674" data-name="Ellipse 674" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_889" data-name="Mask Group 889" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <g id="syriatel-1" transform="translate(0 25.035)">%0A      <path id="Path_23948" data-name="Path 23948" d="M59.27,3.247,60,7.02l-.684.158H54.158l-.533-.336v.336h-5.57L47.484,6.9v.281H35.858l-.626-.336v.384H29.345V4.932h2.63V3.293h2.95V4.855h9.221V3.338h3.3V4.93h2.95V3.274h2.95v1.61h2.95V3.274Zm-40.615,0,.571,3.886-1.272.094H13.733l-.8-.5v.523H7.778v1.9L7.1,9.511H.984L.336,8.34,0,6.533V5.287H2.424l.355.665V7.207H5.112L4.464,0H6.907l.581,4.932h2.546V3.322h2.95V4.9H15.6V3.322Z" transform="translate(0 0)" fill="%23767776"/>%0A      <path id="Path_23949" data-name="Path 23949" d="M9.454,2.33h2.882V1.61H9.454Zm5.9-1.039L18.206,0l.019.355L15.36,1.649ZM16.634,8.93h2.882V8.21H16.634ZM32.03,8.9h2.882v-.72H32.03Z" transform="translate(0 0)" fill="%23767776"/>%0A      <path id="Path_23950" data-name="Path 23950" d="M27.763,4.906l.132.4h.422l-.336.252.122.394-.338-.242-.329.242.122-.394-.336-.252h.422Zm.065,1.553.132.4h.422l-.336.252.122.4-.336-.252-.338.252.132-.4-.336-.252h.422Z" transform="translate(0 0)" fill="%2300a651"/>%0A      <path id="Path_23951" data-name="Path 23951" d="M25.807,9.586l.029.139h.814l.2-.038.233-.065.187-.055.178-.055.346-.158.374-.235.281-.233.29-.29.1-.113.142-.187.113-.149.122-.206.132-.355.1-.355v-2.5L29.422,4.6l-.038-.139-.074-.187-.132-.29-.139-.3L28.822,3.3H27.427l.439.516.271.384.262.413.233.487.122.365.084.319.038.3.01.31-.029.326-.055.31-.046.262-.048.149-.055.178-.065.168-.084.132-.094.139-.1.142-.1.142-.132.149-.187.2-.1.113-.094.084-.1.094-.113.084-.226.139-.132.074-.122.065-.094.038-.149.055-.122.038-.132.029-.178.029Z" transform="translate(0 0)"/>%0A      <path id="Path_23952" data-name="Path 23952" d="M26.35,3.324,24.394,3.3l.346.449.271.394.262.4.187.31.149.31.122.336.065.271.074.439.029.29-.01.4-.01.122-.019.1-.038.158-.046.168-.029.113-.038.065-.055.074-.132.149-.262.233-.3.168-.365.158-.319.084-.384.074-.216.029h-.338l-.4-.029-.326-.055-.271-.074-.319-.094-.31-.132-.516-.278-.329-.2-.506-.326-.787-.571-.506-.4-.744-.607-.514-.43-.665-.542-.514-.449-.468-.422-.415-.422-.458-.542-.422-.506-.449-.6-.533-.694-.168.168.226.581.581,1.058.581.936.506.768.842,1.02,1.236,1.226,1.582,1.226,1.068.823.346.187.3.151.31.149.439.149.607.158.4.058.607.048,1.675-.019.1-.01.139-.029.149-.038.149-.055.206-.094.226-.122.122-.074.1-.094.1-.1.158-.158.206-.262L26.8,8.7l.132-.206.158-.3.113-.262.094-.329.065-.281.048-.355.01-.422-.038-.5-.029-.233-.084-.3-.142-.487-.065-.2-.094-.29-.132-.319-.168-.413-.187-.3Z" transform="translate(0 0)" fill="%23ed1d24"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/mtn.svg
var mtn_default = 'data:image/svg+xml,<svg id="Group_15447" data-name="Group 15447" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_679" data-name="Ellipse 679" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Ellipse_674" data-name="Ellipse 674" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_890" data-name="Mask Group 890" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <g id="mtn-group" transform="translate(0 0.002)">%0A      <path id="Path_23953" data-name="Path 23953" d="M0,60H60V0H0Z" fill="%23fac705"/>%0A      <path id="Path_23954" data-name="Path 23954" d="M30,41.664c15.648,0,28.33-5.225,28.33-11.664S45.646,18.331,30,18.331,1.666,23.556,1.666,30,14.352,41.664,30,41.664" transform="translate(0)" fill="%23005c87"/>%0A      <path id="Path_23955" data-name="Path 23955" d="M37.09,27.122l.742-2.957H28.159l-.739,2.957h3.166l-1.553,6.211h3.334l1.555-6.211Z" fill="%23fac705"/>%0A      <path id="Path_23956" data-name="Path 23956" d="M27.326,24.166H22.5L19.43,30.96V24.166H14.758L11.832,35.83h3.214l1.9-7.529V35.83H19.43L23.086,28.3,21.334,35.83H24.4Zm20.837,0H45.1L43.49,30.372l-1.464-6.206H38.662L35.741,35.832h3.072l1.606-6.348,1.608,6.346h3.216Z" transform="translate(0)" fill="%23fff"/>%0A      <path id="Path_23957" data-name="Path 23957" d="M28.824,34.164,28.4,35.83H31.74l.415-1.666Z" fill="%23211e1e"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/netflix.svg
var netflix_default = 'data:image/svg+xml,<svg id="Group_15459" data-name="Group 15459" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_680" data-name="Ellipse 680" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A    <linearGradient id="linear-gradient" x1="-0.178" y1="0.612" x2="0.566" y2="0.471" gradientUnits="objectBoundingBox">%0A      <stop offset="0" stop-color="%23c20000" stop-opacity="0"/>%0A      <stop offset="1" stop-color="%239d0000"/>%0A    </linearGradient>%0A    <linearGradient id="linear-gradient-2" x1="1.145" y1="0.423" x2="0.471" y2="0.503" xlink:href="%23linear-gradient"/>%0A  </defs>%0A  <g id="Ellipse_673" data-name="Ellipse 673" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_891" data-name="Mask Group 891" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <g id="netflix-logo-icon" transform="translate(13.566 0)">%0A      <path id="Path_23958" data-name="Path 23958" d="M27.05,2H15.566V62A62.236,62.236,0,0,1,27.05,60.493Z" transform="translate(-15.566 -2)" fill="%23c20000"/>%0A      <path id="Path_23959" data-name="Path 23959" d="M27.05,2H15.566V47.908A62.236,62.236,0,0,1,27.05,46.4Z" transform="translate(-15.566 -2)" fill="url(%23linear-gradient)"/>%0A      <path id="Path_23960" data-name="Path 23960" d="M48.434,62V2H36.95V60.613A95.274,95.274,0,0,1,48.434,62Z" transform="translate(-15.566 -2)" fill="%23c20000"/>%0A      <path id="Path_23961" data-name="Path 23961" d="M48.434,62V22.181H36.95V60.613A95.274,95.274,0,0,1,48.434,62Z" transform="translate(-15.566 -2)" fill="url(%23linear-gradient-2)"/>%0A      <path id="Path_23962" data-name="Path 23962" d="M48.434,62,27.05,2H15.566L36.445,60.582A95.956,95.956,0,0,1,48.434,62Z" transform="translate(-15.566 -2)" fill="%23fa0000"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/qr/youtube.svg
var youtube_default = 'data:image/svg+xml,<svg id="Group_15457" data-name="Group 15457" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="70" height="70" viewBox="0 0 70 70">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <circle id="Ellipse_681" data-name="Ellipse 681" cx="30" cy="30" r="30" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Ellipse_682" data-name="Ellipse 682" fill="none" stroke="%238d8d8d" stroke-width="0.5">%0A    <circle cx="35" cy="35" r="35" stroke="none"/>%0A    <circle cx="35" cy="35" r="34.75" fill="none"/>%0A  </g>%0A  <g id="Mask_Group_892" data-name="Mask Group 892" transform="translate(5 5)" clip-path="url(%23clip-path)">%0A    <g id="youtube-icon-5" transform="translate(-0.001 8.931)">%0A      <path id="Path_23963" data-name="Path 23963" d="M45.943,35.41c-5.5-2.94-10.769-5.643-16.153-8.465V43.827c5.666-3.08,11.638-5.9,16.177-8.417Z" transform="translate(-5.976 -14.954)" fill="%23fff"/>%0A      <path id="Path_23964" data-name="Path 23964" d="M45.943,35.41c-5.5-2.94-16.153-8.465-16.153-8.465l14.2,9.545S41.4,37.926,45.943,35.41Z" transform="translate(-5.976 -14.954)" fill="%23e8e0e0"/>%0A      <path id="Path_23965" data-name="Path 23965" d="M30.825,57.041c-11.427-.21-15.33-.4-17.728-.894a7.793,7.793,0,0,1-4.068-2.115A8.562,8.562,0,0,1,7.1,50.317a24.3,24.3,0,0,1-.823-5.455,129.566,129.566,0,0,1,0-17.682c.367-3.266.545-7.143,2.986-9.405a8,8,0,0,1,4-2.022c2.351-.446,12.367-.8,22.737-.8,10.346,0,20.384.353,22.738.8a7.822,7.822,0,0,1,4.679,2.774c2.226,3.5,2.265,7.857,2.491,11.263.094,1.623.094,10.839,0,12.462-.352,5.383-.635,7.288-1.434,9.263a6.828,6.828,0,0,1-1.646,2.634,7.887,7.887,0,0,1-4.186,2.14c-9.888.744-18.285.905-27.815.753ZM45.967,35.41c-5.5-2.94-10.769-5.666-16.153-8.488V43.8c5.666-3.08,11.639-5.9,16.177-8.418Z" transform="translate(-5.976 -14.954)" fill="%23cd201f"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/SendChoose.tsx
var import_jsx_runtime51 = require("react/jsx-runtime");
var SendChoose = ({ onNavigate }) => {
  const { t, tr: tr2 } = useTranslation();
  const OPTIONS = [
    {
      icon: sendT_default,
      iconAlt: tr2("send.transfer.icon_alt"),
      label: tr2("send.transfer.label"),
      sublabel: tr2("send.transfer.description"),
      links: [{ label: tr2("common.history") }]
    },
    {
      icon: cashwithdraw_default2,
      iconAlt: tr2("send.withdraw.icon_alt"),
      label: tr2("send.withdraw.label"),
      sublabel: tr2("send.withdraw.description"),
      links: [
        { label: tr2("send.withdraw.nearby_centers"), className: "hover:text-blue-500" },
        { label: tr2("common.history") }
      ]
    },
    {
      icon: billpayments_default,
      iconAlt: tr2("send.bills.icon_alt"),
      label: tr2("send.bills.label"),
      sublabel: tr2("send.bills.description"),
      links: [{ label: tr2("common.history") }],
      merchants: [
        { src: shein_default, label: "Shein" },
        { src: amazon_default, label: "Amazon" },
        { src: paypal_default, label: "Paypal" },
        { src: syriatel_default, label: "Syriatel" },
        { src: mtn_default, label: "MTN" },
        { src: netflix_default, label: "Netflix" },
        { src: youtube_default, label: "YouTube" }
      ]
    }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)("div", { className: "flex flex-col items-center px-6 pb-4 w-full max-w-md mx-auto", children: [
    /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)("div", { className: "flex flex-col items-center mb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("div", { className: "rounded-xl mb-4", children: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_image17.default, { src: send_default, alt: "Send", width: 40, height: 40 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("h2", { className: "font-quicksand text-[13px] font-medium tracking-widest text-[#1D1D1D] uppercase", children: tr2("send.header_title") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("div", { className: "w-full space-y-1", children: OPTIONS.map((option, i) => /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)(
      "div",
      {
        className: "bg-[#F8F8F8] rounded-2xl p-2 flex flex-col gap-0 cursor-pointer hover:bg-gray-100 transition-colors",
        onClick: () => {
          if (i === 0 && onNavigate) {
            onNavigate("transferSend");
          }
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)("div", { className: "flex items-end justify-between w-full", children: [
            /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("div", { className: "w-12 h-12 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(
                import_image17.default,
                {
                  src: option.icon,
                  alt: option.iconAlt,
                  width: 32,
                  height: 32
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("span", { className: "font-quicksand text-[#1D1D1D] text-[13px] font-medium", children: option.label }),
                /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("span", { className: "font-quicksand text-[11px] text-[#8D8D8D] font-normal", children: option.sublabel })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("div", { className: "flex flex-col items-end p-2 gap-1", children: option.links.map((link, j) => /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(
              "span",
              {
                className: `font-quicksand text-[11px] text-[#8D8D8D] underline whitespace-nowrap ${link.className ?? "hover:text-gray-600"}`,
                children: link.label
              },
              j
            )) })
          ] }),
          option.merchants && /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("div", { className: "flex items-center justify-between gap-1 px-3 overflow-x-auto no-scrollbar py-0", children: option.merchants.map((logo, j) => /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)(
            "div",
            {
              className: "relative w-17.5 gap-1 flex flex-col items-center",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("div", { className: "relative w-17.5 h-16 rounded-full flex items-center justify-center overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(
                  import_image17.default,
                  {
                    src: logo.src,
                    alt: logo.label,
                    fill: true,
                    className: "shadow-sm object-contain"
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("span", { className: "text-[13px] text-[#1D1D1D] font-quicksand font-normal", children: logo.label })
              ]
            },
            j
          )) })
        ]
      },
      i
    )) })
  ] });
};
var SendChoose_default = SendChoose;

// src/components/QR/send/ScannedData.tsx
var import_react35 = require("react");
var import_image18 = __toESM(require("next/image"));
var import_jsx_runtime52 = require("react/jsx-runtime");
var PROFILE_GRADIENT = "linear-gradient(135deg, #3C3C3C 0%, #b5c9c3 100%)";
var ScannedData = ({ parsedQR, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isInitialLoading, setIsInitialLoading] = (0, import_react35.useState)(true);
  const [amount, setAmount] = (0, import_react35.useState)(parsedQR.amount || "");
  const [isSending, setIsSending] = (0, import_react35.useState)(false);
  const validities = [
    { id: "Always", label: t.home.qr.validity.always },
    { id: "1m", label: t.home.qr.validity.m1 },
    { id: "3m", label: t.home.qr.validity.m3 },
    { id: "15m", label: t.home.qr.validity.m15 },
    { id: "1h", label: t.home.qr.validity.h1 },
    { id: "24h", label: t.home.qr.validity.h24 }
  ];
  const accountNumber = parsedQR.accountNumber;
  const accountName = parsedQR.accountName;
  const qrInitials = (accountName || "QR").slice(0, 2).toUpperCase();
  const canSend = !!amount && parseFloat(amount) > 0 && !isSending;
  const validityLabel = buildValidityLabel(parsedQR.validity ?? "", validities);
  (0, import_react35.useEffect)(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3e3);
    return () => clearTimeout(timer);
  }, []);
  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.warn(t.home.qr.messages.invalidAmount);
      return;
    }
    setIsSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 3e3));
      toast.success(t.home.qr.messages.transferInitiatedSuccessfully);
      onClose();
    } catch {
      toast.error(t.home.qr.messages.failedToFetchAccountData);
    } finally {
      setIsSending(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "flex flex-col items-center w-full max-w-100 mx-auto h-full relative overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "flex-1 w-full flex flex-col pt-2 overflow-hidden", children: [
      /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "flex flex-col items-center w-full", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "relative w-25 h-7", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(import_image18.default, { src: title_default, alt: "Title Icon", fill: true, className: "object-contain" }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "flex flex-col items-center w-full pt-4 pb-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "relative w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
          "div",
          {
            className: "w-full h-full flex items-center justify-center",
            style: { background: PROFILE_GRADIENT },
            children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("span", { className: "text-white text-xl font-semibold", children: qrInitials })
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("p", { className: "font-quicksand text-xs font-light text-gray-400 mt-2", children: accountName })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "flex-1 relative overflow-hidden flex flex-col pt-1", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "w-full flex flex-col h-full overflow-hidden relative", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "w-full flex-1 overflow-y-auto pb-20 transition-all duration-300", children: [
        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "pt-4 w-full", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
          AccountInfo,
          {
            hideRequired: true,
            reviewMode: true,
            accountName,
            accountNumber,
            currency: parsedQR.currency
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "w-full flex flex-col gap-4 pt-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "flex gap-2 w-full", children: [
            /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
              Input_default,
              {
                id: "send-amount-hide",
                type: "number",
                required: true,
                label: t.home.qr.enterAmount,
                placeholder: "0.00",
                value: amount,
                suffix: parsedQR.currency,
                onChange: (e) => setAmount(e.target.value),
                containerClassName: "w-1/2"
              }
            ),
            parsedQR.reference && /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                label: t.home.qr.enterReference,
                value: parsedQR.reference,
                disabled: true,
                containerClassName: "w-1/2"
              }
            )
          ] }),
          parsedQR.purpose && /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "flex gap-2 w-full", children: [
            /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                label: t.home.qr.selectPurpose,
                value: parsedQR.purpose,
                disabled: true,
                className: "text-[11px]!",
                containerClassName: "w-1/2"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
              Input_default,
              {
                hideRequired: true,
                reviewMode: true,
                label: t.home.qr.type,
                value: t.home.qr.depositRequest,
                disabled: true,
                className: "text-[11px]!",
                containerClassName: "w-1/2"
              }
            )
          ] }),
          parsedQR.note && /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(NoteField, { value: parsedQR.note, disabled: true }),
          parsedQR.validity && parsedQR.validity !== "Always" && /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
            Input_default,
            {
              hideRequired: true,
              reviewMode: true,
              label: t.home.qr.validUntil,
              value: validityLabel,
              disabled: true,
              className: "text-[11px]!",
              containerClassName: "w-1/2",
              description: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("p", { className: "font-quicksand mt-2 text-center text-[11px] font-normal text-[#1D1D1D] px-1", children: t.home.qr.validityDescription })
            }
          )
        ] })
      ] }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]", children: /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)("div", { className: "flex items-center justify-center gap-13 px-6 py-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
          ActionButton,
          {
            icon: sendT_default,
            label: `${t.home.qr.send} ${parsedQR.currency}`,
            labelColor: canSend ? "text-[#388CFF]" : void 0,
            onClick: handleSend,
            disabled: !canSend
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
          ActionButton,
          {
            icon: cancel_default,
            label: t.home.qr.cancel,
            onClick: onClose
          }
        )
      ] }) })
    ] }),
    (isInitialLoading || isSending) && /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)(
      "div",
      {
        className: `absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/65 backdrop-blur-[1px] ${isSending ? "pointer-events-auto" : "pointer-events-none"}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("div", { className: "w-12 h-12 border-4 border-emerald-200 border-t-[#3C3C3C] rounded-full animate-spin" }),
          /* @__PURE__ */ (0, import_jsx_runtime52.jsx)("p", { className: "font-quicksand text-sm font-light text-gray-700", children: t.home.qr.messages.processingTransfer })
        ]
      }
    )
  ] });
};
var ScannedData_default = ScannedData;

// src/components/QR/send/transfer/index.tsx
var import_react38 = require("react");
var import_image21 = __toESM(require("next/image"));

// src/components/QR/send/transfer/RecipientInput.tsx
var import_react36 = require("react");
var import_image19 = __toESM(require("next/image"));

// src/assets/icons/home/transfer/qrscaninput.svg
var qrscaninput_default = 'data:image/svg+xml,<svg id="Group_15219" data-name="Group 15219" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <g id="Group_15218" data-name="Group 15218">%0A    <path id="qr-code-9" d="M2.45,3.849H1.4A1.4,1.4,0,0,1,0,2.45V1.4A1.4,1.4,0,0,1,1.4,0H2.45a1.4,1.4,0,0,1,1.4,1.4V2.45A1.4,1.4,0,0,1,2.45,3.849ZM1.4,1.05a.351.351,0,0,0-.35.35V2.45a.351.351,0,0,0,.35.35H2.45a.351.351,0,0,0,.35-.35V1.4a.351.351,0,0,0-.35-.35ZM7,3.849H5.949a1.4,1.4,0,0,1-1.4-1.4V1.4A1.4,1.4,0,0,1,5.949,0H7A1.4,1.4,0,0,1,8.4,1.4V2.45A1.4,1.4,0,0,1,7,3.849Zm-1.05-2.8a.35.35,0,0,0-.35.35V2.45a.35.35,0,0,0,.35.35H7a.35.35,0,0,0,.35-.35V1.4A.35.35,0,0,0,7,1.05ZM2.45,8.4H1.4A1.4,1.4,0,0,1,0,7V5.949a1.4,1.4,0,0,1,1.4-1.4H2.45a1.4,1.4,0,0,1,1.4,1.4V7A1.4,1.4,0,0,1,2.45,8.4ZM1.4,5.6a.351.351,0,0,0-.35.35V7a.351.351,0,0,0,.35.35H2.45A.351.351,0,0,0,2.8,7V5.949a.351.351,0,0,0-.35-.35Zm4.549-.175v-.35a.525.525,0,0,0-.525-.525h-.35a.525.525,0,0,0-.525.525v.35a.525.525,0,0,0,.525.525h.35A.525.525,0,0,0,5.949,5.424ZM7,6.474A.525.525,0,1,0,6.474,7,.525.525,0,0,0,7,6.474Zm-1.05,1.4v-.35A.525.525,0,0,0,5.424,7h-.35a.525.525,0,0,0-.525.525v.35a.525.525,0,0,0,.525.525h.35A.525.525,0,0,0,5.949,7.874ZM8.4,5.424v-.35a.525.525,0,0,0-.525-.525h-.35A.525.525,0,0,0,7,5.074v.35a.525.525,0,0,0,.525.525h.35A.525.525,0,0,0,8.4,5.424Z" transform="translate(2.801 2.8)" fill="%23d3d3d3"/>%0A    <g id="Group_15216" data-name="Group 15216" transform="translate(0)">%0A      <path id="Path_23802" data-name="Path 23802" d="M3.867,2A1.867,1.867,0,0,0,2,3.867V5.733a.467.467,0,0,0,.933,0V3.867a.933.933,0,0,1,.933-.933H5.733a.467.467,0,0,0,0-.933Z" transform="translate(-2 -2)" fill="%23404040"/>%0A      <path id="Path_23803" data-name="Path 23803" d="M44.467,2a.467.467,0,1,0,0,.933h1.867a.933.933,0,0,1,.933.933V5.733a.467.467,0,0,0,.933,0V3.867A1.867,1.867,0,0,0,46.333,2Z" transform="translate(-34.2 -2)" fill="%23404040"/>%0A      <path id="Path_23804" data-name="Path 23804" d="M2.933,44.467a.467.467,0,1,0-.933,0v1.867A1.867,1.867,0,0,0,3.867,48.2H5.733a.467.467,0,0,0,0-.933H3.867a.933.933,0,0,1-.933-.933Z" transform="translate(-2 -34.2)" fill="%23404040"/>%0A      <path id="Path_23805" data-name="Path 23805" d="M48.2,44.467a.467.467,0,0,0-.933,0v1.867a.933.933,0,0,1-.933.933H44.467a.467.467,0,0,0,0,.933h1.867A1.867,1.867,0,0,0,48.2,46.333Z" transform="translate(-34.2 -34.2)" fill="%23404040"/>%0A    </g>%0A  </g>%0A  <path id="Path_15626" data-name="Path 15626" d="M13.208,14.583H3.292a.292.292,0,0,1,0-.583h9.916a.292.292,0,0,1,0,.583Z" transform="translate(-1.25 -5.857)" fill="%23fc3434"/>%0A</svg>%0A';

// src/assets/icons/home/transfer/phone.svg
var phone_default = 'data:image/svg+xml,<svg id="Group_2889" data-name="Group 2889" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <path id="Path_13937" data-name="Path 13937" d="M182.68,116.627a.414.414,0,0,0-.042.141.34.34,0,1,0,.677.056.691.691,0,0,1,.014-.155v-.155a3.728,3.728,0,0,0-.2-1.184,3.517,3.517,0,0,0-2.4-2.214,3.74,3.74,0,0,0-.888-.113,2.39,2.39,0,0,0-.31.014l-.3.042a.329.329,0,0,0,.113.649,1.386,1.386,0,0,1,.24-.028h.042c.07,0,.141-.014.211-.014a2.79,2.79,0,0,1,2,.832,2.841,2.841,0,0,1,.832,1.974v.155Z" transform="translate(-172.971 -109.255)" fill="%23d3d3d3"/>%0A  <path id="Path_13938" data-name="Path 13938" d="M175.279,65.612a.34.34,0,1,0,.677.056c.014-.155.014-.31.014-.465a6.317,6.317,0,0,0-.071-.9,5.408,5.408,0,0,0-4.893-4.484c-.141-.014-.3-.014-.437-.014s-.31,0-.465.014-.31.028-.465.056a.329.329,0,1,0,.113.649l.282-.042c.042,0,.085-.014.127-.014.141-.014.282-.014.409-.014a4.859,4.859,0,0,1,1.368.2,4.687,4.687,0,0,1,1.988,1.184,4.843,4.843,0,0,1,1.057,1.593,4.765,4.765,0,0,1,.338,1.748v.141A1.152,1.152,0,0,0,175.279,65.612Z" transform="translate(-163.902 -57.871)" fill="%23d3d3d3"/>%0A  <path id="Path_13939" data-name="Path 13939" d="M166.111,7.16A7.32,7.32,0,0,0,160.908,5c-.211,0-.423.014-.634.028a4.891,4.891,0,0,0-.634.085.329.329,0,0,0,.113.649l.282-.042a2.1,2.1,0,0,1,.3-.028c.2-.014.381-.028.578-.028a6.643,6.643,0,0,1,6.655,6.655v.31c0,.085-.014.169-.014.268a.34.34,0,1,0,.677.056c.014-.211.028-.423.028-.62A7.3,7.3,0,0,0,166.111,7.16Z" transform="translate(-154.255 -5.003)" fill="%23d3d3d3"/>%0A  <path id="Path_13940" data-name="Path 13940" d="M13.49,29.361l-2.407-1.324c-.8-.446-.83-.153-1.673.767-.2.223-.585.808-1.034.7a9.87,9.87,0,0,1-3.264-2.286,7.8,7.8,0,0,1-1.455-2.244c-.027-.725,1.523-1.087,1.02-2.467L3.6,20.036C2.6,17.667-.218,21.458.013,23.228c.6,4.363,8.064,11.416,12.226,9.088C13.164,31.787,14.415,29.933,13.49,29.361Z" transform="translate(0 -18.776)" fill="%23d3d3d3"/>%0A</svg>%0A';

// src/assets/icons/home/transfer/info.svg
var info_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">%0A  <g id="Group_10807" data-name="Group 10807" transform="translate(-65)">%0A    <g id="Group_10756" data-name="Group 10756" transform="translate(65)">%0A      <path id="Subtraction_1" data-name="Subtraction 1" d="M.305,11.241a.3.3,0,0,1-.182-.063.338.338,0,0,1-.111-.353L.787,8.273A5.591,5.591,0,0,1,0,5.408,5.313,5.313,0,0,1,5.2,0a5.313,5.313,0,0,1,5.2,5.408,5.314,5.314,0,0,1-5.2,5.41,5.064,5.064,0,0,1-2.917-.926L.478,11.187A.278.278,0,0,1,.305,11.241Zm4.847-3.1a.666.666,0,1,0,.656.666A.652.652,0,0,0,5.152,8.145Zm.134-5.308A1.026,1.026,0,0,1,6.4,3.864c0,.5-.213.816-.815,1.194a1.672,1.672,0,0,0-.953,1.5v.118c0,.373.2.6.521.6.3,0,.47-.189.5-.548.024-.519.211-.78.833-1.162A1.964,1.964,0,0,0,5.331,1.887a2.1,2.1,0,0,0-2.05,1.146,1.384,1.384,0,0,0-.135.6.45.45,0,0,0,.482.506c.261,0,.407-.126.5-.434A1.109,1.109,0,0,1,5.286,2.837Z" transform="translate(0 2.758)" fill="%23d3d3d3"/>%0A      <path id="Path_21380" data-name="Path 21380" d="M11.934,11.258a.3.3,0,0,1-.184.064.277.277,0,0,1-.171-.055L9.773,9.973l-.02.013a6.2,6.2,0,0,0,.469-2.376A5.937,5.937,0,0,0,4.41,1.564a5.512,5.512,0,0,0-1.277.148A5.047,5.047,0,0,1,6.857.079a5.314,5.314,0,0,1,5.2,5.409,5.574,5.574,0,0,1-.787,2.864l.775,2.554a.335.335,0,0,1-.11.352Z" transform="translate(0.79 0.557)" fill="%23d3d3d3"/>%0A      <rect id="Rectangle_4714" data-name="Rectangle 4714" width="13.459" height="14" transform="translate(0.541)" fill="none"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/home/transfer/close.svg
var close_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">%0A  <g id="Group_12303" data-name="Group 12303" transform="translate(-385 -64.641)">%0A    <circle id="Ellipse_273" data-name="Ellipse 273" cx="8" cy="8" r="8" transform="translate(385 64.641)" fill="%23f8f8f8"/>%0A    <path id="Ellipse_273_-_Outline" data-name="Ellipse 273 - Outline" d="M7.808.39a7.417,7.417,0,1,0,7.417,7.417A7.426,7.426,0,0,0,7.808.39m0-.39A7.808,7.808,0,1,1,0,7.808,7.808,7.808,0,0,1,7.808,0Z" transform="translate(385 65.025)" fill="%231d1d1d"/>%0A    <g id="Group_10735" data-name="Group 10735" transform="translate(388.354 68.377)">%0A      <path id="Line_792" data-name="Line 792" d="M.39.781A.39.39,0,0,1,.39,0H11.244a.39.39,0,0,1,0,.781Z" transform="matrix(0.695, -0.719, 0.719, 0.695, 0.134, 8.369)" fill="%23505050"/>%0A      <path id="Line_793" data-name="Line 793" d="M11.244.781H.39A.39.39,0,1,1,.39,0H11.244a.39.39,0,0,1,0,.781Z" transform="matrix(0.719, 0.695, -0.695, 0.719, 0.542, 0.134)" fill="%23505050"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/transfer/RecipientInput.tsx
var import_jsx_runtime53 = require("react/jsx-runtime");
var RecipientInput = ({
  value,
  onChange,
  onValidate,
  recipientDetails,
  isValidating,
  error,
  currencyWarning,
  accountConfirmed,
  onEdit,
  inputMode,
  onModeChange,
  onPaste,
  onScanQR,
  inputMethod,
  disabled
}) => {
  const { t, rtl } = useTranslation();
  const inputRef = (0, import_react36.useRef)(null);
  const shouldFocusAfterEditRef = (0, import_react36.useRef)(false);
  (0, import_react36.useEffect)(() => {
    if (error && !accountConfirmed && !disabled) {
      inputRef.current?.focus();
    }
  }, [error, accountConfirmed, disabled]);
  (0, import_react36.useEffect)(() => {
    if (!accountConfirmed && shouldFocusAfterEditRef.current && !disabled) {
      const frameId = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      shouldFocusAfterEditRef.current = false;
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [accountConfirmed, disabled]);
  const handleEditClick = () => {
    shouldFocusAfterEditRef.current = true;
    onEdit();
  };
  const handleKeyDown = (e) => {
    if (inputMode === "account") {
      const start = e.currentTarget.selectionStart ?? 0;
      const end = e.currentTarget.selectionEnd ?? 0;
      const isCollapsed = start === end;
      if (e.key === "Backspace" && isCollapsed && value.endsWith("-") && start === value.length) {
        e.preventDefault();
        onChange(value.slice(0, -2));
        return;
      }
      if (e.key === "Backspace" && isCollapsed && start > 0 && value[start - 1] === "-") {
        e.preventDefault();
        onChange(`${value.slice(0, start - 1)}${value.slice(start)}`);
        return;
      }
      if (e.key === "Delete" && isCollapsed && value[start] === "-") {
        e.preventDefault();
        onChange(`${value.slice(0, start)}${value.slice(start + 1)}`);
        return;
      }
    }
    if (e.key === "Enter") {
      onValidate();
    }
  };
  const formatAccountForTyping = (rawValue) => {
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 8);
    if (digitsOnly.length < 4) return digitsOnly;
    if (digitsOnly.length === 4) return `${digitsOnly}-`;
    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
  };
  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    if (inputMode !== "account") {
      onChange(nextValue);
      return;
    }
    const nativeInputEvent = e.nativeEvent;
    const isPaste = nativeInputEvent.inputType === "insertFromPaste";
    const isDelete = nativeInputEvent.inputType?.startsWith("delete");
    if (isPaste) {
      onChange(nextValue);
      return;
    }
    if (isDelete && /^\d{4}$/.test(nextValue)) {
      onChange(nextValue);
      return;
    }
    onChange(formatAccountForTyping(nextValue));
  };
  const handleClear = () => {
    onChange("");
  };
  if (accountConfirmed && recipientDetails) {
    return /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: "flex flex-col gap-0 rounded-[15px] w-full p-2 bg-[#F7F7F7]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
          "button",
          {
            onClick: handleEditClick,
            className: "cursor-pointer text-[11px] text-[#388CFF] font-medium",
            children: t.transfer.recipient.edit
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("span", { className: "text-[11px] text-[#8D8D8D] font-medium", children: t.transfer.recipient.recipientAccountNumber }),
        /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(import_image19.default, { width: 14, height: 14, src: info_default, alt: "Info" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: "flex items-center gap-1", children: [
        inputMethod === "QR" && /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
          import_image19.default,
          {
            src: qrinputmethod_default,
            alt: "QR Input",
            width: 14,
            height: 14,
            className: "object-contain shrink-0"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("p", { className: "text-[13px] mt-2 font-medium text-[#1D1D1D]", children: [
          recipientDetails.accountNumber,
          " ",
          recipientDetails.maskedName
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("div", { className: "flex flex-col gap-1", children: /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)(
    "div",
    {
      onClick: () => inputRef.current?.focus(),
      className: `relative h-13.3 flex flex-col gap-1 rounded-[15px] w-full p-2 bg-white border border-[#d3d3d35e] focus-within:border-[#388CFF] transition-colors ${error ? "border-[#FF5F61]!" : ""}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: "relative", children: [
          /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("span", { className: "text-[11px] text-[#1D1D1D] font-medium", children: t.transfer.recipient.enter }),
            /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)(import_jsx_runtime53.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
                "button",
                {
                  onClick: () => onModeChange("account"),
                  className: `text-[11px] font-medium transition-colors ${inputMode === "account" ? "text-[#1D1D1D]" : "text-[#d3d3d35e] cursor-pointer underline"}`,
                  children: t.transfer.recipient.recipientAccount
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("span", { className: "text-[11px] text-[#1D1D1D] font-medium", children: t.transfer.recipient.or }),
              /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(import_image19.default, { width: 14, height: 14, src: phone_default, alt: "Phone Input" }),
              /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
                "button",
                {
                  onClick: () => onModeChange("phone"),
                  className: `text-[11px] font-medium transition-colors ${inputMode === "phone" ? "text-[#388CFF]" : "text-[#d3d3d35e] cursor-pointer underline"}`,
                  children: t.transfer.recipient.phoneNumber
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(import_image19.default, { width: 14, height: 14, src: info_default, alt: "Info" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: `flex items-center gap-1 ${rtl ? "pl-15.5" : "pr-15.5"}`, children: [
            inputMode === "phone" && /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("span", { className: "text-[13px] font-medium text-[#1D1D1D]", children: "+" }),
            /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
              "input",
              {
                ref: inputRef,
                type: inputMode === "phone" ? "tel" : "text",
                value,
                onChange: handleInputChange,
                onKeyDown: handleKeyDown,
                disabled,
                placeholder: inputMode === "phone" ? t.transfer.recipient.placeholderPhone : t.transfer.recipient.placeholderAccount,
                className: `flex-1 min-w-0 text-[13px] mt-1 font-medium text-[#1D1D1D] hover:outline-0 focus:outline-0 focus:ring-0 bg-transparent placeholder:text-[13px] placeholder:text-light placeholder:text-[#d3d3d35e] ${error ? "caret-[#FF5F61]" : "caret-[#388CFF]"} disabled:opacity-50`
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("div", { className: `absolute ${rtl ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 flex flex-col items-end justify-center gap-1 shrink-0`, children: isValidating ? /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("div", { className: "w-4 h-4 border-2 border-gray-200 border-t-[#3C3C3C] rounded-full animate-spin shrink-0" }) : !value ? inputMode === "account" && /* @__PURE__ */ (0, import_jsx_runtime53.jsxs)("div", { className: "flex items-center justify-end gap-3", children: [
            onPaste && /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
              "button",
              {
                onClick: onPaste,
                className: "cursor-pointer text-[11px] text-[#388CFF] font-medium",
                children: t.transfer.recipient.paste
              }
            ),
            onScanQR && /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
              "button",
              {
                onClick: onScanQR,
                className: "cursor-pointer text-[#8D8D8D] hover:text-[#1D1D1D] transition-colors flex items-center justify-center",
                "aria-label": t.common.accessibility.scanQrCode,
                children: /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
                  import_image19.default,
                  {
                    width: 14,
                    height: 14,
                    src: qrscaninput_default,
                    alt: "scan qr",
                    className: " object-contain"
                  }
                )
              }
            )
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
            "button",
            {
              onClick: handleClear,
              className: "text-[#8D8D8D] hover:text-[#1D1D1D] transition-colors shrink-0 w-5 h-5 flex items-center justify-center",
              "aria-label": t.common.accessibility.clearInput,
              children: /* @__PURE__ */ (0, import_jsx_runtime53.jsx)(
                import_image19.default,
                {
                  width: 14,
                  height: 14,
                  src: close_default,
                  alt: "clear input",
                  className: "w-4 h-4 object-contain"
                }
              )
            }
          ) })
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("div", { className: "bg-red-50 rounded-xl px-4 py-2.5 mt-1", children: /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("p", { className: "text-[11px] text-red-500 font-medium text-center", children: error }) }),
        currencyWarning && !error && /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("div", { className: "bg-amber-50 rounded-xl px-4 py-2.5 mt-1", children: /* @__PURE__ */ (0, import_jsx_runtime53.jsx)("p", { className: "text-[11px] text-amber-600 font-medium text-center", children: currencyWarning }) })
      ]
    }
  ) });
};
var RecipientInput_default = RecipientInput;

// src/components/QR/send/transfer/AmountInput.tsx
var import_react37 = require("react");
var import_jsx_runtime54 = require("react/jsx-runtime");
var AmountInput = ({
  value,
  onChange,
  onValidate,
  amountConfirmed,
  onEdit,
  error,
  isChecking,
  currency,
  disabled
}) => {
  const { t } = useTranslation();
  const debounceRef = (0, import_react37.useRef)(null);
  const inputRef = (0, import_react37.useRef)(null);
  (0, import_react37.useEffect)(() => {
    if (amountConfirmed || disabled || !value.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onValidate();
    }, 2e3);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, amountConfirmed, disabled, onValidate]);
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onValidate();
    }
  };
  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim()) {
      onValidate();
    }
  };
  (0, import_react37.useEffect)(() => {
    if (error && !amountConfirmed && !disabled) {
      inputRef.current?.focus();
    }
  }, [error, amountConfirmed, disabled]);
  if (amountConfirmed) {
    return /* @__PURE__ */ (0, import_jsx_runtime54.jsxs)("div", { className: "flex flex-col gap-1 rounded-[15px] w-full p-2 bg-[#F7F7F7] border border-[#d3d3d35e]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime54.jsxs)("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("button", { onClick: onEdit, className: "text-[11px] text-[#388CFF] font-medium", children: t.transfer.amountInput.edit }),
        /* @__PURE__ */ (0, import_jsx_runtime54.jsx)(
          "span",
          {
            className: `text-[11px] ${disabled ? "text-[#8D8D8D]" : "text-[#1D1D1D]"} font-medium`,
            children: t.transfer.amountInput.title
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime54.jsxs)("p", { className: "text-[13px] font-medium text-[#1D1D1D]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime54.jsxs)("span", { className: "text-[13px] font-bold text-[#1D1D1D]", children: [
          value,
          " "
        ] }),
        "  ",
        currency
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("div", { className: "flex flex-col gap-1", children: /* @__PURE__ */ (0, import_jsx_runtime54.jsxs)(
    "div",
    {
      onClick: () => inputRef.current?.focus(),
      className: `relative flex flex-col h-13.3 gap-0 rounded-[15px] w-full p-2 bg-white border border-[#d3d3d35e] focus-within:border-[#388CFF] transition-colors ${error ? "border-[#FF5F61]!" : ""}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime54.jsx)(
          "span",
          {
            className: `text-[11px] ${disabled ? "text-[#8D8D8D]" : "text-[#1D1D1D]"} font-medium`,
            children: t.transfer.amountInput.placeholder
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime54.jsxs)("div", { className: "flex items-center gap-1 cursor-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime54.jsx)(
            "input",
            {
              ref: inputRef,
              type: "number-hide",
              size: Math.max(value.length, 6),
              value,
              onChange: (e) => onChange(e.target.value),
              onKeyDown: handleKeyDown,
              onBlur: handleBlur,
              disabled,
              placeholder: "000,000",
              className: `w-auto min-w-0 text-[13px] font-medium text-[#1D1D1D] hover:outline-0 focus:outline-0 focus:ring-0 bg-transparent  ${error ? "caret-[#FF5F61]" : "caret-[#388CFF]"} disabled:opacity-50`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("span", { className: "text-[13px] font-medium text-[#1D1D1D] shrink-0", children: currency }),
          /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("div", { className: "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-end justify-center gap-1 shrink-0", children: isChecking && /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("div", { className: "w-4 h-4 border-2 border-gray-200 border-t-[#3C3C3C] rounded-full animate-spin shrink-0" }) })
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("div", { className: "bg-red-50 rounded-xl px-4 py-2.5 mt-1", children: /* @__PURE__ */ (0, import_jsx_runtime54.jsx)("p", { className: "text-[11px] text-red-500 font-medium text-center", children: error }) })
      ]
    }
  ) });
};
var AmountInput_default = AmountInput;

// src/components/QR/send/transfer/PurposeSelect.tsx
var import_image20 = __toESM(require("next/image"));

// src/assets/icons/home/transfer/note.svg
var note_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4561" data-name="Rectangle 4561" width="16" height="16" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_885" data-name="Mask Group 885" clip-path="url(%23clip-path)">%0A    <g id="layer1" transform="translate(1.053 0.001)">%0A      <path id="path823" d="M12.776.535A1.6,1.6,0,0,0,11.669,1L10.444,2.224l3.33,3.33L15,4.33a1.61,1.61,0,0,0,0-2.263S13.93,1,13.929,1A1.589,1.589,0,0,0,12.776.535ZM9.69,2.978,2.067,10.6a1.609,1.609,0,0,0-.469,1.13v2.133a.533.533,0,0,0,.536.535l2.133,0a1.6,1.6,0,0,0,1.126-.465l7.628-7.624ZM2.08,15.467h0a.534.534,0,0,0,.055,1.067h12.8a.533.533,0,1,0,0-1.067H2.08Z" transform="translate(-1.584 -0.535)" fill="%23d3d3d3"/>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/QR/send/transfer/PurposeSelect.tsx
var import_jsx_runtime55 = require("react/jsx-runtime");
var PurposeSelect = ({ selectedId, onSelect, note, onChangeNote }) => {
  const { tr: tr2 } = useTranslation();
  const { purposes, isLoading, error, retry } = useTransferPurposes();
  const borderColor = "border-[#d3d3d35e]";
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime55.jsxs)("div", { className: "flex flex-col gap-2 px-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime55.jsx)("span", { className: "text-[11px] text-[#8D8D8D] font-medium", children: tr2("send.purpose_select_label") }),
      /* @__PURE__ */ (0, import_jsx_runtime55.jsx)("div", { className: "flex gap-2", children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime55.jsx)(
        "div",
        {
          className: "h-8 w-28 rounded-full bg-gray-100 animate-pulse shrink-0"
        },
        i
      )) })
    ] });
  }
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_runtime55.jsxs)("div", { className: "flex flex-col gap-2 px-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime55.jsx)("span", { className: "text-[11px] text-[#8D8D8D] font-medium", children: tr2("send.purpose_select_label") }),
      /* @__PURE__ */ (0, import_jsx_runtime55.jsxs)("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime55.jsx)("span", { className: "text-[12px] text-red-500", children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime55.jsx)(
          "button",
          {
            onClick: retry,
            className: "px-3 py-1 rounded-full text-[12px] font-medium bg-[#F8F8F8] text-[#1D1D1D] border border-[#E8E8E8] hover:bg-gray-100 shrink-0",
            children: tr2("common.retry")
          }
        )
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime55.jsxs)("div", { className: `flex rounded-[15px] p-2
                border ${borderColor} bg-[#FFFFFF]
             flex-col gap-1.5 `, children: [
    /* @__PURE__ */ (0, import_jsx_runtime55.jsx)(
      Select_default,
      {
        required: true,
        hideRequired: true,
        label: tr2("send.purpose_select_label"),
        options: purposes,
        value: selectedId ?? void 0,
        onChange: (id) => {
          const opt = purposes.find((o) => o.id === id);
          if (opt) onSelect(id, opt.label);
        },
        variant: "tag"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime55.jsxs)("div", { className: "mt-1 flex items-center gap-2 px-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime55.jsx)(import_image20.default, { width: 16, height: 16, src: note_default, alt: "Note Icon" }),
      /* @__PURE__ */ (0, import_jsx_runtime55.jsx)(
        "input",
        {
          type: "text",
          value: note,
          onChange: onChangeNote,
          placeholder: tr2("send.note_placeholder"),
          className: "flex-1 text-[12px] text-[#1D1D1D] placeholder:text-[#CCCCCC] bg-transparent focus:outline-0"
        }
      )
    ] })
  ] });
};
var PurposeSelect_default = PurposeSelect;

// src/components/QR/send/transfer/TransferSuccess.tsx
var import_jsx_runtime56 = require("react/jsx-runtime");
var TransferSuccess = ({
  transferResult,
  senderAccountNumber,
  senderMaskedName,
  recipientAccountNumber,
  recipientMaskedName,
  amount,
  currency,
  purposeLabel,
  inputMethod,
  onClose
}) => {
  const receiptData = {
    referenceCode: transferResult.transferId,
    createdAt: transferResult.createdAt,
    status: transferResult.status,
    senderAccountNumber,
    senderMaskedName,
    recipientAccountNumber,
    recipientMaskedName,
    amount,
    currency,
    purposeLabel: purposeLabel || transferResult.purpose,
    inputMethod
  };
  return /* @__PURE__ */ (0, import_jsx_runtime56.jsx)(SuccessReceipt_default, { data: receiptData, onClose });
};
var TransferSuccess_default = TransferSuccess;

// src/components/QR/send/transfer/types.ts
var initialFormState = {
  recipientAccountNumber: "",
  recipientDetails: null,
  amount: "",
  amountConfirmed: false,
  selectedPurposeId: null,
  note: "",
  isValidatingAccount: false,
  isCheckingBalance: false,
  isSending: false,
  isSuccess: false,
  transferResult: null,
  verifyResult: null,
  accountError: null,
  amountError: null,
  currencyWarning: null,
  recipientInputMode: "account",
  accountConfirmed: false,
  editingAfterConfirm: false,
  inputMethod: "MANUAL"
};

// src/components/QR/send/transfer/index.tsx
var import_jsx_runtime57 = require("react/jsx-runtime");
var TransferSend = ({ onClose }) => {
  const actions = useActions();
  const { activeAssetSymbol, activeAssetType, balances, refreshTransactions, refreshBalances } = useStore();
  const { toast } = useToast();
  const { openScannerWithCallback } = useScanner();
  const { t, tr: tr2 } = useTranslation();
  const [form, setForm] = (0, import_react38.useState)(initialFormState);
  const [selectedPurposeName, setSelectedPurposeName] = (0, import_react38.useState)("");
  const [pendingQrValidation, setPendingQrValidation] = (0, import_react38.useState)(null);
  const [pendingPasteValidation, setPendingPasteValidation] = (0, import_react38.useState)(null);
  const recipientValidateDebounceRef = (0, import_react38.useRef)(null);
  const senderBalance = activeAssetSymbol ? balances[activeAssetSymbol] : void 0;
  const assetSymbol = activeAssetSymbol || "USD";
  const assetType = activeAssetType?.toUpperCase() || "CURRENCY";
  const senderAccountNumber = senderBalance?.accountNumber || "1000-1128";
  const senderMaskedName = "M***** A*****";
  const validateAccountFormat = (value) => {
    if (!value) return null;
    if (!/^\d{4}-\d{4}$/.test(value)) {
      return t.transfer.error.incorrectFormat;
    }
    return null;
  };
  const validateAccountByNumber = (0, import_react38.useCallback)(
    async (accountNumber) => {
      const value = accountNumber.trim();
      if (!value) return;
      const formatError = validateAccountFormat(value);
      if (formatError) {
        setForm((prev) => ({ ...prev, accountError: formatError }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        isValidatingAccount: true,
        accountError: null,
        currencyWarning: null
      }));
      try {
        const cleaned = value.replace(/-/g, "");
        const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
        const result = await actions.banking.validateRecipientAccount({
          accountNumber: formatted
        });
        if ("error" in result) {
          setForm((prev) => ({
            ...prev,
            isValidatingAccount: false,
            accountError: result.error,
            recipientDetails: null,
            accountConfirmed: false
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            isValidatingAccount: false,
            recipientDetails: result,
            accountConfirmed: true,
            accountError: null,
            currencyWarning: null
          }));
        }
      } catch {
        setForm((prev) => ({
          ...prev,
          isValidatingAccount: false,
          accountError: t.transfer.error.validateAccount
        }));
      }
    },
    [actions]
  );
  (0, import_react38.useEffect)(() => {
    if (pendingQrValidation) {
      validateAccountByNumber(pendingQrValidation);
      setPendingQrValidation(null);
    }
  }, [pendingQrValidation, validateAccountByNumber]);
  (0, import_react38.useEffect)(() => {
    if (pendingPasteValidation) {
      validateAccountByNumber(pendingPasteValidation);
      setPendingPasteValidation(null);
    }
  }, [pendingPasteValidation, validateAccountByNumber]);
  (0, import_react38.useEffect)(() => {
    const value = form.recipientAccountNumber;
    if (recipientValidateDebounceRef.current) {
      clearTimeout(recipientValidateDebounceRef.current);
      recipientValidateDebounceRef.current = null;
    }
    if (form.accountConfirmed || form.isValidatingAccount || form.editingAfterConfirm || form.accountError)
      return;
    if (form.recipientInputMode !== "account") return;
    if (/^\d{4}-\d{4}$/.test(value)) {
      recipientValidateDebounceRef.current = setTimeout(() => {
        validateAccountByNumber(value);
      }, 500);
    }
    return () => {
      if (recipientValidateDebounceRef.current) {
        clearTimeout(recipientValidateDebounceRef.current);
        recipientValidateDebounceRef.current = null;
      }
    };
  }, [
    form.recipientAccountNumber,
    form.accountConfirmed,
    form.isValidatingAccount,
    form.editingAfterConfirm,
    form.accountError,
    form.recipientInputMode,
    validateAccountByNumber
  ]);
  const handleValidateAccount = (0, import_react38.useCallback)(async () => {
    const value = form.recipientAccountNumber.trim();
    if (!value) return;
    if (form.recipientInputMode === "account") {
      const formatError = validateAccountFormat(value);
      if (formatError) {
        setForm((prev) => ({ ...prev, accountError: formatError }));
        return;
      }
    }
    setForm((prev) => ({
      ...prev,
      isValidatingAccount: true,
      accountError: null,
      currencyWarning: null
    }));
    try {
      let result;
      if (form.recipientInputMode === "phone") {
        result = await actions.banking.lookupAccountByPhone({ phoneNumber: value });
      } else {
        const cleaned = value.replace(/-/g, "");
        const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
        result = await actions.banking.validateRecipientAccount({
          accountNumber: formatted
        });
      }
      if ("error" in result) {
        setForm((prev) => ({
          ...prev,
          isValidatingAccount: false,
          accountError: result.error,
          recipientDetails: null,
          accountConfirmed: false
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          isValidatingAccount: false,
          recipientDetails: result,
          accountConfirmed: true,
          accountError: null,
          currencyWarning: null
        }));
      }
    } catch {
      setForm((prev) => ({
        ...prev,
        isValidatingAccount: false,
        accountError: t.transfer.error.validateAccount
      }));
    }
  }, [form.recipientAccountNumber, form.recipientInputMode, actions]);
  const handleValidateAmount = (0, import_react38.useCallback)(async () => {
    const value = form.amount.trim();
    if (!value || !form.recipientDetails) return;
    const numAmount = parseFloat(value);
    if (isNaN(numAmount) || numAmount <= 0) {
      setForm((prev) => ({ ...prev, amountError: t.transfer.error.invalidAmount }));
      return;
    }
    setForm((prev) => ({ ...prev, isCheckingBalance: true, amountError: null }));
    console.log(
      "Verifying transfer with amount:",
      numAmount,
      "to account:",
      form.recipientDetails.accountNumber,
      "asset:",
      assetSymbol,
      "type:",
      assetType
    );
    try {
      const result = await actions.transactions.verifyTransfer({
        toAccountNumber: form.recipientDetails.accountNumber,
        assetSymbol,
        assetType,
        amount: numAmount,
        senderAvailableBalance: senderBalance?.available
      });
      if ("error" in result) {
        setForm((prev) => ({
          ...prev,
          isCheckingBalance: false,
          amountError: result.error,
          amountConfirmed: false,
          verifyResult: null
        }));
      } else if (!result.valid) {
        setForm((prev) => ({
          ...prev,
          isCheckingBalance: false,
          amountError: tr2("transfer.amountInput.error.insufficient", {
            amount: result.sender.availableBalance,
            currency: result.currency.symbol
          }),
          amountConfirmed: false,
          verifyResult: null
        }));
      } else if (numAmount > result.sender.availableBalance) {
        setForm((prev) => ({
          ...prev,
          isCheckingBalance: false,
          amountError: tr2("transfer.amountInput.error.insufficient", {
            amount: result.sender.availableBalance,
            currency: result.currency.symbol
          }),
          amountConfirmed: false,
          verifyResult: null
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          isCheckingBalance: false,
          amountConfirmed: true,
          amountError: null,
          verifyResult: result
        }));
      }
    } catch {
      setForm((prev) => ({
        ...prev,
        isCheckingBalance: false,
        amountError: t.transfer.error.verifyTransfer
      }));
    }
  }, [form.amount, form.recipientDetails, actions, assetSymbol, assetType]);
  const handleEditAccount = () => {
    setForm((prev) => ({
      ...prev,
      accountConfirmed: false,
      recipientDetails: null,
      accountError: null,
      currencyWarning: null,
      amount: "",
      amountConfirmed: false,
      amountError: null,
      selectedPurposeId: null,
      editingAfterConfirm: true,
      verifyResult: null
    }));
  };
  const handleEditAmount = () => {
    setForm((prev) => ({
      ...prev,
      amountConfirmed: false,
      amountError: null,
      selectedPurposeId: null,
      verifyResult: null
    }));
  };
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setForm((prev) => ({
          ...prev,
          recipientAccountNumber: trimmed,
          accountError: null,
          inputMethod: "MANUAL"
        }));
        setPendingPasteValidation(trimmed);
      }
    } catch {
    }
  };
  const handleScanQR = () => {
    console.log("Opening QR scanner for transfer...");
    openScannerWithCallback((accountNumber) => {
      console.log("Scanned QR result:", accountNumber);
      setForm((prev) => ({
        ...prev,
        recipientAccountNumber: accountNumber,
        accountError: null,
        currencyWarning: null,
        inputMethod: "QR"
      }));
      setPendingQrValidation(accountNumber);
    });
  };
  const handleSend = async () => {
    if (!form.recipientDetails || !form.amountConfirmed || !form.selectedPurposeId) return;
    setForm((prev) => ({ ...prev, isSending: true }));
    try {
      const idempotencyKey = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const result = await actions.transactions.SendTransfer({
        toAccountNumber: form.recipientDetails.accountNumber,
        assetSymbol,
        assetType,
        amount: parseFloat(form.amount),
        purposeId: form.selectedPurposeId,
        note: form.note || void 0,
        inputMethod: form.inputMethod,
        idempotencyKey
      });
      if ("error" in result) {
        setForm((prev) => ({ ...prev, isSending: false }));
        toast.error(result.error);
      } else {
        refreshTransactions(actions);
        refreshBalances(actions);
        setForm((prev) => ({
          ...prev,
          isSending: false,
          isSuccess: true,
          transferResult: result
        }));
      }
    } catch {
      setForm((prev) => ({ ...prev, isSending: false }));
      toast.error(t.transfer.error.generic);
    }
  };
  const canSend = form.accountConfirmed && form.amountConfirmed && !!form.selectedPurposeId;
  const purposeLabel = selectedPurposeName || form.selectedPurposeId || "";
  if (form.isSuccess && form.transferResult) {
    return /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "w-full h-full overflow-y-auto", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "max-w-93.75 mx-auto h-full", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(
      TransferSuccess_default,
      {
        transferResult: form.transferResult,
        senderAccountNumber,
        senderMaskedName,
        recipientAccountNumber: form.recipientDetails?.accountNumber || "",
        recipientMaskedName: form.recipientDetails?.maskedName || "",
        amount: form.amount,
        currency: assetSymbol,
        purposeLabel,
        inputMethod: form.inputMethod,
        onClose
      }
    ) }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "w-full h-full overflow-y-auto relative flex flex-col", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsxs)("div", { className: "max-w-93.75 mx-auto relative w-full text-white flex flex-col flex-1", children: [
    /* @__PURE__ */ (0, import_jsx_runtime57.jsxs)("div", { className: "flex flex-col items-center mb-4 pt-0", children: [
      /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "mb-1", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(import_image21.default, { src: sendT_default, alt: "Transfer", width: 40, height: 40 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("h2", { className: "font-quicksand text-[13px] font-medium tracking-widest text-[#1D1D1D] uppercase", children: t.transfer.title })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(SenderCard_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("p", { className: "text-[11px] text-[#1D1D1D] font-medium text-center mt-2 mb-2", children: t.transfer.sendTo }),
    /* @__PURE__ */ (0, import_jsx_runtime57.jsxs)("div", { className: "overflow-auto pb-20", children: [
      /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(
        RecipientInput_default,
        {
          value: form.recipientAccountNumber,
          onChange: (value) => setForm((prev) => ({
            ...prev,
            recipientAccountNumber: value,
            accountError: null,
            currencyWarning: null,
            inputMethod: "MANUAL",
            editingAfterConfirm: false
          })),
          onValidate: handleValidateAccount,
          recipientDetails: form.recipientDetails,
          isValidating: form.isValidatingAccount,
          error: form.accountError,
          currencyWarning: form.currencyWarning,
          accountConfirmed: form.accountConfirmed,
          onEdit: handleEditAccount,
          inputMode: form.recipientInputMode,
          onModeChange: (mode) => setForm((prev) => ({
            ...prev,
            recipientInputMode: mode,
            recipientAccountNumber: "",
            accountError: null
          })),
          editingAfterConfirm: form.editingAfterConfirm,
          onPaste: handlePaste,
          onScanQR: handleScanQR,
          inputMethod: form.inputMethod,
          disabled: form.isValidatingAccount || form.isSending
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "mt-1", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(
        AmountInput_default,
        {
          value: form.amount,
          onChange: (value) => setForm((prev) => ({
            ...prev,
            amount: value,
            amountError: null
          })),
          onValidate: handleValidateAmount,
          amountConfirmed: form.amountConfirmed,
          onEdit: handleEditAmount,
          error: form.amountError,
          isChecking: form.isCheckingBalance,
          currency: assetSymbol,
          disabled: !form.accountConfirmed || form.isValidatingAccount || form.isSending
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "mt-1", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(
        PurposeSelect_default,
        {
          selectedId: form.selectedPurposeId,
          onSelect: (id, name) => {
            setForm((prev) => ({ ...prev, selectedPurposeId: id }));
            setSelectedPurposeName(name);
          },
          onChangeNote: (e) => setForm((prev) => ({ ...prev, note: e.target.value })),
          note: form.note
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "flex-1" }),
    /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("div", { className: "flex w-full bg-white flex-col absolute bottom-0 items-center py-6 mt-4", children: /* @__PURE__ */ (0, import_jsx_runtime57.jsxs)(
      "button",
      {
        onClick: handleSend,
        disabled: !canSend || form.isSending,
        className: `flex flex-col items-center gap-1 transition-colors ${canSend && !form.isSending ? "text-[#388CFF] cursor-pointer" : "text-[#CCCCCC]"}`,
        children: [
          canSend ? /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(import_image21.default, { src: transfer_default, alt: "Transfer", width: 25, height: 25 }) : /* @__PURE__ */ (0, import_jsx_runtime57.jsx)(
            import_image21.default,
            {
              src: transferdisabled_default,
              alt: "Transfer",
              width: 25,
              height: 25
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime57.jsx)("span", { className: "text-[13px] font-medium", children: form.isSending ? t.transfer.sendingButton : t.transfer.sendButton })
        ]
      }
    ) })
  ] }) });
};
var transfer_default2 = TransferSend;

// src/components/QR/send/index.tsx
var import_jsx_runtime58 = require("react/jsx-runtime");
var PAGES = ["scan", "scannedData", "sendChoose", "transferSend", "paymentRequest", "paymentRequestView"];
var SLIDE_TRANSITION = "transform 0.38s cubic-bezier(0.33, 1, 0.68, 1)";
var QrScanner2 = ({ open, onClose, onScan, parsedQR, paymentRequestCode }) => {
  const [page, setPage] = (0, import_react39.useState)("scan");
  const { setScannerNav, isTransferScan } = useScanner();
  const { t } = useTranslation();
  (0, import_react39.useEffect)(() => {
    setScannerNav({
      toScan: () => setPage("scan"),
      toTransfer: () => setPage("transferSend"),
      toPaymentRequest: () => setPage("paymentRequest")
    });
    return () => setScannerNav({});
  }, [setScannerNav]);
  import_react39.default.useEffect(() => {
    if (paymentRequestCode) {
      setPage("paymentRequestView");
    } else if (parsedQR) {
      const isPaymentRequest = !!parsedQR.encryptedRequestCode && !!parsedQR.requesterAccount;
      setPage(isPaymentRequest ? "paymentRequest" : "scannedData");
    } else {
      setPage("scan");
    }
  }, [parsedQR, paymentRequestCode, open]);
  const pageIndex = PAGES.indexOf(page);
  const navigate = (to) => setPage(to);
  const handleClose = () => {
    onClose();
    setTimeout(() => setPage("scan"), 400);
  };
  const goBack = () => {
    if (isTransferScan && pageIndex === 0) {
      setPage("transferSend");
    } else if (pageIndex > 0) {
      setPage(PAGES[pageIndex - 1]);
    }
  };
  const showBackButton = pageIndex > 0 || isTransferScan && pageIndex === 0;
  return /* @__PURE__ */ (0, import_jsx_runtime58.jsxs)(
    BottomSheet_default,
    {
      open,
      onClose: handleClose,
      showDragHandle: true,
      enableDrag: true,
      className: "pb-6 overflow-hidden",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(
          "div",
          {
            className: "px-4 hidden z-50 absolute pt-1 pb-0",
            style: {
              opacity: showBackButton ? 1 : 0,
              pointerEvents: showBackButton ? "auto" : "none",
              transition: "opacity 0.22s ease"
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime58.jsxs)(
              "button",
              {
                onClick: goBack,
                "aria-label": t.common.accessibility.goBack,
                className: "flex cursor-pointer items-center gap-1.5 text-[#444444] active:opacity-60 transition-opacity",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(
                    "svg",
                    {
                      width: "18",
                      height: "18",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.5",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      children: /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("path", { d: "M15 18l-6-6 6-6" })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("span", { className: "text-[13px] font-medium", children: t.common.accessibility.back })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "overflow-hidden h-full w-full", children: /* @__PURE__ */ (0, import_jsx_runtime58.jsxs)(
          "div",
          {
            className: "flex h-full w-full",
            style: {
              transform: `translateX(${-pageIndex * 100}%)`,
              transition: SLIDE_TRANSITION
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "w-full shrink-0 h-full", children: /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(
                Scan_default,
                {
                  onScan,
                  onClose: handleClose,
                  onSend: () => navigate("sendChoose")
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "w-full shrink-0 h-full", children: parsedQR && /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(ScannedData_default, { parsedQR, onClose: handleClose }) }),
              /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "w-full shrink-0 h-full", children: /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(SendChoose_default, { onNavigate: navigate }) }),
              /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "w-full shrink-0 h-full", children: /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(transfer_default2, { onClose: handleClose }) }),
              /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "w-full shrink-0 h-full", children: parsedQR && /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(
                PaymentRequestReview_default,
                {
                  parsedQR,
                  onDone: handleClose,
                  onBack: () => setPage("scan")
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime58.jsx)("div", { className: "w-full shrink-0 h-full", children: paymentRequestCode && /* @__PURE__ */ (0, import_jsx_runtime58.jsx)(
                PaymentRequestReview_default,
                {
                  requestCode: paymentRequestCode,
                  onDone: handleClose,
                  onBack: handleClose
                }
              ) })
            ]
          }
        ) })
      ]
    }
  );
};
var send_default2 = QrScanner2;

// src/components/QR/send/utils.ts
var PAYREQ_PREFIX = "PAYREQ:";
function extractParams(raw) {
  try {
    const url = new URL(raw);
    return url.searchParams;
  } catch {
  }
  const normalized = raw.startsWith("?") ? raw : `?${raw}`;
  try {
    return new URLSearchParams(normalized.slice(1));
  } catch {
    return null;
  }
}
function nonEmpty(value) {
  if (!value || value.trim() === "" || value === "null") return void 0;
  return value.trim();
}
function validateQR(raw) {
  if (!raw) {
    return { valid: false, error: "invalid_format" };
  }
  if (raw.startsWith(PAYREQ_PREFIX)) {
    const payload = raw.slice(PAYREQ_PREFIX.length);
    const pipeIdx = payload.lastIndexOf("|");
    if (pipeIdx < 0) {
      return { valid: false, error: "invalid_format" };
    }
    const encryptedRequestCode = payload.slice(0, pipeIdx);
    const requesterAccount = payload.slice(pipeIdx + 1);
    if (!encryptedRequestCode || !requesterAccount) {
      return { valid: false, error: "invalid_format" };
    }
    const parsed2 = {
      raw,
      accountName: "",
      accountNumber: "",
      currency: "",
      encryptedRequestCode,
      requesterAccount
    };
    return { valid: true, data: parsed2 };
  }
  const params = extractParams(raw);
  if (!params) {
    return { valid: false, error: "invalid_format" };
  }
  const accountName = nonEmpty(params.get("ana"));
  const accountNumber = nonEmpty(params.get("anu"));
  const currency = nonEmpty(params.get("cu"));
  if (!accountName && !accountNumber && !currency) {
    return { valid: false, error: "missing_both" };
  }
  if (!accountName && !accountNumber) {
    return { valid: false, error: "missing_account_info" };
  }
  if (!accountName) {
    return { valid: false, error: "missing_account_name" };
  }
  if (!accountNumber) {
    return { valid: false, error: "missing_account_number" };
  }
  if (!currency) {
    return { valid: false, error: "missing_currency" };
  }
  const parsed = {
    raw,
    accountName,
    accountNumber,
    currency,
    amount: nonEmpty(params.get("am")),
    reference: nonEmpty(params.get("ri")),
    purpose: nonEmpty(params.get("pi")),
    validity: nonEmpty(params.get("vi")),
    note: nonEmpty(params.get("no"))
  };
  return { valid: true, data: parsed };
}

// src/components/QR/scanner/GlobalQrScanner.tsx
var import_jsx_runtime59 = require("react/jsx-runtime");
var GlobalQrScanner = () => {
  const { t } = useTranslation();
  const { open, setOpen, setOnQrScanned, callOnQrScanned } = useScanner();
  const { balances, activeAssetSymbol, account } = useStore();
  const { toast } = useToast();
  const [parsedQR, setParsedQR] = (0, import_react40.useState)(null);
  const lastInvalidScanRef = (0, import_react40.useRef)(0);
  const lastHandledScanRef = (0, import_react40.useRef)(0);
  const errorMessages = {
    invalid_format: t.home.qr.messages.invalidQrCode,
    missing_both: t.home.qr.messages.missingWalletIdAndCurrency,
    missing_account_info: t.home.qr.messages.missingAccountInfo,
    missing_account_name: t.home.qr.messages.missingAccountName,
    missing_account_number: t.home.qr.messages.missingAccountNumber,
    missing_currency: t.home.qr.messages.missingCurrency
  };
  const handleQrScan = (value) => {
    const now = Date.now();
    if (now - lastHandledScanRef.current < 3e3) return;
    const result = validateQR(value);
    if (!result.valid) {
      if (now - lastInvalidScanRef.current > 3e3) {
        lastInvalidScanRef.current = now;
        toast.error(errorMessages[result.error] || t.home.qr.messages.invalidQrCode);
      }
      return;
    }
    if (result.data?.accountNumber && callOnQrScanned(result.data.accountNumber)) {
      lastHandledScanRef.current = now;
      return;
    }
    lastHandledScanRef.current = now;
    setParsedQR(result.data);
  };
  const handleClose = () => {
    setOpen(null);
    setParsedQR(null);
    setOnQrScanned(null);
  };
  if (open === "receive") {
    return /* @__PURE__ */ (0, import_jsx_runtime59.jsx)(BottomSheet_default, { onClose: handleClose, open: true, children: /* @__PURE__ */ (0, import_jsx_runtime59.jsx)(
      CreatePaymentRequest_default,
      {
        account,
        balances,
        activeAssetSymbol
      }
    ) });
  }
  if (open === "scan" || open === "send") {
    return /* @__PURE__ */ (0, import_jsx_runtime59.jsx)(
      send_default2,
      {
        open: true,
        onClose: handleClose,
        onScan: handleQrScan,
        parsedQR
      }
    );
  }
  return null;
};
var GlobalQrScanner_default = GlobalQrScanner;

// src/app/(protected)/layout.tsx
var import_jsx_runtime60 = require("react/jsx-runtime");
function ProtectedLayout({ children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime60.jsx)(AuthProtected, { children: /* @__PURE__ */ (0, import_jsx_runtime60.jsxs)("div", { className: "flex flex-col h-full w-full", children: [
    /* @__PURE__ */ (0, import_jsx_runtime60.jsx)(Header_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime60.jsx)("main", { className: "flex-1 overflow-y-auto max-w-full", children }),
    /* @__PURE__ */ (0, import_jsx_runtime60.jsx)(Footer_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime60.jsx)(GlobalQrScanner_default, {})
  ] }) });
}

// src/rdb/hooks/useRDB.ts
var useRDB = ({ onReceivedAuthToken }) => {
  const handleSplashComplete = () => {
    if (onReceivedAuthToken) {
      onReceivedAuthToken();
    }
  };
  return {
    handleSplashComplete
  };
};

// src/constants/colors.ts
var COLORS = {
  // Brand Colors (Mapping to CSS Variables)
  primary: {
    DEFAULT: "var(--primary, #3066CC)",
    light: "var(--primary-light, #5A85DB)",
    dark: "var(--primary-dark, #254E9E)",
    foreground: "var(--primary-foreground, #ffffff)"
  },
  secondary: {
    DEFAULT: "var(--secondary, #404040)",
    light: "var(--secondary-light, #666666)",
    dark: "var(--secondary-dark, #262626)",
    foreground: "var(--secondary-foreground, #ffffff)"
  },
  accent: {
    DEFAULT: "var(--accent, #7928ca)",
    light: "var(--accent-light, #8a3fd6)",
    dark: "var(--accent-dark, #4c1682)",
    foreground: "var(--accent-foreground, #ffffff)"
  },
  // Status Colors
  success: "var(--success, #10b981)",
  warning: "var(--warning, #f59e0b)",
  error: "var(--error, #ef4444)",
  info: "var(--info, #3b82f6)",
  // Neutral Colors
  background: "var(--background, #FFFFFF)",
  foreground: "var(--foreground, #404040)",
  muted: "var(--muted, #737373)",
  border: "var(--border, #70707026)",
  button: "var(--button, #e7e3e326)",
  black: "#000000"
};

// src/lib/theme.ts
function generateThemeVariables() {
  const variables = {};
  Object.entries(COLORS).forEach(([key, value]) => {
    if (typeof value === "string") {
      variables[`--${key}`] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (subKey === "DEFAULT") {
          variables[`--${key}`] = subValue;
        } else {
          variables[`--${key}-${subKey}`] = subValue;
        }
      });
    }
  });
  return variables;
}

// src/components/auth/screens/AuthLayout.tsx
var import_lucide_react4 = require("lucide-react");
var import_jsx_runtime61 = require("react/jsx-runtime");
function AuthLayout({ children, title, showPhoneIcon = true }) {
  const { t } = useTranslation();
  const displayTitle = title ?? t.auth.authLayout.defaultTitle;
  return /* @__PURE__ */ (0, import_jsx_runtime61.jsxs)("div", { className: "w-full h-screen flex flex-col bg-white overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime61.jsxs)("div", { className: "h-6/10 w-full flex flex-col items-center justify-end pb-4 px-6 pt-10", children: [
      /* @__PURE__ */ (0, import_jsx_runtime61.jsxs)("div", { className: "flex flex-col items-center text-center pb-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime61.jsx)("h2", { className: "text-[28px] font-medium text-gray-800 mb-6", children: displayTitle }),
        showPhoneIcon && /* @__PURE__ */ (0, import_jsx_runtime61.jsx)("div", { className: "mb-2", children: /* @__PURE__ */ (0, import_jsx_runtime61.jsx)(import_lucide_react4.Phone, { className: "w-8 h-8 text-gray-400 stroke-[1.5px]" }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime61.jsx)("div", { className: "w-full flex flex-col items-center", children })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime61.jsxs)("div", { className: "h-4/10 hidden w-full relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime61.jsx)("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-2xl" }),
      /* @__PURE__ */ (0, import_jsx_runtime61.jsx)("div", { className: "absolute top-0 left-0 right-0 h-px bg-white/5" })
    ] })
  ] });
}

// src/components/ui/PhoneInput.tsx
var import_react41 = require("react");
var import_lucide_react5 = require("lucide-react");
var import_jsx_runtime62 = require("react/jsx-runtime");
var COUNTRIES = [
  { code: "SY", flag: "\u{1F1F8}\u{1F1FE}", name: "Syria", dialCode: "963" },
  { code: "TR", flag: "\u{1F1F9}\u{1F1F7}", name: "Turkey", dialCode: "90" },
  { code: "IQ", flag: "\u{1F1EE}\u{1F1F6}", name: "Iraq", dialCode: "964" },
  { code: "JO", flag: "\u{1F1EF}\u{1F1F4}", name: "Jordan", dialCode: "962" },
  { code: "LB", flag: "\u{1F1F1}\u{1F1E7}", name: "Lebanon", dialCode: "961" },
  { code: "SA", flag: "\u{1F1F8}\u{1F1E6}", name: "Saudi Arabia", dialCode: "966" },
  { code: "AE", flag: "\u{1F1E6}\u{1F1EA}", name: "UAE", dialCode: "971" },
  { code: "EG", flag: "\u{1F1EA}\u{1F1EC}", name: "Egypt", dialCode: "20" },
  { code: "US", flag: "\u{1F1FA}\u{1F1F8}", name: "United States", dialCode: "1" },
  { code: "GB", flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom", dialCode: "44" },
  { code: "DE", flag: "\u{1F1E9}\u{1F1EA}", name: "Germany", dialCode: "49" },
  { code: "FR", flag: "\u{1F1EB}\u{1F1F7}", name: "France", dialCode: "33" },
  { code: "IT", flag: "\u{1F1EE}\u{1F1F9}", name: "Italy", dialCode: "39" },
  { code: "ES", flag: "\u{1F1EA}\u{1F1F8}", name: "Spain", dialCode: "34" },
  { code: "NL", flag: "\u{1F1F3}\u{1F1F1}", name: "Netherlands", dialCode: "31" },
  { code: "SE", flag: "\u{1F1F8}\u{1F1EA}", name: "Sweden", dialCode: "46" },
  { code: "KW", flag: "\u{1F1F0}\u{1F1FC}", name: "Kuwait", dialCode: "965" },
  { code: "QA", flag: "\u{1F1F6}\u{1F1E6}", name: "Qatar", dialCode: "974" },
  { code: "BH", flag: "\u{1F1E7}\u{1F1ED}", name: "Bahrain", dialCode: "973" },
  { code: "OM", flag: "\u{1F1F4}\u{1F1F2}", name: "Oman", dialCode: "968" },
  { code: "PS", flag: "\u{1F1F5}\u{1F1F8}", name: "Palestine", dialCode: "970" },
  { code: "YE", flag: "\u{1F1FE}\u{1F1EA}", name: "Yemen", dialCode: "967" },
  { code: "LY", flag: "\u{1F1F1}\u{1F1FE}", name: "Libya", dialCode: "218" },
  { code: "SD", flag: "\u{1F1F8}\u{1F1E9}", name: "Sudan", dialCode: "249" },
  { code: "TN", flag: "\u{1F1F9}\u{1F1F3}", name: "Tunisia", dialCode: "216" },
  { code: "DZ", flag: "\u{1F1E9}\u{1F1FF}", name: "Algeria", dialCode: "213" },
  { code: "MA", flag: "\u{1F1F2}\u{1F1E6}", name: "Morocco", dialCode: "212" },
  { code: "IN", flag: "\u{1F1EE}\u{1F1F3}", name: "India", dialCode: "91" },
  { code: "PK", flag: "\u{1F1F5}\u{1F1F0}", name: "Pakistan", dialCode: "92" },
  { code: "BD", flag: "\u{1F1E7}\u{1F1E9}", name: "Bangladesh", dialCode: "880" },
  { code: "CN", flag: "\u{1F1E8}\u{1F1F3}", name: "China", dialCode: "86" },
  { code: "JP", flag: "\u{1F1EF}\u{1F1F5}", name: "Japan", dialCode: "81" },
  { code: "KR", flag: "\u{1F1F0}\u{1F1F7}", name: "South Korea", dialCode: "82" },
  { code: "RU", flag: "\u{1F1F7}\u{1F1FA}", name: "Russia", dialCode: "7" },
  { code: "BR", flag: "\u{1F1E7}\u{1F1F7}", name: "Brazil", dialCode: "55" },
  { code: "MX", flag: "\u{1F1F2}\u{1F1FD}", name: "Mexico", dialCode: "52" },
  { code: "CA", flag: "\u{1F1E8}\u{1F1E6}", name: "Canada", dialCode: "1" },
  { code: "AU", flag: "\u{1F1E6}\u{1F1FA}", name: "Australia", dialCode: "61" }
];
var SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
var MIN_PHONE_DIGITS = 10;
function PhoneInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "Phone Number"
}) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = (0, import_react41.useState)(false);
  const detectedCountry = (0, import_react41.useMemo)(() => {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return null;
    for (const country of SORTED_COUNTRIES) {
      if (digits.startsWith(country.dialCode)) {
        return country;
      }
    }
    return null;
  }, [value]);
  const formatNumber = (0, import_react41.useCallback)((digits) => {
    if (!digits) return "";
    let matchedDialCode = "";
    for (const country of SORTED_COUNTRIES) {
      if (digits.startsWith(country.dialCode)) {
        matchedDialCode = country.dialCode;
        break;
      }
    }
    if (matchedDialCode) {
      const rest = digits.slice(matchedDialCode.length);
      const groups2 = rest.match(/.{1,3}/g) || [];
      return [matchedDialCode, ...groups2].join(" ");
    }
    const groups = digits.match(/.{1,3}/g) || [];
    return groups.join(" ");
  }, []);
  const displayValue = (0, import_react41.useMemo)(() => {
    const digits = value.replace(/[^\d]/g, "");
    return formatNumber(digits);
  }, [value, formatNumber]);
  const handleChange = (0, import_react41.useCallback)(
    (e) => {
      const digits = e.target.value.replace(/[^\d]/g, "");
      onChange(digits);
    },
    [onChange]
  );
  const isValidPhone = (0, import_react41.useMemo)(() => {
    const digits = value.replace(/[^\d]/g, "");
    return digits.length >= MIN_PHONE_DIGITS;
  }, [value]);
  const handleKeyDown = (0, import_react41.useCallback)(
    (e) => {
      if (e.key === "Enter" && isValidPhone && onSend) {
        e.preventDefault();
        onSend();
      }
    },
    [isValidPhone, onSend]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime62.jsx)("div", { className: "flex w-full items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime62.jsxs)(
    "div",
    {
      className: `flex items-center gap-3 w-87.5 max-w-137.5 h-12.5 rounded-2xl border border-dashed px-4 transition-colors ${isFocused ? "border-primary" : "border-border"}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime62.jsx)(import_lucide_react5.Phone, { className: "w-4.5 h-4.5 text-foreground/50 shrink-0" }),
        detectedCountry && /* @__PURE__ */ (0, import_jsx_runtime62.jsx)("span", { className: "w-6 h-4.5 shrink-0 overflow-hidden rounded-sm", children: /* @__PURE__ */ (0, import_jsx_runtime62.jsx)(
          "img",
          {
            src: `https://flagcdn.com/w40/${detectedCountry?.code.toLowerCase()}.png`,
            alt: "flag",
            className: "w-full h-full object-cover"
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime62.jsx)("span", { className: "text-foreground/60 text-[14px] shrink-0 select-none", children: "+" }),
        /* @__PURE__ */ (0, import_jsx_runtime62.jsx)(
          "input",
          {
            type: "tel",
            value: displayValue,
            onChange: handleChange,
            onKeyDown: handleKeyDown,
            onFocus: () => setIsFocused(true),
            onBlur: () => setIsFocused(false),
            placeholder,
            className: "flex-1 bg-transparent text-[16px] text-foreground placeholder:text-foreground/40 outline-none min-w-0"
          }
        ),
        isValidPhone && onSend && /* @__PURE__ */ (0, import_jsx_runtime62.jsx)(
          "button",
          {
            onClick: onSend,
            disabled: isLoading,
            className: "shrink-0 p-2 hover:bg-foreground/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            "aria-label": t.common.accessibility.sendPhoneNumber,
            children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime62.jsx)(import_lucide_react5.Loader2, { className: "w-5 h-5 text-primary animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime62.jsx)(import_lucide_react5.ArrowRight, { className: "w-5 h-5 text-primary" })
          }
        )
      ]
    }
  ) });
}

// src/components/auth/screens/EnterPhone.tsx
var import_lucide_react6 = require("lucide-react");
var import_jsx_runtime63 = require("react/jsx-runtime");
function EnterPhoneScreen({
  onSubmit,
  loading,
  phone,
  authType,
  setPhone
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime63.jsx)(
    AuthLayout,
    {
      title: authType === "signUp" ? t.auth.enterPhone.signUpTitle : t.auth.enterPhone.signInTitle,
      showPhoneIcon: true,
      children: /* @__PURE__ */ (0, import_jsx_runtime63.jsxs)("div", { className: "w-full max-w-95 space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime63.jsxs)("div", { className: "space-y-4 pb-12", children: [
          /* @__PURE__ */ (0, import_jsx_runtime63.jsx)("p", { className: "text-[14px] text-gray-500 text-center font-normal", children: t.auth.enterPhone.enterPhoneInstruction }),
          /* @__PURE__ */ (0, import_jsx_runtime63.jsxs)("div", { className: "flex flex-col items-center space-y-3 px-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime63.jsxs)("div", { className: "flex items-center gap-3 w-full justify-center", children: [
              /* @__PURE__ */ (0, import_jsx_runtime63.jsx)(import_lucide_react6.CheckSquare, { className: "w-4 h-4 text-gray-400 shrink-0" }),
              /* @__PURE__ */ (0, import_jsx_runtime63.jsx)("span", { className: "text-[13px] text-gray-500", children: t.auth.enterPhone.verificationInfo })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime63.jsxs)("div", { className: "flex items-start gap-3 w-full justify-center", children: [
              /* @__PURE__ */ (0, import_jsx_runtime63.jsx)(import_lucide_react6.Info, { className: "w-4 h-4 text-blue-500 shrink-0 mt-0.5" }),
              /* @__PURE__ */ (0, import_jsx_runtime63.jsxs)("span", { className: "text-[13px] text-gray-500 text-center leading-relaxed", children: [
                t.auth.enterPhone.privacyLine1,
                /* @__PURE__ */ (0, import_jsx_runtime63.jsx)("br", {}),
                t.auth.enterPhone.privacyLine2
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime63.jsx)("div", { className: "px-4", children: /* @__PURE__ */ (0, import_jsx_runtime63.jsx)(
          PhoneInput,
          {
            onSend: () => onSubmit(phone),
            value: phone,
            onChange: setPhone,
            placeholder: t.auth.enterPhone.phonePlaceholder,
            isLoading: loading
          }
        ) })
      ] })
    }
  );
}

// src/components/ui/Button.tsx
var import_jsx_runtime64 = require("react/jsx-runtime");
function Button({ onClick, children, className = "", ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime64.jsx)(
    "button",
    {
      onClick,
      className: `w-87.5 cursor-pointer h-12.5 rounded-xl border border-border bg-button text-foreground text-[14px] font-normal transition-colors hover:bg-white ${className}`,
      ...rest,
      children
    }
  );
}

// src/components/icons/index.tsx
var import_image22 = __toESM(require("next/image"));

// src/assets/icons/rdb.svg
var rdb_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="144.207" height="104.219" viewBox="0 0 144.207 104.219">%0A  <g id="Group_15204" data-name="Group 15204" transform="translate(-143 -425)">%0A    <path id="Path_19227" data-name="Path 19227" d="M-41.523-47.1a7.231,7.231,0,0,1,4.3,1.29,3.82,3.82,0,0,1,1.816,3.2A4.726,4.726,0,0,1-36.6-39.125a3.966,3.966,0,0,1-2.915,1.195A9.1,9.1,0,0,1-42.1-38.5a10.728,10.728,0,0,0-3.154-.669,9.718,9.718,0,0,0-5.782,2.055,15.041,15.041,0,0,0-4.587,5.638,17.789,17.789,0,0,0-1.768,7.98V-.469a4.508,4.508,0,0,1-1.29,3.249,4.381,4.381,0,0,1-3.3,1.338,4.307,4.307,0,0,1-3.249-1.29,4.558,4.558,0,0,1-1.242-3.3v-40.9a4.508,4.508,0,0,1,1.29-3.249,4.268,4.268,0,0,1,3.2-1.338,4.381,4.381,0,0,1,3.3,1.338,4.508,4.508,0,0,1,1.29,3.249V-36.5a18.091,18.091,0,0,1,6.307-7.6A16.924,16.924,0,0,1-41.523-47.1ZM11.516-66.6a4.465,4.465,0,0,1,3.3,1.29,4.465,4.465,0,0,1,1.29,3.3V-.469a4.508,4.508,0,0,1-1.29,3.249,4.381,4.381,0,0,1-3.3,1.338,4.307,4.307,0,0,1-3.249-1.29,4.558,4.558,0,0,1-1.242-3.3V-3.145A19.332,19.332,0,0,1,.287,2.684,19.049,19.049,0,0,1-9.031,5.073,21.436,21.436,0,0,1-20.785,1.729,23.417,23.417,0,0,1-29.1-7.589a29.032,29.032,0,0,1-3.058-13.427,29.412,29.412,0,0,1,3.01-13.427,23.076,23.076,0,0,1,8.266-9.318A21.107,21.107,0,0,1-9.317-47.1,21.034,21.034,0,0,1,.048-45a20.023,20.023,0,0,1,6.976,5.447V-62.013a4.558,4.558,0,0,1,1.242-3.3A4.307,4.307,0,0,1,11.516-66.6ZM-7.979-3.336A14.2,14.2,0,0,0,0-5.63a15.5,15.5,0,0,0,5.447-6.307,20.431,20.431,0,0,0,1.959-9.079,20.515,20.515,0,0,0-1.959-9.031A15.437,15.437,0,0,0,0-36.4,14.2,14.2,0,0,0-7.979-38.7a14.2,14.2,0,0,0-7.98,2.294,15.437,15.437,0,0,0-5.447,6.355,20.515,20.515,0,0,0-1.959,9.031,20.431,20.431,0,0,0,1.959,9.079A15.5,15.5,0,0,0-15.959-5.63,14.2,14.2,0,0,0-7.979-3.336ZM54.711-47.1A21.436,21.436,0,0,1,66.465-43.76a23.147,23.147,0,0,1,8.266,9.27,29.117,29.117,0,0,1,3.01,13.379,29.709,29.709,0,0,1-3.01,13.475,23.008,23.008,0,0,1-8.266,9.365A21.107,21.107,0,0,1,54.9,5.073a20.076,20.076,0,0,1-9.27-2.2,21.625,21.625,0,0,1-6.976-5.447V.2a4.508,4.508,0,0,1-1.29,3.249,4.381,4.381,0,0,1-3.3,1.338,4.347,4.347,0,0,1-3.2-1.29A4.465,4.465,0,0,1,29.577.2V-62.013a4.558,4.558,0,0,1,1.242-3.3,4.307,4.307,0,0,1,3.249-1.29,4.381,4.381,0,0,1,3.3,1.338,4.508,4.508,0,0,1,1.29,3.249V-38.7a19.141,19.141,0,0,1,6.69-5.925A18.737,18.737,0,0,1,54.711-47.1ZM53.66-3.336a14.049,14.049,0,0,0,7.932-2.341,15.649,15.649,0,0,0,5.495-6.4,20.515,20.515,0,0,0,1.959-9.031,20.208,20.208,0,0,0-1.959-8.983A15.375,15.375,0,0,0,61.592-36.4,14.261,14.261,0,0,0,53.66-38.7,14.426,14.426,0,0,0,45.632-36.4a15.442,15.442,0,0,0-5.495,6.259,20.126,20.126,0,0,0-1.959,9.031,20.431,20.431,0,0,0,1.959,9.079,15.717,15.717,0,0,0,5.495,6.355A14.211,14.211,0,0,0,53.66-3.336Z" transform="translate(209.465 491.6)"/>%0A    <path id="Path_19228" data-name="Path 19228" d="M-64.564-.7a.382.382,0,0,1,.195.325.4.4,0,0,1-.052.169.378.378,0,0,1-.143.143.387.387,0,0,1-.195.052.439.439,0,0,1-.221-.052,1.466,1.466,0,0,1-.585-.676,3.729,3.729,0,0,1-.221-1.5,1.483,1.483,0,0,0-.507-1.28,1.993,1.993,0,0,0-1.209-.37h-2.886v3.5a.392.392,0,0,1-.1.279A.358.358,0,0,1-70.765,0a.466.466,0,0,1-.312-.111.351.351,0,0,1-.13-.279V-8.71a.379.379,0,0,1,.11-.28.379.379,0,0,1,.28-.11h3.51a2.728,2.728,0,0,1,1.326.318,2.35,2.35,0,0,1,.917.878,2.425,2.425,0,0,1,.331,1.261,2.51,2.51,0,0,1-.436,1.462,2.2,2.2,0,0,1-1.137.865,1.993,1.993,0,0,1,.936.747,2.268,2.268,0,0,1,.377,1.28,4.74,4.74,0,0,0,.111,1.131A.746.746,0,0,0-64.564-.7Zm-2.7-3.9a1.775,1.775,0,0,0,.845-.3,1.886,1.886,0,0,0,.624-.7,2.135,2.135,0,0,0,.234-1.014,1.643,1.643,0,0,0-.5-1.228,1.793,1.793,0,0,0-1.307-.487h-3.016V-4.6Zm10.023-2.041a.368.368,0,0,1,.279.117.4.4,0,0,1,.111.286V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1-57.245,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279v-.871a2.724,2.724,0,0,1-.975.988,2.638,2.638,0,0,1-1.417.4,2.8,2.8,0,0,1-1.566-.455,3.127,3.127,0,0,1-1.092-1.248,3.927,3.927,0,0,1-.4-1.781,3.835,3.835,0,0,1,.4-1.775,3.088,3.088,0,0,1,1.1-1.228A2.814,2.814,0,0,1-60.04-6.8a2.8,2.8,0,0,1,1.43.377,2.483,2.483,0,0,1,.975.988V-6.24a.4.4,0,0,1,.111-.286A.368.368,0,0,1-57.245-6.643ZM-59.949-.6a2.151,2.151,0,0,0,1.215-.358,2.422,2.422,0,0,0,.845-.988,3.193,3.193,0,0,0,.306-1.41,3.091,3.091,0,0,0-.306-1.378,2.431,2.431,0,0,0-.845-.982,2.151,2.151,0,0,0-1.215-.358,2.18,2.18,0,0,0-1.215.351,2.393,2.393,0,0,0-.845.968,3.11,3.11,0,0,0-.306,1.4,3.251,3.251,0,0,0,.3,1.41,2.376,2.376,0,0,0,.838.988A2.173,2.173,0,0,0-59.949-.6Zm12.675-6.1a2.031,2.031,0,0,1,1.722.721A3.05,3.05,0,0,1-45-4.069V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1-45.389,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-4.03a2.249,2.249,0,0,0-.41-1.4,1.489,1.489,0,0,0-1.267-.54,2.165,2.165,0,0,0-1.034.26A2.138,2.138,0,0,0-49.277-5a1.713,1.713,0,0,0-.3.968V-.39a.379.379,0,0,1-.11.279.379.379,0,0,1-.28.111.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-4.069a2.247,2.247,0,0,0-.39-1.372,1.42,1.42,0,0,0-1.222-.526,2.066,2.066,0,0,0-1.007.26,2.156,2.156,0,0,0-.767.7,1.658,1.658,0,0,0-.292.943V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1-54.424,0,.379.379,0,0,1-54.7-.111a.379.379,0,0,1-.111-.279V-6.214a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11.379.379,0,0,1,.279.11.379.379,0,0,1,.111.28v.754a2.826,2.826,0,0,1,.949-.884,2.453,2.453,0,0,1,1.261-.351,2.289,2.289,0,0,1,1.3.364,1.987,1.987,0,0,1,.78,1.066,2.409,2.409,0,0,1,1-1A2.867,2.867,0,0,1-47.274-6.695Zm9.711.052a.368.368,0,0,1,.279.117.4.4,0,0,1,.111.286V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1-37.563,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279v-.871a2.724,2.724,0,0,1-.975.988,2.638,2.638,0,0,1-1.417.4,2.8,2.8,0,0,1-1.566-.455A3.127,3.127,0,0,1-43-1.573a3.927,3.927,0,0,1-.4-1.781A3.835,3.835,0,0,1-43-5.128a3.088,3.088,0,0,1,1.1-1.228,2.814,2.814,0,0,1,1.54-.442,2.8,2.8,0,0,1,1.43.377,2.483,2.483,0,0,1,.975.988V-6.24a.4.4,0,0,1,.111-.286A.368.368,0,0,1-37.563-6.643ZM-40.267-.6a2.151,2.151,0,0,0,1.215-.358,2.422,2.422,0,0,0,.845-.988,3.193,3.193,0,0,0,.306-1.41,3.091,3.091,0,0,0-.306-1.378,2.431,2.431,0,0,0-.845-.982,2.151,2.151,0,0,0-1.215-.358,2.18,2.18,0,0,0-1.215.351,2.393,2.393,0,0,0-.845.968,3.11,3.11,0,0,0-.306,1.4,3.251,3.251,0,0,0,.3,1.41,2.376,2.376,0,0,0,.838.988A2.173,2.173,0,0,0-40.267-.6Zm10.66-6.045a.368.368,0,0,1,.279.117.4.4,0,0,1,.111.286V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1-29.607,0a.379.379,0,0,1-.28-.111A.379.379,0,0,1-30-.39v-.871a2.724,2.724,0,0,1-.975.988,2.638,2.638,0,0,1-1.417.4,2.8,2.8,0,0,1-1.566-.455,3.127,3.127,0,0,1-1.092-1.248,3.927,3.927,0,0,1-.4-1.781,3.835,3.835,0,0,1,.4-1.775,3.088,3.088,0,0,1,1.1-1.228A2.814,2.814,0,0,1-32.4-6.8a2.8,2.8,0,0,1,1.43.377A2.483,2.483,0,0,1-30-5.434V-6.24a.4.4,0,0,1,.111-.286A.368.368,0,0,1-29.607-6.643ZM-32.311-.6A2.151,2.151,0,0,0-31.1-.956a2.422,2.422,0,0,0,.845-.988,3.193,3.193,0,0,0,.306-1.41,3.091,3.091,0,0,0-.306-1.378,2.431,2.431,0,0,0-.845-.982,2.151,2.151,0,0,0-1.216-.358,2.18,2.18,0,0,0-1.215.351,2.393,2.393,0,0,0-.845.968,3.11,3.11,0,0,0-.306,1.4,3.251,3.251,0,0,0,.3,1.41,2.376,2.376,0,0,0,.838.988A2.173,2.173,0,0,0-32.311-.6Zm9.3-.13a.369.369,0,0,1,.273.1.353.353,0,0,1,.1.26.353.353,0,0,1-.1.26.369.369,0,0,1-.273.1h-4.225a.34.34,0,0,1-.273-.123.391.391,0,0,1-.1-.253.434.434,0,0,1,.117-.3l3.848-5.33h-3.263a.375.375,0,0,1-.267-.1.342.342,0,0,1-.111-.26.342.342,0,0,1,.111-.26.375.375,0,0,1,.267-.1h3.991a.333.333,0,0,1,.26.117.4.4,0,0,1,.1.273.484.484,0,0,1-.1.286l-3.861,5.33ZM-13.5-9.1a3.481,3.481,0,0,1,2.1.617,3.735,3.735,0,0,1,1.274,1.651A5.975,5.975,0,0,1-9.7-4.55a6.033,6.033,0,0,1-.422,2.314A3.656,3.656,0,0,1-11.4-.6a3.534,3.534,0,0,1-2.1.6h-3.315a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-8.71a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11Zm-.13,8.333A2.7,2.7,0,0,0-11.3-1.814a4.519,4.519,0,0,0,.767-2.736,5.305,5.305,0,0,0-.325-1.9,2.972,2.972,0,0,0-1.021-1.365,2.864,2.864,0,0,0-1.748-.513h-2.756V-.767ZM-7.3-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1-7.689,0a.379.379,0,0,1-.28-.111.379.379,0,0,1-.11-.279V-6.37a.379.379,0,0,1,.11-.28.379.379,0,0,1,.28-.11.379.379,0,0,1,.28.11.379.379,0,0,1,.111.28Zm-.39-7.241a.6.6,0,0,1-.4-.123.447.447,0,0,1-.143-.358v-.13A.437.437,0,0,1-8.086-8.6a.624.624,0,0,1,.41-.123q.52,0,.52.481v.13a.457.457,0,0,1-.136.358A.572.572,0,0,1-7.689-7.631Zm8.034.988a.379.379,0,0,1,.28.11.4.4,0,0,1,.11.293V-.611A3.377,3.377,0,0,1,.312,1.124a2.8,2.8,0,0,1-1.157,1.1A3.635,3.635,0,0,1-2.529,2.6a4.2,4.2,0,0,1-.955-.117,3.805,3.805,0,0,1-.858-.3Q-4.7,2-4.752,1.807A.286.286,0,0,1-4.842,1.6a.239.239,0,0,1,.117-.208.211.211,0,0,1,.13-.039,1.008,1.008,0,0,1,.3.091l.273.117a4.192,4.192,0,0,0,1.508.312A2.451,2.451,0,0,0-.7,1.215,2.4,2.4,0,0,0-.045-.559v-.806a2.4,2.4,0,0,1-1.027,1.1,2.945,2.945,0,0,1-1.469.4A3,3,0,0,1-4.16-.318,3.152,3.152,0,0,1-5.3-1.56a3.775,3.775,0,0,1-.416-1.781A3.747,3.747,0,0,1-5.3-5.109,3.152,3.152,0,0,1-4.16-6.351,2.98,2.98,0,0,1-2.555-6.8a2.864,2.864,0,0,1,1.5.41,2.743,2.743,0,0,1,1.008.981V-6.24a.4.4,0,0,1,.11-.286A.368.368,0,0,1,.344-6.643ZM-2.477-.6A2.412,2.412,0,0,0-1.2-.942a2.355,2.355,0,0,0,.884-.975A3.113,3.113,0,0,0,.007-3.341,3.073,3.073,0,0,0-.312-4.758,2.364,2.364,0,0,0-1.2-5.727a2.412,2.412,0,0,0-1.28-.345,2.323,2.323,0,0,0-1.267.358,2.456,2.456,0,0,0-.884.982,3.015,3.015,0,0,0-.318,1.391,3.044,3.044,0,0,0,.318,1.4,2.456,2.456,0,0,0,.884.982A2.323,2.323,0,0,0-2.477-.6ZM3.543-.39a.379.379,0,0,1-.11.279A.379.379,0,0,1,3.153,0a.379.379,0,0,1-.28-.111A.379.379,0,0,1,2.763-.39V-6.37a.379.379,0,0,1,.111-.28.379.379,0,0,1,.28-.11.379.379,0,0,1,.28.11.379.379,0,0,1,.11.28Zm-.39-7.241a.6.6,0,0,1-.4-.123.447.447,0,0,1-.143-.358v-.13A.437.437,0,0,1,2.756-8.6a.624.624,0,0,1,.41-.123q.52,0,.52.481v.13a.457.457,0,0,1-.137.358A.572.572,0,0,1,3.153-7.631ZM6.871-5.889v4.355a.931.931,0,0,0,.182.67.664.664,0,0,0,.481.175.756.756,0,0,0,.2-.033.733.733,0,0,1,.182-.032.258.258,0,0,1,.2.1A.337.337,0,0,1,8.2-.429a.357.357,0,0,1-.208.305A.95.95,0,0,1,7.495,0a2.706,2.706,0,0,1-.624-.065.991.991,0,0,1-.527-.39A1.7,1.7,0,0,1,6.091-1.5V-5.889H5.142a.375.375,0,0,1-.266-.1.342.342,0,0,1-.11-.26.342.342,0,0,1,.11-.26.375.375,0,0,1,.266-.1h.949V-8.06A.379.379,0,0,1,6.2-8.34a.379.379,0,0,1,.28-.11.379.379,0,0,1,.28.11.379.379,0,0,1,.11.28v1.443h1.3a.34.34,0,0,1,.253.117.37.37,0,0,1,.111.26.332.332,0,0,1-.1.253.365.365,0,0,1-.26.1Zm8.5-.754a.368.368,0,0,1,.28.117.4.4,0,0,1,.111.286V-.39a.379.379,0,0,1-.111.279.379.379,0,0,1-.28.111.379.379,0,0,1-.28-.111.379.379,0,0,1-.111-.279v-.871a2.724,2.724,0,0,1-.975.988,2.638,2.638,0,0,1-1.417.4,2.8,2.8,0,0,1-1.567-.455A3.127,3.127,0,0,1,9.932-1.573a3.927,3.927,0,0,1-.4-1.781,3.835,3.835,0,0,1,.4-1.775,3.088,3.088,0,0,1,1.1-1.228,2.814,2.814,0,0,1,1.54-.442,2.8,2.8,0,0,1,1.43.377,2.483,2.483,0,0,1,.975.988V-6.24a.4.4,0,0,1,.111-.286A.368.368,0,0,1,15.373-6.643ZM12.669-.6a2.151,2.151,0,0,0,1.215-.358,2.422,2.422,0,0,0,.845-.988,3.193,3.193,0,0,0,.306-1.41,3.091,3.091,0,0,0-.306-1.378,2.431,2.431,0,0,0-.845-.982,2.151,2.151,0,0,0-1.215-.358,2.18,2.18,0,0,0-1.215.351,2.393,2.393,0,0,0-.845.968,3.11,3.11,0,0,0-.306,1.4,3.251,3.251,0,0,0,.3,1.41,2.376,2.376,0,0,0,.839.988A2.173,2.173,0,0,0,12.669-.6Zm5.993.208a.379.379,0,0,1-.111.279A.379.379,0,0,1,18.272,0a.379.379,0,0,1-.28-.111.379.379,0,0,1-.111-.279V-9.23a.379.379,0,0,1,.111-.28.379.379,0,0,1,.28-.11.379.379,0,0,1,.279.11.379.379,0,0,1,.111.28ZM29.4-4.836a2.375,2.375,0,0,1,1.274.78,2.277,2.277,0,0,1,.494,1.521,2.294,2.294,0,0,1-.786,1.9A3.028,3.028,0,0,1,28.425,0h-3.5a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-8.71a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11h3.445a2.354,2.354,0,0,1,1.71.6A2.174,2.174,0,0,1,30.7-6.864a2.3,2.3,0,0,1-.338,1.235A1.935,1.935,0,0,1,29.4-4.836ZM29.868-6.8a1.493,1.493,0,0,0-.423-1.125,1.62,1.62,0,0,0-1.177-.409h-2.9v3.25h2.9a1.615,1.615,0,0,0,1.151-.455A1.692,1.692,0,0,0,29.868-6.8ZM28.386-.767a2.155,2.155,0,0,0,1.41-.442,1.614,1.614,0,0,0,.54-1.326,1.589,1.589,0,0,0-.552-1.339A2.254,2.254,0,0,0,28.36-4.3H25.37V-.767ZM38.2-6.643a.368.368,0,0,1,.279.117.4.4,0,0,1,.111.286V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1,38.2,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279v-.871a2.724,2.724,0,0,1-.975.988,2.638,2.638,0,0,1-1.417.4,2.8,2.8,0,0,1-1.566-.455A3.127,3.127,0,0,1,32.76-1.573a3.927,3.927,0,0,1-.4-1.781,3.835,3.835,0,0,1,.4-1.775,3.088,3.088,0,0,1,1.1-1.228,2.814,2.814,0,0,1,1.54-.442,2.8,2.8,0,0,1,1.43.377,2.483,2.483,0,0,1,.975.988V-6.24a.4.4,0,0,1,.111-.286A.368.368,0,0,1,38.2-6.643ZM35.5-.6a2.151,2.151,0,0,0,1.215-.358,2.422,2.422,0,0,0,.845-.988,3.193,3.193,0,0,0,.306-1.41,3.091,3.091,0,0,0-.306-1.378,2.431,2.431,0,0,0-.845-.982A2.151,2.151,0,0,0,35.5-6.071a2.18,2.18,0,0,0-1.215.351,2.393,2.393,0,0,0-.845.968,3.11,3.11,0,0,0-.306,1.4,3.251,3.251,0,0,0,.3,1.41,2.376,2.376,0,0,0,.838.988A2.173,2.173,0,0,0,35.5-.6Zm8.268-6.2a2.134,2.134,0,0,1,1.775.708A2.924,2.924,0,0,1,46.1-4.212V-.39a.368.368,0,0,1-.117.279A.385.385,0,0,1,45.715,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-4.173A2.124,2.124,0,0,0,44.9-5.544,1.575,1.575,0,0,0,43.6-6.071a2.267,2.267,0,0,0-1.06.26,2.267,2.267,0,0,0-.812.7,1.586,1.586,0,0,0-.312.942V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1,41.021,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-6.214a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11.379.379,0,0,1,.279.11.379.379,0,0,1,.111.28V-5.5a2.758,2.758,0,0,1,1.007-.93A2.706,2.706,0,0,1,43.764-6.8ZM53.41-.689a.434.434,0,0,1,.117.3.345.345,0,0,1-.137.279A.416.416,0,0,1,53.138,0a.357.357,0,0,1-.286-.143L49.979-3.185,49-2.353V-.39a.379.379,0,0,1-.11.279.379.379,0,0,1-.28.111.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-9.23a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11.379.379,0,0,1,.28.11.379.379,0,0,1,.11.28V-3.3L52.76-6.539a.357.357,0,0,1,.273-.13.352.352,0,0,1,.26.124.382.382,0,0,1,.117.266.423.423,0,0,1-.143.3L50.59-3.7Zm2.444.3a.379.379,0,0,1-.11.279.379.379,0,0,1-.28.111.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-6.37a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11.379.379,0,0,1,.28.11.379.379,0,0,1,.11.28Zm-.39-7.241a.6.6,0,0,1-.4-.123.447.447,0,0,1-.143-.358v-.13a.437.437,0,0,1,.149-.358.624.624,0,0,1,.41-.123q.52,0,.52.481v.13a.457.457,0,0,1-.137.358A.572.572,0,0,1,55.465-7.631Zm5.551.832a2.134,2.134,0,0,1,1.775.708,2.924,2.924,0,0,1,.565,1.878V-.39a.368.368,0,0,1-.117.279A.385.385,0,0,1,62.966,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-4.173a2.124,2.124,0,0,0-.423-1.371,1.575,1.575,0,0,0-1.306-.527,2.267,2.267,0,0,0-1.06.26,2.267,2.267,0,0,0-.812.7,1.586,1.586,0,0,0-.312.942V-.39a.379.379,0,0,1-.111.279A.379.379,0,0,1,58.273,0a.379.379,0,0,1-.279-.111.379.379,0,0,1-.111-.279V-6.214a.379.379,0,0,1,.111-.28.379.379,0,0,1,.279-.11.379.379,0,0,1,.279.11.379.379,0,0,1,.111.28V-5.5a2.758,2.758,0,0,1,1.007-.93A2.706,2.706,0,0,1,61.016-6.8Zm10,.156a.379.379,0,0,1,.28.11.4.4,0,0,1,.11.293V-.611a3.377,3.377,0,0,1-.423,1.735,2.8,2.8,0,0,1-1.157,1.1,3.635,3.635,0,0,1-1.684.377,4.2,4.2,0,0,1-.955-.117,3.806,3.806,0,0,1-.858-.3q-.358-.182-.41-.377a.286.286,0,0,1-.091-.208.239.239,0,0,1,.117-.208.211.211,0,0,1,.13-.039,1.008,1.008,0,0,1,.3.091l.273.117a4.192,4.192,0,0,0,1.508.312,2.451,2.451,0,0,0,1.813-.656,2.4,2.4,0,0,0,.657-1.775v-.806A2.4,2.4,0,0,1,69.6-.266a2.945,2.945,0,0,1-1.469.4,3,3,0,0,1-1.618-.448A3.152,3.152,0,0,1,65.37-1.56a3.775,3.775,0,0,1-.416-1.781,3.747,3.747,0,0,1,.416-1.768,3.152,3.152,0,0,1,1.137-1.241A2.98,2.98,0,0,1,68.114-6.8a2.864,2.864,0,0,1,1.5.41,2.743,2.743,0,0,1,1.007.981V-6.24a.4.4,0,0,1,.111-.286A.368.368,0,0,1,71.012-6.643ZM68.191-.6a2.412,2.412,0,0,0,1.281-.345,2.355,2.355,0,0,0,.884-.975,3.113,3.113,0,0,0,.318-1.424,3.073,3.073,0,0,0-.318-1.417,2.364,2.364,0,0,0-.884-.969,2.412,2.412,0,0,0-1.281-.345,2.323,2.323,0,0,0-1.268.358,2.456,2.456,0,0,0-.884.982,3.015,3.015,0,0,0-.319,1.391,3.044,3.044,0,0,0,.319,1.4,2.456,2.456,0,0,0,.884.982A2.323,2.323,0,0,0,68.191-.6Z" transform="translate(215 526.619)"/>%0A  </g>%0A</svg>%0A';

// src/assets/icons/ramaaztech.svg
var ramaaztech_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="102.253" height="27.649" viewBox="0 0 102.253 27.649">%0A  <g id="Group_7961" data-name="Group 7961" transform="translate(-167 -874)">%0A    <g id="Group_7959" data-name="Group 7959" transform="translate(3)">%0A      <text id="powered_by" data-name="powered by" transform="translate(164 883)" fill="%23404040" font-size="8" font-family="SegoeUI-Light, Segoe UI" font-weight="300" letter-spacing="0.01em"><tspan x="0" y="0">Powered By</tspan></text>%0A      <path id="Path_16119" data-name="Path 16119" d="M7.657-33.909a1.212,1.212,0,0,1,.8.269.8.8,0,0,1,.325.634.982.982,0,0,1-.254.737.836.836,0,0,1-.6.246,1.582,1.582,0,0,1-.539-.111q-.048-.016-.214-.063a1.293,1.293,0,0,0-.357-.048,1.409,1.409,0,0,0-.793.254,1.851,1.851,0,0,0-.626.769,2.831,2.831,0,0,0-.246,1.229v3.757a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.91.91,0,0,1-.682-.277.951.951,0,0,1-.269-.69v-6.547a.951.951,0,0,1,.269-.69A.91.91,0,0,1,4.2-33.75a.91.91,0,0,1,.682.277.951.951,0,0,1,.269.69v.206A2.4,2.4,0,0,1,6.2-33.568,3.217,3.217,0,0,1,7.657-33.909Zm9.543,0a.924.924,0,0,1,.682.269.944.944,0,0,1,.269.7v6.705a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.9.9,0,0,1-.674-.269,1,1,0,0,1-.277-.682,3.253,3.253,0,0,1-1.07.785,3.225,3.225,0,0,1-1.419.325,3.624,3.624,0,0,1-1.981-.563,3.945,3.945,0,0,1-1.4-1.561A4.872,4.872,0,0,1,9.86-29.5a4.984,4.984,0,0,1,.507-2.275,3.9,3.9,0,0,1,1.387-1.569,3.53,3.53,0,0,1,1.942-.563,3.672,3.672,0,0,1,1.427.277,3.746,3.746,0,0,1,1.125.705v-.016a.951.951,0,0,1,.269-.69A.91.91,0,0,1,17.2-33.909ZM14-26.855a2.117,2.117,0,0,0,1.68-.753,2.8,2.8,0,0,0,.65-1.894,2.826,2.826,0,0,0-.65-1.9A2.107,2.107,0,0,0,14-32.165a2.091,2.091,0,0,0-1.664.761,2.826,2.826,0,0,0-.65,1.9,2.817,2.817,0,0,0,.642,1.894A2.093,2.093,0,0,0,14-26.855Zm16.391-7.054a2.36,2.36,0,0,1,2.172.959,4.977,4.977,0,0,1,.6,2.655v4.058a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.91.91,0,0,1-.682-.277.951.951,0,0,1-.269-.69v-4.058a2.4,2.4,0,0,0-.341-1.371,1.345,1.345,0,0,0-1.2-.5,1.811,1.811,0,0,0-1.387.531,1.878,1.878,0,0,0-.5,1.339v4.058a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.91.91,0,0,1-.682-.277.951.951,0,0,1-.269-.69v-4.058a2.4,2.4,0,0,0-.341-1.371,1.345,1.345,0,0,0-1.2-.5,1.811,1.811,0,0,0-1.387.531,1.878,1.878,0,0,0-.5,1.339v4.058a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.91.91,0,0,1-.682-.277.951.951,0,0,1-.269-.69v-6.547a.951.951,0,0,1,.269-.69.91.91,0,0,1,.682-.277.91.91,0,0,1,.682.277.951.951,0,0,1,.269.69v.254A3.871,3.871,0,0,1,23.6-33.5a2.745,2.745,0,0,1,1.466-.4,2.4,2.4,0,0,1,2.552,1.744,3.733,3.733,0,0,1,1.1-1.2A2.762,2.762,0,0,1,30.388-33.909Zm12.095,0a.924.924,0,0,1,.682.269.944.944,0,0,1,.269.7v6.705a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.9.9,0,0,1-.674-.269,1,1,0,0,1-.277-.682,3.253,3.253,0,0,1-1.07.785,3.225,3.225,0,0,1-1.419.325,3.624,3.624,0,0,1-1.981-.563,3.945,3.945,0,0,1-1.4-1.561,4.872,4.872,0,0,1-.515-2.267,4.984,4.984,0,0,1,.507-2.275,3.9,3.9,0,0,1,1.387-1.569,3.53,3.53,0,0,1,1.942-.563,3.672,3.672,0,0,1,1.427.277,3.747,3.747,0,0,1,1.125.705v-.016a.951.951,0,0,1,.269-.69A.91.91,0,0,1,42.483-33.909Zm-3.2,7.054a2.117,2.117,0,0,0,1.68-.753,2.8,2.8,0,0,0,.65-1.894,2.826,2.826,0,0,0-.65-1.9,2.107,2.107,0,0,0-1.68-.761,2.091,2.091,0,0,0-1.664.761,2.826,2.826,0,0,0-.65,1.9,2.817,2.817,0,0,0,.642,1.894A2.093,2.093,0,0,0,39.281-26.855Zm13.632-7.054a.924.924,0,0,1,.682.269.944.944,0,0,1,.269.7v6.705a.951.951,0,0,1-.269.69.91.91,0,0,1-.682.277.9.9,0,0,1-.674-.269,1,1,0,0,1-.277-.682,3.253,3.253,0,0,1-1.07.785,3.225,3.225,0,0,1-1.419.325,3.624,3.624,0,0,1-1.981-.563,3.945,3.945,0,0,1-1.4-1.561,4.872,4.872,0,0,1-.515-2.267,4.984,4.984,0,0,1,.507-2.275,3.9,3.9,0,0,1,1.387-1.569,3.53,3.53,0,0,1,1.942-.563,3.672,3.672,0,0,1,1.427.277,3.746,3.746,0,0,1,1.125.705v-.016a.951.951,0,0,1,.269-.69A.91.91,0,0,1,52.913-33.909Zm-3.2,7.054a2.117,2.117,0,0,0,1.68-.753,2.8,2.8,0,0,0,.65-1.894,2.826,2.826,0,0,0-.65-1.9,2.107,2.107,0,0,0-1.68-.761,2.091,2.091,0,0,0-1.664.761,2.826,2.826,0,0,0-.65,1.9,2.817,2.817,0,0,0,.642,1.894A2.093,2.093,0,0,0,49.711-26.855Zm12.016-.159a.875.875,0,0,1,.634.246.834.834,0,0,1,.254.626.841.841,0,0,1-.254.618.86.86,0,0,1-.634.254h-5.1a.8.8,0,0,1-.61-.262.81.81,0,0,1-.246-.563,1.388,1.388,0,0,1,.063-.452,1.671,1.671,0,0,1,.238-.42l3.773-4.882H56.765a.86.86,0,0,1-.634-.254.86.86,0,0,1-.254-.634.815.815,0,0,1,.254-.61.875.875,0,0,1,.634-.246h4.882a.81.81,0,0,1,.594.246.829.829,0,0,1,.246.61,1.488,1.488,0,0,1-.048.4,1.2,1.2,0,0,1-.222.388l-3.8,4.93Zm9.265-5.437v5.31a1.135,1.135,0,0,0,.222.816.809.809,0,0,0,.587.214.921.921,0,0,0,.238-.04.894.894,0,0,1,.222-.04.315.315,0,0,1,.246.119.41.41,0,0,1,.1.277.435.435,0,0,1-.254.373,1.158,1.158,0,0,1-.6.151,3.3,3.3,0,0,1-.761-.079,1.208,1.208,0,0,1-.642-.476,2.071,2.071,0,0,1-.309-1.268v-5.358H68.884a.457.457,0,0,1-.325-.127.417.417,0,0,1-.135-.317.417.417,0,0,1,.135-.317.457.457,0,0,1,.325-.127h1.157V-35.1a.462.462,0,0,1,.135-.341.462.462,0,0,1,.341-.135.462.462,0,0,1,.341.135.462.462,0,0,1,.135.341v1.76h1.585a.414.414,0,0,1,.309.143.452.452,0,0,1,.135.317.4.4,0,0,1-.127.309.446.446,0,0,1-.317.119Zm10.954,2.663a.431.431,0,0,1-.143.325.47.47,0,0,1-.333.135H75.478a3.663,3.663,0,0,0,.388,1.7,2.934,2.934,0,0,0,1.11,1.189,3.231,3.231,0,0,0,1.7.436,2.882,2.882,0,0,0,1.363-.317,2.808,2.808,0,0,0,.967-.808.536.536,0,0,1,.333-.143.394.394,0,0,1,.285.127.394.394,0,0,1,.127.285.47.47,0,0,1-.159.333,3.989,3.989,0,0,1-1.276,1.015,3.5,3.5,0,0,1-1.625.4,4.342,4.342,0,0,1-2.156-.523A3.708,3.708,0,0,1,75.082-27.1a4.42,4.42,0,0,1-.523-2.18,4.8,4.8,0,0,1,.515-2.275,3.715,3.715,0,0,1,1.371-1.49,3.477,3.477,0,0,1,1.823-.515,3.733,3.733,0,0,1,1.783.444,3.511,3.511,0,0,1,1.355,1.3A3.92,3.92,0,0,1,81.946-29.787Zm-3.678-2.853a2.656,2.656,0,0,0-1.7.634,2.938,2.938,0,0,0-1.007,1.823h5.405v-.127a2.5,2.5,0,0,0-.476-1.244,2.581,2.581,0,0,0-.991-.808A2.874,2.874,0,0,0,78.268-32.641Zm9.543-.919a5.514,5.514,0,0,1,1.387.166,3.01,3.01,0,0,1,1.03.452.788.788,0,0,1,.388.618.483.483,0,0,1-.119.317.368.368,0,0,1-.293.143.492.492,0,0,1-.262-.063,1.312,1.312,0,0,1-.23-.19,1.573,1.573,0,0,0-.4-.3,2.635,2.635,0,0,0-.626-.182,4.607,4.607,0,0,0-.832-.071,2.98,2.98,0,0,0-1.593.444,3.148,3.148,0,0,0-1.133,1.2,3.47,3.47,0,0,0-.412,1.68,3.65,3.65,0,0,0,.4,1.712,3.012,3.012,0,0,0,1.1,1.2A3,3,0,0,0,87.827-26a3.51,3.51,0,0,0,.911-.1,3.448,3.448,0,0,0,.674-.269,3.378,3.378,0,0,0,.38-.285,1.5,1.5,0,0,1,.222-.166.4.4,0,0,1,.206-.055.392.392,0,0,1,.3.119.435.435,0,0,1,.111.309.824.824,0,0,1-.38.579,3.325,3.325,0,0,1-1.046.531,4.641,4.641,0,0,1-1.474.222,3.9,3.9,0,0,1-2.061-.547,3.732,3.732,0,0,1-1.4-1.514,4.662,4.662,0,0,1-.5-2.172,4.455,4.455,0,0,1,.507-2.116A3.934,3.934,0,0,1,85.7-32.99,3.915,3.915,0,0,1,87.811-33.56Zm8.734.127a2.525,2.525,0,0,1,2.124.9,3.644,3.644,0,0,1,.7,2.306v4.486a.462.462,0,0,1-.135.341.462.462,0,0,1-.341.135.462.462,0,0,1-.341-.135.462.462,0,0,1-.135-.341v-4.486a2.676,2.676,0,0,0-.491-1.672,1.813,1.813,0,0,0-1.538-.642,2.64,2.64,0,0,0-1.26.317,2.66,2.66,0,0,0-.959.848,1.991,1.991,0,0,0-.365,1.149v4.486a.462.462,0,0,1-.135.341.462.462,0,0,1-.341.135.462.462,0,0,1-.341-.135.462.462,0,0,1-.135-.341V-36.524a.462.462,0,0,1,.135-.341A.462.462,0,0,1,93.327-37a.462.462,0,0,1,.341.135.462.462,0,0,1,.135.341v4.645A3.32,3.32,0,0,1,94.992-33,3.091,3.091,0,0,1,96.545-33.433Z" transform="translate(160.75 926.76)" fill="%23404040"/>%0A      <g id="Group_7932" data-name="Group 7932" transform="translate(207.671 885)">%0A        <path id="Path_16118" data-name="Path 16118" d="M-.358-6.405a.142.142,0,0,1-.1-.045.142.142,0,0,1,.006-.2A13.311,13.311,0,0,1,1.489-8.1a11.217,11.217,0,0,1,2.016-1,6.867,6.867,0,0,1,2.359-.458,7.176,7.176,0,0,1,2.395.457,12.344,12.344,0,0,1,2.1,1,15.272,15.272,0,0,1,2.062,1.452.142.142,0,0,1,.014.2.142.142,0,0,1-.2.014,14.98,14.98,0,0,0-2.024-1.424A12.051,12.051,0,0,0,8.16-8.839a6.892,6.892,0,0,0-2.3-.44,6.585,6.585,0,0,0-2.261.44,10.934,10.934,0,0,0-1.964.975A13.264,13.264,0,0,0-.26-6.444.142.142,0,0,1-.358-6.405Z" transform="translate(1.309 9.562)" fill="%23555"/>%0A        <path id="Path_19225" data-name="Path 19225" d="M.951.284a.667.667,0,1,0,.667.667A.667.667,0,0,0,.951.284M.951,0A.951.951,0,1,1,0,.951.951.951,0,0,1,.951,0Z" transform="translate(0 2.857)" fill="%23555"/>%0A        <path id="Path_19226" data-name="Path 19226" d="M.951,0A.951.951,0,1,1,0,.951.951.951,0,0,1,.951,0Z" transform="translate(12.681 2.857)" fill="%23555"/>%0A        <path id="Path_19226_-_Outline" data-name="Path 19226 - Outline" d="M.951.284a.667.667,0,1,0,.667.667A.667.667,0,0,0,.951.284M.951,0A.951.951,0,1,1,0,.951.951.951,0,0,1,.951,0Z" transform="translate(12.681 2.857)" fill="%23555"/>%0A      </g>%0A    </g>%0A    <g id="Group_7936" data-name="Group 7936" transform="translate(263.126 885)">%0A      <g id="Group_7935" data-name="Group 7935" transform="translate(0 0)">%0A        <path id="Ellipse_321" data-name="Ellipse 321" d="M3.063.411A2.653,2.653,0,0,0,1.188,4.939,2.653,2.653,0,1,0,4.939,1.188,2.635,2.635,0,0,0,3.063.411m0-.411A3.063,3.063,0,1,1,0,3.063,3.063,3.063,0,0,1,3.063,0Z" transform="translate(0 0)" fill="%23555"/>%0A        <path id="Path_16096" data-name="Path 16096" d="M5.531-25.429a.222.222,0,0,1,.066.073.178.178,0,0,1,.025.089.149.149,0,0,1-.056.129.22.22,0,0,1-.135.041A.249.249,0,0,1,5.3-25.13a.517.517,0,0,1-.2-.228,1.073,1.073,0,0,1-.079-.465.369.369,0,0,0-.124-.307.5.5,0,0,0-.324-.1H3.731v.933a.207.207,0,0,1-.05.143.164.164,0,0,1-.129.056.245.245,0,0,1-.164-.058A.179.179,0,0,1,3.32-25.3V-27.8a.192.192,0,0,1,.058-.141A.192.192,0,0,1,3.519-28H4.685a.794.794,0,0,1,.411.11.826.826,0,0,1,.3.3.847.847,0,0,1,.112.433.809.809,0,0,1-.124.433.8.8,0,0,1-.319.3.611.611,0,0,1,.243.22.656.656,0,0,1,.1.328,2.3,2.3,0,0,0,.037.321A.179.179,0,0,0,5.531-25.429Zm-.854-1.145a.358.358,0,0,0,.2-.083.541.541,0,0,0,.151-.2.673.673,0,0,0,.058-.284.494.494,0,0,0-.122-.338.381.381,0,0,0-.3-.139H3.731v1.045Z" transform="translate(-1.422 29.62)" fill="%23555"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/auth/change_user.svg
var change_user_default = 'data:image/svg+xml,<svg id="_15x15_photo_back" data-name="15x15 photo back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="15" height="15" viewBox="0 0 15 15"><g id="Mask_Group_212" data-name="Mask Group 212"><g id="exchange"><g id="Group_7948" data-name="Group 7948"><g id="Group_7947" data-name="Group 7947"><path id="Path_19229" data-name="Path 19229" d="M9.167,13.9A6.615,6.615,0,0,1,1.313,9.836a6.542,6.542,0,0,1-.1-4.385A6.66,6.66,0,0,1,3,2.654L2.849,3.9l.877.106.332-2.754L1.339.934l-.1.877,1.219.144A7.548,7.548,0,0,0,.373,5.176,7.5,7.5,0,0,0,9.39,14.757Z" fill="%238e8e8e"></path></g></g><g id="Group_7950" data-name="Group 7950"><g id="Group_7949" data-name="Group 7949"><path id="Path_19230" data-name="Path 19230" d="M14.545,10.062A7.5,7.5,0,0,0,5.184.37l.274.84a6.611,6.611,0,0,1,6.107,11.5l.164-1.359-.877-.106L10.519,14l2.719.322.1-.877-1.115-.132A7.517,7.517,0,0,0,14.545,10.062Z" fill="%238e8e8e"></path></g></g><g id="Group_7954" data-name="Group 7954" transform="translate(1.149 -0.508)"><g id="Group_7953" data-name="Group 7953"><path id="Path_19232" data-name="Path 19232" d="M8.12,7.744a1.873,1.873,0,1,0-2.91,0A2.649,2.649,0,0,0,3.547,10.2v.442H9.788V10.2A2.649,2.649,0,0,0,8.12,7.744Z" fill="%238e8e8e"></path></g></g></g></g></svg>';

// src/assets/icons/auth/clear_login.svg
var clear_login_default = 'data:image/svg+xml,<svg id="_15x15_photo_back" data-name="15x15 photo back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="15" height="15" viewBox="0 0 15 15"><g id="Mask_Group_211" data-name="Mask Group 211"><g id="bin"><g id="Group_7944" data-name="Group 7944"><g id="Group_7943" data-name="Group 7943"><path id="Path_19227" data-name="Path 19227" d="M1.822,4.395l.778,9.4A1.325,1.325,0,0,0,3.914,15h7.172A1.325,1.325,0,0,0,12.4,13.791l.778-9.4ZM5.3,13.242a.439.439,0,0,1-.438-.412L4.425,5.74a.439.439,0,0,1,.411-.466.433.433,0,0,1,.466.411l.439,7.09A.44.44,0,0,1,5.3,13.242ZM7.939,12.8a.439.439,0,0,1-.879,0V5.713a.439.439,0,0,1,.879,0ZM10.575,5.74l-.439,7.09a.439.439,0,0,1-.877-.055L9.7,5.685a.447.447,0,0,1,.466-.411A.439.439,0,0,1,10.575,5.74Z" fill="%238e8e8e"></path></g></g><g id="Group_7946" data-name="Group 7946"><g id="Group_7945" data-name="Group 7945"><path id="Path_19228" data-name="Path 19228" d="M13.213,1.758H10.576V1.318A1.32,1.32,0,0,0,9.258,0H5.742A1.32,1.32,0,0,0,4.424,1.318v.439H1.787a.879.879,0,0,0,0,1.758H13.213a.879.879,0,0,0,0-1.758Zm-3.516,0H5.3V1.318A.44.44,0,0,1,5.742.879H9.258a.44.44,0,0,1,.439.439Z" fill="%238e8e8e"></path></g></g></g></g></svg>';

// src/assets/icons/auth/enterUser.svg
var enterUser_default = 'data:image/svg+xml,<svg id="_20x20" data-name="20x20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">%0A    <g id="Mask_Group_470" data-name="Mask Group 470">%0A        <g id="arrow-2" transform="translate(-0.666 -0.666)">%0A            <path id="Path_22008" data-name="Path 22008" d="M1.569,12.865a.667.667,0,0,0-.433.837,10,10,0,1,0,0-6.071.667.667,0,0,0,1.271.4,8.667,8.667,0,1,1,0,5.262.667.667,0,0,0-.837-.433Z" fill="%238E8E8E" />%0A            <path id="Path_22009" data-name="Path 22009" d="M9.222,15a.667.667,0,0,0,1.132.477L14.8,11.144a.667.667,0,0,0,0-.955L10.354,5.856a.667.667,0,0,0-1.132.477V10H1.333a.667.667,0,1,0,0,1.333H9.222Z" fill="%238E8E8E" />%0A        </g>%0A    </g>%0A</svg>';

// src/assets/icons/auth/forget_password.svg
var forget_password_default = 'data:image/svg+xml,<svg id="_15x15_photo_back" data-name="15x15 photo back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="15" height="15" viewBox="0 0 15 15"><g id="Mask_Group_213" data-name="Mask Group 213"><g id="forgot-password"><path id="Path_19233" data-name="Path 19233" d="M5.01,4.248a2.49,2.49,0,0,1,4.98,0v1.23h1.758V4.248a4.248,4.248,0,0,0-8.5,0v1.23H5.01Z" fill="%238e8e8e"></path><path id="Path_19234" data-name="Path 19234" d="M12.48,6.357H2.52A.439.439,0,0,0,2.08,6.8v7.764A.439.439,0,0,0,2.52,15H12.48a.439.439,0,0,0,.439-.439V6.8A.439.439,0,0,0,12.48,6.357ZM7.5,13.2a.439.439,0,1,1,.439-.439A.439.439,0,0,1,7.5,13.2Zm1.122-2.69a1.553,1.553,0,0,1-.683.418v.339a.439.439,0,0,1-.879,0v-.714a.439.439,0,0,1,.439-.439.669.669,0,0,0,.668-.7.67.67,0,0,0-.654-.632H7.5a.668.668,0,0,0-.662.575.681.681,0,0,0-.007.094.439.439,0,0,1-.879,0,1.547,1.547,0,0,1,3.093-.082A1.535,1.535,0,0,1,8.622,10.508Z" fill="%238e8e8e"></path></g></g></svg>';

// src/assets/icons/auth/lock.svg
var lock_default = 'data:image/svg+xml,<svg id="_20X20_photo_Back" data-name="20X20 photo Back" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4536" data-name="Rectangle 4536" width="20" height="20" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Mask_Group_111" data-name="Mask Group 111" clipPath="url(%23clip-path)">%0A    <g id="Layer_x0020_1">%0A      <g id="_224855104">%0A        <path id="_224854888" d="M5.4,7.511A1.669,1.669,0,0,0,3.729,9.178v8.805A1.668,1.668,0,0,0,5.4,19.649H14.6a1.668,1.668,0,0,0,1.666-1.666V9.178A1.668,1.668,0,0,0,14.6,7.511ZM14.6,20H5.4a2.02,2.02,0,0,1-2.018-2.017V9.178A2.02,2.02,0,0,1,5.4,7.16H14.6a2.02,2.02,0,0,1,2.017,2.017v8.805A2.02,2.02,0,0,1,14.6,20Z" fill="%23404040" fill-rule="evenodd"/>%0A        <path id="_224854648" d="M14.036,7.511a.175.175,0,0,1-.176-.175V4.179a3.7,3.7,0,0,0-1.2-2.871A4,4,0,0,0,10,.351,3.685,3.685,0,0,0,6.14,4.179V7.336a.175.175,0,0,1-.351,0V4.179A4.037,4.037,0,0,1,7.11,1.045,4.348,4.348,0,0,1,10,0a4.348,4.348,0,0,1,2.89,1.045,4.037,4.037,0,0,1,1.321,3.134V7.336a.176.176,0,0,1-.176.175Z" fill="%23404040" fill-rule="evenodd"/>%0A        <path id="_224854840" d="M10,11.429a1.131,1.131,0,1,0,1.131,1.131A1.132,1.132,0,0,0,10,11.429Zm0,2.613a1.482,1.482,0,1,1,1.482-1.482A1.484,1.484,0,0,1,10,14.042Z" fill="%23404040" fill-rule="evenodd"/>%0A        <path id="_224855056" d="M10,16.082a.175.175,0,0,1-.176-.175V13.866a.175.175,0,0,1,.351,0v2.041a.176.176,0,0,1-.176.175Z" fill="%23404040" fill-rule="evenodd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/assets/icons/auth/user.svg
var user_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">%0A  <defs>%0A    <clipPath id="clip-path">%0A      <rect id="Rectangle_4644" data-name="Rectangle 4644" width="20" height="20" transform="translate(0 -0.211)" fill="none"/>%0A    </clipPath>%0A  </defs>%0A  <g id="Group_12038" data-name="Group 12038" transform="translate(-493 -467)">%0A    <g id="Mask_Group_297" data-name="Mask Group 297" transform="translate(493 467.211)" clip-path="url(%23clip-path)">%0A      <g id="Group_13" data-name="Group 13" transform="translate(2.122 0)">%0A        <path id="Path_20" data-name="Path 20" d="M439.822,103.746c.524-.112,1.007-.545,1.086-1.5.065-.786-.136-1.19-.435-1.4.825-3.367-1.452-4.026-1.452-4.026A3.417,3.417,0,0,0,434,95.958a5.933,5.933,0,0,0-1.47,1.261,5.247,5.247,0,0,0-1.123,3.516c-.406.151-.725.547-.645,1.514.083,1,.606,1.431,1.158,1.514a4.015,4.015,0,0,0,7.906-.014Zm-3.956,2.472c-2.009,0-3.634-2.725-3.634-4.989,0-.3.009-.6.029-.863a6.893,6.893,0,0,0,5.625-2.073,6.6,6.6,0,0,1,1.6,2.863v.073c.014,2.26-1.6,4.99-3.614,4.99Z" transform="translate(-428.052 -95.214)" fill="%23ddd"/>%0A        <path id="Path_21" data-name="Path 21" d="M432.76,117.878l.233-.963a.562.562,0,0,1,.162-.279l-.07-.053-2.079-1.721-1.266.3a4.592,4.592,0,0,0-3.65,4.391v2.725a1.011,1.011,0,0,0,1.048.964h5.355l.816-4.654a.568.568,0,0,1-.549-.713Z" transform="translate(-426.09 -103.457)" fill="%23ddd"/>%0A        <path id="Path_22" data-name="Path 22" d="M444.072,115.161l-1.247-.3-2.076,1.721-.07.053a.563.563,0,0,1,.163.279l.233.963a.568.568,0,0,1-.549.7l.816,4.654H446.7a.972.972,0,0,0,1.005-.964v-2.725a4.571,4.571,0,0,0-3.629-4.379Z" transform="translate(-432.156 -103.46)" fill="%23ddd"/>%0A      </g>%0A    </g>%0A  </g>%0A</svg>%0A';

// src/components/icons/index.tsx
var import_jsx_runtime65 = require("react/jsx-runtime");
var iconsMap = {
  "rdb": rdb_default,
  "ramaaztech": ramaaztech_default,
  "rdbsmall": rdbsmall_default,
  "auth/change_user": change_user_default,
  "auth/clear_login": clear_login_default,
  "auth/enterUser": enterUser_default,
  "auth/forget_password": forget_password_default,
  "auth/lock": lock_default,
  "auth/user": user_default
};
var Icon = ({ name, className, ...props }) => {
  const src = iconsMap[name];
  if (!src) {
    console.warn(`Icon "${name}" not found in iconsMap`);
    return null;
  }
  const imageSrc = typeof src === "string" ? src : src.src || src;
  return /* @__PURE__ */ (0, import_jsx_runtime65.jsx)(
    "img",
    {
      src: imageSrc,
      alt: name,
      className,
      ...props
    }
  );
};
var RdbIcon = (props) => /* @__PURE__ */ (0, import_jsx_runtime65.jsx)(
  import_image22.default,
  {
    src: rdb_default,
    alt: "RDB Logo",
    width: 155,
    height: 141,
    priority: true,
    ...props,
    className: `object-contain ${props.className || ""}`
  }
);
var LoaderBarIcon = ({ percent = 100, ...props }) => {
  const filledWidth = Math.max(0, Math.min(146, percent / 100 * 146));
  return /* @__PURE__ */ (0, import_jsx_runtime65.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "147", height: "5", viewBox: "0 0 147 5", ...props, children: /* @__PURE__ */ (0, import_jsx_runtime65.jsx)("g", { id: "Group_11964", "data-name": "Group 11964", transform: "translate(-98 -529)", children: /* @__PURE__ */ (0, import_jsx_runtime65.jsxs)("g", { id: "Group_11963", "data-name": "Group 11963", transform: "translate(98 529)", children: [
    /* @__PURE__ */ (0, import_jsx_runtime65.jsxs)("g", { id: "Rectangle_5503", "data-name": "Rectangle 5503", fill: "none", stroke: "#707070", strokeWidth: "0.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime65.jsx)("rect", { width: "146", height: "5", rx: "2.5", stroke: "none" }),
      /* @__PURE__ */ (0, import_jsx_runtime65.jsx)("rect", { x: "0.25", y: "0.25", width: "145.5", height: "4.5", rx: "2.25", fill: "none" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime65.jsx)(
      "rect",
      {
        id: "Rectangle_5504",
        "data-name": "Rectangle 5504",
        width: filledWidth,
        height: "5",
        rx: "2.5",
        fill: "#3066cc"
      }
    )
  ] }) }) });
};

// src/components/auth/screens/GetStarted.tsx
var import_jsx_runtime66 = require("react/jsx-runtime");
function GetStartedScreen({
  onExistingAccount,
  onNewCustomer,
  onLater
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime66.jsxs)("main", { className: "w-full h-full flex flex-col items-center bg-background px-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime66.jsxs)("div", { className: "flex-2 flex flex-col items-center justify-center w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)("div", { className: "h-[15%] shrink-0" }),
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)(RdbIcon, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime66.jsxs)("div", { className: "flex-[1.5] flex flex-col items-center justify-center w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)("h2", { className: "text-[24px] font-semibold text-foreground text-center", children: t.auth.getStarted.title }),
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)("div", { className: "h-[2vh] shrink-0" }),
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)("p", { className: "text-[13px] leading-[1.6] text-foreground/70 text-center text-balance max-w-[320px]", children: t.auth.getStarted.description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime66.jsxs)("div", { className: "flex-[1.5] flex flex-col items-center justify-end w-full pb-10 gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime66.jsxs)("div", { className: "flex flex-col items-center gap-2.5 w-full max-w-87.5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime66.jsx)(Button, { onClick: onExistingAccount, children: t.auth.getStarted.haveAccount }),
        /* @__PURE__ */ (0, import_jsx_runtime66.jsx)(Button, { onClick: onNewCustomer, children: t.auth.getStarted.newCustomer })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)("div", { className: "h-[1vh] shrink-0" }),
      /* @__PURE__ */ (0, import_jsx_runtime66.jsx)(
        "button",
        {
          onClick: onLater,
          className: "text-[13px] text-foreground/50 underline underline-offset-2 transition-colors hover:text-foreground/70",
          children: t.auth.getStarted.later
        }
      )
    ] })
  ] });
}

// src/components/auth/screens/SelectMethod.tsx
var import_lucide_react7 = require("lucide-react");

// src/components/icons/svg.tsx
var import_jsx_runtime67 = require("react/jsx-runtime");
var WhatsAppIcon = ({ className = "w-6 h-6" }) => /* @__PURE__ */ (0, import_jsx_runtime67.jsx)(
  "svg",
  {
    viewBox: "0 0 24 24",
    className,
    fill: "#25D366",
    xmlns: "http://www.w3.org/2000/svg",
    children: /* @__PURE__ */ (0, import_jsx_runtime67.jsx)("path", { d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" })
  }
);

// src/components/auth/screens/SelectMethod.tsx
var import_jsx_runtime68 = require("react/jsx-runtime");
function SelectMethod({
  setMethod,
  method,
  changeNumber,
  phone,
  authType,
  loading = false
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(
    AuthLayout,
    {
      title: authType === "signUp" ? t.auth.enterPhone.signUpTitle : t.auth.enterPhone.signInTitle,
      children: /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)("div", { className: "w-full max-w-95 flex flex-col items-center gap-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)("div", { className: "flex flex-col pb-12 items-center gap-2 text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(import_lucide_react7.Info, { className: "w-4 h-4 text-gray-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime68.jsx)("p", { className: "text-[13px] text-gray-500", children: t.auth.selectMethod.info })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)("p", { className: "text-[15px] font-semibold text-gray-800 flex items-center gap-2", children: [
            phone,
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(
              "span",
              {
                onClick: changeNumber,
                className: "text-blue-500 cursor-pointer text-xs",
                children: /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(import_lucide_react7.Pencil, { className: "w-3.5 h-3.5 text-blue-500 group-hover:text-blue-600" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)("div", { className: "flex gap-3 w-full justify-center mt-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)(
            "button",
            {
              onClick: () => setMethod("whatsapp"),
              className: `flex cursor-pointer hover:bg-green-50/20 hover:border-green-500 flex-1 items-center justify-center gap-2 h-12.5 rounded-xl border-dashed border transition-all ${method === "whatsapp" ? "border-green-500 bg-green-50" : "border-gray-200"}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(WhatsAppIcon, { className: "w-5 h-5" }),
                /* @__PURE__ */ (0, import_jsx_runtime68.jsx)("span", { className: "text-sm font-medium", children: t.auth.selectMethod.whatsapp })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime68.jsxs)(
            "button",
            {
              onClick: () => setMethod("sms"),
              className: `flex cursor-pointer hover:bg-blue-50/20 hover:border-blue-500 flex-1 items-center justify-center gap-2 h-12.5 rounded-xl border-dashed border transition-all ${method === "sms" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(import_lucide_react7.MessageSquare, { className: "w-5 h-5" }),
                /* @__PURE__ */ (0, import_jsx_runtime68.jsx)("span", { className: "text-sm font-medium", children: t.auth.selectMethod.sms })
              ]
            }
          )
        ] }),
        loading && /* @__PURE__ */ (0, import_jsx_runtime68.jsx)("div", { className: "absolute inset-0 rounded-lg bg-white/50 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ (0, import_jsx_runtime68.jsx)(import_lucide_react7.Loader2, { className: "w-5 h-5 text-primary animate-spin" }) })
      ] })
    }
  );
}

// src/components/auth/screens/EnterPin.tsx
var import_react43 = require("react");
var import_lucide_react8 = require("lucide-react");

// src/components/ui/PinInputs.tsx
var import_react42 = require("react");
var import_image23 = __toESM(require("next/image"));
var import_jsx_runtime69 = require("react/jsx-runtime");
var PinInputs = ({
  isValidPin,
  value,
  onComplete,
  onChange,
  disabled,
  isKeyboardOpen = false
}) => {
  const inputRefs = (0, import_react42.useRef)([]);
  const [pin, setPin] = (0, import_react42.useState)(Array(6).fill(""));
  const [focusedIndex, setFocusedIndex] = (0, import_react42.useState)(null);
  (0, import_react42.useEffect)(() => {
    const newPin = value.split("").slice(0, 6);
    while (newPin.length < 6) newPin.push("");
    setPin(newPin);
  }, [value]);
  (0, import_react42.useEffect)(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  (0, import_react42.useEffect)(() => {
    if (isValidPin === "notvalid") {
      inputRefs.current[0]?.focus();
    }
  }, [isValidPin]);
  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    const newPin = [...pin];
    newPin[index] = val.slice(-1);
    setPin(newPin);
    const combinedValue = newPin.join("");
    onChange(combinedValue);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newPin.every((digit) => digit !== "") && newPin.join("").length === 6) {
      console.log(`PIN complete: ${newPin.join("")}`);
      onComplete(newPin.join(""));
    }
  };
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    const newPin = [...pin];
    pastedData.forEach((char, i) => {
      if (i < 6 && /^\d$/.test(char)) {
        newPin[i] = char;
      }
    });
    setPin(newPin);
    const combinedValue = newPin.join("");
    onChange(combinedValue);
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
    if (combinedValue.length === 6) {
      onComplete(combinedValue);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime69.jsx)("div", { className: "relative flex items-center justify-center mt-[min(2vw,0.92vh)] w-full", children: /* @__PURE__ */ (0, import_jsx_runtime69.jsx)("div", { className: `flex items-center justify-center gap-[min(2.32vw,1.07vh)] w-full`, children: pin.map((digit, i) => /* @__PURE__ */ (0, import_jsx_runtime69.jsxs)("div", { className: "relative w-[min(12.79vw,5.9vh)] aspect-square shrink-0", children: [
    /* @__PURE__ */ (0, import_jsx_runtime69.jsx)(
      "div",
      {
        className: ` ${isValidPin === "notvalid" ? "animate-shake-pin" : ""} absolute inset-0 rounded-[27.27%] transition-all duration-200 border-[#ddddddc5] ${isKeyboardOpen ? "border-[min(0.23vw,0.11vh)]" : "border-[min(0.23vw,0.11vh)]"} ${isValidPin === "valid" ? "bg-[#E8F5E9] border-0 border-[#E8F5E9]" : isValidPin === "notvalid" ? "bg-[#FFEBEE] border-0 border-[#FFEBEE]" : digit ? "bg-[#f7f7f7] border" : "bg-white border"}`
      }
    ),
    digit && /* @__PURE__ */ (0, import_jsx_runtime69.jsx)("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ (0, import_jsx_runtime69.jsx)(
      import_image23.default,
      {
        src: lock_default,
        alt: "lock",
        width: 24,
        height: 24,
        className: `w-[43.6%] h-auto transition-all duration-200 ${isValidPin === "valid" ? "brightness-0 invert-[0.5] sepia(1) saturate(1000%) hue-rotate(80deg)" : isValidPin === "notvalid" ? "brightness-0 invert-[0.5] sepia(1) saturate(1000%) hue-rotate(320deg)" : ""}`
      }
    ) }),
    focusedIndex === i && !digit && isValidPin !== "valid" && isValidPin !== "notvalid" && /* @__PURE__ */ (0, import_jsx_runtime69.jsx)("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ (0, import_jsx_runtime69.jsx)("div", { className: "w-[7.2%] aspect-square bg-[#8E8E8E] rounded-full animate-blink" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime69.jsx)(
      "input",
      {
        ref: (el) => {
          inputRefs.current[i] = el;
        },
        type: "text",
        inputMode: "numeric",
        maxLength: 1,
        value: digit,
        onChange: (e) => handleChange(e, i),
        onKeyDown: (e) => handleKeyDown(e, i),
        onFocus: () => setFocusedIndex(i),
        onBlur: () => setFocusedIndex(null),
        onPaste: handlePaste,
        disabled,
        className: "absolute inset-0 w-full h-full bg-transparent text-center text-transparent outline-none caret-transparent z-10",
        autoComplete: "one-time-code"
      }
    )
  ] }, i)) }) });
};
var PinInputs_default = PinInputs;

// src/components/auth/screens/EnterPin.tsx
var import_jsx_runtime70 = require("react/jsx-runtime");
function EnterPin({
  onSubmit,
  changeMethod,
  phone,
  method,
  pin,
  authType,
  setPin,
  setLoading,
  setSessionInfo,
  loading = "",
  isValidPin = ""
}) {
  const { t } = useTranslation();
  const actions = useActions();
  const config = useRDBConfig();
  const [timeLeft, setTimeLeft] = (0, import_react43.useState)(120);
  const [canResend, setCanResend] = (0, import_react43.useState)(false);
  (0, import_react43.useEffect)(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    if (loading === "resend-pin") {
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1e3);
    return () => clearTimeout(timer);
  }, [timeLeft, loading]);
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const handlePinComplete = async (value) => {
    setPin(value);
    onSubmit(value);
  };
  const handleResend = async () => {
    setLoading("resend-pin");
    const resendOtp = await actions.auth.reSendOtp({
      phoneNumber: `+${phone}`,
      channel: method === "whatsapp" ? "whatsapp" : "sms",
      type: authType
    });
    if ("error" in resendOtp) {
      setLoading("");
      console.error("Error resending OTP:", resendOtp.error);
      return;
    }
    if (resendOtp.sessionInfo) {
      setLoading("");
      console.log("OTP resent successfully:", resendOtp.message);
      setTimeLeft(120);
      setCanResend(false);
      setPin("");
      setSessionInfo(resendOtp.sessionInfo);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(AuthLayout, { title: t.auth.enterPin.title, showPhoneIcon: true, children: /* @__PURE__ */ (0, import_jsx_runtime70.jsxs)("div", { className: "relative w-full max-w-95 flex flex-col items-center gap-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime70.jsxs)("div", { className: "flex items-center gap-2 text-gray-500 text-[13px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(import_lucide_react8.Info, { className: "w-4 h-4" }),
      /* @__PURE__ */ (0, import_jsx_runtime70.jsxs)("p", { children: [
        t.auth.enterPin.enterCodePrefix,
        method === "whatsapp" ? t.auth.enterPin.whatsapp : t.auth.enterPin.sms
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime70.jsx)("span", { onClick: changeMethod, className: "text-blue-500 cursor-pointer text-xs", children: /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(import_lucide_react8.ArrowLeftRight, { className: "w-3.5 h-3.5 text-blue-500 group-hover:rotate-180 transition-transform duration-300" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime70.jsxs)("p", { className: "font-bold text-gray-800", children: [
      "+",
      phone
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(
      PinInputs_default,
      {
        value: pin,
        onChange: setPin,
        onComplete: handlePinComplete,
        disabled: loading === "verify-pin" || isValidPin === "valid",
        isValidPin
      }
    ),
    !canResend ? /* @__PURE__ */ (0, import_jsx_runtime70.jsxs)("div", { className: "text-[12px] text-gray-400 mt-2", children: [
      t.auth.enterPin.resendIn,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime70.jsx)("span", { className: "text-blue-500 font-bold", children: formatTime(timeLeft) })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime70.jsxs)("div", { className: "text-[12px] text-gray-400 mt-2 flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(
        "button",
        {
          onClick: handleResend,
          disabled: loading === "resend-pin" || !canResend || isValidPin === "valid",
          className: "cursor-pointer text-blue-500 font-bold disabled:opacity-50",
          children: t.auth.enterPin.resendCode
        }
      ),
      loading === "resend-pin" && /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(import_lucide_react8.Loader2, { className: "w-4 h-4 text-primary animate-spin" })
    ] }),
    loading === "verify-pin" && /* @__PURE__ */ (0, import_jsx_runtime70.jsx)("div", { className: "absolute inset-0 rounded-lg bg-white/50 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ (0, import_jsx_runtime70.jsx)(import_lucide_react8.Loader2, { className: "w-5 h-5 text-primary animate-spin" }) })
  ] }) });
}

// src/components/auth/screens/Terms.tsx
var import_lucide_react9 = require("lucide-react");
var import_jsx_runtime71 = require("react/jsx-runtime");
function TermsScreen({ onAgree, onLater }) {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime71.jsxs)("div", { className: "w-full h-full flex flex-col items-center bg-background px-10", children: [
    /* @__PURE__ */ (0, import_jsx_runtime71.jsxs)("div", { className: "flex-2 flex flex-col items-center justify-center w-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime71.jsx)("div", { className: "h-[20%] shrink-0" }),
      /* @__PURE__ */ (0, import_jsx_runtime71.jsx)(RdbIcon, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime71.jsxs)("div", { className: "flex-[1.5] flex flex-col items-center justify-center w-full gap-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime71.jsxs)("p", { className: "text-[13px] leading-[1.6] text-foreground/70 text-center text-balance", children: [
        t.auth.terms.toCreate,
        /* @__PURE__ */ (0, import_jsx_runtime71.jsx)("span", { className: "font-semibold text-foreground", children: t.auth.terms.agreeAndContinueQuoted }),
        t.auth.terms.toAccept,
        /* @__PURE__ */ (0, import_jsx_runtime71.jsx)("br", {}),
        t.auth.terms.termsOfServices
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime71.jsxs)("div", { className: "flex flex-col items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime71.jsx)("div", { className: "w-11 h-11 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime71.jsx)(import_lucide_react9.FileText, { className: "w-7 h-7 text-blue-600" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime71.jsx)("span", { className: "text-[12px] text-blue-600 font-medium", children: t.auth.terms.termsLabel })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime71.jsxs)("div", { className: "flex-1 flex flex-col items-center justify-end w-full pb-10 gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime71.jsx)(Button, { onClick: onAgree, children: t.auth.terms.agreeButton }),
      /* @__PURE__ */ (0, import_jsx_runtime71.jsx)(
        "button",
        {
          onClick: onLater,
          className: "text-[13px] text-foreground/50 underline underline-offset-2 transition-colors hover:text-foreground/70",
          children: t.auth.terms.later
        }
      )
    ] })
  ] });
}

// src/app/auth/page.tsx
var import_react44 = require("react");
var import_jsx_runtime72 = require("react/jsx-runtime");
function AuthPage() {
  const actions = useActions();
  const router = useUniversalRouter();
  const { saveAuthCookies } = useAuth();
  const { toast } = useToast();
  const { t, tr: tr2 } = useTranslation();
  const [authType, setAuthType] = (0, import_react44.useState)("signUp");
  const [isValidPin, setIsValidPin] = (0, import_react44.useState)("");
  const [step, setStep] = (0, import_react44.useState)("get-started");
  const [phone, setPhone] = (0, import_react44.useState)("");
  const [sessionInfo, setSessionInfo] = (0, import_react44.useState)("");
  const [method, setMethod] = (0, import_react44.useState)("");
  const [pin, setPin] = (0, import_react44.useState)("");
  const [loading, setLoading] = (0, import_react44.useState)("");
  const handleSendPhone = () => {
    setLoading("send-phone");
    setTimeout(() => {
      console.log("Submitting phone number:", phone);
      setLoading("");
      setStep("select-method");
    }, 1e3);
  };
  const changeNumber = () => {
    setMethod("");
    setStep("enter-phone");
  };
  const changeMethod = () => {
    setStep("select-method");
  };
  const handleSelectMethod = async (selectedMethod) => {
    setMethod(selectedMethod);
    setLoading("send-pin");
    const sendOtpRes = await actions.auth.sendOtp({
      phoneNumber: `+${phone}`,
      channel: selectedMethod,
      type: authType
    });
    if ("error" in sendOtpRes) {
      console.error("Error sending OTP:", sendOtpRes.error);
      setLoading("");
      toast.error(tr2("auth.otp.sendError", { error: sendOtpRes.error }));
      return;
    }
    if (sendOtpRes.sessionInfo) {
      setSessionInfo(sendOtpRes.sessionInfo);
      setLoading("");
      setStep("enter-pin");
      setPin("");
      console.log("OTP sent successfully:", sendOtpRes.message);
      toast.success(tr2("auth.otp.sentSuccess", { method: selectedMethod === "sms" ? "SMS" : "WhatsApp" }));
    } else {
      setLoading("");
      console.warn("Unexpected response from sendOtp:", sendOtpRes);
      toast.warn(t.auth.otp.unexpectedError);
    }
  };
  const handleVerifyPin = async (pin2) => {
    setLoading("verify-pin");
    console.log("Signing up with phone:", phone, "and sessionInfo:", sessionInfo, pin2);
    const verifyOtpRes = await actions.auth.verifyOtp({
      phoneNumber: `+${phone}`,
      otpCode: pin2,
      sessionInfo,
      type: authType
    });
    if ("error" in verifyOtpRes) {
      setLoading("");
      if (verifyOtpRes.error.includes("Invalid") || verifyOtpRes.error.includes("expired")) {
        setIsValidPin("notvalid");
        toast.error(t.auth.otp.invalidExpired);
        setTimeout(() => {
          setIsValidPin("");
          setPin("");
        }, 1500);
      } else {
        toast.error(verifyOtpRes.error || t.auth.otp.verificationFailed);
      }
      return;
    }
    if (verifyOtpRes.user) {
      setIsValidPin("valid");
      const loginSuccess = await saveAuthCookies(verifyOtpRes);
      if (loginSuccess) {
        console.log("OTP verified successfully:", verifyOtpRes.user);
        console.log("PIN verified:", pin2);
        setLoading("");
        toast.success(t.auth.otp.verifiedSigningIn);
        router.push("/home");
      } else {
        setLoading("");
        toast.error(t.auth.otp.saveAuthFailed);
      }
    } else {
      setLoading("");
      setIsValidPin("notvalid");
      toast.error(t.auth.otp.verificationFailed);
      setTimeout(() => {
        setIsValidPin("");
        setPin("");
      }, 1500);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime72.jsxs)("main", { className: "w-full h-dvh bg-background overflow-hidden", children: [
    step === "get-started" && /* @__PURE__ */ (0, import_jsx_runtime72.jsx)(
      GetStartedScreen,
      {
        onNewCustomer: () => {
          setStep("terms");
          setAuthType("signUp");
        },
        onExistingAccount: () => {
          setStep("enter-phone");
          setAuthType("signIn");
        }
      }
    ),
    step === "terms" && /* @__PURE__ */ (0, import_jsx_runtime72.jsx)(TermsScreen, { onAgree: () => setStep("enter-phone") }),
    step === "enter-phone" && /* @__PURE__ */ (0, import_jsx_runtime72.jsx)(
      EnterPhoneScreen,
      {
        authType,
        onSubmit: handleSendPhone,
        phone,
        setPhone,
        loading: loading === "send-phone"
      }
    ),
    step === "select-method" && /* @__PURE__ */ (0, import_jsx_runtime72.jsx)(
      SelectMethod,
      {
        changeNumber,
        setMethod: handleSelectMethod,
        method,
        phone,
        authType,
        loading: loading === "send-pin"
      }
    ),
    step === "enter-pin" && /* @__PURE__ */ (0, import_jsx_runtime72.jsx)(
      EnterPin,
      {
        changeMethod,
        onSubmit: handleVerifyPin,
        phone,
        method,
        isValidPin,
        pin,
        authType,
        setPin,
        setSessionInfo,
        loading,
        setLoading
      }
    )
  ] });
}

// src/components/ui/Toast/Toast.tsx
var import_react45 = require("react");
var import_jsx_runtime73 = require("react/jsx-runtime");
var typeConfig = {
  success: {
    color: "#22C55E",
    bgColor: "rgba(34, 197, 94, 0.1)",
    icon: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
      "path",
      {
        d: "M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z",
        fill: "#22C55E"
      }
    ) })
  },
  error: {
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    icon: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
      "path",
      {
        d: "M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z",
        fill: "#EF4444"
      }
    ) })
  },
  warn: {
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)",
    icon: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)("path", { d: "M1 18h18L10 1 1 18zm10-3H9v-2h2v2zm0-4H9V7h2v4z", fill: "#F59E0B" }) })
  },
  info: {
    color: "#388CFF",
    bgColor: "rgba(56, 140, 255, 0.1)",
    icon: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
      "path",
      {
        d: "M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9V9h2v6zm0-8H9V5h2v2z",
        fill: "#388CFF"
      }
    ) })
  }
};
var themeStyles = {
  dark: {
    bg: "rgba(60, 60, 60, 0.95)",
    text: "#FFFFFF",
    closeBtn: "#8D8D8D",
    closeBtnHover: "#FFFFFF",
    shadow: "0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.05)"
  },
  light: {
    bg: "rgba(255, 255, 255, 0.98)",
    text: "#1D1D1D",
    closeBtn: "#8D8D8D",
    closeBtnHover: "#1D1D1D",
    shadow: "0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)"
  }
};
var Toast = ({ toast, theme, onRemove, onPause, onResume }) => {
  const [isExiting, setIsExiting] = (0, import_react45.useState)(false);
  const [progress, setProgress] = (0, import_react45.useState)(100);
  const config = typeConfig[toast.type];
  const colors = themeStyles[theme];
  (0, import_react45.useEffect)(() => {
    if (!toast.showProgress || toast.isPaused) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - elapsed / toast.duration * 100);
      setProgress(remaining);
    }, 30);
    return () => clearInterval(interval);
  }, [toast.duration, toast.isPaused, toast.showProgress]);
  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime73.jsxs)(
    "div",
    {
      className: `flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-sm transition-all duration-200 ease-out ${isExiting ? "opacity-0 translate-x-8 scale-95" : "opacity-100 translate-x-0 scale-100"}`,
      style: {
        background: colors.bg,
        border: `1px solid ${config.color}40`,
        boxShadow: colors.shadow,
        minWidth: 280,
        maxWidth: 360
      },
      onMouseEnter: () => onPause(toast.id),
      onMouseLeave: () => onResume(toast.id),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
          "div",
          {
            className: "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            style: { background: config.bgColor },
            children: config.icon
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
          "p",
          {
            className: "flex-1 text-xs font-quicksand leading-snug",
            style: { color: colors.text },
            children: toast.message
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
          "button",
          {
            onClick: handleRemove,
            className: "w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0",
            style: { color: colors.closeBtn },
            children: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", children: /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
              "path",
              {
                d: "M11 1L1 11M1 1l10 10",
                stroke: "currentColor",
                strokeWidth: "1.5",
                strokeLinecap: "round"
              }
            ) })
          }
        ),
        toast.showProgress && /* @__PURE__ */ (0, import_jsx_runtime73.jsx)(
          "div",
          {
            className: "absolute bottom-0 left-0 h-0.5 rounded-b-xl transition-all duration-100",
            style: {
              width: `${progress}%`,
              background: config.color
            }
          }
        )
      ]
    }
  );
};
var Toast_default = Toast;

// src/components/ui/Toast/ToastContainer.tsx
var import_jsx_runtime74 = require("react/jsx-runtime");
var ToastContainer = () => {
  const { toasts, theme, removeToast, pauseToast, resumeToast } = useToast();
  const { rtl } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime74.jsx)("div", { className: `fixed top-6 z-50 ${rtl ? "left-6" : "right-6"}`, children: /* @__PURE__ */ (0, import_jsx_runtime74.jsx)("div", { className: "relative", children: toasts.map((toast, index) => {
    const reverseIndex = toasts.length - 1 - index;
    const isFirst = reverseIndex === 0;
    const offset = reverseIndex * 8;
    const scale = 1 - reverseIndex * 0.03;
    const opacity = reverseIndex > 2 ? 0 : 1 - reverseIndex * 0.15;
    return /* @__PURE__ */ (0, import_jsx_runtime74.jsx)(
      "div",
      {
        className: "animate-slide-in",
        style: {
          position: reverseIndex === 0 ? "relative" : "absolute",
          top: 0,
          [rtl ? "left" : "right"]: 0,
          transform: `translateY(${offset}px) scale(${scale})`,
          transformOrigin: rtl ? "top left" : "top right",
          zIndex: toasts.length - reverseIndex,
          opacity,
          pointerEvents: isFirst ? "auto" : "none",
          transition: "transform 0.2s ease-out, opacity 0.2s ease-out"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime74.jsx)(
          Toast_default,
          {
            toast,
            theme,
            onRemove: removeToast,
            onPause: pauseToast,
            onResume: resumeToast
          }
        )
      },
      toast.id
    );
  }) }) });
};
var ToastContainer_default = ToastContainer;

// src/components/ui/animation/animated-loader.tsx
var import_react46 = __toESM(require("react"));
var import_jsx_runtime75 = require("react/jsx-runtime");
var AnimatedLoader = ({
  duration = 1e3,
  onComplete,
  className
}) => {
  const [percent, setPercent] = (0, import_react46.useState)(0);
  const onCompleteRef = import_react46.default.useRef(onComplete);
  (0, import_react46.useEffect)(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  (0, import_react46.useEffect)(() => {
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setPercent(progress * 100);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onCompleteRef.current) onCompleteRef.current();
      }
    };
    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration]);
  return /* @__PURE__ */ (0, import_jsx_runtime75.jsx)(LoaderBarIcon, { percent, className });
};

// src/components/ui/animation/animated-tagline.tsx
var import_react47 = require("react");
var import_framer_motion5 = require("framer-motion");
var import_jsx_runtime76 = require("react/jsx-runtime");
var AnimatedTagline = ({
  words,
  duration,
  className = ""
}) => {
  const { rtl } = useTranslation();
  const [index, setIndex] = (0, import_react47.useState)(0);
  const [isStarted, setIsStarted] = (0, import_react47.useState)(false);
  (0, import_react47.useEffect)(() => {
    const timer = setTimeout(() => setIsStarted(true), 200);
    return () => clearTimeout(timer);
  }, []);
  (0, import_react47.useEffect)(() => {
    if (!isStarted) return;
    const effectiveDuration = Math.max(duration - 200, 1e3);
    const cycleTime = effectiveDuration / words.length;
    const timer = setInterval(() => {
      setIndex((prev) => {
        if (prev < words.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, cycleTime);
    return () => clearInterval(timer);
  }, [isStarted, duration, words.length]);
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0
      }
    },
    exit: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        staggerDirection: 1
      }
    }
  };
  const letterVariants = {
    hidden: {
      opacity: 0,
      x: rtl ? 50 : -50,
      scale: 0.8,
      filter: "blur(4px)",
      transition: {
        duration: 0,
        ease: "easeInOut"
      }
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 200
      }
    },
    exit: {
      opacity: 0,
      x: rtl ? -50 : 50,
      scale: 0.8,
      filter: "blur(4px)",
      transition: {
        duration: 0,
        ease: "easeInOut"
      }
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime76.jsx)(
    "div",
    {
      className: `flex items-start justify-center mt-[min(2.65vw,1.15vh)] h-full overflow-hidden ${className}`,
      children: /* @__PURE__ */ (0, import_jsx_runtime76.jsx)(import_framer_motion5.AnimatePresence, { mode: "wait", children: isStarted && /* @__PURE__ */ (0, import_jsx_runtime76.jsx)(
        import_framer_motion5.motion.div,
        {
          variants: containerVariants,
          initial: "hidden",
          animate: "visible",
          exit: "exit",
          className: "flex items-center text-black justify-center w-full",
          children: words[index].split("").map((char, i) => /* @__PURE__ */ (0, import_jsx_runtime76.jsx)(
            import_framer_motion5.motion.span,
            {
              variants: letterVariants,
              className: "inline-block text-black text-[min(3.02vw,1.39vh)] leading-[min(4.65vw,2.15vh)] font-normal",
              style: {
                fontFamily: "var(--font-quicksand), sans-serif",
                marginInlineEnd: char === " " ? "0.25em" : "0"
              },
              children: char === " " ? "\xA0" : char
            },
            `${index}-${i}`
          ))
        },
        index
      ) })
    }
  );
};

// src/components/SplashScreen.tsx
var import_jsx_runtime77 = require("react/jsx-runtime");
function SplashScreen({ onComplete }) {
  const duration = 4e3;
  return /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("main", { className: "w-full h-full flex items-center justify-center overflow-hidden bg-background", children: /* @__PURE__ */ (0, import_jsx_runtime77.jsxs)("div", { className: "aspect-430/932 h-full max-h-full w-auto max-w-full flex flex-col items-center relative", children: [
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "h-[42.81%] shrink-0 w-full" }),
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "w-[32.09%] shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime77.jsx)(RdbIcon, { className: "text-foreground w-full h-auto" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "h-[21.67%] shrink-0 w-full" }),
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "w-[33.95%] shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime77.jsx)(
      AnimatedLoader,
      {
        duration,
        onComplete,
        className: "w-full h-auto"
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "h-[18.24%] shrink-0 flex flex-col justify-end w-full items-center pb-[1%]", children: /* @__PURE__ */ (0, import_jsx_runtime77.jsx)(
      AnimatedTagline,
      {
        words: en_default.splash.words,
        duration,
        className: ""
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "w-[23.78%] shrink-0 aspect-[102.25/27.65]", children: /* @__PURE__ */ (0, import_jsx_runtime77.jsx)(Icon, { name: "ramaaztech", className: "text-foreground w-full h-full" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime77.jsx)("div", { className: "h-[3.33%] shrink-0 w-full" })
  ] }) });
}

// src/rdb/components/RDB.tsx
var import_jsx_runtime78 = require("react/jsx-runtime");
function RDB(props) {
  const {
    actions,
    storeKey,
    handleUnauthenticated,
    cookiesKeys,
    authCookieName: authCookieNameFromProps
  } = props;
  const [cookieConfig, setCookieConfig] = (0, import_react48.useState)({
    local: null,
    baseUrl: null
  });
  const [isConfigLoaded, setIsConfigLoaded] = (0, import_react48.useState)(false);
  const [userData, setUserData] = (0, import_react48.useState)(null);
  const [loading, setLoading] = (0, import_react48.useState)(true);
  const [splashDone, setSplashDone] = (0, import_react48.useState)(false);
  const showSplash = loading || !splashDone;
  const effectiveAuthCookieName = cookiesKeys?.authToken || authCookieNameFromProps || "rdb_at";
  (0, import_react48.useEffect)(() => {
    const verifyUserFromCookie = async () => {
      if (!actions) {
        setLoading(false);
        return;
      }
      console.log(
        "RDB Component - Verifying user from cookie:",
        effectiveAuthCookieName
      );
      setLoading(true);
      try {
        const userResponse = await actions.auth.verifyMe({
          authCookieName: effectiveAuthCookieName
        });
        if (userResponse && "error" in userResponse) {
          console.error(
            "Error verifying user from cookie:",
            userResponse.error
          );
        } else if (userResponse) {
          console.log("User verified successfully from cookie:", userResponse);
          setUserData({
            user: userResponse,
            accessToken: { token: "", expiresAt: "" },
            refreshToken: { token: "", expiresAt: "" }
          });
        } else {
          console.warn("No response from verifyMe");
        }
      } catch (err) {
        console.error("RDB verifyMe error:", err);
      } finally {
        setLoading(false);
      }
    };
    verifyUserFromCookie();
  }, [effectiveAuthCookieName]);
  (0, import_react48.useEffect)(() => {
    const loadCookieConfig = async () => {
      if (cookiesKeys) {
        const cookieNames = {};
        if (cookiesKeys.local) cookieNames.local = cookiesKeys.local;
        if (cookiesKeys.baseUrl) cookieNames.baseUrl = cookiesKeys.baseUrl;
        const values = await getCookiesByNames(cookieNames);
        setCookieConfig({
          local: values.local || null,
          baseUrl: values.baseUrl || null
        });
      }
      setIsConfigLoaded(true);
    };
    loadCookieConfig();
  }, [cookiesKeys]);
  const { handleSplashComplete } = useRDB(props);
  const themeVariables = generateThemeVariables();
  const local = cookieConfig.local ?? "gb-en";
  const baseUrl = cookieConfig.baseUrl ?? process.env.NEXT_PUBLIC_RDB_BASE_URL ?? "http://localhost:3000";
  if (!isConfigLoaded) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
    "div",
    {
      id: "rdb-root",
      className: "w-full h-full relative isolate flex flex-col bg-background overflow-hidden",
      style: themeVariables,
      children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(I18nProvider, { locale: local, children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(AuthProvider, { userData, useCookies: false, children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
        RDBProvider,
        {
          config: {
            baseUrl,
            local,
            storeKey,
            handleUnauthenticated,
            authCookieName: effectiveAuthCookieName,
            isLibrary: true
            // Internal flag to identify library execution mode
          },
          actions,
          children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(StoreProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ScannerProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(RDBLayout, { onSplashCompleteAction: handleSplashComplete, children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(LayoutProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ToastProvider, { children: showSplash ? /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(SplashScreen, { onComplete: () => setSplashDone(true) }) : /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(import_react_router_dom3.MemoryRouter, { initialEntries: ["/"], children: /* @__PURE__ */ (0, import_jsx_runtime78.jsxs)(LibraryRouterAdapter, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime78.jsxs)(import_react_router_dom3.Routes, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(import_react_router_dom3.Route, { path: "/auth", element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(AuthPage, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
                import_react_router_dom3.Route,
                {
                  path: "/home",
                  element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ProtectedLayout, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(HomePage, {}) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
                import_react_router_dom3.Route,
                {
                  path: "/transactions",
                  element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ProtectedLayout, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(TransactionsPage, {}) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
                import_react_router_dom3.Route,
                {
                  path: "/addresses",
                  element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ProtectedLayout, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(AddressesPage, {}) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
                import_react_router_dom3.Route,
                {
                  path: "/settings",
                  element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ProtectedLayout, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(SettingsPage, {}) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
                import_react_router_dom3.Route,
                {
                  path: "/auth",
                  element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ProtectedLayout, { children: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(AuthPage, {}) })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(
                import_react_router_dom3.Route,
                {
                  path: "/",
                  element: /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(import_react_router_dom3.Navigate, { to: "/home", replace: true })
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime78.jsx)(ToastContainer_default, {})
          ] }) }) }) }) }) }) })
        }
      ) }) })
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  I18nProvider,
  RDB,
  useTranslation
});
