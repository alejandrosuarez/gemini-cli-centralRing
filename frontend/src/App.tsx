import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MarketplacePage } from './components/MarketplacePage';
import { createClient } from '@supabase/supabase-js';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not set in .env.local file.');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
  entityType?: EntityType; // Add entityType to the Entity interface
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function App() {
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState<string>('');

  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [newEntityType, setNewEntityType] = useState<Partial<EntityType>>({ id: '', name: '', predefinedAttributes: [] });
  const [newEntity, setNewEntity] = useState<Partial<Entity>>({ id: '', typeId: '', name: '', attributes: [], createdAt: new Date(), updatedAt: new Date(), ownerId: '' });
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);

  // Supabase Auth State Change Listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      console.log('DEBUG: Supabase auth state changed - Event:', _event, 'Session:', session);
      setSession(session);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      console.log('DEBUG: Initial getSession result:', session);
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log('DEBUG: App component session state updated:', session);
    if (session?.access_token) {
      fetchEntityTypes();
      fetchEntities();
    } else {
      setEntityTypes([]);
      setEntities([]);
    }
  }, [session]);

  useEffect(() => {
    if (newEntity.typeId) {
      const type = entityTypes.find((et: EntityType) => et.id === newEntity.typeId);
      setSelectedEntityType(type || null);
      if (type) {
        setNewEntity((prev: Partial<Entity>) => ({
          ...prev,
          attributes: type.predefinedAttributes.map((attr: Attribute) => ({
            ...attr,
            value: attr.defaultValue || undefined,
            notApplicable: false,
          })),
        }));
      }
    }
  }, [newEntity.typeId, entityTypes]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use backend for sending OTP
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, { email });
      setMessage(response.data.message);
    } catch (error: unknown) {
      setMessage(`Error sending OTP: ${(error as any).response?.data?.error || (error as Error).message}`);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use backend for verifying OTP, which then uses Supabase's signInWithPassword/signUp
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { email, token: otp });
      // Explicitly set the session on the Supabase client
      await supabase.auth.setSession(response.data.session);
      setMessage(response.data.message);
    } catch (error: unknown) {
      setMessage(`Error verifying OTP: ${(error as any).response?.data?.error || (error as Error).message}`);
    }
};

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMessage('Logged out successfully.');
    } catch (error: any) {
      setMessage(`Error logging out: ${error.message}`);
    }
  };

  const fetchEntityTypes = async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('DEBUG: fetchEntityTypes - Using access token:', session.access_token);
      } else {
        console.log('DEBUG: fetchEntityTypes - No access token available.');
      }
      const response = await axios.get<EntityType[]>(`${API_BASE_URL}/entity-types`, { headers });
      setEntityTypes(response.data);
    } catch (error: unknown) {
      console.error('Error fetching entity types:', error);
      setMessage(`Error fetching entity types: ${(error as any).response?.data?.error || (error as Error).message}`);
    }
  };

  const fetchEntities = async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('DEBUG: fetchEntities - Using access token:', session.access_token);
      } else {
        console.log('DEBUG: fetchEntities - No access token available.');
      }
      const response = await axios.get<Entity[]>(`${API_BASE_URL}/entities`, { headers });
      setEntities(response.data);
    } catch (error: unknown) {
      console.error('Error fetching entities:', error);
      setMessage(`Error fetching entities: ${(error as any).response?.data?.error || (error as Error).message}`);
    }
  };

  const handleAddEntityType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/entity-types`, newEntityType);
      setNewEntityType({ id: '', name: '', predefinedAttributes: [] });
      fetchEntityTypes();
      setMessage('Entity Type added successfully!');
    } catch (error: unknown) {
      console.error('Error adding entity type:', error);
      setMessage(`Error adding entity type: ${(error as any).response?.data?.error || (error as Error).message}`);
    }
  };

  const handleAttributeChange = (attrName: string, value: any, isNotApplicable: boolean) => {
    setNewEntity((prev: Partial<Entity>) => ({
      ...prev,
      attributes: prev.attributes?.map((attr: Attribute) =>
        attr.name === attrName
          ? { ...attr, value: isNotApplicable ? undefined : value, notApplicable: isNotApplicable }
          : attr
      ) || [],
    }));
  };

  const handleAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attributesToSubmit = newEntity.attributes?.filter((attr: Attribute) => 
        !attr.notApplicable && (attr.value !== undefined && attr.value !== null && attr.value !== '')
      ) || [];

      const missingRequired = newEntity.attributes?.filter((attr: Attribute) => 
        attr.required && !attr.notApplicable && (attr.value === undefined || attr.value === null || attr.value === '')
      ).map((attr: Attribute) => attr.name) || [];

      if (missingRequired.length > 0) {
        alert(`Please fill in the following required attributes: ${missingRequired.join(', ')}`);
        return;
      }

      await axios.post(`${API_BASE_URL}/entities`, { 
        ...newEntity, 
        attributes: attributesToSubmit,
        ownerId: session?.user.id, // Set ownerId from authenticated user
        createdAt: new Date(),
        updatedAt: new Date(),
        missingInfoAttributes: missingRequired, // Include missing attributes
      });
      setNewEntity({ id: '', typeId: '', name: '', attributes: [], createdAt: new Date(), updatedAt: new Date(), ownerId: '' });
      fetchEntities();
      setMessage('Entity added successfully!');
    } catch (error: unknown) {
      console.error('Error adding entity:', error);
      setMessage(`Error adding entity: ${(error as any).response?.data?.error || (error as Error).message}`);
    }
  };

  console.log('DEBUG: App.tsx rendering - current session:', session, 'session.user:', session?.user);
  return (
    <Router>
      <div style={{ padding: '20px' }}>
        <h1>Central Ring UI</h1>
        <nav style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '20px' }}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/marketplace">Marketplace</Link></li>
          </ul>
        </nav>

        <section>
          <h2>Authentication</h2>
          {!session ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">Send OTP</button>
              {message && <p>{message}</p>}
            </form>
          ) : (
            <div>
              <p>Logged in as: {session.user.email}</p>
              <button onClick={handleLogout}>Logout</button>
              {message && <p>{message}</p>}
            </div>
          )}

          {message.includes('OTP sent') && !session && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', marginTop: '20px' }}>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <button type="submit">Verify OTP</button>
            </form>
          )}
        </section>

        <Routes>
          <Route path="/" element={
            <>
              {session && (
                <>
                  <section style={{ marginTop: '40px' }}>
                    <h2>Add New Entity Type</h2>
                    <form onSubmit={handleAddEntityType} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
                      <input
                        type="text"
                        placeholder="ID (e.g., product)"
                        value={newEntityType.id}
                        onChange={(e) => setNewEntityType({ ...newEntityType, id: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Name (e.g., Product)"
                        value={newEntityType.name}
                        onChange={(e) => setNewEntityType({ ...newEntityType, name: e.target.value })}
                        required
                      />
                      <textarea
                        placeholder={"Predefined Attributes (JSON array, e.g., [{ \"name\": \"color\", \"type\": \"string\", \"required\": false, \"isUserDefined\": false }])"}
                        value={JSON.stringify(newEntityType.predefinedAttributes)}
                        onChange={(e) => {
                          try {
                            setNewEntityType({ ...newEntityType, predefinedAttributes: JSON.parse(e.target.value) });
                          } catch (error) {
                            console.error("Invalid JSON for attributes", error);
                          }
                        }}
                        rows={5}
                        style={{ width: '100%' }}
                      />
                      <button type="submit">Add Entity Type</button>
                    </form>
                  </section>

                  <section style={{ marginTop: '40px' }}>
                    <h2>Entity Types</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                      {entityTypes.map((type) => (
                        <div key={type.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                          <h3>{type.name} ({type.id})</h3>
                          <p>Attributes:</p>
                          <ul>
                            {type.predefinedAttributes.map((attr) => (
                              <li key={attr.name}>{attr.name} ({attr.type}) {attr.required ? '(Required)' : ''}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section style={{ marginTop: '40px' }}>
                    <h2>Add New Entity</h2>
                    <form onSubmit={handleAddEntity} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
                      <input
                        type="text"
                        placeholder="ID (e.g., entity-001)"
                        value={newEntity.id}
                        onChange={(e) => setNewEntity({ ...newEntity, id: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Name (e.g., My First Product)"
                        value={newEntity.name}
                        onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                        required
                      />
                      <select
                        value={newEntity.typeId}
                        onChange={(e) => setNewEntity({ ...newEntity, typeId: e.target.value })}
                        required
                      >
                        <option value="">Select Entity Type</option>
                        {entityTypes.map((type) => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                      {selectedEntityType && (
                        <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                          <h3>Attributes for {selectedEntityType.name}</h3>
                          {selectedEntityType.predefinedAttributes.map(attr => (
                            <div key={attr.name} style={{ marginBottom: '10px' }}>
                              <label>
                                {attr.name} ({attr.type}) {attr.required && '(Required)'}:
                                {attr.type === 'boolean' ? (
                                  <input
                                    type="checkbox"
                                    checked={newEntity.attributes?.find(a => a.name === attr.name)?.value || false}
                                    onChange={(e) => handleAttributeChange(attr.name, e.target.checked, newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable || false)}
                                    disabled={newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable}
                                  />
                                ) : attr.type === 'number' ? (
                                  <input
                                    type="number"
                                    value={newEntity.attributes?.find(a => a.name === attr.name)?.value || ''}
                                    onChange={(e) => handleAttributeChange(attr.name, Number(e.target.value), newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable || false)}
                                    disabled={newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={newEntity.attributes?.find(a => a.name === attr.name)?.value || ''}
                                    onChange={(e) => handleAttributeChange(attr.name, e.target.value, newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable || false)}
                                    disabled={newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable}
                                  />
                                )}
                              </label>
                              <label style={{ marginLeft: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={newEntity.attributes?.find(a => a.name === attr.name)?.notApplicable || false}
                                  onChange={(e) => handleAttributeChange(attr.name, newEntity.attributes?.find(a => a.name === attr.name)?.value, e.target.checked)}
                                />
                                N/A
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      <button type="submit">Add Entity</button>
                    </form>
                  </section>

                  <section style={{ marginTop: '40px' }}>
                    <h2>Entities</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {entities.map((entity) => {
                        console.log('DEBUG: entity.attributes for', entity.id, ':', entity.attributes);
                        return (
                        <div key={entity.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                          <h3>{entity.name} (Type: {entity.typeId})</h3>
                          <p>Owner: {entity.ownerId}</p>
                          <p>Attributes:</p>
                          <ul>
                            {entity.attributes.map((attr) => (
                              <li key={attr.name}>{attr.name}: {JSON.stringify(attr.value)} {attr.notApplicable ? '(N/A)' : ''}</li>
                            ))}
                          </ul>
                          <Link to={`/entity/${entity.id}`} style={{ marginTop: '10px', display: 'block' }}>View Details</Link>
                        </div>
                      );})}
                    </div>
                  </section>
                </>
              )}
            </>
          } />
          <Route path="/marketplace" element={<MarketplacePage session={session} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;