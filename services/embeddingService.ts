import { GoogleGenAI } from '@google/genai';
import type { Property } from '../types';

let vectorStore: { property: Property; embedding: number[] }[] = [];
let ai: GoogleGenAI;
let isInitialized = false;

const dotProduct = (vecA: number[], vecB: number[]): number => {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
};

const createPropertyDocument = (property: Property): string => {
  const features = [
    ...(property.InteriorFeatures || []),
    ...(property.ExteriorFeatures || []),
    ...(property.Appliances || []),
    ...(property.ParkingFeatures || []),
    ...(property.Heating || []),
    ...(property.Cooling || [])
  ].filter(Boolean).join(', ');

  const schools = [
    property.ElementarySchool,
    property.MiddleOrJuniorSchool,
    property.HighSchool
  ].filter(Boolean).map(s => `${s} School`).join(', ');

  const amenities = [
    ...(property.Schools?.map(s => `Nearby School: ${s.split('(')[0].trim()}`) || []),
    ...(property.Hospitals?.map(h => `Hospital: ${h.split('(')[0].trim()}`) || []),
    ...(property.Parks?.map(p => `Park: ${p.split('(')[0].trim()}`) || []),
    ...(property.Restaurants?.map(r => `Restaurant: ${r.split('(')[0].trim()}`) || []),
  ].slice(0, 5).join(', ');

  // Create a rich text representation for the model to understand
  return `
    Property Listing.
    Address: ${property.UnparsedAddress}.
    City: ${property.City}, Zip: ${property.PostalCode}.
    Subdivision: ${property.SubdivisionName || 'N/A'}.
    Price: $${property.ListPrice}.
    Type: ${property.PropertyType}.
    Details: ${property.BedroomsTotal} bedrooms, ${property.BathroomsTotalInteger} bathrooms, ${property.LivingArea} sqft living area, ${property.LotSizeAcres || 0} acres lot.
    Year Built: ${property.YearBuilt || 'N/A'}.
    
    Designated Schools: ${schools || 'Not specified'}.
    
    Key Features & Amenities: ${features || 'Not specified'}.
    
    Nearby Places: ${amenities || 'N/A'}.
    
    Description: ${property.PublicRemarks}.
  `.replace(/\s+/g, ' ').trim();
};

export const initializeRagService = async (properties: Property[]): Promise<void> => {
  if (isInitialized) return;

  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const documents = properties.map(p => ({
        property: p,
        doc: createPropertyDocument(p),
    }));

    const batchSize = 100;
    vectorStore = []; // Reset vector store on initialization
    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        console.log(`Embedding batch ${Math.floor(i / batchSize) + 1}...`);
        
        const result = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: batch.map(({ doc }) => ({ parts: [{ text: doc }] }))
        });

        const embeddings = result.embeddings;
        if (embeddings.length !== batch.length) {
            console.error(`Mismatched embedding count. Expected ${batch.length}, got ${embeddings.length}`);
            throw new Error('Mismatched embedding count during batch processing.');
        }
        
        const batchVectorStore = batch.map((item, index) => ({
          property: item.property,
          embedding: embeddings[index].values,
        }));
        vectorStore.push(...batchVectorStore);
    }
    
    isInitialized = true;
    console.log(`RAG service initialized. ${vectorStore.length} properties embedded.`);

  } catch (error) {
    console.error("Error initializing RAG service:", error);
    throw new Error("Could not initialize the search service. Please try again later.");
  }
};

export const embedQuery = async (query: string): Promise<number[]> => {
  if (!ai) throw new Error("RAG service not initialized.");
  const result = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: {
      parts: [{ text: query }]
    }
  });
  return result.embeddings[0].values;
};

export const findSimilarProperties = (queryEmbedding: number[], topK: number): Property[] => {
  if (vectorStore.length === 0) {
    throw new Error("RAG service is not initialized.");
  }

  const similarities = vectorStore.map(item => ({
    property: item.property,
    similarity: dotProduct(queryEmbedding, item.embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, topK).map(item => item.property);
};