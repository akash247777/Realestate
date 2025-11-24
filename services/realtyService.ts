import { REALTY_API_URL, REALTY_TOKEN } from '../constants';
import type { Property } from '../types';

export const fetchProperties = async (): Promise<Property[]> => {
  try {
    const response = await fetch(REALTY_API_URL, {
      headers: {
        'Authorization': `Bearer ${REALTY_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch properties from RealtyFeed API. Status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // OData responses typically wrap the array in a 'value' property
    const data: any[] = result.value;

    if (!Array.isArray(data)) {
      console.error("API response format incorrect. Expected 'value' to be an array:", result);
      return [];
    }
    
    const resolveArray = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
        return [];
    };

    return data.map((p): Property => {
      // Construct address if UnparsedAddress is missing using standard RESO fields
      const addressParts = [
        p.StreetNumber, 
        p.StreetDirPrefix, 
        p.StreetName, 
        p.StreetSuffix, 
        p.City, 
        p.StateOrProvince, 
        p.PostalCode
      ].filter(Boolean);

      const constructedAddress = addressParts.join(' ');
      const address = p.UnparsedAddress || constructedAddress;

      return {
        ListingKey: p.ListingKey,
        ListingId: p.ListingId,
        ListPrice: p.ListPrice,
        UnparsedAddress: address,
        StreetNumber: p.StreetNumber || '',
        StreetName: p.StreetName || '',
        City: p.City || '',
        BedroomsTotal: p.BedroomsTotal ?? 0,
        BathroomsTotalInteger: p.BathroomsTotalInteger ?? 0,
        LivingArea: p.LivingArea ?? 0,
        Media: p.Media || [],
        Latitude: p.Latitude,
        Longitude: p.Longitude,
        PublicRemarks: p.PublicRemarks || 'No description available.',
        LotSizeAcres: p.LotSizeAcres,
        YearBuilt: p.YearBuilt,
        PropertyType: p.PropertyType,
        SubdivisionName: p.SubdivisionName,
        PropertySubType: p.PropertySubType,
        PostalCode: p.PostalCode,
        
        // Map expanded features
        InteriorFeatures: resolveArray(p.InteriorFeatures),
        ExteriorFeatures: resolveArray(p.ExteriorFeatures),
        Appliances: resolveArray(p.Appliances),
        ParkingFeatures: resolveArray(p.ParkingFeatures),
        Heating: resolveArray(p.Heating),
        Cooling: resolveArray(p.Cooling),
        
        // Map Schools
        ElementarySchool: p.ElementarySchool,
        MiddleOrJuniorSchool: p.MiddleOrJuniorSchool,
        HighSchool: p.HighSchool,

        // Initialize arrays for amenities as empty since the API might not provide them directly
        Schools: [],
        Pharmacies: [],
        Malls: [],
        ATMs: [],
        Groceries: [],
        Transit: [],
        Restaurants: [],
        Hospitals: [],
        Parks: [],
      };
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
};