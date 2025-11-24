

export interface Property {
  ListingKey: string;
  ListingId: string;
  ListPrice: number;
  UnparsedAddress: string;
  StreetNumber: string;
  StreetName: string;
  City: string;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  LivingArea: number;
  Media: Media[];
  Latitude?: number;
  Longitude?: number;
  PublicRemarks: string;
  LotSizeAcres?: number;
  YearBuilt?: number;
  PropertyType?: string;
  SubdivisionName?: string;
  PropertySubType?: string;
  PostalCode?: string;

  // Expanded Features
  InteriorFeatures?: string[];
  ExteriorFeatures?: string[];
  Appliances?: string[];
  ParkingFeatures?: string[];
  Heating?: string[];
  Cooling?: string[];

  // Schools
  ElementarySchool?: string;
  MiddleOrJuniorSchool?: string;
  HighSchool?: string;

  // Nearby Amenities (Placeholders or external data)
  Schools?: string[];
  Pharmacies?: string[];
  Malls?: string[];
  ATMs?: string[];
  Groceries?: string[];
  Transit?: string[];
  Restaurants?: string[];
  Hospitals?: string[];
  Parks?: string[];
}

export interface Media {
  MediaURL: string;
}

// --- New Search Interfaces ---

export interface AmenityFilter {
  type: string;
  distance: number; // in miles
  condition: 'within' | 'away from';
}

export interface NamedAmenityFilter {
  name: string;
  type: string;
  distance: number; // in miles
  condition: 'within' | 'away from';
}

export interface FilterCriteria {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minLivingArea?: number;
  maxLivingArea?: number;
  location?: string;
  amenities?: AmenityFilter[];
  namedAmenities?: NamedAmenityFilter[];
  keywords?: string[];
  landmark?: {
    name: string;
    distance: number;
    condition: 'within' | 'away from';
  };
}


// --- Google API Types ---

export interface AirQualityResponse {
  indexes: {
    aqi: number;
    displayName: string;
    category: string;
    dominantPollutant: string;
    code?: string;
  }[];
  pollutants: {
    code: string;
    displayName: string;
    concentration: {
      value: number;
      units: string;
    };
  }[];
}

export interface SolarPotentialResponse {
  solarPotential: {
    maxArrayAreaMeters2: number;
    carbonOffsetFactorKgPerMwh: number;
    financialAnalyses: {
      monthlyBill: {
        units: string;
        nanos: number;
      };
      panelConfig: {
        panelsCount: number;
        yearlyEnergyDcKwh: number;
      };
      financialDetails: {
        initialAcKwhPerYear: number;
        remainingLifetimeUtilityBill: {
          units: string;
          nanos: number;
        }
        savings: {
          savingsYear1: {
            units: string;
            nanos: number;
          };
          savingsYear20: {
            units: string;
            nanos: number;
          };
        }
      }
    }[];
  };
}


export interface PollenResponse {
  dailyInfo: {
    date: {
      year: number;
      month: number;
      day: number;
    };
    pollenTypeInfo: {
      code: string;
      displayName: string;
      inSeason: boolean;
      indexInfo?: {
        value: number;
        category: string;
      }
    }[];
  }[];
}

export interface GeocodeResponse {
  results: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      }
    }
  }[];
  status?: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  error_message?: string;
}

export interface RoutesResponse {
  routes: {
    distanceMeters: number;
    duration: string;
    polyline?: {
      encodedPolyline: string;
    };
    legs: {
      steps: {
        staticDuration: string;
        distanceMeters: number;
        polyline: {
          encodedPolyline: string;
        };
        navigationInstruction: {
          instructions: string;
          maneuver: string;
        }
      }[]
    }[]
  }[];
}

export interface RouteInfo {
  distance: number;
  duration: string;
  polyline?: string;
}

export interface StreetViewMetadataResponse {
  status: 'OK' | 'ZERO_RESULTS';
  pano_id?: string;
}

// --- Search API Types ---

export interface SearchResult {
  success: boolean;
  query: string;
  sql: string;
  results: Property[];
  count: number;
}

export interface SearchError {
  success: false;
  error: string;
}
