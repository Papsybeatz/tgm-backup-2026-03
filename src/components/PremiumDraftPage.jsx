import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { useSkin } from '../hooks/useSkin.jsx';

const PROMPT_SECTIONS = [
  { id: 'project_summary', label: 'Project Summary', description: 'Describe your project and its goals' },
  { id: 'funding_amount', label: 'Target Funding Amount', description: 'How much funding are you seeking?' },
  { id: 'community_impact', label: 'Community Impact', description: 'Describe the impact on your community' },
  { id: 'org_background', label: 'Organization Background', description: 'Tell us about your organization' },
  { id: 'key_outcomes', label: 'Key Outcomes', description: 'What are the expected outcomes?' }
];

export default function PremiumDraftPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { skin } = useSkin();
  const [title, setTitle] = useState('Untitled Grant Draft');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptData, setPromptData] = useState(
    PROMPT_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: '' }), {})
  );
  const [draftOutput, setDraftOutput] = useState('');

  const tier = user?.tier || 'free';
  const isPro = tier === 'pro' || tier === 'agency_starter' || tier === 'agency_unlimited' || tier === 'lifetime';
  const isStarter = tier === 'starter';
  const showWatermark = tier === 'free';

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/test-ai', { method: 'GET' });
      const data = await res.json();
      if (data.success) {
        setDraftOutput(data.response);
      }
    } catch (e) {
      setDraftOutput('Failed to generate draft. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 1000);
  };

  useEffect(() => {
    const timer = setTimeout(handleSave, 2000);
    return () => clearTimeout(timer);
  }, [promptData]);

  return (
    <div style={{
      minHeight: '100vh',
      background: skin === 'futuristic' ? 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)' : '#f7f9fb',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: skin === 'futuristic' ? 'rgba(20, 20, 30, 0.9)' : '#fff',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
              borderRadius: 8,
              color: skin === 'futuristic' ? '#e5e7eb' : '#374151',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            ← Home
          </button>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            color: skin === 'futuristic' ? 'rgba(255,255,255,0.5)' : '#9ca3af',
            fontSize: 14
          }}>
            <span>Dashboard</span>
            <span>→</span>
            <span>Drafts</span>
            <span>→</span>
            <span style={{ color: skin === 'futuristic' ? '#fff' : '#111' }}>Current Draft</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 18,
              fontWeight: 600,
              color: skin === 'futuristic' ? '#fff' : '#111',
              width: 300
            }}
            placeholder="Untitled Grant Draft"
          />
          <span style={{ 
            fontSize: 13, 
            color: isSaving ? (skin === 'futuristic' ? '#00f0ff' : '#3b82f6') : (skin === 'futuristic' ? 'rgba(255,255,255,0.5)' : '#9ca3af')
          }}>
            {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving...'}
          </span>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: '10px 20px',
              background: skin === 'futuristic' 
                ? 'linear-gradient(135deg, #00f0ff, #0080ff)' 
                : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none',
              borderRadius: 10,
              color: skin === 'futuristic' ? '#000' : '#fff',
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Draft'}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Prompt Builder */}
        <div style={{
          width: '35%',
          borderRight: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
          background: skin === 'futuristic' ? 'rgba(255,255,255,0.02)' : '#fff',
          overflowY: 'auto',
          padding: 24
        }}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: skin === 'futuristic' ? '#fff' : '#111',
            marginBottom: 20
          }}>
            Prompt Builder
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PROMPT_SECTIONS.map((section) => (
              <div key={section.id} style={{
                padding: 16,
                background: skin === 'futuristic' ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                borderRadius: 12,
                border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: skin === 'futuristic' ? '#fff' : '#374151'
                  }}>
                    {section.label}
                  </h3>
                  {(isStarter || isPro) && (
                    <button style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      background: skin === 'futuristic' ? 'rgba(0,240,255,0.1)' : '#e0e7ff',
                      border: 'none',
                      borderRadius: 4,
                      color: skin === 'futuristic' ? '#00f0ff' : '#4f46e5',
                      cursor: 'pointer'
                    }}>
                      AI Assist
                    </button>
                  )}
                </div>
                <p style={{
                  fontSize: 12,
                  color: skin === 'futuristic' ? 'rgba(255,255,255,0.5)' : '#6b7280',
                  marginBottom: 8
                }}>
                  {section.description}
                </p>
                <textarea
                  value={promptData[section.id]}
                  onChange={(e) => setPromptData(prev => ({ ...prev, [section.id]: e.target.value }))}
                  placeholder={`Describe the ${section.label.toLowerCase()}...`}
                  style={{
                    width: '100%',
                    height: 80,
                    padding: 12,
                    background: skin === 'futuristic' ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    borderRadius: 8,
                    color: skin === 'futuristic' ? '#fff' : '#111',
                    fontSize: 13,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Draft Output */}
        <div style={{
          flex: 1,
          padding: 32,
          overflowY: 'auto',
          background: skin === 'futuristic' ? 'transparent' : '#f7f9fb'
        }}>
          <div style={{
            maxWidth: 720,
            margin: '0 auto',
            background: skin === 'futuristic' ? 'rgba(255,255,255,0.03)' : '#fff',
            borderRadius: 16,
            padding: 32,
            boxShadow: skin === 'futuristic' 
              ? '0 0 40px rgba(0,240,255,0.05)' 
              : '0 4px 12px rgba(0,0,0,0.06)',
            border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`
          }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              color: skin === 'futuristic' ? '#fff' : '#111',
              marginBottom: 16
            }}>
              Generated Draft
            </h2>
            
            {draftOutput ? (
              <div>
                <div style={{
                  color: skin === 'futuristic' ? 'rgba(255,255,255,0.9)' : '#374151',
                  fontSize: 15,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap'
                }}>
                  {draftOutput}
                </div>
                {(isPro || isStarter) && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      color: skin === 'futuristic' ? '#e5e7eb' : '#374151',
                      cursor: 'pointer',
                      fontSize: 13
                    }}>
                      Regenerate
                    </button>
                    <button style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      color: skin === 'futuristic' ? '#e5e7eb' : '#374151',
                      cursor: 'pointer',
                      fontSize: 13
                    }}>
                      Improve Section
                    </button>
                    <button style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      border: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      color: skin === 'futuristic' ? '#e5e7eb' : '#374151',
                      cursor: 'pointer',
                      fontSize: 13
                    }}>
                      Expand
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p style={{
                color: skin === 'futuristic' ? 'rgba(255,255,255,0.4)' : '#9ca3af',
                fontStyle: 'italic',
                fontSize: 15
              }}>
                Your AI-generated grant draft will appear here.
              </p>
            )}

            {showWatermark && draftOutput && (
              <div style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: `1px solid ${skin === 'futuristic' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                fontSize: 12,
                color: skin === 'futuristic' ? 'rgba(255,255,255,0.4)' : '#9ca3af',
                textAlign: 'center'
              }}>
                Generated with TGM Free Draft Engine
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}