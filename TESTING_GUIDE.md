# 🎓 SCAAMS TIMETABLE SYSTEM - TESTING GUIDE

## 🔑 LOGIN CREDENTIALS

### 👨‍🎓 STUDENT LOGIN
- **Email**: `cse2024001@college.edu` (or any student email)
- **Password**: `password123`
- **Section**: 1CSE-A (First Year Computer Science)

### 👨‍🏫 FACULTY LOGIN  
- **Email**: `srinivas.reddy.cse@college.edu` (HOD of CSE)
- **Password**: `faculty123`
- **Department**: Computer Science Engineering

### 🛡️ ADMIN LOGIN
- **Email**: `admin@college.edu`
- **Password**: `admin123`
- **Access**: Full system administration

## 🌐 ACCESS URLS

### Frontend Application
- **URL**: http://localhost:5173 (or whatever port Vite shows)
- **Login Page**: Select your role and enter credentials

### Backend API
- **URL**: http://localhost:5000
- **API Documentation**: Check endpoints below

## 📅 TIMETABLE FEATURES TO TEST

### 1. STUDENT TIMETABLE VIEW
✅ **Grid Layout**: 8 time slots × 5 days
✅ **Subject Display**: Truncated names with full details on hover
✅ **Faculty Information**: Shows assigned faculty for each class
✅ **Room Information**: Shows classroom numbers
✅ **Color Coding**: Different colors for subject types
✅ **Lunch Break**: Clearly marked lunch period

### 2. FACULTY TIMETABLE VIEW
✅ **Weekly Schedule**: All assigned classes across sections
✅ **Section Information**: Shows which section each class is for
✅ **Subject Details**: Complete subject information
✅ **Room Assignments**: Classroom numbers for each class
✅ **Time Management**: Clear time slot organization

### 3. INTERACTIVE FEATURES
✅ **Hover Effects**: Full details on mouse hover
✅ **Color Legend**: Subject type identification guide
✅ **Responsive Design**: Works on mobile and desktop
✅ **Print Friendly**: Clean printable version

## 🎯 TESTING STEPS

### STEP 1: STUDENT LOGIN TEST
1. Go to frontend URL
2. Select "Student" role
3. Enter student credentials
4. Navigate to Dashboard
5. View "Weekly Timetable" section
6. Test hover effects on timetable cells
7. Verify color coding works correctly

### STEP 2: FACULTY LOGIN TEST
1. Logout from student account
2. Select "Faculty" role  
3. Enter faculty credentials
4. Navigate to Dashboard
5. Click "My Schedule" tab
6. View weekly faculty schedule
7. Test hover effects and section information

### STEP 3: ADMIN VERIFICATION
1. Login as admin
2. Navigate to Admin Dashboard
3. Check "Sections" tab to verify student assignments
4. Check "Timetables" tab to view all schedules
5. Verify data consistency across views

## 📊 SAMPLE DATA VERIFICATION

### STUDENT TIMETABLE (1CSE-A)
- **Monday 9AM**: Engineering Mathematics I (Raghavendra, CHEM-Lab-101)
- **Tuesday 10AM**: Programming in C (Rajani, SH-301)
- **Wednesday 1PM**: Digital Logic Design (Pavan Kumar, E-Lab-101)
- **Thursday 3PM**: Engineering Graphics (Raghavendra, TR-103)
- **Friday 4PM**: Engineering Chemistry (Rajani, MPR-101)

### FACULTY TIMETABLE (Srinivas Reddy)
- **Multiple sections**: 1CSE-A, 1CSE-B, 2CSE-A, 2CSE-B, etc.
- **Subject variety**: Mathematics, Physics, Programming, etc.
- **Room assignments**: Lecture halls, labs, tutorial rooms
- **Time distribution**: Balanced across the week

## 🎨 VISUAL FEATURES TO CHECK

### COLOR CODING
- 🔵 **Blue**: Lab subjects (Programming, Digital Logic)
- 🟣 **Purple**: Drawing/Graphics subjects
- 🟢 **Green**: Mathematics subjects
- 🟠 **Orange**: Physics/Chemistry subjects
- 🟦 **Indigo**: Programming/Data subjects
- 🩷 **Pink**: Project Work subjects
- ⚫ **Gray**: Other Theory subjects

### HOVER TOOLTIPS
- Full subject name
- Complete faculty name
- Full room number
- Subject type classification

## 📱 RESPONSIVE TESTING
- **Desktop**: Full grid layout visible
- **Tablet**: Horizontal scrolling if needed
- **Mobile**: Stacked vertical layout

## 🖨️ PRINT TESTING
- Use browser print function (Ctrl+P)
- Verify clean black and white layout
- Check that all information is readable

## 🐛 TROUBLESHOOTING

### COMMON ISSUES
1. **Empty Timetable**: Check if student has section assigned
2. **Missing Data**: Verify API endpoints are working
3. **Display Issues**: Check browser console for errors
4. **Login Problems**: Verify user credentials exist

### DEBUGGING STEPS
1. Open browser developer tools (F12)
2. Check Network tab for API calls
3. Verify API responses in Console tab
4. Check for JavaScript errors

## 📞 SUPPORT
If you encounter any issues:
1. Check browser console for errors
2. Verify backend server is running
3. Confirm database connections
4. Test API endpoints directly

---

## 🎉 READY TO TEST!

The complete timetable system is now operational with:
- ✅ Professional grid layout
- ✅ Color-coded subjects
- ✅ Interactive hover effects
- ✅ Student and faculty views
- ✅ Responsive design
- ✅ Print functionality

**Start testing with the provided credentials!** 🚀
