// ==UserScript==
// @name         AO3 Automatic Bookmark Options
// @version      1.4
// @description  Automatically add preset options to AO3 bookmarks
// @author       sunkitten_shash
// @include      https://archiveofourown.org/*
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/bookmark-presets.pub.user.js
// @downloadURL  https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/bookmark-presets.pub.user.js
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// ==/UserScript==

// TODO: configurable buckets & styling for the wordcount?
// TODO: adding specific elements to notes? templates?
// TODO: picking a specific pseud
// TODO: pull notes & rec from bookmarker
// TODO: correctly initialize AND/AND NOT in conditional tags, they always reset to "AND" I think

const nonPodficTags = ["Podfic & Podficced Works", "Podfic Available"];

const num_separators = /[\.,]/;

// following two are similar, check first *then* second if failed first
const work_bookmarks_url =
  /https:\/\/archiveofourown\.org\/works\/\d+\/bookmarks/;
const work_url = /https:\/\/archiveofourown\.org\/works\/\d+/;
const chapter_url = /https:\/\/archiveofourown\.org\/chapters\/\d+/;
const series_url = /https:\/\/archiveofourown\.org\/series\/\d+/;
const bookmark_form_url =
  /https:\/\/archiveofourown\.org\/bookmarks\/\d+\/edit/;

// these are just sample presets
const defaultPresets = {
  "To Read": { tags: ["To Read"], private: true },
  Wordcount: {},
};

// change these buckets & names as desired
const wordcount_tag_buckets = {
  "0-99": "Wordcount: 0-100",
  "100-999": "Wordcount: 100-1k",
  "1000-4999": "Wordcount: 1k-5k",
  "5000-9999": "Wordcount: 5k-10k",
  "10000-29999": "Wordcount: 10k-30k",
  "30000-49999": "Wordcount: 30k-50k",
  "50000-99999": "Wordcount: 50k-100k",
  "100000-199999": "Wordcount: 100k-200k",
  "199999-9999999999999": "Wordcount: Over 200k",
};

// Styles for settings menu
const css = `
    #bookmark-options-settings {
        position: fixed;
        z-index: 21;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.4);
    }
    #bookmark-options-settings-content {
        background-color: #fff;
        color: #2a2a2a;
        margin: 10% auto;
        padding: 1em;
        width: 500px;
    }
    #bookmark-options-settings button {
        background: #eee;
        color: #444;
        width: auto;
        font-size: 100%;
        line-height: 1.286;
        height: 1.286em;
        vertical-align: middle;
        display: inline-block;
        padding: 0.25em 0.75em;
        white-space: nowrap;
        overflow: visible;
        position: relative;
        text-decoration: none;
        border: 1px solid #bbb;
        border-bottom: 1px solid #aaa;
        background-image: -moz-linear-gradient(#fff 2%,#ddd 95%,#bbb 100%);
        background-image: -webkit-linear-gradient(#fff 2%,#ddd 95%,#bbb 100%);
        background-image: -o-linear-gradient(#fff 2%,#ddd 95%,#bbb 100%);
        background-image: -ms-linear-gradient(#fff 2%,#ddd 95%,#bbb 100%);
        background-image: linear-gradient(#fff 2%,#ddd 95%,#bbb 100%);
        border-radius: 0.25em;
        box-shadow: none;
    }
    @media only screen and (max-width: 625px) {
        #bookmark-options-settings-content {
            width: 80%;
        }
    }`;

function check_for_existing_bookmark_tag(tag) {
  let tag_exists = false;
  const existing_bookmark_tags = $(this)
    .find("input[id=bookmark_tag_string_autocomplete]")
    ?.parent()
    .parent()
    .find("li.added.tag");
  existing_bookmark_tags.each((_index, element) => {
    const text = element.innerText.split("×")[0].trim();
    if (text === tag) {
      tag_exists = true;
      return false;
    }
  });

  return tag_exists;
}

