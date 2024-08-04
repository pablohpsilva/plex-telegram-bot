import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Load environment variables from .env file
const RADARR_URL = process.env.RADARR_URL;
const RADARR_API_KEY = process.env.RADARR_API_KEY;

export async function checkMovieIMDB(imdbId: string) {
    try {
        // const searchResponse = await axios.get(`${RADARR_URL}/api/v3/series/lookup/tmdb?tmdbId=${imdbId}`, {
        const searchResponse = await axios.get(`${RADARR_URL}/api/v3/movie/lookup?term=imdb:${imdbId}`, {
            headers: {
                'X-Api-Key': RADARR_API_KEY
            }
        });
        console.log(searchResponse.data);

        return searchResponse.data;
    } catch (error) {
        console.error('Error querying Radarr API:', error);
    }
}


// Function to check if the movie is already in Radarr
export async function isMovieInRadarr(imdbId: string): Promise<boolean> {
    try {
        const response = await axios.get(`${RADARR_URL}/api/v3/movie`, {
            headers: {
                'X-Api-Key': RADARR_API_KEY
            }
        });

        const movies = response.data;
        return movies.some((movie: any) => movie.imdbId === imdbId);
    } catch (error) {
        console.error('Error checking movie:', error);
        return false;
    }
}

// Function to get quality profiles from Radarr
export async function getRadarrQualityProfiles() {
    try {
        const response = await axios.get(`${RADARR_URL}/api/v3/qualityProfile`, {
            headers: {
                'X-Api-Key': RADARR_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching Radarr quality profiles:', error);
        return [];
    }
}

export async function getMovieData(imdbId:string) {
    const searchResponse = await axios.get(`${RADARR_URL}/api/v3/movie/lookup?term=imdb:${imdbId}`, {
        headers: {
            'X-Api-Key': RADARR_API_KEY
        }
    });

    const movieData = searchResponse.data?.[0];

    return movieData
}

// Function to add a movie to Radarr
export async function addMovie(imdbId: string, qualityProfileId: number) {
    try {
        const exists = await isMovieInRadarr(imdbId);
        if (exists) {
            return "Movie is already available.";
        }

        // const searchResponse = await axios.get(`${RADARR_URL}/api/v3/movie/lookup/imdb/${imdbId}`, {
        //     headers: {
        //         'X-Api-Key': RADARR_API_KEY
        //     }
        // });

        // const movieData = searchResponse.data;
        const movieData = await getMovieData(imdbId)
        if (!movieData) {
            return "Movie not found in Radarr database.";
        }

        await axios.post(`${RADARR_URL}/api/v3/movie`, {
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
    } catch (error) {
        console.error('Error adding movie:', error);
        return "Error adding movie.";
    }
}