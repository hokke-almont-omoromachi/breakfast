import React, { useState } from 'react';
import { db, doc, updateDoc } from '../firebaseConfig';
import '../App.css';

const LANGUAGES = ['ja', 'en', 'zh', 'ko'];

const TEXTS = {
  ja: {
    title: '朝食チェックイン',
    placeholder: '部屋番号を入力してください',
    button: '送信',
    success: 'チェックイン完了！',
    error: 'エラーが発生しました。部屋番号を確認してください。',
  },
  en: {
    title: 'Breakfast Check-In',
    placeholder: 'Enter your room number',
    button: 'Submit',
    success: 'Check-in successful!',
    error: 'An error occurred. Please check the room number.',
  },
  zh: {
    title: '早餐登记',
    placeholder: '请输入房间号',
    button: '提交',
    success: '登记成功！',
    error: '发生错误，请确认房间号。',
  },
  ko: {
    title: '아침 식사 체크인',
    placeholder: '객실 번호를 입력하세요',
    button: '제출',
    success: '체크인 완료!',
    error: '오류가 발생했습니다. 객실 번호를 확인해주세요.',
  },
};

const GuestCheckin = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [language, setLanguage] = useState('ja');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!roomNumber) return;

    try {
      const roomRef = doc(db, 'breakfastGuests', roomNumber.trim());
      await updateDoc(roomRef, { status: 'waiting' });
      setMessage(TEXTS[language].success);
      setRoomNumber('');
    } catch (error) {
      console.error('Error updating document:', error);
      setMessage(TEXTS[language].error);
    }
  };

  return (
    <div className="guest-container" style={{ backgroundColor: '#F2EBE0', textAlign: 'center', padding: '2rem', minHeight: '100vh' }}>
      {/* Language Switcher */}
      <div style={{ marginBottom: '1rem' }}>
        {LANGUAGES.map((lang) => (
          <button key={lang} onClick={() => setLanguage(lang)} style={{ margin: '0 5px' }}>
            {lang === 'ja' ? '日本語' : lang === 'en' ? 'English' : lang === 'zh' ? '中文' : '한국어'}
          </button>
        ))}
      </div>

      <h2>{TEXTS[language].title}</h2>

      <input
        type="text"
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value)}
        placeholder={TEXTS[language].placeholder}
        style={{ padding: '0.5rem', fontSize: '1rem', width: '60%', marginBottom: '1rem' }}
      />
      <br />
      <button onClick={handleSubmit} style={{ padding: '0.5rem 2rem', fontSize: '1rem' }}>
        {TEXTS[language].button}
      </button>

      {message && <p style={{ marginTop: '1rem', color: message === TEXTS[language].success ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
};

export default GuestCheckin;
