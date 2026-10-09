# Amania

Amania is a local-first Expo / React Native app for MSRIT students. Profiles and credentials are stored on-device for this hackathon demo; passwords use Android SecureStore. This is not a shared authentication system or a security boundary for production.

## Requirements

- Node.js 20.19 or newer
- Android Studio, Android Platform Tools, and a USB-connected Samsung phone for a standalone APK
- A Google AI Studio API key for poster scanning and the event note

## Install the app dependencies

From the project root:

```sh
npm install
```

## Configure and run the scan server

The API key stays on the server. Do not put it in an `EXPO_PUBLIC_` variable or the app bundle.

```sh
cp server/final_env.example server/.env
```

Edit `server/.env` and set `GEMINI_API_KEY` to your Google AI Studio key. Then install the server package and start it:

```sh
npm --prefix server install
npm run scan-server
```

The server listens on port `8787`. `GET http://127.0.0.1:8787/health` should return `{ "ok": true, ... }`. If the app reports that `GEMINI_API_KEY` is missing, add the key to `server/.env` and restart the server.

Poster extraction calls `gemini-3.1-flash-lite` with a JSON schema. Event notes, club chat (`POST /api/club-chat`), and AI club-description drafts (`POST /api/club-description`) call `gemma-4-26b-a4b-it`. The club guide receives the current club information saved on this phone with each question, so local edits are reflected. It has no vector database or training step and is instructed to use only those facts. The API key stays on the server; quota and connectivity errors are shown in the app.

Club social URLs are centralized in `data/final_clubConfig.ts`. Inara and DebSoc WhatsApp invites use the values from the original supplied Campus Hub source; CodeRIT has no invite yet, so its button shows the requested unavailable message. Replace a URL in that config when an invite changes. Club-page edits made in the app are stored locally and take precedence on that device.

## Build and install Amania on a Samsung phone over USB

1. Enable Developer options and USB debugging on the phone, connect its USB cable, and accept the debugging prompt. Install Android Studio and Android Platform Tools on the computer.
2. Confirm that ADB sees the Samsung:

   ```sh
   adb devices
   ```

3. Start the scan server from the project root (after configuring its API key above):

   ```sh
   npm run scan-server
   ```

4. In another terminal, use Android Studio's bundled Java runtime, forward the scan server over USB, and build/install the release app:

   ```sh
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export ANDROID_SDK_ROOT="$ANDROID_HOME"
   export JAVA_TOOL_OPTIONS="--enable-native-access=ALL-UNNAMED"
   adb reverse tcp:8787 tcp:8787
   npm run build:android:release
   ```

The release APK is installed as the separate **Amania** app; Expo Go is not used. Later builds can update it with `adb install -r android/app/build/outputs/apk/release/app-release.apk`. Keep the scan server running and the USB reverse rule active while scanning posters.

## Test Phase 1 and Clubs on the phone

