"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { LocationFilterParams } from "@/lib/queries/events-list";

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "250", label: "250 km" },
];

const DEFAULT_RADIUS = 50;

type EventLocationFilterProps = {
  onFilterChange: (filter: LocationFilterParams | undefined) => void;
  currentFilter?: LocationFilterParams;
};

export function EventLocationFilter({
  onFilterChange,
  currentFilter,
}: EventLocationFilterProps) {
  const t = useTranslations("discover.location-filter");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(
    currentFilter?.radiusKm ?? DEFAULT_RADIUS,
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(
    currentFilter ? { lat: currentFilter.lat, lng: currentFilter.lng } : null,
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t("geolocation-not-supported"));
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
        onFilterChange({
          lat: latitude,
          lng: longitude,
          radiusKm: radius,
        });
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(t("permission-denied"));
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(t("position-unavailable"));
            break;
          case error.TIMEOUT:
            setLocationError(t("timeout"));
            break;
          default:
            setLocationError(t("unknown-error"));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000, // Cache for 10 minutes
      },
    );
  }, [onFilterChange, radius, t]);

  const handleRadiusChange = useCallback(
    (value: string) => {
      const newRadius = parseInt(value, 10);
      setRadius(newRadius);
      if (userLocation) {
        onFilterChange({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radiusKm: newRadius,
        });
      }
    },
    [userLocation, onFilterChange],
  );

  const clearFilter = useCallback(() => {
    setUserLocation(null);
    setLocationError(null);
    onFilterChange(undefined);
  }, [onFilterChange]);

  const isFilterActive = userLocation !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isFilterActive ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {isFilterActive ? t("nearby", { radius }) : t("filter-by-location")}
          {isFilterActive && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter();
              }}
              className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{t("title")}</h4>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          {locationError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {locationError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {!userLocation ? (
              <Button
                onClick={requestLocation}
                disabled={isLocating}
                className="w-full"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("locating")}
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    {t("use-my-location")}
                  </>
                )}
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {t("location-set")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("radius")}</label>
                  <Select
                    value={radius.toString()}
                    onValueChange={handleRadiusChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={clearFilter} className="w-full">
                  {t("clear-filter")}
                </Button>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
