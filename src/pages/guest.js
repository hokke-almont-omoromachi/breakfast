import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const LANGUAGES = ['ja', 'en', 'zh', 'ko'];

const TEXTS = {
    ja: {
        title_input: '部屋番号を入力してください',
        title_confirm: 'お客様情報をご確認ください',
        button_submit: '送信',
        button_confirm: 'YES',
        error_invalid: '無効な部屋番号です',
        error_not_found: '該当する部屋番号が見つかりません',
        name: 'お名前',
        guests: '人数',
        instruction: '以下の内容でよろしいですか？',
        success: 'チェックインが完了しました',
        home: 'ホームへ',
        restaurant: 'レストランへ',
        modal_welcome: 'いらっしゃいませ！',
        modal_tray: '●　トレーやお箸などは入口にご用意しております。',
        modal_card: '●　お食事がお済みになりましたら、カードの裏側にお願いいたします。',
        modal_back: 'NO', // Thêm dòng này
    },
    en: {
        title_input: 'Input your room number',
        title_confirm: 'Please confirm your information',
        button_submit: 'Submit',
        button_confirm: 'YES',
        error_invalid: 'Invalid room number',
        error_not_found: 'Room number not found',
        name: 'Name',
        guests: 'Guests',
        instruction: 'Is the information below correct?',
        success: 'Check-in completed',
        home: 'Go to Home',
        restaurant: 'Go to Restaurant',
        modal_welcome: 'Welcome!',
        modal_tray: '●　Trays, chopsticks, and other utensils are available at the entrance.',
        modal_card: '●　Once you have finished your meal, kindly turn the card to the back side.',
        modal_back: 'NO', // Thêm dòng này
    },
    zh: {
        title_input: '請輸入房號',
        title_confirm: '請確認您的資料',
        button_submit: '送出',
        button_confirm: 'YES',
        error_invalid: '房號無效',
        error_not_found: '找不到該房號',
        name: '姓名',
        guests: '人數',
        instruction: '以下是您的資料，請問正確嗎？',
        success: '已完成入住手續',
        home: '回到首頁',
        restaurant: '前往餐廳',
        modal_welcome: '歡迎光臨！',
        modal_tray: '●　入口處備有托盤與筷子等用品，歡迎自行取用。',
        modal_card: '●　用餐結束後，煩請將卡片放回背面位置，感謝您的協助。',
        modal_back: 'NO', // Thêm dòng này
    },
    ko: {
        title_input: '객실 번호를 입력하세요',
        title_confirm: '고객 정보를 확인해 주세요',
        button_submit: '제출',
        button_confirm: 'YES',
        error_invalid: '유효하지 않은 객실 번호입니다',
        error_not_found: '해당 객실 번호를 찾을 수 없습니다',
        name: '이름',
        guests: '인원수',
        instruction: '아래의 정보가 정확한가요?',
        success: '체크인이 완료되었습니다',
        home: '홈으로 이동',
        restaurant: '레스토랑으로 이동',
        modal_welcome: '어서 오세요!',
        modal_tray: '●　트레이와 젓가락 등은 입구에 준비해 드렸습니다.',
        modal_card: '●　식사를 마치신 후에는 카드 뒷면에 놓아주시면 감사하겠습니다.',
        modal_back: 'NO', // Thêm dòng này
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
    const [guestInfo, setGuestInfo] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const [modalGuestName, setModalGuestName] = useState('');
    const timeoutId = useRef(null); 


    const goToHome = () => navigate('/home');
    const goToRestaurant = () => navigate('/restaurant');
    const goToFull = () => navigate('/fullSeat');
    const goToGuest = () => {navigate('/guest'); };
    const goToSetting = () => {navigate('/setting')};

    const handleInputChange = (e) => {
        setRoomNumber(e.target.value);
        setError('');
        setGuestInfo(null);
        setIsConfirming(false);
        setShowModal(false);
    };

    const handleSubmit = async () => {
        const num = parseInt(roomNumber, 10);
    
        // Check if the room number is valid
        if (!VALID_ROOMS.includes(num)) {
            setError(TEXTS[language].error_invalid);
            setRoomNumber(''); // Clear the input if invalid
            setGuestInfo(null);
            setIsConfirming(false);
            setShowModal(false);
            return;
        }
    
        // Query the database to find the guest info
        const guestsRef = collection(db, "breakfastGuests");
        const q = query(guestsRef, where("roomNumber", "==", num), where("status", "==", "not_arrived"));
        const querySnapshot = await getDocs(q);
    
        // Check if the room number was found
        if (querySnapshot.empty) {
            setError(TEXTS[language].error_not_found);
            setRoomNumber(''); // Clear the input if no guest found
            setGuestInfo(null);
            setIsConfirming(false);
            setShowModal(false);
        } else {
            const guestsData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                guestsData.push({ id: doc.id, ...data, 名前: data.名前 });
            });
            setGuestInfo(guestsData);
            setIsConfirming(true);
            setError('');
            setShowModal(false); // Close the modal if it was open
            setRoomNumber(''); 
        }
    };

    const handleConfirmCheckin = async () => {
        if (guestInfo && guestInfo.length > 0) {
            try {
            await Promise.all(
                guestInfo.map(async (guest) => {
                    const guestDocRef = doc(db, "breakfastGuests", guest.id);
                        await updateDoc(guestDocRef, {
                            status: "arrived",
                            arrivedTime: Date.now() // <--- CHANGE THIS LINE
                        });
                    })
                );
                setModalGuestName(guestInfo.map(g => `${g.名前}${language === 'ja' ? ' 様' : ''}`).join(', '));
                setShowModal(true);
                timeoutId.current = setTimeout(() => {
                    setShowModal(false);
                    setRoomNumber('');
                    setGuestInfo(null);
                    setIsConfirming(false);
                    timeoutId.current = null;
                }, 10000);
            } catch (error) {
                console.error("Error updating check-in status:", error);
                alert("チェックインに失敗しました"); // Thông báo lỗi (có thể tùy chỉnh)
            }
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setRoomNumber('');
        setGuestInfo(null);
        setIsConfirming(false);
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
            timeoutId.current = null;
        }
    };

    useEffect(() => {
        if (showModal) {
            const timer = setTimeout(() => {
                setShowModal(false);
                setRoomNumber('');
                setGuestInfo(null);
                setIsConfirming(false);
                timeoutId.current = null;
            }, 10000); 
            return () => clearTimeout(timer);
        }
        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
                timeoutId.current = null;
            }
        };
    }, [showModal]);

    return (
        <div className="checkin-container" style={{ backgroundColor: '#F2EBE0', minHeight: '100vh' }}>
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
                                <img
                    src={`${process.env.PUBLIC_URL}/assets/guest.png`} alt="Restaurant"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToGuest}
                />
                <img
                    src={`${process.env.PUBLIC_URL}/assets/full.png`} alt="Full"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToFull}
                />
                <img src={`${process.env.PUBLIC_URL}/assets/setting.png`} alt="Setting"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToSetting}
                />
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '3rem' }}>
                    {LANGUAGES.map((lang) => (
                        <button key={lang} className="fixed-size-button" onClick={() => setLanguage(lang)}
                            style={{ margin: '0 5px' }}>
                            {lang === 'ja' ? '日本語' : lang === 'en' ? 'English' : lang === 'zh' ? '中文' : '한국어'}
                        </button>
                    ))}
                </div>

                <h2 style={{ height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isConfirming ? TEXTS[language].title_confirm : TEXTS[language].title_input}
                </h2>

                {!isConfirming && (
                    <>
                        <input
                            className="room-input" type="number" value={roomNumber}
                            onChange={handleInputChange} placeholder={TEXTS[language].placeholder}
                            style={{ direction: language === 'ja' || language === 'zh' || language === 'ko' ? 'ltr' : 'ltr' }}
                        />
                        <br />
                        <button className="fixed-size-button" onClick={handleSubmit}>
                            {TEXTS[language].button_submit}
                        </button>
                        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                    </>
                )}

                {isConfirming && guestInfo && guestInfo.length > 0 && (
                    <div className="confirm-box">
                        <p style={{ marginBottom: '20px' }}>{TEXTS[language].instruction}</p>
                        <div style={{ marginBottom: '20px' }}>
                            {guestInfo.map((guest) => (
                                <div key={guest.id} style={{ marginBottom: '10px', textAlign: 'left' }}>
                                    <div style={{ marginLeft: '100px'}}>
                                        <span>{TEXTS[language].name.toUpperCase()}: 　</span>
                                        <span style={{ fontWeight: "bold" }}>{guest.名前}</span>
                                        <span>
                                            {language === 'ja' && '　 様'}
                                            {language === 'ko' && ' 　 님'}
                                        </span>
                                    </div>
                                    <div style={{ marginLeft: '100px'}}>
                                        <span>{TEXTS[language].guests.toUpperCase()}: 　</span>
                                        <span style={{ fontWeight: "bold" }}>{guest.人数}</span>
                                        <span>
                                            {language === 'ja' && ' 　名'}
                                            {language === 'en' && `　 Guest${guest.人数 > 1 ? 's' : ''}`}
                                            {language === 'ko' && '  　명'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="fixed-size-button" onClick={() => setIsConfirming(false)}>
                            {TEXTS[language].modal_back}
                            </button>
                            <button className="fixed-size-button" onClick={handleConfirmCheckin}>
                                {TEXTS[language].button_confirm}
                            </button>
                        </div>
                    </div>
                )}

                {isConfirming && guestInfo && guestInfo.length === 0 && (
                    <p style={{ color: 'red', marginTop: '10px' }}>{TEXTS[language].error_not_found}</p>
                )}

            {showModal && (
                <div className="model">
                    <p className="modal-guest-name">
                        {modalGuestName}
                    </p>
                    <p className="modal-welcome-text">
                        {TEXTS[language].modal_welcome}
                    </p>
                    <p className="modal-tray-info">
                        {TEXTS[language].modal_tray}
                        <img src={`${process.env.PUBLIC_URL}/assets/tray.png`} alt="トレー" className="modal-tray-image" />
                    </p>
                    <p className="modal-card-info">
                        {TEXTS[language].modal_card}
                    </p>
                    <img
                        src={`${process.env.PUBLIC_URL}/assets/card change.png`}
                        alt="カード"
                        style={{ 

                            verticalAlign: 'middle',
                            height: 'auto', /* Để chiều cao tự động điều chỉnh theo tỷ lệ */
                            maxHeight: '100%', /* Không vượt quá chiều cao của phần tử cha */
                            maxWidth: '100%', /* Không vượt quá chiều rộng của phần tử cha */
                            marginBottom: '10px',
                            display: 'block',
                         }}


                    />
                     <button className="fixed-size-button" onClick={handleCloseModal}>
                        {TEXTS[language].modal_back}
                    </button>
                </div>
            )}

                {showModal && <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 999,
                }}></div>}
            </div>
        </div>
    );
};

export default GuestCheckin;