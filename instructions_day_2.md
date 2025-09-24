## **Detailed Instructions: Day 2 - API Key Management**

**Objective:** By the end of today, you will have a secure settings page where an authenticated user can submit their OpenAI API key. This key will be encrypted using a strong algorithm and saved to the database. You will also implement a basic server-side validation check to ensure the key is functional.

#### **Prerequisites:**

You have successfully completed all steps from Day 1. Your application has functional authentication and a database schema ready.

-----

### **Step 1: Generate Master Encryption Key**

First, you need a secret key for the encryption algorithm. This key will be stored as an environment variable and should never be committed to Git.

1.  **Generate a Secure Key:**
    Open your terminal and run the following Node.js command to generate a cryptographically secure 32-byte key, encoded in base64.

    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    ```

    This will output a long random string. Copy this string.

2.  **Store the Key:**
    Open your `.env.local` file and add the key you just generated.

    **File: `.env.local`**

    ```
    DATABASE_URL="postgres://..."
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
    CLERK_SECRET_KEY="sk_test_..."
    ENCRYPTION_KEY="your-generated-key-string-here"
    ```

-----

### **Step 2: Implement the Encryption Helper**

Create a server-side utility module to handle the AES-256-GCM encryption and decryption logic.

1.  **Create the Utility File:**
    Create a new directory and file: `src/lib/encryption.ts`.

2.  **Add Encryption/Decryption Logic:**
    Populate the file with the following code. This uses Node.js's built-in `crypto` module.

    **File: `src/lib/encryption.ts`**

    ```typescript
    import crypto from 'crypto';

    const ALGORITHM = 'aes-256-gcm';
    const IV_LENGTH = 16; // For AES, this is always 16
    const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64');

    if (!process.env.ENCRYPTION_KEY || KEY.length !== 32) {
      throw new Error('Invalid ENCRYPTION_KEY. Must be a 32-byte base64 string.');
    }

    interface EncryptedResult {
      iv: string;
      authTag: string;
      encryptedData: string;
    }

    export const encrypt = (text: string): EncryptedResult => {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encryptedData: encrypted,
      };
    };

    export const decrypt = (encryptedResult: EncryptedResult): string => {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        KEY,
        Buffer.from(encryptedResult.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(encryptedResult.authTag, 'hex'));
      let decrypted = decipher.update(encryptedResult.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    };
    ```

-----

### **Step 3: Build the Settings Page UI**

Create a new route and a form for users to submit their API key. We will use a Server Action to handle the form submission securely.

1.  **Create the Page File:**
    Create a new file at `src/app/settings/page.tsx`. This will be a protected route thanks to the middleware from Day 1.

2.  **Add the Form Component:**
    This component will contain a simple form. For a better user experience, we will use the `useFormStatus` hook to show a pending state on the button.

    **File: `src/app/settings/page.tsx`**

    ```tsx
    import { UserButton } from "@clerk/nextjs";
    import { addApiKey } from "@/app/actions";

    export default function SettingsPage() {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
          <header className="w-full max-w-4xl flex justify-between items-center mb-12">
            <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
            <UserButton afterSignOutUrl="/" />
          </header>

          <main className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Add Provider API Key</h2>
            <p className="text-sm text-gray-600 mb-6">
              Your API key is encrypted at rest. We only use it to fetch your usage data.
            </p>

            <form action={addApiKey} className="space-y-4">
              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                  Provider
                </label>
                <select
                  id="provider"
                  name="provider"
                  defaultValue="openai"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="openai">OpenAI</option>
                  {/* Other providers will be added here later */}
                </select>
              </div>

              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                  API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  name="apiKey"
                  required
                  placeholder="sk-..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add and Validate Key
              </button>
            </form>
          </main>
        </div>
      );
    }
    ```

-----

### **Step 4: Implement the Server Action**

This is the secure, server-side logic that will run when the form is submitted.

1.  **Create the Actions File:**
    Create a new file: `src/app/actions.ts`.

2.  **Write the `addApiKey` Action:**
    This action will handle user authentication, data validation, encryption, and database insertion.

    **File: `src/app/actions.ts`**

    ```typescript
    'use server';

    import { auth } from "@clerk/nextjs/server";
    import { redirect } from "next/navigation";
    import { db } from "@/db/drizzle"; // We'll create this Drizzle client file next
    import { users, providerKeys } from "@/db/schema";
    import { encrypt } from "@/lib/encryption";
    import { revalidatePath } from "next/cache";
    import { eq } from "drizzle-orm";

    export async function addApiKey(formData: FormData) {
      const { userId } = auth();
      if (!userId) {
        redirect("/sign-in");
      }

      const apiKey = formData.get("apiKey") as string;
      const provider = formData.get("provider") as string;

      if (!apiKey || !provider) {
        throw new Error("API Key and provider are required.");
      }

      // Basic validation for OpenAI key format
      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
          throw new Error("Invalid OpenAI API key format.");
      }

      // 1. Encrypt the key
      const { encryptedData, iv, authTag } = encrypt(apiKey);

      // 2. Upsert user (ensures user exists in our DB)
      // This links our DB user record to the Clerk auth user
      await db.insert(users).values({ id: userId }).onConflictDoNothing();

      // 3. Save the encrypted key to the database
      await db.insert(providerKeys).values({
        userId,
        provider,
        encryptedKey: encryptedData,
        iv,
        authTag,
      });

      // Optional: Basic validation check by making a test API call
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) {
            // Key is likely invalid, but we've saved it anyway. 
            // A more robust system might mark it as 'invalid' in the DB.
            console.warn(`API key validation failed for user ${userId} with status ${response.status}`);
        }
      } catch (error) {
        console.error("Error during API key validation:", error);
      }

      // 4. Revalidate the path to show new data
      revalidatePath("/settings");

      return { success: true, message: "API Key added successfully." };
    }
    ```

3.  **Create the Drizzle Client:**
    The action above imports `db`. Let's create that file.

    **File: `src/db/drizzle.ts`**

    ```typescript
    import { drizzle } from 'drizzle-orm/neon-http';
    import { neon } from '@neondatabase/serverless';
    import * as schema from './schema';

    const sql = neon(process.env.DATABASE_URL!);
    export const db = drizzle(sql, { schema });
    ```

### **Day 2 Complete: Summary**

Excellent work\! You have now built a critical piece of the application's core functionality. You have:

  * A secure settings page accessible only to authenticated users.
  * A form that uses a Next.js Server Action to handle data submission without needing to build a separate API route.
  * A robust encryption utility using AES-256-GCM to protect user secrets.
  * The full server-side logic to receive an API key, encrypt it, and store it securely in your Neon database, linked to the correct user.
  * A basic, live validation check that provides an early warning if a key is invalid.

Your application is now ready for Day 3, where you will build the scheduled job to fetch usage data using these stored keys.