import React, { useState, useEffect } from "react";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react";
import cn from "classnames";
import { useTranslation } from "next-i18next";
import { AsYouType, parsePhoneNumberFromString, CountryCode, getCountries, getCountryCallingCode, Metadata } from "libphonenumber-js";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flagUrl: string;
}

// Get the display name of a region in the current language
const getCountryName = (code: string, locale: string = "en") => {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(code) || code;
  } catch (e) {
    return code;
  }
};

// Generate list of all countries dynamically from libphonenumber-js
const generateCountriesList = (): Country[] => {
  const unsortedCountries = getCountries()
    .map((code) => {
      let dialCode = "";
      try {
        dialCode = `+${getCountryCallingCode(code)}`;
      } catch (e) {
        // Ignore regions without standard dialing code
      }
      return {
        code,
        name: getCountryName(code),
        dialCode,
        flagUrl: `https://flagcdn.com/w20/${code.toLowerCase()}.png`,
      };
    })
    .filter((c) => c.dialCode);

  // Sort alphabetically by name
  const sorted = [...unsortedCountries].sort((a, b) => a.name.localeCompare(b.name));

  // Pin UAE to the top as default
  const aeIndex = sorted.findIndex((c) => c.code === "AE");
  if (aeIndex > -1) {
    const [ae] = sorted.splice(aeIndex, 1);
    sorted.unshift(ae);
  }

  return sorted;
};

export const COUNTRIES = generateCountriesList();

export const getCountryMaxDigits = (countryCode: string): number => {
  const predefined: Record<string, number> = {
    IN: 10,
    AE: 9,
    SA: 9,
    QA: 8,
    OM: 8,
    BH: 8,
    KW: 8,
    US: 10,
    CA: 10,
    GB: 10,
    EG: 10,
    PK: 10,
  };
  
  if (predefined[countryCode]) {
    return predefined[countryCode];
  }
  
  try {
    const metadata = new Metadata();
    metadata.selectNumberingPlan(countryCode as any);
    if (metadata.numberingPlan) {
      const lengths = metadata.numberingPlan.possibleLengths();
      if (lengths && lengths.length > 0) {
        return Math.max(...lengths);
      }
    }
  } catch (e) {
    // Ignore
  }
  
  return 15;
};

// Helper to parse phone number into country and national number
export const parsePhone = (value: string = "") => {
  const cleaned = value.trim();
  if (cleaned.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(cleaned);
    if (parsed && parsed.country) {
      const country = COUNTRIES.find((c) => c.code === parsed.country);
      if (country) {
        return {
          country,
          localNumber: parsed.nationalNumber as string,
        };
      }
    }
  }

  // If the value starts with a known dial code without the plus (e.g. 971501234567)
  for (const country of COUNTRIES) {
    const dialWithoutPlus = country.dialCode.replace("+", "");
    if (cleaned.startsWith(dialWithoutPlus)) {
      return {
        country,
        localNumber: cleaned.slice(dialWithoutPlus.length),
      };
    }
  }

  // Fallback: Default to UAE and strip any leading 0 (e.g. 0501234567 -> 501234567)
  const defaultCountry = COUNTRIES.find((c) => c.code === "AE") || COUNTRIES[0];
  let localNumber = cleaned;
  if (localNumber.startsWith("0")) {
    localNumber = localNumber.slice(1);
  }
  return {
    country: defaultCountry,
    localNumber,
  };
};

export interface PhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  labelKey?: string;
  errorKey?: string;
  variant?: "normal" | "solid" | "outline";
  shadow?: boolean;
  className?: string;
  disabled?: boolean;
}

