function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // Sunday = 0, Monday = 1, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
    return new Date(d.setDate(diff));
}

const calendarNamespace = document.body.dataset.page || 'default';

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

    range.insertNode(space);
    range.insertNode(br);

    range.setStartAfter(space);
    range.setEndAfter(space);
    selection.removeAllRanges();
    selection.addRange(range);
}

function formatLinksInEditable(div) {
    try {
        const selection = window.getSelection();

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
        applyLinkFormatting(div);
    }
}

function applyLinkFormatting(div) {
    const temp = document.createElement('div');
    temp.innerHTML = div.innerHTML;

    const checklistRegex = /\{\}\(([^)]+)\)/g;
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

    function processTextNode(node) {
        const text = node.textContent;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        const regex = new RegExp(`${checklistRegex.source}|${linkRegex.source}`, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const matchStart = match.index;
            const matchText = match[0];

            if (matchStart > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)));
            }

            if (matchText.startsWith('{}(')) {
                const label = match[1];
                if (label) {
                    const wrapper = document.createElement('span');
                    wrapper.className = 'checklist-item';

                    const box = document.createElement('span');
                    box.className = 'checkbox';
                    box.textContent = '☐';
                    box.style.cursor = 'pointer';

                    const content = document.createElement('span');
                    content.className = 'checkbox-text';
                    content.textContent = label;

                    wrapper.appendChild(box);
                    wrapper.appendChild(document.createTextNode(' '));
                    wrapper.appendChild(content);
                    fragment.appendChild(wrapper);
                } else {
                    fragment.appendChild(document.createTextNode(matchText));
                }
            } else if (match[2] && match[3]) {
                const label = match[2];
                const url = match[3];
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = label;
                fragment.appendChild(link);
                fragment.appendChild(document.createTextNode(' '));
            } else {
                fragment.appendChild(document.createTextNode(matchText));
            }

            lastIndex = match.index + matchText.length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        if (fragment.childNodes.length > 0) {
            node.replaceWith(fragment);
        }
    }

    function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
        } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName !== 'A' &&
            !node.classList.contains('checklist-item')
        ) {
            [...node.childNodes].forEach(walk);
        }
    }

    [...temp.childNodes].forEach(walk);

    div.innerHTML = '';
    while (temp.firstChild) {
        div.appendChild(temp.firstChild);
    }

    addCheckboxClickHandlers(div);
}

function moveCaretToEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
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
        dayDiv.classList.add('day');
        dayDiv.dataset.date = dateStr;

        const label = document.createElement('div');
        label.textContent = formatDate(dayDate);
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '0.5em';

        const textarea = document.createElement('div');
        textarea.contentEditable = true;
        textarea.className = 'calendar-note';
        textarea.setAttribute('data-date', dateStr);
        textarea.innerHTML = '';

        textarea.addEventListener('input', () => {
            formatLinksInEditable(textarea);
            saveNoteToServer(pageName, dateStr, textarea.innerHTML);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertLineBreak();
            }
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'day-wrapper';
        wrapper.appendChild(textarea);

        dayDiv.appendChild(label);
        dayDiv.appendChild(wrapper);

        const dayToggle = document.createElement('input');
        dayToggle.type = 'checkbox';
        dayToggle.className = 'day-toggle';

        dayToggle.addEventListener('change', () => {
            const isChecked = dayToggle.checked;
            if (isChecked) dayDiv.classList.add('complete');
            else dayDiv.classList.remove('complete');
            saveNoteToServer(pageName, dateStr, textarea.innerHTML, isChecked);
        });

        dayDiv.appendChild(dayToggle);
        weekDiv.appendChild(dayDiv);
    }

    return weekDiv;
}

