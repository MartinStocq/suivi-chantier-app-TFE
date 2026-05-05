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
 * Détermine si les conditions météo sont défavorables pour le chantier.
 * On n'arrête que pour des conditions "majeures" comme demandé.
 */
export function checkWeatherFavorability(temp: number, precip: number, wind: number, code: number): { isFavorable: boolean; reason?: string } {
  // Seulement si pluie vraiment très forte (> 10mm/h)
  if (precip > 10.0) {
    return { isFavorable: false, reason: `Pluie diluvienne (${precip} mm/h)` };
  } 
  
  // Vent violent (> 80km/h)
  if (wind > 80) {
    return { isFavorable: false, reason: `Vent violent (${wind} km/h)` };
  }

  // Gel extrême (< -8°C)
  if (temp < -8) {
    return { isFavorable: false, reason: `Froid extrême (${temp}°C)` };
  }

  // Orages (95: Orage, 96/99: Orage avec grêle)
  if ([95, 96, 99].includes(code)) {
    return { isFavorable: false, reason: `Risque d'orage (Code: ${code})` };
  }

  // Neige importante (73: Modérée, 75: Forte)
  // On ignore 71 (Légère) et 77 (Grains de neige)
  if ([73, 75].includes(code)) {
    return { isFavorable: false, reason: `Fortes chutes de neige (Code: ${code})` };
  }

  return { isFavorable: true };
}

export async function getCoordinates(query: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=fr&format=json`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;
  return {
    latitude: data.results[0].latitude,
    longitude: data.results[0].longitude
  };
}

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

  const { isFavorable, reason } = checkWeatherFavorability(temperature, precipitation, windSpeed, weatherCode);

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

export async function getForecast(lat: number, lon: number) {
  const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  
  if (!data.daily) return null;

  // Transformer les données en un tableau de jours plus facile à manipuler
  const dailyForecasts = data.daily.time.map((date: string, index: number) => ({
    date,
    weatherCode: data.daily.weather_code[index],
    tempMax: data.daily.temperature_2m_max[index],
    tempMin: data.daily.temperature_2m_min[index],
    precipitationSum: data.daily.precipitation_sum[index],
    windSpeedMax: data.daily.wind_speed_10m_max[index]
  }));

  return dailyForecasts;
}

export async function autoUpdateMeteo() {
  const now = new Date();
  const currentHour = now.getHours();

  // Déterminer le début du créneau de 4h actuel (2h, 6h, 10h, 14h, 18h, 22h)
  let slotStartHour = 2;
  if (currentHour >= 22 || currentHour < 2) slotStartHour = 22;
  else if (currentHour >= 18) slotStartHour = 18;
  else if (currentHour >= 14) slotStartHour = 14;
  else if (currentHour >= 10) slotStartHour = 10;
  else if (currentHour >= 6) slotStartHour = 6;

  const slotStartDate = new Date(now);
  // Cas particulier du créneau de 22h qui peut commencer la veille si on est entre 0h et 2h
  if (currentHour < 2 && slotStartHour === 22) {
    slotStartDate.setDate(slotStartDate.getDate() - 1);
  }
  slotStartDate.setHours(slotStartHour, 0, 0, 0);

  // On cherche s'il y a des chantiers actifs qui n'ont pas de snapshot récent dans ce créneau
  const needsUpdate = await prisma.chantier.findFirst({
    where: {
      statut: { in: [StatutChantier.EN_COURS, StatutChantier.SUSPENDU, StatutChantier.EN_ATTENTE] },
      OR: [
        { meteoSnapshots: { none: {} } },
        {
          meteoSnapshots: {
            none: {
              dateSnapshot: { gte: slotStartDate }
            }
          }
        }
      ]
    }
  });

  if (needsUpdate) {
    console.log(`[AutoMeteo] Déclenchement de la mise à jour pour le créneau de ${slotStartHour}h.`);
    await syncChantiersMeteo();
  }
}

export async function syncChantiersMeteo() {
  const chantiers = await prisma.chantier.findMany({
    where: {
      statut: {
        in: [StatutChantier.EN_COURS, StatutChantier.SUSPENDU, StatutChantier.EN_ATTENTE]
      }
    },
    include: {
      adresse: true,
      createdBy: true,
      meteoSnapshots: {
        orderBy: { dateSnapshot: 'desc' },
        take: 1
      }
    }
  });

  const results = [];

  for (const chantier of chantiers) {
    try {
      let lat = chantier.adresse.latitude;
      let lon = chantier.adresse.longitude;

      if (!lat || !lon) {
        let coords = await getCoordinates(chantier.adresse.ville);
        if (!coords) {
          coords = await getCoordinates(`${chantier.adresse.rue}, ${chantier.adresse.ville}`);
        }

        if (coords) {
          lat = coords.latitude;
          lon = coords.longitude;
          await prisma.adresse.update({
            where: { id: chantier.adresse.id },
            data: { latitude: lat, longitude: lon }
          });
        }
      }

      if (!lat || !lon) {
        throw new Error("Coordonnées impossibles à déterminer");
      }

      const weather = await getWeatherData(lat, lon);
      
      let newStatut: StatutChantier | null = null;
      let action = 'NONE';

      const today = new Date();
      today.setHours(0,0,0,0);
      const startDay = new Date(chantier.dateDebutPrevue);
      startDay.setHours(0,0,0,0);

      // 1. Gestion automatique du démarrage par date
      if (chantier.statut === StatutChantier.EN_ATTENTE && startDay.getTime() <= today.getTime()) {
        newStatut = weather.isFavorable ? StatutChantier.EN_COURS : StatutChantier.SUSPENDU;
        action = weather.isFavorable ? 'STARTED' : 'SUSPENDED_ON_START';
      } 
      else if (chantier.statut === StatutChantier.EN_COURS && startDay.getTime() > today.getTime()) {
        newStatut = StatutChantier.EN_ATTENTE;
        action = 'RESET_TO_PENDING';
      }
      // 2. Gestion météo classique pour les chantiers actifs
      else if (!weather.isFavorable && chantier.statut === StatutChantier.EN_COURS) {
        // Météo devient mauvaise -> On suspend
        newStatut = StatutChantier.SUSPENDU;
        action = 'SUSPENDED';
      } else if (weather.isFavorable && chantier.statut === StatutChantier.SUSPENDU) {
        // Météo devient bonne -> On reprend SEULEMENT si la suspension précédente était météo
        const lastSnapshot = chantier.meteoSnapshots[0];
        let wasSuspendedByWeather = false;

        if (lastSnapshot) {
          const payload = JSON.parse(lastSnapshot.payload);
          const current = payload.current;
          if (current) {
            const lastCheck = checkWeatherFavorability(
              current.temperature_2m,
              current.precipitation,
              current.wind_speed_10m,
              current.weather_code
            );
            if (!lastCheck.isFavorable) {
              wasSuspendedByWeather = true;
            }
          }
        }

        // Si on n'a pas de snapshot ou si le dernier snapshot était déjà favorable, 
        // ça veut dire que le chantier a été suspendu MANUELLEMENT pour une autre raison.
        // On ne le reprend donc pas automatiquement.
        if (wasSuspendedByWeather) {
          newStatut = StatutChantier.EN_COURS;
          action = 'RESUMED';
        }
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
