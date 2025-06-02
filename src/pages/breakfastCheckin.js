import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import {collection, setDoc, doc, deleteDoc, onSnapshot, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
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
    const [waitingGlobalStartTime, setWaitingGlobalStartTime] = useState(null);
    const [waitingGlobalEndTime, setWaitingGlobalEndTime] = useState(null);

    const navigate = useNavigate();
    const goToHome = () => { navigate('/home'); };
    const goToRestaurant = () => navigate('/restaurant');
    const goToGuest = () => { navigate('/guest'); };
    const gotoFull = () => { navigate('/fullSeat'); };

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

    useEffect(() => {
          // Listener for breakfastGuests collection
        const unsubscribeGuests = onSnapshot(
            query(collection(db, "breakfastGuests"), orderBy("roomNumber")),
            (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGuestsData(data);
            updateGuestStatistics(data);
            setData(data);
            },
            (error) => console.error('Data fetch error', error)
        );

        const unsubscribePurchases = onSnapshot(
            query(collection(db, 'breakfastPurchases'), orderBy("purchaseTime")), // <-- THÊM orderBy("purchaseTime")
            (snapshot) => {
                const purchases = snapshot.docs.map((doc, idx) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        status: data.status || 'purchase_only',
                        waitingTime: data.waitingTime || null,
                        fixedIndex: data.fixedIndex || null,
                        source: 'purchase',
                        purchaseTime: data.purchaseTime || null, // <-- Đảm bảo lấy purchaseTime
                    };
                });
                setInputList(purchases);
                calculateTotalPurchasedGuests(purchases);
            },
            (error) => console.error('Purchase data fetch error:', error)
        );

        // NEW: Listener for global waiting times from appSettings
        const unsubscribeGlobalTimes = onSnapshot(
            doc(db, "appSettings", "waitingTimes"), // Assuming a single document for global settings
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    setWaitingGlobalStartTime(data.startTime || null);
                    setWaitingGlobalEndTime(data.endTime || null);
                } else {
                    // If the document doesn't exist, initialize times to null
                    setWaitingGlobalStartTime(null);
                    setWaitingGlobalEndTime(null);
                }
            },
            (error) => console.error('Global waiting times fetch error:', error)
        );


        return () => {
            unsubscribeGuests();
            unsubscribePurchases();
            unsubscribeGlobalTimes(); // Clean up global waiting times listener
        };
        }, []);

        // Effect to update waiting guests list and counts
        useEffect(() => {
            const allWaiting = [
                ...data.filter(g => g.status === 'waiting').map(g => ({ ...g, source: 'guest' })),
                ...inputList.filter(p => p.status === 'waiting').map(p => ({ ...p, source: 'purchase' }))
            ];

            // Calculate current "当日" (same-day) waiting guests count
            const currentPurchaseWaitingCount = inputList
                .filter(p => p.status === 'waiting')
                .reduce((sum, p) => sum + (p.mealNum || 0), 0);
            setPurchaseWaitingCount(currentPurchaseWaitingCount);

            // Sort waiting guests by fixedIndex
            const sortedWaiting = allWaiting.sort((a, b) => (a.fixedIndex || 0) - (b.fixedIndex || 0));
            setWaitingGuests(sortedWaiting);

            // Calculate total non-purchase waiting guests count
            let nonPurchaseWaitingCount = 0;
            sortedWaiting.forEach(guest => {
                if (guest.source === 'guest') {
                    nonPurchaseWaitingCount += guest.人数 || 0;
                }
            });
            setWaitingGuestsCount(nonPurchaseWaitingCount);
        }, [data, inputList]);


    // Effect to calculate total purchased guests
    useEffect(() => {
        calculateTotalPurchasedGuests(inputList);
    }, [inputList]);

    // Function to calculate total guests from purchases
    const calculateTotalPurchasedGuests = (purchases) => {
        const total = purchases.reduce(
            (sum, purchase) => sum + (purchase.mealNum || 0),
            0
        );
        setTotalPurchasedGuests(total);
    };

    // Effect for personal room input (partial check-in)
    useEffect(() => {
        if (personalRoomInput && data.length > 0) {
            const roomData = data.find(d => String(d.ルーム).trim() === personalRoomInput.trim());
            if (roomData) {
                setPartialCheckinData(roomData);
                setPartialArrivedCount(1);
                setShowPartialModal(true);
            } else {
                // Using a custom modal instead of alert()
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

    // Function to read Excel files
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
                            waitingTime: null, // Ensure initial state is null
                            arrivedTime: null // Ensure initial state is null
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

    // Function to get the next available fixed index for waiting guests
    const getNextWaitingIndex = async () => {
        const guestsSnapshot = await getDocs(query(collection(db, "breakfastGuests")));
        const purchaseSnapshot = await getDocs(collection(db, "breakfastPurchases"));

        const allCurrentWaiting = [
            ...guestsSnapshot.docs.map(doc => doc.data()).filter(g => g.status === 'waiting'),
            ...purchaseSnapshot.docs.map(doc => doc.data()).filter(p => p.status === 'waiting')
        ];

        const maxIndex = allCurrentWaiting.reduce((max, item) => {
            return Math.max(max, item.fixedIndex || 0);
        }, 0);
        return maxIndex + 1;
    };

    // Function to move a purchased item to waiting status
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
                waitingTime: Date.now(), // Set waiting time when moved to waiting
                fixedIndex: nextIndex,
            }, { merge: true });

        } catch (error) {
            console.error('Error moving purchase to waiting:', error);
        }
    };

    // Function to read CSV files
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
                    waitingTime: null, // Ensure initial state is null
                    arrivedTime: null // Ensure initial state is null
                };
            }).filter(guest => guest.ルーム && guest.人数 > 0);
            setGuestsData(formattedData);
            await uploadDataToFirestore(formattedData);
        } catch (error) {
            console.error('CSV reading error:', error);
        }
    };

    // Function to upload data to Firestore
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

    // Function to delete all documents in a collection
    const deleteCollectionData = async (collectionRef) => {
        try {
            const snapshot = await getDocs(collectionRef);
            await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    // Handle composition start for name input (Japanese IME)
    const handleCompositionStart = () => {
        setIsComposing(true);
    };

    // Handle composition end for name input (Japanese IME)
    const handleCompositionEnd = (e) => {
        setIsComposing(false);

        const value = e.target.value;
        if (/^[A-Za-z\s]+$/.test(value)) {
            const uppercased = value.replace(/[a-zA-Z]/g, (char) => char.toUpperCase());
            setNameInput(uppercased);
        } else {setNameInput(value);
        } setNameInputValue('');
    };

    // Handle input change for name input
    const handleInputChange = (e) => {
        if (!isComposing) {
            const value = e.target.value;
            setNameInput(value);
        } else {setNameInputValue(e.target.value); }
    };

    // Handle adding a new purchase entry
     const handleInput = async () => {
        const rawRoomName = roomName.trim();
        const parsedRoomName = parseInt(rawRoomName);

        if (!rawRoomName) {
            setInputError('部屋番号を入力して下さい！');
            return;
        }

        if (isNaN(parsedRoomName) || !VALID_ROOMS.includes(parsedRoomName)) {
            setInputError('有効な部屋番号を入力して下さい。（例：301-1310）');
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
                purchaseTime: Date.now(), // <-- THÊM DÒNG NÀY: Lưu lại thời gian mua
            };
            await addDoc(collection(db, 'breakfastPurchases'), newItem);
            setRoomName('');
            setMealNum(1);
        } catch (error) {
            console.error('Add Data error:', error);
        }
    };

    // Update guest statistics (total, arrived, not arrived)
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

    // Close modal
    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent(null);
        setRoomNumber('');
        setNameInput('');
    };

    // Get current date in Japanese format
    const getCurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    };

    // Handle room number check-in
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

        setModalContent({
            title: '確認',
            message: matchingGuests.map(guest => ({
                text: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
                id: guest.id,
                status: guest.status,
                renderButton: (onClick) => (
                    <button　className='checkin-button'　onClick={onClick}>O</button>
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
        });
        setIsModalOpen(true);
    };

    // Handle name check-in
    const handleNameCheckIn = () => {
        if (!nameInput.trim()) {
            setModalContent({
                title: '朝食未購入',
                message: '名前を入力して下さい。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        const matchingGuests = guestsData.filter(g =>　g.名前.toLowerCase().includes(nameInput.trim().toLowerCase())
        );

        if (matchingGuests.length === 0) {
            setModalContent({
                title: '朝食未購入',
                message: '該当する名前の朝食購入データが見つかりません。',
                buttons: [{ text: '戻る', action: () => closeModal() }],
            });
            setIsModalOpen(true);
            return;
        }

        setModalContent({
            title: '確認',
            message: matchingGuests.map(guest => ({
                text: `部屋 ${guest.ルーム}　${guest.名前}様　${guest.人数}名`,
                id: guest.id,
                status: guest.status,
                renderButton: (onClick) => (
                    <button　className='checkin-button' onClick={onClick}>O</button>
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
        });
        setIsModalOpen(true);
    };

    const [editFixedIndexModal, setEditFixedIndexModal] = useState({
            open: false,
            guest: null,
            newIndex: '',
            });

    // Handle individual guest check-in
    const handleCheckInGuest = async (guestId, room, count) => {
        try {
            const guest = guestsData.find((g) => g.id === guestId);
            if (guest) {
                // NEW: Add arrivedTime when status changes to 'arrived'
                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null }, { merge: true });
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

    // Handle batch check-in for multiple guests
    const handleCheckInAll = async (guests) => {
        try {
            for (const guest of guests) {
                if (guest.status !== 'arrived') {
                    // NEW: Add arrivedTime when status changes to 'arrived'
                    await setDoc(doc(db, "breakfastGuests", guest.id), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null }, { merge: true });
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

    // New function to handle batch check-in for selected 'not_arrived' guests
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
                                // NEW: Add arrivedTime when status changes to 'arrived'
                                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null }, { merge: true });
                            }
                            setSelectedNotArrivedGuests([]); // Clear selection after batch check-in
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

    // Handle cancelling a check-in
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
                                // NEW: Remove arrivedTime when status changes back to 'not_arrived'
                                await setDoc(doc(db, "breakfastGuests", guestId), { status: 'not_arrived', arrivedTime: null, waitingTime: null, fixedIndex: null }, { merge: true });
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
                    { text: 'いいえ', action: () => closeModal() },
                ],
            });
            setIsModalOpen(true);
        }
    };

    // Handle individual check-in from modal
    const handleIndividualCheckIn = (guest) => {
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
                { text: '戻る', action: () => closeModal() },
            ],
        });
        setIsModalOpen(true);
    };

    // Handle moving a guest to waiting status
    const handleMoveToWaiting = async (guestId) => {
        try {
            const nextIndex = await getNextWaitingIndex();
            await setDoc(doc(db, "breakfastGuests", guestId), {
                status: 'waiting',
                waitingTime: Date.now(), // Set waiting time when moved to waiting
                fixedIndex: nextIndex,
                arrivedTime: null // Clear arrived time if moved back to waiting
            }, { merge: true });
        } catch (error) {
            console.error('Error moving to waiting:', error);
        }
    };

    // Handle moving a guest from waiting to arrived status
    const handleMoveToArrivedFromWaiting = async (guest) => {
        try {
            if (guest.source === 'guest') {
                await setDoc(doc(db, "breakfastGuests", guest.id), { status: 'arrived', arrivedTime: Date.now(), waitingTime: null, fixedIndex: null }, { merge: true });
            } else if (guest.source === 'purchase') {
                // When "当日" guest is moved from waiting, status reverts to 'purchase_only'
                await setDoc(doc(db, "breakfastPurchases", guest.id), { status: 'purchase_only', waitingTime: null, fixedIndex: null }, { merge: true });
            }
        } catch (error) {
            console.error('Error moving to arrived:', error);
        }
    };

    // NEW: Handle batch check-in for selected waiting guests
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
                                await handleMoveToArrivedFromWaiting(guest); // Reuse the existing function
                            }
                            setSelectedWaitingGuests([]); // Clear selection after batch check-in
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

    // Handle refresh (clear all guest data)
     const handleRefresh = async () => {
        setModalContent({
            title: 'データ取消',
            message: 'データを取消しますか？',
            buttons: [
                {
                    text: 'はい',
                    action: async () => {
                        try {
                            // Xóa dữ liệu khách đã tải lên từ Excel/CSV
                            await deleteCollectionData(collection(db, "breakfastGuests"));
                            setGuestsData([]);
                            setTotalGuests(0);
                            setCheckedInGuests(0);

                            // NEW: Xóa dữ liệu khách mua thêm trong ngày (当日朝食購入)
                            await handleClearAllPurchases(); // <-- THÊM DÒNG NÀY

                            setModalContent({
                                title: 'データ取消',
                                message: 'データが取消されました!',
                                buttons: [{ text: '戻る', action: () => closeModal() }],
                            });
                            setIsModalOpen(true);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = null;
                            }
                            // Xóa thời gian chờ đợi toàn cục
                            await setDoc(doc(db, "appSettings", "waitingTimes"), { startTime: null, endTime: null }, { merge: true });
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


    // Handle deleting a single purchase entry
    const handleDeletePurchase = async (purchaseId) => {
        try {
            await deleteDoc(doc(db, "breakfastPurchases", purchaseId));
        } catch (error) {
            console.error('Purchase error:', error);
        }
    };

    // Handle clearing all purchase entries
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

    // Handle file change (Excel or CSV upload)
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileType = file.name.split('.').pop().toLowerCase();
        if (fileType === 'xlsx' || fileType === 'xls') {
            readExcelFile(file);
        } else if (fileType === 'csv') {
            readCSVFile(file);
        } else {
            // Using a custom modal instead of alert()
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

    // Handle partial check-in click
    const handlePartialCheckInClick = (guest) => {
        setPartialCheckinData(guest);
        setPartialArrivedCount(1);
        setShowPartialModal(true);
    };

    // Handle partial check-in for a guest
    const handleCheckInGuestPartial = async (guest, arrivedCount) => {
        try {
            if (guest) {
                if (arrivedCount < guest.人数) {
                    const arrivedGuestData = {
                        ...guest,
                        人数: arrivedCount,
                        status: 'arrived',
                        id: `${guest.id}-arrived-${Date.now()}`,
                        arrivedTime: Date.now(), // NEW: Set arrivedTime for partial check-in
                        waitingTime: null, // Clear waiting time
                        fixedIndex: null // Clear fixed index
                    };
                    await setDoc(doc(collection(db, "breakfastGuests"), arrivedGuestData.id), arrivedGuestData);

                    await setDoc(doc(db, "breakfastGuests", guest.id), {
                        ...guest,
                        人数: guest.人数 - arrivedCount,
                    }, { merge: true });
                } else {
                    await setDoc(doc(db, "breakfastGuests", guest.id), {
                        ...guest,
                        status: 'arrived',
                        arrivedTime: Date.now(), // NEW: Set arrivedTime for full check-in
                        waitingTime: null, // Clear waiting time
                        fixedIndex: null // Clear fixed index
                    }, { merge: true });
                }
            } else {
                console.warn(`ID ${guest.id} is not found`);
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
    };

    // Close partial check-in modal
    const closePartialModal = () => {
        setShowPartialModal(false);
        setPartialCheckinData(null);
    };

    // Handle checkbox change for individual guests in 'not_arrived' table
    const handleCheckboxChange = (guestId) => {
        setSelectedNotArrivedGuests(prevSelected => {
            if (prevSelected.includes(guestId)) {
                return prevSelected.filter(id => id !== guestId);
            } else {
                return [...prevSelected, guestId];
            }
        });
    };

    // NEW: Handle checkbox change for individual guests in 'waiting' table
    const handleWaitingCheckboxChange = (guest) => {
        setSelectedWaitingGuests(prevSelected => {
            const guestIdentifier = guest.id; // Use guest.id as the identifier
            if (prevSelected.some(g => g.id === guestIdentifier)) {
                return prevSelected.filter(g => g.id !== guestIdentifier);
            } else {
                return [...prevSelected, guest];
            }
        });
    };

    // NEW: Handle global waiting start time
    const handleSetWaitingStartTime = async () => {
        const now = Date.now();
        const appSettingsDocRef = doc(db, "appSettings", "waitingTimes");
        if (waitingGlobalStartTime) {
            // If already set, clear it
            await setDoc(appSettingsDocRef, { startTime: null }, { merge: true });
            setWaitingGlobalStartTime(null);
        } else {
            // Set current time
            await setDoc(appSettingsDocRef, { startTime: now }, { merge: true });
            setWaitingGlobalStartTime(now);
        }
    };

    // NEW: Handle global waiting end time
    const handleSetWaitingEndTime = async () => {
        const now = Date.now();
        const appSettingsDocRef = doc(db, "appSettings", "waitingTimes");
        if (waitingGlobalEndTime) {
            // If already set, clear it
            await setDoc(appSettingsDocRef, { endTime: null }, { merge: true });
            setWaitingGlobalEndTime(null);
        } else {
            // Set current time
            await setDoc(appSettingsDocRef, { endTime: now }, { merge: true });
            setWaitingGlobalEndTime(now);
        }
    };

    return (
        <div className="checkin-container" style={{ backgroundColor: '#F2EBE0' }}>
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
                                    <button key={index} onClick={button.action} style={button.style}>
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
                            <p>部屋: {partialCheckinData.ルーム}
                                {partialCheckinData.名前}様
                                {partialCheckinData.人数}名</p>
                            <label>
                                到着人数:
                                <select
                                    value={partialArrivedCount}
                                    onChange={(e) => setPartialArrivedCount(Number(e.target.value))}
                                >
                                    {Array.from({ length: partialCheckinData.人数 }, (_, i) => (
                                        <option key={i} value={i + 1}>{i + 1} 名</option>
                                    ))}
                                </select>
                            </label>

                            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                <button
                                    onClick={() => {
                                        handleCheckInGuestPartial(partialCheckinData, partialArrivedCount);
                                        closePartialModal();
                                    }}
                                >
                                    バラチェックイン
                                </button>

                                <button onClick={closePartialModal} style={{ marginLeft: '10px' }}>
                                    戻る
                                </button>
                            </div>
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
                                    type="text" // Change type to text to avoid default number input behavior
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
                                <button style={{ width: '100%', maxWidth: '150px' }} onClick={handleClearAllPurchases}>
                                    一括取消
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
                                            <tr>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}> 番号 </th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#E4DFD1' }}>購入時</th> {/* <-- THÊM DÒNG NÀY */}
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
                                                    </td> {/* <-- THÊM DÒNG NÀY */}
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
                    style={{ marginLeft: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' , height:'39px' }}
                    onClick={handleBatchCheckInWaiting}
                    disabled={selectedWaitingGuests.length === 0}
                >
                    一括チェックイン
                </button>
                {/* NEW: Thêm một div bọc cho nút Start/End và áp dụng margin-left: auto */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        style={{ backgroundColor: waitingGlobalStartTime ? '#dc3545' : '#ffc107', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', height: '39px' }}
                        onClick={handleSetWaitingStartTime}
                    >
                        スタート
                    </button>
                    {waitingGlobalStartTime && (
                        <span style={{ marginLeft: '5px', fontSize: '14px' }}>
                            {new Date(waitingGlobalStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        style={{ backgroundColor: waitingGlobalEndTime ? '#dc3545' : '#ffc107', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', height: '39px' }}
                        onClick={handleSetWaitingEndTime}
                    >
                        終了
                    </button>
                    {waitingGlobalEndTime && (
                        <span style={{ marginLeft: '5px', fontSize: '14px' }}>
                            {new Date(waitingGlobalEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </>
        )}
    </div>

                    {showWaitingTable && (
                    <table>
                        <thead>
                        <tr>
                            {/* NEW: Checkbox column header for waiting table */}
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedWaitingGuests(waitingGuests); // Select all waiting guests
                                        } else {
                                            setSelectedWaitingGuests([]); // Deselect all
                                        }
                                    }}
                                    checked={selectedWaitingGuests.length === waitingGuests.length && waitingGuests.length > 0}
                                />
                            </th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>番号</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>部屋番号</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>名前</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>人数</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>スタートタイム</th>
                            <th style={{ textAlign: 'center', backgroundColor: '#E4DFD1' }}>アクション</th>
                        </tr>
                        </thead>

                        <tbody>
                        {
                            // Group fixedIndex before mapping
                            (() => {
                            const fixedIndexGroups = waitingGuests.reduce((acc, guest) => {
                                const index = guest.fixedIndex;
                                acc[index] = acc[index] ? [...acc[index], guest] : [guest];
                                return acc;
                            }, {});

                            return waitingGuests.map((guest) => {
                                const isGroup = fixedIndexGroups[guest.fixedIndex]?.length > 1;
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
                                    {/* NEW: Checkbox for each waiting guest row */}
                                    <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedWaitingGuests.some(g => g.id === guest.id)}
                                            onChange={() => handleWaitingCheckboxChange(guest)}
                                        />
                                    </td>
                                    <td style={indexStyle}>
                                    {guest.fixedIndex}
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
                                    <button
                                        className='checkin-button'
                                        onClick={() => handleMoveToArrivedFromWaiting(guest)}
                                    >
                                        O
                                    </button>
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
                                </tr>
                                );
                            });
                            })()
                        }
                        </tbody>
                    </table>
                    )}
                </div>
                </div>


            <div className="guest-lists-container">
                <div className="guest-list">
                    <div style={{ display: "flex", justifyContent: "left", alignItems: "center", gap: "10px" }}>
                        <h3>未到着 ({notArrivedGuests} 名)</h3>
                        <button onClick={() => setShowNotArriveTable(!showNotArriveTable)}>
                            {showNotArriveTable ? "非表示" : "表示"}
                        </button>
                        {/* New Batch Check-in Button for 未到着 */}
                        {showNotArriveTable && (
                            <button
                                style={{ marginLeft: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' , height:'39px' }}
                                onClick={handleBatchCheckInNotArrived}
                                disabled={selectedNotArrivedGuests.length === 0}
                            >
                                一括チェックイン
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
                                    </th> {/* New column for checkboxes */}
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
                                        </td> {/* Checkbox for each row */}
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.ルーム}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.名前}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>{guest.人数}</td>
                                        <td style={{ textAlign: 'center', backgroundColor: '#FAF9F6' }}>
                                            <button className='checkin-button' onClick={() => handleIndividualCheckIn(guest)}>O</button>
                                            <button className='waiting-button' onClick={() => handleMoveToWaiting(guest.id)}>W</button>
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
                                    {/* NEW: Add 到着時 column header */}
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
                                        {/* NEW: Display arrivedTime */}
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
                <div className="input-section" style={{ maxWidth: '600px', width: '100%', textAlign: 'left' }}>
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
