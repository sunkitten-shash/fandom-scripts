// ==UserScript==
// @name         AO3 Hide Notes
// @version      1.0
// @description  Automatically collapse or move front chapter notes to end to avoid spoilers
// @author       sunkitten_shash
// @include      https://archiveofourown.org/*
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/hide-notes.pub.user.js
// @downloadURL  https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/hide-notes.pub.user.jss
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// ==/UserScript==

// Styles for settings menu
const css = `
    #hide-notes-settings {
        position: fixed;
        z-index: 21;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.4);
    }
    #hide-notes-settings-content {
        background-color: #fff;
        color: #2a2a2a;
        margin: 10% auto;
        padding: 1em;
        width: 500px;
    }
    #hide-notes-settings button {
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
        #hide-notes-settings-content {
            width: 80%;
        }
    }`;

// TODO: make sure you're handling chapter notes when viewing full work as per-chapter not per-work

const work_url = /https:\/\/archiveofourown\.org\/works\/\d+/;
const chapter_url = /https:\/\/archiveofourown\.org\/chapters\/\d+/;
const collection_work_url =
  /https:\/\/archiveofourown\.org\/collections\/.+\/works\/\d+/;
const view_full_work_url =
  /https:\/\/archiveofourown\.org\/.*\?view_full_work=true/;

async function populateSettingsMenuValue() {
  const hideNotesOption = await GM.getValue("hideNotesOption", "move");
  $(`#hide-notes-${hideNotesOption}`).prop("checked", true);
}

GM.registerMenuCommand("AO3 Hide Notes Settings", async function () {
  const settings_menu_exists = $("#hide-notes-settings").length;
  if (settings_menu_exists) {
    console.log("settings already open");
    return;
  }

  const hide_notes_settings_html = `
    <div id="hide-notes-settings">
        <div id="hide-notes-settings-content">
            <h2>AO3 Hide Notes Settings</h2>
            <br><br>
          <span>Hide spoilery start notes by:</span>
          <br />
            <input type="radio" name="hide-notes-option" id="hide-notes-move" value="move" />
            <label for="hide-notes-move">Moving notes to bottom of chapter/work</label>
          <br />
          <input type="radio" name="hide-notes-option" id="hide-notes-details" value="details" />
          <label for="hide-notes-details">Wrapping notes in a collapsible details element</label>
          <br />
          <input type="radio" name="hide-notes-option" id="hide-notes-off" value="off" />
          <label for="hide-notes-off">Do nothing, leave start notes as-is</label>
            <br />
            <br />
            <button id="hide-notes-settings-close">Save and Close</button>
        </div>
    </div>`;

  $("body").prepend(hide_notes_settings_html);

  await populateSettingsMenuValue();

  $("#hide-notes-settings-close").click(async () => await settings_close());
});

// close the settings dialog
async function settings_close() {
  let hideNotesOption = $(
    "#hide-notes-settings input[type=radio][name=hide-notes-option]:checked"
  );
  hideNotesOption = $(hideNotesOption).val();
  await GM.setValue("hideNotesOption", hideNotesOption);

  $("#hide-notes-settings").remove();
}

function moveNotes(
  baseElement,
  startNotesContent,
  movedNotesIndex,
  movedNotesHeaderText
) {
  const movedNotes = document.createElement("div");
  $(movedNotes).addClass("notes");
  $(movedNotes).addClass("module");
  $(movedNotes).attr("id", `moved_notes_${movedNotesIndex}`);
  $(movedNotes).append(`<h3 class="heading">${movedNotesHeaderText}</h3>`);
  $(movedNotes).append(startNotesContent);

  const endNotes = $(baseElement).find(".end.notes.module")[0];
  if (endNotes) {
    const group = $(endNotes).parent();
    $(group).prepend(movedNotes);
    $(endNotes).find("h3.heading").text("End Notes:");
  } else {
    const workText = $(baseElement).find(".userstuff.module[role='article']");
    const movedNotesWrapper = $(document.createElement("div"));
    movedNotesWrapper.addClass("preface");
    movedNotesWrapper.addClass("group");
    $(movedNotesWrapper).append(movedNotes);
    workText.after(movedNotesWrapper);
  }
}

