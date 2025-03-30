import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, collection, setDoc, doc, deleteDoc, onSnapshot, getDocs } from './firebaseConfig';
import './App.css';

const BreakfastCheckin = () => {
    const [roomNumber, setRoomNumber] = useState('');
    const [guestsData, setGuestsData] = useState([]);
    const [totalGuests, setTotalGuests] = useState(0);
    const [checkedInGuests, setCheckedInGuests] = useState(0);
    const [roomName, setRoomName] = useState('');
    const [mealNum, setMealNum] = useState(1);
    const [modalContent, setModalContent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [inputList, setInputList] = useState([]); // Sử dụng inputList để lưu trữ nhiều mục

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "breakfastGuests"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGuestsData(data);
            updateGuestStatistics(data);
        }, (error) => console.error('Error fetching data:', error));

        return () => unsubscribe();
    }, []);

    const handleInput = () => {
        setInputList(prevList => [...prevList, {
            roomName: roomName,
            mealNum: mealNum
        }]);
        setRoomName(''); // Reset roomName sau khi nhập
        setMealNum(1); // Reset mealNum sau khi nhập
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

    const excelSerialDateToJapaneseDate = (serial) => {
        const utcDays = Math.floor(serial - 25569);
        const utcValue = utcDays * 86400;
        const date = new Date(utcValue * 1000);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    };

    const readExcelFile = async (file) => {
        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const formattedData = jsonData.map(row => ({
                ルーム: row["ルーム"]?.toString().trim() || "",
                名前: row["名前"] || "",
                人数: row["人数"] ? parseInt(row["人数"]) : 0,
                チェックアウト: row["チェックアウト"] ? excelSerialDateToJapaneseDate(row["チェックアウト"]) : new Date().toISOString(),
                status: "not_arrived",
            })).filter(guest => guest.ルーム && guest.人数 > 0);

            setGuestsData(formattedData);
            await uploadDataToFirestore(formattedData);
        } catch (error) {
            console.error('Error reading Excel file:', error);
        }
    };

    const uploadDataToFirestore = async (data) => {
        try {
            const collectionRef = collection(db, "breakfastGuests");
            await deleteCollectionData(collectionRef);
            for (const guest of data) {
                await setDoc(doc(collectionRef, guest.ルーム), guest);
            }
        } catch (error) {
            console.error('Error uploading data:', error);
        }
    };

    const deleteCollectionData = async (collectionRef) => {
        try {
            const snapshot = await getDocs(collection(db, "breakfastGuests"));
            await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
        } catch (error) {
            console.error('Error deleting data:', error);
        }
    };

    const handleCheckIn = () => {
        const guest = guestsData.find(g => g.ルーム === roomNumber.trim());
        if (!guest) {
            setModalContent({
                title: '朝食未購入',
                message: 'フロントに申し付けください。',
                buttons: [
                    { text: '戻る', action: () => closeModal() }
                ]
            });
            setIsModalOpen(true);
            return;
        }
        if (guest.status === 'arrived') {
            setModalContent({
                title: '確認',
                message: '朝食チェックイン済のお客様です。',
                buttons: [
                    { text: '戻る', action: () => closeModal() }
                ]
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '確認',
            message: `部屋番号 ${guest.ルーム}　　　　　${guest.名前}　様　　　　　${guest.人数}名<br>朝食チェックインしますか？`,
            buttons: [
                {
                    text: 'チェックイン',
                    action: async () => {
                        try {
                            await setDoc(doc(db, "breakfastGuests", guest.ルーム), { status: 'arrived' }, { merge: true });
                            alert(`${guest.人数} 名様 （部屋 ${guest.ルーム}） チェックインしました。`);
                        } catch (error) {
                            console.error('Error updating check-in status:', error);
                        }
                        closeModal();
                        setRoomNumber('');
                    }
                },
                { text: '戻る', action: () => closeModal() }
            ]
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent(null);
    };

    const getCurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    };

    const handleRefresh = async () => {
        if (window.confirm("データを取消しますか？")) {
            try {
                await deleteCollectionData(collection(db, "breakfastGuests"));
                setGuestsData([]);
                setTotalGuests(0);
                setCheckedInGuests(0);
                alert("データが取消されました!");
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
        }
    };

    return (
        <div className="checkin-container">
            <h2 className="centered-title">
                はなもみ　　朝食チェックイン　　{getCurrentDate()}
            </h2>
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>{modalContent.title}</h3>
                        <p dangerouslySetInnerHTML={{ __html: modalContent.message }}></p>
                        <div className="modal-buttons">
                            {modalContent.buttons.map((button, index) => (
                                <button key={index} onClick={button.action}>
                                    {button.text}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <p>本日人数 {totalGuests} 名</p>
            <p>未到着人数 {totalGuests - checkedInGuests} 名</p>

            <input style={{ flex: '1', minWidth: '80px', height: '30px' }} type="text" placeholder="部屋番号入力" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            <button
                style={{ width: '150px', display: 'block', margin: '0 auto' }}
                onClick={handleCheckIn}>ルームチェック
            </button>

            <div className="guest-lists-container">
                <div className="guest-list">
                    <h3>到着済 ({checkedInGuests} 名)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>部屋番号</th>
                                <th style={{ textAlign: 'center' }}>名前</th>
                                <th style={{ textAlign: 'center' }}>人数</th>
                                <th style={{ textAlign: 'center' }}>チェックアウト</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guestsData.filter(guest => guest.status === 'arrived').map(guest => (
                                <tr key={guest.ルーム}>
                                    <td style={{ textAlign: 'center' }}>{guest.ルーム}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.名前}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.人数}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.チェックアウト}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="guest-list">
                    <h3>未到着 ({totalGuests - checkedInGuests} 名)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>部屋番号</th>
                                <th style={{ textAlign: 'center' }}>名前</th>
                                <th style={{ textAlign: 'center' }}>人数</th>
                                <th style={{ textAlign: 'center' }}>チェックアウト</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guestsData.filter(guest => guest.status !== 'arrived').map(guest => (
                                <tr key={guest.ルーム}>
                                    <td style={{ textAlign: 'center' }}>{guest.ルーム}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.名前}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.人数}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.チェックアウト}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="input-and-purchase">
                <div className="input-section" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3>朝食リストアップロード</h3>
                    <input type="file" accept=".xlsx, .xls" onChange={(e) => readExcelFile(e.target.files[0])} />
                    <button onClick={handleRefresh} style={{ width: '150px' }}>取消</button>
                </div>
                <div className="purchase-section" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3>当日朝食購入　（フロント入力用）</h3>
                    <div className="input-select-container">
                        <input
                            type="text"
                            placeholder="部屋番号"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            style={{ flex: '1', minWidth: '80px', height: '30px' }}
                        />
                        <select
                            value={mealNum}
                            onChange={(e) => setMealNum(Number(e.target.value))}
                            style={{ flex: '1', minWidth: '20px', height: '30px' }}
                        >
                            {[...Array(10).keys()].map(i => (
                                <option key={i} value={i + 1}>{i + 1} 名</option>
                            ))}
                        </select>
                    </div>
                    <button style={{ width: '150px' }} onClick={handleInput}>入力</button>

                    {inputList.map((item, index) => (
                        <div key={index}>
                            <p>部屋番号: {item.roomName} 人数: {item.mealNum} 名</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BreakfastCheckin;