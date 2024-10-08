// ==UserScript==
// @name         Force See Podfic
// @version      1.0
// @description  Shows all inspired works at top of page, linked or not
// @author       sunkitten_shash
// @include      http*://archiveofourown.org/*works*
// @require      http://code.jquery.com/jquery-3.5.1.min.js
// @grant        none
// ==/UserScript==

async function addPodfics() {
    const workTitle = $.find('h2.title.heading')[0].innerText;

    const authorLink = $.find('a[rel="author"]');
    const relatedWorksLink = authorLink[0].href.replace(/\/pseuds\/.*/, '') + '/related_works';

    $.get(relatedWorksLink, function (data) {
        const relatedChunksObj = $(data).find('dd.parent > a').filter(function (index) {
            return $(this).text() === workTitle;
        });
        const relatedWorkElements = Object.keys(relatedChunksObj).reduce((acc, key) => {
            if (!isNaN(parseInt(key))) {
                const link = relatedChunksObj[key].parentElement.previousElementSibling.innerHTML;
                return [...acc, link];
            }
            else return acc;
        }, []);

        if (!relatedWorkElements.length) {
            console.log('No related works to add.');
            return;
        }

        let jumpParagraph = $('p.jump').first()[0];
        jumpParagraph.innerHTML = jumpParagraph.innerHTML.replace(/ and <a href=".*">other works inspired by this one<\/a>/, '');

        const topNotes = $("div.notes").first();
        topNotes.append('<br />');
        const wrapperDiv = $('<div>');
        $(wrapperDiv).addClass('children');
        $(wrapperDiv).addClass('module');
        topNotes.append(wrapperDiv);
        wrapperDiv.append('<h3 class="heading">Works inspired by this one:</h3>')
        const wrapperList = $('<ul>');
        wrapperList.append(relatedWorkElements.map((chunk) => {
            const listElement = $('<li>');
            listElement.append(chunk);
            return listElement;
        }));
        wrapperDiv.append(wrapperList);

        console.log(`${relatedWorkElements.length} related work(s) added.`);
    });
}

$(document).ready(function () {
    'use strict';
    console.log('Adding related works to top of works page....');
    addPodfics();
});