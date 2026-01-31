# LabPro - Cell Bank Management System

LabPro is a comprehensive laboratory management system for cell bank operations, tracking biological materials, cultures, donors, and quality control.

## Features

- **Donor Management** - Register and track biological material donors
- **Culture Tracking** - Create and monitor cell cultures with lot numbers
- **Inventory Management** - Track consumables and materials
- **Operations** - Record observations, quality tests, and disposals
- **Task Management** - Assign and track operator tasks

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

The easiest way to deploy LabPro is to use the [Vercel Platform](https://vercel.com/new).

## Supabase Setup

1. Create a new Supabase project
2. Run the migrations in `supabase/schema.sql`
3. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

MIT
