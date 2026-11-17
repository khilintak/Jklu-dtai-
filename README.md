# TRACE: Smart Money Manager for Uneven Months
### Designed for Students & Irregular Income Earners (JKLU Money Manager)

A modern, full-stack personal finance web application built to solve the unique financial challenge faced by college students, freelancers, and gig workers: **managing money when income arrives unevenly** (pocket money, freelance checks, gifts) and must last until an uncertain future date.

---

## 🌟 What Was Built & Modernized

### 1. Robust Full-Stack Backend (`server.js` + SQLite)
- **Engine**: Node.js v26 + Express REST API.
- **Database**: Zero-dependency, file-based SQLite database powered by Node's native `node:sqlite` `DatabaseSync` (`data/trace.db`), running in high-performance WAL mode.
- **Persistence**: All transactions, upcoming bills, safety buffer rules, and AI chat history persist across server restarts, browser refreshes, and device sessions.
- **"You Want vs. You Need" Classification Engine**:
  - Classify any expense as **🛡️ You Need** (Survival / essential college requirement: mess fees, shared auto to exam, stationery, printouts, recharge) or **✨ You Want** (Discretionary treats: pizza, earphones, movies, night outings).
  - Comparative analytics calculating exact ₹ sums, percentage split, and actionable savings projections.
  - Interactive 1-click classification toggle on any transaction row with real-time recalculation.
  - Transaction ledger filter pills: `All Entries`, `🛡️ You Need`, and `✨ You Want`.
- **Real-Time Financial Logic**:
  - **Safe to Spend Today**: Intelligently accounts for balance, safety buffer cushion, and upcoming bills spread evenly over the horizon until next money arrives.
  - **Cash Runway**: Calculates remaining days at 14-day trailing average burn rate.
  - **Auto-Buffer Split**: Automatically deposits a set percentage (e.g. 20%) of each new income directly into an untouchable emergency cushion.
  - **1-Click Bill Pay**: Converts upcoming bills into logged expenses under "Bills" and recalculates daily room in real time.
- **Smart Bill Scanner & OCR**:
  - Upload receipt photo via drag-and-drop or camera capture.
  - OCR text extraction with `tesseract.js` + intelligent pattern matching regex for totals (₹, Rs, Grand Total), store/merchant names, and auto-category classification.
- **AI Financial Advisor (`/api/ask`)**:
  - Answers questions like *"Can I afford ₹500 this weekend?"*, *"Compare my needs and wants"*, *"Where can I cut back?"*, or *"How do I survive a lean month?"*.
  - Analyzes the user's actual database numbers (usable cash, buffer, daily burn, upcoming bills, needs vs wants) to deliver calm, actionable guidance.

---

### 2. Full PC & Mobile Compatibility at All Times
- **Mobile Experience (< 900px)**:
  - Native mobile app layout with bottom navigation bar.
  - Handled safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
  - Touch-friendly 44px+ minimum hit targets (WCAG 2.5.5).
  - Horizontal swipeable chips for quick one-thumb interaction.
- **Desktop / PC Experience (≥ 900px & Widescreen)**:
  - Expansive widescreen Dashboard layout (not a cramped 480px phone container!).
  - Dedicated left sidebar with real-time status pulse, app navigation, and date.
  - Multi-column dashboard grid:
    - **Hero banner**: Safe-to-spend today display with live pulse indicator and breakdown.
    - **4-Stat metrics grid**: Cash runway, next money countdown, 14-day daily burn rate, usable cash.
    - **Interactive 7-day spending velocity chart**: Hover tooltips with date and exact spend.
    - **Upcoming bills & recent transactions feed**.
- **Interactive Device View Switcher**:
  - Seamlessly toggle between **"Desktop Dashboard"** and **"Mobile View"** directly from the top bar on PC to test or preview both layouts.

---

### 3. Motions & Visual Enhancements
Built in compliance with `modern-web-guidance`:
- **Compositor-Only Transitions**: Transforms (`scale`, `translate`) and `opacity` for 60fps / 120fps smooth performance.
- **Respects `prefers-reduced-motion`**: Disables spatial translation and fast scaling when the user's OS requests reduced motion.
- **Counter Roll-Up Animation**: Numbers smoothly roll up into place with an ease-out cubic curve on load and updates.
- **Laser Scan Effect**: Animated glowing green laser line sweeps vertically across the receipt dropzone when scanning bills.
- **Tactile Button Clicks**: `button:active { transform: scale(0.97); }` with subtle glow highlights on hover.
- **Interactive 7-Day Chart**: Bars smoothly scale up to their respective heights on view, with hover highlights and exact tooltips.
- **Live Impact Preview**: As you type an expense amount in the Add form, a live box instantly shows how your daily safe-to-spend will change before you even hit Save.
- **Student Quick Shortcuts**: 1-tap presets for campus expenses (☕ Chai ₹20, 🍛 Canteen ₹120, 🛺 Auto ₹60, 🚇 Metro ₹40, 🖨️ Printout ₹30, 📱 5G Recharge ₹299).
- **Toast Notifications**: Spring pop-in alerts with auto-dismiss timers.
- **Dark / Light Theme Toggle**: Persistent theme memory in `localStorage`.

---

## 🚀 How to Run

### Starting the Server
In the project directory, run:
```bash
npm start
```
Or for auto-reloading during development:
```bash
npm run dev
```

Then open your browser at:
**[http://localhost:3000](http://localhost:3000)**

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/state` | `GET` | Returns complete dashboard state (financials, calculations, transactions, bills, analytics) |
| `/api/transactions` | `POST` | Log new transaction (`type`: 'exp'/'inc', `amount`, `title`, `category`, `dateOffset`) |
| `/api/transactions/:id` | `DELETE` | Delete a transaction |
| `/api/bills` | `POST` | Add upcoming bill (`name`, `amount`, `dueInDays`) |
| `/api/bills/:id/pay` | `PATCH` | Mark bill as paid & automatically records expense under "Bills" |
| `/api/bills/:id` | `DELETE` | Remove a bill |
| `/api/plan` | `PUT` | Update plan settings (`nextDays`, `pct`, `goal`, `clearNextDay`) |
| `/api/scan-bill` | `POST` | Upload receipt image for OCR and smart merchant/amount parsing |
| `/api/ask` | `POST` | AI financial assistant advice based on user's live database figures |
| `/api/chat` | `GET`, `DELETE` | Fetch or clear AI chat message history |
| `/api/reset-sample` | `POST` | Reset database to clean student sample dataset |
| `/api/clear-all` | `POST` | Wipe all entries |
| `/api/export` | `GET` | Export complete database as JSON backup |
| `/api/import` | `POST` | Restore database from JSON backup |

---

## 📁 File Structure

```text
JKLU money manager/
├── public/
│   ├── index.html        # Responsive frontend (PC Dashboard + Mobile App)
│   ├── css/
│   │   └── style.css     # Design system, responsive grid, motion & dark mode
│   └── js/
│       ├── app.js        # Frontend controller, API integration, live impact logic
│       └── motion.js     # Counter roll-ups, haptics, spring toasts & transitions
├── data/
│   └── trace.db          # Persistent SQLite database (auto-generated)
├── uploads/              # Storage for scanned receipts & bills (auto-generated)
├── server.js             # Express backend server with REST API, OCR & AI Engine
├── package.json          # Node dependencies & launch scripts
└── README.md             # Project documentation
```
