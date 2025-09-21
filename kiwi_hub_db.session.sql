--DELETE FROM playlist_queues
--WHERE name = 'Eileen Manzano';
--SELECT * FROM playlist_queues;

--Change a value
/*
UPDATE playlist_queues
SET url = 'https://youtube.com/playlist?list=PLK_45elyJFyHiZYpw8LUXvdUrHIj15IQb&si=hlz94zE8h2fdV6ME'
WHERE name = 'Max A';
*/

--Add new entry to playlist_queues table
/*WITH nextpos AS (
SELECT COALESCE(MAX("position"), 0) + 1 AS pos
FROM playlist_queues
WHERE display_name = '2nd Period'
)
INSERT INTO playlist_queues
(page_name,   button_name,  display_name,  "position", name, url)
SELECT
'cs1planning','button3',  '7th Period', pos, 'Ahmed Bashir','https://youtube.com/playlist?list=PLBK6XPuJsAHt9xMeP8FLSXhx9sEagDLNV&si=9uyjQswnAXzJZBe3'
FROM nextpos;*/

--View entire class period

SELECT name, position, url
FROM public.playlist_queues
WHERE display_name = '1st Period'
ORDER BY position ASC
