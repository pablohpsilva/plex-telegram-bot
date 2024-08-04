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
exports.checkMovieIMDB = checkMovieIMDB;
exports.isMovieInRadarr = isMovieInRadarr;
exports.getRadarrQualityProfiles = getRadarrQualityProfiles;
exports.getMovieData = getMovieData;
exports.addMovie = addMovie;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Load environment variables from .env file
const RADARR_URL = process.env.RADARR_URL;
const RADARR_API_KEY = process.env.RADARR_API_KEY;
function checkMovieIMDB(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // const searchResponse = await axios.get(`${RADARR_URL}/api/v3/series/lookup/tmdb?tmdbId=${imdbId}`, {
            const searchResponse = yield axios_1.default.get(`${RADARR_URL}/api/v3/movie/lookup?term=imdb:${imdbId}`, {
                headers: {
                    'X-Api-Key': RADARR_API_KEY
                }
            });
            console.log(searchResponse.data);
            return searchResponse.data;
        }
        catch (error) {
            console.error('Error querying Radarr API:', error);
        }
    });
}
// Function to check if the movie is already in Radarr
function isMovieInRadarr(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${RADARR_URL}/api/v3/movie`, {
                headers: {
                    'X-Api-Key': RADARR_API_KEY
                }
            });
            const movies = response.data;
            return movies.some((movie) => movie.imdbId === imdbId);
        }
        catch (error) {
            console.error('Error checking movie:', error);
            return false;
        }
    });
}
// Function to get quality profiles from Radarr
function getRadarrQualityProfiles() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${RADARR_URL}/api/v3/qualityProfile`, {
                headers: {
                    'X-Api-Key': RADARR_API_KEY
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error fetching Radarr quality profiles:', error);
            return [];
        }
    });
}
function getMovieData(imdbId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const searchResponse = yield axios_1.default.get(`${RADARR_URL}/api/v3/movie/lookup?term=imdb:${imdbId}`, {
            headers: {
                'X-Api-Key': RADARR_API_KEY
            }
        });
        const movieData = (_a = searchResponse.data) === null || _a === void 0 ? void 0 : _a[0];
        return movieData;
    });
}
// Function to add a movie to Radarr
function addMovie(imdbId, qualityProfileId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const exists = yield isMovieInRadarr(imdbId);
            if (exists) {
                return "Movie is already available.";
            }
            // const searchResponse = await axios.get(`${RADARR_URL}/api/v3/movie/lookup/imdb/${imdbId}`, {
            //     headers: {
            //         'X-Api-Key': RADARR_API_KEY
            //     }
            // });
            // const movieData = searchResponse.data;
            const movieData = yield getMovieData(imdbId);
            if (!movieData) {
                return "Movie not found in Radarr database.";
            }
            yield axios_1.default.post(`${RADARR_URL}/api/v3/movie`, {
                title: movieData.title,
                qualityProfileId: qualityProfileId,
                titleSlug: movieData.titleSlug,
                images: movieData.images,
                tmdbId: movieData.tmdbId,
                year: movieData.year,
                rootFolderPath: '/Volumes/HDD2/Movies', // Change this to your movies directory
                monitored: true,
                addOptions: {
                    searchForMovie: true
                }
            }, {
                headers: {
                    'X-Api-Key': RADARR_API_KEY
                }
            });
            return "Movie added successfully.";
        }
        catch (error) {
            console.error('Error adding movie:', error);
            return "Error adding movie.";
        }
    });
}
