import React, { useState } from "react";
import client from "../api/client";
import { getUser, getTokens } from "../api/storage";

const DebugInfo = () => {
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const storedUser = getUser();
  const tokens = getTokens();

  const testEndpoint = async (url) => {
    setLoading(true);
    try {
      const response = await client.get(url);
      console.log(`[DEBUG] ${url} response:`, response.data);
      setApiResponse({ url, data: response.data, status: "success" });
    } catch (error) {
      console.error(`[DEBUG] ${url} error:`, error);
      setApiResponse({ 
        url, 
        error: error.response?.data || error.message, 
        status: error.response?.status || "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Debug Information</h1>
      
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Stored User Info (from localStorage)</h2>
        <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', overflow: 'auto' }}>
          {JSON.stringify(storedUser, null, 2)}
        </pre>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Tokens (from localStorage)</h2>
        <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', overflow: 'auto' }}>
          Access Token: {tokens?.access ? `${tokens.access.substring(0, 50)}...` : 'None'}
          {'\n'}
          Refresh Token: {tokens?.refresh ? `${tokens.refresh.substring(0, 50)}...` : 'None'}
        </pre>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Test API Endpoints</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button className="button" onClick={() => testEndpoint('/users/')}>
            Test /users/
          </button>
          <button className="button" onClick={() => testEndpoint('/expenses/')}>
            Test /expenses/
          </button>
          <button className="button" onClick={() => testEndpoint('/categories/')}>
            Test /categories/
          </button>
          <button className="button" onClick={() => testEndpoint('/auth/profile/')}>
            Test /auth/profile/
          </button>
        </div>

        {loading && <p>Loading...</p>}
        
        {apiResponse && (
          <div>
            <h3>API Response for: {apiResponse.url}</h3>
            <div style={{ 
              background: apiResponse.status === 'success' ? '#d4edda' : '#f8d7da', 
              padding: '16px', 
              borderRadius: '8px',
              marginTop: '12px'
            }}>
              <strong>Status:</strong> {apiResponse.status}
              <pre style={{ marginTop: '12px', overflow: 'auto', maxHeight: '400px' }}>
                {JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugInfo;
