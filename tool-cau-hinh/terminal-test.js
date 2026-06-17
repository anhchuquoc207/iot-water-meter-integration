import { SerialPort } from 'serialport';

// Lệnh ĐỌC dữ liệu tổng quát (Lấy từ file Excel cuối cùng em gửi)
const READ_COMMAND = Buffer.from([
    0xFE, 0xFE, 0x68, 0x10, 
    0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 
    0x01, 0x03, 0x90, 0x4F, 0x00, 
    0x5C, 0x16
]);

async function startTerminal() {
    console.log("🔍 Đang quét các cổng COM trên máy tính...");
    
    try {
        const ports = await SerialPort.list();
        const usbPorts = ports.filter(p => p.pnpId || p.manufacturer);
        
        if (usbPorts.length === 0) {
            console.log("❌ Không tìm thấy cáp USB. Hãy kiểm tra lại kết nối vật lý!");
            console.log("Danh sách cổng ảo hiện có:", ports.map(p => p.path).join(", "));
            return;
        }

        // Chọn cổng USB đầu tiên tìm thấy
        // Tìm đích danh cáp CP2102
        const targetPort = ports.find(p => p.manufacturer?.includes('Silicon') || p.pnpId?.includes('CP210'));
        if (!targetPort) {
            console.log("❌ Không tìm thấy cáp CP2102. Hãy kiểm tra lại!");
            return;
        }
        const targetPath = targetPort.path;
        console.log(`✅ Đã tìm thấy thiết bị ở cổng: ${targetPath}`);
        
        // Mở kết nối đúng thông số (BaudRate 2400, 8N1)
        const port = new SerialPort({
            path: targetPath,
            baudRate: 2400,
            dataBits: 8,       // 👈 Thêm dòng này
            parity: 'none',    // 👈 Thêm dòng này
            stopBits: 1,
            autoOpen: false
        });

        port.open((err) => {
            if (err) {
                console.error("❌ Lỗi mở cổng:", err.message);
                return;
            }
            console.log(`🔌 Đã mở ${targetPath} thành công!`);

            // 💡 ĐÂY LÀ CHÌA KHÓA: Bật nguồn (DTR, RTS) cho cáp hồng ngoại
            port.set({ dtr: true, rts: true }, (setErr) => {
                if (setErr) console.error("Lỗi bật DTR/RTS:", setErr);
                
                console.log("⚡ Đã cấp nguồn cho mắt hồng ngoại. Đang gửi lệnh...");
                
                // Đợi 1 giây cho cáp nạp đủ điện rồi mới bắn lệnh
                setTimeout(() => {
                    port.write(READ_COMMAND, (writeErr) => {
                        if (writeErr) console.error("❌ Lỗi gửi lệnh:", writeErr.message);
                        else console.log("🚀 Đã gửi lệnh ĐỌC xuống đồng hồ!\n");
                    });
                }, 1000);
            });
        });

        // Lắng nghe dữ liệu thiết bị cãi lại (Phản hồi)
        port.on('data', (data) => {
            const hexString = data.toString('hex').toUpperCase();
            const formattedHex = hexString.match(/.{1,2}/g).join(' ');
            console.log(`📥 [ĐỒNG HỒ TRẢ VỀ]: ${formattedHex}`);
        });

    } catch (error) {
        console.error("Lỗi khi chạy tool:", error);
    }
}

startTerminal();