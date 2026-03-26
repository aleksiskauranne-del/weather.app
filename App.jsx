import { useState } from 'react';
import './App.css';
import { OPENWEATHERMAP_API_KEY } from './config';

function App() {
  const [city, setCity] = useState('');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState(null);
  const [dailyForecast, setDailyForecast] = useState(null);
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to get weather by coordinates
  const getWeatherByCoords = async (lat, lon, cityName) => {
    try {
      setLoading(true);
      setError('');

      // Fetch current weather
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
      );
      const weatherData = await weatherRes.json();

      // Fetch 5-day forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
      );
      const forecastData = await forecastRes.json();

      if (weatherData.cod !== 200 || forecastData.cod !== '200') {
        setError(weatherData.message || 'Failed to fetch weather data.');
      } else {
        // Set the city name for display
        weatherData.name = cityName || weatherData.name;
        setCurrentWeather(weatherData);
        setHourlyForecast(forecastData.list.slice(0, 8));

        // Group forecast data by day to create a simple daily forecast
        const daily = {};
        forecastData.list.forEach((item) => {
          const date = new Date(item.dt * 1000).toLocaleDateString();
          if (!daily[date]) {
            daily[date] = {
              temp: { min: item.main.temp, max: item.main.temp },
              weather: item.weather,
              pop: item.pop,
              dt: item.dt,
              wind_speed: item.wind.speed,
              humidity: item.main.humidity,
              rain: item.rain,
              isDaily: true,
            };
          } else {
            if (item.main.temp < daily[date].temp.min) daily[date].temp.min = item.main.temp;
            if (item.main.temp > daily[date].temp.max) daily[date].temp.max = item.main.temp;
            // For simplicity, use the first 'pop' and 'weather' data for the day
          }
        });
        setDailyForecast(Object.values(daily).slice(0, 7));
        setSelectedWeather(weatherData); // Default to current weather
      }
    } catch {
      setError('Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (e) => {
    e.preventDefault();
    if (!city) {
      setError('Please enter a city.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHERMAP_API_KEY}`
      );
      const data = await res.json();
      if (data.cod !== 200) {
        setError(data.message);
        setLoading(false);
      } else {
        getWeatherByCoords(data.coord.lat, data.coord.lon, data.name);
      }
    } catch {
      setError('Failed to fetch city weather.');
      setLoading(false);
    }
  };

  const handleHourlyClick = (hourlyData) => {
    setSelectedWeather({
      ...hourlyData,
      name: currentWeather.name,
      isHourly: true,
    });
  };

  const handleDailyClick = (dailyData) => {
    setSelectedWeather({
      ...dailyData,
      name: currentWeather.name,
    });
  };

  const formatHour = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDay = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
  };

  const renderMainWeather = () => {
    if (!selectedWeather) {
      return (
        <div className="main-weather-ui" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#535bf2' }}>Please search for a city to see the weather.</h2>
        </div>
      );
    }
    
    const isHourly = selectedWeather.isHourly;
    const isDaily = selectedWeather.isDaily;

    // Use selected weather data if available, otherwise use current weather
    const displayData = isHourly ? selectedWeather : isDaily ? selectedWeather : currentWeather;

    if (!displayData) return null;

    // Extract data based on which object type it is
    const temp = displayData.main?.temp || displayData.temp?.day || displayData.temp;
    const description = displayData.weather[0]?.main;
    const icon = displayData.weather[0]?.icon;
    const humidity = displayData.main?.humidity || displayData.humidity;
    const windSpeed = displayData.wind?.speed || displayData.wind_speed;
    const rainAmount = (displayData.rain && (displayData.rain['1h'] || displayData.rain['3h'])) || '0';
    const rainProb = displayData.pop ? `${Math.round(displayData.pop * 100)}%` : '0%';
    const minTemp = displayData.temp?.min;
    const maxTemp = displayData.temp?.max;

    return (
      <div className="main-weather-ui">
        <div className="location-row">
          <span className="location-icon">📍</span>
          <span className="city-name">{displayData.name}</span>
        </div>
        <div className="date">
          {isHourly
            ? new Date(selectedWeather.dt * 1000).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : new Date(displayData.dt * 1000).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="temp-big">
          {Math.round(temp)}°
          {isDaily && <div className="day-temp">{Math.round(minTemp)}°/{Math.round(maxTemp)}°</div>}
        </div>
        <div className="desc-big">{description}</div>
        <img
          src={`https://openweathermap.org/img/wn/${icon}@4x.png`}
          alt={description}
          className="weather-icon-main"
        />
        <div className="stat-bubbles-row">
          <div className="stat-bubble">
            <div className="stat-label">Precipitation</div>
            <div className="stat-value">{rainAmount} mm</div>
          </div>
          <div className="stat-bubble">
            <div className="stat-label">Humidity</div>
            <div className="stat-value">{humidity}%</div>
          </div>
          <div className="stat-bubble">
            <div className="stat-label">Wind</div>
            <div className="stat-value">{Math.round(windSpeed)} km/h</div>
          </div>
        </div>
        <div className="stat-bubbles-row">
          <div className="stat-bubble">
            <div className="stat-label">Chance of Rain</div>
            <div className="stat-value">{rainProb}</div>
          </div>
        </div>
      </div>
    );
  };

  const getBgStyle = () => {
    return {
      background: 'linear-gradient(135deg, #7f9cf5 0%, #a7bfff 100%)',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.5s',
    };
  };

  return (
    <div className="weather-app" style={getBgStyle()}>
      <div className="weather-content card-ui">
        <form onSubmit={fetchWeather} className="search-form">
          <input
            type="text"
            placeholder="Search city..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="search-input"
            autoFocus
          />
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
        {renderMainWeather()}

        {/* Hourly forecast */}
        {hourlyForecast && (
          <div className="hourly-forecast-row">
            {hourlyForecast.map((hour, index) => (
              <div
                className="hour-label"
                key={index}
                onClick={() => handleHourlyClick(hour)}
                style={{ cursor: 'pointer' }}
              >
                <div className="day-label">{formatHour(hour.dt)}</div>
                <img
                  src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}.png`}
                  alt={hour.weather[0].description}
                />
                <div className="day-temp">{Math.round(hour.main.temp)}°</div>
              </div>
            ))}
          </div>
        )}

        {/* 7-day forecast */}
        {dailyForecast && (
          <div className="forecast-7day-row">
            {dailyForecast.map((day, index) => (
              <div
                className="forecast-day"
                key={index}
                onClick={() => handleDailyClick(day)}
                style={{ cursor: 'pointer' }}
              >
                <div className="day-label">{formatDay(day.dt)}</div>
                <img
                  src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
                  alt={day.weather[0].description}
                />
                <div className="day-temp">{Math.round(day.temp.max)}°/{Math.round(day.temp.min)}°</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
