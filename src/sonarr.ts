import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Load environment variables from .env file
const SONARR_URL = process.env.SONARR_URL;
const SONARR_API_KEY = process.env.SONARR_API_KEY;


// Function to check if the series is already in Sonarr
export async function isSeriesInSonarr(imdbId: string): Promise<boolean> {
    try {
        const response = await axios.get(`${SONARR_URL}/api/v3/series`, {
            headers: {
                'X-Api-Key': SONARR_API_KEY
            }
        });

        const series = response.data;
        return series.some((s: any) => s.imdbId === imdbId);
    } catch (error) {
        console.error('Error checking series:', error);
        return false;
    }
}

// Function to get quality profiles from Sonarr
export async function getSonarrQualityProfiles() {
    try {
        const response = await axios.get(`${SONARR_URL}/api/v3/qualityProfile`, {
            headers: {
                'X-Api-Key': SONARR_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching Sonarr quality profiles:', error);
        return [];
    }
}

// Function to add a series to Sonarr
export async function addSeries(imdbId: string, qualityProfileId: number) {
    try {
        const exists = await isSeriesInSonarr(imdbId);
        if (exists) {
            return "Series is already available.";
        }

        const searchResponse = await axios.get(`${SONARR_URL}/api/v3/series/lookup?term=imdb:${imdbId}`, {
            headers: {
                'X-Api-Key': SONARR_API_KEY
            }
        });

        const seriesData = searchResponse.data[0];
        if (!seriesData) {
            return "Series not found in Sonarr database.";
        }

        await axios.post(`${SONARR_URL}/api/v3/series`, {
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
    } catch (error) {
        console.error('Error adding series:', error);
        return "Error adding series.";
    }
}