import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-16 gap-10">
      <div className="max-w-3xl text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">LLM Usage Tracker</h1>
        <p className="text-lg text-gray-600">
          Track your LLM API usage and estimated costs across providers with a secure, automated dashboard.
        </p>
      </div>

      <SignedOut>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <SignInButton>
            <button className="px-6 py-3 rounded-md bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="px-6 py-3 rounded-md border border-indigo-600 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors">
              Create an account
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600">You’re signed in—head to your dashboard to manage keys and view analytics.</p>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="px-6 py-3 rounded-md bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Go to dashboard
            </a>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
