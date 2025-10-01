"use client";

import { createContext, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

type UseUserReturn = ReturnType<typeof useUser>;

type SafeUserState = UseUserReturn;

const fallbackUserState: SafeUserState = {
  isLoaded: true,
  isLoading: false,
  isSignedIn: false,
  isSignedOut: true,
  user: null,
  setActive: async () => undefined,
  signOut: async () => undefined,
} as SafeUserState;

const SafeUserContext = createContext<SafeUserState>(fallbackUserState);
const ClerkConfiguredContext = createContext(false);

type SafeClerkProviderProps = {
  children: ReactNode;
  publishableKey?: string | null;
  isConfigured: boolean;
};

function SafeUserProvider({ children }: { children: ReactNode }) {
  const userState = useUser();
  return <SafeUserContext.Provider value={userState}>{children}</SafeUserContext.Provider>;
}

export function SafeClerkProvider({ children, publishableKey, isConfigured }: SafeClerkProviderProps) {
  if (!isConfigured || !publishableKey) {
    return (
      <ClerkConfiguredContext.Provider value={false}>
        <SafeUserContext.Provider value={fallbackUserState}>{children}</SafeUserContext.Provider>
      </ClerkConfiguredContext.Provider>
    );
  }

  return (
    <ClerkConfiguredContext.Provider value={true}>
      <ClerkProvider publishableKey={publishableKey}>
        <SafeUserProvider>{children}</SafeUserProvider>
      </ClerkProvider>
    </ClerkConfiguredContext.Provider>
  );
}

export function useSafeUser(): UseUserReturn {
  return useContext(SafeUserContext);
}

function useClerkConfigFlag(): boolean {
  return useContext(ClerkConfiguredContext);
}

export function SafeSignedIn({ children }: { children: ReactNode }) {
  const configured = useClerkConfigFlag();
  if (!configured) {
    return null;
  }

  return <SignedIn>{children}</SignedIn>;
}

export function SafeSignedOut({ children }: { children: ReactNode }) {
  const configured = useClerkConfigFlag();
  if (!configured) {
    return <>{children}</>;
  }

  return <SignedOut>{children}</SignedOut>;
}

export function SafeSignInButton({ children, ...props }: ComponentProps<typeof SignInButton>) {
  const configured = useClerkConfigFlag();
  if (!configured) {
    return <>{children}</>;
  }

  return <SignInButton {...props}>{children}</SignInButton>;
}

export function SafeSignUpButton({ children, ...props }: ComponentProps<typeof SignUpButton>) {
  const configured = useClerkConfigFlag();
  if (!configured) {
    return <>{children}</>;
  }

  return <SignUpButton {...props}>{children}</SignUpButton>;
}

export function SafeUserButton(props: ComponentProps<typeof UserButton>) {
  const configured = useClerkConfigFlag();
  if (!configured) {
    return null;
  }

  return <UserButton {...props} />;
}

export function useIsClerkConfigured(): boolean {
  return useClerkConfigFlag();
}
