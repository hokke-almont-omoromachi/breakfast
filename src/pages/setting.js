import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { useBreakfast } from '../context/BreakfastContext.jsx';

const Setting = () => {
  const { handleFileChange, handleRefresh, fileInputRef } = useBreakfast();
  const navigate = useNavigate();
  const goToHome = () => navigate('/home');
  const goToRestaurant = () => navigate('/restaurant');
  const goToGuest = () => { navigate('/guest'); };
  const goToFull = () => navigate('/fullSeat');
  const goToSetting = () => {navigate('/setting')};

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
                    src={`${process.env.PUBLIC_URL}/assets/setting.png`}
                    alt="Setting"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToSetting}
                    />
                </div>
            </div>


     <div
  style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 80px)', // trừ phần header icon
  }}
>
  <div
    style={{
      backgroundColor: '#faf5e9ff',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '400px',
      textAlign: 'center',
    }}
  >
    <h3 style={{ fontSize: '1.8em', marginBottom: '20px' }}>
      朝食リストアップロード
    </h3>

    <div
      style={{
        textAlign: 'center',
        marginBottom: '20px',
        marginLeft:'60px'
      }}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{
          fontSize: '1.1em'
        }}
      />
    </div>


    <button
      onClick={handleRefresh}
      className="torikeshi"
      style={{
        fontSize: '1.1em',
        padding: '10px 30px',
        marginTop: '10px',
      }}
    >
      全取消
    </button>
  </div>
</div>



        </div>



  );
};

export default Setting;
