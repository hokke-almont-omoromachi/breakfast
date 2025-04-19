import React, { useState } from 'react';
import { db, doc, updateDoc } from '../firebaseConfig'; // Giống cách bạn đã dùng firebase
import '../App.css'; // CSS dùng chung nếu có

const GuestCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [language, setLanguage] = useState('ja'); // ja | en | zh
  const [message, setMessage] = useState('');

  const texts = {
    ja: {
      title: '朝食チェックイン',
      placeholder: '部屋番号を入力してください',
      button: '送信',
    },
    en: {
      title: 'Breakfast Check-In',
      placeholder: 'Enter your room number',
      button: 'Submit',
    },
    zh: {
      title: '早餐登记',
      placeholder: '请输入房间号',
      button: '提交',
    },
    ko: {
      title: '아침 식사 체크인',
      placeholder: '객실 번호를 입력하세요',
      button: '제출',
    },
  };

  const handleSubmit = async () => {
    if (!roomNumber) return;

    try {
      const roomRef = doc(db, "breakfastGuests", roomNumber);
      await updateDoc(roomRef, { status: 'waiting' });
      setMessage('OK!');
      setRoomNumber('');
    } catch (error) {
      console.error("Error updating document: ", error);
      setMessage('エラーが発生しました'); // hoặc dùng theo ngôn ngữ
    }
  };

  return (
    <div className="guest-container" style={{ backgroundColor: '#F2EBE0', textAlign: 'center', padding: '2rem', minHeight: '100vh'  }}>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setLanguage('ja')}>日本語</button>
        <button onClick={() => setLanguage('en')}>English</button>
        <button onClick={() => setLanguage('zh')}>中文</button>
        <button onClick={() => setLanguage('ko')}>한국어</button>
      </div>

      <h2>{texts[language].title}</h2>

      <input
        type="text"
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value)}
        placeholder={texts[language].placeholder}
        style={{ padding: '0.5rem', fontSize: '1rem', width: '60%', marginBottom: '1rem' }}
      />
      <br />
      <button onClick={handleSubmit} style={{ padding: '0.5rem 2rem', fontSize: '1rem' }}>
        {texts[language].button}
      </button>

      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
};

export default GuestCheckin;
