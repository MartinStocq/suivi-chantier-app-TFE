import { StatutChantier } from '@prisma/client';
import prisma from './prisma';
import { sendMeteoNotification } from './notifications';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherCondition {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  isFavorable: boolean;
  reason?: string;
}

/**
 * Codes météo Open-Meteo qui justifient une suspension
 * 51-67: Pluie / Bruine
 * 71-77: Neige
 * 80-82: Averses
 * 85-86: Averses de neige
 * 95-99: Orages
 */
const UNFAVORABLE_CODES = [
  51, 53, 55, 56, 57, // Drizzle
  61, 63, 65, 66, 67, // Rain
  71, 73, 75, 77,     // Snow
  80, 81, 82,         // Rain showers
  85, 86,             // Snow showers
  95, 96, 99          // Thunderstorms
];

export async function getWeatherData(lat: number, lon: number): Promise<WeatherCondition & { rawPayload: string }> {
  const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.statusText}`);
  }

  const data = await response.json();
  const current = data.current;

  const temperature = current.temperature_2m;
  const precipitation = current.precipitation;
  const windSpeed = current.wind_speed_10m;
  const weatherCode = current.weather_code;

  let isFavorable = true;
  let reason = '';

  if (precipitation > 2.0) {
    isFavorable = false;
    reason = `Précipitations trop fortes (${precipitation} mm/h)`;
  } else if (windSpeed > 50) {
    isFavorable = false;
    reason = `Vent trop fort (${windSpeed} km/h)`;
  } else if (temperature < -2) {
    isFavorable = false;
    reason = `Température trop basse (${temperature}°C)`;
  } else if (UNFAVORABLE_CODES.includes(weatherCode)) {
    isFavorable = false;
    reason = `Conditions météo défavorables (Code: ${weatherCode})`;
  }

  return {
    temperature,
    precipitation,
    windSpeed,
    weatherCode,
    isFavorable,
    reason,
    rawPayload: JSON.stringify(data)
  };
}

export async function syncChantiersMeteo() {
  const chantiers = await prisma.chantier.findMany({
    where: {
      statut: {
        in: [StatutChantier.EN_COURS, StatutChantier.SUSPENDU]
      },
      adresse: {
        latitude: { not: null },
        longitude: { not: null }
      }
    },
    include: {
      adresse: true,
      createdBy: true
    }
  });

  const results = [];

  for (const chantier of chantiers) {
    try {
      const weather = await getWeatherData(chantier.adresse.latitude!, chantier.adresse.longitude!);
      
      let newStatut: StatutChantier | null = null;
      let action = 'NONE';

      if (!weather.isFavorable && chantier.statut === StatutChantier.EN_COURS) {
        newStatut = StatutChantier.SUSPENDU;
        action = 'SUSPENDED';
      } else if (weather.isFavorable && chantier.statut === StatutChantier.SUSPENDU) {
        newStatut = StatutChantier.EN_COURS;
        action = 'RESUMED';
      }

      // Enregistrer le snapshot
      await prisma.meteoSnapshot.create({
        data: {
          source: 'open-meteo',
          payload: weather.rawPayload,
          chantierId: chantier.id,
          dateSnapshot: new Date()
        }
      });

      if (newStatut) {
        await prisma.chantier.update({
          where: { id: chantier.id },
          data: { statut: newStatut }
        });
        
        // Envoyer notification au créateur (Chef de chantier)
        if (chantier.createdBy.email) {
          const notificationAction = newStatut === StatutChantier.SUSPENDU ? 'SUSPENDU' : 'REPRIS';
          await sendMeteoNotification(
            chantier.createdBy.email,
            chantier.titre,
            notificationAction,
            weather.reason || (notificationAction === 'REPRIS' ? 'Conditions redevenues favorables' : 'Météo défavorable')
          );
        }

        console.log(`Chantier ${chantier.titre}: ${action} due to weather. ${weather.reason || ''}`);
      }

      results.push({
        chantierId: chantier.id,
        titre: chantier.titre,
        action,
        condition: {
            temperature: weather.temperature,
            precipitation: weather.precipitation,
            windSpeed: weather.windSpeed,
            weatherCode: weather.weatherCode,
            isFavorable: weather.isFavorable,
            reason: weather.reason
        }
      });

    } catch (error) {
      console.error(`Error syncing weather for chantier ${chantier.id}:`, error);
      results.push({
        chantierId: chantier.id,
        error: (error as Error).message
      });
    }
  }

  return results;
}
