# Open-Meteo: what exists, what we use, what we don't

Checked 2026-10-04 against the official docs **and** live calls for Kothagudem (17.55, 80.62), Khon Kaen (16.44, 102.84) and Bangkok. Status marks:
✅ called live and returned data · ⚠️ listed in docs but rejected or empty in our setup · 📄 docs only (not called).

## What Two Skies uses today

| API | What we take |
|---|---|
| Forecast `api.open-meteo.com/v1/forecast` | current: temp, feels-like, humidity, is_day, precipitation, weather_code, cloud_cover, wind speed/direction, uv_index · hourly: temp, precip probability, weather_code, is_day · daily: weather_code, max/min temp, max apparent temp, sunrise, sunset, precip probability max, uv max · minutely_15: precipitation (8 slots) |
| Air quality `air-quality-api.open-meteo.com/v1/air-quality` | current: us_aqi, pm2_5, pm10 |

Everything else below is unused.

## Free tier and licence

- Limits: **600 calls/min, 5,000/hour, 10,000/day, 300,000/month**. Our load is a few hundred a day.
- **Non-commercial only.** Data is **CC BY 4.0, which requires attribution**. The app does not show an attribution line yet; it should ("Weather data by Open-Meteo.com").
- One request can carry many places: `latitude=a,b,c&longitude=x,y,z` returns an array (✅ tested, 3 places in one call). We currently make one call per place.

## The APIs

| API | Endpoint | What it gives | Verdict for us |
|---|---|---|---|
| **Ensemble** | `ensemble-api.open-meteo.com/v1/ensemble` | Every member of 13+ ensemble models (ECMWF IFS has **51**), up to 35 days | ✅ **Best underused.** Counting wet members gives a real "% chance of rain" (tested: 25% / 12% / 6% / 37% across the next 12 h at Khon Kaen) instead of a single yes/no |
| **Air quality (more)** | same host | hourly forecast 5 days (CAMS Global, ~45 km): pm2_5, pm10, us_aqi, european_aqi + per-pollutant sub-indexes, ozone, NO2, SO2, CO, CO2, NH3, methane, dust, aerosol_optical_depth, uv_index(_clear_sky). Pollen is **Europe only**. | ✅ hourly forecast works (72/72 values). We only read "now". Dust was 0 (✅ returns, just quiet today). 45 km grid is coarse |
| **Flood** | `flood-api.open-meteo.com/v1/flood` | GloFAS v4 river discharge (m³/s), daily, ~5 km, up to 7 months, 50 ensemble members | ⚠️ works but picks "the largest river in the 5 km cell". Kothagudem read 13 m³/s and falling, which is likely a minor stream, not the Godavari. Usable as a **trend**, not an absolute level, unless coordinates are nudged |
| **Historical (ERA5)** | `archive-api.open-meteo.com/v1/archive` | Reanalysis 1940→now (ERA5 25 km, ERA5-Land 11 km), 5-day delay | ✅ "same day last year" works (Khon Kaen 2025-10-04 max 31.0°). Enables "hotter than usual" context |
| **Historical forecast** | `historical-forecast-api.open-meteo.com/v1/forecast` | Archived forecasts as issued | ✅ responds. Niche |
| **Previous runs** | `previous-runs-api.open-meteo.com/v1/forecast` | What the model said 1-7 days earlier (`*_previous_day1` …), from 2024 | ✅ responds. Could show "how good was yesterday's forecast". Niche |
| **Climate** | `climate-api.open-meteo.com/v1/climate` | CMIP6 HighResMIP, 7 models, 1950-2050, 10 km, daily | ✅ responds. Long-term trends only; no day-to-day use |
| **Seasonal** | `seasonal-api.open-meteo.com/v1/seasonal` | ECMWF SEAS5 (7 months) and EC46 (46 days), 51 members, 36 km, "warmer/wetter than normal" | ✅ responds. Useful for monsoon / hot-season planning, not for daily weather |
| **Marine** | `marine-api.open-meteo.com/v1/marine` | wave height/direction/period, wind waves, 3 swells, ocean current, sea-surface temp, sea level (tides), 5 km, 16 days | ✅ responds. Only relevant if either of you visits a coast; "not suitable for coastal navigation" |
| **Satellite radiation** | `satellite-api.open-meteo.com/v1/archive` | Himawari (covers India/Asia) and others: GHI, DNI, diffuse, GTI, 2.5-5 km, 10-30 min, 30 min delay | ✅ responds. Solar-energy use; not for us |
| **Geocoding** | `geocoding-api.open-meteo.com/v1/search` | name → lat, lon, elevation, timezone, population, admin1-4, country_code, postcodes; `language`, `countryCode`, `count` ≤ 100 | ✅ **Needed for the add-location page.** Thai queries work ("ขอนแก่น"). Neighbourhoods are **not** indexed ("Sujatha Nagar" returned nothing); "Kothagudem" resolves as "Kottagūdem". So the page needs a manual lat/lon fallback |
| **Elevation** | `api.open-meteo.com/v1/elevation` | Copernicus DEM 90 m, up to 100 points per call | ✅ responds. Forecast already downscales to the DEM, so little to gain |

## Forecast API: variables we don't request