function add_tag(tag, selector) {
  let tag_input = $(this).find(selector);
  if (!tag_input[0]) {
    console.log("Can't find tag input field, returning");
    return;
  }
  tag_input = tag_input[0]; // get actual DOM node

  // adding tag spoofing from: https://github.com/LazyCats-dev/ao3-podfic-posting-helper/blob/main/src/inject.js
  const event = new InputEvent("input", { bubbles: true, data: tag });
  tag_input.value = tag;
  // Replicates the value changing.
  tag_input.dispatchEvent(event);
  // Replicates the user hitting comma.
  tag_input.dispatchEvent(new KeyboardEvent("keydown", { key: "," }));
}

function add_bookmark_tag(tag) {
  if (check_for_existing_bookmark_tag.call(this, tag)) return;

  add_tag.call(this, tag, "input[id=bookmark_tag_string_autocomplete]");
}

// the other tag functionality doesn't seemingly work for collections
function add_collection(tag) {
  if (!tag) return;
  let tag_input = $(this).find("[id=bookmark_collection_names_autocomplete]");
  $(tag_input).val(tag);
  tag_input = tag_input[0];

  tag_input.dispatchEvent(new KeyboardEvent("keydown", { key: "," }));
}

function check_for_work_tag(tag) {
  let href = window.location.href;
  let work_tags = null;
  if (!href.match(work_bookmarks_url) && href.match(work_url)) {
    // console.log("Work page");
    work_tags = $("#main dl.meta ul.commas");
  } else if (href.match(series_url)) {
    // console.log("Series page");
    work_tags = $("li[role=article] ul.tags");
  } else if (href.match(bookmark_form_url)) {
    // console.log("Dedicated bookmark form edit page");
    work_tags = $("li[role=article] ul.tags");
  } else {
    // console.log("Other page");

    const bookmark_article = $(this).closest("li[role=article]");
    work_tags = $(bookmark_article).find("ul.tags");
  }

  const work_tag_list = $(work_tags).children();

  const regex = new RegExp(tag);
  let found_tag = false;
  $(work_tag_list).each((_index, el) => {
    const innerText = el.innerText.trim();
    if (regex.test(innerText)) {
      found_tag = true;
      return false;
    }
  });

  return found_tag;
}

function autopopulate_wordcount() {
  const exclude_podfic = true;

  let dds = $(this).find("fieldset > fieldset > dl > dd");
  let tag_dd = dds[1];
  let tag_list = $(tag_dd).children("ul");

  // what page is this? can we find the wordcount?
  let href = window.location.href;
  let wordcount = null;
  let freeform_tags = null;
  let has_podfic_tag = null;
  if (
    !href.match(work_bookmarks_url) &&
    (href.match(work_url) || href.match(chapter_url))
  ) {
    // Work page, need to look in slightly different place for wordcount
    // console.log("Work page");

    freeform_tags = $("#main dd.freeform ul.commas");
    wordcount = $("#main div.wrapper dd.stats dd.words");
  } else if (href.match(series_url)) {
    // Series page, need to look in slightly different place for wordcount
    // console.log("Series page");

    freeform_tags = $("li[role=article] dd.freeform ul.commas");
    wordcount = $("#main div.wrapper dd.stats dd").first();
  } else if (href.match(bookmark_form_url)) {
    // console.log("Dedicated bookmark edit page");

    freeform_tags = $("li[role=article] dd.freeform ul.commas");
    wordcount = $("dd.stats dd.words");
    return;
  } else {
    // All other pages have the bookmark form nested within a bookmark article
    // console.log("other page");

    let bookmark_article = $(this).closest("li.blurb[role=article]");
    freeform_tags = $(bookmark_article).find("dd.freeform ul.commas");
    wordcount = $(bookmark_article).find("dl.stats > dd.words");
    // Series listings have wordcount laid out differently
    if (wordcount.length === 0) {
      wordcount = $(bookmark_article).find("dl.stats > dd").first();
    }
  }

  const podfic_tag = $(freeform_tags).find("li:contains('Podfic')");
  let podficced_work_tag = null;
  for (nonPodficTag of nonPodficTags) {
    podficced_work_tag = $(freeform_tags).find(
      `li:contains('${nonPodficTag}')`
    );
    if (podficced_work_tag.length) break;
  }
  has_podfic_tag = podfic_tag.length && !podficced_work_tag.length;

  if (has_podfic_tag && exclude_podfic) return;

  wordcount = wordcount.text();
  wordcount = wordcount.replace(num_separators, "");
  wordcount = parseInt(wordcount);

  let tag = "";
  for (const [range, tag_str] of Object.entries(wordcount_tag_buckets)) {
    let [low, high] = range.split("-");
    [low, high] = [parseInt(low), parseInt(high)];

    if (low <= wordcount && wordcount <= high) {
      tag = tag_str;
      break;
    }
  }

  add_bookmark_tag.call(this, tag);
}