const classes = {
  root: "flex items-center w-full border text-input text-xs lg:text-sm font-body transition duration-200 ease-in-out rounded-md focus-within:ring-1",
  normal:
    "bg-gray-100 border-gray-300 focus-within:shadow focus-within:bg-white focus-within:border-primary min-h-12",
  solid:
    "bg-white border-gray-300 focus-within:outline-none focus-within:border-heading h-11 md:h-12 focus-within:ring-heading",
  outline: "border-gray-300 focus-within:border-primary",
  shadow: "focus-within:shadow",
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = "",
  onChange,
  labelKey,
  errorKey,
  variant = "normal",
  shadow = false,
  className = "block",
  disabled = false,
}) => {
  const { t } = useTranslation("common");

  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    return COUNTRIES.find((c) => c.code === "AE") || COUNTRIES[0];
  });
  const [localNumber, setLocalNumber] = useState("");

  // Sync internal state with external value when it changes
  useEffect(() => {
    const currentE164 = selectedCountry.dialCode + localNumber.replace(/\D/g, "");
    if (value !== currentE164) {
      const parsed = parsePhone(value);
      setSelectedCountry(parsed.country);

      let rawDigits = parsed.localNumber.replace(/\D/g, "");
      const maxDigits = getCountryMaxDigits(parsed.country.code);
      if (rawDigits.length > maxDigits) {
        rawDigits = rawDigits.slice(0, maxDigits);
      }

      const formatter = new AsYouType(parsed.country.code as CountryCode);
      const formatted = formatter.input(rawDigits);
      setLocalNumber(formatted);
    }
  }, [value]);

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    // Strip non-digits and reformat for new country
    let rawDigits = localNumber.replace(/\D/g, "");
    if (rawDigits.startsWith("0")) {
      rawDigits = rawDigits.slice(1);
    }
    const maxDigits = getCountryMaxDigits(country.code);
    if (rawDigits.length > maxDigits) {
      rawDigits = rawDigits.slice(0, maxDigits);
    }
    const formatter = new AsYouType(country.code as CountryCode);
    const formatted = formatter.input(rawDigits);
    setLocalNumber(formatted);

    const e164 = rawDigits ? `${country.dialCode}${rawDigits}` : "";
    onChange(e164);
  };

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    let rawDigits = inputVal.replace(/\D/g, "");
    if (rawDigits.startsWith("0")) {
      rawDigits = rawDigits.slice(1);
    }
    const maxDigits = getCountryMaxDigits(selectedCountry.code);
    if (rawDigits.length > maxDigits) {
      rawDigits = rawDigits.slice(0, maxDigits);
    }

    const formatter = new AsYouType(selectedCountry.code as CountryCode);
    const formatted = formatter.input(rawDigits);
    setLocalNumber(formatted);

    const e164 = rawDigits ? `${selectedCountry.dialCode}${rawDigits}` : "";
    onChange(e164);
  };

  return (
    <div className={className}>
      {labelKey && (
        <label
          className="block text-gray-600 font-semibold text-sm leading-none mb-3 cursor-pointer"
        >
          {t(labelKey)}
        </label>
      )}

      {/* Force LTR direction for phone input layout */}
      <div
        dir="ltr"
        className={cn(
          classes.root,
          {
            [classes.normal]: variant === "normal",
            [classes.solid]: variant === "solid",
            [classes.outline]: variant === "outline",
            [classes.shadow]: shadow,
            "opacity-50 pointer-events-none": disabled,
          }
        )}
      >
        <Listbox value={selectedCountry} onChange={handleCountryChange} disabled={disabled}>
          <div className="relative h-full flex items-center">
            <ListboxButton className="flex items-center gap-2 px-3 select-none h-full outline-none cursor-pointer hover:bg-gray-50 whitespace-nowrap min-w-[105px] justify-center transition duration-150 rounded-l-md border-0 bg-transparent">
              <img
                src={selectedCountry.flagUrl}
                alt={selectedCountry.code}
                className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
              />
              <span className="text-xs lg:text-sm text-heading font-semibold leading-none flex items-center">
                {selectedCountry.dialCode}
              </span>
              <span className="text-[8px] text-gray-400 font-normal leading-none flex items-center self-center pb-0.5">▼</span>
            </ListboxButton>

            <ListboxOptions className="absolute left-0 top-full mt-1.5 w-72 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-xl z-50 focus:outline-none py-1">
              {COUNTRIES.map((country) => (
                <ListboxOption
                  key={country.code}
                  value={country}
                  className={({ active }) =>
                    cn(
                      "cursor-pointer select-none relative py-2 px-3 flex items-center justify-between text-xs lg:text-sm transition-colors duration-100",
                      active ? "bg-gray-100 text-heading" : "text-gray-700"
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="flex items-center gap-2.5 truncate">
                        <img
                          src={country.flagUrl}
                          alt={country.code}
                          className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
                        />
                        <span className={cn("truncate", selected ? "font-semibold" : "font-normal")}>
                          {country.name}
                        </span>
                      </span>
                      <span className="text-gray-400 font-semibold text-xs ml-2 flex-shrink-0">
                        {country.dialCode}
                      </span>
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>

        {/* Separator */}
        <span className="text-gray-300 select-none px-1">|</span>

        {/* Local number input field */}
        <input
          type="tel"
          disabled={disabled}
          value={localNumber}
          onChange={handleLocalNumberChange}
          placeholder="50 123 4567"
          className="flex-1 h-full px-3 bg-transparent outline-none focus:outline-none focus:ring-0 border-0 focus:border-0 p-0 text-heading text-xs lg:text-sm"
        />
      </div>

      {errorKey && <p className="my-2 text-xs text-red-500">{t(errorKey)}</p>}
    </div>
  );
};
