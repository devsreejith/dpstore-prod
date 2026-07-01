import React, { useEffect, useRef, useState } from "react";
import { IoLocation, IoNavigate, IoSearch } from "react-icons/io5";
import { useTranslation } from "next-i18next";
import cn from "classnames";

export interface MapLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
}

interface GoogleMapPickerProps {
  onConfirm: (location: MapLocation) => void;
  onCancel?: () => void;
  initialLocation?: { lat: number; lng: number };
}

// Global promise to load the script only once
let googleMapsPromise: Promise<void> | null = null;
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// Helper to extract address components from Geocoding response
const extractAddressComponents = (components: any[]) => {
  let city = "";
  let province = "";
  let postalCode = "";
  let countryCode = "ae";

  for (const component of components) {
    const types = component.types;
    if (types.includes("locality")) {
      city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      province = component.long_name; // e.g. "Dubai"
    } else if (types.includes("postal_code")) {
      postalCode = component.long_name;
    } else if (types.includes("country")) {
      countryCode = component.short_name.toLowerCase();
    }
  }

  // Fallbacks for UAE regions
  if (!city && province) city = province;

  return { city, province, postalCode, countryCode };
};

export const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  onConfirm,
  onCancel,
  initialLocation,
}) => {
  const { t } = useTranslation("common");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState("");
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load script on mount
  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API Key is missing. Please check your environment variables.");
      setLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load Google Maps script.");
        setLoading(false);
      });
  }, [apiKey]);

  // Initialize Map
  useEffect(() => {
    if (loading || error || !mapContainerRef.current || !(window as any).google?.maps) return;

    // Default to Dubai center if no initial location
    const defaultCenter = initialLocation || { lat: 25.2048, lng: 55.2708 };

    const mapInstance = new (window as any).google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "cooperative",
    });

    setMap(mapInstance);
  }, [loading, error]);

  // Bind places autocomplete and map idle events
  useEffect(() => {
    if (!map) return;

    // Bind Autocomplete
    if (searchInputRef.current && (window as any).google?.maps?.places) {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          types: ["geocode", "establishment"],
          componentRestrictions: { country: "ae" }, // Default to UAE
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          map.panTo(place.geometry.location);
          map.setZoom(16);
        }
      });
    }

    // Geocoder instance
    const geocoder = new (window as any).google.maps.Geocoder();

    const reverseGeocode = (lat: number, lng: number) => {
      setGeocoding(true);
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        setGeocoding(false);
        if (status === "OK" && results && results[0]) {
          const result = results[0];
          setFormattedAddress(result.formatted_address);

          const extracted = extractAddressComponents(result.address_components);
          setCurrentLocation({
            lat,
            lng,
            formattedAddress: result.formatted_address,
            ...extracted,
          });
        } else {
          setFormattedAddress("Location coordinates (" + lat.toFixed(5) + ", " + lng.toFixed(5) + ")");
          setCurrentLocation({
            lat,
            lng,
            formattedAddress: `Coordinates: ${lat}, ${lng}`,
            city: "Dubai",
            province: "Dubai",
            countryCode: "ae",
          });
        }
      });
    };

    // Listen to map idle to geocode the center
    const idleListener = map.addListener("idle", () => {
      const center = map.getCenter();
      if (center) {
        reverseGeocode(center.lat(), center.lng());
      }
    });

    // Run initial geocoding on default center
    const initialCenter = map.getCenter();
    if (initialCenter) {
      reverseGeocode(initialCenter.lat(), initialCenter.lng());
    }

    return () => {
      if (idleListener) {
        (window as any).google.maps.event.removeListener(idleListener);
      }
    };
  }, [map]);

  const handleGetCurrentLocation = () => {
    if (!map) return;

    if (navigator.geolocation) {
      setGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.panTo(userLocation);
          map.setZoom(16);
        },
        () => {
          setGeocoding(false);
          alert("Error: The Geolocation service failed. Please search for your address manually.");
        }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 bg-gray-50 flex items-center justify-center border border-gray-200 rounded-md">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008755]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-5 border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-md text-sm">
        <strong className="block mb-1">Google Maps Setup Alert:</strong>
        <p className="mb-3">{error}</p>
        <p className="text-xs text-yellow-600">
          Make sure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> is correctly set in your environment file.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 text-xs bg-yellow-600 hover:bg-yellow-750 text-white font-medium py-1 px-3 rounded transition"
          >
            Enter Address Manually
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Autocomplete Search input */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for your building, street, or area..."
          className="w-full pl-10 pr-4 py-2.5 text-xs lg:text-sm border border-gray-300 rounded-md focus:outline-none focus:border-heading h-11 md:h-12 bg-white"
        />
        <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>

      {/* Map view area */}
      <div className="relative w-full h-80 rounded-md border border-gray-200 overflow-hidden shadow-inner">
        {/* Map div */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Center Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%-4px)] pointer-events-none z-10 flex flex-col items-center">
          <IoLocation className="text-brandRed text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] w-10 h-10 text-[#FF0000]" />
          <div className="w-2.5 h-1 bg-black opacity-40 rounded-full blur-[1px] -mt-1.5" />
        </div>

        {/* Floating GPS Button */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="absolute bottom-4 right-4 bg-white shadow-md rounded-full p-2.5 z-10 flex items-center justify-center hover:bg-gray-50 border border-gray-250 cursor-pointer transition active:scale-95"
          title="Use Current Location"
        >
          <IoNavigate className="text-[#008755] w-5 h-5 rotate-45" />
        </button>
      </div>

      {/* Selected Address box */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-start gap-3">
        <IoLocation className="text-gray-400 w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold">
            Selected Location
          </span>
          {geocoding ? (
            <span className="text-xs text-gray-500 italic animate-pulse">
              Locating address details...
            </span>
          ) : (
            <p className="text-xs lg:text-sm text-heading font-medium truncate-2-lines">
              {formattedAddress || "Move pin to select address"}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 text-heading font-semibold rounded-md hover:bg-gray-50 transition cursor-pointer text-center text-xs sm:text-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={!currentLocation || geocoding}
          onClick={() => currentLocation && onConfirm(currentLocation)}
          className={cn(
            "flex-1 py-3 px-4 text-white font-semibold rounded-md transition text-center text-xs sm:text-sm cursor-pointer",
            !currentLocation || geocoding
              ? "bg-gray-300 pointer-events-none"
              : "bg-[#008755] hover:bg-[#007044]"
          )}
        >
          Confirm Address
        </button>
      </div>
    </div>
  );
};
