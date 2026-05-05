import { useEffect, useMemo, useState, useRef, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
// leaflet CSS loaded via index.html CDN link
import { MapPin, Filter, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { College } from "@/types/college";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createColorIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      cursor: pointer; transition: transform 0.15s ease;
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Home marker icon
function createHomeIcon() {
  return L.divIcon({
    className: "home-marker",
    html: `<div style="
      width: 34px; height: 34px; border-radius: 50%;
      background: hsl(var(--destructive)); 
      border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 16px;
    ">🏠</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

const FIT_COLORS: Record<string, string> = {
  Likely: "#10b981",
  Safety: "#10b981",
  Match: "#1d6fd3",
  Reach: "#ea580c",
};

// US state coordinates for geocoding
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

const STATE_NAMES: Record<string, string> = {
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

function resolveStateAbbr(input: string): string | null {
  const upper = input.trim().toUpperCase();
  if (STATE_COORDS[upper]) return upper;
  return STATE_NAMES[input.trim().toLowerCase()] || null;
}

export function geocodeLocation(location: string): [number, number] | null {
  if (!location || location === "—") return null;
  const parts = location.split(",").map(s => s.trim());
  const stateStr = parts[parts.length - 1];
  const abbr = stateStr ? resolveStateAbbr(stateStr) : null;
  if (abbr && STATE_COORDS[abbr]) {
    const [lat, lng] = STATE_COORDS[abbr];
    const cityHash = parts[0] ? [...parts[0]].reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
    const offset1 = ((cityHash % 100) / 100 - 0.5) * 1.2;
    const offset2 = (((cityHash * 7) % 100) / 100 - 0.5) * 1.2;
    return [lat + offset1, lng + offset2];
  }
  return null;
}

/** Calculate distance in miles between two [lat, lng] points */
function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3959;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Auto-fit bounds with smooth animation
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const initialRef = useRef(true);
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      if (initialRef.current) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 });
        initialRef.current = false;
      } else {
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 7, duration: 0.8 });
      }
    }
  }, [positions, map]);
  return null;
}

// Smooth pan to marker on click
function SmoothPanTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 6), { duration: 0.6 });
    }
  }, [position, map]);
  return null;
}

export type MarkerData = {
  pos: [number, number];
  college: College;
  distance: number | null;
};

type CollegeMapProps = {
  matchedColleges: College[];
  savedColleges: { college_data: College; college_name: string }[];
  homeLocation?: string;
  homeAddress?: string;
  savedCollegeNames?: Set<string>;
  onSaveCollege?: (college: College) => void;
  savingCollege?: string | null;
  fullPage?: boolean;
  onCollegeSelect?: (college: College) => void;
  selectedCollege?: string | null;
};

function CollegeMapComponent({
  matchedColleges,
  savedColleges,
  homeLocation,
  homeAddress,
  savedCollegeNames,
  onSaveCollege,
  savingCollege,
  fullPage = false,
  onCollegeSelect,
  selectedCollege,
}: CollegeMapProps) {
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set(["Safety", "Match", "Reach"]));
  const [distanceFilter, setDistanceFilter] = useState<string>("all");
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);

  const homePos = useMemo(() => {
    if (!homeLocation) return null;
    return geocodeLocation(homeLocation);
  }, [homeLocation]);

  const markers = useMemo(() => {
    const all = new Map<string, College>();
    matchedColleges.forEach(c => all.set(c.name, c));
    savedColleges.forEach(s => {
      if (!all.has(s.college_name)) all.set(s.college_name, s.college_data);
    });

    const result: MarkerData[] = [];
    all.forEach((college) => {
      const pos = geocodeLocation(college.location);
      if (!pos) return;
      // Normalize legacy "Likely" category to "Safety"
      const cat = (college.fitCategory as string);
      const normalizedCollege = cat === "Likely"
        ? { ...college, fitCategory: "Safety" as College["fitCategory"] }
        : college;
      const distance = homePos ? Math.round(haversineDistance(homePos, pos)) : null;
      result.push({ pos, college: normalizedCollege, distance });
    });
    return result;
  }, [matchedColleges, savedColleges, homePos]);

  const MAX_PINS = 25;
  const filteredMarkers = useMemo(() => {
    const filtered = markers.filter(m => {
      if (!filterCategories.has(m.college.fitCategory)) return false;
      if (distanceFilter !== "all" && m.distance !== null) {
        const maxMiles = parseInt(distanceFilter);
        if (m.distance > maxMiles) return false;
      }
      return true;
    });
    return filtered.slice(0, MAX_PINS);
  }, [markers, filterCategories, distanceFilter]);

  const toggleCategory = (cat: string) => {
    setFilterCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const mapHeight = fullPage ? "calc(100vh - 280px)" : "480px";

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
      {/* Filter Bar */}
      <Card className="bg-card border-border shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span>Filters</span>
            </div>
            <div className="h-6 w-px bg-border hidden sm:block" />
            {(["Safety", "Match", "Reach"] as const).map(cat => {
              const checked = filterCategories.has(cat);
              const dotColor = cat === "Safety" ? "bg-emerald-500" : cat === "Match" ? "bg-primary" : "bg-orange-500";
              return (
                <label key={cat} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox checked={checked} onCheckedChange={() => toggleCategory(cat)} />
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  <span className="text-sm text-foreground">{cat}</span>
                </label>
              );
            })}
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                <SelectTrigger className="h-8 w-[160px] text-sm">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All distances</SelectItem>
                  <SelectItem value="100">Within 100 mi</SelectItem>
                  <SelectItem value="250">Within 250 mi</SelectItem>
                  <SelectItem value="500">Within 500 mi</SelectItem>
                  <SelectItem value="1000">Within 1,000 mi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary" className="ml-auto text-xs">
              {filteredMarkers.length} of {markers.length} colleges
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Safety
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Match
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Reach
        </span>
        {homePos && (
          <span className="flex items-center gap-1.5">
            <span className="text-base">🏠</span> Your Home
          </span>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border shadow-card" style={{ height: mapHeight, minHeight: 400 }}>
        <MapContainer
          center={[39.8, -98.6]}
          zoom={4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          maxBounds={[[24, -130], [50, -65]]}
          maxBoundsViscosity={1.0}
          minZoom={3}
          zoomControl={true}
          doubleClickZoom={true}
          dragging={true}
          touchZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={[...filteredMarkers.map(m => m.pos), ...(homePos ? [homePos] : [])]} />
          <SmoothPanTo position={panTarget} />

          {/* Home marker */}
          {homePos && (
            <Marker position={homePos} icon={createHomeIcon()}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-sm">🏠 Your Home</p>
                  <p className="text-xs text-muted-foreground">{homeLocation}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* College markers (clustered) */}
          <ClusteredMarkers
            markers={filteredMarkers}
            onSelect={(c, pos) => {
              setPanTarget(pos);
              if (onCollegeSelect) onCollegeSelect(c);
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
}

const CollegeMap = memo(CollegeMapComponent);
export default CollegeMap;
