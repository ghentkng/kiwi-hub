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

// ✅ Move the regex to global scope so it's usable in multiple functions
const markdownLinkRegex = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

function renderAliasLinks(textarea, container) {
    container.innerHTML = '';
    const lines = textarea.value.split('\n');

    for (const line of lines) {
        const match = line.match(markdownLinkRegex);
        if (match) {
            const [_, label, url] = match;
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.textContent = label;
            link.style.display = 'block';
            container.appendChild(link);
        }
    }
}

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

        const textarea = document.createElement('textarea');
        textarea.className = 'calendar-note';
        textarea.setAttribute('data-date', dateStr);
        textarea.placeholder = "Add notes or links...";
        textarea.value = localStorage.getItem(getStorageKey(dateStr)) || '';

        const aliasContainer = document.createElement('div');
        aliasContainer.className = 'alias-links';

        renderAliasLinks(textarea, aliasContainer);

        let lastRenderedAlias = '';

    textarea.addEventListener('input', () => {
        const val = textarea.value.trim();
        localStorage.setItem(getStorageKey(dateStr), val);
        renderAliasLinks(textarea, aliasContainer);
        
        // Only auto-toggle display if it's just a single alias line
        const lines = val.split('\n');
        if (lines.length === 1 && markdownLinkRegex.test(lines[0])) {
            lastRenderedAlias = val;
        } else {
            lastRenderedAlias = '';
        }
    });

    textarea.addEventListener('blur', () => {
        const val = textarea.value.trim();
        if (val === lastRenderedAlias && markdownLinkRegex.test(val)) {
            // Only hide if the user hasn't changed anything
            aliasContainer.style.display = 'block';
            textarea.style.display = 'none';
        }
    });



        aliasContainer.addEventListener('click', () => {
            aliasContainer.style.display = 'none';
            textarea.style.display = 'block';
            textarea.focus();
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'day-wrapper';
        wrapper.appendChild(textarea);
        wrapper.appendChild(aliasContainer);

        dayDiv.appendChild(label);
        dayDiv.appendChild(wrapper);
        weekDiv.appendChild(dayDiv);

        // Initial toggle
        if (markdownLinkRegex.test(textarea.value.trim())) {
            textarea.style.display = 'none';
            aliasContainer.style.display = 'block';
        } else {
            aliasContainer.style.display = 'none';
        }
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