async function autopopulate_presets() {
  if (this === window) {
    return; // Don't know why, but the id selector also returns window?
  }

  const selectedPresets = JSON.parse(
    await GM.getValue("selectedBookmarkPresets", "[]")
  );
  const presets = JSON.parse(
    await GM.getValue("bookmarkPresets", JSON.stringify(defaultPresets))
  );
  for (const key of selectedPresets) {
    const preset = presets[key];

    if (key === "Wordcount") {
      autopopulate_wordcount.call(this);
      continue;
    }

    const onUpdate = presets[key]?.onUpdate;
    const is_updating_bookmark =
      $(this).find('p.submit input[type="submit"]').val() === "Update";
    if (!onUpdate && is_updating_bookmark) continue;
    const tags = preset?.tags;

    if (tags?.length) {
      for (const tag of tags) {
        add_bookmark_tag.call(this, tag);
      }
    }

    const conditionalTags = preset?.conditionalTags;
    if (conditionalTags?.length) {
      console.log({ conditionalTags });
      for (const conditionalTag of conditionalTags) {
        const ifTags = conditionalTag.if;
        let tags_present = false;
        if (ifTags?.length) {
          for (const ifTag of ifTags) {
            tags_present = check_for_work_tag.call(this, ifTag);

            if (tags_present) {
              break;
            }
          }
        }

        const andTags = conditionalTag.and;
        const andSelect = conditionalTag.andSelect;
        if (tags_present && andTags?.length) {
          let and_tag_present = false;
          for (const andTag of andTags) {
            and_tag_present = check_for_work_tag.call(this, andTag);
            console.log(
              `${andTag} ${
                and_tag_present ? "is" : "is not"
              } present w/ condition ${andSelect}`
            );

            // if we want both sets of tags to be present, short-circuit if any and tag is found. otherwise continue
            if (andSelect === "AND" && and_tag_present) {
              tags_present = true;
              break;
              // if we want them to not be present, set the whole thing false immediately
            } else if (andSelect === "AND_NOT" && and_tag_present) {
              tags_present = false;
              break;
            }
          }

          // if and tags were never found, set tags_present to false
          if (!and_tag_present && andSelect === "AND") {
            tags_present = false;
          }
        }

        if (tags_present) {
          const thenTags = conditionalTag.then ?? [];
          thenTags.forEach((tag) => add_bookmark_tag.call(this, tag));
        } else {
          const elseTags = conditionalTag.else ?? [];
          elseTags.forEach((tag) => add_bookmark_tag.call(this, tag));
        }
      }
    }

    if (preset?.private) {
      if (!$("input#bookmark_private").is(":checked"))
        $("input#bookmark_private").trigger("click");
    }

    if (preset?.rec) {
      if (!$("input#bookmark_rec").is(":checked"))
        $("input#bookmark_rec").trigger("click");
    }

    const collections = preset?.collections;

    if (collections?.length) {
      for (const collection of collections) {
        add_collection.call(this, collection);
      }
    }

    if (!!preset?.notes) {
      $("textarea#bookmark_notes").val(preset.notes);
    }

    // if bookmarking external work
    if (
      window.location.href.match(
        /https:\/\/archiveofourown\.org\/external_works/
      )
    ) {
      const fandoms = preset?.fandoms;
      if (fandoms?.length) {
        for (const fandom of fandoms) {
          add_tag.call(
            this,
            fandom,
            "[id=external_work_fandom_string_autocomplete]"
          );
        }
      }

      const relationships = preset?.relationships;
      if (relationships?.length) {
        for (const relationship of relationships) {
          add_tag.call(
            this,
            relationship,
            "[id=external_work_relationship_string_autocomplete]"
          );
        }
      }

      const characters = preset?.characters;
      if (characters?.length) {
        for (const character of characters) {
          add_tag.call(
            this,
            character,
            "[id=external_work_character_string_autocomplete]"
          );
        }
      }

      if (!!preset?.rating) {
        $(
          `select#external_work_rating_string option:contains('${preset.rating}')`
        ).prop("selected", true);
      }

      const categories = preset?.categories;
      if (categories?.length) {
        for (const category of categories) {
          const checkbox = $(
            `input[type="checkbox"][id="external_work_category_strings_${category
              .toLowerCase()
              .replace("/", "")}"]`
          );
          $(checkbox).prop("checked", true);
        }
      }
    }
  }
}

