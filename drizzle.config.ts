// import { defineConfig } from 'drizzle-kit';
// import * as dotenv from "dotenv";
// dotenv.config({ path: ".env.local" });

// export default defineConfig({
//   schema: "./src/db/schema.ts",
//   out: "./drizzle",
//   dialect: "postgresql",
//   dbCredentials: {
//     url: process.env.DATABASE_URL!,
//   },
// });

// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL!, // or DATABASE_URL, whichever you’re exporting
  },
});
