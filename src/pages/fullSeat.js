import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Đảm bảo import CSS nếu cần

const FullSeat = () => {
    const navigate = useNavigate();

    const goToHome = () => navigate('/home');
    const goToRestaurant = () => navigate('/restaurant');
    const goToGuest = () => { navigate('/guest'); };
    const goToFull = () => navigate('/fullSeat');
    const goToSetting = () => {navigate('/setting')};

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
                    src={`${process.env.PUBLIC_URL}/assets/guest.png`} alt="Guest"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToGuest}
                />
               <img src={`${process.env.PUBLIC_URL}/assets/full.png`} alt="Guest" 
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }} 
                    onClick={goToFull} 
                />             
                <img src={`${process.env.PUBLIC_URL}/assets/setting.png`} alt="Setting" 
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }} 
                    onClick={goToSetting} 
                />
            </div>

            <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 65px)' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img
                        src={`${process.env.PUBLIC_URL}/assets/hokkun.png`} // Thay thế bằng đường dẫn ảnh của bạn
                        alt="満席"
                        style={{ maxWidth: '80%', maxHeight: '90%', objectFit: 'contain' }}
                    />
                </div>
                <div style={{ flex: 1, padding: '20px', textAlign: 'left' }}>
                    <p style={{color:'#811121', fontSize: '2em', fontWeight: 'bold', marginBottom: '10px', lineHeight: '1.5' }}>
                      只今、満席でございます。<br />お席が空き次第、順番にご案内させていただきます。
                    </p>
                    <p style={{ fontSize: '1.2em', lineHeight: '1.5' }}>
                    We are currently fully booked.<br />We will guide you to your seat as soon as one becomes available.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FullSeat;