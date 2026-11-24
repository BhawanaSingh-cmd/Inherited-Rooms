# Room III (the archive): going live with Supabase

Until you do this, the archive runs in **demo mode**: it shows sample notes and saves new ones only in the visitor's own browser. Everything else works.

## 1. Make the Supabase project (about 3 minutes)
1. Go to supabase.com, sign up (free) and click **New project**.
2. Give it a name (for example `inherited-rooms`), set a database password (keep it somewhere safe), pick the region closest to you (Mumbai), and create it.

## 2. Create the table and the word filter
1. Open `setup.sql` from this folder in any text editor.
2. Near the top, replace `you@example.com` with **your own email**. This is the only email allowed to approve or delete notes.
3. In Supabase, go to **SQL Editor → New query**, paste the whole file and press **Run**. It should finish with "Success. No rows returned".

## 3. Make your review login
1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Use the **same email** as in step 2, choose a password, and tick **Auto Confirm User**.
3. Go to **Authentication → Sign In / Providers** (or **Settings**) and turn **off "Allow new users to sign up"**, so nobody else can create an account.

## 4. Connect the pages
1. In Supabase, go to **Project Settings → API** (or **Data API**). Copy the **Project URL** and the **anon public** key.
2. Open `index.html` and `admin.html`. Near the top of the script in each, fill in:
   ```
   var SUPABASE_URL='https://xxxx.supabase.co';
   var SUPABASE_KEY='eyJ...';
   ```
   The anon key is meant to be public. The database rules in `setup.sql` decide what visitors can and cannot do.
3. Upload the folder to GitHub Pages along with the rest of the exhibition.

## How moderation works
- Every note goes through the word filter **inside Supabase**, so it can't be bypassed from the browser.
- Clean notes appear on the wall straight away.
- Notes with abuse (English, Hindi or Hinglish), or with links, are **held**. The visitor sees "your note will appear once it has been checked".
- Open `archive/admin.html`, log in, and you'll see a red counter for notes **waiting for review**, with **Approve** and **Delete** buttons. The **On the wall** tab lets you delete anything later too.
- The filter catches swearing and slurs, not meanness. It may occasionally hold an innocent note; that's why held notes wait for you instead of being deleted.

## Optional: email alerts
Supabase can email you whenever a note is held (Database → Webhooks → on insert into `notes` → an Edge Function that sends mail). This needs an email service such as Resend. Ask if you want this set up.
