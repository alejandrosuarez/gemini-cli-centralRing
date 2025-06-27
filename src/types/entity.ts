
export interface Attribute {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required: boolean;
  defaultValue?: any;
  isUserDefined: boolean; // True if added by user, false if part of predefined schema
  value?: any; // The actual value for an instance of an entity
  notApplicable: boolean; // If the user explicitly marked this attribute as not applicable
}

export interface EntityType {
  id: string;
  name: string;
  description?: string;
  predefinedAttributes: Attribute[];
}

export interface Entity {
  id: string;
  typeId: string; // References EntityType.id
  name: string;
  attributes: Attribute[]; // Combination of predefined and user-defined attributes
  createdAt: Date;
  updatedAt: Date;
  ownerId: string; // To track who owns the entity
  missingInfoAttributes: string[]; // List of attribute names that are required but missing
  requestedByUsers: string[]; // List of user IDs who requested missing info
  interactionLog: {
    timestamp: Date;
    userId: string;
    action: string; // e.g., 'view', 'edit', 'attribute_requested', 'attribute_filled'
    details?: any;
  }[];
}
