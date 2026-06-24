# 📱 HabitFlow — Complete Setup Guide
## Daily Habit Tracker with Supabase Backend

---

## 🗂️ PROJECT STRUCTURE

```
HabitTracker/
├── app/
│   ├── _layout.tsx              ← Root layout (wraps everything in Auth)
│   ├── index.tsx                ← Entry point (redirects based on login status)
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Auth stack navigator
│   │   ├── login.tsx            ← Login screen
│   │   └── register.tsx         ← Register screen
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← Bottom tab navigator
│   │   ├── today.tsx            ← Today's habits dashboard
│   │   ├── stats.tsx            ← Weekly statistics
│   │   └── profile.tsx          ← User profile
│   ├── add-habit.tsx            ← Add habit modal
│   ├── report.tsx               ← PDF report generator
│   └── habit/
│       └── [id].tsx             ← Habit detail modal
├── contexts/
│   └── AuthContext.tsx          ← Global auth state
├── lib/
│   └── supabase.ts              ← Supabase client
├── constants/
│   └── theme.ts                 ← Colors, spacing, font sizes
├── supabase-schema.sql          ← Database schema (run this in Supabase)
├── package.json
├── app.json
└── babel.config.js
```

---

## ✅ PRE-REQUISITES

Before starting, make sure you have these installed on your computer:

### 1. Node.js (version 18 or higher)
- Download from: https://nodejs.org/
- After installing, open a terminal and verify:
  ```
  node --version    ← should show v18.x.x or higher
  npm --version     ← should show 9.x.x or higher
  ```

### 2. Expo CLI
- This is the tool that runs your React Native app
- Install it globally by running in your terminal:
  ```
  npm install -g expo-cli
  ```

### 3. Expo Go app on your phone
- **Android:** Search "Expo Go" in Google Play Store → Install
- **iPhone:** Search "Expo Go" in App Store → Install
- This lets you preview the app live on your real phone without needing Xcode or Android Studio!

### 4. A code editor (optional but recommended)
- Download VS Code from: https://code.visualstudio.com/

---

## 🗄️ STEP 1 — Set Up Supabase Database

Supabase is the backend that stores all your habits and user data. Follow these steps carefully.

### 1A — Get Your Anon API Key

The key you provided (`sb_publishable_...`) is a publishable key, but Supabase requires a **JWT anon key** to work with its JavaScript client. Here's how to get it:

1. Go to: **https://supabase.com/dashboard/project/uabgopxjgvtxbyipregm/settings/api**
2. Log in to Supabase if needed
3. Look for the section called **"Project API Keys"**
4. Find the row labeled **"anon" (public)**
5. Click **"Reveal"** if it's hidden
6. Copy the entire long key that starts with **`eyJ...`**
7. Keep this somewhere safe — you'll need it in Step 3

The key looks like this example (yours will be different):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
```

### 1B — Run the Database Schema

This creates all the tables, security rules, and indexes your app needs.

1. Go to: **https://supabase.com/dashboard/project/uabgopxjgvtxbyipregm/sql/new**
2. You'll see a SQL editor with a blank text area
3. Open the file **`supabase-schema.sql`** from the project folder
4. Copy ALL the contents of that file
5. Paste everything into the Supabase SQL editor text area
6. Click the green **"Run"** button (or press Ctrl+Enter)
7. You should see a success message at the bottom like **"Success. No rows returned"**

This creates 3 tables:
- **profiles** — stores user names and emails
- **habits** — stores each habit (name, icon, color, schedule)
- **habit_logs** — records every time a habit is marked complete

### 1C — Enable Email Auth (verify this is already on)

1. Go to: **https://supabase.com/dashboard/project/uabgopxjgvtxbyipregm/auth/providers**
2. Find **"Email"** provider — make sure it's toggled ON (green)
3. Optionally: turn OFF **"Confirm email"** if you want instant login without email verification during development

---

## 📁 STEP 2 — Copy Project Files

Move the entire `HabitTracker` folder to where you keep your coding projects. For example:
- Mac/Linux: `/Users/yourname/projects/HabitTracker`
- Windows: `C:\Users\yourname\projects\HabitTracker`

---

## 🔑 STEP 3 — Insert Your Supabase Anon Key

1. Open the file: `HabitTracker/lib/supabase.ts`
2. Find this line near the top:
   ```
   const supabaseAnonKey = 'PASTE_YOUR_ANON_KEY_HERE';
   ```
3. Replace `PASTE_YOUR_ANON_KEY_HERE` with the real key from Step 1A
4. It should look like:
   ```
   const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...';
   ```
5. Save the file

---

## 📦 STEP 4 — Install Dependencies

This downloads all the JavaScript packages the app needs to run.

### Open a Terminal in the Project Folder

- **Mac:** Open Terminal, then type `cd ` (with a space after), then drag the `HabitTracker` folder onto the terminal window, then press Enter
- **Windows:** Open the `HabitTracker` folder in File Explorer, right-click in empty space, select "Open in Terminal"
- **VS Code:** File → Open Folder → select HabitTracker → then open the integrated terminal with Ctrl+` 

### Run This Command

```bash
npm install
```

⏳ This will take 1–3 minutes. You'll see lots of text scrolling — that's normal. When it's done you'll see your cursor blinking again and a folder called `node_modules` will appear.

**If you see errors about peer dependencies**, run this instead:
```bash
npm install --legacy-peer-deps
```

---

## 🚀 STEP 5 — Start the App

In the same terminal, run:

```bash
npx expo start
```

After a few seconds you'll see a big **QR code** in your terminal, and text saying "Metro waiting on exp://..."

---

## 📲 STEP 6 — Open on Your Phone

### Android:
1. Open the **Expo Go** app on your phone
2. Tap **"Scan QR Code"**
3. Point your phone camera at the QR code in the terminal
4. The app will load in about 30–60 seconds on first run

