# WashPadi

WashPadi is a web app for managing a laundry business. Customers place orders and track their status. Staff and the owner review orders, set prices, and move work through the laundry process. The owner can also manage staff and view reports.

## How it works

- Customers create orders without setting prices. The order stays **Quote pending** until staff or the owner enters the price.
- Staff and the owner can update order statuses, including **Received**, **Washing**, and **Ready**.
- All users sign in at `/login`. The configured owner email receives the owner role. Staff members can create accounts, then the owner assigns the Staff role in Team.
- Payment choices are a demonstration only. No real payment is processed.
- An optional Make webhook can send order placed and ready notifications. Configure the Gmail recipient using the webhook's `customerEmail` value.

## Run locally

1. Install Node.js, then install the project packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values:

   ```env
   DATABASE_URL=
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=http://localhost:3000
   WASHPADI_OWNER_EMAIL=
   MAKE_WASHPADI_WEBHOOK_URL=
   ```

   `DATABASE_URL` is your Neon Postgres connection string. Generate a private `BETTER_AUTH_SECRET` of at least 32 characters. `MAKE_WASHPADI_WEBHOOK_URL` is optional; leave it empty if you are not using Make.

3. Set up the database and authentication tables, then start the app:

   ```bash
   npm run db:setup
   npm run auth:migrate
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Deployment

Push the repository to GitHub and import it into Vercel. Add the required environment variables in the Vercel project settings for each environment, then deploy. Use newly rotated credentials if a secret has been exposed.

Never commit `.env.local` or share its secret values. `.env.example` contains blank placeholders and is safe to commit.
