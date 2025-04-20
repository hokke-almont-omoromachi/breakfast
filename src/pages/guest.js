import React, { useState } from 'react';
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
        name: '名前',
        guests: '人数',
        instruction: '上記の内容でチェックインしますか？',
        success: 'チェックインが完了しました',
        home: 'ホームへ',
        restaurant: 'レストランへ',
    },
    en: {
        title_input: 'Enter your room number',
        title_confirm: 'Please confirm your information',
        button_submit: 'Submit',
        button_confirm: 'Confirm',
        error_invalid: 'Invalid room number',
        error_not_found: 'Room number not found',
        name: 'Name',
        guests: 'Guests',
        instruction: 'Do you want to check in with the above information?',
        success: 'Check-in completed',
        home: 'Go to Home',
        restaurant: 'Go to Restaurant',
    },
    zh: {
        title_input: '请输入房间号',
        title_confirm: '请确认您的信息',
        button_submit: '提交',
        button_confirm: '确认',
        error_invalid: '无效的房间号',
        error_not_found: '未找到该房间号',
        name: '姓名',
        guests: '人数',
        instruction: '您要以上述信息办理入住吗？',
        success: '办理入住完成',
        home: '返回首页',
        restaurant: '前往餐厅',
    },
    ko: {
        title_input: '객실 번호를 입력하세요',
        title_confirm: '고객 정보를 확인하세요',
        button_submit: '제출',
        button_confirm: '확인',
        error_invalid: '유효하지 않은 객실 번호입니다',
        error_not_found: '해당 객실 번호를 찾을 수 없습니다',
        name: '이름',
        guests: '인원수',
        instruction: '위 정보로 체크인하시겠습니까?',
        success: '체크인이 완료되었습니다',
        home: '홈으로 이동',
        restaurant: '레스토랑으로 이동',
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
    const navigate = useNavigate();

    const goToHome = () => navigate('/home');
    const goToRestaurant = () => navigate('/restaurant');

    const handleInputChange = (e) => {
        setRoomNumber(e.target.value);
        setError('');
        setGuestInfo(null);
        setIsConfirming(false);
    };

    const handleSubmit = async () => {
        const num = parseInt(roomNumber, 10);
        if (!VALID_ROOMS.includes(num)) {
            setError(TEXTS[language].error_invalid);
            setGuestInfo(null);
            setIsConfirming(false);
            return;
        }

        const guestsRef = collection(db, "breakfastGuests");
        const q = query(guestsRef, where("roomNumber", "==", num), where("status", "==", "not_arrived"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setError(TEXTS[language].error_not_found);
            setGuestInfo(null);
            setIsConfirming(false);
        } else {
            const guestsData = [];
            querySnapshot.forEach((doc) => {
                guestsData.push({ id: doc.id, ...doc.data() });
            });
            setGuestInfo(guestsData);
            setIsConfirming(true);
            setError('');
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
                alert(TEXTS[language].success);
                setRoomNumber('');
                setGuestInfo(null);
                setIsConfirming(false);
            } catch (error) {
                console.error("Error updating check-in status:", error);
                alert("チェックインに失敗しました"); // Thông báo lỗi (có thể tùy chỉnh)
            }
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
                    <div style={{
                        marginTop: '20px',
                        border: '1px solid #ccc',
                        borderRadius: '5px',
                        backgroundColor: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '20px',
                        width: '80%', // Điều chỉnh theo viền vàng nếu cần
                        maxWidth: '400px', // Điều chỉnh theo viền vàng nếu cần
                        margin: '20px auto',
                        textAlign: 'center'
                    }}>
                        <p style={{ marginBottom: '20px' }}>{TEXTS[language].instruction}</p>
                        <div style={{ marginBottom: '20px' }}>
                            {guestInfo.map((guest) => (
                                <div key={guest.id} style={{ marginBottom: '10px' }}>
                                    <div>{TEXTS[language].name}: {guest.名前}</div>
                                    <div>{TEXTS[language].guests}: {guest.人数}</div>
                                </div>
                            ))}
                        </div>
                        <button className="fixed-size-button" onClick={handleConfirmCheckin}>
                            {TEXTS[language].button_confirm}
                        </button>
                    </div>
                )}
                {isConfirming && guestInfo && guestInfo.length === 0 && (
                    <p style={{ color: 'red', marginTop: '10px' }}>{TEXTS[language].error_not_found}</p>
                )}
            </div>
        </div>
    );
};

export default GuestCheckin;