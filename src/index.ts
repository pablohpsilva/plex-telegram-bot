import axios from 'axios';
import * as dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { addSeries, checkSeriesIMDB, getSonarrQualityProfiles, isSeriesInSonarr } from './sonarr';
import { addMovie, checkMovieIMDB, getMovieData, getRadarrQualityProfiles, isMovieInRadarr } from './radarr';
dotenv.config();

// Load environment variables from .env file
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_KEYS = ["userkeyamazingworkz"]

// Initialize the Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN!, { polling: true });

function delayResponse(chatId:TelegramBot.ChatId, message: string, options?: TelegramBot.SendMessageOptions) {
    setTimeout(() => {
        bot.sendMessage(chatId, message, options);
    }, 300);
}

function extractIMDBId(match: string | undefined | null) {
    const imdbIdOrUrl = match;
    const regex = /(tt\d+)/;
    const imdbIdMatch = imdbIdOrUrl?.match(regex);

    const imdbId = imdbIdMatch && imdbIdMatch?.[1] ? imdbIdMatch[1] : undefined

    return imdbId
}

function extractAllowedKeys(match: string | undefined | null) {
    const imdbIdOrUrl = match;
    const regex = /^(\S+)/;
    const userKeyMatch = imdbIdOrUrl?.match(regex);

    const userKey = userKeyMatch && userKeyMatch?.[1] ? userKeyMatch[1] : undefined

    return userKey
}

async function isMediaTracked(imdbId: string): Promise<{
    exists: boolean,
    seriesExists: boolean,
    movieExists: boolean
}> {
    const seriesExists = await isSeriesInSonarr(imdbId);
    const movieExists = await isMovieInRadarr(imdbId);

    return {
        exists: seriesExists || movieExists,
        seriesExists,
        movieExists
    }
}

// Function to determine if the IMDb ID is a movie or series and check availability
async function checkMedia(imdbId: string): Promise<string> {
    try {
        const seriesExists = await isSeriesInSonarr(imdbId);
        const movieExists = await isMovieInRadarr(imdbId);

        if (seriesExists) {
            return "TV Show is already available.";
        } else if (movieExists) {
            return "Movie is already available.";
        } else {
            return "Media is not available. You CAN track it.";
        }
    } catch (error) {
        console.error('Error determining media type:', error);
        return "Error checking media availability.";
    }
}

// Function to determine if the IMDb ID is a movie or series and add it
async function addMedia(imdbId: string, qualityProfileId: number, service: "sonarr" | "radarr"): Promise<string> {
    try {
        if (service === "sonarr") {
            return await addSeries(imdbId, qualityProfileId);
        } else if (service === "radarr") {
            return await addMovie(imdbId, qualityProfileId);
        } else {
            return "Media not found in Sonarr or Radarr database.";
        }
    } catch (error) {
        console.error('Error determining media type:', error);
        return "Error adding media.";
    }
}


// Telegram bot command to check media availability
bot.onText(/\/check (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const imdbId = extractIMDBId(match?.[1])

    if (imdbId) {
        const result = await checkMedia(imdbId);
        bot.sendMessage(chatId, result);
        return
    }

    delayResponse(chatId, "IMDB.com ID or URL is invalid. Provide an ID starting with 'tt' (e.g. tt0903747) or an IMDB url of a movie or tv show")
    // bot.sendMessage(chatId, "IMDB.com ID or URL is invalid. Provide an ID starting with 'tt' (e.g. tt0903747) or an IMDB url of a movie or tv show");
});

// Telegram bot command to add media
bot.onText(/\/track (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const imdbId = extractIMDBId(match?.[1])
    // console.log("match?.[1]", match?.[1])
    // const userHasKey = ALLOWED_KEYS.includes(match?.[1])
    // console.log("extractAllowedKeys(match?.[1])", extractAllowedKeys(match?.[1]))
    // @ts-expect-error
    const userHasKey = ALLOWED_KEYS.includes(extractAllowedKeys(match?.[1]))

    if (imdbId && userHasKey) {
        const { exists, movieExists } = await isMediaTracked(imdbId);
        console.log({ exists, movieExists })
        if (exists) {
            bot.sendMessage(chatId, "Media is available");
        } else {
            // const profiles = await Promise.all([getRadarrQualityProfiles(), getSonarrQualityProfiles()]);
            const isSeries = await checkSeriesIMDB(imdbId);
            console.log("isSeries", isSeries)
            const profiles: any = await (Boolean(isSeries) ? getSonarrQualityProfiles() : getRadarrQualityProfiles());
            // @ts-expect-error
            const qualityProfiles = profiles.flat().filter(({ name }) => ['any', 'hd-1080p', 'ultra-hd'].includes(name.toLowerCase()))
            // @ts-expect-error
            const options = qualityProfiles.map(profile => ({
                text: `${profile.name}`,
                callback_data: `quality_${imdbId}_${profile.id}_${isSeries ? "sonarr" : "radarr"}`
            }));

            delayResponse(chatId, "Select a quality profile:", {
                reply_markup: {
                    inline_keyboard: [options]
                }
            })

            // bot.sendMessage(chatId, "Select a quality profile:", {
            //     reply_markup: {
            //         inline_keyboard: [options]
            //     }
            // });
        }
        return
    }

    if(!userHasKey) {
        delayResponse(chatId, `[You shall not pass!!!](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW12OXRvaDVtbHN0eTF0aWx2enAwNmF2cW40M3owZXFmYXFpM2ZwcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8abAbOrQ9rvLG/giphy.gif)`, { parse_mode: 'Markdown' });
        return
    }

    delayResponse(chatId, "IMDB.com ID or URL is invalid. Provide an ID starting with 'tt' (e.g. tt0903747) or an IMDB url of a movie or tv show");
});

// Handle quality profile selection
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    // @ts-expect-error
    const [, imdbId, profileId, service] = callbackQuery.data.split('_');

    console.log([, imdbId, profileId, service])

    // @ts-expect-error
    const result = await addMedia(imdbId, parseInt(profileId), service);
    // @ts-expect-error
    // bot.sendMessage(msg.chat.id, result);
    delayResponse(msg.chat.id, result)
});

// Telegram bot command to check media availability
bot.onText(/\/help/, async (msg, match) => {
    const chatId = msg.chat.id;
    // const imdbId = match[1];

    // const result = await checkMedia(imdbId);
    // bot.sendMessage(chatId, result);
    bot.sendMessage(chatId, `Here's a list of all commands you can use:

/check {IMDBID/IMDB URL}.
Description: Check if media is tracked.
Example:
  /check tt0903747
  /check https://m.imdb.com/title/tt0903747


/track {userkey} {IMDBID/IMDB URL}
Description: Track media via Plex.
Example:
  /track ukey-* tt0903747
`)
});

// // Handle quality profile selection
// bot.on('message', async (msg) => {
//     console.log(msg)
// });

