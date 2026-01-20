import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import {collection, setDoc, doc, deleteDoc, onSnapshot, getDocs, query, orderBy, addDoc, where } from 'firebase/firestore';
import '../App';

const BreakfastCheckin = () => {
    const [roomNumber, setRoomNumber] = useState('');
    const [guestsData, setGuestsData] = useState([]);
    const [totalGuests, setTotalGuests] = useState(0);
    const [checkedInGuests, setCheckedInGuests] = useState(0);
    const [roomName, setRoomName] = useState('');
    const [mealNum, setMealNum] = useState(1);
    const [inputError, setInputError] = useState('');
    const [modalContent, setModalContent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [inputList, setInputList] = useState([]);
    const fileInputRef = useRef(null);
    const [nameInput, setNameInput] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [nameInputValue, setNameInputValue] = useState('');
    const [waitingGuests, setWaitingGuests] = useState([]);
    const [notArrivedGuests, setNotArrivedGuests] = useState(0);
    const [waitingGuestsCount, setWaitingGuestsCount] = useState(0);
    const [purchaseWaitingCount, setPurchaseWaitingCount] = useState(0);
    const [partialCheckinData, setPartialCheckinData] = useState(null);
    const [showPartialModal, setShowPartialModal] = useState(false);
    const [partialArrivedCount, setPartialArrivedCount] = useState(1);
    const [showWaitingTable, setShowWaitingTable] = useState(false);
    const [showArriveTable, setShowArriveTable] = useState(false);
    const [showNotArriveTable, setShowNotArriveTable] = useState(false);
    const [showBreakfastTable, setShowBreakfastTable] = useState(true);
    const [totalPurchasedGuests, setTotalPurchasedGuests] = useState(0);
    const [data, setData] = useState([]);
    const [personalRoomInput, setPersonalRoomInput] = useState('');
    const [selectedNotArrivedGuests, setSelectedNotArrivedGuests] = useState([]);
    const [selectedWaitingGuests, setSelectedWaitingGuests] = useState([]);
    const [processingButtons, setProcessingButtons] = useState({});
    const [showUpload, setShowUpload] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const navigate = useNavigate();
    const goToHome = () => { navigate('/home'); };
    const goToRestaurant = () => navigate('/restaurant');
    const goToGuest = () => { navigate('/guest'); };
    const gotoFull = () => { navigate('/fullSeat'); };
    const goToSetting = () => {navigate('/setting')};

    const previousModalContentRef = useRef(null);

    const VALID_ROOMS = [
        9999,
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

    useEffect(() => {
        // Lắng nghe thay đổi của khách từ collection "breakfastGuests"
        const unsubscribeGuests = onSnapshot(
            query(collection(db, "breakfastGuests"), orderBy("roomNumber")),
            (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'guest' })); // Thêm source
            setGuestsData(data);
            updateGuestStatistics(data);
            setData(data);
            },
            (error) => console.error('Data fetch error', error)
        );

        // Lắng nghe thay đổi của khách từ collection "breakfastPurchases"
        const unsubscribePurchases = onSnapshot(
            query(collection(db, 'breakfastPurchases'), orderBy("purchaseTime")),
            (snapshot) => {
                const purchases = snapshot.docs.map((doc, idx) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        status: data.status || 'purchase_only',
                        waitingTime: data.waitingTime || null,
                        fixedIndex: data.fixedIndex || null,
                        source: 'purchase', // Thêm source
                        purchaseTime: data.purchaseTime || null,
                        isGuided: data.isGuided || false,
                        guidedTime: data.guidedTime || null,
                    };
                });
                setInputList(purchases);
                calculateTotalPurchasedGuests(purchases);
            },
            (error) => console.error('Purchase data fetch error:', error)
        );

        return () => {
            unsubscribeGuests();
            unsubscribePurchases();
        };
        }, []);

    useEffect(() => {
            // Lọc tất cả khách có status 'waiting' hoặc đã từng 'waiting' và có isGuided = true
            // Gộp cả khách từ guestsData và inputList (purchases)
            const allWaiting = [
                ...data.filter(g => g.status === 'waiting' || g.isGuided === true).map(g => ({ ...g, source: 'guest' })),
                ...inputList.filter(p => p.status === 'waiting' || p.isGuided === true).map(p => ({ ...p, source: 'purchase' }))
            ];

            // Đếm số lượng khách đang chờ thực sự (status === 'waiting') từ danh sách mua hàng
            const currentPurchaseWaitingCount = inputList
                .filter(p => p.status === 'waiting')
                .reduce((sum, p) => sum + (p.mealNum || 0), 0);
            setPurchaseWaitingCount(currentPurchaseWaitingCount);

            // Sắp xếp danh sách chờ theo fixedIndex
            const sortedWaiting = allWaiting.sort((a, b) => {
                // Ưu tiên các mục có isGuided = true hiển thị trước nếu fixedIndex giống nhau
                if (a.fixedIndex === b.fixedIndex) {
                    if (a.isGuided && !b.isGuided) return -1;
                    if (!a.isGuided && b.isGuided) return 1;
                }
                return (a.fixedIndex || 0) - (b.fixedIndex || 0);
            });
            setWaitingGuests(sortedWaiting);

            // Đếm số lượng khách đang chờ thực sự (status === 'waiting') từ cả hai nguồn
            let totalCurrentWaitingCount = 0;
            sortedWaiting.forEach(guest => {
                if (guest.status === 'waiting') {
                    totalCurrentWaitingCount += (guest.source === 'guest' ? guest.人数 : guest.mealNum) || 0;
                }
            });
            setWaitingGuestsCount(totalCurrentWaitingCount);
        }, [data, inputList]);

    useEffect(() => {
        calculateTotalPurchasedGuests(inputList);
    }, [inputList]);

    useEffect(() => {
        if (personalRoomInput && data.length > 0) {
            const roomData = data.find(d => String(d.ルーム).trim() === personalRoomInput.trim());
            if (roomData) {
                setPartialCheckinData(roomData);
                setPartialArrivedCount(1);
                setShowPartialModal(true);
            } else {
                setModalContent({
                    title: 'エラー',
                    message: 'その部屋番号は見つかりませんでした。',
                    buttons: [{ text: '戻る', action: () => closeModal() }],
                });
                setIsModalOpen(true);
            }
            setPersonalRoomInput('');
        }
    }, [data, personalRoomInput]);

    const calculateTotalPurchasedGuests = (purchases) => {
        const total = purchases.reduce(
            (sum, purchase) => sum + (purchase.mealNum || 0),
            0
        );
        setTotalPurchasedGuests(total);
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
                            waitingTime: null,
                            arrivedTime: null,
                            isGuided: false,
                            guidedTime: null
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

    const getNextWaitingIndex = async () => {
        const guestsSnapshot = await getDocs(query(collection(db, "breakfastGuests")));
        const purchaseSnapshot = await getDocs(collection(db, "breakfastPurchases"));
        const allCurrentWaiting = [
            ...guestsSnapshot.docs.map(doc => doc.data()).filter(g => g.status === 'waiting' || g.isGuided === true),
            ...purchaseSnapshot.docs.map(doc => doc.data()).filter(p => p.status === 'waiting' || p.isGuided === true)
        ];

        const maxIndex = allCurrentWaiting.reduce((max, item) => {
            return Math.max(max, item.fixedIndex || 0);
        }, 0);
        return maxIndex + 1;
    };

    const handleMovePurchaseToWaiting = async (purchaseId) => {
        try {
            const purchaseItem = inputList.find(item => item.id === purchaseId);

            if (purchaseItem && purchaseItem.status === 'waiting') {
                setModalContent({
                    title: '確認',
                    message: 'ウェイティングのお客様です。',
                    buttons: [{ text: '戻る', action: () => closeModal() }],
                });
                setIsModalOpen(true);
                return;
            }

            const nextIndex = await getNextWaitingIndex();
            await setDoc(doc(db, "breakfastPurchases", purchaseId), {
                status: 'waiting',
                waitingTime: Date.now(),
                fixedIndex: nextIndex,
                isGuided: false,
                guidedTime: null
            }, { merge: true });

        } catch (error) {
            console.error('Error moving purchase to waiting:', error);
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
                    waitingTime: null,
                    arrivedTime: null,
                    isGuided: false,
                    guidedTime: null
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
            await deleteCollectionData(collectionRef); // Clear existing data
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

    const handleCompositionStart = () => {
        setIsComposing(true);
    };

    const handleCompositionEnd = (e) => {
        setIsComposing(false);

        const value = e.target.value;
        if (/^[A-Za-z\s]+$/.test(value)) {
            const uppercased = value.replace(/[a-zA-Z]/g, (char) => char.toUpperCase());
            setNameInput(uppercased);
        } else {setNameInput(value);
        } setNameInputValue('');
    };

    const updateRemarks = async (guest, newValue) => {
        try {
            if (guest.source === "guest") {
            await setDoc(
                doc(db, "breakfastGuests", guest.id),
                { remarks: newValue },
                { merge: true }
            );
            } else if (guest.source === "purchase") {
            await setDoc(
                doc(db, "breakfastPurchases", guest.id),
                { remarks: newValue },
                { merge: true }
            );
            }
        } catch (error) {
            console.error("備考 update error:", error);
        }
        };

    const handleInputChange = (e) => {
        if (!isComposing) {
            const value = e.target.value;
            setNameInput(value);
        } else {setNameInputValue(e.target.value); }
    };

     const handleInput = async () => {
        const rawRoomName = roomName.trim();
        const parsedRoomName = parseInt(rawRoomName);

        if (!rawRoomName) {
            setInputError('部屋番号を入力して下さい！ 外来の場合：9999を入力して下さい。');
            return;
        }

        if (isNaN(parsedRoomName) || !VALID_ROOMS.includes(parsedRoomName)) {
            setInputError('有効な部屋番号を入力して下さい。（例：301-1310）外来の場合：9999を入力して下さい。');
            return;
        }

        setInputError('');

        try {
            const newItem = {
                roomName: String(parsedRoomName),
                mealNum: mealNum,
                status: 'purchase_only',
                waitingTime: null,
                fixedIndex: null,
                purchaseTime: Date.now(),
                isGuided: false,
                guidedTime: null
            };
            await addDoc(collection(db, 'breakfastPurchases'), newItem);
            setRoomName('');
            setMealNum(1);
        } catch (error) {
            console.error('Add Data error:', error);
        }
    };

    const updateGuestStatistics = (data) => {
        let total = 0;
        let notArrived = 0;
        let arrived = 0;
        data.forEach(guest => {
            total += guest.人数 || 0;
            if (guest.status === 'arrived') {
                arrived += guest.人数 || 0;
            } else if (guest.status === 'not_arrived') {
                notArrived += guest.人数 || 0;
            }
        });
        setTotalGuests(total);
        setCheckedInGuests(arrived);
        setNotArrivedGuests(notArrived);
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

    const withButtonProcessing = async (buttonKey, asyncFn) => {
        if (processingButtons[buttonKey]) return;

        setProcessingButtons(prev => ({ ...prev, [buttonKey]: true }));
        try {
            await asyncFn();
        } finally {
            setProcessingButtons(prev => ({ ...prev, [buttonKey]: false }));
        }
        };

    const handleRoomCheckIn = () => {
        if (!roomNumber.trim()) {
            setModalContent({
                title: '朝食未購入',
                message: '部屋番号を入力して下さい。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        const matchingGuests = guestsData.filter(g => g.ルーム === roomNumber.trim());

        if (matchingGuests.length === 0) {
            setModalContent({
                title: '朝食未購入',
                message: '該当する部屋番号の朝食購入データが見つかりません。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        const hasWaiting = matchingGuests.some(g => g.status === 'waiting');
        if (hasWaiting) {
            setModalContent({
                title: 'ウェイティングのお客様です。',
                message: 'ウェイティング表からチェックインして下さい。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

            const content = {
            title: '確認',
            message: matchingGuests.map(guest => ({
                text: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
                id: guest.id,
                status: guest.status,
                renderButton: () => (
                    <div className="button-group">
                        <button
                            className='checkin-button'
                            onClick={() => {
                                previousModalContentRef.current = content;
                                handleIndividualCheckIn(guest, true);
                            }}
                        >
                            O
                        </button>
                        <button
                            className='waiting-button'
                            onClick={() => {
                                previousModalContentRef.current = content;
                                confirmMoveToWaiting(guest, true);
                            }}
                        >
                            W
                        </button>
                        <button
                            className='invi-button'
                            onClick={() => {
                                previousModalContentRef.current = content;
                                handlePartialCheckInClick(guest, true); // nút B
                            }}
                        >
                            B
                        </button>
                    </div>
                ),
            })),
            buttons: [
                {
                    text: '一括チェックイン',
                    action: () => {
                        handleCheckInAll(matchingGuests);
                        closeModal();
                    },
                    style: matchingGuests.some(g => g.status !== 'arrived') ? {} : { display: 'none' },
                },
                { text: '戻る', action: () => closeModal() },
            ],
        };

        previousModalContentRef.current = content;
        setModalContent(content);
        setIsModalOpen(true);
        };

    const handleNameCheckIn = () => {
            if (!nameInput.trim()) {
                setModalContent({
                    title: '入力エラー',
                    message: '名前を入力して下さい。',
                    buttons: [{ text: '戻る', action: () => closeModal() }],
                });
                setIsModalOpen(true);
                return;
            }

            const searchName = nameInput.trim().toLowerCase();

            const matchingGuests = guestsData.filter(g =>
                g.名前 && String(g.名前).toLowerCase().includes(searchName) &&
                g.status !== 'cancelled'
            );

            if (matchingGuests.length === 0) {
                setModalContent({
                    title: '未登録',
                    message: '該当する名前の朝食購入データが見つかりません。',
                    buttons: [{ text: '戻る', action: () => closeModal() }],
                });
                setIsModalOpen(true);
                return;
            }

            const firstModalContent = {
                title: '確認',
                message: matchingGuests.map(guest => ({
                    text: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
                    id: guest.id,
                    status: guest.status,
                    renderButton: () => {
                        if (guest.status === 'waiting') {
                            return <span style={{ fontWeight: 'bold', color: '#b00' }}>ウェイティング表で確認下さい</span>;
                        }

                        return (
                            <div className="button-group">
                                <button
                                    className='checkin-button'
                                    onClick={() => {
                                        previousModalContentRef.current = firstModalContent;
                                        handleIndividualCheckIn(guest, true);
                                    }}
                                >
                                    O
                                </button>
                                <button
                                    className='waiting-button'
                                    onClick={() => {
                                        previousModalContentRef.current = firstModalContent;
                                        confirmMoveToWaiting(guest, true);
                                    }}
                                >
                                    W
                                </button>
                                <button
                                    className='invi-button'
                                    onClick={() => {
                                        previousModalContentRef.current = firstModalContent;
                                        handlePartialCheckInClick(guest, true);
                                    }}
                                >
                                    B
                                </button>
                            </div>
                        );
                    }
                })),
                buttons: [
                    {
                        text: '一括チェックイン',
                        action: () => {
                            const hasWaitingGuest = matchingGuests.some(g => g.status === 'waiting');

                            if (hasWaitingGuest) {
                                previousModalContentRef.current = firstModalContent;

                                setModalContent({
                                    title: 'ウェイティングのお客様がいらっしゃいます。',
                                    message: 'ウェイティング表からチェックインして下さい。',
                                    buttons: [{
                                        text: '戻る',
                                        action: () => {
                                            if (previousModalContentRef.current) {
                                                setModalContent(previousModalContentRef.current);
                                                setIsModalOpen(true);
                                            } else {
                                                closeModal();
                                            }
                                        }
                                    }]
                                });
                                setIsModalOpen(true);
                            } else {
                                handleCheckInAll(matchingGuests);
                                closeModal();
                            }
                        },
                        style: matchingGuests.some(g => g.status !== 'arrived') ? {} : { display: 'none' },
                    },
                    {
                        text: '戻る',
                        action: () => closeModal()
                    }
                ]
            };

            setModalContent(firstModalContent);
            setIsModalOpen(true);
        };

    const [editFixedIndexModal, setEditFixedIndexModal] = useState({
            open: false,
            guest: null,
            newIndex: '',
            });

    const handleCheckInGuest = async (guestId, room, count) => {
        try {
            const guest = guestsData.find((g) => g.id === guestId);
            if (guest) {
                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null, isGuided: false, guidedTime: null }, { merge: true });
            } else {
                console.warn(`ID ${guestId} is not found`);
            }
        } catch (error) {
            console.error('Check-In status error:', error);
            setModalContent({
                title: 'エラー',
                message: 'チェックインステータスエラー',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
        }
        setRoomNumber('');
    };

    const handleCheckInAll = async (guests) => {
        try {
            for (const guest of guests) {
                if (guest.status !== 'arrived') {
                    await setDoc(doc(db, "breakfastGuests", guest.id), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null, isGuided: false, guidedTime: null }, { merge: true });
                }
            }
            if (guests && guests.length > 0) {
            }
        } catch (error) {
            console.error('Failed to check in all guests: ', error);
            setModalContent({
                title: 'エラー',
                message: '全員チェックインエラー',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
        }
        setRoomNumber('');
    };

    const handleBatchCheckInNotArrived = async () => {
        if (selectedNotArrivedGuests.length === 0) {
            setModalContent({
                title: '確認',
                message: 'チェックインするゲストを選択してください。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '一括チェックイン確認',
            message: `選択された ${selectedNotArrivedGuests.length} 件のゲストをチェックインしますか？`,
            buttons: [
                {
                    text: 'はい',
                    action: async () => {
                        try {
                            for (const guestId of selectedNotArrivedGuests) {
                                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null, isGuided: false, guidedTime: null }, { merge: true });
                            }
                            setSelectedNotArrivedGuests([]);
                            closeModal();
                        } catch (error) {
                            console.error('Error during batch check-in:', error);
                            setModalContent({
                                title: 'エラー',
                                message: '一括チェックイン中にエラーが発生しました。',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                        }
                    },
                },
                { text: 'いいえ', action: () => closeModal() },
            ],
        });
        setIsModalOpen(true);
    };

    const handleCancelCheckIn = async (guestId) => {
        const guestToCancel = guestsData.find(guest => guest.id === guestId);
        if (guestToCancel) {

            previousModalContentRef.current = modalContent;

            setModalContent({
                title: '確認',
                message: `部屋 ${guestToCancel.ルーム} ${guestToCancel.名前}様のチェックインを取り消しますか？`,
                buttons: [
                    {
                        text: 'はい',
                        action: async () => {
                            try {
                                await setDoc(doc(db, "breakfastGuests", guestId), {
                                    status: 'not_arrived',
                                    arrivedTime: null,
                                    waitingTime: null,
                                    fixedIndex: null,
                                    isGuided: false,
                                    guidedTime: null
                                }, { merge: true });
                                closeModal();
                            } catch (error) {
                                console.error('Error cancelling check-in:', error);
                                setModalContent({
                                    title: 'エラー',
                                    message: 'チェックインの取り消しに失敗しました。',
                                    buttons: [{ text: '戻る', action: () => closeModal() }],
                                });
                                setIsModalOpen(true);
                            }
                        },
                    },
                    {
                        text: 'いいえ',
                        action: () => {
                            if (previousModalContentRef.current) {
                                setModalContent(previousModalContentRef.current);
                                setIsModalOpen(true);
                            } else {
                                closeModal();
                            }
                        }
                    },
                ],
            });
            setIsModalOpen(true);
        }
    };

    const handleIndividualCheckIn = (guest, fromRoom = false) => {
        setModalContent({
            title: '確認',
            message: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
            buttons: [
                {
                    text: 'チェックイン',
                    action: () => {
                        handleCheckInGuest(guest.id, guest.ルーム, guest.人数);
                        closeModal();
                    },
                },
                {
                    text: '戻る',
                    action: () => {
                        const prev = previousModalContentRef.current;
                        if (fromRoom && prev) {
                            setModalContent(prev);
                            setIsModalOpen(true);
                        } else {
                            closeModal();
                        }
                    }
                },
            ],
        });
        setIsModalOpen(true);
    };

    const handleMoveToWaiting = async (guestId) => {
        try {
            const nextIndex = await getNextWaitingIndex();
            await setDoc(doc(db, "breakfastGuests", guestId), {
                status: 'waiting',
                waitingTime: Date.now(),
                fixedIndex: nextIndex,
                arrivedTime: null,
                isGuided: false,
                guidedTime: null
            }, { merge: true });
        } catch (error) {
            console.error('Error moving to waiting:', error);
        }
    };

    const confirmMoveToWaiting = (guest, fromRoom = false) => {
        if (guest.status === 'waiting') {
            setModalContent({
                title: '確認',
                message: 'ウェイティングのお客様です。',
                buttons: [{
                    text: '戻る',
                    action: () => {
                        const prev = previousModalContentRef.current;
                        if (fromRoom && prev) {
                            setModalContent(prev);
                            setIsModalOpen(true);
                        } else {
                            closeModal();
                        }
                    }
                }],
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '確認',
            message: `部屋 ${guest.ルーム}　${guest.名前}様をウェイティングに移動しますか？`,
            buttons: [
                {
                text: 'はい',
                action: () =>
                    withButtonProcessing('modal-yes', async () => {
                    await handleMoveToWaiting(guest.id);
                    closeModal();
                    }),
                disableWhenProcessing: 'modal-yes',
                },
                {
                text: '戻る',
                action: () => {
                    const prev = previousModalContentRef.current;
                    if (fromRoom && prev) {
                    setModalContent(prev);
                    setIsModalOpen(true);
                    } else {
                    closeModal();
                    }
                },
                }
            ]
            });
        setIsModalOpen(true);
    };

    const handleMoveToArrivedFromWaiting = async (guest) => {
        setModalContent({
            title: '確認',
            message: `部屋 ${guest.source === 'guest' ? guest.ルーム : guest.roomName} は 到着済に変更しますか？`,
            buttons: [
                {
                    text: 'はい',
                    action: async () => {
                        try {
                            if (guest.source === 'guest') {
                                await setDoc(doc(db, "breakfastGuests", guest.id), {
                                    status: 'arrived',
                                    arrivedTime: Date.now(),
                                    waitingTime: guest.waitingTime,
                                    fixedIndex: guest.fixedIndex,
                                    isGuided: true,
                                    guidedTime: Date.now()
                                }, { merge: true });
                            } else if (guest.source === 'purchase') {
                                await setDoc(doc(db, "breakfastPurchases", guest.id), {
                                    status: 'arrived',
                                    waitingTime: guest.waitingTime,
                                    fixedIndex: guest.fixedIndex,
                                    isGuided: true,
                                    guidedTime: Date.now()
                                }, { merge: true });
                            }
                            closeModal();
                        } catch (error) {
                            console.error('Error moving to arrived:', error);
                            setModalContent({
                                title: 'エラー',
                                message: '変更中にエラーが発生しました。',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                        }
                    },
                },
                { text: 'いいえ', action: () => closeModal() },
            ],
        });
        setIsModalOpen(true);
    };

    const handleClearWaitingGuests = async () => {
        setModalContent({
            title: 'ウェイティング取消',
            message: 'ウェイティングリストのデータをすべて削除しますか？',
            buttons: [
                {
                    text: 'はい',
                    action: async () => {
                        try {
                            const guestsCollectionRef = collection(db, "breakfastGuests");
                            const purchasesCollectionRef = collection(db, "breakfastPurchases");

                            const guestsSnapshot = await getDocs(query(guestsCollectionRef, where('status', '==', 'waiting')));
                            const guidedGuestsSnapshot = await getDocs(query(guestsCollectionRef, where('isGuided', '==', true)));

                            const deleteGuestPromises = [
                                ...guestsSnapshot.docs.map(docSnapshot => deleteDoc(doc(guestsCollectionRef, docSnapshot.id))),
                                ...guidedGuestsSnapshot.docs.map(docSnapshot => deleteDoc(doc(guestsCollectionRef, docSnapshot.id)))
                            ];
                            await Promise.all(deleteGuestPromises);

                            const purchaseSnapshot = await getDocs(query(purchasesCollectionRef, where('status', '==', 'waiting')));
                            const guidedPurchaseSnapshot = await getDocs(query(purchasesCollectionRef, where('isGuided', '==', true)));

                            const deletePurchasePromises = [
                                ...purchaseSnapshot.docs.map(docSnapshot => deleteDoc(doc(purchasesCollectionRef, docSnapshot.id))),
                                ...guidedPurchaseSnapshot.docs.map(docSnapshot => deleteDoc(doc(purchasesCollectionRef, docSnapshot.id)))
                            ];
                            await Promise.all(deletePurchasePromises);
                             closeModal();
                        } catch (error) {
                            console.error('Error clearing waiting guests:', error);
                            setModalContent({
                                title: 'エラー',
                                message: 'ウェイティングリストのデータ削除中にエラーが発生しました。',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                        }
                    },
                },
                { text: 'いいえ', action: () => closeModal() },
            ],
        });
        setIsModalOpen(true);
    };

    const handleBatchCheckInWaiting = async () => {
        if (selectedWaitingGuests.length === 0) {
            setModalContent({
                title: '確認',
                message: 'チェックインするウェイティングゲストを選択してください。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '一括チェックイン確認',
            message: `選択された ${selectedWaitingGuests.length} 件のウェイティングゲストをチェックインしますか？`,
            buttons: [
                {
                    text: 'はい',
                    action: async () => {
                        try {
                            for (const guest of selectedWaitingGuests) {
                                if (guest.source === 'guest') {
                                    await setDoc(doc(db, "breakfastGuests", guest.id), {
                                        status: 'arrived',
                                        arrivedTime: Date.now(),
                                        waitingTime: guest.waitingTime,
                                        fixedIndex: guest.fixedIndex,
                                        isGuided: true,
                                        guidedTime: Date.now()
                                    }, { merge: true });
                                } else if (guest.source === 'purchase') {
                                    await setDoc(doc(db, "breakfastPurchases", guest.id), {
                                        status: 'arrived',
                                        waitingTime: guest.waitingTime,
                                        fixedIndex: guest.fixedIndex,
                                        isGuided: true,
                                        guidedTime: Date.now()
                                    }, { merge: true });
                                }
                            }
                            setSelectedWaitingGuests([]);
                            closeModal();
                        } catch (error) {
                            console.error('Error during batch check-in for waiting guests:', error);
                            setModalContent({
                                title: 'エラー',
                                message: 'ウェイティングゲストの一括チェックイン中にエラーが発生しました。',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                        }
                    },
                },
                { text: 'いいえ', action: () => closeModal() },
            ],
        });
        setIsModalOpen(true);
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
                            await handleClearAllPurchases();
                            await handleClearWaitingGuests();

                            setModalContent({
                                title: 'データ取消',
                                message: 'データが取消されました!',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = null;
                            }
                        } catch (error) {
                            console.error('Refresh data error', error);
                            setModalContent({
                                title: 'エラー',
                                message: 'データ更新エラー',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                        }
                    },
                },
                { text: 'いいえ', action: () => closeModal() },
            ],
        });
        setIsModalOpen(true);
    };

    const handleDeletePurchase = async (purchaseId) => {
        try {
            await deleteDoc(doc(db, "breakfastPurchases", purchaseId));
        } catch (error) {
            console.error('Purchase error:', error);
        }
    };

    const handleClearAllPurchases = async () => {
        try {
            const collectionRef = collection(db, "breakfastPurchases");
            const snapshot = await getDocs(collectionRef);
            console.log("Documents to delete:", snapshot.docs.map(doc => doc.id));

            const deletePromises = snapshot.docs.map(docSnapshot => {
                const docRef = doc(collectionRef, docSnapshot.id);
                console.log("Deleting document:", docRef.path);
                return deleteDoc(docRef);
            });

            await Promise.all(deletePromises);

            console.log("All purchases deleted from Firebase.");
            setInputList([]);
        } catch (error) {
            console.error('Error clearing all purchases:', error);
            console.error("Error details:", error);
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
            setModalContent({
                title: 'ファイルエラー',
                message: 'ファイル .xlsx, .xls, .csv をアップロードして下さい。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };

    const handlePartialCheckInClick = (guest, fromRoom = false) => {
        if (fromRoom && previousModalContentRef.current) {
            setIsModalOpen(false); // Ẩn modal hiện tại nếu đến từ "Room Check" hoặc "Name Check"
        }
        setPartialCheckinData(guest);
        // Đặt số lượng khách đến mặc định là 1 hoặc số lượng khách tối đa nếu khách chỉ có 1 người
        setPartialArrivedCount(guest.人数 === 1 ? 1 : 1);
        setShowPartialModal(true);

    };

    // Hàm mới cho nút WB trong bảng Waiting
    const handleWaitingPartialCheckInClick = (guest) => {
        // Kiểm tra nếu khách đã được hướng dẫn (isGuided) thì không cho phép partial check-in
        if (guest.isGuided) {
            setModalContent({
                title: '確認',
                message: 'このお客様はすでに案内済みです。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        setShowPartialModal(false); // Đảm bảo modal cũ đóng trước khi mở modal mới
        setPartialCheckinData(guest);
        // Đặt số lượng khách đến mặc định là 1 hoặc số lượng khách tối đa nếu khách chỉ có 1 người
        const guestCount = guest.source === 'guest' ? guest.人数 : guest.mealNum;
        setPartialArrivedCount(guestCount === 1 ? 1 : 1);
        setShowPartialModal(true);
    };

     const handleCheckInGuestPartial = async (guest, arrivedCount) => {
        try {
            if (!guest) {
                console.warn("Guest data is null or undefined for partial check-in.");
                return;
            }

            const isFromGuestsCollection = guest.source === 'guest';
            const collectionName = isFromGuestsCollection ? "breakfastGuests" : "breakfastPurchases";
            const originalGuestRef = doc(db, collectionName, guest.id);

            const originalGuestTotal = isFromGuestsCollection ? guest.人数 : guest.mealNum;

            if (arrivedCount < originalGuestTotal) {
                // Kịch bản: Check-in một phần
                // 1. Tạo một tài liệu mới cho phần 'arrived'
                const arrivedGuestData = {
                    ...guest, // Sao chép tất cả các thuộc tính hiện có của khách (bao gồm cả '名前')
                    id: `${guest.id}-arrived-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    status: 'arrived',
                    arrivedTime: Date.now(),
                    // isGuided chỉ là true nếu khách ban đầu ở trạng thái 'waiting'
                    isGuided: (guest.status === 'waiting'),
                    // guidedTime chỉ có giá trị nếu isGuided là true
                    guidedTime: (guest.status === 'waiting') ? Date.now() : null,
                    // Đặt số lượng chính xác cho phần đã đến
                    ...(isFromGuestsCollection ? { 人数: arrivedCount } : { mealNum: arrivedCount }),
                    // Đảm bảo waitingTime và fixedIndex được giữ lại nếu là khách đang chờ/đã hướng dẫn, nếu không thì đặt null
                    waitingTime: (guest.status === 'waiting' || guest.isGuided) ? guest.waitingTime : null,
                    fixedIndex: (guest.status === 'waiting' || guest.isGuided) ? guest.fixedIndex : null,
                };
                // Loại bỏ ID của tài liệu gốc để tránh xung đột khi tạo tài liệu mới
                // delete arrivedGuestData.id; // DÒNG NÀY ĐÃ BỊ XÓA

                await setDoc(doc(db, collectionName, arrivedGuestData.id), arrivedGuestData);

                // 2. Cập nhật tài liệu gốc cho phần còn lại
                const remainingCount = originalGuestTotal - arrivedCount;
                let updateData = {
                    // Bắt đầu với các thuộc tính cơ bản cần giữ lại
                    ...(isFromGuestsCollection ? { 人数: remainingCount } : { mealNum: remainingCount }),
                    arrivedTime: null // Đảm bảo phần còn lại không có arrivedTime
                };

                // Explicitly set status and waiting related fields based on original guest's status
                // Dòng này đã được thay đổi để chỉ dựa vào guest.status === 'waiting'
                if (guest.status === 'waiting') {
                    // If original was waiting, remaining part stays waiting
                    updateData.status = 'waiting';
                    updateData.waitingTime = guest.waitingTime;
                    updateData.fixedIndex = guest.fixedIndex;
                    updateData.isGuided = guest.isGuided; // Giữ nguyên isGuided ban đầu cho khách chờ
                    updateData.guidedTime = guest.guidedTime; // Giữ nguyên guidedTime ban đầu cho khách chờ
                } else {
                    // If original was NOT waiting (e.g., 'not_arrived' or 'purchase_only'),
                    // the remaining part should be 'not_arrived' and clear all waiting flags.
                    updateData.status = 'not_arrived';
                    updateData.waitingTime = null;
                    updateData.fixedIndex = null;
                    updateData.isGuided = false;
                    updateData.guidedTime = null;
                }

                // Sao chép các thuộc tính khác từ guest gốc mà không bị ghi đè bởi các cờ trạng thái
                // Đảm bảo ルーム/roomName, 名前 được giữ lại
                const propertiesToKeep = ['ルーム', 'roomNumber', '名前', 'roomName', 'purchaseTime'];
                propertiesToKeep.forEach(prop => {
                    if (guest.hasOwnProperty(prop)) {
                        updateData[prop] = guest[prop];
                    }
                });
                await setDoc(originalGuestRef, updateData, { merge: true });

            } else {
                // Kịch bản: Check-in toàn bộ (arrivedCount === originalGuestTotal)
                const updateData = {
                    status: 'arrived',
                    arrivedTime: Date.now(),
                    // isGuided và guidedTime chỉ được set nếu khách ban đầu là 'waiting' hoặc đã 'isGuided'
                    isGuided: (guest.status === 'waiting' || guest.isGuided),
                    guidedTime: (guest.status === 'waiting' || guest.isGuided) ? Date.now() : null,
                };
                // Xóa các trường liên quan đến chờ nếu nó không phải là khách đang chờ ban đầu
                if (guest.status === 'waiting' || guest.isGuided) {
                    updateData.waitingTime = guest.waitingTime; // Giữ lại cho lịch sử
                    updateData.fixedIndex = guest.fixedIndex; // Giữ lại cho lịch sử
                } else {
                    updateData.waitingTime = null;
                    updateData.fixedIndex = null;
                }

                await setDoc(originalGuestRef, updateData, { merge: true });
            }

            closePartialModal(false); // Đóng hoàn toàn modal sau khi thao tác

        } catch (error) {
            console.error('Check-In status error:', error);
            setModalContent({
                title: 'エラー',
                message: 'チェックインステータスエラー',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
        }
    };

    const closePartialModal = (returnToPreviousModal = true) => {
        setShowPartialModal(false);
        setPartialCheckinData(null);
        if (returnToPreviousModal && previousModalContentRef.current) {
            setModalContent(previousModalContentRef.current);
            setIsModalOpen(true);
        } else {
            closeModal();
        }
    };

    const handleCheckboxChange = (guestId) => {
        setSelectedNotArrivedGuests(prevSelected => {
            if (prevSelected.includes(guestId)) {
                return prevSelected.filter(id => id !== guestId);
            } else {
                return [...prevSelected, guestId];
            }
        });
    };

    const handleWaitingCheckboxChange = (guest) => {
        setSelectedWaitingGuests(prevSelected => {
            const guestIdentifier = guest.id;
            if (prevSelected.some(g => g.id === guestIdentifier)) {
                return prevSelected.filter(g => g.id !== guestIdentifier);
            } else {
                return [...prevSelected, guest];
            }
        });
    };

    return (
        <div className="checkin-container" style={{ backgroundColor: '#F2EBE0' }}>
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
                    onClick={gotoFull}
                    />
                    <img
                    src={`${process.env.PUBLIC_URL}/assets/setting.png`}
                    alt="Setting"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={goToSetting}
                    />
                </div>

                {/* Icon help bên phải */}
                <img
                    src={`${process.env.PUBLIC_URL}/assets/help.png`}
                    alt="Help"
                    style={{ cursor: 'pointer', width: '40px', height: '35px' }}
                    onClick={() => setShowHelpModal(true)}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                                    <span>チェックイン済</span>
                                                    <button　className='cancel-button'　onClick={() => handleCancelCheckIn(guest.id)}> X</button>
                                                </div>
                                            ) : (
                                                 guest.renderButton(() => {
                                                handleCheckInGuest(guest.id, guest.ルーム, guest.人数);
                                                closeModal();
                                })
                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div className="modal-buttons">
                                {modalContent.buttons.map((button, index) => (
                                    <button
                                        key={index}
                                        onClick={button.action}
                                        disabled={button.disableWhenProcessing && processingButtons[button.disableWhenProcessing]}
                                        style={button.style}
                                    >
                                        {button.text}
                                    </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {showPartialModal && partialCheckinData && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>バラチェックイン</h2>
                            {/* Tính toán số lượng khách hiện tại một cách an toàn */}
                            {/* Sử dụng || để ưu tiên 人数 (từ guest) hoặc mealNum (từ purchase), mặc định là 0 */}
                            {(() => {
                                const displayRoom = partialCheckinData.ルーム || partialCheckinData.roomName || ' '; // Ưu tiên ルーム, sau đó là roomName
                                const displayGuestCount = partialCheckinData.人数 || partialCheckinData.mealNum || 0; // Ưu tiên 人数, sau đó là mealNum

                                return (
                                    <p>
                                        部屋: {displayRoom}
                                        {partialCheckinData.名前 || ''}様 {/* Tên khách */}
                                        {displayGuestCount}名 {/* SỐ LƯỢNG KHÁCH ĐÃ ĐƯỢC TÍNH TOÁN AN TOÀN */}
                                    </p>
                                );
                            })()}

                            <label>
                                到着人数:
                                <select
                                    value={partialArrivedCount}
                                    onChange={(e) => setPartialArrivedCount(Number(e.target.value))}
                                >
                                    {/* Tạo các option từ 1 đến số lượng khách hiện tại */}
                                    {/* Sử dụng một biến để đảm bảo Array.from nhận được một số hợp lệ */}
                                    {Array.from({ length: partialCheckinData.人数 || partialCheckinData.mealNum || 0 }, (_, i) => ( // Ưu tiên 人数, sau đó là mealNum
                                        <option key={i} value={i + 1}>{i + 1} 名</option>
                                    ))}
                                </select>
                            </label>

                            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                <button
                                    onClick={() =>
                                        withButtonProcessing('partial-checkin', async () => {
                                        await handleCheckInGuestPartial(partialCheckinData, partialArrivedCount);
                                        })
                                    }
                                    disabled={processingButtons['partial-checkin']}
                                    >
                                    バラチェックイン
                                    </button>

                                <button onClick={() => closePartialModal(true)} style={{ marginLeft: '10px' }}>
                                    戻る
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showHelpModal && (
                <div className="modal">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <p
                        style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            lineHeight: '1.8',
                            textAlign: 'center',
                            marginBottom: '20px'
                        }}
                        >
                        お部屋番号を教えてください。
                        <br />
                        Please tell us your room number.
                        <br />
                        請告訴我們您的房號。
                        <br />
                        객실 번호를 알려주세요.
                        </p>

                    <button
                        onClick={() => setShowHelpModal(false)}
                        style={{
                        padding: '8px 20px',
                        cursor: 'pointer'
                        }}
                    >
                        閉じる
                    </button>
                    </div>
                </div>
                )}

            <p style={{ color: '#811121', fontSize: '20px', fontWeight: 'bold' }}>本日人数 <span style={{ color: 'red', fontSize: '30px', fontWeight: 'bold' }}>{totalGuests} </span> 名</p>
            <p>
                未到着人数 <span style={{ fontWeight: 'bold' }}>{notArrivedGuests}</span> 名　　　　
                到着済人数 <span style={{ fontWeight: 'bold' }}>{checkedInGuests} </span>名　　　　
                ウェイティング人数 <span style={{ fontWeight: 'bold' }}>{waitingGuestsCount}</span>名
                {purchaseWaitingCount > 0 && <span style={{ marginLeft: '10px' }}>当日({purchaseWaitingCount}名)</span>}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                        style={{ width: '100%', height: '30px', marginBottom: '10px' }}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
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
                        onCompositionUpdate={handleInputChange}
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <h3 style={{ marginTop: '10px' }}>当日朝食購入 ({totalPurchasedGuests} 名)</h3>
                            <button onClick={() => setShowBreakfastTable(!showBreakfastTable)}>
                                {showBreakfastTable ? '非表示' : '表示'}
                            </button>
                        </div>

                    {showBreakfastTable && (
                        <>
                            <div className="input-select-container"
                                 style={{display: 'flex', justifyContent: 'center', alignItems: 'center',
                                         gap: '10px', marginBottom: '10px'}}>
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
                                    {[...Array(5).keys()].map((i) => (
                                        <option key={i} value={i + 1}>
                                            {i + 1} 名
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                                <button style={{ width: '100%', maxWidth: '150px' }} onClick={handleInput}>
                                    入力
                                </button>
                            </div>

                             {inputError && (
                                <p style={{ color: 'red' }}>{inputError}</p>
                            )}

                            {inputList.length > 0 && (
                                <div style={{ marginTop: '10px', width: '100%' }}>
                                    <table
                                        style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            margin: 'auto',
                                        }}
                                    >
                                        <thead>
                                            <tr><th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}> 番号 </th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>購入時</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>アクション</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inputList.map((item, index) => (
                                                <tr key={item.id}>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>{index + 1}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>{item.roomName}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>{item.mealNum}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                                        {item.purchaseTime
                                                            ? new Date(item.purchaseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : ''}
                                                    </td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                                        <button  className='waiting-button' onClick={() => handleMovePurchaseToWaiting(item.id)}>W</button>
                                                        <button  className='cancel-button'  onClick={() => handleDeletePurchase(item.id)}> X</button>
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
                    <div style={{ display: "flex", justifyContent: "left", alignItems: "center", gap: "10px" }}>
        <h3 style={{ margin: 0 }}>
            ウェイティング ({waitingGuestsCount} 名)
            {purchaseWaitingCount > 0 && (
            <span style={{ marginLeft: '10px' }}>当日({purchaseWaitingCount}名)</span>
            )}
        </h3>
        <button onClick={() => setShowWaitingTable(!showWaitingTable)}>
            {showWaitingTable ? "非表示" : "表示"}
        </button>
        {showWaitingTable && (
            <>
                <button
                    className="batch-checkin-btn"
                    onClick={handleBatchCheckInWaiting}
                    disabled={selectedWaitingGuests.length === 0}
                    style={{ marginLeft: '10px', backgroundColor: "green"}}
                >
                    一括 O
                </button>
            </>
        )}
    </div>

                    {showWaitingTable && (
                    <table>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        // Chỉ chọn những khách có status 'waiting' thực sự
                                        if (e.target.checked) {
                                            setSelectedWaitingGuests(waitingGuests.filter(g => g.status === 'waiting'));
                                        } else {
                                            setSelectedWaitingGuests([]);
                                        }
                                    }}
                                    // Kiểm tra xem tất cả khách đang chờ thực sự đã được chọn chưa
                                    checked={selectedWaitingGuests.length === waitingGuests.filter(g => g.status === 'waiting').length && waitingGuests.filter(g => g.status === 'waiting').length > 0}
                                />
                            </th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>番号</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>名前</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>スタートタイム</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>状況</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>アクション</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>備考</th>
                        </tr>
                        </thead>

                        <tbody>
                        {
                            // Sắp xếp lại để các mục có cùng fixedIndex hiển thị liền kề,
                            // và mục isGuided hiển thị trước mục waiting
                            waitingGuests.map((guest) => {
                                const isGroup = waitingGuests.filter(g => g.fixedIndex === guest.fixedIndex).length > 1;
                                const rowStyle = {
                                textAlign: 'center',
                                backgroundColor: isGroup ? '#D6F0F5' : '#FAF9F6',
                                };
                                const indexStyle = {
                                ...rowStyle,
                                fontSize: '18px',
                                fontWeight: 'bold',
                                };

                                return (
                                <tr key={guest.id}>
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                        {/* Chỉ cho phép chọn nếu khách đang ở trạng thái 'waiting' */}
                                        {guest.status === 'waiting' && (
                                            <input
                                                type="checkbox"
                                                checked={selectedWaitingGuests.some(g => g.id === guest.id)}
                                                onChange={() => handleWaitingCheckboxChange(guest)}
                                            />
                                        )}
                                    </td>
                                    <td style={indexStyle}>
                                    <span className={guest.status === 'waiting' ? "blink-red" : ""}>
                                        {guest.fixedIndex}
                                    </span>
                                    </td>
                                    <td style={rowStyle}>
                                    {guest.source === 'guest' ? guest.ルーム : guest.roomName}
                                    </td>
                                    <td style={rowStyle}>
                                    {guest.source === 'guest' ? guest.名前 : ''}
                                    </td>
                                    <td style={rowStyle}>
                                    {guest.source === 'guest' ? guest.人数 : guest.mealNum}
                                    </td>
                                    <td style={rowStyle}>
                                    {guest.waitingTime
                                        ? new Date(guest.waitingTime).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : ''}
                                    </td>
                                    <td style={rowStyle}>
                                        {guest.isGuided && guest.guidedTime
                                            ? `${new Date(guest.guidedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} に案内済`
                                            :''}
                                    </td>
                                    <td style={rowStyle}>
                                    {/* Chỉ hiển thị nút 'O' nếu khách đang ở trạng thái 'waiting' */}
                                    {guest.status === 'waiting' && (
                                        <>
                                            <button
                                                className='checkin-button'
                                                onClick={() => handleMoveToArrivedFromWaiting(guest)}
                                            >
                                                O
                                            </button>
                                            {/* Nút WB mới */}
                                            {(guest.source === 'guest' && guest.人数 > 1) || (guest.source === 'purchase' && guest.mealNum > 1) ? (
                                                <button
                                                    className='waiting2-button' // Sử dụng style tương tự nút B
                                                    onClick={() => handleWaitingPartialCheckInClick(guest)}
                                                >
                                                    BW
                                                </button>
                                            ) : null}
                                        </>
                                    )}
                                    <button
                                        className='writing-button'
                                        onClick={() =>
                                        setEditFixedIndexModal({
                                            open: true,
                                            guest: guest,
                                            newIndex: guest.fixedIndex || '',
                                        })
                                        }
                                    >
                                        S
                                    </button>
                                    </td>
                                        <td style={rowStyle}>
                                            <textarea
                                                defaultValue={guest.remarks || ""}
                                                onBlur={(e) => {
                                                const newValue = e.target.value;
                                                updateRemarks(guest, newValue);
                                                }}
                                                onCompositionEnd={(e) => {
                                                const newValue = e.target.value;
                                                updateRemarks(guest, newValue);
                                                }}
                                                placeholder="備考を入力"
                                                style={{
                                                width: "65%",
                                                minHeight: "40px",
                                                padding: "3px",
                                                border: "1px solid #ccc",
                                                borderRadius: "4px",
                                                resize: "none",           // không cho kéo rộng ô
                                                whiteSpace: "pre-wrap",   // giữ xuống dòng
                                                wordBreak: "break-word"   // tự ngắt chữ dài
                                                }}
                                            />
                                            </td>
                                </tr>
                                );
                            })
                        }
                        </tbody>
                    </table>
                    )}
                </div>
                </div>


            <div className="guest-lists-container">
                <div className="guest-list">
                    <div style={{ display: "flex", justifyContent: "left", alignItems: "center", gap: "10px", flexWrap: 'wrap'}}>
                        <h3>未到着 ({notArrivedGuests} 名)</h3>
                        <button onClick={() => setShowNotArriveTable(!showNotArriveTable)}>
                            {showNotArriveTable ? "非表示" : "表示"}
                        </button>
                        {showNotArriveTable && (
                            <button
                                className="batch-checkin-btn"
                                onClick={handleBatchCheckInNotArrived}
                                disabled={selectedNotArrivedGuests.length === 0}
                                style={{backgroundColor: "green"}}
                            >
                                一括 O
                            </button>
                        )}
                    </div>
                    {showNotArriveTable && (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedNotArrivedGuests(guestsData.filter(guest => guest.status === 'not_arrived').map(guest => guest.id));
                                                } else {
                                                    setSelectedNotArrivedGuests([]);
                                                }
                                            }}
                                            checked={selectedNotArrivedGuests.length === guestsData.filter(guest => guest.status === 'not_arrived').length && guestsData.filter(guest => guest.status === 'not_arrived').length > 0}
                                        />
                                    </th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>名前</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                {guestsData.filter(guest => guest.status === 'not_arrived').map((guest, index) => (
                                    <tr key={guest.id}>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedNotArrivedGuests.includes(guest.id)}
                                                onChange={() => handleCheckboxChange(guest.id)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.ルーム}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.名前}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.人数}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                            <button className='checkin-button' onClick={() => handleIndividualCheckIn(guest)}>O</button>
                                            <button className='waiting-button' onClick={() => confirmMoveToWaiting(guest)}>W</button>
                                            <button className='invi-button' onClick={() => handlePartialCheckInClick(guest)}>B</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="guest-list">
                    <div style={{ display: "flex", justifyContent: "left", alignItems: "center", gap: "10px" }}>
                        <h3>到着済 ({checkedInGuests} 名)</h3>
                        <button onClick={() => setShowArriveTable(!showArriveTable)}>
                            {showArriveTable ? "非表示" : "表示"}
                        </button>
                    </div>
                    {showArriveTable && (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>名前</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>到着時</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>アクション</th>
                                </tr>
                            </thead>
                            <tbody>
                                {guestsData.filter(guest => guest.status === 'arrived').map((guest, index) => (
                                    <tr key={index}>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.ルーム}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.名前}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.人数}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                            {guest.arrivedTime
                                                ? new Date(guest.arrivedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : ''}
                                        </td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
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
                    )}
                </div>
            </div>

            {editFixedIndexModal.open && (
                <div className="modal">
                    <div className="modal-content">
                    <h3>番号の編集</h3>
                    <p>
                        部屋: {editFixedIndexModal.guest?.ルーム || editFixedIndexModal.guest?.roomName} <br />
                        現在の番号: {editFixedIndexModal.guest?.fixedIndex}
                    </p>
                    <input
                        type="number"
                        placeholder="新しい番号を入力"
                        value={editFixedIndexModal.newIndex}
                        onChange={(e) =>
                        setEditFixedIndexModal(prev => ({ ...prev, newIndex: e.target.value }))
                        }
                        style={{ textAlign:'center', width: '80px', margin: '10px 0' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                        onClick={async () => {
                            const { guest, newIndex } = editFixedIndexModal;
                            if (!isNaN(newIndex) && newIndex !== '') {
                            const targetCollection = guest.source === 'guest' ? "breakfastGuests" : "breakfastPurchases";
                            await setDoc(doc(db, targetCollection, guest.id), {
                                fixedIndex: parseInt(newIndex)
                            }, { merge: true });
                            }
                            setEditFixedIndexModal({ open: false, guest: null, newIndex: '' });
                        }}
                        >
                        保存
                        </button>
                        <button
                        onClick={() =>
                            setEditFixedIndexModal({ open: false, guest: null, newIndex: '' })
                        }
                        >
                        キャンセル
                        </button>
                    </div>
                    </div>
                </div>
                )}

        <div className="input-and-purchase" style={{ marginTop: '20px' }}>
            <div  className="input-section" style={{maxWidth: '600px', gap: '8px',   width: '100%', }}>
            <div style={{display: 'flex', alignItems: 'center',gap: '10px',marginBottom: '10px',}}>
                <h3 style={{ margin: 0 }}> 朝食リストアップロード </h3>
                <button onClick={() => setShowUpload(prev => !prev)}> {showUpload ? '非表示' : '表示'} </button>
            </div>

            {showUpload && (
                <div style={{display: 'flex', flexDirection: 'column',   gap: '15px', }}>
                    <input type="file" accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        style={{ fontSize: '1.05em' }}/>

                    <button onClick={handleRefresh} className="torikeshi">  全取消</button>
                </div>  )}
            </div>
        </div>
    </div>
    );};

export default BreakfastCheckin;