function set_context(j_node) {
  autopopulate_presets.call(j_node);
}

function getConditionalTagHTML(conditionalTag, index, presetName) {
  return `<div id="conditional-tags-preset-${presetName}-${index}">
        <label for="if-tags-preset-${presetName}-${index}">If any of these tags are present:</label>
        <input type="text" name="if-tags-preset-${presetName}-${index}" id="if-tags-preset-${presetName}-${index}" value="${(
    conditionalTag.if ?? []
  ).join(",")}" />
        <select id="select-and-tags-preset-${presetName}-${index}" value="${
    conditionalTag.andSelect ?? "AND"
  }">
          <option value="AND">AND</option>
          <option value="AND_NOT">AND NOT</option>
        </select>
        <input type="text" name="and-tags-preset-${presetName}-${index}" id="and-tags-preset-${presetName}-${index}" value="${(
    conditionalTag.and ?? []
  ).join(",")}" />
        <label for="then-tags-preset-${presetName}-${index}">Then add these tags:</label>
        <input type="text" name="then-tags-preset-${presetName}-${index}" id="then-tags-preset-${presetName}-${index}" value="${(
    conditionalTag.then ?? []
  ).join(",")}" />
        <label for="else-tags-preset-${presetName}-${index}">Else add these tags:</label>
        <input type="text" name="else-tags-preset-${presetName}-${index}" id="else-tags-preset-${presetName}-${index}" value="${(
    conditionalTag.else ?? []
  ).join(",")}" />
        <br />
        <button id="remove-conditional-tag-preset-${presetName}-${index}">Remove</button>
        <br />
        </div>`;
}

