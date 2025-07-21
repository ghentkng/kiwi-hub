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

        // Save on input
        textarea.addEventListener('input', () => {
            localStorage.setItem(getStorageKey(dateStr), textarea.value);
        });

        dayDiv.appendChild(label);
        dayDiv.appendChild(textarea);
        weekDiv.appendChild(dayDiv);
    }

    return weekDiv;
}


function renderCalendar() {
const container = document.getElementById('calendar-container');
container.innerHTML = '';

const today = new Date();
const currentMonday = getMonday(today);
const nextMonday = new Date(currentMonday);
nextMonday.setDate(currentMonday.getDate() + 7);

const currentWeek = generateWeek(currentMonday);
const nextWeek = generateWeek(nextMonday);

container.appendChild(currentWeek);
container.appendChild(nextWeek);
}

document.addEventListener('DOMContentLoaded', renderCalendar);