function moveStartNotes(baseElement, index, isChapter) {
  console.log("moving start notes");

  let startNotes = $(baseElement)
    .find(".preface.group .notes.module")
    .not(".end")[0];
  if (!startNotes) return;
  const startNotesContent = $(startNotes).find(".userstuff");
  if (startNotesContent.length === 0) return;

  const startNotesHeader = $(startNotes).find("h3");
  const movedNotesNotice = $(document.createElement("p"));
  movedNotesNotice.html(
    `(See the end of the ${
      isChapter ? "chapter" : "work"
    } for the <a href="#moved_notes_${index}">moved start notes</a>.)`
  );
  startNotesHeader.after(movedNotesNotice);

  moveNotes(baseElement, startNotesContent, index, "Start Notes:");
}

function wrapStartNotes(startNotes) {
  console.log("wrapping start notes");

  const wrapper = $("<details>");
  wrapper.append("<summary>Click to see notes</summary>");
  const startNotesContent = $(startNotes).find(".userstuff");
  if (startNotesContent.length === 0) return;
  wrapper.append(startNotesContent);
  const startNotesHeader = $(startNotes).find("h3");
  startNotesHeader.after(wrapper);
}

async function handleNotes() {
  const hideNotesOption = await GM.getValue("hideNotesOption", "move");

  let startNotes = $(".preface.group .notes.module").not(".end")[0];
  const isFullWork = window.location.href.match(view_full_work_url);
  let hasMultipleChapters = false;
  const chapters = $(".work.meta.group dd.chapters")?.[0]?.innerText?.split(
    "/"
  );
  if (chapters.length > 1) {
    if (parseInt(chapters[1]) > 1) hasMultipleChapters = true;
  }
  const isChapter = isFullWork || hasMultipleChapters;

  if (!!startNotes) {
    if (hideNotesOption === "move") {
      if (isChapter) {
        const children = $("div#chapters").children();
        // TODO: better error handling here
        const chapterNumber = $($("div[id^='chapter-']")[0])
          .attr("id")
          .split("-")[1];
        for (let i = 0; i < children.length; i++) {
          moveStartNotes(children[i], i + 1, true);
          // if chapter number is 1 (get chapter number) and/or this is the first of a full work, after moving start notes move work start notes as well
          if (
            (isFullWork && i === 0) ||
            (!isFullWork && chapterNumber === "1")
          ) {
            const prevNotes = $(children[i])
              .parent()
              .prev()
              .find(".notes.module")[0];
            if (!prevNotes) continue;
            const notesContent = $(prevNotes).find(".userstuff");
            if (notesContent.length === 0) continue;
            const notesHeader = $(prevNotes).find("h3");
            const movedNotesNotice = $(document.createElement("p"));
            movedNotesNotice.html(
              `(See the end of the chapter for the <a href="#moved_notes_work">moved start notes</a>.)`
            );
            notesHeader.after(movedNotesNotice);

            moveNotes(children[i], notesContent, "work", "Work Start Notes:");
          }
        }
      } else {
        const baseElement = $("div#workskin");
        moveStartNotes(baseElement, 1, isChapter);
      }
    } else if (hideNotesOption === "details") {
      const notesElements = $(".preface.group .notes.module").not(".end");
      for (let i = 0; i < notesElements.length; i++) {
        wrapStartNotes(notesElements[i]);
      }
    }
  }
}

$(document).ready(function () {
  // add custom CSS for settings menu
  let head = document.getElementsByTagName("head")[0];
  if (head) {
    let style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.textContent = css;
    head.appendChild(style);
  }

  const href = window.location.href;
  if (
    href.match(work_url) ||
    href.match(chapter_url) ||
    href.match(collection_work_url)
  )
    handleNotes();
});
