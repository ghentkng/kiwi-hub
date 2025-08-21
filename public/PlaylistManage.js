    // PlaylistManage.js (popup)
    console.log('PlaylistManage.js loaded');

    document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const pageName = params.get('page'); // e.g., "CS1Planning"
    const container = document.getElementById('playlist-management');

    if (!container) {
        console.error('Missing #playlist-management container in popup HTML.');
        return;
    }
    if (!pageName) {
        container.textContent = 'No page specified.';
        return;
    }

    // Normalize any "Button1" / "button 1" / "BUTTON2" -> "button1|2|3"
    function normalizeButtonName(name) {
        const m = String(name || '').trim().match(/^button\s*([123])$/i);
        return m ? `button${m[1]}` : '';
    }

    async function loadPlaylists() {
        container.innerHTML = 'Loading...';

        let playlists = [];
        try {
        const res = await fetch(`/playlists/${encodeURIComponent(pageName)}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
        playlists = await res.json();
        } catch (err) {
        console.error('Failed to load playlists:', err);
        container.innerHTML = `<div style="color:#b00020">Couldn’t load playlists for “${pageName}”. Check server logs.</div>`;
        return;
        }

        // Canonical groups in fixed order
        const groups = {
        button1: { display_name: '', items: [] },
        button2: { display_name: '', items: [] },
        button3: { display_name: '', items: [] }
        };

        // Fill groups
        playlists.forEach(pl => {
        const key = normalizeButtonName(pl.button_name);
        if (!groups[key]) return;
        if (!groups[key].display_name && pl.display_name) {
            groups[key].display_name = pl.display_name;
        }
        groups[key].items.push(pl);
        });

        // Render UI
        container.innerHTML = '';

        ['button1', 'button2', 'button3'].forEach(key => {
        const section = document.createElement('div');
        section.style.marginBottom = '1em';
        section.style.padding = '0.75em';
        section.style.border = '1px solid #ddd';
        section.style.borderRadius = '8px';

        const human = key.replace('button', 'Button ');

        // Heading
        const heading = document.createElement('h4');
        heading.textContent = human;
        heading.style.margin = '0 0 0.5em 0';
        section.appendChild(heading);

        // Display name controls
        const displayWrap = document.createElement('div');
        displayWrap.style.margin = '0 0 0.5em 0';

        const displayLabel = document.createElement('label');
        displayLabel.textContent = `${human} Display Name: `;
        displayLabel.style.marginRight = '0.5em';

        const displayInput = document.createElement('input');
        displayInput.type = 'text';
        displayInput.value = groups[key].display_name || '';
        displayInput.placeholder = 'Enter display name';

        displayInput.addEventListener('change', async () => {
            try {
            const res = await fetch(`/playlists/${encodeURIComponent(pageName)}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                action: 'setDisplayName',
                button_name: key, // canonical lowercase
                display_name: displayInput.value
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await loadPlaylists();
            } catch (e) {
            alert('Failed to set display name.');
            console.error(e);
            }
        });

        displayWrap.appendChild(displayLabel);
        displayWrap.appendChild(displayInput);
        section.appendChild(displayWrap);

        // Existing playlists
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        groups[key].items.forEach(pl => {
            const li = document.createElement('li');
            li.style.display = 'grid';
            li.style.gridTemplateColumns = '1fr 1fr auto auto';
            li.style.gap = '0.5em';
            li.style.alignItems = 'center';
            li.style.marginBottom = '0.5em';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = pl.name || '';
            nameInput.placeholder = 'Playlist name';

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = pl.url || '';
            urlInput.placeholder = 'YouTube URL';

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`/playlists/${encodeURIComponent(pageName)}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    button_name: key, // canonical lowercase
                    playlist: {
                    id: pl.id,
                    name: nameInput.value,
                    url: urlInput.value
                    }
                })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await loadPlaylists();
            } catch (e) {
                alert('Failed to save playlist.');
                console.error(e);
            }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', async () => {
            if (!confirm('Delete this playlist?')) return;
            try {
                console.log("🧪 Sending delete request with:", {
    page: pageName,
    action: 'delete',
    button_name: key,
    playlist: { id: pl.id }

});

console.log("💥 POSTing to:", `/playlists/${pageName}/manage`);


                const res = await fetch(`/playlists/${encodeURIComponent(pageName)}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    button_name: key, // canonical lowercase
                    playlist: { id: pl.id }
                })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await loadPlaylists();
            } catch (e) {
                alert('Failed to delete playlist.');
                console.error(e);
            }
            });

            li.appendChild(nameInput);
            li.appendChild(urlInput);
            li.appendChild(saveBtn);
            li.appendChild(delBtn);
            list.appendChild(li);
        });

        section.appendChild(list);

        // Add new playlist row
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add Playlist';
        addBtn.addEventListener('click', async () => {
            try {
            const res = await fetch(`/playlists/${encodeURIComponent(pageName)}/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                action: 'add',
                button_name: key, // canonical lowercase
                display_name: displayInput.value,
                playlist: { name: 'New Playlist', url: '' }
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await loadPlaylists();
            } catch (e) {
            alert('Failed to add playlist.');
            console.error(e);
            }
        });
        section.appendChild(addBtn);

        container.appendChild(section);
        });
    }

    // Initial load
    loadPlaylists();

    // Close button behavior
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
        if (window.opener && typeof window.opener.loadPlaylistButtons === 'function') {
            // Refresh buttons on main page
            try { window.opener.loadPlaylistButtons(); } catch (e) { /* no-op */ }
        }
        window.close();
        });
    }
    });
