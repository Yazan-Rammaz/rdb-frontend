"use client";

import React, { useState, useEffect } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { RDBProvider } from "@/context/RDBContext";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { RDBLayout } from "@/components/layout/RDBLayout";
import HomePage from "@/app/(protected)/home/page";
import AddressesPage from "@/app/(protected)/addresses/page";
import SettingsPage from "@/app/(protected)/settings/page";
import TransactionsPage from "@/app/(protected)/transactions/page";
import ProtectedLayout from "@/app/(protected)/layout";
import { RDBProps } from "@/rdb/types/RDBProps";
import { useRDB } from "@/rdb/hooks/useRDB";
import { LibraryRouterAdapter } from "@/hooks/useUniversalRouter";
import { generateThemeVariables } from "@/lib/theme";
import { StoreProvider } from "@/context/StoreContext";
import AuthPage from "@/app/auth/page";
import { I18nProvider } from "@/context/I18nContext";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/ui/Toast/ToastContainer";
import { getCookiesByNames } from "@/core/auth/secure-cookies";
import { ScannerProvider } from "@/context/ScannerContext";
import { UserData } from "@/core/types/auth";
import SplashScreen from "@/components/SplashScreen";
import { PasskeyProvider, usePasskey } from "@/context/PasskeyContext";
import { WSProvider } from "@/context/WSContext";
import { VerificationProvider } from "@/context/VerificationContext";
import VerificationPage from "@/components/verification/VerificationPage";

/**
 * Configuration values read from cookies
 */
interface CookieConfig {
  local: string | null;
  baseUrl: string | null;
}

/**
 * RDB Main Entry Point Component
 * This component acts as a bridge between the host application and the internal library logic.
 * It encapsulates all necessary providers and routing for the library to function independently.
 *
 * PasskeyProvider is mounted here so that RDBInner (and all descendants) can call usePasskey().
 */
export default function RDB(props: RDBProps) {
    return <RDBInner {...props} />;
}

/**
 * Inner component — must be a child of PasskeyProvider so it can call usePasskey().
 * All existing logic lives here unchanged, except:
 *   - initialize() is called once on mount to resolve device status
 *   - showSplash now also waits for bootReady (extends existing SplashScreen window)
 */
