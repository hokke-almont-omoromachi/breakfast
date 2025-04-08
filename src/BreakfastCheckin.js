import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db, collection, setDoc, doc, deleteDoc, onSnapshot, getDocs, query, orderBy } from './firebaseConfig';
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
    const [inputList, setInputList] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const unsubscribeGuests = onSnapshot(
            query(collection(db, "breakfastGuests"), orderBy("roomNumber")),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGuestsData(data);
                updateGuestStatistics(data);
            },
            (error) => console.error('Lỗi khi lấy dữ liệu khách:', error)
        );

        const unsubscribePurchases = onSnapshot(collection(db, "breakfastPurchases"), (snapshot) => {
            const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInputList(purchases);
        }, (error) => console.error('Lỗi khi lấy dữ liệu mua:', error));

        return () => {
            unsubscribeGuests();
            unsubscribePurchases();
        };
    }, []);

    const handleInput = async () => {
        try {
            await setDoc(doc(collection(db, "breakfastPurchases")), {
                roomName: roomName,
                mealNum: mealNum
            });
            setRoomName('');
            setMealNum(1);
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu mua:', error);
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
                        const uniqueId = `${sanitizedRoomNumber}-${sanitizedGuestName}-${numberOfGuests}`;
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
            console.error('Lỗi khi đọc file Excel:', error);
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
                    console.warn(`Bỏ qua dòng ${i + 1} do số lượng giá trị không nhất quán.`);
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
            console.error('Lỗi khi đọc file CSV:', error);
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
            console.error('Lỗi khi tải dữ liệu lên:', error);
        }
    };

    const deleteCollectionData = async (collectionRef) => {
        try {
            const snapshot = await getDocs(collectionRef);
            await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu:', error);
        }
    };

    const handleCheckIn = () => {
        const matchingGuests = guestsData.filter(g => g.ルーム === roomNumber.trim());

        if (matchingGuests.length === 0) {
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

        const allCheckedIn = matchingGuests.every(guest => guest.status === 'arrived');
        const hasMultipleRooms = matchingGuests.length > 1;

        setModalContent({
            title: '確認',
            message: matchingGuests.map(guest => ({
                text: `ルーム ${guest.ルーム}　　${guest.名前}　様　　${guest.人数}名`,
                id: guest.id,
                status: guest.status
            })),
            buttons: [
                {
                    text: '一括チェックイン',
                    action: () => handleCheckInAll(matchingGuests),
                    style: (hasMultipleRooms && !allCheckedIn) ? {} : { display: 'none' } // Show if multiple rooms and not all checked in
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
                alert(`部屋 ${guest.ルーム}　　${guest.名前} 様　　${guest.人数}名 チェックインしました。`);
            } else {
                console.warn(`Khách có ID ${guestId} không tìm thấy.`);
                alert(`部屋 ${room}　　${count}名 チェックインしました。`);
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái check-in:', error);
        }
        closeModal();
        setRoomNumber('');
    };

    const handleCheckInAll = async (guests) => {
        try {
            for (const guest of guests) {
                if (guest.status !== 'arrived') { // Chỉ check-in những khách chưa check-in
                    await setDoc(doc(db, "breakfastGuests", guest.id), { status: 'arrived' }, { merge: true });
                }
            }
            if (guests && guests.length > 0) {
                alert(`${guests[0].ルーム}号室のお客様は、皆様チェックインされました。`);
            }
            else {
                alert(`Tất cả khách đã được check-in.`);
            }

        } catch (error) {
            console.error('Failed to check in all guests: ', error);
        }
        closeModal();
        setRoomNumber('');
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
                if (fileInputRef.current) {
                    fileInputRef.current.value = null;
                }
            } catch (error) {
                console.error('Lỗi khi làm mới dữ liệu:', error);
            }
        }
    };
    const handleDeletePurchase = async (index) => {
        try {
            const snapshot = await getDocs(collection(db, "breakfastPurchases"));
            const docId = snapshot.docs[index].id;
            await deleteDoc(doc(db, "breakfastPurchases", docId));
        } catch (error) {
            console.error('Lỗi khi xóa giao dịch mua:', error);
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
            alert('File không hợp lệ. Vui lòng chọn file .xlsx, .xls, hoặc .csv.');
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
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
                        {Array.isArray(modalContent.message) ? (
                            modalContent.message.map((guest, index) => {
                                return (
                                    <div key={guest.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                                        <p>{guest.text}</p>
                                        {guest.status === 'arrived' ? (
                                            <span>チェックイン済のお客様です</span>
                                        ) : (
                                            <button onClick={() => handleCheckInGuest(guest.id, guest.ルーム, guest.人数)}>チェックイン</button>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p dangerouslySetInnerHTML={{ __html: modalContent.message }}></p>
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

            <p>本日人数 {totalGuests} 名</p>
            <p>未到着人数 {totalGuests - checkedInGuests} 名</p>

            <input style={{ flex: '1', minWidth: '80px', height: '30px' }} type="text" placeholder="部屋番号入力" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            <button
                style={{ width: '150px', display: 'block', margin: '0 auto' }}
                onClick={handleCheckIn}>ルームチェック
            </button>

            <input style={{ flex: '1', minWidth: '80px', height: '30px' }} type="text" placeholder="名前入力" />
            <button
                style={{ width: '150px', display: 'block', margin: '0 auto' }}>名前チェック
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
                            </tr>
                        </thead>
                        <tbody>
                            {guestsData.filter(guest => guest.status === 'arrived').map(guest => (
                                <tr key={guest.id}>
                                    <td style={{ textAlign: 'center' }}>{guest.ルーム}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.名前}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.人数}</td>
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
                            </tr>
                        </thead>
                        <tbody>
                            {guestsData.filter(guest => guest.status !== 'arrived').map(guest => (
                                <tr key={guest.id}>
                                    <td style={{ textAlign: 'center' }}>{guest.ルーム}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.名前}</td>
                                    <td style={{ textAlign: 'center' }}>{guest.人数}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="input-and-purchase">
                <div className="input-section" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                    <h3>朝食リストアップロード</h3>
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                    />
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
                            {[...Array(5).keys()].map(i => (
                                <option key={i} value={i + 1}>{i + 1} 名</option>
                            ))}
                        </select>
                    </div>
                    <button style={{ width: '150px' }} onClick={handleInput}>入力</button>

                    {inputList.map((item, index) => (
                        <div key={index}>
                            <p style={{ display: 'flex', alignItems: 'center' }}>
                                部屋番号: {item.roomName} 　　　人数: {item.mealNum} 名
                                <button
                                    style={{
                                        height: '30px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: '0 10px',
                                    }}
                                    onClick={() => handleDeletePurchase(index)}
                                >
                                    削除
                                </button>
                            </p>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BreakfastCheckin;

