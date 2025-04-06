// ==UserScript==
// @name         AO3 Chapter Wordcount Average
// @version      1.0
// @license      MIT
// @description  Display average chapter wordcount in one of two ways
// @author       sunkitten_shash
// @match        *://archiveofourown.org/*
// @match        *://www.archiveofourown.org/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js
// ==/UserScript==

$(document).ready(function() {
    const works = $("li[role=article] > .stats");
    for (let i = 0; i < works.length; i++) {
        let work = $(works[i]);
        const words = parseInt($(work).find('dd.words')[0].innerHTML.replace(',', ''));
        const chapCount = parseInt($(work).find('dd.chapters')[0].innerText.split('/')[0]);
        const avg = words/chapCount;
        const html = `<dt class="avg">Avg chapter len:</dt><dd class="avg">${Math.round(avg).toLocaleString()}</dd>`;
        $(work).append(html);
    }
});
