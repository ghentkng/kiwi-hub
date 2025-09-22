async function playNext(displayName) {
    const res = await fetch(`/playlist/${encodeURIComponent(displayName)}/consume-next`, { method: 'POST' });
    const item = await res.json();

    // Open whatever field stores your link (e.g., item.url or item.link)
    // If you serve the URL from another endpoint, use it here instead.
    if (item.url) window.open(item.url, '_blank');

  // Optionally refresh your on-page list after rotation
  // await refreshList(displayName);
}
