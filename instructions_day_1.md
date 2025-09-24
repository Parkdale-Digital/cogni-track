## **Detailed Instructions: Day 1 - Platform & Schema Setup**

**Objective:** By the end of today, you will have a functional Next.js application with a provisioned database, a defined schema, and fully integrated user authentication with protected routes. This creates the foundational bedrock for all subsequent features.

#### **Prerequisites:**

Before you begin, ensure you have the following accounts and tools:

  * A [Clerk](https://clerk.com/) account (Free tier is sufficient).
  * A [Neon](https://neon.tech/) account (Free tier is sufficient).
  * A [GitHub](https://github.com/) account.
  * A [Vercel](https://vercel.com/) account.
  * [Node.js](https://nodejs.org/) (LTS version) and `npm`/`pnpm`/`yarn` installed on your machine.

-----

### **Step 1: Initialize Next.js Project & Git**

First, create a new Next.js application using the App Router, and set up version control.

1.  **Create the Next.js App:**
    Open your terminal and run the following command. When prompted, accept the defaults for TypeScript, ESLint, and Tailwind CSS.

    ```bash
    npx create-next-app@latest llm-usage-tracker
    ```

2.  **Navigate into the Project:**

    ```bash
    cd llm-usage-tracker
    ```

3.  **Initialize Git Repository:**

    ```bash
    git init
    git add .
    git commit -m "Initial commit: Setup Next.js project"
    ```

    Create a new repository on GitHub and push your local project to it.

-----

### **Step 2: Provision Neon Postgres Database**

Next, set up your serverless Postgres database on Neon.

1.  **Create a Neon Project:**

      * Log in to your Neon account.
      * Click "Create a project" and give it a name like `usage-tracker`.
      * Choose the latest Postgres version and your preferred region.
      * Let the project provision. This typically takes less than a minute.

2.  **Get the Connection String:**

      * On your Neon project dashboard, locate the **Connection Details** widget.
      * Ensure the "Role" is selected (it will be by default).
      * Select the **Pooled connection** checkbox. This is crucial for serverless environments.
      * Copy the connection string URI. It will look like `postgres://user:password@endpoint.neon.tech/dbname?sslmode=require`.

3.  **Store Environment Variable:**

      * In your Next.js project root, create a file named `.env.local`.
      * Add the Neon connection string to this file. Drizzle uses the `DATABASE_URL` variable by convention.

    **File: `.env.local`**

    ```
    DATABASE_URL="postgres://user:password@endpoint.neon.tech/dbname?sslmode=require"
    ```

      * **Important:** Add `.env.local` to your `.gitignore` file to prevent leaking secrets. The default Next.js `.gitignore` should already include this.

-----

### **Step 3: Set Up Drizzle ORM and Define Schema**

Now, you will install Drizzle, connect it to your Neon database, and define the application's data structure.

1.  **Install Drizzle Dependencies:**

    ```bash
    npm install drizzle-orm @neondatabase/serverless
    npm install -D drizzle-kit
    ```

2.  **Create Drizzle Config File:**
    In the project root, create a file named `drizzle.config.ts`. This tells Drizzle Kit how to connect to your database to manage the schema.

    **File: `drizzle.config.ts`**

    ```typescript
    import type { Config } from "drizzle-kit";
    import * as dotenv from "dotenv";
    dotenv.config({ path: ".env.local" });

    export default {
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      driver: "pg",
      dbCredentials: {
        connectionString: process.env.DATABASE_URL!,
      },
    } satisfies Config;
    ```

3.  **Define the Database Schema:**
    Create a new directory `src/db` and a file `schema.ts` inside it. This is where you will define your tables.

    **File: `src/db/schema.ts`**

    ```typescript
    import { pgTable, text, timestamp, serial, integer, decimal } from "drizzle-orm/pg-core";

    // Users table to store Clerk user IDs
    export const users = pgTable("users", {
      id: text("id").primaryKey(), // Clerk User ID
      createdAt: timestamp("created_at").defaultNow().notNull(),
    });

    // Encrypted API keys for providers
    export const providerKeys = pgTable("provider_keys", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
      provider: text("provider").notNull(), // e.g., 'openai'
      encryptedKey: text("encrypted_key").notNull(),
      iv: text("iv").notNull(), // Initialization Vector for AES-256-GCM
      authTag: text("auth_tag").notNull(), // Auth Tag for AES-256-GCM
      createdAt: timestamp("created_at").defaultNow().notNull(),
    });

    // Individual usage events
    export const usageEvents = pgTable("usage_events", {
      id: serial("id").primaryKey(),
      keyId: integer("key_id").notNull().references(() => providerKeys.id, { onDelete: 'cascade' }),
      model: text("model").notNull(), // e.g., 'gpt-4-turbo'
      tokensIn: integer("tokens_in").default(0),
      tokensOut: integer("tokens_out").default(0),
      costEstimate: decimal("cost_estimate", { precision: 10, scale: 6 }).default("0"),
      timestamp: timestamp("timestamp").notNull(),
    });
    ```

4.  **Push Schema to Neon:**
    Run the following command. Drizzle Kit will inspect your schema file and apply the necessary SQL commands to your Neon database to create the tables.

    ```bash
    npx drizzle-kit push:pg
    ```

    You can now log in to the Neon SQL Editor to verify that the `users`, `provider_keys`, and `usage_events` tables have been created successfully.

-----

### **Step 4: Integrate Clerk for Authentication**

Finally, add user authentication and protect the application routes.

1.  **Create Clerk Application:**

      * Log in to your Clerk Dashboard and click "Add application".
      * Give it a name (e.g., "LLM Usage Tracker") and select your preferred sign-in providers (Email, Google, GitHub, etc.).
      * Click "Create Application".

2.  **Get API Keys:**

      * Navigate to your new application's dashboard. Go to **API Keys**.
      * Copy the **Publishable key** and the **Secret key**.

3.  **Add Keys to Environment:**
    Open your `.env.local` file again and add the Clerk keys.

    **File: `.env.local`**

    ```
    DATABASE_URL="postgres://..."
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
    CLERK_SECRET_KEY="sk_test_..."
    ```

4.  **Install Clerk Next.js SDK:**

    ```bash
    npm install @clerk/nextjs
    ```

5.  **Set Up Clerk Provider:**
    Update your root layout file to wrap your application in the `<ClerkProvider>`.

    **File: `src/app/layout.tsx`**

    ```tsx
    import type { Metadata } from "next";
    import { Inter } from "next/font/google";
    import "./globals.css";
    import { ClerkProvider } from "@clerk/nextjs";

    const inter = Inter({ subsets: ["latin"] });

    export const metadata: Metadata = {
      title: "LLM Usage Tracker",
      description: "Track your LLM API usage and costs.",
    };

    export default function RootLayout({
      children,
    }: Readonly<{
      children: React.ReactNode;
    }>) {
      return (
        <ClerkProvider>
          <html lang="en">
            <body className={inter.className}>{children}</body>
          </html>
        </ClerkProvider>
      );
    }
    ```

6.  **Create Authentication Routes:**
    Clerk provides pre-built UI components. Create the following files to handle the sign-in and sign-up flows.

    **File: `src/app/sign-in/[[...sign-in]]/page.tsx`**

    ```tsx
    import { SignIn } from "@clerk/nextjs";

    export default function Page() {
      return <SignIn />;
    }
    ```

    **File: `src/app/sign-up/[[...sign-up]]/page.tsx`**

    ```tsx
    import { SignUp } from "@clerk/nextjs";

    export default function Page() {
      return <SignUp />;
    }
    ```

7.  **Protect Routes with Middleware:**
    Create a `middleware.ts` file in the root of your project (at the same level as `src` and `app`). This will protect all routes by default except for the public ones you specify.

    **File: `middleware.ts`**

    ```typescript
    import { authMiddleware } from "@clerk/nextjs";

    export default authMiddleware({
      // Routes that can be accessed while signed out
      publicRoutes: ['/', '/sign-in', '/sign-up'],
      // Routes that can always be accessed, and have
      // no authentication information
      ignoredRoutes: [],
    });

    export const config = {
      matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
    };
    ```

-----

### **Day 1 Complete: Summary**

Congratulations\! You have successfully completed the foundational setup. You now have:

  * A Next.js 14 application running locally.
  * A live, serverless Postgres database hosted on Neon.
  * A complete database schema defined with Drizzle, ready for data.
  * Full-featured, secure user authentication powered by Clerk.
  * Protected application routes that require a user to be logged in.

Your project is now fully prepared for Day 2, where you will build the settings page to add and encrypt provider API keys.

```
Sources:
1. https://github.com/amiralizadde/Threads-app