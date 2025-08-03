// --- Get page name from query string ---
const urlParams = new URLSearchParams(window.location.search);
const pageName = urlParams.get('page');

document.addEventListener('DOMContentLoaded', () => {
    loadPlaylistManagement();
});

// --- Load and render playlist management UI ---
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