- **Profiles:** on first launch, enter USN, a unique username, password, and email, then choose Student, App owner, or Admin. `1MS26IS160` is configured for initial owner access. Other owner/admin requests start as Student. Email-based password recovery currently checks the saved email locally; it does not send a verification email.
- **Access requests:** sign in as the owner and open **Access** beside **Publish**. Allow or deny each request after confirming. Admins choose Inara, CodeRIT, or DebSoc and can edit only the approved club. Requests are stored locally on this device; cross-phone approval and globally unique accounts need a hosted backend.
- **Owner preview:** only the owner account sees the role dropdown. The owner can preview Student/Admin/Owner UI locally. Other users can sign out from their username chip.
- **Explore:** starts on the home feed; the green Today card only shows events dated today. Swipe the card or use its arrows when there are multiple events.
- **Publish:** sign in as an approved Owner or Admin, tap **Publish**, choose a real poster, scan it, edit every extracted field, review the poster and Gemma note, then publish. The event appears immediately in Explore and Calendar.
- **Calendar:** switch Month, Week, and Day views; use arrows and tap the month/year to choose dates from 2020–2030. Tap an event for its detail sheet.
- **Favorites and reminders:** favorite an upcoming event from its detail sheet. Allow notifications to schedule reminders one day and one hour before it starts. Unfavorite it to cancel both reminders.
- **My Space:** choose an avatar, see only active favorites in the mini calendar and list, add/delete notes, and open ended favorites from **View past favorited events**.
- **Permissions preview:** Admin can delete their own published events; Owner can edit or delete any event. This is local demo logic only.
- **Persistence:** close and reopen the app; events, favorites, notes, and avatar should remain.
- **Navigation:** the bottom tabs are My Space, Explore, Trade, and Clubs. Open Calendar from Explore or My Space. Press Android Back from a club detail to return to the Clubs list. From Explore, press Back twice to exit.
- **Trade:** browse skill profiles, pass or like, see mutual matches, and use the capped chat. Goods listings are available from the Goods market.
- **WhatsApp:** Inara and DebSoc open their invite pages for WhatsApp’s confirmation. CodeRIT shows “WhatsApp link not available yet. Sorry!”; tap **Return** to stay on that club detail.
- **Club guide:** start the scan server, ask which clubs are open to all branches, then ask a follow-up such as “What achievements do they have?” Ask about an unlisted fact such as membership fees; it should say it does not know and point you to the club contact. The guide needs a working `GEMINI_API_KEY` and internet access.
- **Club editing:** sign in as an approved admin for a club, open that club, and tap **Edit page**. Change a description, contact, achievement, or URL and save; pull to refresh or leave and reopen the page to see it persisted. Owner can edit any club. Use **AI draft description** with the server running to fill the two description fields.
- **Club permissions:** role switching and saved edits are local demo behavior. Real club-admin permissions and updates shared across phones need authentication and a shared backend.

## Optional cloud APK build

Install EAS CLI or run it through `npx`, sign in to an Expo account, then build the internal APK profile:

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

When the build finishes, download the APK from the EAS build page and install it on the Samsung phone. With USB debugging enabled, run `adb install -r path/to/amania.apk`. Keep the scan server running and forward it with `adb reverse tcp:8787 tcp:8787` while using the APK. For a phone on Wi-Fi instead, configure `EXPO_PUBLIC_SCAN_SERVER_URL` to the computer's reachable LAN URL before creating the APK.

## TypeScript check

```sh
npm run typecheck
```

## Lint

```sh
npm run lint
```

## Trade module (offline-first demo)

The Trade tab uses `TradeRepository`, an app-facing contract in `services/tradeTypes.ts`. `TradeRepositoryProvider` injects the repository; the default `MockTradeRepository` persists the embedded MSRIT demo profiles, mutual likes, capped messages, and goods listings in AsyncStorage. A production integration can provide an adapter for Supabase, Firebase, or SQLite without changing the screen.

Trade demo flow:

1. Open **Trade → Skill exchange** and swipe right on Rohan (the mock dataset includes his incoming like) to trigger a mutual match.
2. Open the match to generate the first Gemma 4 icebreaker, then send up to eight student messages. At the cap, tap the banner to copy the demo WhatsApp number.
3. Open **Goods market** to filter the 2-column listings, or post a new item with a photo, AI review, generated description, and an MRP-based price suggestion.

The Trade AI routes are `/api/trade/icebreaker`, `/api/trade/goods-check`, and `/api/trade/goods-description`. They use the server-only `GEMINI_API_KEY`. If the server is unreachable or the key is not configured, the demo uses clearly labeled local fallback copy and a title/category-only simulated goods review; quota and other model errors remain visible. Local demo data and listing persistence do not require a backend.

## Project layout

- `final_App.tsx` — application shell, role preview, tabs, and Android back behavior
- `screens/` — Explore, Calendar, My Space, and Publish screens
- `screens/final_ClubsScreen.tsx` and `screens/final_TradeScreen.tsx` — Clubs, club details/editor, and skill/goods exchange UI
- `services/tradeTypes.ts`, `services/TradeRepositoryProvider.tsx`, and `services/mockTradeRepository.ts` — database-agnostic Trade models, repository injection, and offline demo storage
- `services/tradeAiService.ts` — secure-server AI client with local demo fallbacks
- `components/` — reusable UI, event details, and the club chatbot
- `data/final_clubConfig.ts` and `data/final_ClubProvider.tsx` — club records, link configuration, and on-device edits
- `data/` — event types, AsyncStorage, notifications, API client, and event state
- `server/` — Node scan server and local Gemini calls
- `final_README.md` — this setup and testing guide
