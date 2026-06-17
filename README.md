# 🚰 LR1100 Smart Water Meter - IoT Integration

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![ThingsBoard](https://img.shields.io/badge/ThingsBoard-305680?style=for-the-badge&logo=thingsboard&logoColor=white)
![Web Serial API](https://img.shields.io/badge/Web_Serial_API-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 📖 Overview
This project provides a comprehensive software solution for configuring and monitoring the **LR1100 Ultrasonic Smart Water Meter**. It was developed during my internship program at SVTECH and consists of two main modules:
1. **Web Configuration Tool:** A ReactJS application using the Web Serial API to communicate directly with the meter via an IR (Infrared) cable.
2. **IoT Payload Decoder:** A JavaScript Data Converter designed for the ThingsBoard IoT Platform to parse raw Hex payloads via 4G network into readable telemetry data.

## ✨ Key Features
* **Direct Hardware Communication:** Read/Write configuration directly to the hardware using `Web Serial API` (Baud rate 2400, CJ/T-188 Protocol).
* **Smart UI/UX:** Auto-validation and foolproof logic for setting transmission intervals (e.g., auto-locking minutes when daily cycle is selected).
* **Telemetry Decoding:** Parses total water volume, temperature, battery voltage, and RSRP signal strength.
* **Advanced Alarms:** Bitwise extraction to detect hardware states such as **Empty Pipe** and **Leakage Alarm**.
* **Auto-provisioning:** Dynamically extracts the MAC ID from the payload to auto-register devices on ThingsBoard.

## 📂 Project Structure

    /
    ├── src/                  # ReactJS Web Configuration Tool source code
    ├── public/               # Web public assets
    ├── thingsboard-script/   # Contains decoder.js (Uplink Data Converter)
    └── docs/                 # Hardware manuals & wiring diagrams


## 🛠️ Technologies Used
* **Frontend:** React, TypeScript, Web Serial API
* **IoT Platform:** ThingsBoard (Rule Chains, Data Converters, Dashboards)
* **Protocol:** CJ/T-188 (Hexadecimal payload)
