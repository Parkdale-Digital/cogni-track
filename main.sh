npx create-next-app@latest llm-usage-tracker

cd llm-usage-tracker

git init
    git add .
    git commit -m "Initial commit: Setup Next.js project"

npm install drizzle-orm @neondatabase/serverless
    npm install -D drizzle-kit

npx drizzle-kit push:pg

npm install @clerk/nextjs

# Sources:
# 1. https://github.com/amiralizadde/Threads-app