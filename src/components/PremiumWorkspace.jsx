import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './UserContext';
import useAuth from '../hooks/useAuth';
import { trackEvent } from '../core/Analytics';

const GRANT_SECTIONS = [
  { id: 'needs_statement', label: 'Needs Statement', placeholder: 'Describe the problem or need your project addresses...' },
  { id: 'project_description', label: 'Project Description', placeholder: 'Explain your proposed solution and activities...' },
  { id: 'budget', label: 'Budget', placeholder: 'Detail the costs and resources required...' },
  { id: 'evaluation', label: 'Evaluation Plan', placeholder: 'Describe how you will measure success...' },
  { id: 'sustainability', label: 'Sustainability', placeholder: 'Explain how the project will continue after funding...' },
  { id: 'objectives', label: 'Goals & Objectives', placeholder: 'List specific, measurable objectives...' },
  { id: 'timeline', label: 'Timeline', placeholder: 'Outline key milestones and dates...' },
  { id: 'team', label: 'Team & Capacity', placeholder: 'Describe your organization\'s capabilities...' }
];

const MOCK_GRANTS = [
  { id: 1, name: 'NSF Research Initiative', funder: 'National Science Foundation', amount: '$250,000', deadline: '2026-05-15', eligibility: 92, matchReason: 'Research focus aligns with your expertise' },
  { id: 2, name: 'NIH Health Innovation', funder: 'National Institutes of Health', amount: '$500,000', deadline: '2026-06-01', eligibility: 87, matchReason: 'Healthcare category matches' },
  { id: 3, name: 'DOE Clean Energy', funder: 'Dept of Energy', amount: '$175,000', deadline: '2026-05-20', eligibility: 78, matchReason: 'Sustainability focus aligns' },
  { id: 4, name: 'Ford Foundation Community', funder: 'Ford Foundation', amount: '$100,000', deadline: '2026-06-15', eligibility: 71, matchReason: 'Nonprofit mission alignment' }
];

function useAutosave(content, onSave) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      onSave(content).then(() => {
        setIsSaving(false);
        setLastSaved(new Date());
      });
    }, 1500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, onSave]);

  return { isSaving, lastSaved };
}

