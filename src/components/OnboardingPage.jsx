import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const GRANT_TYPES = [
  { id: 'nonprofit', label: 'Nonprofit', icon: '🤝', description: 'Social services, advocacy, community' },
  { id: 'education', label: 'Education', icon: '🎓', description: 'Schools, universities, training programs' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥', description: 'Medical research, hospitals, clinics' },
  { id: 'research', label: 'Research', icon: '🔬', description: 'Scientific studies, labs, universities' },
  { id: 'business', label: 'Business', icon: '💼', description: 'Small business, startups, economic development' },
  { id: 'government', label: 'Government', icon: '🏛️', description: 'Municipal, state, federal programs' },
  { id: 'other', label: 'Other', icon: '✨', description: 'Arts, environment, misc' }
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', icon: '🌱', description: 'New to grant writing' },
  { id: 'intermediate', label: 'Intermediate', icon: '🌿', description: 'Written a few grants' },
  { id: 'expert', label: 'Expert', icon: '🌳', description: 'Professional grant writer' }
];

const FIRST_ACTIONS = [
  { id: 'write', label: 'Write a new grant', icon: '✍️', description: 'Start from scratch' },
  { id: 'improve', label: 'Improve existing draft', icon: '📝', description: 'Upload or paste content' },
  { id: 'explore', label: 'Explore opportunities', icon: '🔍', description: 'Find matching grants' },
  { id: 'workspace', label: 'Set up workspace', icon: '⚙️', description: 'Configure your account' }
];

function AnimatedStep({ children, direction = 1 }) {
  return (
    <div style={{
      animation: `slideIn 0.4s ease-out ${direction > 0 ? 'forwards' : 'reverse'}`,
      opacity: 0,
      transform: `translateX(${direction * 30}px)`
    }}>
      {children}
      <style>{`
        @keyframes slideIn {
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    grantType: '',
    experience: '',
    firstAction: ''
  });
  const [isAnimating, setIsAnimating] = useState(false);

  const steps = [
    { 
      title: "What type of grants do you write?",
      subtitle: "This helps us personalize your experience",
      options: GRANT_TYPES,
      key: 'grantType'
    },
    {
      title: "What's your experience level?",
      subtitle: "We'll tailor guidance to your skill level",
      options: EXPERIENCE_LEVELS,
      key: 'experience'
    },
    {
      title: "What would you like to do first?",
      subtitle: "Your first action sets up your dashboard",
      options: FIRST_ACTIONS,
      key: 'firstAction'
    }
  ];

  const handleSelect = (key, value) => {
    setIsAnimating(true);
    setSelections(prev => ({ ...prev, [key]: value }));
    
    setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        completeOnboarding();
      }
      setIsAnimating(false);
    }, 300);
  };

  const completeOnboarding = async () => {
    const updatedUser = { 
      ...user, 
      onboardingCompleted: true,
      grantType: selections.grantType,
      experience: selections.experience,
      firstAction: selections.firstAction
    };
    
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));

    try {
      await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selections)
      });
    } catch (e) {
      console.log('Onboarding saved locally');
    }

    // Mark onboarding complete — RequireOnboarding gate checks this
    localStorage.setItem('tgm_onboarded', '1');

    const destination = selections.firstAction === 'write'
      ? '/workspace'
      : '/dashboard';

    navigate(destination);
  };

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: 600,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '3rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: '2rem'
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: 'white'
          }}>G</div>
          <span style={{ color: 'white', fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>
            GrantsMaster
          </span>
        </div>

        <div style={{
          height: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          marginBottom: '2rem',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: 2,
            transition: 'width 0.5s ease-out'
          }} />
        </div>

        <AnimatedStep direction={1}>
          <h2 style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 600,
            marginBottom: '0.5rem',
            letterSpacing: '-0.5px'
          }}>
            {currentStep.title}
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: 16,
            marginBottom: '2rem'
          }}>
            {currentStep.subtitle}
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {currentStep.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(currentStep.key, option.id)}
                disabled={isAnimating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '1rem 1.25rem',
                  background: selections[currentStep.key] === option.id 
                    ? 'rgba(59, 130, 246, 0.2)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selections[currentStep.key] === option.id 
                    ? '1px solid #3b82f6' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  if (!selections[currentStep.key]) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!selections[currentStep.key]) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <span style={{ fontSize: 24 }}>{option.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 500, fontSize: 15 }}>
                    {option.label}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 }}>
                    {option.description}
                  </div>
                </div>
                {selections[currentStep.key] === option.id && (
                  <span style={{
                    color: '#3b82f6',
                    fontSize: 20
                  }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </AnimatedStep>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '2rem',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: 14
        }}>
          <span>Step {step + 1} of {steps.length}</span>
          <button
            onClick={() => {
              const randomChoice = currentStep.options[Math.floor(Math.random() * currentStep.options.length)];
              handleSelect(currentStep.key, randomChoice.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}