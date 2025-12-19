// ==UserScript==
// @name         AO3 Custom Hidden Works List
// @version      1.0
// @description  Automatically collapses & hides works in a given list
// @author       sunkitten_shash
// @include      https://archiveofourown.org/*
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/custom-hidden-list.pub.user.js
// @downloadURL  https://github.com/sunkitten-shash/fandom-scripts/raw/main/tampermonkey/custom-hidden-list.pub.user.jss
// @grant        GM.registerMenuCommand
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

// false to completely remove minimized articles, true to collapse them down
const minimise_articles = true;

const MANUALLY_HIDDEN_WORKS = [
  // insert links like "https://archiveofourown.org/works/68374421"
];

// TODO: use this maybe?
const hideIcon = `<svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M19.7071 5.70711C20.0976 5.31658 20.0976 4.68342 19.7071 4.29289C19.3166 3.90237 18.6834 3.90237 18.2929 4.29289L14.032 8.55382C13.4365 8.20193 12.7418 8 12 8C9.79086 8 8 9.79086 8 12C8 12.7418 8.20193 13.4365 8.55382 14.032L4.29289 18.2929C3.90237 18.6834 3.90237 19.3166 4.29289 19.7071C4.68342 20.0976 5.31658 20.0976 5.70711 19.7071L9.96803 15.4462C10.5635 15.7981 11.2582 16 12 16C14.2091 16 16 14.2091 16 12C16 11.2582 15.7981 10.5635 15.4462 9.96803L19.7071 5.70711ZM12.518 10.0677C12.3528 10.0236 12.1792 10 12 10C10.8954 10 10 10.8954 10 12C10 12.1792 10.0236 12.3528 10.0677 12.518L12.518 10.0677ZM11.482 13.9323L13.9323 11.482C13.9764 11.6472 14 11.8208 14 12C14 13.1046 13.1046 14 12 14C11.8208 14 11.6472 13.9764 11.482 13.9323ZM15.7651 4.8207C14.6287 4.32049 13.3675 4 12 4C9.14754 4 6.75717 5.39462 4.99812 6.90595C3.23268 8.42276 2.00757 10.1376 1.46387 10.9698C1.05306 11.5985 1.05306 12.4015 1.46387 13.0302C1.92276 13.7326 2.86706 15.0637 4.21194 16.3739L5.62626 14.9596C4.4555 13.8229 3.61144 12.6531 3.18002 12C3.6904 11.2274 4.77832 9.73158 6.30147 8.42294C7.87402 7.07185 9.81574 6 12 6C12.7719 6 13.5135 6.13385 14.2193 6.36658L15.7651 4.8207ZM12 18C11.2282 18 10.4866 17.8661 9.78083 17.6334L8.23496 19.1793C9.37136 19.6795 10.6326 20 12 20C14.8525 20 17.2429 18.6054 19.002 17.0941C20.7674 15.5772 21.9925 13.8624 22.5362 13.0302C22.947 12.4015 22.947 11.5985 22.5362 10.9698C22.0773 10.2674 21.133 8.93627 19.7881 7.62611L18.3738 9.04043C19.5446 10.1771 20.3887 11.3469 20.8201 12C20.3097 12.7726 19.2218 14.2684 17.6986 15.5771C16.1261 16.9282 14.1843 18 12 18Z" fill="#000000"/>
</svg>`;

const extractIdRegex = /https:\/\/archiveofourown\.org\/works\/(\d+)/;

