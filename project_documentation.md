# QuickOrder POS - Comprehensive Project Documentation

This document provides a highly detailed, component-level breakdown of the QuickOrder POS Micro-SaaS project. It covers the complete architecture, database schema, state management, routing, and UI/UX design specifications.

---

## 1. Project Overview & Architecture
QuickOrder POS is a digital QR-code menu and ordering platform designed for small-to-medium cafes and restaurants. It eliminates the need for third-party payment gateways by using direct UPI intent links, allowing merchants to receive payments instantly with zero commission.

### Core Technologies
- **Framework:** Next.js (App Router paradigm) with React.
- **Language:** TypeScript for strict type safety across database schemas and component props.
- **Backend/BaaS:** Supabase (PostgreSQL Database, Authentication, Realtime Channels).
- **Styling:** Vanilla CSS mixed with Tailwind CSS.
- **Hosting:** Cloudflare Pages (configured via `wrangler.jsonc` and `npx @cloudflare/next-on-pages`).
- **Dependencies:** `@supabase/supabase-js` (database interactions), `react-qr-code` (SVG QR generation).

---

## 2. Design System: Neo-Brutalism
The application strictly follows a **Neo-Brutalist** design aesthetic to create a striking, highly visible, and tactile user interface.

### Key Visual Rules
1. **Borders:** Almost all elements (cards, buttons, inputs, bottom sheets) have thick black borders (e.g., `border-2 border-black` or `border-3`).
2. **Shadows:** Hard, non-blurred drop shadows are used to create depth (e.g., `shadow-[4px_4px_0px_0px_#000]`).
3. **Typography:**
   - **Display Headings:** Uppercase, tightly tracked, using `font-display font-black`.
   - **Body/Metadata:** Small, uppercase, tracking-wider with varying opacities for secondary text.
4. **Color Palette:**
   - **Backgrounds:** Off-white/cream (`bg-[#f5f2eb]`, `bg-white`) for base layers.
   - **Interactive states:** High-contrast accents (Warning/Yellow, Success/Green, Danger/Red, Accent/Orange).
5. **Micro-interactions:** When buttons are clicked, they translate down and to the right (`active:translate-x-[3px] active:translate-y-[3px]`) and the shadow is removed (`active:shadow-none`), creating a physical "button press" effect.
6. **Border Radius:** Completely absent. All corners are sharp (`rounded-none`).

---

## 3. Database Schema (Supabase)
The PostgreSQL database consists of three primary tables linked by foreign keys.

### A. `cafes` Table
Stores merchant profiles and configuration.
- `id` (uuid, primary key): Maps directly to `auth.users.id`.
- `business_name` (text): Displayed on the customer menu and receipts.
- `upi_id` (text): The merchant's UPI Virtual Payment Address (VPA).
- `has_seating` (boolean): Determines if the customer flow asks for a table number or a customer name.
- `table_count` (integer, nullable): Used to generate the correct number of QR codes.
- `created_at` / `updated_at` (timestamps).

### B. `menu_items` Table
Stores products offered by the cafe.
- `id` (uuid, primary key).
- `cafe_id` (uuid, foreign key to `cafes.id`).
- `name` (text): Product name.
- `price` (numeric): Product price in INR.
- `category` (text): Used for grouping (defaults to "General").
- `is_available` (boolean): Merchant toggle to hide/show items from the customer menu.

### C. `orders` Table
Stores live and past customer orders.
- `id` (uuid, primary key).
- `cafe_id` (uuid, foreign key to `cafes.id`).
- `table_number` (text): The identifier provided by the customer or extracted from the QR URL (e.g., "4", "0" for counter, or a customer name for takeaway).
- `total_amount` (numeric): Computed total of the order.
- `cart_items` (jsonb): A snapshot array of the items ordered (id, name, price, quantity) to prevent historical data mutation if menu items change.
- `order_status` (text/enum): `pending`, `preparing`, `done`, `cancelled`.

---

## 4. Application Routing & Component Breakdown

The App Router (`app/`) separates the application into a Merchant-facing portal and a Customer-facing storefront.

### 4.1 Merchant Flow (`app/(merchant)`)

#### Authentication (`app/(merchant)/login/page.tsx`)
- Handles merchant login using Supabase's `signInWithPassword`.
- On successful authentication, verifies if the user has an existing entry in the `cafes` table. If yes, redirects to `/dashboard`; if not, redirects to `/setup`.

#### Onboarding Wizard (`app/(merchant)/setup/page.tsx`)
A 4-step wizard for new merchants:
- **Step 1:** Select seating type (Tables vs. Takeaway/Standing).
- **Step 2:** Input table count (if seating was chosen).
- **Step 3:** Enter Business Details (Business Name, UPI ID). Validation ensures the business name is >= 2 chars and UPI ID contains an `@`.
- **Step 4:** Add Initial Menu Items. Merchants can manually add items (Name, Price). There is a placeholder UI for a future "AI Menu Upload" feature.
- **State Management:** Handled via a single React state object (`WizardState`).
- **Database Write:** Uses `supabase.from("cafes").upsert()` to link the auth user to the cafe profile.

