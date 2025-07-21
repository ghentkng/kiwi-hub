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

function renderAliasLinks(textarea, container) {
    container.innerHTML = ''; // clear old links
    const text = textarea.value;

    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const [_, label, url] = match;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.textContent = label;
        link.style.display = 'block';
        container.appendChild(link);
    }
}

function generateWeek(startDate) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week';

    for (let i = 0; i < 5; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0]; // e.g. 2025-07-22

        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';

        const label = document.createElement('div');
        label.textContent = formatDate(dayDate);
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '0.5em';

        const textarea = document.createElement('textarea');
        textarea.className = 'calendar-note';
        textarea.setAttribute('data-date', dateStr);
        textarea.placeholder = "Add notes or links...";

        // Load from localStorage
        const saved = localStorage.getItem(getStorageKey(dateStr));
        if (saved) textarea.value = saved;

        // Alias container (for formatted links)
        const aliasContainer = document.createElement('div');
        aliasContainer.className = 'alias-links';

        // Render alias links initially
        renderAliasLinks(textarea, aliasContainer);

        // Save on input and re-render links
        textarea.addEventListener('input', () => {
            localStorage.setItem(getStorageKey(dateStr), textarea.value);
            renderAliasLinks(textarea, aliasContainer);
        });

        dayDiv.appendChild(label);
        dayDiv.appendChild(textarea);
        dayDiv.appendChild(aliasContainer);
        weekDiv.appendChild(dayDiv);
    }

    return weekDiv;
}

function cleanupOldNotes(validDates) {
    const prefix = `calendar_notes_${calendarNamespace}_`;

    // Collect all keys first (because localStorage length changes as you delete)
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
    }

    // Now check and clean
    for (const key of keys) {
        if (key.startsWith(prefix)) {
            const datePart = key.slice(prefix.length);
            if (!validDates.includes(datePart)) {
                localStorage.removeItem(key);
            }
        }
    }
}




function renderCalendar() {
    cleanupOldNotes();

    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    const today = new Date();
    const currentMonday = getMonday(today);

    for (let w = 0; w < 5; w++) {
        const weekStart = new Date(currentMonday);
        weekStart.setDate(currentMonday.getDate() + w * 7);

        const weekDiv = document.createElement('div');
        weekDiv.className = 'week';

        for (let i = 0; i < 5; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dayKey = dayDate.toISOString().split('T')[0];

            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';

            const label = document.createElement('div');
            label.textContent = formatDate(dayDate);
            label.style.fontWeight = 'bold';
            label.style.marginBottom = '0.5em';

            const textarea = document.createElement('textarea');
            textarea.placeholder = "Add notes or links...";
            textarea.value = localStorage.getItem(getStorageKey(dayKey)) || '';

            // Save changes automatically
            textarea.addEventListener('input', () => {
                const key = getStorageKey(dayDate.toDateString());
                localStorage.setItem(key, textarea.value);
                renderAliasLinks(textarea, aliasContainer);
            });


            dayDiv.appendChild(label);
            dayDiv.appendChild(textarea);
            weekDiv.appendChild(dayDiv);
        }

        container.appendChild(weekDiv);
    }
}

function cleanupOldNotes(validKeys) {
    const prefix = `calendar_notes_${calendarNamespace}_`;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix) && !validKeys.includes(key)) {
            localStorage.removeItem(key);
        }
    }
}

document.addEventListener('DOMContentLoaded', renderCalendar);
