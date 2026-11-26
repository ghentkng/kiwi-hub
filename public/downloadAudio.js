const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Runs a command-line program and waits for it to finish
function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
            stdio: "inherit"
        });

        process.on("error", reject);

        process.on("close", code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${command} exited with code ${code}`));
            }
        });
    });
}

// Finds the newest MP3 in the current directory
function newestMp3Filename() {
    const mp3Files = fs.readdirSync("./")
        .filter(file => file.toLowerCase().endsWith(".mp3"))
        .map(file => ({
            name: file,
            time: fs.statSync(file).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

    if (mp3Files.length === 0) {
        throw new Error("No MP3 found in local directory.");
    }

    return mp3Files[0].name;
}

// Converts HH:MM:SS or MM:SS into seconds
function getVideoTimeInSeconds(timestamp) {
    const parts = timestamp.split(":").map(Number);

    if (
        (parts.length !== 2 && parts.length !== 3) ||
        parts.some(part => !Number.isFinite(part) || part < 0)
    ) {
        throw new Error("Invalid timestamp. Use MM:SS or HH:MM:SS.");
    }

    if (parts.slice(1).some(part => part >= 60)) {
        throw new Error("Minutes and seconds must be less than 60.");
    }

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return parts[0] * 60 + parts[1];
}

// Downloads audio from a supported multimedia URL
async function downloadAudio(ytUrl) {
    const args = [
        "--format", "bestaudio/best",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "--no-playlist",
        ytUrl
    ];

    await runCommand("yt-dlp", args);
}

// Trims an MP3 using FFmpeg
async function getTrimmed(mp3Filename, initial, final = "") {
    if (!mp3Filename) {
        throw new Error("No MP3 found in local directory.");
    }

    const startTime = getVideoTimeInSeconds(initial);
    const outputFilename =
        mp3Filename.replace(/\.mp3$/i, "") + " - TRIM.mp3";

    const args = [
        "-y",
        "-i", mp3Filename,
        "-ss", String(startTime)
    ];

    if (final) {
        const endTime = getVideoTimeInSeconds(final);

        if (endTime <= startTime) {
            throw new Error("End timestamp must be after start timestamp.");
        }

        const duration = endTime - startTime;
        args.push("-t", String(duration));
    }

    args.push(
        "-vn",
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        outputFilename
    );

    console.log(`Beginning trimming process for ${mp3Filename}`);
    console.log(`Starting from ${initial}`);

    if (final) {
        console.log(`Up to ${final}`);
    } else {
        console.log("Trimming to the end of the audio.");
    }

    await runCommand("ffmpeg", args);

    console.log(`Process concluded successfully. Saving as ${outputFilename}`);

    return outputFilename;
}

// Main program
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log("Please provide a multimedia-platform URL.");
        console.log("Usage: node downloadAudio.js URL [start] [end]");
        return;
    }

    const ytUrl = args[0];

    await downloadAudio(ytUrl);

    // If no start time was provided, stop after downloading
    if (!args[1]) {
        return;
    }

    const initial = args[1];
    const final = args[2] || "";

    const filename = newestMp3Filename();

    await getTrimmed(filename, initial, final);
}

main().catch(error => {
    console.error("Error:", error.message);
    process.exitCode = 1;
});