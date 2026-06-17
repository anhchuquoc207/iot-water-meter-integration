/**
 * Hàm dịch ngược chuỗi Hex trả về từ đồng hồ thành số khối nước (m3)
 * @param {string} hexString - Chuỗi Hex từ thiết bị (VD: "00 00 0B 2C")
 * @returns {number} - Số khối nước (VD: 2.86)
 */
function parseWaterVolume(hexString) {
    // Bước 1: Xóa bỏ tất cả các khoảng trắng trong chuỗi
    // "00 00 0B 2C" -> "00000B2C"
    const cleanHex = hexString.replace(/\s/g, '');

    // Bước 2: Chuyển đổi chuỗi Hex thành số nguyên (Hệ thập phân 10)
    // parseInt("00000B2C", 16) sẽ ra kết quả là 2860
    const decimalValue = parseInt(cleanHex, 16);

    // Bước 3: Theo tài liệu, 2860 tương đương 2.86m3 -> Ta cần chia cho 1000
    const volumeInCubicMeters = decimalValue / 1000;

    return volumeInCubicMeters;
}

// ==========================================
// THỰC THI KIỂM THỬ (CHẠY ĐỘC LẬP BẰNG NODE.JS)
// ==========================================

const responseFromMeter = "00 00 0B 2C"; // Giả lập dữ liệu thiết bị gửi lên
const waterVolume = parseWaterVolume(responseFromMeter);

console.log("------------------------------------");
console.log("📥 Dữ liệu thô (Hex) :", responseFromMeter);
console.log("💧 Lưu lượng nước   :", waterVolume, "m³");
console.log("------------------------------------");

// Test thêm với một số ảo (VD: 15B3 ở trang 12 là lưu lượng tức thời)
console.log("📥 Dữ liệu thô (Hex) :", "15 B3");
console.log("💧 Lưu lượng tức thời:", parseWaterVolume("15 B3"), "m³/h");