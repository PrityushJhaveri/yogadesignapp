import React, { useState } from 'react';
import { Sparkles, Leaf, Send, RefreshCw, Copy, Check } from 'lucide-react';

function App() {
  const [rawText, setRawText] = useState('');
  const [yogaStyle, setYogaStyle] = useState('Vinyasa Flow');
  const [tone, setTone] = useState('Peaceful & Inviting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [polishedFlyer, setPolishedFlyer] = useState('');
  const [copying, setCopying] = useState(false);

  const handleGenerate = async () => {
    if (!rawText.trim()) return;
    
    setIsGenerating(true);
    setPolishedFlyer('');
    
    try {
      const response = await fetch('/.netlify/functions/generate-flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, yogaStyle, tone }),
      });
      
      const data = await response.json();
      if (data.polishedFlyer) {
        setPolishedFlyer(data.polishedFlyer);
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to connect to the generator. Is the backend running?');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(polishedFlyer);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="container">
      <header className="header fade-in">
        <Leaf className="yoga-icon" />
        <h1>Yoga Flyer Polisher</h1>
        <p>Turn your rough notes into Zen masterpieces.</p>
      </header>

      <main className="fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="card">
          <div className="input-group">
            <label htmlFor="notes">Rough Notes</label>
            <textarea
              id="notes"
              rows="6"
              placeholder="e.g. yoga class monday 5pm, church hall, $15, bring a mat and water..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="style">Yoga Style</label>
              <select id="style" value={yogaStyle} onChange={(e) => setYogaStyle(e.target.value)}>
                <option>Vinyasa Flow</option>
                <option>Hatha Yoga</option>
                <option>Restorative</option>
                <option>Yin Yoga</option>
                <option>Power Yoga</option>
                <option>Meditation</option>
              </select>
            </div>
            <div>
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option>Peaceful & Inviting</option>
                <option>Energizing & Bold</option>
                <option>Professional</option>
                <option>Spiritual</option>
                <option>Minimalist</option>
              </select>
            </div>
          </div>

          <button 
            className="btn" 
            onClick={handleGenerate} 
            disabled={isGenerating || !rawText.trim()}
          >
            {isGenerating ? (
              <div className="loader" />
            ) : (
              <>
                <Sparkles size={20} />
                Generate Magic
              </>
            )}
          </button>
        </div>

        {polishedFlyer && (
          <div className="card fade-in" style={{ border: '2px solid var(--primary-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--primary)' }}>Your Polished Flyer</h3>
              <button 
                onClick={copyToClipboard}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  fontWeight: 600 
                }}
              >
                {copying ? <Check size={18} /> : <Copy size={18} />}
                {copying ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="results-area">
              {polishedFlyer}
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', marginTop: 'auto', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <p>Made for Mom with love & mindfulness.</p>
      </footer>
    </div>
  );
}

export default App;
