import axios from 'axios';
import * as dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { addSeries, getSonarrQualityProfiles, isSeriesInSonarr } from './sonarr';
import { addMovie, getRadarrQualityProfiles, isMovieInRadarr } from './radarr';
dotenv.config();

// Load environment variables from .env file
const RADARR_URL = process.env.RADARR_URL;
const RADARR_API_KEY = process.env.RADARR_API_KEY;
const SONARR_URL = process.env.SONARR_URL;
const SONARR_API_KEY = process.env.SONARR_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Initialize the Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN!, { polling: true });

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
            return "Movie/TV Show is NOT available, but can be put on the download list.";
        }
    } catch (error) {
        console.error('Error determining media type:', error);
        return "Error checking media availability.";
    }
}

// Function to determine if the IMDb ID is a movie or series and add it
async function addMedia(imdbId: string, qualityProfileId: number): Promise<string> {
    try {
        const searchSeriesResponse = await axios.get(`${SONARR_URL}/api/v3/series/lookup?term=imdb:${imdbId}`, {
            headers: {
                'X-Api-Key': SONARR_API_KEY
            }
        });

        const searchMovieResponse = await axios.get(`${RADARR_URL}/api/v3/movie/lookup/imdb/${imdbId}`, {
            headers: {
                'X-Api-Key': RADARR_API_KEY
            }
        });

        if (searchSeriesResponse.data.length > 0) {
            return await addSeries(imdbId, qualityProfileId);
        } else if (searchMovieResponse.data) {
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
    // @ts-expect-error
    const imdbId = match[1];

    const result = await checkMedia(imdbId);
    bot.sendMessage(chatId, result);
});

// Telegram bot command to add media
bot.onText(/\/download (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    // @ts-expect-error
    const imdbId = match[1];

    const mediaAvailable = await checkMedia(imdbId);
    if (mediaAvailable.includes("available")) {
        bot.sendMessage(chatId, mediaAvailable);
    } else {
        const profiles = await Promise.all([getRadarrQualityProfiles(), getSonarrQualityProfiles()]);
        const qualityProfiles = profiles.flat();
        const options = qualityProfiles.map(profile => ({
            text: `${profile.id} (${profile.name})`,
            callback_data: `quality_${imdbId}_${profile.id}`
        }));

        bot.sendMessage(chatId, "Select a quality profile:", {
            reply_markup: {
                inline_keyboard: [options]
            }
        });
    }
});

// Handle quality profile selection
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    // @ts-expect-error
    const [ , imdbId, profileId ] = callbackQuery.data.split('_');

    const result = await addMedia(imdbId, parseInt(profileId));
    // @ts-expect-error
    bot.sendMessage(msg.chat.id, result);
});
