## **Detailed Instructions: Day 3 - Automated Usage Fetching**

**Objective:** By the end of today, you will have a fully functional, automated daily job that runs in the background. This job will retrieve the stored API keys, decrypt them, and populate your database with usage data, laying the groundwork for the dashboard.

**Important Note on Fetching Usage:** The OpenAI API does **not** provide a historical endpoint to fetch all usage from the last 24 hours. A real-world production app would typically proxy API requests to log usage as it happens. For this MVP, to achieve the architectural goal in a single day, we will **simulate** this process. Our cron job will run, validate the stored keys, and insert sample, realistic-looking usage data into the database. This proves the end-to-end flow is working.

#### **Prerequisites:**

  * You have successfully completed all steps from Days 1 and 2.
  * You have at least one OpenAI API key saved in your database via the settings page.

-----

### **Step 1: Set Up Vercel Cron Job**

We will use Vercel's built-in cron job feature, which is the fastest way to get scheduled tasks running in this stack.

1.  **Create `vercel.json`:**
    In the root of your project, create a file named `vercel.json`. This file configures your Vercel deployment, including scheduled jobs.

2.  **Define the Cron Job:**
    Add the following configuration. This tells Vercel to send a `GET` request to the `/api/cron/fetch-usage` endpoint every day at midnight (`0 0 * * *`).

    **File: `vercel.json`**

    ```json
    {
      "crons": [
        {
          "path": "/api/cron/fetch-usage",
          "schedule": "0 0 * * *"
        }
      ]
    }
    ```

3.  **Generate a Cron Secret:**
    To secure your cron job endpoint so that only Vercel can run it, you need a secret token.

      * Open your terminal and run the following command to generate a secure secret:
        ```bash
        node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
        ```
      * Copy the resulting string.

4.  **Add Secret to Environment Variables:**
    Open your `.env.local` file and add the cron secret.

    **File: `.env.local`**

    ```
    DATABASE_URL="postgres://..."
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
    CLERK_SECRET_KEY="sk_test_..."
    ENCRYPTION_KEY="..."
    CRON_SECRET="your-generated-secret-here"
    ```

-----

### **Step 2: Create the Cron Job API Route**

Now, create the serverless function that Vercel will trigger.

1.  **Create the Route File:**
    Create the necessary directories and the file: `src/app/api/cron/fetch-usage/route.ts`.

2.  **Implement the API Handler:**
    This is the core logic for Day 3. The code will perform the following steps:
    a.  Verify the cron secret from the request header.
    b.  Query the database for all provider keys.
    c.  Loop through each key.
    d.  Decrypt the key.
    e.  **Generate and insert simulated usage data** for that key.

    **File: `src/app/api/cron/fetch-usage/route.ts`**

    ```typescript
    import { NextRequest, NextResponse } from 'next/server';
    import { db } from '@/db/drizzle';
    import { providerKeys, usageEvents } from '@/db/schema';
    import { decrypt } from '@/lib/encryption';
    import { sql } from 'drizzle-orm';

    // This tells Vercel to run this function as a serverless function
    export const dynamic = 'force-dynamic';

    export async function GET(request: NextRequest) {
      // 1. Authenticate the request
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
      }

      // 2. Fetch all API keys from the database
      const keysToProcess = await db.select().from(providerKeys);

      if (keysToProcess.length === 0) {
        return NextResponse.json({ message: 'No keys to process.' });
      }

      console.log(`Found ${keysToProcess.length} keys to process.`);

      const allNewEvents = [];

      // 3. Process each key
      for (const key of keysToProcess) {
        try {
          const decryptedKey = decrypt({
            encryptedData: key.encryptedKey,
            iv: key.iv,
            authTag: key.authTag,
          });

          // In a real app, you would now use `decryptedKey` to call the provider's API.
          // For this MVP, we simulate the data fetching.
          console.log(`Simulating usage fetch for key ID: ${key.id}`);

          const simulatedEvents = generateSimulatedUsage(key.id);
          allNewEvents.push(...simulatedEvents);

        } catch (error) {
          console.error(`Failed to process key ID: ${key.id}`, error);
          // Optional: Add logic to mark the key as invalid in the DB
        }
      }

      // 4. Batch insert all new events into the database
      if (allNewEvents.length > 0) {
        console.log(`Inserting ${allNewEvents.length} new usage events.`);
        await db.insert(usageEvents).values(allNewEvents);
      }

      return NextResponse.json({
        message: `Successfully processed ${keysToProcess.length} keys and inserted ${allNewEvents.length} events.`,
      });
    }

    /**
     * Generates a random set of usage events for the past 24 hours.
     */
    function generateSimulatedUsage(keyId: number) {
        const events = [];
        const models = ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'];
        const now = new Date();

        // Generate between 5 and 20 events for this key
        const eventCount = Math.floor(Math.random() * 16) + 5;

        for (let i = 0; i < eventCount; i++) {
            const model = models[Math.floor(Math.random() * models.length)];
            const tokensIn = Math.floor(Math.random() * 2000) + 100;
            const tokensOut = Math.floor(Math.random() * 1500) + 50;

            // Cost is a rough estimate for demonstration
            const costEstimate = (tokensIn * 0.00001) + (tokensOut * 0.00003); 

            // Spread events over the last 24 hours
            const timestamp = new Date(now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000));

            events.push({
                keyId,
                model,
                tokensIn,
                tokensOut,
                costEstimate: costEstimate.toFixed(6),
                timestamp,
            });
        }
        return events;
    }
    ```

-----

### **Step 3: Deploy and Test**

To test the cron job, you need to deploy the application to Vercel. Cron jobs do not run in local development.

1.  **Add Environment Variables to Vercel:**

      * Go to your project's dashboard on Vercel.
      * Navigate to **Settings** -\> **Environment Variables**.
      * Add all the variables from your `.env.local` file: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `ENCRYPTION_KEY`, and `CRON_SECRET`.
      * Ensure you save the changes.

2.  **Deploy the Project:**
    Push your latest code to the main branch of your GitHub repository. Vercel will automatically trigger a new deployment.

3.  **Manually Trigger the Cron Job for Testing:**
    You don't have to wait until midnight to see if it works.

      * Go to your project's **Logs** tab in the Vercel dashboard.
      * Find the API route you just created: `GET /api/cron/fetch-usage`.
      * Click the "play" icon (▶️) to trigger the function manually.
      * The logs for that function call will appear. You should see your `console.log` messages, such as "Found 1 keys to process" and "Inserting new usage events."

4.  **Verify Data in the Database:**

      * Go to your Neon project dashboard and open the **SQL Editor**.
      * Run a query to see the new data:
        ```sql
        SELECT * FROM usage_events ORDER BY timestamp DESC LIMIT 20;
        ```
      * You should see the table populated with the simulated data you just generated.

### **Day 3 Complete: Summary**

Fantastic\! You have successfully built and deployed the automated data pipeline for the application. You now have:

  * A secure API endpoint designed to be run on a schedule.
  * A Vercel Cron job configured to run daily, automatically triggering your logic.
  * A robust serverless function that fetches all user keys, decrypts them, and simulates usage data.
  * The ability to populate your `usage_events` table with new data, which is now ready to be displayed on the dashboard.

The application's backend is now functionally complete for the MVP. You are perfectly positioned for Day 4, where you will build the frontend dashboard to visualize all this data.