// ==UserScript==
// @name         Bookmark Series Info
// @version      1.1
// @description  Adds series info only to bookmarks
// @author       sunkitten_shash
// @include      https://archiveofourown.org/*
// @require      http://code.jquery.com/jquery-3.5.1.min.js
// @grant        none
// ==/UserScript==

const SERIES_URL = /https:\/\/archiveofourown\.org\/series\/\d+/;
const SERIES_ID_REGEX = /\/series\/(\d+)/;

const getSeriesInfoFromSeriesPage = (blurb) => {
  const seriesLink = window.location.href.split("#")[0];
  const seriesName = $("h2.heading").text().trim();
  const seriesId = seriesLink.match(SERIES_ID_REGEX)[1];
  const author = $(blurb).find("a[rel=author]").parent()[0].innerHTML;
  const seriesSummary = $(blurb)
    .find("blockquote.userstuff")[0]
    ?.innerHTML?.trim();

  return {
    seriesTitle: `<a href="${seriesLink}">${seriesName}</a> by ${author}`,
    seriesId,
    seriesSummary,
  };
};

const getSeriesInfoFromOtherPage = (article) => {
  const seriesTitle = $(article)
    .find("h4.heading")[0]
    .innerHTML.split("<img")[0]
    .trim();
  const match = $(article).find("h4.heading a")[0].href.match(SERIES_ID_REGEX);
  if (!match) return null;
  const seriesId = match[1];
  const seriesSummary = $(article)
    .find("blockquote.userstuff.summary")[0]
    ?.innerHTML?.trim();

  return {
    seriesTitle,
    seriesId,
    seriesSummary,
  };
};

const addSeriesInfo = (bookmarkArticle) => {
  let seriesInfo = {};

  if (window.location.href.match(SERIES_URL)) {
    seriesInfo = getSeriesInfoFromSeriesPage($("dl.series.meta.group"));
  } else {
    seriesInfo = getSeriesInfoFromOtherPage(
      $(bookmarkArticle).closest("li[role=article]"),
    );
  }

  if (!seriesInfo) return;

  const { seriesTitle, seriesId, seriesSummary } = seriesInfo;

  const notesField = $(bookmarkArticle).find("textarea[id^=bookmark_notes]");
  const existingNotes = $(notesField).val();
  if (existingNotes.includes("Series Details")) {
    console.log("Already has series details, returning");
    return;
  }

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.innerText = "Series Details";
  $(details).append(summary);
  $(details).append(seriesTitle);
  $(details).append(document.createElement("br"));
  $(details).append(`Series ID: ${seriesId}`);

  if (seriesSummary) {
    $(details).append(document.createElement("br"));
    const htmlString = `<details><summary>Series Summary</summary>${seriesSummary}</details>
    `;
    $(details).append(htmlString);
  }

  const wrapper = document.createElement("div");
  $(wrapper).append(details);

  $(notesField).val(
    `${wrapper.innerHTML}${existingNotes ? `\n\n${existingNotes}` : ""}`,
  );
};

const waitForKeyElements = (
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
                    */,
) => {
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
          iframeSelector,
        );
      }, 300);
      controlObj[controlKey] = timeControl;
    }
  }
  waitForKeyElements.controlObj = controlObj;
};

(() => {
  const stopAtFirst = window.location.href.match(SERIES_URL);
  waitForKeyElements("[id='bookmark-form']", addSeriesInfo, !!stopAtFirst);
})();