### Hourly (also valid as `current` and, where noted, 15-minutely)
- **Convection / thunder**: `cape` ✅ (1700 J/kg at Khon Kaen right now), `lifted_index` ✅ (-4.7), `convective_inhibition` ✅, `boundary_layer_height` ✅. 📄 `lightning_potential_index` is documented for 15-minutely but **rejected** (⚠️) on the default model and on `icon_global`.
- **Heat stress**: `wet_bulb_temperature_2m` ✅ (24.6°), `dew_point_2m` ✅, `vapour_pressure_deficit` ✅.
- **Wind**: `wind_gusts_10m` ✅; 📄 `wind_speed_/wind_direction_` at 80, 120, 180 m; `temperature_` at 80, 120, 180 m.
- **Pressure**: `pressure_msl` ✅, `surface_pressure` ✅.
- **Sky**: `visibility` ✅ (12 km), `cloud_cover_low/mid/high` ✅ (low), `sunshine_duration` ✅, `freezing_level_height` ✅.
- **Rain split**: `rain` ✅, `showers` ✅, `snowfall`, `snow_depth`.
- **Radiation**: `shortwave_radiation`, `direct_radiation`, `direct_normal_irradiance`, `diffuse_radiation`, `global_tilted_irradiance`, `terrestrial_solar_radiation`.
- **Soil / agriculture**: `soil_temperature_0cm…54cm`, `soil_moisture_0_to_1cm … 27_to_81cm` ✅, `evapotranspiration` ✅, `et0_fao_evapotranspiration`, `total_column_integrated_water_vapour`.

### 15-minutely
`cape` ✅, `visibility` ✅, `wind_gusts_10m` ✅ (all 192/192), plus temperature, humidity, dew point, apparent temperature, radiation family, sunshine, rain/showers/snowfall, freezing level, wind at 10/80 m, `weather_code`, `is_day`. ⚠️ `lightning_potential_index` rejected.

### Daily
- ✅ working: `precipitation_hours`, `precipitation_sum`, `wind_gusts_10m_max`, `wind_speed_10m_max`, `daylight_duration`, `sunshine_duration`, `uv_index_clear_sky_max`, `moonrise`, `moonset`, `moon_phase`.
- ⚠️ listed but **rejected by the default "best match"** (appear to be model-specific): `max_wet_bulb_temperature_2m`, `mean_cape`, `max_cape`, `mean_relative_humidity_2m`. Same family: `mean/min/max` of dew point, sea-level pressure, surface pressure, visibility, cloud cover, `maximum_updraft`, `mean_leaf_wetness_probability`, `mean/minimum_precipitation_probability`, `maximum_vapour_pressure_deficit`.
- 📄 also: `temperature_2m_mean`, `apparent_temperature_mean/min`, `rain_sum`, `showers_sum`, `snowfall_sum`, `wind_direction_10m_dominant`, `shortwave_radiation_sum`, `growing_degree_days_base_0_limit_50`, `snowfall_water_equivalent_sum`.

### Parameters
`past_days` (0-92 ✅), `forecast_days` (0-16), `forecast_hours`, `past_hours`, `forecast_minutely_15`, `past_minutely_15`, `start_date/end_date`, `start_hour/end_hour`, `timeformat=unixtime`, `elevation=` override, `cell_selection=land|sea|nearest`, `temperature_unit`, `wind_speed_unit` (kmh, ms, mph, kn), `precipitation_unit`, and **`models=`** to pin or compare models (✅ `ecmwf_ifs025,icon_global,gfs_global` in one call).

### Models you can pick
ECMWF IFS HRES 9 km / IFS 0.25° / AIFS, NCEP GFS (0.11°/0.25°), AIGFS, CMA GRAPES, BOM ACCESS, JMA (Seamless/MSM/GSM), KMA (Seamless/LDPS/GDPS), GEM (Global/Regional/HRDPS), DWD ICON (Seamless/Global/EU/D2), Météo-France ARPEGE/AROME, UK Met Office (Global 10 km, UK 2 km), MET Norway, KNMI, DMI, MeteoSwiss, ItaliaMeteo, GeoSphere, CHMI, HRRR/NBM/NAM (US). Default **best match** picks per location. For India and Thailand the useful candidates are ECMWF, ICON, GFS and JMA.

## What would help most (ranked)

1. **Ensemble rain probability**: turns "rain at 15:00" into "70% chance", and makes any hourly alert trustworthy.
2. **CAPE + lifted index for storm warnings**: tropical afternoon storms form before the weather code says "thunderstorm". CAPE 1700 and LI -4.7 today at Khon Kaen is exactly the signature.
3. **Hourly air-quality forecast**: "tomorrow's air is worse", best hour to go outside. Matters for the Khon Kaen burning season. Treat 45 km data as indicative.
4. **Wet-bulb temperature** for heat alerts: better than feels-like in humid heat, a real safety measure for both climates.
5. **Wind gusts and visibility**: storm safety, and haze/smoke detection together with PM2.5.
6. **Context from the past**: `past_days=1` ("3° hotter than yesterday") and ERA5 same-day-last-year ("hotter than usual").
7. **Moonrise / moonset**: cheap, on-theme ("moonrise 18:42 here, 19:10 there").
8. **One multi-location call** instead of one per place: fewer requests, faster load.
9. **Geocoding**: prerequisite for the add-location page.
10. **Seasonal outlook (EC46)**: nice for planning visits; low urgency.
11. **River discharge trend** for Kothagudem (Godavari side): only after nudging coordinates to the real river; treat as relative trend.

Skip: marine, satellite radiation, climate projections, soil/agri variables, snow, pollen (Europe only).
