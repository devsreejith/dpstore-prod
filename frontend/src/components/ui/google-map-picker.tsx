import React, { useEffect, useRef, useState, useCallback } from "react";
import { IoLocation, IoNavigate, IoSearch, IoClose } from "react-icons/io5";
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
  address_1?: string;
  building?: string;
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

// Helper to normalize UAE emirate names to match form selector options
const normalizeEmirate = (province: string): string => {
  if (!province) return "";
  const p = province.toLowerCase();
  if (p.includes("dubai") || p.includes("dubayy")) return "Dubai";
  if (p.includes("abu dhabi") || p.includes("abu zaby")) return "Abu Dhabi";
  if (p.includes("sharjah") || p.includes("shariqah")) return "Sharjah";
  if (p.includes("ajman")) return "Ajman";
  if (p.includes("fujairah") || p.includes("fujayrah")) return "Fujairah";
  if (p.includes("ras al khaimah") || p.includes("khaymah")) return "Ras Al Khaimah";
  if (p.includes("umm al quwain") || p.includes("qaywayn")) return "Umm Al Quwain";
  return province;
};

// Helper to extract address components from Geocoding response
const extractAddressComponents = (components: any[], formattedAddress: string) => {
  let streetNumber = "";
  let route = "";
  let neighborhood = "";
  let premise = "";
  let subpremise = "";
  let city = "";
  let province = "";
  let postalCode = "";
  let countryCode = "ae";

  for (const component of components) {
    const types = component.types;
    if (types.includes("street_number")) {
      streetNumber = component.long_name;
    } else if (types.includes("route")) {
      route = component.long_name;
    } else if (types.includes("neighborhood") || types.includes("sublocality_level_1")) {
      neighborhood = component.long_name;
    } else if (types.includes("premise")) {
      premise = component.long_name;
    } else if (types.includes("subpremise")) {
      subpremise = component.long_name;
    } else if (types.includes("locality")) {
      city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      province = normalizeEmirate(component.long_name); // e.g. "Dubai"
    } else if (types.includes("postal_code")) {
      postalCode = component.long_name;
    } else if (types.includes("country")) {
      countryCode = component.short_name.toLowerCase();
    }
  }

  // Fallbacks for UAE regions
  if (!city && province) city = province;

  // 1. Build the building name/number
  let building = [premise, subpremise].filter(Boolean).join(", ");
  if (!building && streetNumber) {
    building = streetNumber;
  }

  // 2. Build the Address line (address_1)
  let temp = formattedAddress;

  // Strip plus code prefix (e.g. "673C+W8M Alsaillkabeer Saudi Arabia - ")
  temp = temp.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,}[^,\-]*[,\-]\s*/i, "");

  let countryName = "";
  for (const component of components) {
    if (component.types.includes("country")) {
      countryName = component.long_name;
      break;
    }
  }

  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const stripTrailing = (str: string, term: string) => {
    if (!term) return str;
    const regex = new RegExp(`[,\\-\\s]+${escapeRegExp(term)}\\s*$`, 'i');
    return str.replace(regex, '');
  };

  temp = stripTrailing(temp, countryName);
  temp = stripTrailing(temp, province);
  if (city && city !== province) {
    temp = stripTrailing(temp, city);
  }
  if (postalCode) {
    temp = stripTrailing(temp, postalCode);
  }

  // Clean remaining trailing spaces/dashes/commas
  let address_1 = temp.replace(/[,\\-\s]+$/, '').trim();

  // Fallback if address_1 becomes empty
  if (!address_1) {
    let addressParts: string[] = [];
    if (route) addressParts.push(route);
    if (neighborhood) addressParts.push(neighborhood);
    address_1 = addressParts.join(", ");
  }

  return { city, province, postalCode, countryCode, address_1, building };
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
  const geocoderRef = useRef<any>(null);
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const justZoomedRef = useRef(false);

  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState("");
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClearButton, setShowClearButton] = useState(false);

  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      searchInputRef.current.focus();
      setShowClearButton(false);
    }
  };

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current && (window as any).google?.maps) {
      geocoderRef.current = new (window as any).google.maps.Geocoder();
    }
    if (!geocoderRef.current) return;


    setGeocoding(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      setGeocoding(false);
      if (status === "OK" && results && results[0]) {
        const result = results[0];
        setFormattedAddress(result.formatted_address);

        // Cache coordinates to prevent redundant geocoding on idle/zooms
        lastGeocodedCoordsRef.current = { lat, lng };

        const extracted = extractAddressComponents(result.address_components, result.formatted_address);
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
  }, []);

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

  // Bind places autocomplete and map events
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

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const addr = place.formatted_address || searchInputRef.current?.value || "";
          setFormattedAddress(addr);

          // Show clear button when search result is populated
          setShowClearButton(true);

          // Update lastGeocodedCoordsRef to prevent idle geocoder from overwriting search result
          lastGeocodedCoordsRef.current = { lat, lng };

          if (place.address_components) {
            const extracted = extractAddressComponents(place.address_components, addr);
            setCurrentLocation({
              lat,
              lng,
              formattedAddress: addr,
              ...extracted,
            });
          }
        }
      });
    }

    // Monitor input events to toggle search clear button
    const searchInput = searchInputRef.current;
    const handleInputChange = () => {
      if (searchInput) {
        setShowClearButton(searchInput.value.length > 0);
      }
    };
    if (searchInput) {
      searchInput.addEventListener("input", handleInputChange);
    }

    // Listen to zoom changes to skip next geocoding
    const zoomListener = map.addListener("zoom_changed", () => {
      justZoomedRef.current = true;
    });

    // Listen to map idle to update address as user pans/drags the map
    const idleListener = map.addListener("idle", () => {
      if (justZoomedRef.current) {
        justZoomedRef.current = false;
        return;
      }
      const center = map.getCenter();
      if (center) {
        const newLat = center.lat();
        const newLng = center.lng();

        // Keep a secondary fallback check: if the center hasn't moved significantly,
        // we also skip reverse geocoding to preserve search selection details.
        if (
          lastGeocodedCoordsRef.current &&
          Math.abs(lastGeocodedCoordsRef.current.lat - newLat) < 0.0001 &&
          Math.abs(lastGeocodedCoordsRef.current.lng - newLng) < 0.0001
        ) {
          return;
        }

        reverseGeocode(newLat, newLng);
      }
    });

    // Listen to map clicks to center and geocode the clicked point
    const clickListener = map.addListener("click", (e: any) => {
      if (e.latLng) {
        map.panTo(e.latLng);
        reverseGeocode(e.latLng.lat(), e.latLng.lng());
      }
    });

    // Run initial geocoding on default center
    const initialCenter = map.getCenter();
    if (initialCenter) {
      reverseGeocode(initialCenter.lat(), initialCenter.lng());
    }

    return () => {
      if (searchInput) {
        searchInput.removeEventListener("input", handleInputChange);
      }
      if (zoomListener) {
        (window as any).google.maps.event.removeListener(zoomListener);
      }
      if (idleListener) {
        (window as any).google.maps.event.removeListener(idleListener);
      }
      if (clickListener) {
        (window as any).google.maps.event.removeListener(clickListener);
      }
    };
  }, [map, reverseGeocode]);

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
          reverseGeocode(userLocation.lat, userLocation.lng);
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
          className="w-full pl-10 pr-10 py-2.5 text-xs lg:text-sm border border-gray-300 rounded-md focus:outline-none focus:border-heading h-11 md:h-12 bg-white"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
        />
        <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 transition cursor-pointer"
            title="Clear search"
          >
            <IoClose className="w-5 h-5" />
          </button>
        )}
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
          className="absolute top-4 right-4 bg-white shadow-md rounded-full p-2.5 z-10 flex items-center justify-center hover:bg-gray-50 border border-gray-250 cursor-pointer transition active:scale-95"
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 text-heading font-semibold rounded-md hover:bg-gray-50 transition cursor-pointer text-center text-xs sm:text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
