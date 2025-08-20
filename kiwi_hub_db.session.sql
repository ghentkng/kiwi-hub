SELECT button_name, COUNT(*) AS n
FROM playlist_queues
WHERE page_name = 'apaplanning'
GROUP BY button_name
ORDER BY button_name;
