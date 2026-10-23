# Fellowship Chat Modernization Implementation Plan

## Summary & Objectives
Enhance the Fellowship Guild chat box in `src/components/guild/TeamModule.tsx` to match modern chat standards (WeChat / Discord style). The implementation will introduce:
1. **Smart Date & Time Dividers:** Centered, subtle date headers (e.g. "Today", "Yesterday", or formatted dates) and smart interval time stamps when messages are sent >5 minutes apart.
2. **Consecutive Message Clustering:** Seamless grouping of consecutive messages from the same user sent within a 5-minute window under a single avatar and sender title, reducing visual clutter.
3. **Scroll Viewport Stabilization:** Refactor the chat message container from `flex-col-reverse` to standard top-to-bottom flow with robust bottom-docking logic (`isNearBottomRef`, `scrollHeight - scrollTop - clientHeight <= 80px`).
4. **Floating Unread / Scroll-to-Bottom Pill:** A smooth animated pill floating above the message input box when scrolled up, displaying unread incoming count (e.g., `↓ 3 new messages`) or a quick scroll button (`↓ Scroll to bottom`) that smoothly glides down to the latest message.

---

## User Review & Confirmed Decisions
Based on clarifying questions answered by the user:
- **Date & Time Layout:** Centered date badges (e.g., subtle rounded pill with day separator) and smart time interval badges (>5 min elapsed between consecutive messages).
- **Scroll & Unread Behavior:** Floating pill anchored at the bottom-center of the chat view when user is scrolled up >100px from the bottom; displays dynamic unread message count and scrolls smoothly to bottom on click.
- **Message Grouping:** Group consecutive messages from the same member within 5 minutes under a single avatar/name header, with tighter bubble margins and subtle relative time on hover.

---

## Architecture & Technical Design

### 1. Chat Flow & Scroll Engine
```
+-------------------------------------------------------------+
| Fellowship Chat Viewport (Refactored to flex flex-col)     |
|                                                             |
|  [-- Today, Oct 24 --]              <- Centered Date Badge  |
|                                                             |
|  (Avatar) [ScholarA]: Hello everyone! (10:14)               |
|           Working on algorithms today... (mt-1)             |
|                                                             |
|  [-- 10:25 AM --]                   <- 5+ Min Interval Pill |
|                                                             |
|  (Avatar) [ScholarB]: Good luck with your study session!    |
|                                                             |
|  ...................... (User scrolled up) ...............  |
|                                                             |
|           +---------------------------------+               |
|           |   ↓ 3 new messages  (Click)     |               |  <- Floating Pill
|           +---------------------------------+               |     (AnimatePresence)
+-------------------------------------------------------------+
| [ Message Input Field................... ] [ Send Button ]  |
+-------------------------------------------------------------+
```

### 2. Message Preprocessing & Chronological Pipeline
Before rendering `messages`:
1. **Chronological Sort:** Guarantee messages are ordered ascending by `timestamp`.
2. **Cluster & Divider Detection:**
   - Compute `showDateDivider`: true if first message of chat or if `dateString(msg.timestamp) !== dateString(prevMsg.timestamp)`.
   - Compute `showTimeDivider`: true if date didn't change, but `msg.timestamp - prevMsg.timestamp >= 5 * 60 * 1000` (5 minutes).
   - Compute `isConsecutive`: true if same sender `msg.senderId === prevMsg.senderId`, same day, and time gap `< 5 minutes`.
3. **Date Label Formatting:**
   - If today: `"Today"`
   - If yesterday: `"Yesterday"`
   - If same year: `"MMM d"` (e.g., `Oct 24`)
   - Else: `"MMM d, yyyy"` (e.g., `Oct 24, 2025`)
   - Strictly in English per CSS & UI Standards.

### 3. Scroll & Unread State Engine
- **State & Refs:**
  - `scrollContainerRef`: Reference to the scrollable `div`.
  - `isAtBottom`: Boolean state tracking if user is within `60px` of the bottom.
  - `unreadCount`: Tracks incoming messages received via polling or socket while `!isAtBottom`.
  - `lastSeenMessageId`: ID of the message at the bottom when user scrolled away.
- **Scroll Event Listener:**
  - Computes `const distanceFromBottom = scrollHeight - scrollTop - clientHeight`.
  - If `distanceFromBottom <= 60`:
    - `setIsAtBottom(true)`
    - Reset `unreadCount` to 0.
  - If `distanceFromBottom > 60`:
    - `setIsAtBottom(false)`
- **New Message Arrival:**
  - If `isAtBottom`: Auto-scroll to bottom using `element.scrollTo({ top: scrollHeight, behavior: 'smooth' })`.
  - If `!isAtBottom`: Increment `unreadCount` for every new incoming message.
- **Floating Button Action:**
  - On click: Smoothly scrolls to bottom `element.scrollTo({ top: scrollHeight, behavior: 'smooth' })`, resets `unreadCount = 0`, sets `isAtBottom = true`.

---

## Detailed Implementation Steps

### Step 1: Update `src/components/guild/TeamModule.tsx`
- Replace inverted scroll layout (`flex flex-col-reverse` with reversed array) with direct forward layout (`flex flex-col`).
- Implement `renderMessageList()` with:
  - Date dividers (`px-3 py-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 rounded-full border border-slate-700/50`).
  - Time dividers (`text-[10px] text-slate-500 font-mono tracking-wide`).
  - Clustered message items:
    - First message in cluster: Full avatar, sender name, guild title/badge, and timestamp.
    - Subsequent messages in cluster: Indented margin matching avatar width (`ml-10`), tighter vertical padding (`mt-1`), hover-to-reveal exact timestamp.
- Add Floating Scroll-to-Bottom Pill with Lucide icon `ArrowDown`:
  - Position: `absolute bottom-20 left-1/2 -translate-x-1/2 z-20`
  - Style: Theme-aware dark pill (`bg-slate-800/95 hover:bg-slate-700/95 text-indigo-400 border border-indigo-500/30 shadow-lg backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95`).
  - Text: Unread count > 0 ? `↓ {unreadCount} new messages` : `↓ Scroll to bottom`.

### Step 2: Theme & Strict English UI Compliance
- Ensure all labels, date formats, and tooltips are 100% English:
  - `"Today"`, `"Yesterday"`, `"new message"`, `"new messages"`, `"Scroll to bottom"`.
- Use theme-aware classes (`indigo-400`, `indigo-500`, neutral slate backgrounds with alpha) so it renders flawlessly across Night, Forest, Ocean, Daylight, Warm Sun, and Candy.

### Step 3: Verification & Version Tracking
- Run `compile_applet` to ensure TypeScript and Vite build compile with zero errors.
- Preview update bump to `v9.3.39` in `src/version.ts`.
- Update `AGENTS.md` and `TaskHistory.md`.
