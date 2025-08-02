/**
 * Weather Service
 * Integrates with OpenWeatherMap API to provide restaurant-focused weather data
 *
 * Features:
 * - Hourly forecasts during business hours
 * - Current conditions
 * - Address-based geocoding
 * - Weather alerts and conditions relevant to restaurant operations
 */
import { InvocationContext } from '@azure/functions';
interface WeatherLocation {
    lat: number;
    lon: number;
    name: string;
    country: string;
    state?: string;
}
interface WeatherCondition {
    id: number;
    main: string;
    description: string;
    icon: string;
}
interface HourlyWeather {
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: WeatherCondition[];
    pop: number;
    rain?: {
        '1h': number;
    };
    snow?: {
        '1h': number;
    };
}
interface CurrentWeather {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: WeatherCondition[];
}
interface WeatherAlert {
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
}
interface RestaurantWeatherData {
    location: WeatherLocation;
    current: CurrentWeather;
    hourly: HourlyWeather[];
    alerts?: WeatherAlert[];
    businessHoursWeather: {
        hour: string;
        temp: number;
        feels_like: number;
        condition: string;
        icon: string;
        precipProbability: number;
        windSpeed: number;
        humidity: number;
    }[];
    weatherSummary: {
        avgTemp: number;
        maxTemp: number;
        minTemp: number;
        precipChance: number;
        dominantCondition: string;
        customerTrafficImpact: 'positive' | 'neutral' | 'negative';
        staffingRecommendation: string;
    };
}
export declare class WeatherService {
    private static instance;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly geocodingCache;
    private constructor();
    static getInstance(): WeatherService;
    /**
     * Get coordinates from address using OpenWeatherMap Geocoding API
     */
    private geocodeAddress;
    /**
     * Get comprehensive weather data for a restaurant location
     */
    getRestaurantWeather(address: string, businessHours: {
        open: string;
        close: string;
    } | null, context?: InvocationContext): Promise<RestaurantWeatherData | null>;
    /**
     * Extract weather data for business hours
     */
    private extractBusinessHoursWeather;
    /**
     * Check if given time is within business hours
     */
    private isWithinBusinessHours;
    /**
     * Generate business-focused weather summary and recommendations
     */
    private generateWeatherSummary;
    /**
     * Get weather icon URL
     */
    getWeatherIconUrl(iconCode: string): string;
    /**
     * Health check for weather service
     */
    healthCheck(context?: InvocationContext): Promise<{
        status: 'healthy' | 'degraded' | 'unavailable';
        hasApiKey: boolean;
        message: string;
    }>;
}
export declare const weatherService: WeatherService;
export { RestaurantWeatherData, WeatherLocation };
//# sourceMappingURL=weatherService.d.ts.map