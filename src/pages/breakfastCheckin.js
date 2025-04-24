import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import {
  collection,setDoc,doc,deleteDoc,onSnapshot,getDocs,query, orderBy,} from 'firebase/firestore';
import '../App'; 

const BreakfastCheckin = () => {
    const [roomNumber, setRoomNumber] = useState('');
    const [guestsData, setGuestsData] = useState([]);
    const [totalGuests, setTotalGuests] = useState(0);
    const [checkedInGuests, setCheckedInGuests] = useState(0);
    const [roomName, setRoomName] = useState('');
    const [mealNum, setMealNum] = useState(1);
    const [modalContent, setModalContent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [inputList, setInputList] = useState([]);
    const fileInputRef = useRef(null);
    const [nameInput, setNameInput] = useState(''); 
    const [isComposing, setIsComposing] = useState(false);
    const [nameInputValue, setNameInputValue] = useState('');
    const navigate = useNavigate();
    const goToHome = () => {navigate('/home'); };
    const goToRestaurant = () => navigate('/restaurant');
    const goToGuest = () => {navigate('/guest'); };
    const gotoFull = () => {navigate('/fullSeat'); };

    useEffect(() => {
        const unsubscribeGuests = onSnapshot(
            query(collection(db, "breakfastGuests"), orderBy("roomNumber")),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGuestsData(data);
                updateGuestStatistics(data);
            },
            (error) => console.error('Data fetch error', error)
        );

        const unsubscribePurchases = onSnapshot(collection(db, "breakfastPurchases"), (snapshot) => {
            const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInputList(purchases);
        }, (error) => console.error('Purchase data fetch error:', error));

        return () => {
            unsubscribeGuests();
            unsubscribePurchases();
        };
    }, []);

    const handleCompositionStart = () => {
        setIsComposing(true);
      };
      
    const handleCompositionEnd = (e) => {
        setIsComposing(false);
        
    const value = e.target.value;
        if (/^[A-Za-z\s]+$/.test(value)) {
            const uppercased = value.replace(/[a-zA-Z]/g, (char) => char.toUpperCase());
            setNameInput(uppercased);
          } else {
            setNameInput(value);
          }
      
        setNameInputValue('');
      };

    const handleInputChange = (e) => {
        if (!isComposing) {
          const value = e.target.value;
          setNameInput(value); 
        } else {
          setNameInputValue(e.target.value);
        }
      };

    const handleInput = async () => {
        try {
            await setDoc(doc(collection(db, "breakfastPurchases")), {
                roomName: roomName,
                mealNum: mealNum
            });
            setRoomName('');
            setMealNum(1);
        } catch (error) {
            console.error('Add Data error:', error);
        }
    };

    const updateGuestStatistics = (data) => {
        let total = 0;
        let checkedIn = 0;
        data.forEach(guest => {
            total += guest.人数 || 0;
            if (guest.status === 'arrived') {
                checkedIn += guest.人数 || 0;
            }
        });
        setTotalGuests(total);
        setCheckedInGuests(checkedIn);
    };

    const readExcelFile = async (file) => {
        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const headers = jsonData[0]?.map(h => h?.toString().trim() || '');
            const formattedData = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row && row.length > 0) {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] ?? '';
                    });

                    const roomNumberValue = parseInt(rowData["ルーム"]?.toString().trim()) || 0;
                    const numberOfGuests = parseInt(rowData["人数"]) || 0;
                    const guestName = rowData["名前"]?.toString().trim() || "";

                    if (rowData["ルーム"] && numberOfGuests > 0) {
                        const sanitizedRoomNumber = String(rowData["ルーム"]).replace(/[^a-zA-Z0-9-]/g, '');
                        const sanitizedGuestName = String(guestName).replace(/[^a-zA-Z0-9-]/g, '');
                        const uniqueId = `${sanitizedRoomNumber}-${sanitizedGuestName}-${numberOfGuests}-${i}`;
                        formattedData.push({
                            id: uniqueId,
                            ルーム: rowData["ルーム"]?.toString().trim(),
                            roomNumber: roomNumberValue,
                            名前: guestName,
                            人数: numberOfGuests,
                            status: "not_arrived",
                        });
                    }
                }
            }
            setGuestsData(formattedData);
            await uploadDataToFirestore(formattedData);

        } catch (error) {
            console.error('Error reading Excel file:', error);
        }
    };

    const readCSVFile = async (file) => {
        try {
            const text = await file.text();
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const jsonData = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    jsonData.push(row);
                } else {
                    console.warn(`Skipping line ${i + 1} due to inconsistent number of values.`);
                }
            }
            const formattedData = jsonData.map(row => {
                const roomNumberValue = parseInt(row["ルーム"]?.toString().trim());
                const numberOfGuests = parseInt(row["人数"]) || 0;
                const guestName = row["名前"]?.toString().trim() || "";
                const sanitizedRoomNumber = String(row["ルーム"]).replace(/[^a-zA-Z0-9-]/g, '');
                const sanitizedGuestName = String(guestName).replace(/[^a-zA-Z0-9-]/g, '');
                const uniqueId = `${sanitizedRoomNumber}-${sanitizedGuestName}-${numberOfGuests}`;
                return {
                    id: uniqueId,
                    ルーム: row["ルーム"]?.toString().trim() || "",
                    roomNumber: isNaN(roomNumberValue) ? 0 : roomNumberValue,
                    名前: guestName,
                    人数: numberOfGuests,
                    status: "not_arrived",
                };
            }).filter(guest => guest.ルーム && guest.人数 > 0);
            setGuestsData(formattedData);
            await uploadDataToFirestore(formattedData);
        } catch (error) {
            console.error('CSV reading error:', error);
        }
    };

    const uploadDataToFirestore = async (data) => {
        try {
            const collectionRef = collection(db, "breakfastGuests");
            await deleteCollectionData(collectionRef);
            for (const guest of data) {
                await setDoc(doc(collectionRef, guest.id), guest);
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    const deleteCollectionData = async (collectionRef) => {
        try {
            const snapshot = await getDocs(collectionRef);
            await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleRoomCheckIn = () => {
        if (!roomNumber.trim()) {
            setModalContent({
                title: '朝食未購入',
                message: '部屋番号を入力して下さい。',
                buttons: [{ text: '戻る', action: () => closeModal() }]
            });
            setIsModalOpen(true);
            return;
        }

    const matchingGuests = guestsData.filter(g => g.ルーム === roomNumber.trim());

        if (matchingGuests.length === 0) {
            setModalContent({
                title: '朝食未購入',
                message: 'フロントに申し付けください。',
                buttons: [{ text: '戻る', action: () => closeModal() }]
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '確認',
            message: matchingGuests.map(guest => ({
                text: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
                id: guest.id,
                status: guest.status
            })),
            buttons: [
                {
                    text: '一括チェックイン',
                    action: () => handleCheckInAll(matchingGuests),
                    style: matchingGuests.some(g => g.status !== 'arrived') ? {} : { display: 'none' } // Hide if all are checked in
                },
                { text: '戻る', action: () => closeModal() }
            ]
        });
        setIsModalOpen(true);
    };

    const handleNameCheckIn = () => {
        if (!nameInput.trim()) {
            setModalContent({
                title: '朝食未購入',
                message: '名前を入力して下さい。',
                buttons: [{ text: '戻る', action: () => closeModal() }]
            });
            setIsModalOpen(true);
            return;
        }

        const matchingGuests = guestsData.filter(g =>
            g.名前.toLowerCase().includes(nameInput.trim().toLowerCase())
        );

        if (matchingGuests.length === 0) {
            setModalContent({
                title: '朝食未購入',
                message: '該当する名前の朝食購入データが見つかりません。',
                buttons: [{ text: '戻る', action: () => closeModal() }]
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '確認',
            message: matchingGuests.map(guest => ({
                text: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
                id: guest.id,
                status: guest.status
            })),
            buttons: [
                {
                    text: '一括チェックイン',
                    action: () => handleCheckInAll(matchingGuests),
                    style: matchingGuests.some(g => g.status !== 'arrived') ? {} : { display: 'none' } // Hide if all are checked in
                },
                { text: '戻る', action: () => closeModal() }
            ]
        });
        setIsModalOpen(true);
    };

    const handleCheckInGuest = async (guestId, room, count) => {
        try {
            const guest = guestsData.find((g) => g.id === guestId);
            if (guest) {
                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'arrived' }, { merge: true });
                setModalContent({
                    title: 'チェックイン',
                    message: `部屋 ${guest.ルーム}　${guest.名前} 様　${guest.人数}名 チェックインしました。`,
                    buttons: [{ text: '戻る', action: () => closeModal() }]
                });
            } else {
                console.warn(`ID ${guestId} is not found`);
                setModalContent({
                    title: 'チェックイン',
                    message: `部屋 ${room}　${count}名 チェックインしました。`,
                    buttons: [{ text: '戻る', action: () => closeModal() }]
                });
            }
            setIsModalOpen(true);
        } catch (error) {
            console.error('Check-In status error:', error);
            setModalContent({
                title: 'Lỗi',
                message: 'チェックインステータスエラー',
                buttons: [{ text: '戻る', action: () => closeModal() }]
            });
            setIsModalOpen(true);
        }
        setRoomNumber('');
    };

    const handleCheckInAll = async (guests) => {
        try {
            for (const guest of guests) {
                if (guest.status !== 'arrived') {
                    await setDoc(doc(db, "breakfastGuests", guest.id), { status: 'arrived' }, { merge: true });
                }
            }
            if (guests && guests.length > 0) {
                setModalContent({
                    title: 'チェックイン',
                    message: `全員チェックインしました。`,
                    buttons: [{ text: '戻る', action: () => closeModal() }]
                });
            } else {
                setModalContent({
                    title: 'チェックイン',
                    message: '全員チェックインしました。',
                    buttons: [{ text: '戻る', action: () => closeModal() }]
                });
            }
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to check in all guests: ', error);
            setModalContent({
                title: 'Lỗi',
                message: '全員チェックインエラー',
                buttons: [{ text: '戻る', action: () => closeModal() }]
            });
            setIsModalOpen(true);
        }
        setRoomNumber('');
    };

    const handleCancelCheckIn = async (guestId) => {
        const guestToCancel = guestsData.find(guest => guest.id === guestId);
        if (guestToCancel) {
            setModalContent({
                title: '確認',
                message: `部屋 ${guestToCancel.ルーム} ${guestToCancel.名前}様のチェックインを取り消しますか？`,
                buttons: [
                    {
                        text: 'はい',
                        action: async () => {
                            try {
                                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'not_arrived' }, { merge: true });
                                setModalContent({
                                    title: '取消',
                                    message: `部屋 ${guestToCancel.ルーム} ${guestToCancel.名前}様のチェックインを取り消しました。`,
                                    buttons: [{ text: '戻る', action: () => closeModal() }]
                                });
                                setIsModalOpen(true);
                            } catch (error) {
                                console.error('Error cancelling check-in:', error);
                                setModalContent({
                                    title: 'Lỗi',
                                    message: 'チェックインの取り消しに失敗しました。',
                                    buttons: [{ text: '戻る', action: () => closeModal() }]
                                });
                                setIsModalOpen(true);
                            }
                        }
                    },
                    { text: 'いいえ', action: () => closeModal() }
                ]
            });
            setIsModalOpen(true);
        }
    };

    const handleIndividualCheckIn = (guest) => {
        setModalContent({
            title: '確認',
            message: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
            buttons: [
                {
                    text: 'チェックイン',
                    action: () => handleCheckInGuest(guest.id, guest.ルーム, guest.人数)
                },
                { text: '戻る', action: () => closeModal() }
            ]
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent(null);
        setRoomNumber(''); 
        setNameInput(''); 
    };

    const getCurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    };

    const handleRefresh = async () => {
        setModalContent({
            title: 'データ取消',
            message: 'データを取消しますか？',
            buttons: [
                {
                    text: 'はい',
                    action: async () => {
                        try {
                            await deleteCollectionData(collection(db, "breakfastGuests"));
                            setGuestsData([]);
                            setTotalGuests(0);
                            setCheckedInGuests(0);
                            setModalContent({
                                title: 'データ取消',
                                message: 'データが取消されました!',
                                buttons: [{ text: '戻る', action: () => closeModal() }]
                            });
                            setIsModalOpen(true);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = null;
                            }
                        } catch (error) {
                            console.error('Refresh data error', error);
                            setModalContent({
                                title: 'Lỗi',
                                message: 'データ更新エラー',
                                buttons: [{ text: '戻る', action: () => closeModal() }]
                            });
                            setIsModalOpen(true);
                        }
                    }
                },
                { text: 'いいえ', action: () => closeModal() }
            ]
        });
        setIsModalOpen(true);
    };

    const handleDeletePurchase = async (index) => {
        try {
            const snapshot = await getDocs(collection(db, "breakfastPurchases"));
            const docId = snapshot.docs[index].id;
            await deleteDoc(doc(db, "breakfastPurchases", docId));
        } catch (error) {
            console.error('Purchase error:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileType = file.name.split('.').pop().toLowerCase();
        if (fileType === 'xlsx' || fileType === 'xls') {
            readExcelFile(file);
        } else if (fileType === 'csv') {
            readCSVFile(file);
        } else {
            alert('ファイル　.xlsx, .xls, .csv　をアップロードして下さい。');
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };

    const [isPurchaseSectionVisible, setIsPurchaseSectionVisible] = useState(false); // Changed initial state to false

    const togglePurchaseSectionVisibility = () => {
        setIsPurchaseSectionVisible(!isPurchaseSectionVisible);
    };

    return (
        <div className="checkin-container" style={{backgroundColor:'#F2EBE0'}}>
                <div>
                    <img src={`${process.env.PUBLIC_URL}/assets/home.png`} alt="Home" 
                        style={{ cursor: 'pointer', width: '40px', height: '35px' }} 
                        onClick={goToHome} 
                    />
                    <img src={`${process.env.PUBLIC_URL}/assets/restaurant.png`} alt="Guest" 
                        style={{ cursor: 'pointer', width: '40px', height: '35px' }} 
                        onClick={goToRestaurant} 
                    />     
                    <img src={`${process.env.PUBLIC_URL}/assets/guest.png`} alt="Guest" 
                        style={{ cursor: 'pointer', width: '40px', height: '35px' }} 
                        onClick={goToGuest} 
                    />
                    <img src={`${process.env.PUBLIC_URL}/assets/full.png`} alt="Guest" 
                        style={{ cursor: 'pointer', width: '40px', height: '35px' }} 
                        onClick={gotoFull} 
                    />
                    
                 </div>
            <h2 className="centered-title">
                はなもみ　　朝食チェックイン　　{getCurrentDate()}
            </h2>
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>{modalContent.title}</h3>
                        {typeof modalContent.message === 'string' ? (
                            <p dangerouslySetInnerHTML={{ __html: modalContent.message }}></p>
                        ) : (
                            Array.isArray(modalContent.message) && modalContent.message.map((guest, index) => {
                                const isCheckedIn = guest.status === 'arrived';
                                return (
                                    <div key={guest.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                                        <p>{guest.text}</p>
                                        {isCheckedIn ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span>チェックイン済</span>
                                                <button
                                                    style={{
                                                        backgroundColor: 'red',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '5px 10px',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleCancelCheckIn(guest.id)}
                                                >
                                                    CXL
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleCheckInGuest(guest.id, guest.ルーム, guest.人数)}>チェックイン</button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div className="modal-buttons">
                            {modalContent.buttons.map((button, index) => (
                                <button key={index} onClick={button.action} style={button.style}>
                                    {button.text}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <p style={{color:'#811121', fontSize:'20px', fontWeight:'bold'}}>本日人数 <span style={{color:'red', fontSize:'30px', fontWeight:'bold'}}>{totalGuests} </span> 名</p>
            <p>未到着人数 <span style={{fontWeight:'bold'}}>{totalGuests - checkedInGuests}</span> 名　　　　到着済人数 <span style={{fontWeight:'bold'}}>{checkedInGuests} </span>名</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                        style={{ width: '100%', height: '30px', marginBottom: '10px' }}
                        type="number"
                        inputMode="numeric"
                        placeholder="部屋番号入力"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                    />
                    <button
                        style={{ width: '100%', maxWidth: '150px' }}
                        onClick={handleRoomCheckIn}
                    >
                        部屋チェック
                    </button>
                </div>

                <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                        style={{ width: '100%', height: '30px', marginBottom: '10px' }}
                        type="text"
                        placeholder="名前入力"
                        value={isComposing ? nameInputValue : nameInput}
                        onChange={handleInputChange}
                        onCompositionStart={handleCompositionStart}
                        onCompositionUpdate={handleInputChange} // Có thể cần xử lý khác nếu cần hiển thị gợi ý
                        onCompositionEnd={handleCompositionEnd}
                    />
                    <button
                        style={{ width: '100%', maxWidth: '150px' }}
                        onClick={handleNameCheckIn}
                    >
                        名前チェック
                    </button>
                </div>

                <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <h3 style={{marginTop:'10px'}}>当日朝食購入　（フロント入力用）</h3>
                             <button
                                style={{
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: '8px',
                                    marginTop:0,
                                    cursor: 'pointer',
                                    border: 'none',
                                    padding: 0,
                                    backgroundColor: '#CEBFA6'
                                }}
                                onClick={togglePurchaseSectionVisibility}
                            >
                                {isPurchaseSectionVisible ? '−' : '+'}
                            </button>
                        </div>
                        {isPurchaseSectionVisible && (
                        <>
                            <div className="input-select-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="部屋番号"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    style={{ width: '80px', height: '30px' }}
                                />
                                <select
                                    value={mealNum}
                                    onChange={(e) => setMealNum(Number(e.target.value))}
                                    style={{ width: '60px', height: '30px' }}
                                >
                                    {[...Array(5).keys()].map(i => (
                                        <option key={i} value={i + 1}>{i + 1} 名</option>
                                    ))}
                                </select>
                            </div>
                            <button style={{ width: '100%', maxWidth: '150px' }} onClick={handleInput}>入力</button>
                            {inputList.length > 0 && (
                                <div style={{ marginTop: '10px', width: '100%' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: 'auto'}}>
                                        <thead>
                                            <tr>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>取消</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inputList.map((item, index) => (
                                                <tr key={index}>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>{item.roomName}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>{item.mealNum}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                                        <button
                                                            style={{
                                                                backgroundColor: 'red',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '5px 10px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.7em'
                                                            }}
                                                            onClick={() => handleDeletePurchase(index)}
                                                        >
                                                            X
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="guest-lists-container">
                <div className="guest-list">
                    <h3>未到着 ({totalGuests - checkedInGuests} 名)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1'}}>部屋番号</th>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>名前</th>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>チェックイン</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guestsData.filter(guest => guest.status !== 'arrived').map((guest, index) => (
                                <tr key={index}>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>{guest.ルーム}</td>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>{guest.名前}</td>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>{guest.人数}</td>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>
                                        <button
                                            style={{
                                                backgroundColor: 'green',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => handleIndividualCheckIn(guest)}
                                        >
                                            O
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="guest-list">
                    <h3>到着済 ({checkedInGuests} 名)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1'}}>部屋番号</th>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1'}}>名前</th>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1'}}>人数</th>
                                <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1'}}>取消</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guestsData.filter(guest => guest.status === 'arrived').map((guest, index) => (
                                <tr key={index}>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>{guest.ルーム}</td>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>{guest.名前}</td>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>{guest.人数}</td>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6'}}>
                                        <button
                                            style={{
                                                backgroundColor: 'red',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => handleCancelCheckIn(guest.id)}
                                        >
                                            X
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="input-and-purchase" style={{ marginTop: '20px' }}>
                <div className="input-section" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3>朝食リストアップロード</h3>
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                    />
                    <button onClick={handleRefresh} style={{ width: '150px', marginTop: '10px' }}>取消</button>
                </div>
            </div>
        </div>
    );



};

export default BreakfastCheckin;
