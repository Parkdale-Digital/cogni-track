# LLM API Usage Tracker

## Overview

The LLM API Usage Tracker is a Next.js-based web application that helps developers and teams monitor their Large Language Model API usage and costs across different providers. The MVP focuses on OpenAI integration with automated daily usage tracking, providing users with a centralized dashboard to view their API consumption patterns, estimated costs, and detailed usage events.

The application is designed as a 5-day MVP sprint project, emphasizing rapid development and deployment using modern serverless technologies. It provides secure API key management with encryption, automated background data fetching, and comprehensive usage visualization through charts and exportable reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 15 with App Router for modern React server-side rendering
- **Styling**: CSS modules with utility-first approach for rapid UI development
- **Authentication UI**: Clerk's pre-built components for sign-in/sign-up flows
- **Charts**: Recharts library for usage visualization and trend analysis
- **State Management**: React Server Components with server-side data fetching to minimize client-side complexity

### Backend Architecture
- **Runtime**: Node.js serverless functions deployed on Vercel
- **API Routes**: Next.js API routes for handling CRUD operations and background jobs
- **Database ORM**: Drizzle ORM for type-safe database operations and migrations
- **Background Jobs**: Vercel Cron for scheduled daily usage data fetching
- **Security**: AES-256-GCM encryption for API key storage with environment-based master keys

### Authentication & Authorization
- **Provider**: Clerk for complete authentication management
- **Strategy**: Email/social login with secure session handling
- **Route Protection**: Middleware-based authentication checks for protected pages
- **User Management**: Clerk user IDs as primary keys for data isolation

### Data Storage
- **Primary Database**: Neon Postgres for serverless, auto-scaling data storage
- **Connection Pool**: Neon serverless driver with WebSocket support
- **Schema Design**: Three-table structure (users, provider_keys, usage_events) with proper foreign key relationships
- **Data Encryption**: Client-side encryption before database storage for sensitive API keys
- **Data Retention**: Focus on recent usage events with potential for future archival strategies

### API Integration Patterns
- **Provider Support**: Initial OpenAI integration with extensible architecture for multiple providers
- **Usage Fetching**: Simulated daily batch processing (real-world would require API request proxying)
- **Rate Limiting**: Designed to respect provider API limits through scheduled batching
- **Error Handling**: Comprehensive error states for network issues and invalid API keys

## External Dependencies

### Core Services
- **Clerk**: User authentication and session management
- **Neon**: Serverless Postgres database hosting
- **Vercel**: Application hosting and serverless function deployment
- **OpenAI API**: Primary LLM provider for usage tracking

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across the entire application stack
- **ESLint**: Code quality and consistency enforcement

### Runtime Dependencies
- **@clerk/nextjs**: Authentication integration for Next.js
- **@neondatabase/serverless**: Database connection and query execution
- **drizzle-orm**: Type-safe database operations
- **recharts**: Chart rendering for usage visualization
- **Node.js crypto**: Built-in encryption utilities for API key security

### Deployment Infrastructure
- **Vercel Cron**: Scheduled background job execution
- **Vercel Functions**: Serverless API route hosting
- **GitHub**: Source code management and CI/CD integration
- **Environment Variables**: Secure configuration management for API keys and database connections