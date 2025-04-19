import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div style={{   backgroundColor: '#F2EBE0',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',}}>
        <div style={{
                        backgroundImage: `url(${process.env.PUBLIC_URL}/assets/restaurant-bg.jpg)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'white', // Để chữ rõ ràng trên nền ảnh
                        }}>
            <img 
                  src={`${process.env.PUBLIC_URL}/assets/almont_logo.png`} 
                  alt="Logo" 
                  style={{ 
                    opacity: 0.7, // Độ trong suốt (0.0 = hoàn toàn trong suốt, 1.0 = hoàn toàn rõ)
                    margin: '2rem auto',
                  }} />
            <h2 style={{ marginTop: '0.5rem', fontFamily: "'Noto Serif JP', serif", fontSize: '3rem' }}>はなもみ</h2>

          <div style={{ marginTop: '1rem', fontFamily: "'Noto Serif JP', serif" }}>
            <h3 style={{ fontSize: '1.25rem' }}>朝食・レストラン</h3>
            <p style={{ fontSize: '1rem', marginTop: '-0.5rem' }}>★　郷土の味めぐり　★</p>
          </div>
        </div>

        <div style={{
                padding: '2rem',
                textAlign: 'center',
              }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem' }}>
                <Link to="/restaurant">
                  <img src={`${process.env.PUBLIC_URL}/assets/restaurant.png`} alt="Restaurant" style={{ width: '100px', height: '100px' }} />
                </Link>
                <Link to="/guest">
                  <img src={`${process.env.PUBLIC_URL}/assets/guest.png`} alt="Guest" style={{ width: '100px', height: '100px' }} />
                </Link>
            </div>
        </div>
    </div>
  );
}

export default Home;
