import { useState, useRef } from 'react';
import { createIpConfigFrame, APN_COMMANDS, parseWaterVolume, createIntervalConfigFrame, createTimeCalibFrame } from './utils/hexUtils';

// 🛡️ Khai báo cực kỳ chặt chẽ, không dùng chữ 'any'
interface ISerialPort {
    open: (options: { baudRate: number, dataBits?: number, stopBits?: number, parity?: string }) => Promise<void>;
    setSignals: (signals: { dataTerminalReady?: boolean, requestToSend?: boolean }) => Promise<void>;
    readable: {
        getReader: () => {
            read: () => Promise<{ value?: Uint8Array; done: boolean }>;
            releaseLock: () => void;
        };
    };
    writable: {
        getWriter: () => {
            write: (data: Uint8Array) => Promise<void>;
            releaseLock: () => void;
        };
    };
}

const SerialConfigTool = () => {
    const [portDetails, setPortDetails] = useState<ISerialPort | null>(null);
    const [status, setStatus] = useState<string>('Chưa kết nối');
    const [receiveData, setReceiveData] = useState<string>(''); 
    
    const [ip, setIp] = useState<string>('113.161.56.137');
    const [portNum, setPortNum] = useState<string>('7002');
    const [network, setNetwork] = useState<keyof typeof APN_COMMANDS>('VIETTEL'); 
    
    // State cho Cấu hình Tần suất gửi
    const [minute, setMinute] = useState<string>('0');
    const [hour, setHour] = useState<string>('0');
    const [dayInterval, setDayInterval] = useState<string>('0');
    const [hourInterval, setHourInterval] = useState<string>('1');

    // Các biến phục vụ phần Dịch Hex
    const [hexInput, setHexInput] = useState<string>('00 00 0B 2C');
    const [waterVolume, setWaterVolume] = useState<number | null>(null);

    const isReading = useRef(false);

    let ipError = '';
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ip.trim()) ipError = 'IP không được để trống';
    else if (!ipRegex.test(ip)) ipError = 'Định dạng IP không hợp lệ';

    let portError = '';
    const parsedPort = parseInt(portNum, 10);
    
    if (!portNum.trim()) portError = 'Port không được để trống';
    else if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) portError = 'Port phải từ 1 đến 65535';

    const isFormValid = ipError === '' && portError === '';

    // ==========================================
    // LẮNG NGHE DỮ LIỆU TỪ ĐỒNG HỒ TRẢ VỀ ("ĐÔI TAI")
    // ==========================================
    const readLoop = async (port: ISerialPort) => {
        isReading.current = true;
        const reader = port.readable.getReader();
        try {
            while (isReading.current) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    const hexString = Array.from(value)
                        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                        .join(' ');
                    
                    setReceiveData(prev => prev + ' ' + hexString);
                    setStatus('Đã nhận được phản hồi từ đồng hồ!');
                }
            }
        } catch (error) {
            console.error('Lỗi khi đọc dữ liệu:', error);
        } finally {
            reader.releaseLock();
        }
    };

    // ==========================================
    // KẾT NỐI VÀ BẬT ĐIỆN CHO MẮT HỒNG NGOẠI
    // ==========================================
    const connectSerial = async () => {
        try {
            if (!('serial' in navigator)) {
                alert('Trình duyệt không hỗ trợ Web Serial API. Hãy dùng Chrome/Edge.');
                return;
            }
            
            const nav = navigator as unknown as { serial: { requestPort: () => Promise<ISerialPort> } };
            const port = await nav.serial.requestPort();
            
            await port.open({ baudRate: 2400, dataBits: 8, parity: 'none', stopBits: 1 });
            
            //CHÌA KHÓA: Bật công tắc nguồn DTR/RTS cho mắt hồng ngoại
            await port.setSignals({ dataTerminalReady: true, requestToSend: true });

            setPortDetails(port);
            setStatus('Đã kết nối và cấp nguồn cáp thành công!');

            readLoop(port);

        } catch (error) {
            console.error('Lỗi kết nối:', error);
            setStatus('Kết nối thất bại. Hãy kiểm tra xem Terminal v1.9b đã tắt chưa!');
        }
    };

    // Bắn lệnh IP
    // Bắn lệnh IP (Đã fix logic Đánh thức phần cứng)
    const sendIpConfig = async () => {
        if (!portDetails || !portDetails.writable) return;
        try {
            setStatus('Đang đánh thức cổng hồng ngoại...');
            const writer = portDetails.writable.getWriter();
            
            // 1. Gửi chuỗi đánh thức (Preamble Wakeup)
            const wakeupPayload = new Uint8Array([0xFE, 0xFE, 0xFE, 0xFE]);
            await writer.write(wakeupPayload);
            
            // 2. Tạm dừng 500ms cho vi điều khiển của đồng hồ "mở mắt" (RẤT QUAN TRỌNG)
            await new Promise(resolve => setTimeout(resolve, 500));

            setStatus('Đang gửi lệnh cấu hình IP chính thức...');
            // 3. Gửi lệnh chính
            const payload = createIpConfigFrame(ip, portNum);
            await writer.write(payload);
            
            writer.releaseLock();
            setStatus('Đã gửi! Hãy quan sát khung DỮ LIỆU TRẢ VỀ bên dưới...');
        } catch (error) {
            console.error('Lỗi khi gửi dữ liệu:', error);
            setStatus('Lỗi truyền dữ liệu.');
        }
    };

    // Bắn lệnh Đồng bộ thời gian
    const sendTimeCalibration = async () => {
        if (!portDetails || !portDetails.writable) return;
        try {
            setStatus('Đang đánh thức và gửi lệnh đồng bộ thời gian...');
            const writer = portDetails.writable.getWriter();
            
            // 1. Gửi chuỗi đánh thức (Preamble Wakeup) giống các hàm cấu hình khác
            const wakeupPayload = new Uint8Array([0xFE, 0xFE, 0xFE, 0xFE]);
            await writer.write(wakeupPayload);
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Gửi lệnh đồng bộ thời gian chính thức
            const payload = createTimeCalibFrame(new Date());
            await writer.write(payload);
            
            writer.releaseLock();
            setStatus('Đã gửi lệnh đồng bộ thời gian! (Lệnh này không có phản hồi)');
        } catch (error) {
            console.error('Lỗi khi gửi đồng bộ thời gian:', error);
            setStatus('Lỗi truyền dữ liệu.');
        }
    };

    // Bắn lệnh Nhà mạng (APN)
    const sendApnConfig = async () => {
        if (!portDetails || !portDetails.writable) return;
        try {
            setStatus(`Đang đánh thức và gửi cấu hình mạng ${network}...`);
            const writer = portDetails.writable.getWriter();
            
            // 1. Gửi chuỗi đánh thức (Rất quan trọng)
            const wakeupPayload = new Uint8Array([0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE]);
            await writer.write(wakeupPayload);
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Gửi lệnh cấu hình APN
            const payload = APN_COMMANDS[network];
            await writer.write(payload);
            writer.releaseLock();
            
            setStatus('Đã gửi lệnh APN! Đang chờ phản hồi...');
        } catch (error) {
            console.error('Lỗi khi gửi APN:', error);
            setStatus('Lỗi truyền dữ liệu APN.');
        }
    };

    // Bắn lệnh Cấu hình Tần suất gửi
    const sendIntervalConfig = async () => {
        if (!portDetails || !portDetails.writable) return;
        try {
            setStatus('Đang gửi lệnh cấu hình chu kỳ gửi...');
            const writer = portDetails.writable.getWriter();
            
            // Kiểm tra xem người dùng có đang nhập Chu kỳ Ngày hay không
            const isDayMode = parseInt(dayInterval, 10) > 0;

            const payload = createIntervalConfigFrame(
                isDayMode ? 0 : (parseInt(minute, 10) || 0), //Ép phút về 0 nếu đang ở chế độ Ngày
                parseInt(hour, 10) || 0,
                parseInt(dayInterval, 10) || 0,
                parseInt(hourInterval, 10) || 0
            );
            
            await writer.write(payload);
            writer.releaseLock();
            setStatus('Đã gửi lệnh chu kỳ thành công! Đang chờ phản hồi...');
        } catch (error) {
            console.error('Lỗi khi gửi cấu hình chu kỳ:', error);
            setStatus('Lỗi truyền dữ liệu.');
        }
    };

    // Bắn lệnh Đọc dữ liệu đồng hồ (Lệnh 90 4F) - Đã fix địa chỉ Broadcast
    // Bắn lệnh Đọc dữ liệu đồng hồ (Lệnh 90 4F) - Dùng Địa chỉ thực tế
    const readMeterData = async () => {
        if (!portDetails || !portDetails.writable) return;
        try {
            setStatus('Đang đánh thức và yêu cầu đồng hồ trả data...');
            const writer = portDetails.writable.getWriter();
            
            // 1. Gửi chuỗi đánh thức (Tăng lên 10 byte FE cho tia IR đủ mạnh)
            const wakeupPayload = new Uint8Array([0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE]);
            await writer.write(wakeupPayload);
            await new Promise(resolve => setTimeout(resolve, 800));

            // 2. Gửi lệnh đọc data ĐỊCH DANH ĐỒNG HỒ
            const payload = new Uint8Array([
                0xFE, 0xFE, 
                0x68, 0x10, 
                0x01, 0x14, 0x07, 0x25, 0x20, 0x00, 0x00, // ĐÃ SỬA: Địa chỉ thật của đồng hồ em
                0x01, 0x03, 0x90, 0x4F, 0x00,             // Lệnh đọc 90 4F
                0xBC, 0x16                                // ĐÃ SỬA: Checksum = BC
            ]);
            await writer.write(payload);
            writer.releaseLock();
            
            setStatus('Đã gửi lệnh đọc Data! Hãy chờ chuỗi Hex trả về bên dưới...');
        } catch (error) {
            console.error('Lỗi khi đọc data:', error);
            setStatus('Lỗi truyền dữ liệu.');
        }
    };

    const handleDecodeHex = () => {
        const result = parseWaterVolume(hexInput);
        setWaterVolume(result);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '500px', fontFamily: 'system-ui' }}>
            <h2>Cấu Hình LR1100</h2>
            
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#166534' }}>Trạng thái: <strong>{status}</strong></p>
            </div>

            <button onClick={connectSerial} disabled={!!portDetails} style={{ marginBottom: '20px', padding: '10px', cursor: 'pointer', width: '100%', backgroundColor: portDetails ? '#ccc' : '#f59e0b', color: 'white', border: 'none', fontWeight: 'bold' }}>
                1. Mở Cổng COM (Cấp điện IR)
            </button>

            {/* --- PHẦN CẤU HÌNH IP --- */}
            <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Cấu hình IP Server</h4>
                <div style={{ marginBottom: '10px' }}>
                    <input value={ip} onChange={(e) => setIp(e.target.value)} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} placeholder="IP Server" />
                    {ipError && <span style={{ color: 'red', fontSize: '12px' }}>{ipError}</span>}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <input value={portNum} onChange={(e) => setPortNum(e.target.value)} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} placeholder="Port" />
                    {portError && <span style={{ color: 'red', fontSize: '12px' }}>{portError}</span>}
                </div>
                <button onClick={sendIpConfig} disabled={!portDetails || !isFormValid} style={{ padding: '8px', width: '100%', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Bắn lệnh cấu hình IP
                </button>
            </div>

            {/* --- PHẦN CẤU HÌNH NHÀ MẠNG --- */}
            <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Cấu hình Mạng Di Động (APN)</h4>
                <select 
                    value={network} 
                    onChange={(e) => setNetwork(e.target.value as keyof typeof APN_COMMANDS)}
                    style={{ padding: '8px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}
                >
                    <option value="VIETTEL">Viettel (v-internet)</option>
                    <option value="MOBIFONE">Mobifone (m-nbiot)</option>
                    <option value="VINAPHONE">Vinaphone (m3-world)</option>
                </select>
                <button onClick={sendApnConfig} disabled={!portDetails} style={{ padding: '8px', width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Bắn lệnh chọn mạng {network}
                </button>
            </div>

            {/* --- PHẦN CẤU HÌNH TẦN SUẤT GỬI --- */}
            <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Cấu hình Chu kỳ gửi (4G)</h4>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Phút (0-59):</label>
                        <input 
                            type="number" 
                            value={parseInt(dayInterval, 10) > 0 ? '0' : minute} 
                            onChange={(e) => setMinute(e.target.value)} 
                            disabled={parseInt(dayInterval, 10) > 0} //Khóa ô nhập
                            style={{ 
                                padding: '8px', 
                                width: '100%', 
                                boxSizing: 'border-box',
                                backgroundColor: parseInt(dayInterval, 10) > 0 ? '#f3f4f6' : 'white', // Đổi màu nền xám
                                color: parseInt(dayInterval, 10) > 0 ? '#9ca3af' : 'black', // Đổi màu chữ xám
                                cursor: parseInt(dayInterval, 10) > 0 ? 'not-allowed' : 'text' // Đổi icon con trỏ chuột
                            }} 
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Giờ (0-23):</label>
                        <input type="number" value={hour} onChange={(e) => setHour(e.target.value)} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Chu kỳ Ngày:</label>
                        <input type="number" value={dayInterval} onChange={(e) => setDayInterval(e.target.value)} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Chu kỳ Giờ:</label>
                        <input type="number" value={hourInterval} onChange={(e) => setHourInterval(e.target.value)} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                </div>

                <button onClick={sendIntervalConfig} disabled={!portDetails} style={{ padding: '8px', width: '100%', backgroundColor: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Bắn lệnh cấu hình Chu kỳ
                </button>
            </div>

            {/* --- PHẦN CẤU HÌNH ĐỒNG BỘ THỜI GIAN --- */}
            <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0 }}>🕐 Đồng Bộ Thời Gian Đồng Hồ</h4>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '15px' }}>
                    Lệnh này sẽ lấy giờ hiện tại của máy tính và nạp xuống đồng hồ. Đồng hồ sẽ không trả về tín hiệu phản hồi sau khi nhận lệnh.
                </p>
                <button 
                    onClick={sendTimeCalibration} 
                    disabled={!portDetails} 
                    style={{ padding: '10px', width: '100%', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Gửi lệnh đồng bộ thời gian ngay
                </button>
            </div>

            {/* --- NÚT BẤM TEST DATA (TẠM THỜI) --- */}
            <div style={{ border: '2px dashed #dc2626', padding: '15px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fef2f2' }}>
                <h4 style={{ marginTop: 0, color: '#dc2626' }}>Chức năng Test Sóng (Dành cho Debug)</h4>
                <p style={{ fontSize: '12px', color: '#991b1b', marginBottom: '10px' }}>
                    Nút này sẽ ép đồng hồ nôn ra thông số RSRP để kiểm tra xem nó có bắt được sóng NB-IoT hay không.
                </p>
                <button 
                    onClick={readMeterData} 
                    disabled={!portDetails} 
                    style={{ padding: '12px', width: '100%', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    🚨 Đọc thông số sóng Đồng Hồ (RSRP)
                </button>
            </div>
            {/* --- KHUNG HIỂN THỊ DỮ LIỆU NHẬN TỪ ĐỒNG HỒ --- */}
            <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px', backgroundColor: '#f8fafc', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0, color: '#0f172a' }}>Dữ liệu đồng hồ trả về:</h4>
                <div style={{ minHeight: '60px', wordBreak: 'break-all', fontFamily: 'monospace', color: '#b91c1c' }}>
                    {receiveData || <span style={{ color: '#94a3b8' }}>Chưa có dữ liệu...</span>}
                </div>
                <button onClick={() => setReceiveData('')} style={{ marginTop: '10px', fontSize: '12px', padding: '4px 8px', cursor: 'pointer' }}>Xóa log</button>
            </div>

            {/* --- KHUNG DỊCH MÃ HEX (FIX LỖI CỦA ESLINT) --- */}
            <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: '#374151' }}>Tiện ích Giải Mã Data</h4>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Nhập chuỗi Hex lưu lượng nước:</label>
                    <input 
                        value={hexInput} 
                        onChange={(e) => setHexInput(e.target.value)} 
                        style={{ padding: '8px', width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                        placeholder="VD: 00 00 0B 2C"
                    />
                </div>
                <button 
                    onClick={handleDecodeHex} 
                    style={{ padding: '8px', width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '10px' }}
                >
                    Dịch Mã Hex
                </button>
                {waterVolume !== null && (
                    <div style={{ padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px' }}>
                        <p style={{ margin: 0, color: '#0369a1', fontSize: '14px' }}>
                            Kết quả: <strong>{waterVolume} m³</strong>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SerialConfigTool;