function addCheckboxClickHandlers(div) {
    div.querySelectorAll('.checkbox').forEach(box => {
        box.onclick = () => {
            const wrapper = box.closest('.checklist-item');
            const text = wrapper.querySelector('.checkbox-text');
            const checked = wrapper.classList.toggle('checked');

            box.textContent = checked ? '☑' : '☐';

            if (checked) {
                wrapper.style.textDecoration = 'line-through';
                text.style.color = '#888';
            } else {
                wrapper.style.textDecoration = 'none';
                text.style.color = '';
            }
        };
    });
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

    loadNotesFromServer(pageName);
}

document.addEventListener('DOMContentLoaded', renderCalendar);

document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'A' && target.closest('[contenteditable]')) {
        e.preventDefault();
        const editable = target.closest('[contenteditable]');
        editable.contentEditable = 'false';
        window.open(target.href, '_blank');
        setTimeout(() => { editable.contentEditable = 'true'; }, 100);
    }
});

const pageName = document.body.dataset.page;

async function loadNotesFromServer(pageName) {
    const res = await fetch(`/planning-notes/${pageName}`);
    const notes = await res.json();

    notes.forEach(note => {
        const dayBox = document.querySelector(`[data-date="${note.date_key}"]`);
        if (dayBox) {
            const textarea = dayBox.querySelector('.calendar-note');
            if (textarea) {
                textarea.innerHTML = note.content || '';
                formatLinksInEditable(textarea);
            }
            const dayToggle = dayBox.querySelector('.day-toggle');
            if (dayToggle) {
                dayToggle.checked = note.complete;
                if (note.complete) dayBox.classList.add('complete');
                else dayBox.classList.remove('complete');
            }
        }
    });
}

async function saveNoteToServer(pageName, dateKey, content, complete = false) {
    await fetch('/planning-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            page_name: pageName,
            date_key: dateKey,
            content: content,
            complete: complete
        })
    });
}

/* ======================= PLAYLIST BUTTONS (HARDENED) ======================= */

const PLAYLIST_DEBUG = true; // set to false to hide debug logs

function normalizeButtonName(name) {
    const m = String(name || '').trim().match(/^button\s*([123])$/i);
    return m ? `button${m[1]}` : '';
}

// Safely extract array from different API shapes
function extractRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.rows)) return payload.rows;
    return [];
}

// Try alternate field names
function getButtonField(obj) {
    return obj.button_name ?? obj.button ?? obj.slot ?? obj.btn ?? '';
}
function getDisplayField(obj) {
    return obj.display_name ?? obj.title ?? obj.label ?? '';
}

