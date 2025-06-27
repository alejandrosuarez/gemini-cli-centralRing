import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface EntityDetailProps {
  session: any; // Pass the session object to determine auth status and ownership
}

export const EntityDetail: React.FC<EntityDetailProps> = ({ session }) => {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string>('');
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const fetchEntity = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const response = await axios.get(`${API_BASE_URL}/entities/${id}`, { headers });
      setEntity(response.data);
    } catch (err: any) {
      console.error('Error fetching entity:', err);
      setError(`Failed to load entity: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEntity();
    }
  }, [id, session]);

  const handleRequestInfo = async () => {
    if (!session?.access_token) {
      setRequestStatus('Please log in to request information.');
      return;
    }
    try {
      setRequestStatus('Sending request...');
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${session.access_token}`,
      };
      await axios.post(`${API_BASE_URL}/entities/${id}/request-info`, { message: requestMessage }, { headers });
      setRequestStatus('Information request sent successfully!');
      setRequestMessage(''); // Clear message after sending
      fetchEntity(); // Re-fetch entity to update owner view
    } catch (err: any) {
      console.error('Error sending request:', err);
      setRequestStatus(`Failed to send request: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) {
    return <div>Loading entity details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!entity) {
    return <div>Entity not found.</div>;
  }

  // Determine if the current user is the owner of this entity
  const isOwner = session && session.user && entity.ownerId === session.user.id;

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h2>Entity Details: {entity.name}</h2>
      <p><strong>ID:</strong> {entity.id}</p>
      <p><strong>Type:</strong> {entity.typeId}</p>
      <p><strong>Owner:</strong> {entity.ownerId}</p>
      <p><strong>Created At:</strong> {new Date(entity.createdAt).toLocaleString()}</p>
      <p><strong>Updated At:</strong> {new Date(entity.updatedAt).toLocaleString()}</p>

      <h3>Attributes:</h3>
      <ul>
        {entity.attributes.map((attr: any) => (
          <li key={attr.name}>
            <strong>{attr.name}:</strong> {attr.notApplicable ? '(N/A)' : JSON.stringify(attr.value)}
          </li>
        ))}
      </ul>

      {/* Conditional UI for authenticated users / owners */}
      {session && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <h3>Interaction Options:</h3>
          {!isOwner && (
            <div style={{ marginBottom: '15px' }}>
              <h4>Request Missing Info / Add Message:</h4>
              <textarea
                placeholder="Enter your request for missing information or a custom message..."
                rows={4}
                style={{ width: '100%', marginBottom: '10px' }}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
              ></textarea>
              <button onClick={handleRequestInfo}>Submit Request</button>
              {requestStatus && <p>{requestStatus}</p>}
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
