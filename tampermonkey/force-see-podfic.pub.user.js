// ==UserScript==
// @name         Force See Podfic
// @version      2.0
// @description  Shows all podfics at top of page, linked or not
// @author       sunkitten_shash
// @include      http*://archiveofourown.org/*works*
// @include      http*://archiveofourown.org/chapters*
// @require      http://code.jquery.com/jquery-3.5.1.min.js
// @updateURL    https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/force-see-podfic.pub.user.js
// @downloadURL  https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/force-see-podfic.pub.user.js
// @grant        none
// ==/UserScript==

const EXTRACT_WORK_ID_REGEX = /https:\/\/archiveofourown\.org\/works\/(\d+)/;

async function addRelatedWorks(relatedWorkElements) {
  let jumpParagraph = $("p.jump").first()[0];
  console.log({ jumpParagraph });
  if (jumpParagraph) {
    const prevElement = jumpParagraph.previousElementSibling;
    // if there are no other notes, remove the "Notes" section entirely; otherwise, only remove the verbiage about inspired works
    if ($(prevElement).is("blockquote")) {
      if (jumpParagraph.innerText.includes("more notes"))
        jumpParagraph.innerHTML = jumpParagraph.innerHTML.replace(
          / and <a href=".*">other works inspired by this one<\/a>/,
          ""
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
  console.log({ relatedWorkElements });
  wrapperList.append(
    relatedWorkElements.map((chunk) => {
      const listElement = $("<li>");
      listElement.append(chunk);
      return listElement;
    })
  );
  wrapperDiv.append(wrapperList);

  console.log(`${relatedWorkElements.length} related work(s) added.`);
}

async function getRelatedWorks() {
  const workTitle = $.find("h2.title.heading")[0].innerText.trim();
  // TODO: either async it or put everything in consecutive functions haha
  // hmmm this should also include other things

  const authorLink = $.find('a[rel="author"]');
  const relatedWorksLink =
    authorLink[0].href.replace(/\/pseuds\/.*/, "") + "/related_works";

  $.get(relatedWorksLink, function (data) {
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
    console.log({ relatedWorks });
    relatedWorkElements = [...relatedWorks];
    console.log({ relatedWorkElements });

    // now search for unlinked works
    const workId = $.find("#subscription_subscribable_id")[0].value;
    // TODO: refine this further, refining the search terms should work for being able to eliminate this - causes some errors now sometimes
    if (workTitle.toLowerCase().includes("podfic"))
      addRelatedWorks(relatedWorkElements);

    // TODO: encode properly lmao
    const searchTerm = `podfic title: "${workTitle}"`;
    const podficSearchLink = `https://archiveofourown.org/works/search?work_search[query]=${searchTerm
      .split(" ")
      .join("+")}`;
    console.log({ podficSearchLink });

    // TODO: temp throw the whole thing in a try/catch?
    $.get(podficSearchLink, function (data) {
      // TODO: check if there's nothing lol
      const works = $(data).find("li[role='article']").toArray();
      console.log({ works });
      for (const work of works) {
        const workLink = $(work).find("h4.heading").find("a")[0]?.href;
        console.log({ workLink });
        const id = workLink.match(EXTRACT_WORK_ID_REGEX)[1];
        // if (relatedWorkIds.includes(id)) {
        //   console.log("id already found");
        //   return;
        // }
        const relatedElement = $(work).find("h4.heading")[0].innerHTML;
        // TODO: return early if no work link
        $.get(workLink, function (workData) {
          const inspiredBy = $(workData)
            .find("ul.associations")
            .find("li:contains('Inspired by')")[0];
          if (!inspiredBy) return;
          // TODO: literally any error handling
          const inspiredByWorkId = $(inspiredBy)
            .find("a")[0]
            .href.match(EXTRACT_WORK_ID_REGEX)[1];
          console.log({ inspiredByWorkId });
          if (inspiredByWorkId === workId) {
            console.log("found related work!");
            console.log({ relatedElement });
            relatedWorkElements.push(relatedElement);
          }
        });
        // ok putting it outside works so let's. NOT do that,
        relatedWorkElements.push(relatedElement);
      }

      console.log({ relatedWorkElements });

      if (!relatedWorkElements.length) {
        console.log("No related works to add.");
        return;
      }

      addRelatedWorks(relatedWorkElements);
    });
  });
}

$(document).ready(function () {
  "use strict";
  console.log("Adding related works to top of works page....");
  getRelatedWorks();
});
