import { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle } from "lucide-react";

interface Client {
    id: string;
    full_name: string;
    company_name?: string;
    city?: string;
    address?: string;
    postal_code?: string;
    phone?: string;
    email?: string;
}

interface Props {
    clients: Client[];
}

interface GeoPoint {
    client: Client;
    lat: number;
    lon: number;
}

// Simple geocoding via Nominatim (OSM) — one request per city
async function geocodeCity(city: string, postalCode?: string): Promise<[number, number] | null> {
    try {
        const q = postalCode ? `${postalCode} ${city}, Algeria` : `${city}, Algeria`;
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
            { headers: { "Accept-Language": "fr" } }
        );
        const data = await res.json();
        if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        return null;
    } catch {
        return null;
    }
}

const ClientsMap = ({ clients }: Props) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<any>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);

    // Geocode clients with cities
    useEffect(() => {
        const clientsWithCity = clients.filter((c) => c.city);
        if (clientsWithCity.length === 0) {
            setStatus("ready");
            return;
        }

        // Group by city to avoid multiple identical requests
        const cityMap = new Map<string, Client[]>();
        for (const c of clientsWithCity) {
            const key = c.city!.trim().toLowerCase();
            if (!cityMap.has(key)) cityMap.set(key, []);
            cityMap.get(key)!.push(c);
        }

        const geocodeAll = async () => {
            const points: GeoPoint[] = [];
            for (const [, cityClients] of cityMap) {
                const representative = cityClients[0];
                const coords = await geocodeCity(representative.city!, representative.postal_code);
                if (coords) {
                    // Add all clients from the same city with slight offset to avoid overlap
                    cityClients.forEach((client, i) => {
                        const offset = i * 0.003;
                        points.push({ client, lat: coords[0] + offset, lon: coords[1] + offset });
                    });
                }
                // Small delay to respect Nominatim rate limit (1 req/sec)
                await new Promise((r) => setTimeout(r, 1100));
            }
            setGeoPoints(points);
            setStatus("ready");
        };

        geocodeAll();
    }, [clients]);

    // Initialize Leaflet map
    useEffect(() => {
        if (status !== "ready" || !mapRef.current) return;

        // Dynamically import leaflet to avoid SSR issues
        import("leaflet").then((L) => {
            // Fix leaflet default icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
            }

            const map = L.map(mapRef.current!, {
                center: [36.7372, 3.0865], // Algiers default center
                zoom: geoPoints.length > 0 ? 6 : 5,
                zoomControl: true,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18,
            }).addTo(map);

            if (geoPoints.length > 0) {
                const bounds: [number, number][] = [];
                geoPoints.forEach(({ client, lat, lon }) => {
                    bounds.push([lat, lon]);
                    const marker = L.marker([lat, lon]).addTo(map);
                    marker.bindPopup(`
            <div style="min-width:180px; font-family:sans-serif;">
              <strong style="font-size:14px;">${client.full_name}</strong>
              ${client.company_name ? `<div style="color:#666;font-size:12px;">${client.company_name}</div>` : ""}
              <hr style="margin:6px 0;"/>
              ${client.city ? `<div style="font-size:12px;">📍 ${client.address || ""} ${client.city}${client.postal_code ? " " + client.postal_code : ""}</div>` : ""}
              ${client.phone ? `<div style="font-size:12px;">📞 ${client.phone}</div>` : ""}
              ${client.email ? `<div style="font-size:12px;">✉️ ${client.email}</div>` : ""}
            </div>
          `);
                });
                map.fitBounds(bounds, { padding: [40, 40] });
            }

            leafletMapRef.current = map;
        });

        return () => {
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
            }
        };
    }, [status, geoPoints]);

    return (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: 500 }}>
            {/* Leaflet CSS */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />

            {status === "loading" && (
                <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-sm text-muted-foreground">Géolocalisation des clients en cours…</p>
                    <p className="text-xs text-muted-foreground">(peut prendre quelques secondes)</p>
                </div>
            )}

            {status === "ready" && geoPoints.length === 0 && clients.filter((c) => c.city).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Aucun client avec une ville renseignée</p>
                    <p className="text-xs text-muted-foreground">Ajoutez une ville dans la fiche client pour l'afficher sur la carte.</p>
                </div>
            )}

            <div
                ref={mapRef}
                style={{ height: "100%", width: "100%", display: status === "ready" ? "block" : "none" }}
            />

            {status === "ready" && geoPoints.length > 0 && (
                <div
                    className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1"
                    style={{ position: "absolute", bottom: 12, right: 12, zIndex: 1000 }}
                >
                    <MapPin className="h-3 w-3 text-primary" />
                    {geoPoints.length} client{geoPoints.length > 1 ? "s" : ""} localisé{geoPoints.length > 1 ? "s" : ""}
                </div>
            )}
        </div>
    );
};

export default ClientsMap;
