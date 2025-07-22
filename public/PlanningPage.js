function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // Sunday = 0, Monday = 1, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
    return new Date(d.setDate(diff));
}

const calendarNamespace = document.body.dataset.page || 'default';

function getStorageKey(dateStr) {
    return `calendar_notes_${calendarNamespace}_${dateStr}`;
}

function formatDate(date) {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function insertLineBreak() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const br = document.createElement('br');
    const space = document.createTextNode('\u200B'); // zero-width space

    range.insertNode(space); // insert space first so caret can go there
    range.insertNode(br);    // then insert the break just before

    // Move caret after space
    range.setStartAfter(space);
    range.setEndAfter(space);
    selection.removeAllRanges();
    selection.addRange(range);
}


function formatLinksInEditable(div) {
    try {
        const selection = window.getSelection();

        // Skip if no range or selection is outside the div
        if (!selection.rangeCount || !div.contains(selection.anchorNode)) {
            applyLinkFormatting(div);
            return;
        }

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(div);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        const caretOffset = preCaretRange.toString().length;

        applyLinkFormatting(div);
        setCaretPosition(div, caretOffset);
    } catch (err) {
        console.warn("formatLinksInEditable failed, falling back:", err);
        applyLinkFormatting(div); // still apply formatting
    }
}

function applyLinkFormatting(div) {
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

    // Use innerHTML to preserve tags like <br> and <a>
    const html = div.innerHTML;

    // Replace only raw markdown inside non-anchor nodes
    const temp = document.createElement('div');
    temp.innerHTML = html;

    function recursivelyFormat(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const match = regex.exec(node.textContent);
            if (match) {
                const [full, label, url] = match;
                const before = node.textContent.slice(0, match.index);
                const after = node.textContent.slice(match.index + full.length);

                const fragment = document.createDocumentFragment();
                if (before) fragment.appendChild(document.createTextNode(before));

                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = label;
                fragment.appendChild(link);

                fragment.appendChild(document.createTextNode(' ')); // allow typing outside

                if (after) fragment.appendChild(document.createTextNode(after));

                node.replaceWith(fragment);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'A') {
            [...node.childNodes].forEach(recursivelyFormat);
        }
    }

    [...temp.childNodes].forEach(recursivelyFormat);

    // Replace content
    div.innerHTML = '';
    while (temp.firstChild) {
        div.appendChild(temp.firstChild);
    }
}


function moveCaretToEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false); // collapse to end
    sel.removeAllRanges();
    sel.addRange(range);
}

function setCaretPosition(el, offset) {
    const range = document.createRange();
    const sel = window.getSelection();
    let currentOffset = 0;

    function findNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const nextOffset = currentOffset + node.length;
            if (currentOffset <= offset && offset <= nextOffset) {
                range.setStart(node, offset - currentOffset);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                throw 'done';
            }
            currentOffset = nextOffset;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let i = 0; i < node.childNodes.length; i++) {
                findNode(node.childNodes[i]);
            }
        }
    }

    try {
        findNode(el);
    } catch (e) {
        if (e !== 'done') throw e;
    }
}




// ✅ Move the regex to global scope so it's usable in multiple functions
const markdownLinkRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

function generateWeek(startDate, validDates) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week';

    for (let i = 0; i < 5; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        validDates.push(dateStr);

        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';

        const label = document.createElement('div');
        label.textContent = formatDate(dayDate);
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '0.5em';

        const textarea = document.createElement('div');
        textarea.contentEditable = true;
        textarea.className = 'calendar-note';
        textarea.setAttribute('data-date', dateStr);
        textarea.innerHTML = localStorage.getItem(getStorageKey(dateStr)) || '';
        formatLinksInEditable(textarea); // 💡 apply inline links on load

        textarea.addEventListener('input', () => {
            formatLinksInEditable(textarea); // 💡 format while typing
            localStorage.setItem(getStorageKey(dateStr), textarea.innerHTML);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // prevent default newline
                insertLineBreak();  // insert controlled line break
            }
        });


        const wrapper = document.createElement('div');
        wrapper.className = 'day-wrapper';
        wrapper.appendChild(textarea);

        dayDiv.appendChild(label);
        dayDiv.appendChild(wrapper);
        weekDiv.appendChild(dayDiv);
    }

    return weekDiv;
}


function cleanupOldNotes(validDates = []) {
    const prefix = `calendar_notes_${calendarNamespace}_`;
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            const datePart = key.slice(prefix.length);
            if (!validDates.includes(datePart)) {
                keysToDelete.push(key);
            }
        }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    const today = new Date();
    const currentMonday = getMonday(today);
    const validDates = [];

    for (let w = 0; w < 5; w++) {
        const weekStart = new Date(currentMonday);
        weekStart.setDate(currentMonday.getDate() + w * 7);
        const weekDiv = generateWeek(weekStart, validDates);
        container.appendChild(weekDiv);
    }

    cleanupOldNotes(validDates);
}

document.addEventListener('DOMContentLoaded', renderCalendar);
