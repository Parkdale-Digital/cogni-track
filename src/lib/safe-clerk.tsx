import type { ComponentProps, ReactNode } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const hasClerkConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
);

type UseUserReturn = ReturnType<typeof useUser>;

export function useSafeUser(): UseUserReturn {
  if (!hasClerkConfig) {
    return {
      isLoaded: true,
      isLoading: false,
      isSignedIn: false,
      isSignedOut: true,
      user: null,
      setActive: async () => undefined,
      signOut: async () => undefined,
    } as UseUserReturn;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useUser();
}

export function SafeSignedIn({ children }: { children: ReactNode }) {
  if (!hasClerkConfig) {
    return null;
  }

  return <SignedIn>{children}</SignedIn>;
}

export function SafeSignedOut({ children }: { children: ReactNode }) {
  if (!hasClerkConfig) {
    return <>{children}</>;
  }

  return <SignedOut>{children}</SignedOut>;
}

export function SafeSignInButton({ children, ...props }: ComponentProps<typeof SignInButton>) {
  if (!hasClerkConfig) {
    return <>{children}</>;
  }

  return <SignInButton {...props}>{children}</SignInButton>;
}

export function SafeSignUpButton({ children, ...props }: ComponentProps<typeof SignUpButton>) {
  if (!hasClerkConfig) {
    return <>{children}</>;
  }

  return <SignUpButton {...props}>{children}</SignUpButton>;
}

export function SafeUserButton(props: ComponentProps<typeof UserButton>) {
  if (!hasClerkConfig) {
    return null;
  }

  return <UserButton {...props} />;
}