function RDBInner(props: RDBProps) {
  const { bootReady } = usePasskey();

  const {
    actions,
    storeKey,
    handleUnauthenticated,
    cookiesKeys,
    authCookieName: authCookieNameFromProps,
    wsBaseUrl,
  } = props;

  // State for cookie-based configuration
  const [cookieConfig, setCookieConfig] = useState<CookieConfig>({
    local: null,
    baseUrl: null,
  });
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  // Show splash until loading is done, minimum splash duration has elapsed,
  // AND device status has been resolved (bootReady).
  const showSplash = loading || !splashDone || !bootReady;

  // Determine the effective auth cookie name:
  // Priority: cookiesKeys.authToken (cookie name from config) > authCookieName prop > default 'rdb_at'
  const effectiveAuthCookieName =
    cookiesKeys?.authToken || authCookieNameFromProps || "rdb_at";

  // Verify user session from auth cookie on mount
  // In library mode (actions provided): call host's verifyMe with authCookieName
  // In standalone mode (no actions): skip, auth is handled by AuthProvider + ClientProviders
  useEffect(() => {
    const verifyUserFromCookie = async () => {
      if (!actions) {
        // Standalone mode — auth is handled by AuthProvider/ClientProviders
        setLoading(false);
        return;
      }

      console.log(
        "RDB Component - Verifying user from cookie:",
        effectiveAuthCookieName,
      );
      setLoading(true);
      try {
        const userResponse = await actions.auth.verifyMe({
          authCookieName: effectiveAuthCookieName,
        });
        if (userResponse && "error" in userResponse) {
          console.error(
            "Error verifying user from cookie:",
            userResponse.error,
          );
        } else if (userResponse) {
          console.log("User verified successfully from cookie:", userResponse);
          setUserData({
            user: userResponse,
            accessToken: { token: "", expiresAt: "" },
            refreshToken: { token: "", expiresAt: "" },
          } as UserData);
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

  // Load configuration from cookies on mount (locale, baseUrl — NOT auth token)
  useEffect(() => {
    const loadCookieConfig = async () => {
      if (cookiesKeys) {
        const cookieNames: Record<string, string> = {};

        if (cookiesKeys.local) cookieNames.local = cookiesKeys.local;
        if (cookiesKeys.baseUrl) cookieNames.baseUrl = cookiesKeys.baseUrl;

        const values = await getCookiesByNames(cookieNames);

        setCookieConfig({
          local: (values.local as string) || null,
          baseUrl: (values.baseUrl as string) || null,
        });
      }
      setIsConfigLoaded(true);
    };

    loadCookieConfig();
  }, [cookiesKeys]);

  // Custom hook to handle library-specific initialization/events
  const { handleSplashComplete } = useRDB(props);

  // Dynamically generate CSS variables based on the current theme
  const themeVariables = generateThemeVariables();

  // Use cookie values with fallbacks
  const local = cookieConfig.local ?? "gb-en";
  const baseUrl =
    cookieConfig.baseUrl ??
    process.env.NEXT_PUBLIC_RDB_BASE_URL ??
    "http://localhost:3000";

  // Wait for config to load before rendering
  if (!isConfigLoaded) {
    return null;
  }

  return (
    <div
      id="rdb-root"
      className="w-full h-full relative isolate flex flex-col bg-background overflow-hidden"
      style={themeVariables}
    >
      {/* 1. i18n Provider: Language from locale prop (library mode) */}
      <I18nProvider locale={local}>
        {/* 2. Authentication Provider: Handles token state and base API URL */}
        <AuthProvider userData={userData} useCookies={false}>
          {/* 2b. Passkey Provider: inside Auth so it can access auth state in future */}
          <PasskeyProvider>
          {/* 3. RDB Provider: Injects the server actions and configuration into the context */}
          <RDBProvider
            config={{
              baseUrl: baseUrl,
              local: local,
              storeKey: storeKey,
              handleUnauthenticated: handleUnauthenticated,
              authCookieName: effectiveAuthCookieName,
              isLibrary: true, // Internal flag to identify library execution mode
            }}
            actions={actions}
          >
            {/* 4. Store Provider: Moved up to enable data preloading during splash */}
            <StoreProvider>
              {/* 4b. WS Provider: Real-time wallet events */}
              <WSProvider authCookieName={effectiveAuthCookieName} wsBaseUrl={wsBaseUrl}>
              {/* 3. Main UI Shell */}
              <ScannerProvider>
                {/* 5. Layout Wrapper: Handles splash screens and global UI containers */}
                <RDBLayout onSplashCompleteAction={handleSplashComplete}>
                  <LayoutProvider>
                    {/* 6. Toast Provider: Manages toast notifications across the library */}
                    <ToastProvider>
                      {/* 7. Routing: Using MemoryRouter to avoid conflicts with the host app's URL */}
                      {showSplash ? (
                        <SplashScreen onComplete={() => setSplashDone(true)} />
                      ) : (
                        <MemoryRouter initialEntries={["/"]}>
                          <LibraryRouterAdapter>
                            <Routes>
                              <Route path="/auth" element={<AuthPage />} />
                              <Route path="/verification" element={
                                <VerificationProvider>
                                  <VerificationPage />
                                </VerificationProvider>
                              } />

                              {/* Protected routes requiring authentication/session */}
                              <Route
                                path="/home"
                                element={
                                  <ProtectedLayout>
                                    <HomePage />
                                  </ProtectedLayout>
                                }
                              />
                              <Route
                                path="/transactions"
                                element={
                                  <ProtectedLayout>
                                    <TransactionsPage />
                                  </ProtectedLayout>
                                }
                              />
                              <Route
                                path="/addresses"
                                element={
                                  <ProtectedLayout>
                                    <AddressesPage />
                                  </ProtectedLayout>
                                }
                              />
                              <Route
                                path="/settings"
                                element={
                                  <ProtectedLayout>
                                    <SettingsPage />
                                  </ProtectedLayout>
                                }
                              />
                              <Route
                                path="/auth"
                                element={
                                  <ProtectedLayout>
                                    <AuthPage />
                                  </ProtectedLayout>
                                }
                              />

                              {/* Redirect root path to the home screen */}
                              <Route
                                path="/"
                                element={<Navigate to="/home" replace />}
                              />
                            </Routes>
                            <ToastContainer />
                          </LibraryRouterAdapter>
                        </MemoryRouter>
                      )}
                    </ToastProvider>
                  </LayoutProvider>
                </RDBLayout>
              </ScannerProvider>
              </WSProvider>
            </StoreProvider>
          </RDBProvider>
          </PasskeyProvider>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}