function getPresetHTML(presetName, presets) {
  const header = `
      <input type="checkbox" name="check-preset-${presetName}" id="check-preset-${presetName}" />
      <label for="check-preset-${presetName}"><strong>${presetName}</strong></label>
      <br>
  `;

  let additionalHTML = ``;
  if (presetName !== "Wordcount") {
    additionalHTML = `<div style="margin-left:10px;">
        <label for="tags-preset-${presetName}">Tags to add (comma-separated)</label>
        <input type="text" name="tags-preset-${presetName}" id="tags-preset-${presetName}" value="${(
      presets[presetName].tags ?? []
    ).join(",")}" />
      <br />
      <br />
      
      <details>
      <summary><strong>Conditional Tags</strong></summary>
      ${(presets[presetName].conditionalTags ?? []).map(
        (conditionalTag, index) => {
          return getConditionalTagHTML(conditionalTag, index, presetName);
        }
      )}
      <button id="add-conditional-tag-preset-${presetName}">Add conditional tags</button>
      </details>
      <br />
      <br />

      <input type="checkbox" name="on-update-preset-${presetName}" id="on-update-preset-${presetName}" />
      <label for="on-update-preset-${presetName}">Apply on bookmark update</label>
      <br />
      <input type="checkbox" name="private-preset-${presetName}" id="private-preset-${presetName}" />
      <label for="private-preset-${presetName}">Make bookmark private</label>
      <input type="checkbox" name="rec-preset-${presetName}" id="rec-preset-${presetName}" />
      <label for="rec-preset-${presetName}">Make bookmark rec</label>
      <br />
      <label for="collections-preset-${presetName}">Collections to add (comma-separated)</label>
      <input type="text" name="collections-preset-${presetName}" id="collections-preset-${presetName}" value="${(
      presets[presetName].collections ?? []
    ).join(",")}" />
      <br />
      <label for="notes-preset-${presetName}">Notes (HTML allowed)</label>
      <textarea id="notes-preset-${presetName}" name="notes-preset-${presetName}" value="${
      presets[presetName].notes ?? ``
    }"></textarea>

    <details>
    <summary>External work options</summary>
    <label for="fandoms-preset-${presetName}">Fandoms (comma-separated)</label>
    <input type="text" name="fandoms-preset-${presetName}" id="fandoms-preset-${presetName}" value="${(
      presets[presetName].fandoms ?? []
    ).join(",")}" />
    <br />
    
    <label for="relationships-preset-${presetName}">Relationships (comma-separated)</label>
    <input type="text" name="relationships-preset-${presetName}" id="relationships-preset-${presetName}" value="${(
      presets[presetName].relationships ?? []
    ).join(",")}" />
    <br />

    <label for="characters-preset-${presetName}">Characters (comma-separated)</label>
    <input type="text" name="characters-preset-${presetName}" id="characters-preset-${presetName}" value="${(
      presets[presetName].characters ?? []
    ).join(",")}" />
    <br />

    <fieldset id="rating-preset-${presetName}">
      <legend>Rating</legend>
      ${[
        "Not Rated",
        "General Audiences",
        "Teen And Up Audiences",
        "Mature",
        "Explicit",
      ]
        .map(
          (rating) => `
        <input type="radio" name="rating" id="${rating}" value="${rating}" />
        <label for="${rating}">${rating}</label>  
      `
        )
        .join("")}
    </fieldset>

    <fieldset id="categories-preset-${presetName}">
      <legend>Categories</legend>
      ${["F/F", "F/M", "Gen", "M/M", "Multi", "Other"]
        .map(
          (category) => `
        <input type="checkbox" name="category-${category}" id="category-${category}" />
        <label for="category-${category}">${category}</label/> 
      `
        )
        .join("")}
    </fieldset>

    </details>
    </div>`;
  }

  return `<div id="wrapper-preset-${presetName}">
    ${header}
    ${additionalHTML}
    <br>
    <button id="remove-preset-${presetName}">Remove ${presetName} Preset</button>
  </div>
  <br />`;
}

async function populateSettingsMenuValues() {
  const presets = JSON.parse(
    await GM.getValue("bookmarkPresets", JSON.stringify(defaultPresets))
  );
  const selectedPresets = JSON.parse(
    await GM.getValue("selectedBookmarkPresets", "[]")
  );

  const presetsCheckboxes = $(
    `#bookmark-options-settings input[type=checkbox][id^="check-preset"]`
  );
  for (let i = 0; i < presetsCheckboxes.length; i++) {
    const label = presetsCheckboxes[i].labels[0].innerText;
    $(presetsCheckboxes[i]).prop("checked", selectedPresets.includes(label));
  }

  const updateCheckboxes = $(
    `#bookmark-options-settings input[type=checkbox][id^="on-update-preset"]`
  );
  for (let i = 0; i < updateCheckboxes.length; i++) {
    const presetName = updateCheckboxes[i].id.split("-").pop();
    const updateValue = presets[presetName].onUpdate;
    if (updateValue) $(updateCheckboxes[i]).prop("checked", true);
  }

  const privateCheckboxes = $(
    `#bookmark-options-settings input[type=checkbox][id^="private-preset"]`
  );
  for (let i = 0; i < privateCheckboxes.length; i++) {
    const presetName = privateCheckboxes[i].id.split("-").pop();
    const privateValue = presets[presetName].private;
    if (privateValue) $(privateCheckboxes[i]).prop("checked", true);
  }

  const recCheckboxes = $(
    `#bookmark-options-settings input[type=checkbox][id^="rec-preset"]`
  );
  for (let i = 0; i < recCheckboxes.length; i++) {
    const presetName = recCheckboxes[i].id.split("-").pop();
    const recValue = presets[presetName].rec;
    if (recValue) $(recCheckboxes[i]).prop("checked", true);
  }

  const noteFields = $(
    `#bookmark-options-settings textarea[id^="notes-preset"]`
  );
  for (let i = 0; i < noteFields.length; i++) {
    const presetName = noteFields[i].id.split("-").pop();
    const notesValue = presets[presetName].notes;
    if (notesValue) $(noteFields[i]).val(notesValue);
  }

  const ratingFields = $(
    `#bookmark-options-settings fieldset[id^=rating-preset]`
  );
  for (let i = 0; i < ratingFields.length; i++) {
    const presetName = ratingFields[i].id.split("-").pop();
    const ratingValue = presets[presetName].rating;
    if (ratingValue) {
      const option = $(ratingFields[i]).find(
        `input[type=radio][id="${ratingValue}"]`
      );
      $(option).prop("checked", true);
    }
  }

  const categoriesFields = $(
    `#bookmark-options-settings fieldset[id^=categories-preset]`
  );
  for (let i = 0; i < categoriesFields.length; i++) {
    const presetName = categoriesFields[i].id.split("-").pop();
    const categories = presets[presetName].categories;
    if (categories?.length) {
      categories.forEach((category) => {
        const checkbox = $(categoriesFields[i]).find(
          `input[type=checkbox][id="category-${category}"]`
        );
        $(checkbox).prop("checked", true);
      });
    }
  }
}

