"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const sonarr_1 = require("./sonarr");
const radarr_1 = require("./radarr");
dotenv.config();
// Load environment variables from .env file
const RADARR_URL = process.env.RADARR_URL;
const RADARR_API_KEY = process.env.RADARR_API_KEY;
const SONARR_URL = process.env.SONARR_URL;
const SONARR_API_KEY = process.env.SONARR_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Initialize the Telegram bot
const bot = new node_telegram_bot_api_1.default(TELEGRAM_BOT_TOKEN, { polling: true });
// Function to determine if the IMDb ID is a movie or series and check availability
function checkMedia(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const seriesExists = yield (0, sonarr_1.isSeriesInSonarr)(imdbId);
            const movieExists = yield (0, radarr_1.isMovieInRadarr)(imdbId);
            if (seriesExists) {
                return "TV Show is already available.";
            }
            else if (movieExists) {
                return "Movie is already available.";
            }
            else {
                return "Movie/TV Show is NOT available, but can be put on the download list.";
            }
        }
        catch (error) {
            console.error('Error determining media type:', error);
            return "Error checking media availability.";
        }
    });
}
// Function to determine if the IMDb ID is a movie or series and add it
function addMedia(imdbId, qualityProfileId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const searchSeriesResponse = yield axios_1.default.get(`${SONARR_URL}/api/v3/series/lookup?term=imdb:${imdbId}`, {
                headers: {
                    'X-Api-Key': SONARR_API_KEY
                }
            });
            const searchMovieResponse = yield axios_1.default.get(`${RADARR_URL}/api/v3/movie/lookup/imdb/${imdbId}`, {
                headers: {
                    'X-Api-Key': RADARR_API_KEY
                }
            });
            if (searchSeriesResponse.data.length > 0) {
                return yield (0, sonarr_1.addSeries)(imdbId, qualityProfileId);
            }
            else if (searchMovieResponse.data) {
                return yield (0, radarr_1.addMovie)(imdbId, qualityProfileId);
            }
            else {
                return "Media not found in Sonarr or Radarr database.";
            }
        }
        catch (error) {
            console.error('Error determining media type:', error);
            return "Error adding media.";
        }
    });
}
// Telegram bot command to check media availability
bot.onText(/\/check (.+)/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    // @ts-expect-error
    const imdbId = match[1];
    const result = yield checkMedia(imdbId);
    bot.sendMessage(chatId, result);
}));
// Telegram bot command to add media
bot.onText(/\/download (.+)/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    // @ts-expect-error
    const imdbId = match[1];
    const mediaAvailable = yield checkMedia(imdbId);
    if (mediaAvailable.includes("available")) {
        bot.sendMessage(chatId, mediaAvailable);
    }
    else {
        const profiles = yield Promise.all([(0, radarr_1.getRadarrQualityProfiles)(), (0, sonarr_1.getSonarrQualityProfiles)()]);
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
}));
// Handle quality profile selection
bot.on('callback_query', (callbackQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const msg = callbackQuery.message;
    // @ts-expect-error
    const [, imdbId, profileId] = callbackQuery.data.split('_');
    const result = yield addMedia(imdbId, parseInt(profileId));
    // @ts-expect-error
    bot.sendMessage(msg.chat.id, result);
}));
