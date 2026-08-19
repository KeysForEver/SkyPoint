import { LocationData } from '../types';

/**
 * Retrieves the current location with high accuracy
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser.');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        // Attempt lightweight reverse geocoding if online
        if (navigator.onLine) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
              {
                signal: controller.signal,
                headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
              }
            );
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                // Shorten address for clean display
                const road = data.address?.road || data.address?.suburb || '';
                const city = data.address?.city || data.address?.town || data.address?.municipality || '';
                const state = data.address?.state || '';
                if (road || city) {
                  address = [road, city, state].filter(Boolean).join(', ');
                } else {
                  address = data.display_name.split(',').slice(0, 3).join(',');
                }
              }
            }
          } catch {
            // Ignore reverse geocode failures, keep lat/lng
          }
        }

        resolve({
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          address,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
