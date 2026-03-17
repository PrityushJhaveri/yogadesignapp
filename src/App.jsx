import React, { useState, useRef } from 'react';
import { Sparkles, Leaf, Copy, Check, Upload, X } from 'lucide-react';

function App() {
  const [rawText, setRawText] = useState('');
  const [yogaStyle, setYogaStyle] = useState('Vinyasa Flow');
  const [tone, setTone] = useState('Peaceful & Inviting');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [polishedFlyer, setPolishedFlyer] = useState('');
  const [copying, setCopying] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result); // base64 string
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!rawText.trim() && !image) return;
    
    setIsGenerating(true);
    setPolishedFlyer('');
    
    try {
      const response = await fetch('/api/generate-flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, yogaStyle, tone, image }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPolishedFlyer(data.polishedFlyer);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'The AI is busy or taking a bit too long. Please try again in 30 seconds!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to connect to the generator. Please check your internet or try again later.');
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
            <label>Upload Draft (Optional)</label>
            {!imagePreview ? (
              <div 
                style={{ 
                  border: '2px dashed #E5E7EB', 
                  borderRadius: '12px', 
                  padding: '2rem', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#F9FAFB'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click to upload an image of a flyer</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                <img src={imagePreview} alt="Flyer preview" style={{ width: '100%', display: 'block' }} />
                <button 
                  onClick={removeImage}
                  style={{ 
                    position: 'absolute', top: '10px', right: '10px', 
                    background: 'rgba(0,0,0,0.5)', color: 'white', 
                    border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="notes">Rough Notes</label>
            <textarea
              id="notes"
              rows="4"
              placeholder="e.g. yoga class monday 5pm, church hall, $15..."
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
            disabled={isGenerating || (!rawText.trim() && !image)}
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
        <p>Made for Mom with love.</p>
      </footer>
    </div>
  );
}

export default App;
