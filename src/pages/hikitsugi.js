import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { db } from '../firebaseConfig'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';

const Hikitsugi = () => {
  const navigate = useNavigate();
  const goToHome = () => navigate('/home');
  const goToRestaurant = () => navigate('/restaurant');
  const goToGuest = () => navigate('/guest');
  const goToFull = () => navigate('/fullSeat');
  const goToHikitsugi = () => navigate('/hikitsugi');

  const [tableData, setTableData] = useState([]);

  const [inputs, setInputs] = useState({
    roomNumber: '',
    name: '',
    guestCount: '',
    content: '',
    checkIn: '',
    checkOut: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'hikitsugi'), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dataFromServer = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      querySnapshot.forEach((document) => {
        const item = { id: document.id, ...document.data() };
        
        if (item.checkOut) {
          const checkOutDate = new Date(item.checkOut);
          checkOutDate.setHours(0, 0, 0, 0);

          const deleteDate = new Date(checkOutDate);
          deleteDate.setDate(checkOutDate.getDate() + 1);

          if (today >= deleteDate) {
            deleteDoc(doc(db, 'hikitsugi', document.id));
            return;
          }
        }
        
        dataFromServer.push(item);
      });

      setTableData(dataFromServer);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    if (!inputs.roomNumber || !inputs.name) {
      alert('部屋番号とお名前を入力してください。');
      return;
    }

    try {
      await addDoc(collection(db, 'hikitsugi'), {
        roomNumber: inputs.roomNumber,
        name: inputs.name,
        guestCount: inputs.guestCount,
        content: inputs.content,
        checkIn: inputs.checkIn,
        checkOut: inputs.checkOut,
        createdAt: new Date().toISOString()
      });

      setInputs({
        roomNumber: '',
        name: '',
        guestCount: '',
        content: '',
        checkIn: '',
        checkOut: ''
      });
    } catch (error) {
      console.error("Firebase Add Error: ", error);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('この行のデータを削除しますか？')) {
      try {
        await deleteDoc(doc(db, 'hikitsugi', id));
      } catch (error) {
        console.error("Firebase Delete Error: ", error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString.replace(/-/g, '/');
  };

  return (
    <div className="checkin-container" style={{ backgroundColor: '#F2EBE0', minHeight: '100vh', padding: '20px' }}>
      {/* Nhóm Icon Điều Hướng Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <img src={`${process.env.PUBLIC_URL}/assets/home.png`} alt="Home" style={{ cursor: 'pointer', width: '40px', height: '35px' }} onClick={goToHome} />
          <img src={`${process.env.PUBLIC_URL}/assets/restaurant.png`} alt="Restaurant" style={{ cursor: 'pointer', width: '40px', height: '35px' }} onClick={goToRestaurant} />
          <img src={`${process.env.PUBLIC_URL}/assets/guest.png`} alt="Guest" style={{ cursor: 'pointer', width: '40px', height: '35px' }} onClick={goToGuest} />
          <img src={`${process.env.PUBLIC_URL}/assets/full.png`} alt="Full" style={{ cursor: 'pointer', width: '40px', height: '35px' }} onClick={goToFull} />
          <img src={`${process.env.PUBLIC_URL}/assets/hikitsugi.png`} alt="Hikitsugi" style={{ cursor: 'pointer', width: '40px', height: '35px' }} onClick={goToHikitsugi} />
        </div>
      </div>

      {/* Cấu trúc Bảng */}
      <div style={{ width: '100%', overflowX: 'auto', marginTop: '10px' }}>
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 'bold', color: '#171616' }}>フロントからレストランへの引継ぎ</h2>
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: '#FFFFFF',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#E8DCC4' }}>
              <th style={tableHeaderStyle}>部屋番号</th>
              <th style={tableHeaderStyle}>お名前</th>
              <th style={tableHeaderStyle}>人数</th>
              <th style={tableHeaderStyle}>引継ぎ内容</th>
              <th style={tableHeaderStyle}>チェックイン</th>
              <th style={tableHeaderStyle}>チェックアウト</th>
              <th style={tableHeaderStyle}>アクション</th>
            </tr>
          </thead>
          <tbody>
            {/* 1. DÒNG NHẬP LIỆU ĐẦU BẢNG (Được tạo border gầm dày hơn để tách biệt với phần dưới) */}
            <tr style={{ backgroundColor: '#F9F6F0', borderBottom: '4px solid #E8DCC4' }}>
              <td style={tableInputCellStyle}>
                <input type="text" name="roomNumber" value={inputs.roomNumber} onChange={handleInputChange} style={inputStyle} placeholder="例: 301" />
              </td>
              <td style={tableInputCellStyle}>
                <input type="text" name="name" value={inputs.name} onChange={handleInputChange} style={inputStyle} placeholder="例: 山田" />
              </td>
              <td style={tableInputCellStyle}>
                <input type="number" name="guestCount" value={inputs.guestCount} onChange={handleInputChange} style={inputStyle} placeholder="1" />
              </td>
              <td style={{ ...tableInputCellStyle, width: '300px' }}>
                <textarea name="content" value={inputs.content} onChange={handleInputChange} style={textareaStyle} placeholder="内容を入力" />
              </td>
              <td style={tableInputCellStyle}>
                <input type="date" name="checkIn" value={inputs.checkIn} onChange={handleInputChange} style={inputStyle} placeholder="yyyy/mm/dd" />
              </td>
              <td style={tableInputCellStyle}>
                <input type="date" name="checkOut" value={inputs.checkOut} onChange={handleInputChange} style={inputStyle} placeholder="yyyy/mm/dd" />
              </td>
              <td style={{ ...tableInputCellStyle, padding: '4px 8px', textAlign: 'center' }}>
                <button onClick={handleRegister} style={{ ...btnStyle, backgroundColor: '#4CAF50', color: 'white' }}>登録</button>
              </td>
            </tr>

            {/* Khoảng trống đệm nhẹ giúp phân tách dữ liệu rõ ràng hơn */}
            <tr style={{ height: '8px', backgroundColor: '#F2EBE0' }}><td colSpan="7" style={{ border: 'none' }}></td></tr>

            {/* 2. DÒNG DỮ LIỆU ĐÃ ĐĂNG KÝ ĐƯỢC LOAD VỀ */}
            {tableData.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...tableCellStyle, padding: '30px', color: '#999' }}>データがありません。</td>
              </tr>
            ) : (
              tableData.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #CCCCCC', backgroundColor: '#FFFFFF' }}>
                  <td style={roomNumberCellStyle}>{item.roomNumber}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>{item.name}</td>
                  <td style={guestCountCellStyle}>{item.guestCount}</td>
                  <td style={contentCellStyle}>{item.content}</td>
                  <td style={tableCellStyle}>{formatDate(item.checkIn)}</td>
                  <td style={tableCellStyle}>{formatDate(item.checkOut)}</td>
                  <td style={tableCellStyle}>
                    <button onClick={() => handleCancel(item.id)} style={{ ...btnStyle, backgroundColor: '#F44336', color: 'white' }}>取消</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// CSS Stylesheet
const tableHeaderStyle = { 
  border: '1px solid #CCCCCC', 
  padding: '12px 8px', 
  fontWeight: 'bold', 
  fontSize: '14px',
  textAlign: 'center' // Ép toàn bộ tiêu đề canh giữa
};

const tableInputCellStyle = {
  border: '1px solid #CCCCCC',
  padding: '0px', // Xóa padding của ô chứa input để input tràn viền hoàn toàn
  verticalAlign: 'middle'
};

const tableCellStyle = { 
  border: '1px solid #CCCCCC', 
  padding: '10px 8px', 
  fontSize: '14px', 
  verticalAlign: 'middle',
  textAlign: 'center'
};

// Column-specific styles
const roomNumberCellStyle = { 
  ...tableCellStyle,
  width: '70px'
};

const guestCountCellStyle = { 
  ...tableCellStyle,
  width: '60px'
};

const contentCellStyle = { 
  ...tableCellStyle,
  width: '300px',
  textAlign: 'center',
  whiteSpace: 'pre-wrap'
};

const inputStyle = { 
  width: '100%', 
  height: '40px', // Tăng chiều cao lên một chút cho dễ nhìn
  padding: '0 10px', 
  border: 'none', // Bỏ viền riêng của input để nó tiệp vào viền của bảng
  borderRadius: '0px', 
  fontSize: '14px', 
  boxSizing: 'border-box',
  margin: '0',
  backgroundColor: 'transparent',
  textAlign: 'center' // Giúp text nhập vào cũng tự động ở giữa
};

const textareaStyle = {
  width: '100%',
  height: '40px',
  padding: '8px 10px',
  border: 'none',
  borderRadius: '0px',
  fontSize: '14px',
  boxSizing: 'border-box',
  margin: '0',
  backgroundColor: 'transparent',
  resize: 'none',
  verticalAlign: 'middle',
  textAlign: 'center'
};

const btnStyle = { 
  padding: '8px 14px', 
  border: 'none', 
  borderRadius: '4px', 
  cursor: 'pointer', 
  fontWeight: 'bold', 
  fontSize: '13px' 
};

export default Hikitsugi;