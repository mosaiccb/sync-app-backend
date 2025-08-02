# Weather Dashboard Deployment Guide

## Overview

The Weather Dashboard provides restaurant-specific weather intelligence for each MOD Pizza location, using stored address data to deliver business hours forecasts, customer traffic impact analysis, and staffing recommendations.

## Features

- **Business Hours Weather**: Shows weather forecasts only during restaurant operating hours
- **Customer Traffic Impact**: Analyzes weather effects on customer visits (positive/neutral/negative)
- **Staffing Recommendations**: Provides AI-powered suggestions based on weather conditions
- **Restaurant Intelligence**: Tailored insights for food service operations
- **Address-Based Geocoding**: Uses stored location addresses for precise weather data
- **Real-Time Updates**: Current conditions plus hourly forecasts for business hours

## Prerequisites

### 1. OpenWeatherMap API Key

1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Subscribe to the "One Call API 3.0" (1000 free calls/day)
3. Get your API key from the dashboard

### 2. Store Address Data

Ensure your store configuration database includes:

- Complete street addresses
- Business hours (open/close times)
- Timezone information

## Backend Setup

### 1. Environment Configuration

Add to your `local.settings.json`:

```json
{
  "Values": {
    "OPENWEATHER_API_KEY": "your-openweathermap-api-key-here"
  }
}
```

For Azure deployment, add to Application Settings:

```
OPENWEATHER_API_KEY=your-openweathermap-api-key-here
```

### 2. Function Registration

The weather dashboard function is already registered in `app.ts`:

```typescript
app.http("weatherDashboard", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "weather",
  handler: weatherDashboard,
});
```

### 3. Backend Files Added

- `src/functions/weatherDashboard.ts` - Main API endpoint
- `src/services/weatherService.ts` - Weather intelligence service
- Enhanced store configuration system integration

## Frontend Setup

### 1. Component Integration

The weather dashboard is available at `/weather-dashboard` route in the main navigation.

### 2. Frontend Files Added

- `src/components/WeatherDashboard.tsx` - Main weather dashboard component
- Updated `src/App.tsx` with routing and navigation
- Enhanced `src/services/backendApi.ts` with weather methods

### 3. Navigation

Weather Dashboard appears in the main navigation between "Tips Dashboard" and "PAR Brink Setup".

## API Endpoints

### Get Single Store Weather

```
GET /api/weather?action=get&token={storeToken}
```

**Response:**

```json
{
  "success": true,
  "store": {
    "name": "Store Name",
    "address": "123 Main St, City, State",
    "timezone": "America/Denver",
    "businessHours": { "open": "10:00 AM", "close": "10:00 PM" }
  },
  "weather": {
    "current": { "temp": 75, "condition": "Clear" },
    "businessHoursWeather": [...],
    "weatherSummary": {
      "customerTrafficImpact": "positive",
      "staffingRecommendation": "Consider normal staffing levels..."
    }
  }
}
```

### Get Weather for All Stores in State

```
GET /api/weather?action=list&state=CO
```

### Health Check

```
GET /api/weather?action=health
```

## Weather Intelligence Features

### Customer Traffic Impact Analysis

- **Positive**: Pleasant weather likely to increase foot traffic
- **Neutral**: Weather unlikely to significantly affect customer visits
- **Negative**: Severe weather may reduce customer visits

### Staffing Recommendations

Based on weather conditions and predicted customer impact:

- Suggested staffing adjustments
- Delivery vs. dine-in considerations
- Rush period preparations

### Business Hours Focus

- Only shows weather during restaurant operating hours
- Filters out overnight/closed hours data
- Timezone-aware calculations

## Deployment Steps

### 1. Backend Deployment

1. Set `OPENWEATHER_API_KEY` environment variable
2. Deploy Azure Functions app
3. Test weather endpoint: `/api/weather?action=health`

### 2. Frontend Deployment

1. Build frontend with weather dashboard included
2. Deploy to static web app
3. Verify weather dashboard route accessibility

### 3. Testing

1. **Health Check**: `GET /api/weather?action=health`
2. **Single Store**: `GET /api/weather?action=get&token=test-store-token`
3. **Frontend**: Navigate to `/weather-dashboard`

## Usage Instructions

### For Store Managers

1. Navigate to Weather Dashboard from main menu
2. Select your store location from dropdown
3. View current conditions and business hours forecast
4. Review customer traffic impact and staffing recommendations
5. Use refresh button for updated forecasts

### For Operations Teams

1. Use state-level weather overview for regional planning
2. Monitor weather alerts across multiple locations
3. Adjust staffing and inventory based on weather intelligence

## API Rate Limits

- OpenWeatherMap Free Tier: 1000 calls/day
- Internal rate limiting: 1 call per store per 15 minutes
- Cached geocoding to minimize API usage

## Troubleshooting

### Common Issues

1. **"No weather data available"**: Check API key configuration
2. **"Address not found"**: Verify store address data in database
3. **"Geocoding failed"**: Check internet connectivity and API key

### Debug Steps

1. Check environment variables
2. Test health endpoint
3. Verify store configuration data
4. Check browser console for frontend errors

## Monitoring

- API call usage tracking
- Geocoding cache hit rates
- Weather service availability
- Frontend component error rates

## Future Enhancements

- Historical weather data correlation with sales
- Automated staffing schedule adjustments
- Weather-based marketing campaign triggers
- Mobile app integration
- Push notifications for severe weather
