import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16 lg:px-8">
      <div className="max-w-3xl space-y-4 text-center">
        <Badge variant="secondary" className="uppercase tracking-wide text-xs">
          Unified AI usage dashboard
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Monitor every API call, token, and dollar from a single workspace.
        </h1>
        <p className="text-lg text-muted-foreground">
          Securely connect your OpenAI keys, automatically ingest usage, and surface spend trends across models—all without juggling multiple provider consoles.
        </p>
      </div>

      <SignedOut>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <SignInButton>
            <Button size="lg">Sign in</Button>
          </SignInButton>
          <SignUpButton>
            <Button size="lg" variant="outline">
              Create an account
            </Button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <Card className="mt-10 w-full max-w-xl">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-1">
              <p className="text-sm font-medium">You’re all set.</p>
              <p className="text-sm text-muted-foreground">
                Head to your dashboard to review usage or manage provider keys.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-10 w-10" } }} />
            </div>
          </CardContent>
        </Card>
      </SignedIn>
    </main>
  );
}
