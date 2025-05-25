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
        button_confirm: '確認',
        error_invalid: '無効な部屋番号です',
        error_not_found: '該当する部屋番号が見つかりません',
        room:'部屋番号',
        name: '名前',
        guests: '人数',
        instruction: '下記の内容でチェックインしますか？',
        success: 'チェックインが完了しました',
        home: 'ホームへ',
        restaurant: 'レストランへ',
        modal_welcome: 'いらっしゃいませ！',
        modal_tray: '●　トレーやお箸などは入口にご用意しております。',
        modal_card: '●　お食事がお済みになりましたら、カードの裏側にお願いいたします。',
        modal_back: '戻る',
        placeholder: '部屋番号入力',
        plain_speech_parts: (room, guests) => [
            'お部屋',
            String(room),
            `${guests}名様`,
            'ご来店です。'
        ],
        speech_welcome: 'いらっしゃいませ！',
    },
    en: {
        title_input: 'Enter your room number',
        title_confirm: 'Please confirm your information',
        button_submit: 'Submit',
        button_confirm: 'Confirm',
        error_invalid: 'Invalid room number',
        error_not_found: 'Room number not found',
        room:'Room Number',
        name: 'Name',
        guests: 'Guests',
        instruction: 'Do you want to check in with the above information?',
        success: 'Check-in completed',
        home: 'Go to Home',
        restaurant: 'Go to Restaurant',
        modal_welcome: 'Welcome!',
        modal_tray: '●　Trays, chopsticks, and other utensils are available at the entrance.',
        modal_card: '●　Once you have finished your meal, kindly turn the card to the back side.',
        modal_back: 'Back',
        placeholder: 'Enter Room Number',
        // Dùng tiếng Nhật cho plain_speech_parts mặc dù ngôn ngữ là tiếng Anh
        plain_speech_parts: (room, guests) => [
            'お部屋', // O-heya
            String(room),
            `${guests}名様`, // -mei sama
            'ご来店です。' // Go-raiten desu.
        ],
        speech_welcome: 'いらっしゃいませ！', // Irasshaimase!
    },
    zh: {
        title_input: '請輸入房號',
        title_confirm: '請確認您的資料',
        button_submit: '送出',
        button_confirm: '確認',
        error_invalid: '房號無效',
        error_not_found: '找不到該房號',
        room:'房號',
        name: '姓名',
        guests: '人數',
        instruction: '是否使用上述資料辦理入住？',
        success: '已完成入住手續',
        home: '回到首頁',
        restaurant: '前往餐廳',
        modal_welcome: '歡迎光臨！',
        modal_tray: '●　入口處備有托盤與筷子等用品，歡迎自行取用。',
        modal_card: '●　用餐結束後，煩請將卡片放回背面位置，感謝您的協助。',
        modal_back: '返回',
        placeholder: '請輸入房號',
        // Dùng tiếng Nhật cho plain_speech_parts mặc dù ngôn ngữ là tiếng Trung
        plain_speech_parts: (room, guests) => [
            'お部屋',
            String(room),
            `${guests}名様`,
            'ご来店です。'
        ],
        speech_welcome: 'いらっしゃいませ！',
    },
    ko: {
        title_input: '객실 번호를 입력하세요',
        title_confirm: '고객 정보를 확인하세요',
        button_submit: '제출',
        button_confirm: '확인',
        error_invalid: '유효하지 않은 객실 번호입니다',
        error_not_found: '해당 객실 번호를 찾을 수 없습니다',
        room:'객실 번호',
        name: '이름',
        guests: '인원수',
        instruction: '위 정보로 체크인하시겠습니까?',
        success: '체크인이 완료되었습니다',
        home: '홈으로 이동',
        restaurant: '레스토랑으로 이동',
        modal_welcome: '어서 오세요!',
        modal_tray: '●　트레이와 젓가락 등은 입구에 준비해 드렸습니다.',
        modal_card: '●　식사를 마치신 후에는 카드 뒷면에 놓아주시면 감사하겠습니다.',
        modal_back: '돌아가기',
        placeholder: '객실 번호 입력',
        // Dùng tiếng Nhật cho plain_speech_parts mặc dù ngôn ngữ là tiếng Hàn
        plain_speech_parts: (room, guests) => [
            'お部屋',
            String(room),
            `${guests}名様`,
            'ご来店です。'
        ],
        speech_welcome: 'いらっしゃいませ！',
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
    const currentSpeechTimeout = useRef(null); 

    const [voices, setVoices] = useState([]);

    useEffect(() => {
        if ('speechSynthesis' in window) {
            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
            };

            if (window.speechSynthesis.getVoices().length) {
                loadVoices();
            } else {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []); 

    const goToHome = () => navigate('/home');
    const goToRestaurant = () => navigate('/restaurant');
    const goToFull = () => navigate('/fullSeat');
    const goToGuest = () => {navigate('/guest'); };

    const speakPartsSequentially = (parts, langCode, delayMs = 1000, speedRate = 1.0, index = 0) => {
        if (!('speechSynthesis' in window) || index >= parts.length) {
            return;
        }

        window.speechSynthesis.cancel(); 

        const utterance = new SpeechSynthesisUtterance(parts[index]);
        // Bỏ qua utterance.lang = langCode;
        utterance.rate = speedRate; 

        // Luôn tìm giọng tiếng Nhật
        const selectedVoice = voices.find(voice =>
            voice.lang.startsWith('ja') &&
            (
                voice.name.includes('Nanami Online (Natural)') || // Thử giọng này trước, thường là tốt
                voice.default // Cuối cùng, dùng giọng mặc định nếu không tìm thấy cái nào trên
            )
        );

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = 'ja'; // Đảm bảo ngôn ngữ của utterance là tiếng Nhật
            console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for text: "${parts[index]}"`);
        } else {
            utterance.lang = 'ja'; // Vẫn đặt lang là 'ja' ngay cả khi dùng giọng mặc định
            console.warn(`No specific Japanese voice found. Using default voice for: "${parts[index]}" with lang 'ja'.`);
        }


        utterance.onend = () => {
            console.log(`Finished part ${index + 1}: ${parts[index]}`);
            if (currentSpeechTimeout.current) {
                clearTimeout(currentSpeechTimeout.current);
            }
            currentSpeechTimeout.current = setTimeout(() => {
                speakPartsSequentially(parts, langCode, delayMs, speedRate, index + 1);
            }, delayMs);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            if (currentSpeechTimeout.current) {
                clearTimeout(currentSpeechTimeout.current);
            }
            currentSpeechTimeout.current = setTimeout(() => {
                speakPartsSequentially(parts, langCode, delayMs, speedRate, index + 1);
            }, delayMs);
        };

        window.speechSynthesis.speak(utterance);
    };


    const handleInputChange = (e) => {
        setRoomNumber(e.target.value);
        setError('');
        setGuestInfo(null);
        setIsConfirming(false);
        setShowModal(false);
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            if (currentSpeechTimeout.current) {
                clearTimeout(currentSpeechTimeout.current);
                currentSpeechTimeout.current = null;
            }
        }
    };

    const handleSubmit = async () => {
        const num = parseInt(roomNumber, 10);
    
        if (!VALID_ROOMS.includes(num)) {
            setError(TEXTS[language].error_invalid);
            setRoomNumber(''); 
            setGuestInfo(null);
            setIsConfirming(false);
            setShowModal(false);
            return;
        }
    
        const guestsRef = collection(db, "breakfastGuests");
        const q = query(guestsRef, where("roomNumber", "==", num), where("status", "==", "not_arrived"));
        const querySnapshot = await getDocs(q);
    
        if (querySnapshot.empty) {
            setError(TEXTS[language].error_not_found);
            setRoomNumber(''); 
            setGuestInfo(null);
            setIsConfirming(false);
            setShowModal(false);
        } else {
            const guestsData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                guestsData.push({ id: doc.id, ...data }); 
            });
            setGuestInfo(guestsData);
            setIsConfirming(true);
            setError('');
            setShowModal(false); 
            setRoomNumber(''); 
        }
    };

    const handleConfirmCheckin = async () => {
        if (guestInfo && guestInfo.length > 0) {
            try {
                await Promise.all(
                    guestInfo.map(async (guest) => {
                        const guestDocRef = doc(db, "breakfastGuests", guest.id);
                        await updateDoc(guestDocRef, { status: "arrived" });
                    })
                );
                const guestNames = guestInfo.map(g => `${g.名前}${language === 'ja' ? ' 様' : ''}`).join(', ');
                setModalGuestName(guestNames);
                setShowModal(true);

                const firstGuestRoom = guestInfo[0].ルーム;
                const totalGuestsInGroup = guestInfo.reduce((sum, g) => sum + g.人数, 0);

                const speechParts = TEXTS[language].plain_speech_parts(firstGuestRoom, totalGuestsInGroup);
                
                // Gọi hàm phát âm thanh. LangCode vẫn truyền vào để biết ngôn ngữ hiển thị
                // nhưng bên trong speakPartsSequentially sẽ ưu tiên giọng Nhật.
                speakPartsSequentially(speechParts, language, 1.2); 

                timeoutId.current = setTimeout(() => {
                    handleCloseModal(); 
                }, 10000);
            } catch (error) {
                console.error("Error updating check-in status:", error);
                alert("チェックインに失敗しました"); 
            }
        }
    };

    const handleCloseModal = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            if (currentSpeechTimeout.current) {
                clearTimeout(currentSpeechTimeout.current);
                currentSpeechTimeout.current = null;
            }
        }
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
        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
                timeoutId.current = null;
            }
            if (currentSpeechTimeout.current) {
                clearTimeout(currentSpeechTimeout.current);
                currentSpeechTimeout.current = null;
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []); 

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
                                        <span>{TEXTS[language].room.toUpperCase()}: 　</span>
                                        <span style={{ fontWeight: "bold" }}>{guest.ルーム}</span>
                                    </div>
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
                            height: 'auto',
                            maxHeight: '100%',
                            maxWidth: '100%',
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