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
const dotenv = __importStar(require("dotenv"));
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const sonarr_1 = require("./sonarr");
const radarr_1 = require("./radarr");
dotenv.config();
// Load environment variables from .env file
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_KEYS = ["userkeyamazingworkz"];
// Initialize the Telegram bot
const bot = new node_telegram_bot_api_1.default(TELEGRAM_BOT_TOKEN, { polling: true });
function delayResponse(chatId, message, options) {
    setTimeout(() => {
        bot.sendMessage(chatId, message, options);
    }, 300);
}
function extractIMDBId(match) {
    const imdbIdOrUrl = match;
    const regex = /(tt\d+)/;
    const imdbIdMatch = imdbIdOrUrl === null || imdbIdOrUrl === void 0 ? void 0 : imdbIdOrUrl.match(regex);
    const imdbId = imdbIdMatch && (imdbIdMatch === null || imdbIdMatch === void 0 ? void 0 : imdbIdMatch[1]) ? imdbIdMatch[1] : undefined;
    return imdbId;
}
function extractAllowedKeys(match) {
    const imdbIdOrUrl = match;
    const regex = /^(\S+)/;
    const userKeyMatch = imdbIdOrUrl === null || imdbIdOrUrl === void 0 ? void 0 : imdbIdOrUrl.match(regex);
    const userKey = userKeyMatch && (userKeyMatch === null || userKeyMatch === void 0 ? void 0 : userKeyMatch[1]) ? userKeyMatch[1] : undefined;
    return userKey;
}
function isMediaTracked(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        const seriesExists = yield (0, sonarr_1.isSeriesInSonarr)(imdbId);
        const movieExists = yield (0, radarr_1.isMovieInRadarr)(imdbId);
        return {
            exists: seriesExists || movieExists,
            seriesExists,
            movieExists
        };
    });
}
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
                return "Media is not available. You CAN track it.";
            }
        }
        catch (error) {
            console.error('Error determining media type:', error);
            return "Error checking media availability.";
        }
    });
}
// Function to determine if the IMDb ID is a movie or series and add it
function addMedia(imdbId, qualityProfileId, service) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (service === "sonarr") {
                return yield (0, sonarr_1.addSeries)(imdbId, qualityProfileId);
            }
            else if (service === "radarr") {
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
    const imdbId = extractIMDBId(match === null || match === void 0 ? void 0 : match[1]);
    if (imdbId) {
        const result = yield checkMedia(imdbId);
        bot.sendMessage(chatId, result);
        return;
    }
    delayResponse(chatId, "IMDB.com ID or URL is invalid. Provide an ID starting with 'tt' (e.g. tt0903747) or an IMDB url of a movie or tv show");
    // bot.sendMessage(chatId, "IMDB.com ID or URL is invalid. Provide an ID starting with 'tt' (e.g. tt0903747) or an IMDB url of a movie or tv show");
}));
// Telegram bot command to add media
bot.onText(/\/track (.+)/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const imdbId = extractIMDBId(match === null || match === void 0 ? void 0 : match[1]);
    // console.log("match?.[1]", match?.[1])
    // const userHasKey = ALLOWED_KEYS.includes(match?.[1])
    // console.log("extractAllowedKeys(match?.[1])", extractAllowedKeys(match?.[1]))
    // @ts-expect-error
    const userHasKey = ALLOWED_KEYS.includes(extractAllowedKeys(match === null || match === void 0 ? void 0 : match[1]));
    if (imdbId && userHasKey) {
        const { exists, movieExists } = yield isMediaTracked(imdbId);
        console.log({ exists, movieExists });
        if (exists) {
            bot.sendMessage(chatId, "Media is available");
        }
        else {
            // const profiles = await Promise.all([getRadarrQualityProfiles(), getSonarrQualityProfiles()]);
            const isSeries = yield (0, sonarr_1.checkSeriesIMDB)(imdbId);
            const profiles = yield (Boolean(isSeries) ? (0, sonarr_1.getSonarrQualityProfiles)() : (0, radarr_1.getRadarrQualityProfiles)());
            // @ts-expect-error
            const qualityProfiles = profiles.flat().filter(({ name }) => ['any', 'hd-1080p', 'ultra-hd'].includes(name.toLowerCase()));
            // @ts-expect-error
            const options = qualityProfiles.map(profile => ({
                text: `${profile.name}`,
                callback_data: `quality_${imdbId}_${profile.id}_${isSeries ? "sonarr" : "radarr"}`
            }));
            delayResponse(chatId, "Select a quality profile:", {
                reply_markup: {
                    inline_keyboard: [options]
                }
            });
            // bot.sendMessage(chatId, "Select a quality profile:", {
            //     reply_markup: {
            //         inline_keyboard: [options]
            //     }
            // });
        }
        return;
    }
    if (!userHasKey) {
        delayResponse(chatId, `[You shall not pass!!!](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW12OXRvaDVtbHN0eTF0aWx2enAwNmF2cW40M3owZXFmYXFpM2ZwcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8abAbOrQ9rvLG/giphy.gif)`, { parse_mode: 'Markdown' });
        return;
    }
    delayResponse(chatId, "IMDB.com ID or URL is invalid. Provide an ID starting with 'tt' (e.g. tt0903747) or an IMDB url of a movie or tv show");
}));
// Handle quality profile selection
bot.on('callback_query', (callbackQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const msg = callbackQuery.message;
    // @ts-expect-error
    const [, imdbId, profileId, service] = callbackQuery.data.split('_');
    console.log([, imdbId, profileId, service]);
    // @ts-expect-error
    const result = yield addMedia(imdbId, parseInt(profileId), service);
    // @ts-expect-error
    // bot.sendMessage(msg.chat.id, result);
    delayResponse(msg.chat.id, result);
}));
// Telegram bot command to check media availability
bot.onText(/\/help/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
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
`);
}));
// // Handle quality profile selection
// bot.on('message', async (msg) => {
//     console.log(msg)
// });
