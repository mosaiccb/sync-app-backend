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
  pop: number; // Probability of precipitation (0-1)
  rain?: { '1h': number };
  snow?: { '1h': number };
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

export class WeatherService {
  private static instance: WeatherService;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org';
  private readonly geocodingCache = new Map<string, WeatherLocation>();
  
  private constructor() {
    // Get API key from environment variables
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ OpenWeatherMap API key not found. Weather service will be unavailable.');
    }
  }

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * Get coordinates from address using OpenWeatherMap Geocoding API
   */
  private async geocodeAddress(address: string, context?: InvocationContext): Promise<WeatherLocation | null> {
    if (!this.apiKey) {
      context?.warn('Weather service unavailable: No API key configured');
      return null;
    }

    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey)!;
    }

    try {
      const url = `${this.baseUrl}/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${this.apiKey}`;
      context?.log(`🌍 Geocoding address: ${address}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        context?.warn(`No geocoding results found for address: ${address}`);
        return null;
      }

      const location: WeatherLocation = {
        lat: data[0].lat,
        lon: data[0].lon,
        name: data[0].name,
        country: data[0].country,
        state: data[0].state
      };

      // Cache the result
      this.geocodingCache.set(cacheKey, location);
      context?.log(`✅ Geocoded "${address}" to ${location.lat}, ${location.lon}`);
      
      return location;
    } catch (error) {
      context?.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Get comprehensive weather data for a restaurant location
   */
  public async getRestaurantWeather(
    address: string,
    businessHours: { open: string; close: string } | null,
    context?: InvocationContext
  ): Promise<RestaurantWeatherData | null> {
    
    if (!this.apiKey) {
      context?.warn('Weather service unavailable: No API key configured');
      return null;
    }

    try {
      // Step 1: Geocode the address
      const location = await this.geocodeAddress(address, context);
      if (!location) {
        return null;
      }

      // Step 2: Get weather data using One Call API
      const weatherUrl = `${this.baseUrl}/data/3.0/onecall?lat=${location.lat}&lon=${location.lon}&exclude=minutely,daily&units=imperial&appid=${this.apiKey}`;
      context?.log(`🌤️ Fetching weather data for ${location.name}`);

      const weatherResponse = await fetch(weatherUrl);
      if (!weatherResponse.ok) {
        throw new Error(`Weather API failed: ${weatherResponse.status} ${weatherResponse.statusText}`);
      }

      const weatherData = await weatherResponse.json();

      // Step 3: Process business hours weather
      const businessHoursWeather = this.extractBusinessHoursWeather(
        weatherData.hourly,
        businessHours,
        context
      );

      // Step 4: Generate weather summary and business insights
      const weatherSummary = this.generateWeatherSummary(businessHoursWeather, weatherData.current);

      const restaurantWeatherData: RestaurantWeatherData = {
        location,
        current: weatherData.current,
        hourly: weatherData.hourly.slice(0, 24), // Next 24 hours
        alerts: weatherData.alerts,
        businessHoursWeather,
        weatherSummary
      };

      context?.log(`✅ Weather data retrieved for ${location.name}: ${weatherSummary.dominantCondition}, ${weatherSummary.avgTemp}°F avg`);
      return restaurantWeatherData;

    } catch (error) {
      context?.error('Weather service error:', error);
      return null;
    }
  }

  /**
   * Extract weather data for business hours
   */
  private extractBusinessHoursWeather(
    hourlyData: HourlyWeather[],
    businessHours: { open: string; close: string } | null,
    context?: InvocationContext
  ) {
    if (!businessHours) {
      // Default to 10 AM - 10 PM if no business hours provided
      businessHours = { open: '10:00', close: '22:00' };
    }

    const businessHoursWeather = [];
    const now = new Date();
    
    // Parse business hours
    const [openHour, openMin] = businessHours.open.split(':').map(Number);
    const [closeHour, closeMin] = businessHours.close.split(':').map(Number);

    for (const hourData of hourlyData.slice(0, 48)) { // Next 48 hours
      const hourDate = new Date(hourData.dt * 1000);
      const hour = hourDate.getHours();
      const minutes = hourDate.getMinutes();
      
      // Check if this hour falls within business hours
      const isBusinessHour = this.isWithinBusinessHours(hour, minutes, openHour, openMin, closeHour, closeMin);
      
      if (isBusinessHour) {
        businessHoursWeather.push({
          hour: hourDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true,
            weekday: hourDate.getDate() !== now.getDate() ? 'short' : undefined 
          }),
          temp: Math.round(hourData.temp),
          feels_like: Math.round(hourData.feels_like),
          condition: hourData.weather[0].description,
          icon: hourData.weather[0].icon,
          precipProbability: Math.round(hourData.pop * 100),
          windSpeed: Math.round(hourData.wind_speed),
          humidity: hourData.humidity
        });
      }
    }

    context?.log(`📊 Extracted weather for ${businessHoursWeather.length} business hours`);
    return businessHoursWeather;
  }

  /**
   * Check if given time is within business hours
   */
  private isWithinBusinessHours(
    hour: number, 
    minutes: number, 
    openHour: number, 
    openMin: number, 
    closeHour: number, 
    closeMin: number
  ): boolean {
    const currentMinutes = hour * 60 + minutes;
    const openMinutes = openHour * 60 + openMin;
    let closeMinutes = closeHour * 60 + closeMin;
    
    // Handle overnight hours (e.g., 10 PM to 2 AM)
    if (closeMinutes <= openMinutes) {
      closeMinutes += 24 * 60; // Add 24 hours
      if (currentMinutes < openMinutes) {
        return currentMinutes <= (closeMinutes - 24 * 60);
      }
    }
    
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  /**
   * Generate business-focused weather summary and recommendations
   */
  private generateWeatherSummary(businessHoursWeather: any[], currentWeather: CurrentWeather) {
    if (businessHoursWeather.length === 0) {
      return {
        avgTemp: Math.round(currentWeather.temp),
        maxTemp: Math.round(currentWeather.temp),
        minTemp: Math.round(currentWeather.temp),
        precipChance: 0,
        dominantCondition: currentWeather.weather[0].description,
        customerTrafficImpact: 'neutral' as const,
        staffingRecommendation: 'Normal staffing levels recommended'
      };
    }

    const temps = businessHoursWeather.map(h => h.temp);
    const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const precipChance = Math.max(...businessHoursWeather.map(h => h.precipProbability));
    
    // Find dominant weather condition
    const conditions = businessHoursWeather.map(h => h.condition);
    const conditionCounts = conditions.reduce((acc: any, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {});
    const dominantCondition = Object.entries(conditionCounts)
      .sort(([,a]: any, [,b]: any) => b - a)[0][0] as string;

    // Determine customer traffic impact
    let customerTrafficImpact: 'positive' | 'neutral' | 'negative' = 'neutral';
    let staffingRecommendation = 'Normal staffing levels recommended';

    // Weather impact logic for restaurants
    if (precipChance > 70 || dominantCondition.includes('storm') || dominantCondition.includes('heavy')) {
      customerTrafficImpact = 'negative';
      staffingRecommendation = 'Consider reduced staffing - severe weather may decrease foot traffic';
    } else if (avgTemp > 85 || avgTemp < 32) {
      customerTrafficImpact = 'negative';
      staffingRecommendation = 'Extreme temperatures may affect customer comfort - prepare accordingly';
    } else if (avgTemp >= 65 && avgTemp <= 80 && precipChance < 30) {
      customerTrafficImpact = 'positive';
      staffingRecommendation = 'Pleasant weather - consider increasing staffing for higher traffic';
    } else if (precipChance > 30) {
      customerTrafficImpact = 'negative';
      staffingRecommendation = 'Rain likely - expect reduced outdoor seating and delivery challenges';
    }

    return {
      avgTemp,
      maxTemp,
      minTemp,
      precipChance,
      dominantCondition,
      customerTrafficImpact,
      staffingRecommendation
    };
  }

  /**
   * Get weather icon URL
   */
  public getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * Health check for weather service
   */
  public async healthCheck(context?: InvocationContext): Promise<{
    status: 'healthy' | 'degraded' | 'unavailable';
    hasApiKey: boolean;
    message: string;
  }> {
    if (!this.apiKey) {
      return {
        status: 'unavailable',
        hasApiKey: false,
        message: 'OpenWeatherMap API key not configured'
      };
    }

    try {
      // Test API with a simple current weather call for a known location
      const testUrl = `${this.baseUrl}/data/2.5/weather?lat=39.7392&lon=-104.9903&appid=${this.apiKey}`;
      const response = await fetch(testUrl);
      
      if (response.ok) {
        return {
          status: 'healthy',
          hasApiKey: true,
          message: 'Weather service operational'
        };
      } else {
        return {
          status: 'degraded',
          hasApiKey: true,
          message: `API response error: ${response.status}`
        };
      }
    } catch (error) {
      context?.error('Weather service health check failed:', error);
      return {
        status: 'degraded',
        hasApiKey: true,
        message: 'API connection failed'
      };
    }
  }
}

// Export singleton instance
export const weatherService = WeatherService.getInstance();
export { RestaurantWeatherData, WeatherLocation };
