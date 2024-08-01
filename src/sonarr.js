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
exports.isSeriesInSonarr = isSeriesInSonarr;
exports.getSonarrQualityProfiles = getSonarrQualityProfiles;
exports.addSeries = addSeries;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Load environment variables from .env file
const SONARR_URL = process.env.SONARR_URL;
const SONARR_API_KEY = process.env.SONARR_API_KEY;
// Function to check if the series is already in Sonarr
function isSeriesInSonarr(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${SONARR_URL}/api/v3/series`, {
                headers: {
                    'X-Api-Key': SONARR_API_KEY
                }
            });
            const series = response.data;
            return series.some((s) => s.imdbId === imdbId);
        }
        catch (error) {
            console.error('Error checking series:', error);
            return false;
        }
    });
}
// Function to get quality profiles from Sonarr
function getSonarrQualityProfiles() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${SONARR_URL}/api/v3/qualityProfile`, {
                headers: {
                    'X-Api-Key': SONARR_API_KEY
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error fetching Sonarr quality profiles:', error);
            return [];
        }
    });
}
// Function to add a series to Sonarr
function addSeries(imdbId, qualityProfileId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const exists = yield isSeriesInSonarr(imdbId);
            if (exists) {
                return "Series is already available.";
            }
            const searchResponse = yield axios_1.default.get(`${SONARR_URL}/api/v3/series/lookup?term=imdb:${imdbId}`, {
                headers: {
                    'X-Api-Key': SONARR_API_KEY
                }
            });
            const seriesData = searchResponse.data[0];
            if (!seriesData) {
                return "Series not found in Sonarr database.";
            }
            yield axios_1.default.post(`${SONARR_URL}/api/v3/series`, {
                title: seriesData.title,
                qualityProfileId: qualityProfileId,
                titleSlug: seriesData.titleSlug,
                images: seriesData.images,
                tvdbId: seriesData.tvdbId,
                year: seriesData.year,
                rootFolderPath: '/path/to/your/series', // Change this to your series directory
                monitored: true,
                addOptions: {
                    searchForMissingEpisodes: true
                }
            }, {
                headers: {
                    'X-Api-Key': SONARR_API_KEY
                }
            });
            return "Series added successfully.";
        }
        catch (error) {
            console.error('Error adding series:', error);
            return "Error adding series.";
        }
    });
}
