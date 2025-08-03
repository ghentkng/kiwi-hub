document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const pageName = params.get('page'); // e.g., cs1planning
    const container = document.getElementById('playlist-management');

    if (!pageName) {
        container.textContent = 'No page specified.';
        return;
    }

    // Fetch and render playlists
    async function loadPlaylists() {
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

        container.innerHTML = '';

        // Render section for each button
        Object.keys(grouped).forEach(buttonName => {
            const buttonPlaylists = grouped[buttonName];

            // Section wrapper
            const section = document.createElement('div');
            section.style.marginBottom = '1em';

            // Display name label + input
            const displayLabel = document.createElement('label');
            displayLabel.textContent = `${buttonName} Display Name: `;
            const displayInput = document.createElement('input');
            displayInput.type = 'text';
            displayInput.value = buttonPlaylists[0]?.display_name || '';
            displayInput.placeholder = 'Enter display name';

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
                loadPlaylists(); // refresh
            });

            section.appendChild(displayLabel);
            section.appendChild(displayInput);

            // Playlist list
            const list = document.createElement('ul');
            buttonPlaylists.forEach(pl => {
                const li = document.createElement('li');

                // Playlist name input
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.value = pl.name;
                nameInput.placeholder = 'Playlist name';

                // Playlist URL input
                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.value = pl.url;
                urlInput.placeholder = 'YouTube URL';

                // Save button
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
                    loadPlaylists();
                });

                // Delete button
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
                    loadPlaylists();
                });

                li.appendChild(nameInput);
                li.appendChild(urlInput);
                li.appendChild(saveBtn);
                li.appendChild(delBtn);
                list.appendChild(li);
            });

            section.appendChild(list);

            // Add new playlist button
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
                loadPlaylists();
            });
            section.appendChild(addBtn);

            container.appendChild(section);
        });
    }

    loadPlaylists();
});
