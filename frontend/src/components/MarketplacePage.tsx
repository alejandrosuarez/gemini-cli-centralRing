import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { Entity, EntityType } from '../App'; // Assuming Entity and EntityType interfaces are exported from App.tsx
import { Modal } from './Modal';
import { EntityDetail } from './EntityDetail';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface MarketplacePageProps {
  // @ts-ignore
  session: any; // Pass the session object to determine auth status
}

export const MarketplacePage: React.FC<MarketplacePageProps> = (props) => {
  const { session } = props;
  void session; // Mark session as used to avoid TS6133
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, string | string[]>>({});
  const [uniqueAttributeValues, setUniqueAttributeValues] = useState<Record<string, Set<any>>>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEntityForModal, setSelectedEntityForModal] = useState<Entity | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        // Fetch public entities
        const entitiesResponse = await axios.get<Entity[]>(`${API_BASE_URL}/public/entities`);
        setEntities(entitiesResponse.data);
        console.log('DEBUG: Fetched entities:', entitiesResponse.data);

        // Fetch entity types (can be public or authenticated, depending on backend setup)
        const entityTypesResponse = await axios.get<EntityType[]>(`${API_BASE_URL}/entity-types`);
        setEntityTypes(entityTypesResponse.data);
        console.log('DEBUG: Fetched entity types:', entityTypesResponse.data);

      } catch (err: any) {
        console.error('Error fetching marketplace data:', err);
        setError(`Failed to load marketplace: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  useEffect(() => {
    // Extract unique attribute values for filtering
    const newUniqueValues: Record<string, Set<any>> = {};
    const entitiesToProcess = selectedEntityTypeId
      ? entities.filter(e => e.typeId === selectedEntityTypeId)
      : entities;

    entitiesToProcess.forEach(entity => {
      entity.attributes.forEach(attr => {
        if (!newUniqueValues[attr.name]) {
          newUniqueValues[attr.name] = new Set();
        }
        if (attr.value !== undefined && attr.value !== null && attr.value !== '') {
          newUniqueValues[attr.name].add(attr.value);
        }
      });
    });
    setUniqueAttributeValues(newUniqueValues);
    console.log('DEBUG: Calculated uniqueAttributeValues:', newUniqueValues);
  }, [entities, selectedEntityTypeId]);

  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEntityTypeId(e.target.value);
    console.log('DEBUG: Selected Entity Type ID:', e.target.value);
    setFilters({}); // Reset filters when entity type changes
  };

  const handleFilterChange = (attributeName: string, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [attributeName]: value,
    }));
    console.log('DEBUG: Filter changed:', attributeName, value);
  };

  const handleMultiSelectChange = (attributeName: string, selectedOptions: HTMLOptionsCollection) => {
    const values = Array.from(selectedOptions).filter(option => option.selected).map(option => option.value);
    handleFilterChange(attributeName, values);
  };

  const filteredEntities = entities.filter(entity => {
    // Filter by entity type
    if (selectedEntityTypeId && entity.typeId !== selectedEntityTypeId) {
      console.log(`DEBUG: Filtering out entity ${entity.id} (type: ${entity.typeId}) because selectedEntityTypeId is ${selectedEntityTypeId}`);
      return false;
    }

    // Filter by attributes
    for (const filterName in filters) {
      const filterValue = filters[filterName];
      if (filterValue === undefined || filterValue === null || (Array.isArray(filterValue) && filterValue.length === 0)) {
        continue; // Skip empty filters
      }

      const attribute = entity.attributes.find(attr => attr.name === filterName);

      if (!attribute) {
        console.log(`DEBUG: Filtering out entity ${entity.id} because it does not have attribute ${filterName}`);
        return false; // Entity does not have this attribute
      }

      if (Array.isArray(filterValue)) {
        // Multi-select filter
        if (!filterValue.includes(String(attribute.value))) {
          console.log(`DEBUG: Filtering out entity ${entity.id} because attribute ${filterName} value ${attribute.value} is not in selected values ${filterValue}`);
          return false;
        }
      } else {
        // Single-select or text filter
        if (String(attribute.value).toLowerCase().indexOf(filterValue.toLowerCase()) === -1) {
          console.log(`DEBUG: Filtering out entity ${entity.id} because attribute ${filterName} value ${attribute.value} does not match filter ${filterValue}`);
          return false;
        }
      }
    }
    return true;
  });
  console.log('DEBUG: Filtered entities count:', filteredEntities.length, 'Filtered entities:', filteredEntities);

  const currentEntityType = entityTypes.find(type => type.id === selectedEntityTypeId);

  if (loading) {
    return <div>Loading marketplace...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleOpenModal = (entity: Entity) => {
    setSelectedEntityForModal(entity);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntityForModal(null);
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Sidebar for Filters */}
      <div style={{ flex: '0 0 250px', borderRight: '1px solid #eee', paddingRight: '20px' }}>
        <h2>Filters</h2>
        <div>
          <label htmlFor="entityTypeSelect">Entity Type:</label>
          <select id="entityTypeSelect" value={selectedEntityTypeId} onChange={handleEntityTypeChange} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
            <option value="">All Types</option>
            {entityTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        <button onClick={() => { setSelectedEntityTypeId(''); setFilters({}); }} style={{ marginTop: '10px', padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Clear All Filters
        </button>

        {currentEntityType && currentEntityType.predefinedAttributes.length > 0 && (
          <div>
            <h3>Attributes for {currentEntityType.name}</h3>
            {currentEntityType.predefinedAttributes.map(attr => {
              const uniqueValuesForAttr = Array.from(uniqueAttributeValues[attr.name] || []);

              if (attr.type === 'boolean') {
                return (
                  <div key={attr.name} style={{ marginBottom: '10px' }}>
                    <label>{attr.name}:</label>
                    <select
                      value={filters[attr.name] || ''}
                      onChange={(e) => handleFilterChange(attr.name, e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    >
                      <option value="">Any</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                );
              } else if (uniqueValuesForAttr.length > 0 && uniqueValuesForAttr.length < 10) { // Use multi-select for few unique values
                return (
                  <div key={attr.name} style={{ marginBottom: '10px' }}>
                    <label>{attr.name}:</label>
                    <select
                      multiple
                      value={Array.isArray(filters[attr.name]) ? filters[attr.name] : []}
                      onChange={(e) => handleMultiSelectChange(attr.name, e.target.options)}
                      style={{ width: '100%', padding: '8px', minHeight: '60px' }}
                    >
                      {uniqueValuesForAttr.map(val => (
                        <option key={String(val)} value={String(val)}>{String(val)}</option>
                      ))}
                    </select>
                  </div>
                );
              } else {
                return (
                  <div key={attr.name} style={{ marginBottom: '10px' }}>
                    <label htmlFor={`filter-${attr.name}`}>{attr.name} ({attr.type}):</label>
                    <input
                      type="text"
                      id={`filter-${attr.name}`}
                      value={filters[attr.name] || ''}
                      onChange={(e) => handleFilterChange(attr.name, e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Main Content for Entities */}
      <div style={{ flex: '1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredEntities.length === 0 ? (
          <p>No entities found matching your criteria.</p>
        ) : (
          filteredEntities.map(entity => (
            <div key={entity.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
              <h3>{entity.name} (Type: {entity.typeId})</h3>
              <p>Owner: {entity.ownerId}</p>
              <p>Attributes:</p>
              <ul>
                {entity.attributes.map(attr => (
                  <li key={attr.name}>{attr.name}: {JSON.stringify(attr.value)} {attr.notApplicable ? '(N/A)' : ''}</li>
                ))}
              </ul>
              <button onClick={() => handleOpenModal(entity)} style={{ marginTop: '10px', display: 'block' }}>View Details (Modal)</button>
            </div>
          ))
        )}
      </div>

      {selectedEntityForModal && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
          <EntityDetail entity={selectedEntityForModal} session={session} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};