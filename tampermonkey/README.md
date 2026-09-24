# Tampermonkey Scripts

## Force See Podfic

Many thanks to [GodOfLaundryBaskets' See Podfic First script](https://github.com/godoflaundry/fandom-scripts/tree/master/tapermonkey) for inspiring this.

Shows the "Works inspired by this one" section at the top of a work and includes podfics the author has not approved the link to. Click on [this link](https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/force-see-podfic.pub.user.js) to install the script.

NOTE: As of Dec 2025, AO3 has updated the Related Works page to only show works that the author has manually approved. This script will now only show approved related works and podfics that can be found through a search (`podfic title: "work title"`), rather than all related works.

Other notes:

- Will remove the note about seeing the end of the work for other works inspired by this one, but will keep the link for more notes at the end of the work
- In multichapter works, the links to related works will appear at the top of every chapter
- The script automatically searches AO3 for podfics for which the related work link has not been approved. This behavior can be turned off by changing the value of `SEARCH_FOR_WORKS`, at the top of the script, from `true` to `false`. This might be helpful for works that happen to have a lot of results from that search, if you don't want extra works possibly appearing in your history, or if you would like there to be less background requests happening (for instance, if you are opening a lot of works at once and trying to avoid getting rate-limited).
  - It excludes works that don't mention podfics in the title or summary, or that link to other AO3 works but not this one.

## Average Chapter Length

Adds an estimated average chapter length to the stats of each work on a works list. Note that it will show regardless of whether the fic has multiple chapters or not. Click on [this link](https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/avg-chapter-len.pub.user.js) to install the script.

Note that the average chapter length is calculated by dividing the wordcount by the number of chapters - it may be somewhat misleading if chapters differ greatly in length.

(Possible future improvements include putting a true average on the chapter index page, and actually fetching the wordcount of each chapter for calculations (slightly more accurate but also a lot more resource-intensive).)

## Bookmark Presets

Heavily pulls from [BrickGrass' wordcount autofill script](https://gist.github.com/BrickGrass) for the wordcount functionality.

Toggle on or off preset options when creating bookmarks, including a built-in preset for tagging wordcount that does not tag wordcount on podfics, and options for bookmarker tags, notes, collections, and marking a bookmark as private or as a rec.

When bookmarking an external work, can also have presets for the extra metadata there.

Configure options and toggle on and off presets in the settings menu found under the script when looking through active scripts in your userscripts manager.

Click on [this link](https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/bookmark-presets.pub.user.js) to install the script.

Known issues (fixes planned at some point):

- If the setting is set to pull in another bookmarker's notes, this will override any custom notes settings
- There's sometimes bugs with new presets showing up after adding them. Saving and re-opening settings or reloading the page should fix things
- Sometimes not all of the bookmark form loads correctly on pages with lists of works, and some elements will not be autofilled. Reloading the page may help, and it should always work if you open up the work and bookmark from the work page

COMING SOON: UI that sucks less (maybe), better configurable options for when to not autofill wordcount

## Hide Start Notes

Hides work/chapter start notes to avoid spoilers. Change the settings to move the notes to the end of the chapter/work, wrap them in a details element so you have to click to expand and see them, or turn off the behavior entirely. Works when viewing a full work or going chapter-by-chapter.

Click on [this link](https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/hide-notes.pub.user.js) to install the script.

## Custom Hidden Works List

Pulls from [BrickGrass' BP Highlighter script](https://github.com/BrickGrass/Blanket-Permission-Highlighter) for styling and work minimization code.

Manually specify list of work links in the script and/or click the button added to lists of works to permanently hide them. Works can be unhidden at any time. Change the value of `minimise_articles` at the top of the script to switch between completely removing the works and minimizing them. Go into the settings menu to copy the list of hidden works you've clicked the button on to your keyboard.

Click on [this link](https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/custom-hidden-list.pub.user.js) to install the script.
