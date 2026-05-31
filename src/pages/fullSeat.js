import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Đảm bảo import CSS nếu cần

const FullSeat = () => {
    const navigate = useNavigate();

    const goToHome = () => navigate('/home');
    const goToRestaurant = () => navigate('/restaurant');
    const goToGuest = () => { navigate('/guest'); };
    const goToFull = () => navigate('/fullSeat');
    const goToHikitsugi = () => {navigate('/hikitsugi')};

    return (
        <div className="checkin-container" style={{ backgroundColor: '#F2EBE0', minHeight: '100vh' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                 
                }}
                >
                {/* Nhóm icon bên trái */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <img
                    src={`${process.env.PUBLIC_URL}/assets/home.png`}
                    alt="Home"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToHome}
                    />
                    <img
                    src={`${process.env.PUBLIC_URL}/assets/restaurant.png`}
                    alt="Restaurant"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToRestaurant}
                    />
                    <img
                    src={`${process.env.PUBLIC_URL}/assets/guest.png`}
                    alt="Guest"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToGuest}
                    />
                    <img
                    src={`${process.env.PUBLIC_URL}/assets/full.png`}
                    alt="Full"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToFull}
                    />
                    <img
                    src={`${process.env.PUBLIC_URL}/assets/hikitsugi.png`}
                    alt="Hikitsugi"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToHikitsugi}
                    />
                </div>
            </div> 

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 65px)',width: '100%'}}>
                    {/* Hộp phụ bọc quanh text để gom các dòng lại gần nhau */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#811121', fontSize: '2em', fontWeight: 'bold', lineHeight: '1.4', margin: '0 0 15px 0' }}>
                            只今、満席でございます。<br />お席が空き次第、順番にご案内させていただきます。
                        </p>
                        
                        <p style={{ fontSize: '1.2em', lineHeight: '1.4', margin: '0 0 15px 0' }}>
                            We are currently fully booked.<br />We will guide you to your seat as soon as one becomes available.
                        </p>
                        
                        <p style={{ fontSize: '1.2em', lineHeight: '1.4', margin: '0 0 15px 0' }}>
                            目前客滿，請稍候。<br />有座位後將依序為您安排。
                        </p>
                        
                        <p style={{ fontSize: '1.2em', lineHeight: '1.4', margin: '0' }}>
                            현재 만석입니다.<br />자리가 나오는 대로 순서대로 안내해 드리겠습니다.
                        </p>

                    </div>
                </div>
        </div>
    );
};

export default FullSeat;