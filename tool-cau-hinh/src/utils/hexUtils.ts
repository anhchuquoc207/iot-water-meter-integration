/**
 * File chứa các hàm tiện ích xử lý dữ liệu Hexadecimal cho đồng hồ LR1100
 */

/**
 * 1. Dịch ngược chuỗi Hex báo lưu lượng thành số khối nước (m3)
 * @param hexString - Chuỗi Hex từ thiết bị (VD: "00 00 0B 2C")
 * @returns Số khối nước (VD: 2.86)
 */
export const parseWaterVolume = (hexString: string): number => {
    // Xóa khoảng trắng và chuyển sang hệ thập phân
    const cleanHex = hexString.replace(/\s/g, '');
    
    // Nếu chuỗi rỗng hoặc không hợp lệ, trả về 0 để không làm sập UI
    if (!cleanHex) return 0;

    const decimalValue = parseInt(cleanHex, 16);
    
    // Theo datasheet: giá trị thập phân chia 1000
    return decimalValue / 1000;
};

/**
 * 2. Dịch ngược chuỗi Hex báo nhiệt độ
 * @param hexString - Chuỗi Hex từ thiết bị (VD: "00 C8")
 * @returns Nhiệt độ C (VD: 20.0)
 */
export const parseTemperature = (hexString: string): number => {
    const cleanHex = hexString.replace(/\s/g, '');
    if (!cleanHex) return 0;

    const decimalValue = parseInt(cleanHex, 16);
    
    // Theo datasheet trang 12: 0x00C8 = 200 = 20.0°C -> Chia cho 10
    return decimalValue / 10;
};

/**
 * 3. Đóng gói IP và Port thành mảng Byte (Uint8Array) để bắn xuống cổng USB
 * Hàm này thay thế cho đoạn logic lặp lại bên trong component React
 * @param ip - Dải IP (VD: "120.76.28.220")
 * @param portNum - Cổng (VD: "80")
 * @returns Mảng byte sẵn sàng truyền qua Web Serial API
 */
/**
 * 3. Tạo Frame cấu hình IP và Port chuẩn của thiết bị LR1100
 * Tự động tính toán Checksum theo chuẩn của Siargo.
 */
export const createIpConfigFrame = (ip: string, portNum: string): Uint8Array => {
    // 1. Chuyển đổi IP và Port sang số nguyên
    const ipParts = ip.split('.').map(part => parseInt(part, 10));
    
    const portInt = parseInt(portNum, 10);
    const portHigh = (portInt >> 8) & 0xFF;
    const portLow = portInt & 0xFF;

    // 2. Tạo phần thân dữ liệu (Từ byte 68 đến hết Port) - Tương đương ô D5 đến D24 trong Excel
    const body = [
        0x68, 0x10,                                     // Mã Start và Control
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,       // 7 byte địa chỉ Broadcast
        0x24, 0x09,                                     // Lệnh ghi và Độ dài data
        0xF1, 0x19, 0x00,                               // Register IP
        ...ipParts,                                     // 4 byte IP
        portHigh, portLow                               // 2 byte Port
    ];

    // 3. Tính Checksum (Tổng các byte của body Modulo 256)
    const checksum = body.reduce((sum, byte) => sum + byte, 0) % 256;

    // 4. Ghép hoàn chỉnh Frame: [FE, FE] + [Body] + [Checksum] + [16]
    return new Uint8Array([0xFE, 0xFE, ...body, checksum, 0x16]);
};

/**
 * 4. Các mã lệnh (Hardcode) cấu hình APN Nhà mạng
 * Lấy trực tiếp từ file HDSD.docx
 */
export const APN_COMMANDS = {
    VIETTEL: new Uint8Array([0xFE, 0xFE, 0x68, 0x01, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0x24, 0x07, 0xF0, 0x2A, 0x00, 0x00, 0x00, 0x38, 0xFF, 0x8B, 0x16]),
    MOBIFONE: new Uint8Array([0xFE, 0xFE, 0x68, 0x01, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0x24, 0x07, 0xF0, 0x2A, 0x00, 0x01, 0x00, 0x38, 0xFF, 0x8C, 0x16]),
    VINAPHONE: new Uint8Array([0xFE, 0xFE, 0x68, 0x01, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0x24, 0x07, 0xF0, 0x2A, 0x00, 0x02, 0x00, 0x38, 0xFF, 0x8D, 0x16])
};

/**
 * 5. Tạo Frame cấu hình Tần suất gửi dữ liệu 4G
 * Dựa theo tài liệu: Register F1 11, độ dài data 0B (11 byte)
 * @param minute - Phút cố định (0-59). Để 0 nếu muốn random.
 * @param hour - Giờ cố định (0-23). Để 0 nếu muốn random.
 * @param dayInterval - Chu kỳ theo ngày (Ví dụ: 1 = mỗi ngày 1 lần). Nếu dùng thì hourInterval = 0.
 * @param hourInterval - Chu kỳ theo giờ (Ví dụ: 1 = mỗi 1 giờ 1 lần). Nếu dùng thì dayInterval = 0.
 */
export const createIntervalConfigFrame = (
    minute: number, 
    hour: number, 
    dayInterval: number, 
    hourInterval: number
): Uint8Array => {
    // 1. Tạo phần thân dữ liệu (Body)
    const body = [
        0x68, 0x10,                                     // Mã Start và Control
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA,       // 7 byte địa chỉ Broadcast
        0x04, 0x0B,                                     // Lệnh Write (0x04) và Độ dài data (0x0B = 11 byte)
        0xF1, 0x11, 0x00,                               // Mã Register cấu hình chu kỳ (F1 11 00)
        minute,                                         // Tham số 1: Phút
        hour,                                           // Tham số 2: Giờ
        dayInterval,                                    // Tham số 3: Chế độ Ngày
        hourInterval,                                   // Tham số 4: Chế độ Giờ
        0x00, 0x00, 0x00, 0x00                          // 4 byte dự phòng theo chuẩn tài liệu
    ];

    // 2. Tính Checksum (Tổng các byte của body Modulo 256)
    const checksum = body.reduce((sum, byte) => sum + byte, 0) % 256;

    // 3. Đóng gói Frame hoàn chỉnh
    return new Uint8Array([0xFE, 0xFE, ...body, checksum, 0x16]);
};