// Nhúng file CSS mặc định (nếu cần)
import './App.css'

// 1. IMPORT COMPONENT CỦA EM VÀO ĐÂY
import SerialConfigTool from './SerialConfigTool'

function App() {
  return (
    // 2. TẠO MỘT KHUNG CHỨA (WRAPPER) ĐỂ CĂN GIỮA TOOL TRÊN MÀN HÌNH
    <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        backgroundColor: '#f3f4f6' 
    }}>
      
      {/* 3. GỌI COMPONENT RA ĐỂ HIỂN THỊ */}
      <SerialConfigTool />

    </main>
  )
}

export default App