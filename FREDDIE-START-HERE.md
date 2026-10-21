# Freddie: getting started on the podcast site

This is the new Generic Foiling Podcast website. You'll work on it on your Mac with
**Claude Code**, an AI assistant that runs in the Terminal. You tell it what you want
in plain English ("make the episode cards bigger", "add Liam's new bio") and it edits
the files for you.

Setup takes about 20 minutes and you only do it once.

---

## 1. Make a GitHub account (5 min)

GitHub is where the site's files live online. It keeps every version, so nothing
you do can't be undone.

1. Go to **https://github.com/signup**.
2. Enter your email, choose a password and pick a **username** (anything you like,
   e.g. `freddie-gfp`). Choose the **Free** plan if asked.
3. GitHub emails you a code. Type it in to confirm your email.
4. GitHub may ask you to turn on **two-factor authentication** (a second check when
   you log in). The easiest option is a **passkey**, which uses your Mac's Touch ID
   or your iPhone. Otherwise use an authenticator app. Save the recovery codes it
   gives you somewhere safe, for example in Notes or a password manager.
5. **Send Ben your GitHub username.** He'll invite you to the project.
6. You'll get an email from GitHub: "benfgillespie invited you to
   benfgillespie/freddie". Click **View invitation**, then **Accept invitation**.
   (The invite expires after 7 days. If you miss it, ask Ben to send it again.)

You don't need to learn GitHub itself. Claude handles all of it for you later.

## 2. Get a Claude account

Claude Code needs a paid Claude plan (Pro or Max) or an Anthropic API account.
Sign up at **https://claude.ai** if you don't already have one.

## 3. Install Claude Code (2 min)

1. Open **Terminal**: press `⌘ Space`, type `Terminal`, press Enter.
2. Paste this line and press Enter:

   ```
   curl -fsSL https://claude.ai/install.sh | bash
   ```

3. When it finishes, **close Terminal and open it again.**
4. Type `claude` and press Enter. A browser window opens. Log in with your Claude account.

## 4. Let Claude set up the rest

Still in Terminal, with Claude running, paste this whole message:

> Please set me up to work on the Generic Foiling Podcast website. I'm on a Mac and
> I'm not a developer, so explain each step simply. I need you to:
> 1. Install Homebrew, Git, the GitHub CLI (`gh`) and Node.js if I don't have them.
> 2. Help me log in to GitHub with `gh auth login` (I'll do the browser part).
> 3. Clone `benfgillespie/freddie` into a folder called "Generic Foiling Podcast" in my
>    Documents folder.
> 4. Run `npm install` there and start the site with `npm run dev`, then open it in my
>    browser.

Claude will ask permission before running commands. Read what it says, and say yes.
Some steps ask for your Mac password. Type it even though nothing appears on screen
as you type.

When it's done, you'll see the site at **http://localhost:3000**. Only you can see
this copy. It runs on your Mac.

---

## Day to day

Each time you want to work on the site:

1. Open Terminal.
2. Type `cd ~/Documents/"Generic Foiling Podcast"` and press Enter.
3. Type `claude` and press Enter.
4. Ask for what you want, for example:
   - "Start the site and open it in my browser"
   - "Change the homepage headline to …"
   - "Swap Liam's photo for the one in my Downloads folder called liam.jpg"
   - "The shop page looks squashed on my phone. Fix it"
5. Refresh the browser to see the changes.

**Saving your work to GitHub.** When you're happy with something, say:
> "Commit and push my changes to GitHub"

This backs it up and lets Ben see it. Do this at the end of every session.

**Getting Ben's changes.** If Ben has changed something, say:
> "Pull the latest changes from GitHub"

**Putting it online.** Push your changes, then message Ben. He'll publish it to a web
address you can open on your phone or send to Liam.

## Useful to know

- **Undo:** "Undo that last change" or "Go back to how it was this morning" both work.
  Git keeps the full history.
- **Stuck?** Tell Claude exactly what you see, including any error text. Or
  paste a screenshot: drag the image into the Terminal window.
- **Stop the site:** press `Ctrl C` in the Terminal tab where it's running.
- **Leave Claude:** type `/exit`.
- `CLAUDE.md` in the project folder tells Claude about this site. You don't need to
  read it.
