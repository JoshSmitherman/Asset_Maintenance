// Release notes, newest first. The first entry is the current version: it is
// shown in the header and must match "version" in package.json (a test
// checks). Add a new release at the top, grouped by the page it affects.
//
// type is one of: added, changed, fixed, removed. Wrap a name in **double
// asterisks** to show it in bold.

export const RELEASES = [
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
              { type: 'added', text: 'New **Admin** page for admins: add accounts with a temporary password, reset passwords, remove people and choose who else is an admin' }
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
  removed: 'Removed'
};
