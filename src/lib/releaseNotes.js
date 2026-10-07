// Release notes, newest first. The first entry is the current version: it is
// shown in the header and must match "version" in package.json (a test
// checks). Add a new release at the top, grouped by the page it affects.
//
// type is one of: added, changed, fixed, removed, security. Wrap a name in
// **double asterisks** to show it in bold. An item may carry details: an
// array of sub-points shown beneath it (the ↳ lines).

export const RELEASES = [
  {
    version: '2.13.0',
    title: 'Everything in Its Place',
    date: '2026-10-07',
    sections: [
      {
        area: 'Assets',
        groups: [
          {
            heading: 'The register',
            items: [
              {
                type: 'changed',
                text: 'The Assets page is just the register now - cleaning lives on the Cleaning page',
                details: [
                  'No clean status column, no Cleaned by or Status filters, no Record clean in the bulk actions',
                  'Overdue rows are no longer tinted red here',
                  'The register export leaves out cleaning too; the cleaning export still has it'
                ]
              },
              {
                type: 'added',
                text: 'A **Device** column says what each machine is - "Dell 14 Pro Plus", with "Laptop" underneath',
                details: ['From the make and model on the Specification tab; kit without them shows its type']
              },
              {
                type: 'changed',
                text: 'An asset\'s Details tab is grouped: **The asset**, **Cleaning** and **Record**',
                details: ['The make and model show at the top, beside the device type']
              },
              { type: 'changed', text: 'Search also finds serial numbers' }
            ]
          }
        ]
      },
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Layout',
            items: [
              {
                type: 'changed',
                text: 'The dashboard reads in two halves: **Assets** (cards, by type, by location, purchases), then **Cleaning** (cards, status and what needs attention)'
              },
              { type: 'changed', text: 'Needs attention and the cleaning queue name each machine by its make and model' }
            ]
          }
        ]
      },
      {
        area: 'Reports',
        groups: [
          {
            heading: 'Reports',
            items: [
              { type: 'changed', text: '**Assets by group** no longer counts overdue cleans - the Cleaning reports cover that' },
              { type: 'added', text: '**By person** lists each item\'s make, model and serial number' },
              { type: 'added', text: 'Exports include a **Make and model** column' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.12.0',
    title: 'Signed Out When Idle',
    date: '2026-10-07',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'Signing out',
            items: [
              {
                type: 'security',
                text: 'Orbit signs you out after **1 hour** with nothing done',
                details: [
                  'Two minutes before, it asks "Still there?" - press Stay signed in to carry on',
                  'Working in any Orbit tab keeps all of them signed in',
                  'Opening Orbit again after a long break (a laptop left overnight) asks you to sign in',
                  'The sign-in page says why you were signed out'
                ]
              },
              { type: 'fixed', text: 'The sign-in page no longer flashes a Microsoft button that is not switched on yet' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Device types',
            items: [
              {
                type: 'fixed',
                text: 'Typing "laptop" (or "monitor", "desktop"...) as a new type now uses the one already in the list',
                details: ['Before, a laptop typed in lower case dropped off the cleaning rota']
              },
              { type: 'fixed', text: '"Choose from the list instead" puts back the type the asset had, rather than Laptop' },
              { type: 'changed', text: 'Assets added as "Device" in the last few days are now "Other"' },
              { type: 'changed', text: 'Search also finds device types and brands - try "projector" or "Dell"' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.11.0',
    title: 'Any Device Type, and the Dashboard Cards Back',
    date: '2026-10-06',
    sections: [
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Device types',
            items: [
              {
                type: 'changed',
                text: 'Device Type is no longer limited: pick a usual one, or **+ Add another type** for anything else',
                details: [
                  'The usual types come first: Laptop, Desktop, Monitor, Phone, Camera, Docking Station, Tablet, Printer, Peripheral and Other',
                  'Types already on the register are offered too, so everyone spells them the same way'
                ]
              },
              { type: 'changed', text: 'Cameras are just "Camera" - no more "(UniFi)"' },
              { type: 'added', text: 'Every kind of kit can record its make and model on the Specification tab' }
            ]
          }
        ]
      },
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Cards',
            items: [
              {
                type: 'changed',
                text: 'The asset cards are back as they were: Total value, Total assets, Laptops, Desktops, Monitors, and Peripherals & other',
                details: ['Hover over Peripherals & other to see what it is made of']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.10.1',
    title: 'Sign-In Until Microsoft Is Ready',
    date: '2026-10-06',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'Signing in',
            items: [
              {
                type: 'fixed',
                text: 'The sign-in page only offers **Sign in with Microsoft** once it has been switched on',
                details: ['Until then it opens straight on email and password']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.10.0',
    title: 'Company Sign-In, Departments & a Safer Orbit',
    date: '2026-10-06',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'Signing in',
            items: [
              {
                type: 'added',
                text: '**Sign in with Microsoft** using your Adaro work account - no separate password to remember',
                details: ['Signing in with an email and password is still there, under the Microsoft button']
              },
              {
                type: 'added',
                text: 'New to Orbit? Sign in and press **Ask for access** - an admin will let you in',
                details: ['Until then you see nothing in Orbit, only your request']
              },
              {
                type: 'security',
                text: 'Only Adaro accounts can sign in, and only people an admin has given access to can see anything',
                details: ['Taking someone off the list, or switching them off, stops them straight away']
              },
              {
                type: 'changed',
                text: 'Your menu shows your department and what you can do: **View only**, **Can edit** or **Admin**',
                details: ['Change password only appears if you sign in with a password']
              }
            ]
          },
          {
            heading: 'Easier to use',
            items: [
              { type: 'changed', text: 'The light/dark switch is in the header, and Orbit follows your computer\'s setting until you choose' },
              { type: 'changed', text: 'Lists show **25 rows** a page, and remember the size you pick' },
              { type: 'added', text: 'Pop-up windows ask before closing if you have typed something, so a stray Escape no longer loses your work' },
              {
                type: 'changed',
                text: 'Better for keyboard and screen-reader users',
                details: [
                  'A clear focus outline in both themes',
                  'Keyboard focus stays in a pop-up and returns to where you were',
                  'Arrow keys move between tabs',
                  'A form with a mistake jumps to the first box that needs fixing'
                ]
              },
              { type: 'changed', text: 'Error messages say what went wrong and what to do, instead of database jargon' },
              { type: 'fixed', text: 'If Orbit cannot reach the database, it says so instead of showing zero assets and "nothing needs attention"' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Recording kit',
            items: [
              {
                type: 'changed',
                text: 'Device types are now **Laptop, Phone, Monitor, Camera (UniFi)** and **Other device**',
                details: ['Kit already recorded as a desktop, dock, tablet or printer keeps its type until someone changes it']
              },
              { type: 'added', text: 'A **Serial number** for each asset, searchable, and in the exports' },
              {
                type: 'added',
                text: '**Scan a barcode** into the search box (or type AST-0222 and press Enter) to open that asset straight away'
              },
              { type: 'added', text: 'Adding an asset offers the **next free AST number**' },
              { type: 'added', text: 'Click an Asset Ref in the list to open it' },
              { type: 'changed', text: 'Unassigning several assets now asks first, naming them' },
              {
                type: 'fixed',
                text: '**Next: Specification** went straight to saving the asset without its specs',
                details: ['Pressing Enter on the Details tab now moves on to Specification too']
              },
              { type: 'fixed', text: 'Costs like 1e3 or 12.345, and dates like 31 February, are refused with a clear message' },
              { type: 'fixed', text: 'On a phone, the buttons at the bottom of the Add asset form no longer run off the screen' }
            ]
          },
          {
            heading: 'History',
            items: [
              {
                type: 'added',
                text: 'An asset\'s History now shows every change, with what it was before',
                details: ['Cost, purchase date, specs, serial number, notes and retirement details', 'Repairs logged, changed and deleted']
              },
              { type: 'security', text: 'Deleted assets leave a record of what they were and who deleted them' },
              { type: 'security', text: '"Data wiped by" can only be someone on the team, never typed in' },
              { type: 'fixed', text: 'Retired and brought-back kit shows properly in History' }
            ]
          },
          {
            heading: 'Larger registers',
            items: [
              { type: 'fixed', text: 'Registers of more than 1,000 assets load in full - before, the rest were quietly missing' },
              { type: 'fixed', text: 'Changes by several people at once no longer make everyone\'s screen reload over and over' },
              { type: 'changed', text: 'Repairs can no longer be overwritten by two people editing the same one' }
            ]
          }
        ]
      },
      {
        area: 'Cleaning',
        groups: [
          {
            heading: 'Recording cleans',
            items: [
              { type: 'changed', text: '**Cleaned by** is chosen from the team by name, and starts on you' },
              { type: 'fixed', text: 'A clean dated before the last one is refused, so a due date can no longer move backwards' },
              { type: 'fixed', text: 'Correcting a clean no longer counts it twice in the reports' },
              { type: 'fixed', text: 'Between midnight and 1am in summer, a clean, repair or retirement dated today was refused' }
            ]
          }
        ]
      },
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Cards',
            items: [
              { type: 'changed', text: 'Cards for **Laptops, Phones, Monitors, Cameras** and **Other devices**' },
              { type: 'changed', text: '**Needs attention** shows the ten most urgent, with a link to the rest' }
            ]
          }
        ]
      },
      {
        area: 'Reports',
        groups: [
          {
            heading: 'Fixes',
            items: [
              { type: 'fixed', text: '**Cleaning due this month** no longer lists monitors and phones' },
              { type: 'fixed', text: 'Exported numbers stay numbers in Excel, minus signs included, and the file name has today\'s date' },
              { type: 'fixed', text: 'Fleet age counts kit as two on its second anniversary' }
            ]
          }
        ]
      },
      {
        area: 'Admin',
        groups: [
          {
            heading: 'People & access',
            items: [
              {
                type: 'added',
                text: 'A new **People & access** page: give someone access with their department and what they can do',
                details: [
                  'Departments: Customer Service, Technical Support, Developer, Credit Control, Finance and Exec',
                  'Technical Support start on Can edit, everyone else on View only - change it as needed'
                ]
              },
              { type: 'added', text: 'Requests for access appear at the top, ready to let in or dismiss' },
              { type: 'added', text: 'Switch someone off without removing them, and a **Copy** button for passwords' },
              { type: 'security', text: 'You cannot change your own access, and Orbit always keeps at least one admin' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.9.0',
    title: 'Say Hello to Orbit',
    date: '2026-10-05',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'New Name',
            items: [
              {
                type: 'changed',
                text: 'The Hardware Maintenance Tracker is now called **Orbit**',
                details: [
                  'The new name is in the header, on the sign-in page and on the browser tab',
                  'Everything else works as before: same address, same sign-in, same assets'
                ]
              },
              { type: 'changed', text: 'A new orbit icon on the browser tab and in bookmarks' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.8.0',
    title: 'Release Notes, Ascend Style',
    date: '2026-10-05',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'Release Notes',
            items: [
              {
                type: 'added',
                text: 'Each release has its own link, ending **?v=** and the version, so one release can be shared',
                details: ['Opening the link goes straight to that release, after signing in if needed']
              },
              { type: 'added', text: 'Changes can carry sub-points like these, for the detail behind them' },
              { type: 'added', text: 'A **Security** label for changes that keep the tracker and its data safe' },
              {
                type: 'added',
                text: 'Under each release, a link to the code exactly as it was released',
                details: ['The release running now also shows the code it was built from, and when']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.7.0',
    title: 'Favourite Reports',
    date: '2026-10-05',
    sections: [
      {
        area: 'Reports',
        groups: [
          {
            heading: 'Favourites',
            items: [
              { type: 'added', text: 'Star a report to make it a favourite. Its star turns gold, and it is listed under **Favourites** at the top of the Reports menu' },
              { type: 'added', text: 'Reports opens on your first favourite, so the one you use most is waiting for you' },
              { type: 'added', text: 'Every report has a star beside its title too, which is how to star one on a phone' },
              { type: 'added', text: 'Favourites are kept for each person on this computer, so a shared PC keeps everyone\'s separate' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.6.0',
    title: 'Dashboard Cards & Purchases',
    date: '2026-10-05',
    sections: [
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Cards',
            items: [
              { type: 'changed', text: 'The cards are in two labelled rows. **Assets**: total value, total assets, laptops, desktops, monitors, and peripherals and other kit, each with what it is worth. **Cleaning**: overdue, due soon, never cleaned and OK, each with its share of the rota' },
              { type: 'added', text: 'Clicking a kit card opens the register showing just that kind of kit' }
            ]
          },
          {
            heading: 'Charts',
            items: [
              { type: 'added', text: '**Bought in the last 12 months**: a bar for each month. Point at a month for how many were bought and what they cost' },
              { type: 'fixed', text: 'In dark mode the navy bars were hard to see against the background' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Register',
            items: [
              { type: 'added', text: 'The Device type filter has **Peripherals & other**: everything that is not a laptop, desktop or monitor' }
            ]
          }
        ]
      },
      {
        area: 'Reports',
        groups: [
          {
            heading: 'Assets',
            items: [
              { type: 'added', text: '**Spend** report, by month or by year. By month shows how many were bought, the spend, and what was bought' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.5.0',
    title: 'Repairs, Files & Retiring Kit',
    date: '2026-10-05',
    sections: [
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Repairs',
            items: [
              { type: 'added', text: 'A **Repairs** tab on every asset. Log an in-house fix: what was wrong, the date, who fixed it and each part replaced with its cost. The total adds itself up' },
              { type: 'added', text: '**Fixed by** starts as whoever is logging the repair, and can be changed to anyone on the team' },
              { type: 'added', text: 'Receipts and photos can be attached to each repair' }
            ]
          },
          {
            heading: 'Files',
            items: [
              { type: 'added', text: 'A **Files** tab on every asset for the purchase invoice, warranty papers and photos. Photos and PDFs up to 10 MB each' },
              { type: 'added', text: 'Files are private: they only open for people signed in to the tracker, even if someone has the link' }
            ]
          },
          {
            heading: 'Retiring Kit',
            items: [
              { type: 'added', text: '**Retire** takes kit at the end of its life out of the register, the cleaning queue and the dashboard, but keeps its record, repairs and files' },
              { type: 'added', text: 'Retiring records the date, the reason, and whether the data was wiped and by whom' },
              { type: 'added', text: 'A folded **Retired** list at the bottom of the Assets page. Tick several assets to retire them together' },
              { type: 'changed', text: 'Only admins can **Delete** an asset or a repair, or **Restore** retired kit. Everyone else retires kit instead, which can be undone' }
            ]
          }
        ]
      },
      {
        area: 'Reports',
        groups: [
          {
            heading: 'New Reports',
            items: [
              { type: 'added', text: '**By person**: everything one person holds, with its value, cleaning state and repairs. Or everyone, a line each' },
              { type: 'added', text: '**Repairs**: every repair, or totalled by asset, by part or by the person who fixed it' },
              { type: 'added', text: '**Retired kit**: what was retired, when, why, and whether its data was wiped' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.4.0',
    title: 'NFC Tag Links',
    date: '2026-10-05',
    sections: [
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Details',
            items: [
              { type: 'added', text: 'Every asset has its own **Tag link**, shown in its details with a **Copy link** button. Write it onto an NFC tag or a QR code stuck on the device' },
              { type: 'added', text: 'Tapping the tag with a phone opens the tracker straight to that asset\'s details, after signing in if needed' },
              { type: 'security', text: 'A tag holds only a link: whoever taps it still has to sign in, so a stranger sees the sign-in page and nothing else' }
            ]
          }
        ]
      },
      {
        area: 'General',
        groups: [
          {
            heading: 'Layout',
            items: [
              { type: 'fixed', text: 'On a phone the light and dark mode button sat on top of a window\'s buttons, such as Delete asset. It now hides while a window is open' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.3.0',
    title: 'Page-By-Page Improvements',
    date: '2026-10-05',
    sections: [
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Needs Attention',
            items: [
              { type: 'added', text: '**Open cleaning queue** button, straight to the machines that need doing' },
              { type: 'fixed', text: 'On a phone the list squeezed names and types until words split in half; it now drops the less important columns instead' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Register',
            items: [
              { type: 'changed', text: 'The register is listed in asset reference order, rather than by a clean date it does not show' }
            ]
          },
          {
            heading: 'Asset Details',
            items: [
              { type: 'added', text: '**Record clean** button for laptops and desktops, so a clean can be logged without leaving the asset' }
            ]
          }
        ]
      },
      {
        area: 'Cleaning',
        groups: [
          {
            heading: 'Cleaning Queue',
            items: [
              { type: 'added', text: '**Needs attention** and **All laptops and desktops** switch. The queue now opens on what needs doing' },
              { type: 'removed', text: 'The red "Never cleaned" in the date column, which repeated the status badge beside it' }
            ]
          },
          {
            heading: 'Record Clean',
            items: [
              { type: 'fixed', text: 'The date started on the last clean rather than today, so saving straight away recorded nothing new. It now starts on today, with the last clean shown underneath' },
              { type: 'changed', text: 'Cleaned by starts empty, so a clean is not credited to whoever did the previous one' }
            ]
          },
          {
            heading: 'Cleaning History',
            items: [
              { type: 'added', text: 'Device type, and who recorded each clean and when' }
            ]
          }
        ]
      },
      {
        area: 'General',
        groups: [
          {
            heading: 'Header',
            items: [
              { type: 'changed', text: 'Change password, your email and Sign out now live in one **account menu**: click the badge with your initials at the top right. It also shows your name and whether you are an Admin or a User' }
            ]
          },
          {
            heading: 'Layout',
            items: [
              { type: 'fixed', text: 'The light and dark mode button no longer covers buttons at the bottom of a page' },
              { type: 'fixed', text: 'On a phone the Admin tab ran off the edge of the screen' },
              { type: 'changed', text: 'The sign-in page now says to ask an admin for an account or a new password' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.2.0',
    title: 'Reports Reorganised',
    date: '2026-10-05',
    sections: [
      {
        area: 'Reports',
        groups: [
          {
            heading: 'Reports',
            items: [
              { type: 'changed', text: 'Reports are grouped into **Assets**, **Cleaning** and **Full exports**, picked from a menu down the side with a line on what each shows' },
              { type: 'changed', text: 'Assets by department, by device type and by location are now one report, **Assets by group**, with a switch between them' },
              { type: 'changed', text: 'Cleans by month and by person are now one report, **Cleaning activity**, with a switch between them' }
            ]
          }
        ]
      },
      {
        area: 'General',
        groups: [
          {
            heading: 'Appearance',
            items: [
              { type: 'fixed', text: 'In light mode, status badges and error messages had lost their coloured borders' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.1.0',
    title: 'Dark Mode, Asset History, Admin & Spec Memory',
    date: '2026-10-05',
    sections: [
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Details',
            items: [
              { type: 'added', text: 'A **History** tab on every asset: a bar showing who has had it and for how long, above a timeline of every move, department or location change, clean and its purchase' }
            ]
          },
          {
            heading: 'Add Asset',
            items: [
              { type: 'added', text: '**Next: Specification** button walks a new asset from Details to the Specification tab, which was easy to miss' },
              { type: 'added', text: '**Copy specs from a model you already have**: pick a model already on the register and its specification fills in. Pick another to switch, **Undo** to go back, **Clear specs** to start again' },
              { type: 'added', text: 'Typing a brand and model that is already on the register offers to fill just the empty boxes' },
              { type: 'added', text: 'A model name that nearly matches one already recorded asks **Did you mean…?**, so a typo does not start a second entry for the same machine' },
              { type: 'changed', text: 'Laptops now default to a 12-month cleaning interval; everything else stays at 6 months' },
              { type: 'changed', text: 'The Model list only offers models of the brand chosen' },
              { type: 'changed', text: 'Monitors now record brand and model' }
            ]
          }
        ]
      },
      {
        area: 'Cleaning',
        groups: [
          {
            heading: 'Next Clean Due',
            items: [
              { type: 'changed', text: 'A never-cleaned asset with a purchase date is first due 12 months after purchase, so new kit shows as **OK** rather than **Never Cleaned**' }
            ]
          }
        ]
      },
      {
        area: 'Admin',
        groups: [
          {
            heading: 'Accounts',
            items: [
              { type: 'added', text: 'New **Admin** page for admins: add accounts with a temporary password, reset passwords, remove people and choose who else is an admin' },
              {
                type: 'security',
                text: 'Only admins can add, remove or reset accounts, and the key that does it never reaches the browser',
                details: ['Every action is checked against the admin list on the server, not just hidden in the page', 'There must always be at least one admin, and nobody can remove their own account']
              }
            ]
          },
          {
            heading: 'Tidy Model Names',
            items: [
              { type: 'added', text: 'Finds models spelt more than one way, such as "Lattitude 5540" and "Latitude 5540", and renames them to one spelling in a click' }
            ]
          }
        ]
      },
      {
        area: 'General',
        groups: [
          {
            heading: 'Appearance',
            items: [
              { type: 'added', text: 'Dark mode, now the default. The sun and moon button in the bottom-right corner switches, and your choice is remembered' }
            ]
          },
          {
            heading: 'Release Notes',
            items: [
              { type: 'added', text: 'This page. Click the version number next to the title to see what changed in each release' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.0.1',
    title: 'Setup Fixes',
    date: '2026-09-25',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'Setup',
            items: [
              { type: 'added', text: 'One script, **supabase/setup.sql**, now builds the whole database, instead of five run in the right order' },
              { type: 'fixed', text: 'Signing in failed with "Invalid path specified in request URL" when the Supabase URL was copied with its API path on the end' },
              { type: 'changed', text: 'When the database tables are missing, the message now says to run the setup script instead of pointing at a cache' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.0.0',
    title: 'Bulk Actions, Cleaning History & Reports',
    date: '2026-09-14',
    sections: [
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Register',
            items: [
              { type: 'added', text: '**Bulk actions**: tick rows to assign, unassign, record a clean or delete them together. Ticks carry across pages' },
              { type: 'added', text: 'Lists show five rows at a time, adjustable to 10, 25 or 50' }
            ]
          },
          {
            heading: 'Add Asset',
            items: [
              { type: 'added', text: '**Quantity**: add several identical assets at once, with a reference for each' }
            ]
          }
        ]
      },
      {
        area: 'Cleaning',
        groups: [
          {
            heading: 'Cleaning History',
            items: [
              { type: 'added', text: 'Every clean is now kept, not just the latest, on a new **History** tab of the Cleaning page' }
            ]
          }
        ]
      },
      {
        area: 'Reports',
        groups: [
          {
            heading: 'Reports',
            items: [
              { type: 'added', text: 'New **Reports** page: assets by department, type and location, fleet age, spend by year, cleans by month and by person, and what has never been cleaned' },
              { type: 'added', text: '**Cleaning due this month** report, soonest first, including anything already overdue' },
              { type: 'changed', text: 'Every CSV export now lives on the Reports page, with reports for the full register, unassigned assets, the cleaning queue and the cleaning history' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '1.2.0',
    title: 'Separate Cleaning & Assets Pages, Specifications',
    date: '2026-09-14',
    sections: [
      {
        area: 'Cleaning',
        groups: [
          {
            heading: 'Cleaning Queue',
            items: [
              { type: 'changed', text: 'The Cleaning page is now a work queue: most urgent first, with a **Record clean** button on every row' },
              { type: 'added', text: 'Recording a clean opens a short form with just the date, who cleaned it, the interval and notes' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Register',
            items: [
              { type: 'added', text: '**Unassigned Assets**: the User can be left blank, and spare kit is listed separately below the register' },
              { type: 'added', text: 'An eye button on each row opens the full record, with Edit and Delete' },
              { type: 'changed', text: 'Neither table scrolls sideways any more; columns drop away on smaller screens instead' },
              { type: 'changed', text: '**Add asset** moved to the top of the register' }
            ]
          },
          {
            heading: 'Specifications',
            items: [
              { type: 'added', text: 'Computers and monitors record their specification on a second tab: brand, model, processor, RAM, storage, screen, battery and charger for laptops, and screen size, resolution and ports for monitors' },
              { type: 'changed', text: 'User and Department are dropdowns of names already on the register, with **Add new** for anyone new' }
            ]
          },
          {
            heading: 'Asset Details',
            items: [
              { type: 'changed', text: 'Cancelling an edit or delete returns you to the details you came from' },
              { type: 'removed', text: 'The duplicate Close button; the boxed cross in the corner closes the window' }
            ]
          }
        ]
      },
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Stat Cards',
            items: [
              { type: 'changed', text: 'Total value leads, then total assets, then the cleaning statuses from most to least urgent' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '1.1.0',
    title: 'Change Password & Quality-Of-Life Updates',
    date: '2026-09-13',
    sections: [
      {
        area: 'General',
        groups: [
          {
            heading: 'Header',
            items: [
              { type: 'added', text: '**Change password** in the header, so a temporary password can be replaced after signing in' },
              { type: 'changed', text: 'Sign out is a solid button and Change password a link, so it is clear what can be clicked' },
              { type: 'removed', text: 'The manual Refresh button. The register already updates live and every 10 minutes' }
            ]
          }
        ]
      },
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Needs Attention',
            items: [
              { type: 'fixed', text: 'Status badges and **Record clean** buttons sat lower than the text beside them' },
              { type: 'changed', text: 'The attention count is red when anything is overdue or never cleaned, amber when the rest is only due soon' },
              { type: 'changed', text: '**Record clean** uses a lighter purple, a step down from the main actions' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Register',
            items: [
              { type: 'fixed', text: 'The Action column heading did not line up with the buttons beneath it' }
            ]
          }
        ]
      }
    ]
  },
  {
    version: '1.0.0',
    title: 'First Release',
    date: '2026-09-11',
    sections: [
      {
        area: 'Dashboard',
        groups: [
          {
            heading: 'Overview',
            items: [
              { type: 'added', text: 'Stat cards for total value, total assets and each cleaning status, each a shortcut to the matching list' },
              { type: 'added', text: 'Charts for cleaning status, assets by type and assets by location' },
              { type: 'added', text: '**Needs attention** list of everything overdue, never cleaned or due within 30 days' }
            ]
          }
        ]
      },
      {
        area: 'Assets',
        groups: [
          {
            heading: 'Asset Register',
            items: [
              { type: 'added', text: 'One register for every device: laptops, desktops, monitors, docks, phones, tablets, printers and peripherals' },
              { type: 'added', text: 'Location, purchase date and purchase cost on every asset' },
              { type: 'added', text: 'Search, filters and sorting on every column' },
              { type: 'added', text: 'Each asset records its **User** (the person who has it) and department' }
            ]
          }
        ]
      },
      {
        area: 'Cleaning',
        groups: [
          {
            heading: 'Cleaning Status',
            items: [
              { type: 'added', text: 'Laptops and desktops are cleaned every 6 months by default, with a per-asset interval. Everything else is inventory only' },
              { type: 'added', text: 'Status worked out automatically: **Overdue**, **Due Soon**, **OK** or **Never Cleaned**' }
            ]
          }
        ]
      },
      {
        area: 'General',
        groups: [
          {
            heading: 'Layout',
            items: [
              { type: 'added', text: 'ADARO branding, and separate Dashboard, Assets and Cleaning pages' },
              { type: 'fixed', text: 'Long forms could not be scrolled, and grabbing the scrollbar closed them' },
              { type: 'fixed', text: 'The header and navigation overlapped when scrolling' }
            ]
          }
        ]
      }
    ]
  }
];

export const CURRENT_VERSION = RELEASES[0].version;

export const CHANGE_TYPES = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed',
  security: 'Security'
};
