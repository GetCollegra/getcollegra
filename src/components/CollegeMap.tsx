import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import type { College } from "@/types/college";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const fitCategoryColors: Record<string, string> = {
  Safety: "#10b981",
  Match: "hsl(var(--primary))",
  Reach: "#ea580c",
};

function createColorIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

// Simple US state/city geocoding fallback
const STATE_COORDS: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [64.2, -152.5], AZ: [34.0, -111.1], AR: [35.2, -91.8],
  CA: [36.8, -119.4], CO: [39.1, -105.4], CT: [41.6, -72.7], DE: [38.9, -75.5],
  FL: [27.7, -81.7], GA: [32.2, -83.4], HI: [19.9, -155.6], ID: [44.1, -114.7],
  IL: [40.6, -89.4], IN: [40.3, -86.1], IA: [41.9, -93.1], KS: [39.0, -98.5],
  KY: [37.8, -84.3], LA: [31.2, -92.5], ME: [45.3, -69.4], MD: [39.0, -76.6],
  MA: [42.4, -71.4], MI: [44.3, -85.6], MN: [46.4, -94.6], MS: [32.7, -89.5],
  MO: [37.9, -91.8], MT: [46.8, -110.4], NE: [41.1, -98.3], NV: [38.8, -116.4],
  NH: [43.5, -71.5], NJ: [40.1, -74.5], NM: [34.5, -105.9], NY: [43.0, -75.0],
  NC: [35.8, -79.0], ND: [47.5, -101.0], OH: [40.4, -82.9], OK: [35.0, -97.1],
  OR: [43.8, -120.6], PA: [41.2, -77.2], RI: [41.6, -71.5], SC: [33.8, -81.2],
  SD: [43.9, -99.4], TN: [35.5, -86.6], TX: [31.0, -97.6], UT: [39.3, -111.1],
  VT: [44.6, -72.6], VA: [37.4, -78.7], WA: [47.7, -120.7], WV: [38.6, -80.5],
  WI: [43.8, -88.8], WY: [43.1, -107.6], DC: [38.9, -77.0],
};

function geocodeLocation(location: string): [number, number] | null {
  if (!location || location === "—") return null;
  // Try to extract state abbreviation
  const parts = location.split(",").map(s => s.trim());
  const stateStr = parts[parts.length - 1]?.toUpperCase();
  if (stateStr && STATE_COORDS[stateStr]) {
    // Add slight random offset so markers don't overlap
    const [lat, lng] = STATE_COORDS[stateStr];
    return [lat + (Math.random() - 0.5) * 1.5, lng + (Math.random() - 0.5) * 1.5];
  }
  // Try full state name match
  const stateNames: Record<string, string> = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
  };
  const abbr = stateNames[stateStr?.toLowerCase()];
  if (abbr && STATE_COORDS[abbr]) {
    const [lat, lng] = STATE_COORDS[abbr];
    return [lat + (Math.random() - 0.5) * 1.5, lng + (Math.random() - 0.5) * 1.5];
  }
  return null;
}

type CollegeWithSource = {
  college: College;
  source: "match" | "saved";
};

type CollegeMapProps = {
  matchedColleges: College[];
  savedColleges: { college_data: College; college_name: string }[];
};

export default function CollegeMap({ matchedColleges, savedColleges }: CollegeMapProps) {
  const [markers, setMarkers] = useState<{ pos: [number, number]; college: College; source: string }[]>([]);

  useEffect(() => {
    const all = new Map<string, CollegeWithSource>();
    matchedColleges.forEach(c => all.set(c.name, { college: c, source: "match" }));
    savedColleges.forEach(s => {
      if (!all.has(s.college_name)) {
        all.set(s.college_name, { college: s.college_data, source: "saved" });
      }
    });

    const result: { pos: [number, number]; college: College; source: string }[] = [];
    all.forEach(({ college, source }) => {
      const pos = geocodeLocation(college.location);
      if (pos) result.push({ pos, college, source });
    });
    setMarkers(result);
  }, [matchedColleges, savedColleges]);

  if (markers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <MapPin className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">No colleges to map yet</p>
        <p className="text-sm">Take the quiz or add colleges to see them on the map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Safety
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Match
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-600 inline-block" /> Reach
        </span>
      </div>
      <div className="rounded-xl overflow-hidden border border-border shadow-soft" style={{ height: 480 }}>
        <MapContainer
          center={[39.8, -98.6]}
          zoom={4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m, i) => (
            <Marker
              key={`${m.college.name}-${i}`}
              position={m.pos}
              icon={createColorIcon(fitCategoryColors[m.college.fitCategory] || fitCategoryColors.Match)}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold text-sm mb-1">{m.college.name}</p>
                  <p className="text-xs text-gray-600 mb-2">{m.college.location}</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 font-medium">
                      {m.college.fitCategory}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 font-medium">
                      Fit: {m.college.fitScore}/100
                    </span>
                  </div>
                  {m.college.netPrice !== "—" && (
                    <p className="text-[11px] text-gray-500">Net Price: {m.college.netPrice}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