// pulled from brickgrass' bp script
function minimise_article(article) {
  if (!minimise_articles) {
    // Old article hiding behaviour
    $(article).css({ display: "none" });
    return;
  }

  // Minimisation of articles
  $(article)
    .children()
    .each(function () {
      if ($(this).is("div.header.module")) {
        $(this).after(
          "<a class='unhide-article' href='#' style='float: right'>Unhide hidden work</a>"
        );
        $(this).css({ "min-height": 0 });

        var article_title = $(this).children("h4.heading")[0];
        $(article_title).css({ "margin-left": 0 });

        var article_fandoms = $(this).children("h5.fandoms.heading")[0];
        $(article_fandoms).css({ display: "none" });

        var article_req_tags = $(this).children("ul.required-tags")[0];
        $(article_req_tags).css({ display: "none" });

        var article_datetime = $(this).children("p.datetime")[0];
        $(article_datetime).css({ top: 0 });

        return;
      }

      $(this).css({ display: "none" });
    });

  $("a.unhide-article").on("click", async function (event) {
    event.preventDefault();
    var hidden_article = $(this).closest("li[role=article]");
    const workLink = $(hidden_article).find("h4.heading").find("a")[0]?.href;
    const hiddenWorks = JSON.parse(
      await GM.getValue("custom_hidden_works_list", "[]")
    );
    // TODO: do it on work id instead - would fix problems w/ collections vs not
    const newHiddenWorks = hiddenWorks.filter((link) => link !== workLink);
    await GM.setValue(
      "custom_hidden_works_list",
      JSON.stringify(newHiddenWorks)
    );

    $(hidden_article)
      .children()
      .each(function () {
        if ($(this).is("div.header.module")) {
          $(this).css({ "min-height": "" });

          var article_title = $(this).children("h4.heading")[0];
          $(article_title).css({ "margin-left": "" });

          var article_fandoms = $(this).children("h5.fandoms.heading")[0];
          $(article_fandoms).css({ display: "" });

          var article_req_tags = $(this).children("ul.required-tags")[0];
          $(article_req_tags).css({ display: "" });

          var article_datetime = $(this).children("p.datetime")[0];
          $(article_datetime).css({ top: "" });
        }
        $(this).css({ display: "" });
      });
    $(this).css({ display: "none" });
  });
}

function add_hide_button(article) {
  const workId = $(article).attr("id").split("_")[1];
  $(article)
    .find(".stats")
    .after(
      `<ul class="actions" role="navigation"><li><a class="hide-article" href='#' id="hide_work_${workId}">Hide work</a></li></ul>`
    );

  $("#hide_work_" + workId).click(async () => {
    let hiddenWorks = JSON.parse(
      await GM.getValue("custom_hidden_works_list", "[]")
    );
    const workLink = $(article).find("h4.heading").find("a")[0]?.href;
    if (!hiddenWorks.includes(workLink)) {
      hiddenWorks = [...hiddenWorks, workLink];
      await GM.setValue(
        "custom_hidden_works_list",
        JSON.stringify(hiddenWorks)
      );
    }
    minimise_article(article);
  });
}

async function hideWorksAndAddButton() {
  const storageList = JSON.parse(
    await GM.getValue("custom_hidden_works_list", "[]")
  );
  const hiddenList = new Set([...MANUALLY_HIDDEN_WORKS, ...storageList]);
  const workIds = Array.from(hiddenList).map(
    (work) => work.match(extractIdRegex)?.[1]
  );
  const worksOnPage = $("li[role=article");
  for (let i = 0; i < worksOnPage.length; i++) {
    const article = worksOnPage[i];
    add_hide_button(article);
    const workId = $(article).attr("id").split("_")[1];
    if (workIds.includes(workId)) minimise_article(article);
  }
}

const css = `
  #hide-works-settings {
        position: fixed;
        z-index: 21;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.4);
    }
    #hide-works-settings-content {
        background-color: #fff;
        color: #2a2a2a;
        margin: 10% auto;
        padding: 1em;
        width: 500px;
    }
    #hide-works-settings button {
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
        #hide-works-settings-content {
            width: 80%;
        }
    }
`;

GM.registerMenuCommand("AO3 Custom Hide Works List", function () {
  const settings_menu_exists = $("#hide-works-settings").length;
  if (settings_menu_exists) {
    console.log("settings already open");
    return;
  }

  const hide_works_settings_html = `
  <div id="hide-works-settings">
    <div id="hide-works-settings-content">
      <h2>AO3 Custom Hidden Works List</h2>
      <br />
      <button id="copy-works">Copy list of works that have been hidden to clipboard</button>

      <br />
      <br />
      <button id="hide-works-settings-close">Close</button>
    </div>
  </div>
  `;

  $("body").prepend(hide_works_settings_html);

  $("#copy-works").click(async () => {
    const list = JSON.parse(
      await GM.getValue("custom_hidden_works_list", "[]")
    );
    navigator.clipboard.writeText(list);
  });

  $("#hide-works-settings-close").click(() =>
    $("#hide-works-settings").remove()
  );
});

$(document).ready(function () {
  // add custom CSS for settings menu
  let head = document.getElementsByTagName("head")[0];
  if (head) {
    let style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.textContent = css;
    head.appendChild(style);
  }

  hideWorksAndAddButton();
});
