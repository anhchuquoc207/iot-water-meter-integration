import socket

# Đây là một gói tin "Đọc lưu lượng" hoàn chỉnh được copy từ tài liệu chuẩn của LR1100 (trang 12)
# Gói tin này chứa thông tin lưu lượng, IMEI, tín hiệu sóng...
hex_data = "FE FE 68 10 01 00 00 00 00 00 00 81 B2 90 4F 00 00 00 0B 2C FF FF B3 74 00 00 00 80 00 00 0A AC 15 B3 00 C8 04 4A 17 00 00 25 02 21 20 B8 12 02 00 FF 89 00 0B 22 06 07 18 0B 00 00 3D 01 00 00 95 01 00 00 FD 01 00 00 BC 02 00 00 DD 03 00 00 0E 05 00 00 2F 06 00 00 4C 07 00 00 7C 08 00 00 F6 09 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 B7 0A 00 00 20 04 4A 00 00 0B 2C 00 00 0B 2C FF 38 00 64 08 66 69 30 57 61 66 38 04 60 04 82 50 70 69 79 15 26 16 2D 01 10 01 B5 2B 16"

# Chuyển chuỗi Hex thành mảng byte thô (raw bytes)
byte_data = bytes.fromhex(hex_data.replace(" ", ""))

# Khởi tạo súng bắn UDP
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Bắn thẳng vào IP nội bộ của Service anh Nhân (Vì em đang ở công ty nên xài IP nội bộ được)
TARGET_IP = "172.16.0.166"
TARGET_PORT = 7002

print(f"Đang bắn gói tin giả lập vào {TARGET_IP}:{TARGET_PORT} ...")
sock.sendto(byte_data, (TARGET_IP, TARGET_PORT))
print("Hoàn tất!")