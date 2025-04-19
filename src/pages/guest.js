import React, { useState } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';

const LANGUAGES = ['ja', 'en', 'zh', 'ko'];

const TEXTS = {
  ja: {
    title: '朝食チェックイン',
    placeholder: '部屋番号を入力してください',
    button: '送信',
    error: '無効な部屋番号です',
  },
  en: {
    title: 'Breakfast Check-In',
    placeholder: 'Enter your room number',
    button: 'Submit',
    error: 'Invalid room number',
  },
  zh: {
    title: '早餐登记',
    placeholder: '请输入房间号',
    button: '提交',
    error: '无效的房间号',
  },
  ko: {
    title: '아침 식사 체크인',
    placeholder: '객실 번호를 입력하세요',
    button: '제출',
    error: '유효하지 않은 객실 번호입니다',
  },
};

const VALID_ROOMS = [
  ...Array.from({ length: 20 }, (_, i) => 301 + i),
  ...Array.from({ length: 20 }, (_, i) => 401 + i),
  ...Array.from({ length: 20 }, (_, i) => 501 + i),
  ...Array.from({ length: 20 }, (_, i) => 601 + i),
  ...Array.from({ length: 20 }, (_, i) => 701 + i),
  ...Array.from({ length: 20 }, (_, i) => 801 + i),
  ...Array.from({ length: 20 }, (_, i) => 901 + i),
  ...Array.from({ length: 20 }, (_, i) => 1001 + i),
  ...Array.from({ length: 20 }, (_, i) => 1101 + i),
  ...Array.from({ length: 20 }, (_, i) => 1201 + i),
  ...Array.from({ length: 10 }, (_, i) => 1301 + i),
];

const GuestCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [language, setLanguage] = useState('ja');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const goToHome = () => navigate('/home');
  const goToRestaurant = () => navigate('/restaurant');

  const handleSubmit = () => {
    const num = parseInt(roomNumber, 10);
    if (!VALID_ROOMS.includes(num)) {
      setError(TEXTS[language].error);
    } else {
      setError('');
      alert(`${TEXTS[language].title} OK: ${roomNumber}`); // tạm thời alert để test
    }
  };

  return (
    <div className="checkin-container" style={{ backgroundColor: '#F2EBE0', minHeight: '90vh' }}>
      <div style={{ marginBottom: '10px' }}>
        <img
          src={`${process.env.PUBLIC_URL}/assets/home.png`} alt="Home"
          style={{ cursor: 'pointer', width: '40px', height: '35px' }}
          onClick={goToHome}
        />
        <img
          src={`${process.env.PUBLIC_URL}/assets/restaurant.png`} alt="Restaurant"
          style={{ cursor: 'pointer', width: '40px', height: '35px' }}
          onClick={goToRestaurant}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '3rem' }}>
          {LANGUAGES.map((lang) => (
            <button key={lang} className="fixed-size-button"  onClick={() => setLanguage(lang)}
              style={{ margin: '0 5px' }}>
              {lang === 'ja' ? '日本語' : lang === 'en' ? 'English' : lang === 'zh' ? '中文' : '한국어'}
            </button>
          ))}
        </div>

        <h2 style={{ height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {TEXTS[language].title}
        </h2>

        <input
          className="room-input" type="number" value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)} placeholder={TEXTS[language].placeholder}
          style={{ direction: language === 'ja' || language === 'zh' || language === 'ko' ? 'ltr' : 'ltr', // Hoặc 'rtl' nếu cần
          }}/>

        <br />

        <button className="fixed-size-button" onClick={handleSubmit}>
          {TEXTS[language].button}
        </button>
        
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>
    </div>
  );
};

export default GuestCheckin;