#### Merchant Dashboard (`app/(merchant)/dashboard/page.tsx`)
The core operational hub for the merchant, featuring a 42KB+ client component.
- **Data Fetching:** On mount, fetches cafe details, menu items, and the last 30 orders.
- **Real-time Subscriptions:** Subscribes to the Supabase channel `orders:cafe_id=eq.[id]`. Listens for `INSERT` (new orders) and `UPDATE` (status changes).
- **Audio Alerts (`useAudioAlert` hook):** 
  - Overcomes browser autoplay policies by requiring a user gesture ("Enable Alerts" banner).
  - Plays a `bell.mp3` sound whenever an `INSERT` event is received via Realtime.
- **QR Code Generator:**
  - An accordion UI that allows the merchant to select a specific station/table.
  - Generates an SVG QR code pointing to `https://[domain]/[cafeId]?table=[number]`.
  - Includes features to Print Single, Print All (batch), or Download the SVG.
- **Order Management (Orders Tab):**
  - **Pending (Incoming):** Displayed as high-visibility Yellow tickets. Merchants click "Accept & Cook" to move them to `preparing`.
  - **Preparing (Cooking):** Displayed as standard cards. Merchants click "Mark as Done" to move them to `done`.
  - **Done:** Historical list for the day.
- **Menu Management (Menu Tab):**
  - Lists all items.
  - Inline toggle (`ToggleSwitch`) updates the `is_available` boolean in Supabase instantly.
  - Floating Action Button (FAB) opens a modal to add new items.
- **Print Optimization:** Extensive use of `@media print` and Tailwind's `print:hidden` utility ensures only relevant data (like receipts or QRs) is printed while the navigation and dashboard UI are hidden.

---

### 4.2 Customer Flow (`app/[cafeId]`)

#### Server Setup (`app/[cafeId]/page.tsx`)
- Server Component that parses the URL parameter `cafeId`.
- Fetches the specific cafe profile and only the available (`is_available = true`) menu items.
- Passes the data to the `MenuClient` component. If the URL contains a `?table=` search parameter, it passes that to the client.

#### Storefront & Checkout (`app/[cafeId]/MenuClient.tsx`)
A massive client component handling the entire customer journey.
- **State Management:** Uses a `useReducer` for complex cart operations (`ADD`, `REMOVE`, `CLEAR`, `INIT`).
- **Local Storage:** Caches the cart state in the browser (`quickorder:cart:[cafeId]`) so users don't lose their cart if they accidentally refresh.
- **Menu Listing:** Renders `MenuItemRow` for each item. When an item is added, a counter replaces the "Add" button, allowing incrementing/decrementing.
- **Checkout Bottom Sheet:**
  - Slides up when the floating "View Cart" FAB is clicked.
  - Displays the order summary and total.
  - Prompts for an identifier. If the QR code contained a `?table=` param, this input is pre-filled and disabled. Otherwise, prompts for "Your Name" (takeaway) or "Table Number" (manual entry).
- **Payment & UPI Deep Linking:**
  - On "Pay", inserts the order into the Supabase `orders` table with status `pending`.
  - Constructs a UPI Intent URI following NPCI specifications, specifically forcing merchant-level tracking to ensure the amount is pre-filled:
    ```javascript
    upi://pay?pa=[UPI_ID]&pn=[BusinessName]&tr=[SupabaseOrderID]&mc=5812&am=[TotalAmount]&cu=INR&tn=[OrderMetadata]
    ```
  - **Parameter Breakdown:** The inclusion of `tr` (Transaction Reference / Order ID) and `mc=5812` (Merchant Category Code for Restaurants) is crucial. Without these, apps like Google Pay and PhonePe often strip the `am` (amount) parameter if the destination is a personal VPA to prevent fraud. Supplying these parameters forces the app to treat it as a legitimate business transaction.
  - Redirects the browser to this URI, triggering the native UPI app to open automatically.
- **Order History & Real-time Tracking:**
  - Once an order is placed, the order ID is saved to local storage (`quickorder:orders:[cafeId]`).
  - Subscribes to Supabase Realtime *only for those specific order IDs* to track when the merchant moves the order from `pending` -> `preparing` -> `done`.
  - Displays an "Active Orders Placed" banner at the top of the menu if there are pending orders.
  - Clicking the banner opens the Order History bottom sheet, containing `InvoiceReceipt` components detailing the order ID, timestamps, status, and items.
  - Customers can click "Print Receipt" to print their specific order invoice.

#### Mock Preview (`app/preview-menu/page.tsx`)
- A development-only route containing hardcoded `MOCK_CAFE` and `MOCK_ITEMS` data.
- Directly renders `MenuClient` to allow developers to style and test the UI without requiring database connectivity or auth tokens.

---

## 5. Security & Deployment Configurations

### Supabase Security
- Utilizes Row Level Security (RLS) on Supabase (though the SQL implementation details reside in `supabase/migrations/`).
- The Merchant dashboard queries are strictly filtered by `cafe_id = user.id`.
- The Customer menu strictly queries `is_available = true` items.

### Cloudflare Pages Deployment
- Handled via `wrangler.jsonc` configuration file.
- Uses the `@cloudflare/next-on-pages` adapter to compile the Next.js App Router into Cloudflare Workers format.
- Edge runtime compatibility is maintained across all server components.

---

## 6. Project Setup & Package details
- **Next.js Version:** 14/15 (App Router).
- **Tailwind Config:** Includes custom color variables in `globals.css` mapped to Tailwind classes (`bg-accent`, `bg-warning`, `text-danger`, etc.).
- **Typography:** Relies on utility classes to apply specific font families (e.g., `font-display` for headings, `font-mono` for pricing/receipts, `font-sans` for body).
