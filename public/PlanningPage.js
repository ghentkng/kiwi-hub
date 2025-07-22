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

function formatLinksInEditable(div) {
    const text = div.innerText;

    // Pattern to match [label](url)
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

    // Replace with <a> elements
    const html = text.replace(regex, (match, label, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });

    // Set the HTML content
    div.innerHTML = html;
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
