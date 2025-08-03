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

            // Add preceding plain text
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

        // Add any remaining text
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
        // Calculate this day's date
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        validDates.push(dateStr);

        // Create day container
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.dataset.date = dateStr;

        // Add label (Mon, Aug 1, etc.)
        const label = document.createElement('div');
        label.textContent = formatDate(dayDate);
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '0.5em';

        // Create editable note area
        const textarea = document.createElement('div');
        textarea.contentEditable = true;
        textarea.className = 'calendar-note';
        textarea.setAttribute('data-date', dateStr);
        textarea.innerHTML = ''; // Will be populated by loadNotesFromServer()

        // Save notes on input
        textarea.addEventListener('input', () => {
            formatLinksInEditable(textarea); // Format links as you type
            saveNoteToServer(pageName, dateStr, textarea.innerHTML);
        });

        // Handle Enter key for line breaks
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default newline
                insertLineBreak();  // Insert controlled line break
            }
        });

        // Wrap textarea
        const wrapper = document.createElement('div');
        wrapper.className = 'day-wrapper';
        wrapper.appendChild(textarea);

        // Add everything to dayDiv
        dayDiv.appendChild(label);
        dayDiv.appendChild(wrapper);

        // Add checkbox for completion state
        const dayToggle = document.createElement('input');
        dayToggle.type = 'checkbox';
        dayToggle.className = 'day-toggle';

        // Checkbox state will be set later by loadNotesFromServer()

        // Save checkbox state when changed
        dayToggle.addEventListener('change', () => {
            const isChecked = dayToggle.checked;

            if (isChecked) {
                dayDiv.classList.add('complete');
            } else {
                dayDiv.classList.remove('complete');
            }

            // Save state AND current note content to DB
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

        // Let the link open in a new tab
        window.open(target.href, '_blank');

        // Restore edit mode shortly after
        setTimeout(() => {
            editable.contentEditable = 'true';
        }, 100);
    }
});

const pageName = document.body.dataset.page;
async function loadNotesFromServer(pageName) {
    const res = await fetch(`/planning-notes/${pageName}`);
    const notes = await res.json();

    notes.forEach(note => {
        const dayBox = document.querySelector(`[data-date="${note.date_key}"]`);
        if (dayBox) {
            // Update note content
            const textarea = dayBox.querySelector('.calendar-note');
            if (textarea) {
                textarea.innerHTML = note.content || '';
            }

            // Update checkbox state
            const dayToggle = dayBox.querySelector('.day-toggle');
            if (dayToggle) {
                dayToggle.checked = note.complete;
                if (note.complete) {
                    dayBox.classList.add('complete');
                } else {
                    dayBox.classList.remove('complete');
                }
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


document.querySelectorAll('.day textarea').forEach(textarea => {
    textarea.addEventListener('input', () => {
        const dateKey = textarea.closest('.day').dataset.date;
        saveNoteToServer(pageName, dateKey, textarea.value);
    });
});

document.getElementById('manage-playlists-btn').addEventListener('click', () => {
    document.getElementById('playlist-modal').style.display = 'block';
    loadPlaylistManagement();
});


const manageBtn = document.getElementById('manage-playlists-btn');
const playlistModal = document.getElementById('playlist-modal');
const closePlaylistModal = document.getElementById('close-playlist-modal');

manageBtn.addEventListener('click', () => {
    playlistModal.style.display = 'block';
    loadPlaylistManagement();
});

closePlaylistModal.addEventListener('click', () => {
    playlistModal.style.display = 'none';
});

async function loadPlaylistManagement() {
    const container = document.getElementById('playlist-management');
    container.innerHTML = 'Loading...';

    const res = await fetch(`/playlists/${pageName}`);
    const playlists = await res.json();

    // Group playlists by button_name
    const grouped = { Button1: [], Button2: [], Button3: [] };
    playlists.forEach(pl => {
        if (grouped[pl.button_name] !== undefined) {
            grouped[pl.button_name].push(pl);
        }
    });

    // Clear container
    container.innerHTML = '';

    // Render sections for each button
    Object.keys(grouped).forEach(buttonName => {
        const buttonPlaylists = grouped[buttonName];
        const displayName = buttonPlaylists[0]?.display_name || '';

        // Section wrapper
        const section = document.createElement('div');
        section.style.marginBottom = '1em';

        // Display name input
        const displayInput = document.createElement('input');
        displayInput.type = 'text';
        displayInput.value = displayName;
        displayInput.placeholder = 'Button Display Name';
        displayInput.addEventListener('change', async () => {
            await fetch(`/playlists/${pageName}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'setDisplayName',
                    button_name: buttonName,
                    display_name: displayInput.value
                })
            });
            loadPlaylistButtons(); // refresh play buttons
        });
        section.appendChild(displayInput);

        // Playlist list
        const list = document.createElement('ul');
        buttonPlaylists.forEach(pl => {
            const li = document.createElement('li');

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = pl.name;
            nameInput.placeholder = 'Playlist Name';

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = pl.url;
            urlInput.placeholder = 'YouTube URL';

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', async () => {
                await fetch(`/playlists/${pageName}/manage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update',
                        button_name: buttonName,
                        playlist: {
                            id: pl.id,
                            name: nameInput.value,
                            url: urlInput.value
                        }
                    })
                });
                loadPlaylistButtons();
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', async () => {
                await fetch(`/playlists/${pageName}/manage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'delete',
                        button_name: buttonName,
                        playlist: { id: pl.id }
                    })
                });
                loadPlaylistManagement();
                loadPlaylistButtons();
            });

            li.appendChild(nameInput);
            li.appendChild(urlInput);
            li.appendChild(saveBtn);
            li.appendChild(delBtn);
            list.appendChild(li);
        });
        section.appendChild(list);

        // Add new playlist
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add Playlist';
        addBtn.addEventListener('click', async () => {
            await fetch(`/playlists/${pageName}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add',
                    button_name: buttonName,
                    display_name: displayInput.value,
                    playlist: {
                        name: 'New Playlist',
                        url: ''
                    }
                })
            });
            loadPlaylistManagement();
            loadPlaylistButtons();
        });
        section.appendChild(addBtn);

        container.appendChild(section);
    });
}

document.getElementById('close-playlist-modal').addEventListener('click', () => {
    document.getElementById('playlist-modal').style.display = 'none';
});

