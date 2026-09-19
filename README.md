# 🎓 Smart Campus Attendance & Academic Management System (SCAAMS)

[![Stack](https://img.shields.io/badge/Stack-MERN-blue.svg)](https://github.com/dhanushmatcha/SCAAMS)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-v18%2B-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18%2B-61dafb.svg)](https://reactjs.org/)

**SCAAMS** (Smart Campus Attendance & Academic Management System) is an enterprise-grade, modern MERN stack web application built to streamline campus administrative workflows, automated attendance tracking, academic workload distribution, timetable optimization, and secure role-based communication for Higher Education Institutions.

---

## 🌟 Key Features

### 🔐 1. Authentication & Security
- **Role-Based Access Control (RBAC)**: Distinct permissions and dashboards for **Admin**, **Faculty**, and **Student**.
- **JSON Web Token (JWT)**: Secure stateless authentication with cookie & authorization header interceptors.
- **Bcrypt Hashing**: All passwords and temporary credentials are stored strictly as bcrypt hashes in MongoDB.
- **Automated Forgot Password**: Instant email password reset flow powered by **Nodemailer** and **Gmail SMTP**, generating secure temporary passwords (`SCAAMS####`).

### 👨‍🏫 2. Faculty Portal
- **Attendance Management**: Quick single-click attendance marking for assigned sections.
- **Timetable & Conflict Resolution**: Automated lab hour assignment, workload balancing, and conflict detection.
- **Assignment & Marks Hub**: Upload question papers, assign coursework, and record internal exam marks.
- **Profile Customization**: Manage bios, skills, experience, and contact information.

### 🎓 3. Student Portal
- **Attendance Analytics**: Visual percentage tracking with threshold alerts.
- **Fee Management**: Detailed breakdown of academic tuition, hostel fees, and payment status.
- **Exam Results & Grades**: Section-wise subject grade reports.
- **Interactive Notifications**: Real-time broadcast alerts for assignment deadlines and notices via Socket.io.

### 🛡️ 4. Administration & Management
- **Department & Section Management**: Create and configure sections, academic calendars, and classroom capacities.
- **Faculty Workload Analysis**: Advanced algorithmic workload distribution and conflict resolution scripts.
- **Hardware Integration API**: Dedicated endpoints for smart IoT attendance hardware devices.

---

## 🛠️ Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Axios, React Router v6, Socket.io Client |
| **Backend** | Node.js, Express.js, Socket.io, Morgan, Helmet, CORS |
| **Database** | MongoDB, Mongoose ORM (Supports Local MongoDB & MongoDB Atlas Cloud) |
| **Authentication & Mail** | JSON Web Token (JWT), Bcrypt, Nodemailer (Gmail SMTP) |

---

## 📁 Project Structure

```text
SCAAMS/
├── backend/
│   ├── config/             # Database connection setup (Mongoose)
│   ├── controllers/        # Business logic (Auth, Admin, Faculty, Student)
│   ├── middleware/         # Auth protection & role permission middlewares
│   ├── models/             # Mongoose schemas (User, Section, Subject, Attendance, etc.)
│   ├── routes/             # REST API endpoints
│   ├── utils/              # Email delivery utility (sendEmail.js)
│   ├── seed_test_users.js  # Seeding script for test faculty & student accounts
│   ├── server.js           # Express server entry point & Socket.io setup
│   ├── .env.example        # Environment variable template
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # Reusable UI components (ForgotPassword, Navbar, etc.)
    │   ├── context/        # React Context (AuthContext, ErrorContext)
    │   ├── pages/          # View pages (Login, Admin, Faculty, Student dashboards)
    │   ├── services/       # Axios API client interceptors
    │   ├── App.jsx         # App router & protected routes
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **MongoDB** (Local instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

---

### 1. Clone the Repository
```bash
git clone https://github.com/dhanushmatcha/SCAAMS.git
cd SCAAMS
```

---

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside `backend/`:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables in `.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/scaams
   JWT_SECRET=supersecretscaamsjwtkey123

   # Gmail SMTP Email Setup
   EMAIL_USER=your-admin-email@gmail.com
   EMAIL_APP_PASSWORD=your-16-character-gmail-app-password
   ```

5. Seed test accounts into MongoDB:
   ```bash
   node seed_test_users.js
   ```

6. Start the backend server:
   ```bash
   npm start
   # or for development:
   node server.js
   ```

---

### 3. Frontend Setup
1. Open a new terminal window and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside `frontend/`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
4. Start the React development server:
   ```bash
   npm run dev
   ```
5. Open your browser and visit: `http://localhost:5173/`

---

## 🧪 Pre-configured Test Accounts

You can immediately test the application using these seeded accounts (Default Password: `Password@123`):

| Role | Name | Email | Unique Identifier |
| :--- | :--- | :--- | :--- |
| **Faculty** | Dhanush Matcha | `dhanushmatcha7@gmail.com` | `FAC_DHANUSH` |
| **Faculty** | Nikhil Sahith | `dhanushmatcha.ai@gmail.com` | `FAC_NIKHIL` |
| **Faculty** | Sohith Naidu | `dhanush.nani2006@gmail.com` | `FAC_SOHITH` |
| **Student** | Danny | `231fa04518@gmail.com` | `231FA04518` |
| **Student** | Rishi | `231fa04503@gmail.com` | `231FA04503` |

---

## 🔑 Forgot Password & Email Configuration

SCAAMS features an automated temporary password recovery flow:
1. User clicks **"Forgot Password?"** on the login page and enters their registered email.
2. The backend generates a temporary password following the format `SCAAMS####` (e.g. `SCAAMS5736`).
3. The password is `bcrypt`-hashed and saved to MongoDB.
4. An email is dispatched via Gmail SMTP from `SCAAMS Admin <EMAIL_USER>` to the user's inbox containing the plain temporary password.

> [!TIP]
> **Gmail App Password Setup**:
> 1. Go to [Google Account Security](https://myaccount.google.com/security).
> 2. Ensure **2-Step Verification** is enabled.
> 3. Go to [App Passwords](https://myaccount.google.com/apppasswords), create an app password named `SCAAMS`.
> 4. Copy the 16-character passcode into `backend/.env` as `EMAIL_APP_PASSWORD`.

---

## 📡 Main API Endpoints

### Auth Endpoints
- `POST /api/auth/register` — Register a new user (Admin)
- `POST /api/auth/login` — User authentication & JWT issuance
- `POST /api/auth/forgot-password` — Generate & email temporary password (`SCAAMS####`)
- `POST /api/auth/reset-request` — Verify identity via Email / ID
- `GET  /api/auth/me` — Fetch currently authenticated user profile

### Academic & Attendance Endpoints
- `GET  /api/student/dashboard` — Fetch student attendance & exam metrics
- `GET  /api/faculty/sections` — Fetch faculty assigned sections & schedules
- `POST /api/attendance/mark` — Record section attendance
- `GET  /api/timetable` — Fetch section & faculty timetables

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Maintainer

Developed & Maintained by **[Dhanush Matcha](https://github.com/dhanushmatcha)**.
