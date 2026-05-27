/* Browser geolocation → readable place name, via /api/places/reverse.
   Used to pre-fill "Leaving from" with the user's current location. */
export async function getCurrentPlace(): Promise<string> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    throw new Error("Location isn’t supported on this device.");
  }
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    })
  );
  const { latitude, longitude } = pos.coords;
  const res = await fetch(`/api/places/reverse?lat=${latitude}&lng=${longitude}`);
  const data = await res.json();
  if (!data.place) throw new Error("Couldn’t find a name for your location.");
  return data.place as string;
}
