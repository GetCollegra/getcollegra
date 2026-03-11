import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Bus, Train, Plane, Loader2, MapPin, AlertCircle, Navigation } from "lucide-react";
import type { College } from "@/types/college";

type TravelOption = {
  available: boolean;
  estimatedTime?: string;
  distanceMiles?: number;
  notes?: string;
  reason?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureStation?: string;
  arrivalStation?: string;
  provider?: string;
  estimatedFlightTime?: string;
  totalTravelTime?: string;
  nearestHomeAirport?: string;
  nearestCollegeAirport?: string;
};

type TravelData = {
  driving: TravelOption;
  bus: TravelOption;
  train: TravelOption;
  flight: TravelOption;
};

type Props = {
  college: College;
  homeAddress: string;
};

export default function TravelFromHome({ college, homeAddress }: Props) {
  const [travel, setTravel] = useState<TravelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // When content expands/collapses, update the Leaflet popup so it auto-pans into view
  useEffect(() => {
    if (expanded && containerRef.current) {
      // Find the closest Leaflet popup container and trigger an update
      const popupEl = containerRef.current.closest(".leaflet-popup");
      if (popupEl) {
        // Small delay to let React render the expanded content
        setTimeout(() => {
          const map = (popupEl as any)._leaflet_popup?._map;
          // Alternative: find the popup via the map's DOM
          const leafletPopup = containerRef.current?.closest(".leaflet-popup-content-wrapper");
          if (leafletPopup) {
            // Trigger a pan by dispatching a resize-like event on the popup
            const evt = new Event("resize");
            window.dispatchEvent(evt);
          }
        }, 100);
      }
    }
  }, [expanded, travel]);

  const fetchTravel = async () => {
    if (travel) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("estimate-travel", {
        body: {
          homeAddress,
          collegeName: college.name,
          collegeLocation: college.location,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setTravel(data.travel);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to estimate travel");
    } finally {
      setLoading(false);
    }
  };

  const modes = travel
    ? [
        {
          key: "driving",
          icon: Car,
          label: "Drive",
          data: travel.driving,
          primary: travel.driving.estimatedTime,
          secondary: travel.driving.distanceMiles
            ? `~${travel.driving.distanceMiles.toLocaleString()} mi`
            : undefined,
          detail: travel.driving.notes,
        },
        {
          key: "bus",
          icon: Bus,
          label: "Bus",
          data: travel.bus,
          primary: travel.bus.estimatedTime,
          secondary: travel.bus.provider,
          detail: travel.bus.available
            ? `${travel.bus.departureCity} → ${travel.bus.arrivalCity}`
            : undefined,
        },
        {
          key: "train",
          icon: Train,
          label: "Train",
          data: travel.train,
          primary: travel.train.estimatedTime,
          secondary: travel.train.provider,
          detail: travel.train.available
            ? `${travel.train.departureStation} → ${travel.train.arrivalStation}`
            : undefined,
        },
        {
          key: "flight",
          icon: Plane,
          label: "Fly",
          data: travel.flight,
          primary: travel.flight.totalTravelTime,
          secondary: travel.flight.estimatedFlightTime
            ? `${travel.flight.estimatedFlightTime} flight`
            : undefined,
          detail: travel.flight.available
            ? `${travel.flight.nearestHomeAirport} → ${travel.flight.nearestCollegeAirport}`
            : undefined,
        },
      ]
    : [];

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs border-primary/30 hover:bg-primary/5 text-primary"
        onClick={fetchTravel}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Navigation className="h-3.5 w-3.5" />
        )}
        {travel ? (expanded ? "Hide Travel Options" : "Show Travel Options") : "View Transport"}
      </Button>

      {error && (
        <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {expanded && travel && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isAvailable = mode.data.available;
            return (
              <Card
                key={mode.key}
                className={`border-border/50 ${
                  isAvailable ? "bg-card" : "bg-muted/30 opacity-70"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isAvailable ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          isAvailable ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {mode.label}
                        </span>
                        {isAvailable ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          >
                            Available
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-muted text-muted-foreground"
                          >
                            Unavailable
                          </Badge>
                        )}
                      </div>
                      {isAvailable ? (
                        <>
                          <p className="text-lg font-bold text-foreground">
                            {mode.primary}
                          </p>
                          {mode.secondary && (
                            <p className="text-xs text-muted-foreground">
                              {mode.secondary}
                            </p>
                          )}
                          {mode.detail && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {mode.detail}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {mode.data.reason || "No direct route available"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Route summary */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/30">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium text-foreground">{homeAddress}</span>
                {" → "}
                <span className="font-medium text-foreground">
                  {college.name}
                </span>
                , {college.location}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