GM.registerMenuCommand(
  "AO3 Automatic Bookmark Options Settings",
  async function () {
    const settings_menu_exists = $("#bookmark-options-settings").length;
    if (settings_menu_exists) {
      console.log("settings already open");
      return;
    }

    let presets = JSON.parse(
      await GM.getValue("bookmarkPresets", JSON.stringify(defaultPresets))
    );

    const bookmark_options_settings_html = `
    <div id="bookmark-options-settings">
        <div id="bookmark-options-settings-content">
            <h2>AO3 Automatic Bookmark Options Settings</h2>
            <br><br>
            ${Object.keys(presets)
              .map((key) => getPresetHTML(key, presets))
              .join("")}
            <br />
            <br />
            <button id="add-preset">Add Preset with Name</button>
            <input type="text" name="new-preset-name" id="new-preset-name" />
            <br />
            <br />
            <button id="bookmark-options-settings-close">Save and Close</button>
        </div>
    </div>`;

    $("body").prepend(bookmark_options_settings_html);

    await populateSettingsMenuValues();

    const presetsCheckboxes = $(
      `#bookmark-options-settings input[type=checkbox][id^="check-preset"]`
    );
    const selectedPresets = JSON.parse(
      await GM.getValue("selectedBookmarkPresets", "[]")
    );
    for (let i = 0; i < presetsCheckboxes.length; i++) {
      const label = presetsCheckboxes[i].labels[0].innerText;
      $(presetsCheckboxes[i]).prop("checked", selectedPresets.includes(label));
    }

    const privateCheckboxes = $(
      `#bookmark-options-settings input[type=checkbox][id^="private-preset"]`
    );
    for (let i = 0; i < privateCheckboxes.length; i++) {
      const presetName = privateCheckboxes[i].id.split("-").pop();
      const privateValue = presets[presetName].private;
      if (privateValue) $(privateCheckboxes[i]).prop("checked", true);
    }

    const recCheckboxes = $(
      `#bookmark-options-settings input[type=checkbox][id^="rec-preset"]`
    );
    for (let i = 0; i < recCheckboxes.length; i++) {
      const presetName = recCheckboxes[i].id.split("-").pop();
      const recValue = presets[presetName].rec;
      if (recValue) $(recCheckboxes[i]).prop("checked", true);
    }

    const noteFields = $(
      `#bookmark-options-settings textarea[id^="notes-preset"]`
    );
    for (let i = 0; i < noteFields.length; i++) {
      const presetName = noteFields[i].id.split("-").pop();
      const notesValue = presets[presetName].notes;
      if (notesValue) $(noteFields[i]).val(notesValue);
    }

    $("#add-preset").click(async () => {
      const newPresetName = $("#new-preset-name").val();
      if (!newPresetName) return;
      presets = { ...presets, [`${newPresetName}`]: {} };
      const newPresetHTML = getPresetHTML(newPresetName, presets);
      $(`#bookmark-options-settings div[id^="wrapper-preset"]`)
        .last()
        .append(newPresetHTML);
      $("#new-preset-name").val("");
      await GM.setValue("bookmarkPresets", JSON.stringify(presets));
    });

    $("[id^=add-conditional-tag-preset]").click(async (event) => {
      const presetName = event.target.id.split("-").pop();
      console.log({ presetName });
      existingConditionals = presets[presetName]?.conditionalTags;
      console.log({ existingConditionals });
      let newConditionals = [
        {
          if: [],
          then: [],
          else: [],
        },
      ];
      if (!!existingConditionals) {
        newConditionals = [...existingConditionals, ...newConditionals];
      }
      presets = {
        ...presets,
        [presetName]: {
          ...presets[presetName],
          conditionalTags: newConditionals,
        },
      };
      const newConditionalTagHTML = getConditionalTagHTML(
        newConditionals[newConditionals.length - 1],
        newConditionals.length - 1,
        presetName
      );
      $($(event.target).parent()).prepend(newConditionalTagHTML);
      await GM.setValue("bookmarkPresets", JSON.stringify(presets));
    });

    $("[id^=remove-conditional-tag-preset]").click(async (event) => {
      const elements = event.target.id.split("-");
      const index = elements.pop();
      const presetName = elements.pop();
      const existingConditionals = presets[presetName]?.conditionalTags;
      if (!existingConditionals) return;
      else {
        existingConditionals.splice(index, 1);
        const parent = $(event.target).parent();
        $(parent).remove();
        presets = {
          ...presets,
          [presetName]: {
            ...presets[presetName],
            conditionalTags: existingConditionals,
          },
        };
        await GM.setValue("bookmarkPresets", JSON.stringify(presets));
      }
    });

    $("[id^=remove-preset]").click(async (event) => {
      const presetName = event.target.id.split("-").pop();
      delete presets[presetName];
      const parent = $(event.target).parent();
      $(parent).remove();
      await GM.setValue("bookmarkPresets", JSON.stringify(presets));
    });

    $("#bookmark-options-settings-close").click(
      async () => await settings_close()
    );
  }
);

