# SportsPick Journal

A one-page web app that remembers your sports picks and tells you what your habits say about you.

Built for the **Total Recall** hackathon (Tatum x Walrus Memory) with Tatum AI Builder.

## What it does

- Log a pick: sport, game, your pick, odds, confidence (1-10), and why.
- Every pick is stored as a memory on **Walrus Memory (Mainnet)** and gets a real Blob ID.
- When the page opens, it loads your saved picks back from Walrus Memory.
- Mark picks Won or Lost, and the app finds patterns, like "you're 72% right when confidence is 7 or higher" or which sport you do best in.
- Filter your journal by sport (NFL, NBA, EPL, MLB, NHL).
- Uses **Tatum RPC** to show the latest block number next to each saved pick.

## How it uses Walrus Memory

The app has no database of its own. Your picks live in Walrus Memory, so they stay with you and the app can come back to them any time. The pattern cards are calculated only from the picks it loads from Walrus.

## Tech

- Tatum AI Builder (generated app shell)
- Walrus Memory (MemWal) on Mainnet
- Tatum RPC and Data APIs
- React, TypeScript, Tailwind CSS
- Small Node server that keeps keys off the browser

## Setup

Keys are never stored in this repo. Add them as secrets or environment variables:

- `MEMWAL_PRIVATE_KEY` - your Walrus Memory private key
- `MEMWAL_ACCOUNT_ID` - your Walrus Memory account ID
- Tatum API key - your key from dashboard.tatum.io

Then run:

```
npm install
npm run dev
```

## Known issues (honest notes)

- Saves to Walrus sometimes show "upstream request timeout" even though the save went through. An early auto-retry then saved the same pick several times, so the demo journal has duplicate entries.
- Stored memories can't be deleted from the app.
- The picks in the demo are test data entered to try the app. They are not real bets and the win rates are not real results.
- The app stops saving when the Tatum free credits run out.

## Ideas for next steps

- Check Walrus for an existing pick before retrying a save, so duplicates can't happen.
- Add a clear "demo data" label.
- Add a "low confidence" warning when your win rate drops below your average.
