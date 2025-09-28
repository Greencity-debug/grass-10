'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Lottie from 'lottie-react'

// Импортируем анимацию
import animationData from './animation.json'

// Динамический импорт для избежания проблем с SSR
const MapWithDrawing = dynamic(() => import('../components/MapWithDrawing'), { 
  ssr: false,
  loading: () => <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px'
  }}>Загрузка карты...</div>
})

export default function Home() {
  const [mode, setMode] = useState('observer'); // 'observer' is the home screen
  const [isObserverMap, setIsObserverMap] = useState(false);

  const handleBackToHome = () => {
    setMode('observer');
  };

  const handleModeSelection = (isObserver) => {
    setIsObserverMap(isObserver);
    setMode('management'); // 'management' now simply means 'show the map'
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {mode === 'observer' ? (
        <div style={{
          height: '100vh',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 50%, #e8f5e8 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
          padding: '40px'
        }}>
          
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '600px'
          }}>
            
            <h1 style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#4A5D23',
              margin: '0 0 8px 0',
              textAlign: 'center',
              letterSpacing: '-2px'
            }}>
              Grasscutter
            </h1>
            
            <p style={{
              fontSize: '20px',
              color: '#6B7280',
              margin: '0 0 30px 0',
              textAlign: 'center'
            }}>
              Система управления зелёным хозяйством
            </p>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              marginBottom: '30px'
            }}>
              <button 
                style={{
                  backgroundColor: '#4A5D23',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '150px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(74, 93, 35, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#3A4D1C'
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 8px 20px rgba(74, 93, 35, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#4A5D23'
                  e.target.style.transform = 'translateY(0px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(74, 93, 35, 0.3)'
                }}
                onClick={() => handleModeSelection(true)}
              >
                Режим наблюдателя
              </button>
              
              <button 
                style={{
                  backgroundColor: 'white',
                  color: '#4A5D23',
                  border: '2px solid #4A5D23',
                  padding: '12px 24px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '150px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                onClick={() => handleModeSelection(false)}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#4A5D23'
                  e.target.style.color = 'white'
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 8px 20px rgba(74, 93, 35, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white'
                  e.target.style.color = '#4A5D23'
                  e.target.style.transform = 'translateY(0px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              >
                Режим управления
              </button>
            </div>
            
            <div style={{
              width: '300px',
              height: '225px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Lottie 
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '300px',
                  maxHeight: '225px'
                }}
              />
            </div>
            
          </div>
        </div>
      ) : (
        <MapWithDrawing onBack={handleBackToHome} isObserver={isObserverMap} />
      )}
    </div>
  )
}
