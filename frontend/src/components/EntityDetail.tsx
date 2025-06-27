import React, { useState } from 'react';
import axios from 'axios';
import type { Entity } from '../App'; // Import Entity type

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface EntityDetailProps {
  entity: Entity; // Entity object passed as prop
  session: any; // Pass the session object to determine auth status and ownership
  onClose?: () => void; // Optional: for modal close button
}

export const EntityDetail: React.FC<EntityDetailProps> = ({ entity, session, onClose }) => {
  const [requestMessage, setRequestMessage] = useState<string>('');
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  // If entity is null or undefined, render a loading/error state or return null
  if (!entity) {
    return <div>Loading entity details...</div>; // Or handle as an error
  }

  const handleRequestInfo = async () => {
    if (!session?.access_token) {
      setRequestStatus('Please log in to request information.');
      return;
    }
    try {
      setRequestStatus('Sending general request...');
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${session.access_token}`,
      };
      await axios.post(`${API_BASE_URL}/entities/${entity.id}/request-info`, {
        message: requestMessage,
        attributeNames: [], // General request, no specific attributes selected
      }, { headers });
      setRequestStatus('General information request sent successfully!');
      setRequestMessage(''); // Clear message after sending
    } catch (err: any) {
      console.error('Error sending general request:', err);
      setRequestStatus(`Failed to send general request: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleRequestInfoForAttribute = async (attributeName: string) => {
    if (!session?.access_token) {
      setRequestStatus('Please log in to request information.');
      return;
    }
    try {
      setRequestStatus(`Sending request for ${attributeName}...`);
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${session.access_token}`,
      };
      const requestPayload = {
        message: `Request for attribute: ${attributeName}`,
        attributeNames: [attributeName],
      };
      console.log(`DEBUG: Sending request for attribute ${attributeName} with payload:`, requestPayload);
      await axios.post(`${API_BASE_URL}/entities/${entity.id}/request-info`, requestPayload, { headers });
      setRequestStatus(`Request for ${attributeName} sent successfully!`);
    } catch (err: any) {
      console.error(`Error sending request for ${attributeName}:`, err);
      setRequestStatus(`Failed to send request for ${attributeName}: ${err.response?.data?.error || err.message}`);
    }
  };

  // Determine if the current user is the owner of this entity
  const isOwner = session && session.user && entity.ownerId === session.user.id;

  // Filter out attributes marked as notApplicable for display
  const displayAttributes = (Array.isArray(entity.attributes) ? entity.attributes : Object.keys((entity.attributes as Record<string, any>) || {}).map(key => ({
    name: key,
    value: (entity.attributes as any)[key],
    type: typeof (entity.attributes as any)[key],
    required: false,
    isUserDefined: true,
    notApplicable: false,
  }))).filter((attr: any) => !attr.notApplicable);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
        >
          &times;
        </button>
      )}
      <h2>Entity Details: {entity.name}</h2>
      <p><strong>ID:</strong> {entity.id}</p>
      <p><strong>Type:</strong> {entity.entityType?.name || entity.typeId}</p>
      {entity.entityType?.description && <p><strong>Type Description:</strong> {entity.entityType.description}</p>}

      <h3>Attributes:</h3>
      <ul>
        {displayAttributes.map((attr: any) => (
          <li key={attr.name}>
            <strong>{attr.name}:</strong> {JSON.stringify(attr.value)}
            {session && !isOwner && (attr.value === undefined || attr.value === null || attr.value === '') && (
              <button
                onClick={() => handleRequestInfoForAttribute(attr.name)}
                style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '0.8em' }}
              >
                Request Info
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Conditional UI for authenticated users / owners */}
      {console.log('DEBUG: EntityDetail rendering - current session:', session, 'isOwner:', isOwner)}
      {session && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <h3>Interaction Options:</h3>
          {!isOwner && (
            <div style={{ marginBottom: '15px' }}>
              <h4>Request Missing Info / Add Message:</h4>
              {requestStatus && <p>{requestStatus}</p>}
              <textarea
                placeholder="Enter your request for missing information or a custom message..."
                rows={4}
                style={{ width: '100%', marginBottom: '10px' }}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
              ></textarea>
              <button onClick={handleRequestInfo}>Submit General Request</button>
            </div>
          )}

          {isOwner && (
            <div>
              <h4>Owner Actions:</h4>
              {entity.missingInfoAttributes && entity.missingInfoAttributes.length > 0 && (
                <p>Missing Required Attributes: {entity.missingInfoAttributes.join(', ')}</p>
              )}
              {entity.requestedByUsers && entity.requestedByUsers.length > 0 && (
                <div>
                  <p>Requested by Users:</p>
                  <ul>
                    {entity.requestedByUsers.map((userId: string) => (
                      <li key={userId}>{userId}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entity.interactionLog && entity.interactionLog.length > 0 && (
                <div>
                  <h4>Interaction Log:</h4>
                  <ul>
                    {entity.interactionLog.map((log: any, index: number) => (
                      <li key={index}>
                        <strong>{new Date(log.timestamp).toLocaleString()}:</strong> {log.action} by {log.userId}
                        {log.details?.message && ` - Message: "${log.details.message}"`}
                        {log.details?.attributeNames && log.details.attributeNames.length > 0 && (
                          ` (Attributes requested: ${log.details.attributeNames.join(', ')})`
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Add owner-specific actions here, e.g., fill missing info, view requests */}
              <button>Manage Attributes</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntityDetail;