function getUpdatedPresets() {
  const presetElements = $("div[id^=wrapper-preset]");
  const presets = {};
  presetElements.each((_index, wrapper) => {
    const name = $(wrapper).find("label[for^=check-preset]")[0].innerText;
    if (name === "Wordcount") {
      presets["Wordcount"] = {};
      // this is the equivalent of continue for jquery loops
      return;
    }
    let tags = $($(wrapper).find("input[id^=tags-preset]")[0]).val();
    tags = tags.split(",").map((tag) => tag.trim());

    let conditionalTags = [];
    $(wrapper)
      .find("div[id^=conditional-tags-preset]")
      .each((_index, wrapper) => {
        let ifTags = $($(wrapper).find("input[id^=if-tags-preset]")[0]).val();
        ifTags = ifTags.split(",").map((tag) => tag.trim());

        let andSelect = $(
          $(wrapper).find("select[id^=select-and-tags-preset]")[0]
        ).val();

        let andTags = $($(wrapper).find("input[id^=and-tags-preset]")[0]).val();
        andTags = andTags.split(",").map((tag) => tag.trim());

        let thenTags = $(
          $(wrapper).find("input[id^=then-tags-preset]")[0]
        ).val();
        thenTags = thenTags.split(",").map((tag) => tag.trim());

        let elseTags = $(
          $(wrapper).find("input[id^=else-tags-preset]")[0]
        ).val();
        elseTags = elseTags.split(",").map((tag) => tag.trim());

        conditionalTags.push({
          if: ifTags,
          andSelect,
          and: andTags,
          then: thenTags,
          else: elseTags,
        });
      });

    const onUpdate = $(
      $(wrapper).find("input[type=checkbox][id^=on-update-preset]")[0]
    ).is(":checked");
    const private = $(
      $(wrapper).find("input[type=checkbox][id^=private-preset]")[0]
    ).is(":checked");
    const rec = $(
      $(wrapper).find("input[type=checkbox][id^=rec-preset]")[0]
    ).is(":checked");

    let collections = $(
      $(wrapper).find("input[id^=collections-preset]")[0]
    ).val();
    collections = collections.split(",").map((collection) => collection.trim());
    const notes = $($(wrapper).find("textarea[id^=notes-preset]")[0]).val();

    let fandoms = $($(wrapper).find("input[id^=fandoms-preset")[0]).val();
    fandoms = fandoms.split(",").map((tag) => tag.trim());
    let relationships = $(
      $(wrapper).find("input[id^=relationships-preset")[0]
    ).val();
    relationships = relationships.split(",").map((tag) => tag.trim());
    let characters = $($(wrapper).find("input[id^=characters-preset")[0]).val();
    characters = characters.split(",").map((tag) => tag.trim());

    const rating = $($(wrapper).find(`input[name="rating"]:checked`)).val();
    let categories = [];
    $($(wrapper).find(`input[type=checkbox][id^=category]:checked`)).each(
      (_index, element) => {
        categories.push(element.labels[0].textContent);
      }
    );

    presets[name] = {
      tags,
      conditionalTags,
      onUpdate,
      private,
      rec,
      collections,
      notes,
      fandoms,
      relationships,
      characters,
      rating,
      categories,
    };
  });

  return presets;
}