### iPhone:
1. Open your phone's built-in **Camera app** (not Expo Go directly)
2. Point it at the QR code — a banner will appear at the top of your screen
3. Tap that banner — it will open in Expo Go
4. The app loads in 30–60 seconds

> 💡 **Your phone and computer must be on the same WiFi network!**

---

## 🧪 STEP 7 — Test the App

Once the app is running:

1. **Register an account:**
   - Tap "Create one" on the login screen
   - Enter your name, email, and a password (min 6 characters)
   - Tap "Create Account"

2. **If email confirmation is required:**
   - Check your inbox for a confirmation email from Supabase
   - Click the confirmation link
   - Come back and log in

3. **Add your first habit:**
   - You'll land on the Today screen
   - Tap the blue "+ Add" button (top right)
   - Give it a name like "Morning Run"
   - Pick an icon and color
   - Choose frequency (Every day, Weekdays, etc.)
   - Tap "Save"

4. **Mark a habit complete:**
   - Tap the circle checkbox next to a habit
   - It turns green with a checkmark ✓
   - The progress bar updates instantly

5. **View stats:**
   - Tap "Stats" in the bottom tab bar
   - See bar charts for the week
   - Navigate previous weeks with ‹ ›

6. **Generate a PDF report:**
   - Tap "Stats" → scroll down → "Generate Activity Report"
   - OR tap "Profile" → "Generate Report"
   - Choose a time period, tap "Download PDF Report"
   - A share dialog will appear — save or share it

---

## 🔧 COMMON ERRORS & FIXES

### ❌ "Unable to resolve module" or module not found
**Fix:** Dependencies didn't install properly. Run:
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### ❌ App shows blank screen / crashes on launch
**Fix:** The Supabase anon key is wrong or missing. Double-check `lib/supabase.ts` — make sure the key starts with `eyJ` and has no extra spaces.

### ❌ "Network request failed" when logging in
**Possible causes:**
1. Your anon key is wrong (see above)
2. The database tables don't exist — re-run the SQL schema
3. RLS policies blocking access — make sure you ran the full SQL file

### ❌ Login says "Email not confirmed"
**Fix:** Go to Supabase → Authentication → Providers → Email → toggle OFF "Confirm email" for development. Or check your inbox and click the confirmation link.

### ❌ QR code won't scan / "Could not connect to development server"
**Fix:** Make sure your phone and computer are on the same WiFi. If still failing, in the terminal press `w` to open in web browser to test there first.

### ❌ expo-print or expo-sharing errors
**Fix:** These are native modules. Make sure you run `npm install` fresh. If using a simulator, PDF sharing may not work — test on a real device.

### ❌ "TypeError: Cannot read properties of null"
**Fix:** This usually means the Supabase tables don't exist yet. Re-run the SQL schema in Step 1B.

---

## 📋 COMMANDS REFERENCE

| Command | Where to run | What it does |
|---------|-------------|--------------|
| `npm install` | Inside HabitTracker folder | Installs all dependencies |
| `npx expo start` | Inside HabitTracker folder | Starts the dev server + QR code |
| `npx expo start --clear` | Inside HabitTracker folder | Clears cache and starts fresh |
| Press `r` in terminal | After `expo start` | Reloads the app |
| Press `a` in terminal | After `expo start` | Opens on Android emulator |
| Press `i` in terminal | After `expo start` | Opens on iOS simulator |

---

## 🌟 FEATURES SUMMARY

| Feature | Location | Description |
|---------|----------|-------------|
| Login | `(auth)/login.tsx` | Email + password authentication |
| Register | `(auth)/register.tsx` | New account creation |
| Today's Habits | `(tabs)/today.tsx` | See all habits, mark complete, progress bar |
| Add Habit | `add-habit.tsx` | Pick name, icon, color, schedule |
| Habit Detail | `habit/[id].tsx` | 30-day heatmap, streak, logs |
| Weekly Stats | `(tabs)/stats.tsx` | Bar chart, per-habit breakdown, completion % |
| Profile | `(tabs)/profile.tsx` | Edit name, view totals, sign out |
| PDF Report | `report.tsx` | Generates + shares verified PDF activity log |

---

## 📱 NAVIGATION FLOW

```
App Launch
    │
    ├── Not logged in → Login Screen → Register Screen
    │
    └── Logged in → Bottom Tabs
              ├── Today (default)
              │     ├── Tap "+ Add" → Add Habit Modal
              │     └── Tap habit row "›" → Habit Detail Modal
              ├── Stats
              │     └── Tap "Generate Report" → Report Modal
              └── Profile
                    └── Tap "Generate Report" → Report Modal
```

---

## 🏗️ TECH STACK

| Technology | Version | Purpose |
|-----------|---------|---------|
| Expo SDK | 51 (compatible with SDK 54 features) | Mobile app framework |
| Expo Router | 3.5.x | File-based navigation |
| React Native | 0.74.x | UI rendering |
| Supabase JS | 2.44.x | Backend: auth + database |
| expo-print | 12.8.x | Generate PDF files |
| expo-sharing | 12.0.x | Share PDF via native share sheet |
| date-fns | 3.x | Date formatting and calculations |
| AsyncStorage | 1.23.x | Persist auth session on device |

---

## 💡 TIPS

- **Long-press any habit** on the Today screen to delete it
- **Pull down** on the Today screen to refresh habits
- **Tap your name** on the Profile screen to edit it inline
- **Navigate weeks** on the Stats screen using ‹ › arrows
- **Tap "›"** on any habit to see its 30-day heatmap and log history
- The PDF report includes a **unique Report ID** for verification

---

*Built with ❤️ using React Native, Expo Router, and Supabase*
