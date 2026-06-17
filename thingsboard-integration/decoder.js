function decodePayload(hexString) {
    var hexArray = hexString.replace(/\s/g, '').match(/.{1,2}/g);
    if (!hexArray) return {};

    var bytes = hexArray.map(function(h) { return parseInt(h, 16); });

    var startIndex = bytes.indexOf(0x68);
    if (startIndex === -1) return { error: "Frame không hợp lệ (Thiếu mã 68)" };

    var dataStart = startIndex + 11;
    // --- TRÍCH XUẤT MÃ ID ĐỒNG HỒ ---
    var addressBytes = bytes.slice(startIndex + 2, startIndex + 9);
    
    var meterId = addressBytes.reverse().map(function(b) {
        return ('0' + b.toString(16).toUpperCase()).slice(-2);
    }).join('');

    if (bytes[dataStart] !== 0x90 || bytes[dataStart + 1] !== 0x4F) {
        return { error: "Không phải payload dữ liệu nước" };
    }

    // --- HÀM BỔ TRỢ ---
    function getUint32(offset) {
        return bytes[dataStart + offset] * 16777216 +
               bytes[dataStart + offset + 1] * 65536 +
               bytes[dataStart + offset + 2] * 256 +
               bytes[dataStart + offset + 3];
    }

    function getInt16(offset) {
        var val = (bytes[dataStart + offset] << 8) | bytes[dataStart + offset + 1];
        if (val > 0x7FFF) val -= 0x10000;
        return val;
    }

    //DỊCH
    var result = {};
    result.water_volume = getUint32(3) / 1000.0;

    var tempRaw = (bytes[dataStart + 21] << 8) | bytes[dataStart + 22];
    result.temperature = tempRaw / 10.0;

    var batteryRaw = bytes[dataStart + 32];
    result.battery_voltage = (batteryRaw * 2) / 100.0;

    result.rsrp = getInt16(36);

    //PHÂN TÍCH BYTE TRẠNG THÁI
    var status1 = bytes[dataStart + 34];
    var status2 = bytes[dataStart + 35];

    var isValveClosed = (status1 & 0x02) !== 0; 
    var isLeakAlarm = (status1 & 0x80) !== 0;   

    var isEmptyPipe = (status2 & 0x01) !== 0;   

    result.valve_status = isValveClosed ? "closed" : "open";
    result.leak_alarm = isLeakAlarm;
    result.empty_pipe = isEmptyPipe;

    var tbOutput = {
        deviceName: meterId,
        deviceType: "Water_Meter_LR1100",
        telemetry: {
            "water_volume": result.water_volume,
            "temperature": result.temperature,
            "battery_voltage": result.battery_voltage,
            "rsrp": result.rsrp,
            "valve_status": result.valve_status,
            "leak_alarm": result.leak_alarm,
            "empty_pipe": result.empty_pipe
        }
    };

    return tbOutput;
}

// ==========================================
// ĐOẠN CODE ĐỂ EM TỰ TEST TRÊN MÁY TÍNH
// ==========================================
var hexMau = "FE FE 68 10 01 00 00 00 00 00 00 81 B2 90 4F 00 00 00 0B 2C FF FF B3 74 00 00 00 80 00 00 0A AC 15 B3 00 C8 04 4A 17 00 00 25 02 21 20 B8 12 82 01 FF 89 00 0B 22 06 07";
console.log("Kết quả dịch mã:");
console.log(JSON.stringify(decodePayload(hexMau), null, 2));