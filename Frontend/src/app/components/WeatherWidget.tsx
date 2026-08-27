import { useState, useEffect } from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, Wind, Droplets, Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface WeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
}

function getWeatherInfo(code: number, isDay: boolean) {
  const map: Record<number, { label: string; icon: typeof Sun }> = {
    0:  { label: isDay ? 'Clear Sky' : 'Clear Night', icon: isDay ? Sun : Moon },
    1:  { label: isDay ? 'Mainly Clear' : 'Mainly Clear', icon: Cloud },
    2:  { label: 'Partly Cloudy', icon: Cloud },
    3:  { label: 'Overcast', icon: Cloud },
    45: { label: 'Foggy', icon: Cloud },
    48: { label: 'Foggy', icon: Cloud },
    51: { label: 'Light Drizzle', icon: CloudRain },
    53: { label: 'Drizzle', icon: CloudRain },
    55: { label: 'Heavy Drizzle', icon: CloudRain },
    61: { label: 'Light Rain', icon: CloudRain },
    63: { label: 'Rain', icon: CloudRain },
    65: { label: 'Heavy Rain', icon: CloudRain },
    71: { label: 'Light Snow', icon: Snowflake },
    73: { label: 'Snow', icon: Snowflake },
    75: { label: 'Heavy Snow', icon: Snowflake },
    77: { label: 'Snow Grains', icon: Snowflake },
    80: { label: 'Light Showers', icon: CloudRain },
    81: { label: 'Showers', icon: CloudRain },
    82: { label: 'Heavy Showers', icon: CloudRain },
    95: { label: 'Thunderstorm', icon: CloudLightning },
    96: { label: 'Thunderstorm & Hail', icon: CloudLightning },
    99: { label: 'Thunderstorm & Hail', icon: CloudLightning },
  };
  return map[code] || { label: 'Unknown', icon: Cloud };
}

export function WeatherWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{
    temp: number;
    humidity: number;
    wind: number;
    condition: string;
    Icon: typeof Sun;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=Asia/Riyadh'
        );
        if (!res.ok) return;
        const data: WeatherResponse = await res.json();
        const curr = data.current;
        const info = getWeatherInfo(curr.weather_code, curr.is_day === 1);
        setWeather({
          temp: Math.round(curr.temperature_2m),
          humidity: curr.relative_humidity_2m,
          wind: Math.round(curr.wind_speed_10m),
          condition: info.label,
          Icon: info.icon,
        });
      } catch (e) {
        console.error('Weather fetch failed:', e);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const WeatherIcon = weather?.Icon || Sun;

  return (
    <motion.div
      className="bg-gradient-to-br from-[#eff6ff] to-white rounded-xl border border-[var(--solar-border)] p-6 shadow-lg overflow-hidden relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
    >
      <motion.div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0)',
          backgroundSize: '30px 30px'
        }}
        animate={{ backgroundPosition: ['0px 0px', '30px 30px'] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <motion.div
            className="flex items-center gap-2 text-[var(--solar-text-muted)] mb-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDate(currentTime)}</span>
          </motion.div>
          <motion.div
            className="flex items-center gap-2 mb-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
              <Clock className="w-5 h-5 text-[var(--solar-navy)]" />
            </motion.div>
            <span className="text-2xl font-semibold text-[var(--solar-navy)]">{formatTime(currentTime)}</span>
          </motion.div>
          <p className="text-xs text-[var(--solar-text-muted)]">Arabia Standard Time (AST)</p>
        </div>

        <div className="flex items-center gap-6 border-l border-[var(--solar-border)] pl-6">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#1e40af] rounded-full flex items-center justify-center shadow-lg"
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <WeatherIcon className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <motion.div
                className="text-3xl font-semibold text-[var(--solar-navy)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {weather ? `${weather.temp}°C` : '—'}
              </motion.div>
              <div className="text-sm text-[var(--solar-text-muted)]">
                {weather ? weather.condition : 'Loading...'}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2 text-sm">
              <Droplets className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[var(--solar-text)]">{weather ? `${weather.humidity}%` : '—'} Humidity</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wind className="w-4 h-4 text-[#64748b]" />
              <span className="text-[var(--solar-text)]">{weather ? `${weather.wind}` : '—'} km/h Wind</span>
            </div>
            <div className="text-xs text-[var(--solar-text-muted)] mt-1">Riyadh, Saudi Arabia</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
