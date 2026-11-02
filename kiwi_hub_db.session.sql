--View first part of table

--SELECT * FROM submissions
/*LIMIT 10
*/

ALTER TABLE public.submissions SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 50
);
--Delete assignment entry
/*
DELETE FROM submissions
WHERE student_names LIKE '%David%'
    --AND assignment_name = '3.5 Enumerated Data Types'
    --AND assignment_name = '3.6 Assertions'
    --AND assignment_name = '3.7 Unit Testing'
    --AND assignment_name = '3.3 Bit Shifting'
    --AND assignment_name = '5.4 LinkedLists'
    --AND assignment_name = '2.3 Aesthetic Cookie Clicker'
    --AND assignment_name = '1.2 Encapsulation Assignment'
    --AND assignment_name = 'Unit 2 Project'
    --AND assignment_name = '2.1 Inert Cookie Clicker'
    AND assignment_name = '5.2 Ragged Arrays'
*/

--Change assignment entry
/*
UPDATE submissions
SET student_names = 'Dalan, David Chromatography*'
--SET student_names = 'Owen, Russell, Jasiah Chromatography*'
WHERE student_names LIKE '%Dalan%'
    AND assignment_name LIKE '%Unit 0 Project%'
*/

--student playlists info
    --table is called playlist_queues
    --name field holds student names
    --url holds youtube link

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