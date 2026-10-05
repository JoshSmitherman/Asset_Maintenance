# Changelog

Every change people using the tracker will notice, newest first. The same
notes appear in the app (click the version next to the title) and on each
[GitHub Release](https://github.com/JoshSmitherman/Asset_Maintenance/releases).

<!-- Generated from src/lib/releaseNotes.js by `npm run changelog`.
     Edit that file, not this one; a test fails if they drift apart. -->

## [2.7.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.7.0) - 2026-10-05

_Favourite Reports_

### Reports

**Favourites**

- **Added:** Star a report to make it a favourite. Its star turns gold, and it is listed under **Favourites** at the top of the Reports menu
- **Added:** Reports opens on your first favourite, so the one you use most is waiting for you
- **Added:** Every report has a star beside its title too, which is how to star one on a phone
- **Added:** Favourites are kept for each person on this computer, so a shared PC keeps everyone's separate

## [2.6.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.6.0) - 2026-10-05

_Dashboard Cards & Purchases_

### Dashboard

**Cards**

- **Changed:** The cards are in two labelled rows. **Assets**: total value, total assets, laptops, desktops, monitors, and peripherals and other kit, each with what it is worth. **Cleaning**: overdue, due soon, never cleaned and OK, each with its share of the rota
- **Added:** Clicking a kit card opens the register showing just that kind of kit

**Charts**

- **Added:** **Bought in the last 12 months**: a bar for each month. Point at a month for how many were bought and what they cost
- **Fixed:** In dark mode the navy bars were hard to see against the background

### Assets

**Asset Register**

- **Added:** The Device type filter has **Peripherals & other**: everything that is not a laptop, desktop or monitor

### Reports

**Assets**

- **Added:** **Spend** report, by month or by year. By month shows how many were bought, the spend, and what was bought

## [2.5.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.5.0) - 2026-10-05

_Repairs, Files & Retiring Kit_

### Assets

**Repairs**

- **Added:** A **Repairs** tab on every asset. Log an in-house fix: what was wrong, the date, who fixed it and each part replaced with its cost. The total adds itself up
- **Added:** **Fixed by** starts as whoever is logging the repair, and can be changed to anyone on the team
- **Added:** Receipts and photos can be attached to each repair

**Files**

- **Added:** A **Files** tab on every asset for the purchase invoice, warranty papers and photos. Photos and PDFs up to 10 MB each
- **Added:** Files are private: they only open for people signed in to the tracker, even if someone has the link

**Retiring Kit**

- **Added:** **Retire** takes kit at the end of its life out of the register, the cleaning queue and the dashboard, but keeps its record, repairs and files
- **Added:** Retiring records the date, the reason, and whether the data was wiped and by whom
- **Added:** A folded **Retired** list at the bottom of the Assets page. Tick several assets to retire them together
- **Changed:** Only admins can **Delete** an asset or a repair, or **Restore** retired kit. Everyone else retires kit instead, which can be undone

### Reports

**New Reports**

- **Added:** **By person**: everything one person holds, with its value, cleaning state and repairs. Or everyone, a line each
- **Added:** **Repairs**: every repair, or totalled by asset, by part or by the person who fixed it
- **Added:** **Retired kit**: what was retired, when, why, and whether its data was wiped

## [2.4.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.4.0) - 2026-10-05

_NFC Tag Links_

### Assets

**Asset Details**

- **Added:** Every asset has its own **Tag link**, shown in its details with a **Copy link** button. Write it onto an NFC tag or a QR code stuck on the device
- **Added:** Tapping the tag with a phone opens the tracker straight to that asset's details, after signing in if needed

### General

**Layout**

- **Fixed:** On a phone the light and dark mode button sat on top of a window's buttons, such as Delete asset. It now hides while a window is open

## [2.3.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.3.0) - 2026-10-05

_Page-By-Page Improvements_

### Dashboard

**Needs Attention**

- **Added:** **Open cleaning queue** button, straight to the machines that need doing
- **Fixed:** On a phone the list squeezed names and types until words split in half; it now drops the less important columns instead

### Assets

**Asset Register**

- **Changed:** The register is listed in asset reference order, rather than by a clean date it does not show

**Asset Details**

- **Added:** **Record clean** button for laptops and desktops, so a clean can be logged without leaving the asset

### Cleaning

**Cleaning Queue**

- **Added:** **Needs attention** and **All laptops and desktops** switch. The queue now opens on what needs doing
- **Removed:** The red "Never cleaned" in the date column, which repeated the status badge beside it

**Record Clean**

- **Fixed:** The date started on the last clean rather than today, so saving straight away recorded nothing new. It now starts on today, with the last clean shown underneath
- **Changed:** Cleaned by starts empty, so a clean is not credited to whoever did the previous one

**Cleaning History**

- **Added:** Device type, and who recorded each clean and when

### General

**Header**

- **Changed:** Change password, your email and Sign out now live in one **account menu**: click the badge with your initials at the top right. It also shows your name and whether you are an Admin or a User

**Layout**

- **Fixed:** The light and dark mode button no longer covers buttons at the bottom of a page
- **Fixed:** On a phone the Admin tab ran off the edge of the screen
- **Changed:** The sign-in page now says to ask an admin for an account or a new password

## [2.2.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.2.0) - 2026-10-05

_Reports Reorganised_

### Reports

**Reports**

- **Changed:** Reports are grouped into **Assets**, **Cleaning** and **Full exports**, picked from a menu down the side with a line on what each shows
- **Changed:** Assets by department, by device type and by location are now one report, **Assets by group**, with a switch between them
- **Changed:** Cleans by month and by person are now one report, **Cleaning activity**, with a switch between them

### General

**Appearance**

- **Fixed:** In light mode, status badges and error messages had lost their coloured borders

## [2.1.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.1.0) - 2026-10-05

_Dark Mode, Asset History, Admin & Spec Memory_

### Assets

**Asset Details**

- **Added:** A **History** tab on every asset: a bar showing who has had it and for how long, above a timeline of every move, department or location change, clean and its purchase

**Add Asset**

- **Added:** **Next: Specification** button walks a new asset from Details to the Specification tab, which was easy to miss
- **Added:** **Copy specs from a model you already have**: pick a model already on the register and its specification fills in. Pick another to switch, **Undo** to go back, **Clear specs** to start again
- **Added:** Typing a brand and model that is already on the register offers to fill just the empty boxes
- **Added:** A model name that nearly matches one already recorded asks **Did you mean…?**, so a typo does not start a second entry for the same machine
- **Changed:** Laptops now default to a 12-month cleaning interval; everything else stays at 6 months
- **Changed:** The Model list only offers models of the brand chosen
- **Changed:** Monitors now record brand and model

### Cleaning

**Next Clean Due**

- **Changed:** A never-cleaned asset with a purchase date is first due 12 months after purchase, so new kit shows as **OK** rather than **Never Cleaned**

### Admin

**Accounts**

- **Added:** New **Admin** page for admins: add accounts with a temporary password, reset passwords, remove people and choose who else is an admin

**Tidy Model Names**

- **Added:** Finds models spelt more than one way, such as "Lattitude 5540" and "Latitude 5540", and renames them to one spelling in a click

### General

**Appearance**

- **Added:** Dark mode, now the default. The sun and moon button in the bottom-right corner switches, and your choice is remembered

**Release Notes**

- **Added:** This page. Click the version number next to the title to see what changed in each release

## [2.0.1](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.0.1) - 2026-09-25

_Setup Fixes_

### General

**Setup**

- **Added:** One script, **supabase/setup.sql**, now builds the whole database, instead of five run in the right order
- **Fixed:** Signing in failed with "Invalid path specified in request URL" when the Supabase URL was copied with its API path on the end
- **Changed:** When the database tables are missing, the message now says to run the setup script instead of pointing at a cache

## [2.0.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v2.0.0) - 2026-09-14

_Bulk Actions, Cleaning History & Reports_

### Assets

**Asset Register**

- **Added:** **Bulk actions**: tick rows to assign, unassign, record a clean or delete them together. Ticks carry across pages
- **Added:** Lists show five rows at a time, adjustable to 10, 25 or 50

**Add Asset**

- **Added:** **Quantity**: add several identical assets at once, with a reference for each

### Cleaning

**Cleaning History**

- **Added:** Every clean is now kept, not just the latest, on a new **History** tab of the Cleaning page

### Reports

**Reports**

- **Added:** New **Reports** page: assets by department, type and location, fleet age, spend by year, cleans by month and by person, and what has never been cleaned
- **Added:** **Cleaning due this month** report, soonest first, including anything already overdue
- **Changed:** Every CSV export now lives on the Reports page, with reports for the full register, unassigned assets, the cleaning queue and the cleaning history

## [1.2.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v1.2.0) - 2026-09-14

_Separate Cleaning & Assets Pages, Specifications_

### Cleaning

**Cleaning Queue**

- **Changed:** The Cleaning page is now a work queue: most urgent first, with a **Record clean** button on every row
- **Added:** Recording a clean opens a short form with just the date, who cleaned it, the interval and notes

### Assets

**Asset Register**

- **Added:** **Unassigned Assets**: the User can be left blank, and spare kit is listed separately below the register
- **Added:** An eye button on each row opens the full record, with Edit and Delete
- **Changed:** Neither table scrolls sideways any more; columns drop away on smaller screens instead
- **Changed:** **Add asset** moved to the top of the register

**Specifications**

- **Added:** Computers and monitors record their specification on a second tab: brand, model, processor, RAM, storage, screen, battery and charger for laptops, and screen size, resolution and ports for monitors
- **Changed:** User and Department are dropdowns of names already on the register, with **Add new** for anyone new

**Asset Details**

- **Changed:** Cancelling an edit or delete returns you to the details you came from
- **Removed:** The duplicate Close button; the boxed cross in the corner closes the window

### Dashboard

**Stat Cards**

- **Changed:** Total value leads, then total assets, then the cleaning statuses from most to least urgent

## [1.1.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v1.1.0) - 2026-09-13

_Change Password & Quality-Of-Life Updates_

### General

**Header**

- **Added:** **Change password** in the header, so a temporary password can be replaced after signing in
- **Changed:** Sign out is a solid button and Change password a link, so it is clear what can be clicked
- **Removed:** The manual Refresh button. The register already updates live and every 10 minutes

### Dashboard

**Needs Attention**

- **Fixed:** Status badges and **Record clean** buttons sat lower than the text beside them
- **Changed:** The attention count is red when anything is overdue or never cleaned, amber when the rest is only due soon
- **Changed:** **Record clean** uses a lighter purple, a step down from the main actions

### Assets

**Asset Register**

- **Fixed:** The Action column heading did not line up with the buttons beneath it

## [1.0.0](https://github.com/JoshSmitherman/Asset_Maintenance/releases/tag/v1.0.0) - 2026-09-11

_First Release_

### Dashboard

**Overview**

- **Added:** Stat cards for total value, total assets and each cleaning status, each a shortcut to the matching list
- **Added:** Charts for cleaning status, assets by type and assets by location
- **Added:** **Needs attention** list of everything overdue, never cleaned or due within 30 days

### Assets

**Asset Register**

- **Added:** One register for every device: laptops, desktops, monitors, docks, phones, tablets, printers and peripherals
- **Added:** Location, purchase date and purchase cost on every asset
- **Added:** Search, filters and sorting on every column
- **Added:** Each asset records its **User** (the person who has it) and department

### Cleaning

**Cleaning Status**

- **Added:** Laptops and desktops are cleaned every 6 months by default, with a per-asset interval. Everything else is inventory only
- **Added:** Status worked out automatically: **Overdue**, **Due Soon**, **OK** or **Never Cleaned**

### General

**Layout**

- **Added:** ADARO branding, and separate Dashboard, Assets and Cleaning pages
- **Fixed:** Long forms could not be scrolled, and grabbing the scrollbar closed them
- **Fixed:** The header and navigation overlapped when scrolling
