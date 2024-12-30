export interface BaseFacility {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone_number?: string;
  facility_type: string;
  read_cover_image_url?: string;
  cover_image_url?: string;
  features: number[];
  geo_organization?: string;
}

export type CreateFacility = Omit<BaseFacility, "id">;
