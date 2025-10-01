import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { NavMenu } from "@/components/ui/NavMenu";

export const metadata: Metadata = {
  title: "LLM Usage Tracker",
  description: "Track your LLM API usage and costs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.CLERK_PUBLISHABLE_KEY ??
    null;

  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API ?? null;

  if (!publishableKey && !frontendApi) {
    console.warn(
      "[Clerk] Clerk environment variables are not configured. Rendering without ClerkProvider."
    );
  }

  const appShell = (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
        )}
      >
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <NavMenu />
          </div>
        </header>
        {children}
        <Toaster />
      </body>
    </html>
  );

  return publishableKey || frontendApi ? (
    <ClerkProvider
      publishableKey={publishableKey ?? undefined}
      frontendApi={frontendApi ?? undefined}
    >
      {appShell}
    </ClerkProvider>
  ) : (
    appShell
  );
}
