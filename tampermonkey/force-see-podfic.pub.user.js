// ==UserScript==
// @name         Force See Podfic
// @version      2.2
// @description  Shows all podfics at top of page, linked or not
// @author       sunkitten_shash
// @include      /https:\/\/archiveofourown\.org\/works\/\d+/
// @include      /https:\/\/archiveofourown\.org\/chapters\/\d+/
// @require      http://code.jquery.com/jquery-3.5.1.min.js
// @updateURL    https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/force-see-podfic.pub.user.js
// @downloadURL  https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/force-see-podfic.pub.user.js
// @grant        none
// ==/UserScript==

// Set this value to true to manually search for podfics and false to only use linked related works
const SEARCH_FOR_WORKS = true;
const EXTRACT_WORK_ID_REGEX = /https:\/\/archiveofourown\.org\/works\/(\d+)/;

function addRelatedWorks(relatedWorkElements) {
  if (!relatedWorkElements.length) {
    console.log("No related works to add.");
    return;
  }

  let jumpParagraph = $("p.jump").first()[0];
  if (jumpParagraph) {
    const prevElement = jumpParagraph.previousElementSibling;
    // if there are no other notes, remove the "Notes" section entirely; otherwise, only remove the verbiage about inspired works
    if ($(prevElement).is("blockquote")) {
      if (jumpParagraph.innerText.includes("more notes"))
        jumpParagraph.innerHTML = jumpParagraph.innerHTML.replace(
          / and <a href=".*">other works inspired by this one<\/a>/,
          "",
        );
      else jumpParagraph.remove();
    } else {
      jumpParagraph.remove();
      prevElement.remove();
    }
  }

  let topSection = $("div.notes").first();
  if (topSection.length === 0) topSection = $("div.summary").first();
  topSection.append("<br />");
  const wrapperDiv = $("<div>");
  $(wrapperDiv).addClass("children");
  $(wrapperDiv).addClass("module");
  topSection.append(wrapperDiv);
  wrapperDiv.append('<h3 class="heading">Works inspired by this one:</h3>');
  const wrapperList = $("<ul>");
  wrapperList.append(
    relatedWorkElements.map((chunk) => {
      const listElement = $("<li>");
      listElement.append(chunk);
      return listElement;
    }),
  );
  wrapperDiv.append(wrapperList);

  console.log(`${relatedWorkElements.length} related work(s) added.`);
}

async function getRelatedWorks() {
  const workTitle = $.find("h2.title.heading")[0].innerText.trim();

  const authorLink = $.find('a[rel="author"]');
  const relatedWorksLink =
    authorLink[0].href.replace(/\/pseuds\/.*/, "") + "/related_works";

  // get linked related works
  const data = await $.get(relatedWorksLink);
  let relatedWorkElements = [];
  const relatedWorkIds = [];
  const relatedChunksObj = $(data)
    .find("dd.parent > a")
    .filter(function (index) {
      return $(this).text() === workTitle;
    });
  const relatedWorks = Object.keys(relatedChunksObj).reduce((acc, key) => {
    if (!isNaN(parseInt(key))) {
      const link =
        relatedChunksObj[key].parentElement.previousElementSibling.innerHTML;
      // work link is first element in chunk, extract work id from it
      const relatedWorkId = $(link)[0].href.match(EXTRACT_WORK_ID_REGEX)[1];
      relatedWorkIds.push(relatedWorkId);
      return [...acc, link];
    } else return acc;
  }, []);
  relatedWorkElements = [...relatedWorks];

  if (!SEARCH_FOR_WORKS) {
    addRelatedWorks(relatedWorkElements);
    return;
  }
  // search for unlinked podfics
  // can't rely on work id being in url so get it from always-present element
  const workId = $.find("#subscription_subscribable_id")[0].value;

  // TODO: encode this properly?
  // search for a podfic that has a title that includes the work title and is *not* tagged with Podfic Available or Podfic Welcome
  const searchTerm = `podfic title: "${workTitle}"`;
  const podficSearchLink = `https://archiveofourown.org/works/search?work_search[query]=${searchTerm
    .split(" ")
    .join(
      "+",
    )}&work_search[excluded_tag_names]=Podfic Available,Podfic Welcome`;

  const searchData = await $.get(podficSearchLink);
  const searchWorks = $(searchData)
    .find("li[role='article']")
    .toArray()
    // filter out works that:
    // - don't mention podfic in the summary or title
    // - link to works in the summary other than this work
    .filter((work) => {
      const title = $(work).find("h4.heading").find("a")[0].innerText;
      console.log({ title });
      const summaryText = $(work).find("blockquote.summary")[0].innerText;
      if (
        !title.toLowerCase().includes("podfic") &&
        !summaryText.toLowerCase().includes("podfic")
      ) {
        console.log(
          "no mention of podfic in title or summary, probably not a podfic",
        );
        return false;
      }

      // if there's links to works and none of them are to the original work
      // it can be filtered out
      const summaryLinks = $(work)
        .find("blockquote.summary")
        .find("a")
        .toArray();
      const linksToThisWork = summaryLinks.some((link) => {
        const matches = link.href.match(EXTRACT_WORK_ID_REGEX);
        if (matches?.length > 1) return workId === matches[1];
        return false;
      });
      if (linksToThisWork) return true;

      const linksToOtherWork = summaryLinks.some((link) => {
        const matches = link.href.match(EXTRACT_WORK_ID_REGEX);
        if (matches?.length > 1) return workId !== matches[1];
        return false;
      });
      if (linksToOtherWork) return false;

      return true;
    });
  for (const work of searchWorks) {
    try {
      const workLink = $(work).find("h4.heading").find("a")[0]?.href;
      const id = workLink.match(EXTRACT_WORK_ID_REGEX)[1];
      if (relatedWorkIds.includes(id) || workId === id || !workLink) {
        continue;
      } else {
        const relatedElement = $(work).find("h4.heading")[0].innerHTML;
        const workData = await $.get(workLink);
        const inspiredBy = $(workData)
          .find("ul.associations")
          .find("li:contains('Inspired by')")[0];
        if (inspiredBy) {
          const inspiredByWorkId = $(inspiredBy)
            .find("a")[0]
            .href.match(EXTRACT_WORK_ID_REGEX)[1];
          if (inspiredByWorkId === workId) {
            relatedWorkElements.push(relatedElement);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching possible related work:", e);
    }
  }

  addRelatedWorks(relatedWorkElements);
}

$(document).ready(function () {
  "use strict";
  console.log("Adding related works to top of works page....");
  getRelatedWorks();
});
