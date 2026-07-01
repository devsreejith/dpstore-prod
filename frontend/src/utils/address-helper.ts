export interface ExtraAddressDetails {
  apartment: string;
  building: string;
  floor: string;
  landmark: string;
  lat: string;
  lng: string;
}

export const parseAddress2 = (address2: string = ''): ExtraAddressDetails => {
  const result: ExtraAddressDetails = {
    apartment: '',
    building: '',
    floor: '',
    landmark: '',
    lat: '',
    lng: '',
  };

  if (!address2) return result;

  const parts = address2.split(', ');
  for (const part of parts) {
    if (part.startsWith('Apt/Villa: ')) {
      result.apartment = part.replace('Apt/Villa: ', '');
    } else if (part.startsWith('Bldg: ')) {
      result.building = part.replace('Bldg: ', '');
    } else if (part.startsWith('Floor: ')) {
      result.floor = part.replace('Floor: ', '');
    } else if (part.startsWith('Landmark: ')) {
      result.landmark = part.replace('Landmark: ', '');
    } else if (part.startsWith('Coords: ')) {
      const coords = part.replace('Coords: ', '').split(',');
      if (coords.length === 2) {
        result.lat = coords[0];
        result.lng = coords[1];
      }
    }
  }

  return result;
};

export const formatAddress2ForDisplay = (address2: string = ''): string => {
  if (!address2) return '';
  const parsed = parseAddress2(address2);
  if (!parsed.apartment && !parsed.building && !parsed.floor && !parsed.landmark) {
    return address2;
  }
  const parts = [];
  if (parsed.apartment) parts.push(`Apt/Villa: ${parsed.apartment}`);
  if (parsed.building) parts.push(parsed.building);
  if (parsed.floor) parts.push(`Floor: ${parsed.floor}`);
  if (parsed.landmark) parts.push(`Landmark: ${parsed.landmark}`);
  return parts.join(', ');
};

export const serializeAddress2 = (details: Partial<ExtraAddressDetails>): string => {
  const parts = [];
  if (details.apartment?.trim()) parts.push(`Apt/Villa: ${details.apartment.trim()}`);
  if (details.building?.trim()) parts.push(`Bldg: ${details.building.trim()}`);
  if (details.floor?.trim()) parts.push(`Floor: ${details.floor.trim()}`);
  if (details.landmark?.trim()) parts.push(`Landmark: ${details.landmark.trim()}`);
  if (details.lat && details.lng) parts.push(`Coords: ${details.lat},${details.lng}`);
  return parts.join(', ');
};
