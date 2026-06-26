import socket
import requests

# Cấu hình mạng
UDP_IP = "0.0.0.0"   # Lắng nghe mọi IP
UDP_PORT = 7002      # Cổng hứng data từ đồng hồ
TB_HOST = "172.16.0.186" # IP của máy chủ ThingsBoard

# Mở trạm thu sóng UDP
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"[*] Python Mini-Gateway đang hoạt động! Lắng nghe UDP tại cổng {UDP_PORT}...")

while True:
    data, addr = sock.recvfrom(2048) # Hứng gói tin
    
    # 1. TÌM HEADER GÓI TIN (68 10)
    try:
        start = data.index(b'\x68\x10')
    except ValueError:
        continue # Không phải gói tin đồng hồ thì bỏ qua
        
    print(f"\n[+] Đã bắt được gói tin từ {addr} ({len(data)} bytes)")
    
    # 2. GIẢI MÃ MÃ SERIAL / MAC (Định danh thiết bị)
    # 7 byte Serial được gửi ngược, cần cắt và đảo chiều
    sn_bytes = data[start+2 : start+9]
    serial_num = "".join([f"{b:02X}" for b in reversed(sn_bytes)])
    
    # 3. BÓC TÁCH TELEMETRY (Nếu đúng lệnh 90 4F)
    if data[start+11] == 0x90 and data[start+12] == 0x4F:
        d_start = start + 14 # Dữ liệu bắt đầu từ vị trí này
        
        # Lưu lượng tổng (4 byte -> m3)
        total_flow = int.from_bytes(data[d_start : d_start+4], byteorder='big') / 1000.0
        
        # Nhiệt độ (2 byte -> chia 10)
        temp = int.from_bytes(data[d_start+18 : d_start+20], byteorder='big') / 10.0
        
        # Điện áp pin (1 byte -> nhân 2, chia 100)
        battery = (data[d_start+29] * 2) / 100.0
        
        # Cường độ sóng RSRP (2 byte, có dấu âm dương)
        rsrp = int.from_bytes(data[d_start+33 : d_start+35], byteorder='big', signed=True)

        # Đóng gói thành JSON
        payload = {
            "Total_Flow": total_flow,
            "Temperature": temp,
            "Battery_Voltage": battery,
            "RSRP_Signal_Strength": rsrp
        }
        print(f"[*] Dữ liệu giải mã: {payload}")
        
        # 4. GỬI LÊN THINGSBOARD BẰNG API HTTP
        tb_url = f"http://{TB_HOST}:8080/api/v1/{serial_num}/telemetry"
        try:
            res = requests.post(tb_url, json=payload)
            print(f"[+] HTTP POST thành công (Token: {serial_num}) -> Mã Server trả về: {res.status_code}")
        except Exception as e:
            print(f"[-] Lỗi gửi lên ThingsBoard: {e}")