async function loadPlaylistButtons() {
    const container = document.getElementById('playlist-buttons-container');
    if (!container) return;

    if (!pageName) {
        container.innerHTML = '<div class="error">Missing pageName.</div>';
        return;
    }

    container.innerHTML = 'Loading playlists…';

    let playlists = [];
    let rawPayload = null;
    try {
        const res = await fetch(`/playlists/${encodeURIComponent(pageName)}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
        rawPayload = await res.json();
        playlists = extractRows(rawPayload);
    } catch (e) {
        console.error('[playlists] fetch failed:', e);
        container.innerHTML = `<div class="error">Couldn’t load playlists for “${pageName}”.</div>`;
        return;
    }

    // Group
    const grouped = {
        button1: { display_name: '', items: [] },
        button2: { display_name: '', items: [] },
        button3: { display_name: '', items: [] }
    };

    // Track diagnostics
    const seenButtons = new Set();
    const rows = [];

    playlists.forEach(pl => {
        const rawBtn = getButtonField(pl);
        const key = normalizeButtonName(rawBtn);
        seenButtons.add(String(rawBtn));
        rows.push({ rawBtn, normalized: key, display: getDisplayField(pl), id: pl.id });

        if (!grouped[key]) return;
        if (!grouped[key].display_name && getDisplayField(pl)) {
            grouped[key].display_name = getDisplayField(pl);
        }
        grouped[key].items.push(pl);
    });

    container.innerHTML = '';

    // Render ONLY groups with items
    ['button1', 'button2', 'button3'].forEach(key => {
        const info = grouped[key];
        if (info.items.length === 0) return;

        const btn = document.createElement('button');
        btn.className = 'playlist-button';
        btn.textContent = info.display_name || key.replace('button', 'Button ');

        btn.addEventListener('click', async () => {
            try {
                const r = await fetch(`/playlists/${encodeURIComponent(pageName)}/play`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ button_name: key })
                });
                const data = await r.json();
                if (data.url) window.open(data.url, '_blank');
                else alert('No playlist URL found.');
            } catch (err) {
                console.error('[playlists] play failed:', err);
                alert('Failed to start playlist.');
            }
        });

        container.appendChild(btn);
    });

    // Debug information if nothing rendered
    if (!container.children.length && PLAYLIST_DEBUG) {
        const dbg = document.createElement('pre');
        dbg.style.whiteSpace = 'pre-wrap';
        dbg.style.fontSize = '0.9em';
        dbg.style.padding = '0.75em';
        dbg.style.border = '1px dashed #bbb';
        dbg.style.borderRadius = '8px';
        dbg.style.background = '#fafafa';
        const summary = {
            pageName,
            payloadShape: Array.isArray(rawPayload) ? 'array' : (rawPayload ? Object.keys(rawPayload) : 'null'),
            totalRows: playlists.length,
            distinctButtonNameValues: [...seenButtons],
            counts: {
                button1: grouped.button1.items.length,
                button2: grouped.button2.items.length,
                button3: grouped.button3.items.length
            },
            note: 'No buttons rendered because all groups had 0 items. Check distinctButtonNameValues and server field names.'
        };
        dbg.textContent = '[playlists DEBUG]\n' + JSON.stringify(summary, null, 2);
        container.appendChild(dbg);
        console.warn('[playlists DEBUG rows]', rows);
        console.warn('[playlists DEBUG raw payload]', rawPayload);
    }
}

// Safe attach for the Manage Playlists button (only if present on this page)
const manageBtn = document.getElementById('manage-playlists-btn');
if (manageBtn) {
    manageBtn.addEventListener('click', () => {
        window.open(`/playlist-popup?page=${pageName}`, 'PlaylistPopup', 'width=600,height=400');
    });
}

// Initial load for playlist buttons
document.addEventListener('DOMContentLoaded', loadPlaylistButtons);

// ---------- Page "slide-style" autoscale ----------
(function () {
  // Tune this to your intended full-size width (e.g., 1200, 1440, 1920)
  const BASE_WIDTH = 1440;

  // Set true to fit BOTH width and height (still never scales up past 1)
  const FIT_BOTH = false;

  const WRAPPER_ID = 'page-wrapper';

  // Lightweight debounce so resize isn’t spammy
  function debounce(fn, delay = 100) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function autoscale() {
    const wrapper = document.getElementById(WRAPPER_ID);
    if (!wrapper) return;

    // Reset to natural size so our measurements are correct
    wrapper.style.transform = 'none';
    wrapper.style.width = '';   // clear prior width override
    // (leave height alone unless you also want to counter-scale height)

    const vw = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    let scale;

    if (FIT_BOTH) {
      // Measure natural content size (unscaled)
      const naturalW = wrapper.scrollWidth  || wrapper.offsetWidth  || BASE_WIDTH;
      const naturalH = wrapper.scrollHeight || wrapper.offsetHeight || vh;

      scale = Math.min(vw / naturalW, vh / naturalH, 1); // never > 1
    } else {
      // Width-only fit
      scale = Math.min(vw / BASE_WIDTH, 1);               // never > 1
    }

    // Apply scale
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top left';

    // Counteract visual shrink so the scaled content still fills the viewport width
    // (prevents the layout from looking narrow after scaling down)
    wrapper.style.width = (100 / Math.max(scale, 0.001)) + '%';
  }

  const init = () => {
    autoscale();
    window.addEventListener('resize', debounce(autoscale, 100));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