export default function PremiumWorkspace() {
  const { user } = useUser();
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState(GRANT_SECTIONS[0].id);
  const [sections, setSections] = useState(
    GRANT_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: '' }), {})
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMode, setAiMode] = useState('generate');
  const [score, setScore] = useState(null);
  const [showMatches, setShowMatches] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [generationsLeft, setGenerationsLeft] = useState(3);

  const addActivity = useCallback((action) => {
    const entry = { action, timestamp: new Date() };
    setActivityLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const handleSave = async (content) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      await fetch('/api/drafts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          title: 'Untitled Grant Draft',
          content: Object.values(sections).join('\n\n')
        })
      });
      addActivity('Draft autosaved');
    } catch (e) {
      console.log('Save failed, using local storage');
      localStorage.setItem('draft', JSON.stringify(sections));
    }
  };

  const { isSaving, lastSaved } = useAutosave(sections, handleSave);

  const generateWithAI = async (mode = 'generate') => {
    if (generationsLeft <= 0) {
      alert('AI generations limit reached. Upgrade to unlock unlimited generations!');
      return;
    }

    setIsGenerating(true);
    setAiMode(mode);
    addActivity(`${mode === 'generate' ? 'Generating' : mode === 'improve' ? 'Improving' : 'Rewriting'} with AI...`);

    try {
      const prompt = mode === 'generate' 
        ? `Generate a compelling ${GRANT_SECTIONS.find(s => s.id === activeSection)?.label} for a grant proposal.`
        : mode === 'improve'
        ? `Improve this text for clarity and impact: ${sections[activeSection]}`
        : `Rewrite this for maximum impact and persuasiveness: ${sections[activeSection]}`;

      const res = await fetch('/api/test-ai', { method: 'GET' });
      const data = await res.json();
      
      if (data.success && data.response) {
        setSections(prev => ({ ...prev, [activeSection]: data.response }));
        addActivity(`AI ${mode} complete`);
        setGenerationsLeft(prev => prev - 1);
        trackEvent('ai_generation', { mode, section: activeSection });
        
        setTimeout(calculateScore, 500);
      }
    } catch (e) {
      addActivity('AI generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateScore = useCallback(() => {
    const content = sections[activeSection];
    if (!content || content.length < 50) {
      setScore(null);
      setSuggestions([]);
      return;
    }

    let scoreValue = 50;
    const newSuggestions = [];

    if (content.length > 200) scoreValue += 10;
    if (content.length > 500) scoreValue += 10;
    if (content.includes('$') || content.includes('budget')) scoreValue += 5;
    if (content.includes('will') || content.includes('will')) scoreValue += 5;
    if (content.toLowerCase().includes('impact')) scoreValue += 5;
    if (content.toLowerCase().includes('measure') || content.toLowerCase().includes('evaluate')) scoreValue += 5;
    if (content.split('.').length > 3) scoreValue += 5;

    if (content.length < 100) newSuggestions.push('Add more detail to strengthen your case');
    if (!content.includes('$') && !content.includes('budget')) newSuggestions.push('Include budget information for credibility');
    if (!content.toLowerCase().includes('impact')) newSuggestions.push('Emphasize the expected impact');
    if (!content.toLowerCase().includes('measure') && !content.toLowerCase().includes('evaluate')) newSuggestions.push('Add evaluation metrics');

    setScore(Math.min(scoreValue, 100));
    setSuggestions(newSuggestions);
  }, [sections, activeSection]);

  useEffect(() => {
    calculateScore();
  }, [sections, activeSection, calculateScore]);

  const currentSection = GRANT_SECTIONS.find(s => s.id === activeSection);

  const getScoreColor = (s) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr 320px',
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* LEFT SIDEBAR - Grant Structure */}
      <div style={{
        background: '#1e293b',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        padding: '1.5rem',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 14
          }}>G</div>
          <span style={{ color: 'white', fontWeight: 600 }}>GrantsMaster</span>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>Grant Structure</div>
          {GRANT_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: 4,
                background: activeSection === section.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: activeSection === section.id ? '1px solid #3b82f6' : '1px solid transparent',
                borderRadius: 8,
                color: activeSection === section.id ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: activeSection === section.id ? 500 : 400,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13
          }}>
            <span>AI Generations</span>
            <span style={{ color: generationsLeft > 0 ? '#10b981' : '#ef4444' }}>{generationsLeft}/3</span>
          </div>
        </div>
      </div>

      {/* MAIN EDITOR AREA */}
      <div style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{
              color: 'white',
              fontSize: 24,
              fontWeight: 600,
              margin: 0
            }}>
              {currentSection?.label}
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              margin: '0.25rem 0 0 0'
            }}>
              {currentSection?.placeholder}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            {isSaving ? (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Saving...</span>
            ) : lastSaved ? (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
            <button
              onClick={() => setShowMatches(!showMatches)}
              style={{
                padding: '0.5rem 1rem',
                background: showMatches ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              🔍 Find Grants
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{
          flex: 1,
          background: '#1e293b',
          borderRadius: 16,
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <textarea
            value={sections[activeSection]}
            onChange={(e) => {
              setSections(prev => ({ ...prev, [activeSection]: e.target.value }));
              addActivity('Edited content');
            }}
            placeholder={currentSection?.placeholder}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: 16,
              lineHeight: 1.7,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* AI Panel */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: '1rem'
        }}>
          <button
            onClick={() => generateWithAI('generate')}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: isGenerating ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseOver={(e) => !isGenerating && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {isGenerating && aiMode === 'generate' ? '⚡ Generating...' : '✨ Generate Section'}
          </button>
          <button
            onClick={() => generateWithAI('improve')}
            disabled={isGenerating || !sections[activeSection]}
            style={{
              padding: '0.875rem 1.25rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: 'white',
              fontSize: 14,
              cursor: sections[activeSection] ? 'pointer' : 'not-allowed',
              opacity: sections[activeSection] ? 1 : 0.5
            }}
          >
            Improve Writing
          </button>
          <button
            onClick={() => generateWithAI('rewrite')}
            disabled={isGenerating || !sections[activeSection]}
            style={{
              padding: '0.875rem 1.25rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: 'white',
              fontSize: 14,
              cursor: sections[activeSection] ? 'pointer' : 'not-allowed',
              opacity: sections[activeSection] ? 1 : 0.5
            }}
          >
            Rewrite for Impact
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Scoring & Matching */}
      <div style={{
        background: '#1e293b',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        padding: '1.5rem',
        overflowY: 'auto'
      }}>
        {/* Score Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            Section Score
          </div>
          {score !== null ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: `conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getScoreColor(score),
                    fontSize: 18,
                    fontWeight: 700
                  }}>{score}</div>
                </div>
                <div>
                  <div style={{
                    color: getScoreColor(score),
                    fontWeight: 600,
                    fontSize: 16
                  }}>{getScoreLabel(score)}</div>
                  <div style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 13
                  }}>for this section</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              textAlign: 'center',
              padding: '1rem 0'
            }}>
              Add more content to see your score
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{
            marginBottom: '1.5rem'
          }}>
            <div style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem'
            }}>
              Recommendations
            </div>
            {suggestions.map((suggestion, i) => (
              <div key={i} style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 8,
                padding: '0.75rem',
                marginBottom: 8,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8
              }}>
                <span style={{ color: '#f59e0b' }}>💡</span>
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Grant Matches */}
        <div>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            Matching Grants
          </div>
          {MOCK_GRANTS.map(grant => (
            <div
              key={grant.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                padding: '1rem',
                marginBottom: 10,
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8
              }}>
                <div style={{
                  color: 'white',
                  fontWeight: 500,
                  fontSize: 14
                }}>{grant.name}</div>
                <div style={{
                  background: grant.eligibility >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: grant.eligibility >= 80 ? '#10b981' : '#f59e0b',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600
                }}>{grant.eligibility}%</div>
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                marginBottom: 4
              }}>{grant.funder}</div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 12
              }}>
                <span>{grant.amount}</span>
                <span>Due {grant.deadline}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem'
          }}>
            Activity
          </div>
          {activityLog.slice(0, 5).map((entry, i) => (
            <div key={i} style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              marginBottom: 6,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{entry.action}</span>
              <span style={{ fontSize: 11 }}>{entry.timestamp.toLocaleTimeString()}</span>
            </div>
          ))}
          {activityLog.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              No activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}