// close the settings dialog
async function settings_close() {
  const newPresets = getUpdatedPresets();
  let enabledPresets = [];
  const presetsCheckboxes = $(
    `#bookmark-options-settings input[type=checkbox][id^="check-preset"]`
  );
  for (let i = 0; i < presetsCheckboxes.length; i++) {
    const label = presetsCheckboxes[i].labels[0].innerText;
    const checked = $(presetsCheckboxes[i]).is(":checked");
    if (checked) enabledPresets.push(label);
  }

  await GM.setValue("selectedBookmarkPresets", JSON.stringify(enabledPresets));
  await GM.setValue("bookmarkPresets", JSON.stringify(newPresets));

  $("#bookmark-options-settings").remove();
}

function waitForKeyElements(
  selectorTxt /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */,
  actionFunction /* Required: The code to run when elements are
                        found. It is passed a jNode to the matched
                        element.
                    */,
  bWaitOnce /* Optional: If false, will continue to scan for
                        new elements even after the first match is
                        found.
                    */,
  iframeSelector /* Optional: If set, identifies the iframe to
                        search.
                    */
) {
  var targetNodes, btargetsFound;

  if (typeof iframeSelector == "undefined") targetNodes = $(selectorTxt);
  else targetNodes = $(iframeSelector).contents().find(selectorTxt);

  if (targetNodes && targetNodes.length > 0) {
    btargetsFound = true;
    /*--- Found target node(s).  Go through each and act if they
            are new.
        */
    targetNodes.each(function () {
      var jThis = $(this);
      var alreadyFound = jThis.data("alreadyFound") || false;

      if (!alreadyFound) {
        //--- Call the payload function.
        var cancelFound = actionFunction(jThis);
        if (cancelFound) btargetsFound = false;
        else jThis.data("alreadyFound", true);
      }
    });
  } else {
    btargetsFound = false;
  }

  //--- Get the timer-control variable for this selector.
  var controlObj = waitForKeyElements.controlObj || {};
  var controlKey = selectorTxt.replace(/[^\w]/g, "_");
  var timeControl = controlObj[controlKey];

  //--- Now set or clear the timer as appropriate.
  if (btargetsFound && bWaitOnce && timeControl) {
    //--- The only condition where we need to clear the timer.
    clearInterval(timeControl);
    delete controlObj[controlKey];
  } else {
    //--- Set a timer, if needed.
    if (!timeControl) {
      timeControl = setInterval(function () {
        waitForKeyElements(
          selectorTxt,
          actionFunction,
          bWaitOnce,
          iframeSelector
        );
      }, 300);
      controlObj[controlKey] = timeControl;
    }
  }
  waitForKeyElements.controlObj = controlObj;
}

// $("[id='idofelement']") due to multiple elements with same id being possible on ao3 bookmark page
waitForKeyElements(
  "[id='bookmark-form']",
  set_context,
  false /*false = continue searching after first*/
);

$(document).ready(function () {
  // add custom CSS for settings menu
  let head = document.getElementsByTagName("head")[0];
  if (head) {
    let style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.textContent = css;
    head.appendChild(style);
  }
});
// });
