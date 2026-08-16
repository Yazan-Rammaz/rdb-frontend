import { fetchServerData, processResponse } from "../utils";

export async function checkWallet({
  id,
  token,
  authCookieName,
}: {
  id: string;
  token?: string;
  authCookieName?: string;
}) {
  let res = await fetchServerData({
    method: "GET",
    token,
    authCookieName,
    url: `/wallets/myAcounts`,
  });

  // Specific logic for checkWallet: 401 check first

  if (!res || !res.success) {
    // Pass the handler down to the creation function if needed
    await createWallet({
      id,
      authCookieName,
    });
  }
}

export async function createWallet({
  id,
  token,
  authCookieName,
}: {
  id: string;
  token?: string;
  authCookieName?: string;
}) {
  let response = await fetchServerData({
    method: "POST",

    body: JSON.stringify({
      userId: id,
      subtype: "MAIN",
      name: "Primary Funding Wallet",
    }),
    url: "/wallets?subtype=MAIN",
    token,
    authCookieName,
  });

  // Use helper with specific logging context for creation
  await processResponse(response, {
    scenario: "creating wallet for user",
    userId: id,
  });

  return response;
}
