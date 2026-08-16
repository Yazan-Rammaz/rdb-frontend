"use server";
"use server";
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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

// src/core/server.ts
var getSupportedAssets2 = async (args) => await getSupportedAssets(args);
var getCurrencies2 = async (args) => await getCurrencies(args);
var GetBanks2 = async (args) => await GetBanks(args);
var CreateBankDeposit2 = async (args) => await CreateBankDeposit(args);
var GetBankDeposits2 = async (args) => await GetBankDeposits(args);
var CalculateFees2 = async (args) => await CalculateFees(args);
var UploadMedia2 = async (args) => await UploadMedia(args);
var GetWalletBalance2 = async (args) => await GetWalletBalance(args);
var GetAccountBalance2 = async (args) => await GetAccountBalance(args);
var getAccountByBalanceId2 = async (args) => await getAccountByBalanceId(args);
var validateRecipientAccount2 = async (args) => await validateRecipientAccount(args);
var lookupAccountByPhone2 = async (args) => await lookupAccountByPhone(args);
var GetJournalEntries2 = async (args) => await GetJournalEntries(args);
var GetFinancialLedger2 = async (args) => await GetFinancialLedger(args);
var GetTransactions2 = async (args) => await GetTransactions(args);
var CheckoutOrder2 = async (args) => await CheckoutOrder(args);
var checkTransferBalance2 = async (args) => await checkTransferBalance(args);
var getTransferPurposes2 = async (args) => await getTransferPurposes(args);
var verifyTransfer2 = async (args) => await verifyTransfer(args);
var SendTransfer2 = async (args) => await SendTransfer(args);
var getDepositRequest2 = async (args) => await getDepositRequest(args);
var createPaymentRequest2 = async (args) => await createPaymentRequest(args);
var lookupPaymentRequest2 = async (args) => await lookupPaymentRequest(args);
var fulfillPaymentRequest2 = async (args) => await fulfillPaymentRequest(args);
var cancelPaymentRequest2 = async (args) => await cancelPaymentRequest(args);
var checkWallet2 = async (args) => await checkWallet(args);
var createWallet2 = async (args) => await createWallet(args);
var sendOtp2 = async (args) => await sendOtp(args);
var reSendOtp2 = async (args) => await reSendOtp(args);
var verifyOtp2 = async (args) => await verifyOtp(args);
var verifyMe2 = async (args) => await verifyMe(args);
async function getServerActions() {
  return {
    banking: {
      getSupportedAssets: getSupportedAssets2,
      getCurrencies: getCurrencies2,
      GetBanks: GetBanks2,
      CreateBankDeposit: CreateBankDeposit2,
      GetBankDeposits: GetBankDeposits2,
      CalculateFees: CalculateFees2,
      getAccountByBalanceId: getAccountByBalanceId2,
      validateRecipientAccount: validateRecipientAccount2,
      lookupAccountByPhone: lookupAccountByPhone2
    },
    media: {
      UploadMedia: UploadMedia2
    },
    transactions: {
      GetWalletBalance: GetWalletBalance2,
      GetJournalEntries: GetJournalEntries2,
      GetFinancialLedger: GetFinancialLedger2,
      GetTransactions: GetTransactions2,
      CheckoutOrder: CheckoutOrder2,
      checkTransferBalance: checkTransferBalance2,
      getTransferPurposes: getTransferPurposes2,
      verifyTransfer: verifyTransfer2,
      SendTransfer: SendTransfer2,
      getDepositRequest: getDepositRequest2
    },
    wallets: {
      checkWallet: checkWallet2,
      createWallet: createWallet2
    },
    auth: {
      sendOtp: sendOtp2,
      reSendOtp: reSendOtp2,
      verifyOtp: verifyOtp2,
      verifyMe: verifyMe2
    },
    paymentRequests: {
      createPaymentRequest: createPaymentRequest2,
      lookupPaymentRequest: lookupPaymentRequest2,
      fulfillPaymentRequest: fulfillPaymentRequest2,
      cancelPaymentRequest: cancelPaymentRequest2
    }
  };
}
export {
  CalculateFees2 as CalculateFees,
  CheckoutOrder2 as CheckoutOrder,
  CreateBankDeposit2 as CreateBankDeposit,
  GetAccountBalance2 as GetAccountBalance,
  GetBankDeposits2 as GetBankDeposits,
  GetBanks2 as GetBanks,
  GetFinancialLedger2 as GetFinancialLedger,
  GetJournalEntries2 as GetJournalEntries,
  GetTransactions2 as GetTransactions,
  GetWalletBalance2 as GetWalletBalance,
  SendTransfer2 as SendTransfer,
  UploadMedia2 as UploadMedia,
  cancelPaymentRequest2 as cancelPaymentRequest,
  checkTransferBalance2 as checkTransferBalance,
  checkWallet2 as checkWallet,
  createPaymentRequest2 as createPaymentRequest,
  createWallet2 as createWallet,
  fulfillPaymentRequest2 as fulfillPaymentRequest,
  getAccountByBalanceId2 as getAccountByBalanceId,
  getCurrencies2 as getCurrencies,
  getDepositRequest2 as getDepositRequest,
  getServerActions,
  getSupportedAssets2 as getSupportedAssets,
  getTransferPurposes2 as getTransferPurposes,
  lookupAccountByPhone2 as lookupAccountByPhone,
  lookupPaymentRequest2 as lookupPaymentRequest,
  reSendOtp2 as reSendOtp,
  sendOtp2 as sendOtp,
  validateRecipientAccount2 as validateRecipientAccount,
  verifyMe2 as verifyMe,
  verifyOtp2 as verifyOtp,
  verifyTransfer2 as verifyTransfer
};
