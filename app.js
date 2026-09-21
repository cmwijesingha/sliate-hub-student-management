// Initialize Dexie.js Database
const db = new Dexie('SLIATE_StudentHub');
db.version(4).stores({
    students: '++id, regNo, nic, fullName, name, gender, whatsapp, mobile, email, address, nickName, cardName, birthday, image'
});

// Helper for Google Drive Image Links
function getGoogleDriveDirectLink(url) {
    if (!url) return '';
    try {
        let id = '';
        const idMatch = url.match(/[-\w]{25,}/);
        if (idMatch && idMatch[0]) {
            id = idMatch[0];
        } else {
            const urlObj = new URL(url);
            id = urlObj.searchParams.get('id');
        }
        if (id) {
            // Using thumbnail API as it is currently the most reliable way to display Drive images without CORS/Auth blocks
            return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
        }
    } catch(e) {}
    return url;
}

// Helper to convert Excel Serial Dates
function excelDateToJSDate(serial) {
    if(isNaN(serial)) return '';
    var utc_days  = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;
    var date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
}

// Helper to calculate countdown
function calculateNextBirthday(bdayStr) {
    if (!bdayStr || bdayStr === '-') return null;
    const now = new Date();
    
    // Parse bday string (YYYY-MM-DD)
    const parts = bdayStr.split(/[-/]/);
    if(parts.length < 3) return null;
    
    let birthMonth, birthDate;
    if (parts[0].length === 4) {
        birthMonth = parseInt(parts[1]) - 1;
        birthDate = parseInt(parts[2]);
    } else {
        birthMonth = parseInt(parts[1]) - 1;
        birthDate = parseInt(parts[0]);
    }
    
    let nextBday = new Date(now.getFullYear(), birthMonth, birthDate, 0, 0, 0, 0);
    let isToday = (now.getDate() === birthDate && now.getMonth() === birthMonth);
    
    if (nextBday < now && !isToday) {
        nextBday.setFullYear(now.getFullYear() + 1);
    }
    
    const diffTime = nextBday.getTime() - now.getTime();
    const diffDays = isToday ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return {
        daysRemaining: diffDays,
        targetTime: nextBday.getTime(),
        isToday: isToday,
        monthDateStr: nextBday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
}

// Live Countdown Formatter
function formatLiveCountdown(targetTime, isToday) {
    if (isToday) return '🎉 Birthday is Today!';
    
    const distance = targetTime - new Date().getTime();
    if (distance <= 0) return '🎉 Birthday is Today!';
    
    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);
    
    return `${d}d ${h}h ${m}m ${s}s`;
}

// Global live updater
setInterval(() => {
    document.querySelectorAll('.live-countdown').forEach(el => {
        const target = parseInt(el.getAttribute('data-target'));
        const isToday = el.getAttribute('data-is-today') === 'true';
        if(target) {
            el.textContent = formatLiveCountdown(target, isToday);
        }
    });
}, 1000);

// DOM Elements
const views = {
    dashboard: document.getElementById('view-dashboard'),
    students: document.getElementById('view-students'),
    'birthday-cards': document.getElementById('view-birthday-cards'),
    print: document.getElementById('view-print'),
    import: document.getElementById('view-import')
};

const navLinks = {
    dashboard: document.getElementById('nav-dashboard'),
    students: document.getElementById('nav-students'),
    'birthday-cards': document.getElementById('nav-birthday-cards'),
    print: document.getElementById('nav-print'),
    import: document.getElementById('nav-import')
};

const pageTitle = document.getElementById('page-title');
const addStudentBtn = document.getElementById('add-student-btn');
const studentsTableBody = document.getElementById('students-table-body');
const searchInput = document.getElementById('search-input');
const excelFileInput = document.getElementById('excel-file-input');
const uploadStatus = document.getElementById('upload-status');
const clearDataBtn = document.getElementById('clear-data-btn');

// Modal Elements
const modal = document.getElementById('student-modal');
const modalContent = document.getElementById('student-modal-content');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const studentForm = document.getElementById('student-form');
const modalTitle = document.getElementById('modal-title');

// View Modal Elements
const viewModal = document.getElementById('view-modal');
const viewModalContent = document.getElementById('view-modal-content');
const closeViewBtn = document.getElementById('close-view-btn');
const viewEditBtn = document.getElementById('view-edit-btn');
let currentViewId = null;

// Bulk Email Elements
const sendBulkEmailBtn = document.getElementById('send-bulk-email-btn');
const bulkEmailModal = document.getElementById('bulk-email-modal');
const bulkEmailModalContent = document.getElementById('bulk-email-modal-content');
const closeBulkEmailBtn = document.getElementById('close-bulk-email-btn');
const cancelBulkEmailBtn = document.getElementById('cancel-bulk-email-btn');
const bulkEmailForm = document.getElementById('bulk-email-form');
const bulkEmailSubject = document.getElementById('bulk-email-subject');
const bulkEmailBody = document.getElementById('bulk-email-body');

// Form Inputs
const inputId = document.getElementById('student-id');
const inputRegNo = document.getElementById('student-regno');
const inputNic = document.getElementById('student-nic');
const inputFullName = document.getElementById('student-fullname');
const inputName = document.getElementById('student-name');
const inputGender = document.getElementById('student-gender');
const inputWhatsapp = document.getElementById('student-whatsapp');
const inputMobile = document.getElementById('student-mobile');
const inputEmail = document.getElementById('student-email');
const inputAddress = document.getElementById('student-address');
const inputNickName = document.getElementById('student-nickname');
const inputCardName = document.getElementById('student-cardname');
const inputBirthday = document.getElementById('student-birthday');
const inputImage = document.getElementById('student-image');

const statTotalStudents = document.getElementById('stat-total-students');
const statMaleStudents = document.getElementById('stat-male-students');
const statFemaleStudents = document.getElementById('stat-female-students');
const upcomingBirthdaysContainer = document.getElementById('upcoming-birthdays-container');
const viewBdayCountdown = document.getElementById('view-bday-countdown');
const viewDownloadBtn = document.getElementById('view-download-btn');

    // New Birthday Card DOM
    const bcardStudentList = document.getElementById('bcard-student-list');
    const bcardSearchInput = document.getElementById('bcard-search-input');
    const bcardPreviewContainer = document.getElementById('bcard-preview-container');
    const bcardImg = document.getElementById('bcard-img');
    const bcardName = document.getElementById('bcard-name');
    const bcardDate = document.getElementById('bcard-date');
    const bcardDownloadBtn = document.getElementById('bcard-download-btn');
    const bcardPlaceholder = document.getElementById('bcard-placeholder');
    let currentBcardStudentName = '';

// Navigation Logic
function switchView(viewName) {
    Object.values(navLinks).forEach(link => {
        link.classList.remove('bg-primary');
        link.classList.add('hover:bg-gray-800');
    });
    navLinks[viewName].classList.add('bg-primary');
    navLinks[viewName].classList.remove('hover:bg-gray-800');

    const titles = { dashboard: 'Overview Dashboard', students: 'Student Directory', 'birthday-cards': 'Birthday Card Generator', print: 'Report Generator (Print PDF)', import: 'Data Management' };
    pageTitle.textContent = titles[viewName];

    if (viewName === 'students') {
        addStudentBtn.classList.remove('hidden');
    } else {
        addStudentBtn.classList.add('hidden');
    }

    Object.values(views).forEach(view => {
        if (view) {
            view.classList.add('hidden');
            view.classList.remove('animate-fade-in');
        }
    });
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
        views[viewName].classList.add('animate-fade-in');
    }

    if (viewName === 'students') loadStudents();
    if (viewName === 'dashboard') loadDashboardStats();
    if (viewName === 'birthday-cards') loadBcardStudents();
    if (viewName === 'print') loadPrintPreview();
}

Object.keys(navLinks).forEach(key => {
    navLinks[key].addEventListener('click', (e) => {
        e.preventDefault();
        switchView(key);
    });
});

// Modal Logic
function openModal(title = 'Add Student') {
    modalTitle.textContent = title;
    modal.classList.remove('hidden');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeModal() {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        studentForm.reset();
        inputId.value = '';
    }, 300);
}

addStudentBtn.addEventListener('click', () => openModal('Add Student'));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Bulk Email Logic
function openBulkEmailModal() {
    bulkEmailModal.classList.remove('hidden');
    setTimeout(() => {
        bulkEmailModalContent.classList.remove('scale-95', 'opacity-0');
        bulkEmailModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeBulkEmailModal() {
    bulkEmailModalContent.classList.remove('scale-100', 'opacity-100');
    bulkEmailModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        bulkEmailModal.classList.add('hidden');
        bulkEmailForm.reset();
    }, 300);
}

if (sendBulkEmailBtn) sendBulkEmailBtn.addEventListener('click', openBulkEmailModal);
if (closeBulkEmailBtn) closeBulkEmailBtn.addEventListener('click', closeBulkEmailModal);
if (cancelBulkEmailBtn) cancelBulkEmailBtn.addEventListener('click', closeBulkEmailModal);
if (bulkEmailModal) {
    bulkEmailModal.addEventListener('click', (e) => {
        if (e.target === bulkEmailModal) closeBulkEmailModal();
    });
}
if (bulkEmailForm) {
    bulkEmailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = bulkEmailSubject.value.trim();
        const body = bulkEmailBody.value.trim();
        
        if (!subject || !body) {
            alert('Please fill in both subject and message body.');
            return;
        }

        try {
            const students = await db.students.toArray();
            const emails = students
                .map(s => s.email ? s.email.trim() : '')
                .filter(email => email !== '');

            if (emails.length === 0) {
                alert('No email addresses found in the database.');
                return;
            }

            const bccList = emails.join(',');
            const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
            closeBulkEmailModal();
        } catch (error) {
            console.error('Error sending bulk email:', error);
            alert('An error occurred while preparing the bulk email.');
        }
    });
}

// View Modal Logic
window.viewStudent = async (id) => {
    try {
        const student = await db.students.get(id);
        if (student) {
            currentViewId = id;
            document.getElementById('view-fullname').textContent = student.fullName || '-';
            document.getElementById('view-name').textContent = student.name || '-';
            document.getElementById('view-regno').textContent = student.regNo || '-';
            document.getElementById('view-nic').textContent = student.nic || '-';
            document.getElementById('view-gender').textContent = student.gender || '-';
            document.getElementById('view-birthday').textContent = student.birthday ? student.birthday.replace(/-/g, ' / ') : '-';
            
            const bdayInfo = calculateNextBirthday(student.birthday);
            if (bdayInfo) {
                viewBdayCountdown.innerHTML = `🎂 <span class="live-countdown" data-target="${bdayInfo.targetTime}" data-is-today="${bdayInfo.isToday}">${formatLiveCountdown(bdayInfo.targetTime, bdayInfo.isToday)}</span> (${bdayInfo.monthDateStr})`;
                viewBdayCountdown.classList.remove('hidden');
            } else {
                viewBdayCountdown.classList.add('hidden');
            }
            
            document.getElementById('view-email').textContent = student.email || '-';
            document.getElementById('view-nickname').textContent = student.nickName || '-';
            document.getElementById('view-cardname').textContent = student.cardName || '-';
            document.getElementById('view-mobile').textContent = student.mobile || '-';
            document.getElementById('view-whatsapp').textContent = student.whatsapp || '-';
            document.getElementById('view-address').textContent = student.address || '-';
            
            const imgEl = document.getElementById('view-image');
            const placeholderEl = document.getElementById('view-image-placeholder');
            
            if (student.image) {
                const directLink = getGoogleDriveDirectLink(student.image);
                imgEl.src = directLink;
                
                viewDownloadBtn.href = directLink;
                viewDownloadBtn.classList.remove('hidden');
                
                imgEl.classList.remove('hidden');
                placeholderEl.classList.add('hidden');
                // handle image load error
                imgEl.onerror = () => {
                    imgEl.classList.add('hidden');
                    placeholderEl.classList.remove('hidden');
                    placeholderEl.textContent = (student.name || student.fullName || '?').charAt(0).toUpperCase();
                };
            } else {
                imgEl.classList.add('hidden');
                placeholderEl.classList.remove('hidden');
                placeholderEl.textContent = (student.name || student.fullName || '?').charAt(0).toUpperCase();
                viewDownloadBtn.classList.add('hidden');
            }

            viewModal.classList.remove('hidden');
            setTimeout(() => {
                viewModalContent.classList.remove('scale-95', 'opacity-0');
                viewModalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        }
    } catch (err) {
        console.error('Error fetching student:', err);
    }
};

function closeViewModal() {
    viewModalContent.classList.remove('scale-100', 'opacity-100');
    viewModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        viewModal.classList.add('hidden');
        currentViewId = null;
    }, 300);
}

closeViewBtn.addEventListener('click', closeViewModal);
viewModal.addEventListener('click', (e) => {
    if (e.target === viewModal) closeViewModal();
});
viewEditBtn.addEventListener('click', () => {
    if(currentViewId) {
        closeViewModal();
        editStudent(currentViewId);
    }
});

// Form Submit (Add/Edit)
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const studentData = {
        regNo: inputRegNo.value.trim(),
        nic: inputNic.value.trim(),
        fullName: inputFullName.value.trim(),
        name: inputName.value.trim(),
        gender: inputGender.value,
        whatsapp: inputWhatsapp.value.trim(),
        mobile: inputMobile.value.trim(),
        email: inputEmail.value.trim(),
        address: inputAddress.value.trim(),
        nickName: inputNickName.value.trim(),
        cardName: inputCardName.value.trim(),
        birthday: inputBirthday.value,
        image: inputImage.value.trim()
    };

    try {
        if (inputId.value) {
            await db.students.update(parseInt(inputId.value), studentData);
        } else {
            await db.students.add(studentData);
        }
        closeModal();
        loadStudents();
    } catch (err) {
        console.error('Error saving student:', err);
        alert('Failed to save student data.');
    }
});

// Render Students Table
async function loadStudents(query = '') {
    studentsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading student records...</td></tr>';
    
    try {
        let students;
        if (query) {
            query = query.toLowerCase();
            students = await db.students.filter(student => {
                return (student.name && student.name.toLowerCase().includes(query)) || 
                       (student.fullName && student.fullName.toLowerCase().includes(query)) || 
                       (student.regNo && String(student.regNo).toLowerCase().includes(query)) ||
                       (student.nic && student.nic.toLowerCase().includes(query)) ||
                       (student.cardName && student.cardName.toLowerCase().includes(query)) ||
                       (student.email && student.email.toLowerCase().includes(query)) ||
                       (student.mobile && student.mobile.includes(query));
            }).toArray();
        } else {
            students = await db.students.toArray();
        }

        if (students.length === 0) {
            studentsTableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center py-16">
                        <div class="flex flex-col items-center text-gray-400">
                            <i class="fas fa-folder-open text-5xl mb-4 text-gray-300"></i>
                            <p class="text-lg font-medium text-gray-500">No students found</p>
                            <p class="text-sm">Try adjusting your search or add a new student.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        studentsTableBody.innerHTML = '';
        students.forEach(student => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50 transition-colors group cursor-pointer';
            
            // Better touch support for viewing student profile
            tr.addEventListener('click', (e) => {
                // If they clicked a button or icon inside a button, do nothing (let the button handle it)
                if(!e.target.closest('button')) {
                    viewStudent(student.id);
                }
            });
            
            const initials = (student.name || student.fullName || '?').charAt(0).toUpperCase();
            const avatarImg = student.image 
                ? `<img src="${getGoogleDriveDirectLink(student.image)}" class="w-10 h-10 rounded-full object-cover shadow-inner border border-blue-200" onerror="this.outerHTML='<div class=\\'w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-secondary flex items-center justify-center font-bold text-sm shadow-inner border border-blue-200\\'>${initials}</div>'">` 
                : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-secondary flex items-center justify-center font-bold text-sm shadow-inner border border-blue-200">${initials}</div>`;

            tr.innerHTML = `
                <td class="py-3 px-6 border-b text-gray-800">${avatarImg}</td>
                <td class="py-3 px-6 border-b text-gray-800 font-semibold">${student.regNo || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.nic || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-800 font-medium">${student.fullName || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.name || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.nickName || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.gender || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.cardName || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500 whitespace-nowrap">${student.birthday ? student.birthday.replace(/-/g, ' / ') : '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.email || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.whatsapp || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500">${student.mobile || '-'}</td>
                <td class="py-3 px-6 border-b text-gray-500 max-w-xs truncate" title="${student.address || ''}">${student.address || '-'}</td>
                <td class="py-3 px-6 border-b text-right transition-opacity sticky right-0 bg-white group-hover:bg-blue-50 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)]">
                    <button onclick="editStudent(${student.id})" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg p-2 mx-1 transition-colors" title="Edit"><i class="fas fa-edit pointer-events-none"></i></button>
                    <button onclick="deleteStudent(${student.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg p-2 mx-1 transition-colors" title="Delete"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </td>
            `;
            studentsTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading students:', err);
        studentsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to load data.</td></tr>';
    }
}

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadStudents(e.target.value);
    }, 300);
});

// Edit Student
window.editStudent = async (id) => {
    try {
        const student = await db.students.get(id);
        if (student) {
            inputId.value = student.id;
            inputRegNo.value = student.regNo || '';
            inputNic.value = student.nic || '';
            inputFullName.value = student.fullName || '';
            inputName.value = student.name || '';
            inputGender.value = student.gender || '';
            inputWhatsapp.value = student.whatsapp || '';
            inputMobile.value = student.mobile || '';
            inputEmail.value = student.email || '';
            inputAddress.value = student.address || '';
            inputNickName.value = student.nickName || '';
            inputCardName.value = student.cardName || '';
            inputBirthday.value = student.birthday || '';
            inputImage.value = student.image || '';
            openModal('Edit Student Record');
        }
    } catch (err) {
        console.error('Error fetching student:', err);
    }
};

// Delete Student
window.deleteStudent = async (id) => {
    if (confirm('Are you absolutely sure you want to delete this student record? This action cannot be undone.')) {
        try {
            await db.students.delete(id);
            loadStudents();
        } catch (err) {
            console.error('Error deleting student:', err);
        }
    }
};

// Clear All Data
clearDataBtn.addEventListener('click', async () => {
    if (confirm('⚠️ WARNING: This will permanently delete ALL student records from the database. Are you absolutely sure?')) {
        const password = prompt('Type "DELETE" to confirm:');
        if (password === 'DELETE') {
            try {
                await db.students.clear();
                loadStudents();
                alert('All database records have been cleared successfully.');
            } catch (err) {
                console.error('Error clearing data:', err);
                alert('Failed to clear data.');
            }
        } else if (password !== null) {
            alert('Confirmation failed. Data was not deleted.');
        }
    }
});

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const students = await db.students.toArray();
        statTotalStudents.textContent = students.length.toLocaleString();
        
        const maleCount = students.filter(s => s.gender === 'Male' || s.gender === 'ස්ත්රී / පුරුෂ භාවය Male' || (s.gender && s.gender.toLowerCase().includes('male') && !s.gender.toLowerCase().includes('female'))).length;
        const femaleCount = students.filter(s => s.gender === 'Female' || (s.gender && s.gender.toLowerCase().includes('female'))).length;
        
        statMaleStudents.textContent = maleCount.toLocaleString();
        statFemaleStudents.textContent = femaleCount.toLocaleString();
        
        const bdays = students.map(s => {
            const b = calculateNextBirthday(s.birthday);
            return b ? { ...s, daysRemaining: b.daysRemaining, targetTime: b.targetTime, isToday: b.isToday, bdayDisplay: b.monthDateStr } : null;
        }).filter(s => s !== null).sort((a, b) => a.daysRemaining - b.daysRemaining);
        
        upcomingBirthdaysContainer.innerHTML = '';
        if(bdays.length === 0) {
            upcomingBirthdaysContainer.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">No upcoming birthdays found.</div>';
        } else {
            bdays.slice(0, 6).forEach(s => {
                const initials = (s.name || s.fullName || '?').charAt(0).toUpperCase();
                const avatar = s.image 
                    ? `<img src="${getGoogleDriveDirectLink(s.image)}" class="w-12 h-12 rounded-full object-cover shadow-sm">`
                    : `<div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-secondary flex items-center justify-center font-bold shadow-sm">${initials}</div>`;
                
                upcomingBirthdaysContainer.innerHTML += `
                    <div class="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative" onclick="viewStudent(${s.id})">
                        ${avatar}
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-gray-800 truncate">${s.name || s.fullName}</h4>
                            <p class="text-sm text-gray-500"><i class="fas fa-calendar-alt mr-1"></i>${s.bdayDisplay}</p>
                        </div>
                        ${s.daysRemaining === 0 ? `
                        <button onclick="event.stopPropagation(); generateBcardFromDashboard(${s.id})" class="absolute -top-3 -right-3 bg-secondary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white hover:scale-105 transition-transform"><i class="fas fa-magic mr-1"></i> Card</button>
                        ` : ''}
                        <div class="bg-blue-50 text-secondary font-bold px-3 py-1.5 rounded-lg text-sm whitespace-nowrap text-center live-countdown" data-target="${s.targetTime}" data-is-today="${s.isToday}">
                            ${formatLiveCountdown(s.targetTime, s.isToday)}
                        </div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// Excel Import Logic
excelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", cellDates: true });
            
            processExcelData(jsonData);
        } catch (err) {
            console.error("File processing error:", err);
            alert("Could not process the file. Please ensure it's a valid Excel or CSV file.");
            uploadStatus.classList.add('hidden');
            excelFileInput.value = '';
        }
    };
    reader.onerror = () => {
        alert("Error reading file.");
        uploadStatus.classList.add('hidden');
        excelFileInput.value = '';
    }
    reader.readAsArrayBuffer(file);
});

async function processExcelData(data) {
    if (data.length === 0) {
        alert("The uploaded file appears to be empty.");
        uploadStatus.classList.add('hidden');
        excelFileInput.value = '';
        return;
    }

    try {
        const studentsToAdd = data.map(row => {
            const getVal = (keys) => {
                // 1. Try exact matches first
                for (let key of keys) {
                    const cleanKey = key.toLowerCase().replace(/\s/g, '');
                    const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '') === cleanKey);
                    if (foundKey) return row[foundKey];
                }
                // 2. Try substring matches
                for (let key of keys) {
                    const cleanKey = key.toLowerCase().replace(/\s/g, '');
                    const foundKey = Object.keys(row).find(k => {
                        const cleanK = k.toLowerCase().replace(/\s/g, '');
                        // Prevent short card keys from matching nickname headers
                        if ((cleanKey === 'card' || cleanKey === 'caed' || cleanKey === 'කාඩ්') && 
                            (cleanK.includes('nickname') || cleanK.includes('සඳහන්කළයුතුනම') || cleanK.includes('සඳහන්'))) {
                            return false;
                        }
                        return cleanK.includes(cleanKey);
                    });
                    if (foundKey) return row[foundKey];
                }
                return '';
            };

            let rawBday = getVal(['ඔබේ උපන්දිනය / Your Birthday', 'birthday', 'dob', 'birth', 'උපන්']);
            let formattedBday = String(rawBday).trim();
            if (rawBday && typeof rawBday === 'number') {
                formattedBday = excelDateToJSDate(rawBday);
            } else if (rawBday instanceof Date && !isNaN(rawBday.getTime())) {
                // It's already a JS Date object (from Excel serial number)
                formattedBday = rawBday.toISOString().split('T')[0];
            } else if (formattedBday) {
                // If it is a string like DD/MM/YYYY or DD-MM-YYYY
                const dmyMatch = formattedBday.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
                if (dmyMatch) {
                    let day = dmyMatch[1].padStart(2, '0');
                    let month = dmyMatch[2].padStart(2, '0');
                    let year = dmyMatch[3];
                    if (parseInt(month) > 12) {
                        let temp = day;
                        day = month;
                        month = temp;
                    }
                    formattedBday = `${year}-${month}-${day}`;
                } else {
                    const pd = new Date(formattedBday);
                    if (!isNaN(pd.getTime())) {
                        const offset = pd.getTimezoneOffset() * 60000;
                        formattedBday = new Date(pd.getTime() - offset).toISOString().split('T')[0];
                    }
                }
            }

            return {
                regNo: String(getVal(['ලියාපදිංචි අංකය (Registration Number)', 'RegisterNumber', 'reg', 'id', 'index'])).trim(),
                nic: String(getVal(['NICNumber', 'nic', 'national'])).trim(),
                fullName: String(getVal(['සම්පූර්ණ නම / Full Name', 'FullName'])).trim(),
                name: String(getVal(['Namewithinitials', 'name', 'initials'])).trim(),
                gender: String(getVal(['(ස්ත්රී / පුරුෂ භාවය) Gender', 'Gender', 'sex'])).trim(),
                whatsapp: String(getVal(['ඔබේ WhatsApp අංකය ඇතුළත් කරන්න (Whatsapp Number)', 'whatsappNumber', 'whatsapp'])).trim(),
                mobile: String(getVal(['MobileNumber', 'mobile', 'phone'])).trim(),
                email: String(getVal(['gmail', 'email', 'mail', 'ඊමේල්'])).trim(),
                address: String(getVal(['පදිංචි ලිපිනය (Permanent Address)', 'පදිංචිලිපිනය(permanentaddress)', 'පදිංචි', 'ලිපිනය', 'permanentaddress', 'permanetaddress', 'permanent', 'homeaddress'])).trim(),
                nickName: String(getVal(['කාඩ් එකේ සඳහන් කළ යුතු නම / Name for the Card (Nickname)', 'NickName', 'nickname', 'නම'])).trim(),
                cardName: String(getVal(['caed name', 'card name', 'කාඩ් පත', 'කාඩ් එක', 'කාඩ් එකේ නම', 'කාඩ් නම', 'කාඩ්පත', 'කාඩ්පතේ නම', 'කාඩ්', 'කාඩ් වර්ගය', 'caedname', 'cardname', 'card', 'caed'])).trim(),
                birthday: formattedBday,
                image: String(getVal(['ඔබේ පැහැදිලි ඡායාරූපයක් ලබා දෙන්න / Upload your clear photo', 'image', 'googlr', 'drive', 'photo', 'link', 'ඡායාරූපය'])).trim()
            };
        });

        const validStudents = studentsToAdd.filter(s => s.regNo || s.fullName || s.name);

        if (validStudents.length === 0) {
            alert("No valid student data found in the file. Please check your column headers.");
            uploadStatus.classList.add('hidden');
            excelFileInput.value = '';
            return;
        }

        await db.students.bulkAdd(validStudents);
        
        uploadStatus.classList.add('hidden');
        excelFileInput.value = '';
        alert(`Success! Imported ${validStudents.length} student records.`);
        switchView('students'); 
    } catch (err) {
        console.error('Error saving imported data to DB:', err);
        uploadStatus.classList.add('hidden');
        excelFileInput.value = '';
        alert('An error occurred while saving the data to the database.');
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    switchView('dashboard');
    initPrintViewListeners();
});

// Birthday Card Generator Logic
async function loadBcardStudents(query = '') {
    bcardStudentList.innerHTML = '<div class="text-center text-gray-400 py-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</div>';
    try {
        let students = await db.students.toArray();
        if (query) {
            query = query.toLowerCase();
            students = students.filter(student => 
                (student.name && student.name.toLowerCase().includes(query)) || 
                (student.fullName && student.fullName.toLowerCase().includes(query)) ||
                (student.nickName && student.nickName.toLowerCase().includes(query))
            );
        }
        
        // Sort by upcoming birthdays
        students = students.map(s => {
            const b = calculateNextBirthday(s.birthday);
            return b ? { ...s, daysRemaining: b.daysRemaining, bdayDisplay: b.monthDateStr } : null;
        }).filter(s => s !== null).sort((a, b) => a.daysRemaining - b.daysRemaining);

        bcardStudentList.innerHTML = '';
        if (students.length === 0) {
            bcardStudentList.innerHTML = '<div class="text-center text-gray-400 py-6">No students found</div>';
            return;
        }

        students.forEach(s => {
            const initials = (s.name || s.fullName || '?').charAt(0).toUpperCase();
            const avatar = s.image 
                ? `<img src="${getGoogleDriveDirectLink(s.image)}" class="w-10 h-10 rounded-full object-cover">`
                : `<div class="w-10 h-10 rounded-full bg-blue-100 text-secondary flex items-center justify-center font-bold">${initials}</div>`;
            
            bcardStudentList.innerHTML += `
                <div class="p-3 mb-2 bg-white hover:bg-blue-50 rounded-lg border border-gray-100 cursor-pointer flex items-center gap-3 transition-colors group" onclick="generateBcardUI(${s.id})">
                    ${avatar}
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-gray-800 text-sm truncate group-hover:text-primary transition-colors">${s.name || s.fullName}</p>
                        <p class="text-xs text-gray-500">${s.bdayDisplay} • ${s.daysRemaining === 0 ? 'Today!' : s.daysRemaining + ' days'}</p>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300 group-hover:text-primary transition-colors"></i>
                </div>
            `;
        });
    } catch(err) {
        console.error(err);
    }
}

if(bcardSearchInput) {
    bcardSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadBcardStudents(e.target.value);
        }, 300);
    });
}

window.generateBcardFromDashboard = (id) => {
    switchView('birthday-cards');
    setTimeout(() => generateBcardUI(id), 100);
};

window.generateBcardUI = async (id) => {
    try {
        const student = await db.students.get(id);
        if (!student) return;
        
        bcardPlaceholder.classList.add('hidden');
        bcardPreviewContainer.classList.remove('hidden');
        bcardDownloadBtn.classList.remove('hidden');
        
        // Use a CORS proxy to allow html2canvas to draw the Google Drive image without tainting the canvas
        const originalImg = getGoogleDriveDirectLink(student.image);
        const proxiedImg = originalImg ? `https://corsproxy.io/?${encodeURIComponent(originalImg)}` : '';
        
        if(proxiedImg) {
            bcardImg.src = proxiedImg;
            bcardImg.classList.remove('hidden');
        } else {
            bcardImg.classList.add('hidden');
        }
        
        currentBcardStudentName = (student.nickName || student.name || student.fullName || 'Student').split(' ')[0];
        bcardName.textContent = student.nickName || student.name || student.fullName;
        
        if(student.birthday) {
            const parts = student.birthday.split(/[-/]/);
            if(parts.length >= 3) {
                let m, d;
                if(parts[0].length === 4) { m = parts[1]; d = parts[2]; } 
                else { m = parts[1]; d = parts[0]; }
                
                const dateObj = new Date(new Date().getFullYear(), parseInt(m)-1, parseInt(d));
                const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
                bcardDate.textContent = `${new Date().getFullYear()} ${monthName} ${d.padStart(2, '0')}`;
            } else {
                bcardDate.textContent = student.birthday;
            }
        }
    } catch(err) {
        console.error(err);
    }
};

if(bcardDownloadBtn) {
    bcardDownloadBtn.addEventListener('click', async () => {
        const originalText = bcardDownloadBtn.innerHTML;
        bcardDownloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
        bcardDownloadBtn.disabled = true;
        
        try {
            const canvas = await html2canvas(bcardPreviewContainer, {
                useCORS: true,
                allowTaint: false,
                scale: 2, // 2x scale for high resolution
                backgroundColor: null
            });
            
            const link = document.createElement('a');
            link.download = `Birthday_Card_${currentBcardStudentName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch(err) {
            console.error('html2canvas error:', err);
            alert('Failed to generate image. This is often caused by external image security restrictions (CORS).');
        } finally {
            bcardDownloadBtn.innerHTML = originalText;
            bcardDownloadBtn.disabled = false;
        }
    });
}

// Report Generator (Print PDF) Logic
const printColumnsMap = {
    regNo: 'Reg No',
    nic: 'NIC Number',
    fullName: 'Full Name',
    name: 'Name w/ Initials',
    nickName: 'Nick Name',
    gender: 'Gender',
    cardName: 'Card Name',
    birthday: 'Birthday',
    email: 'Email',
    whatsapp: 'WhatsApp',
    mobile: 'Mobile',
    address: 'Permanent Address'
};

async function loadPrintPreview() {
    const printTitleInput = document.getElementById('print-title');
    const printOrientationSelect = document.getElementById('print-orientation');
    const previewSheet = document.getElementById('print-preview-sheet');
    const printGenderFilter = document.getElementById('print-gender-filter');
    
    if (!printTitleInput || !printOrientationSelect || !previewSheet) return;
    
    // Set orientation classes/styles
    if (printOrientationSelect.value === 'landscape') {
        previewSheet.style.maxWidth = '1000px';
        previewSheet.style.minHeight = '700px';
    } else {
        previewSheet.style.maxWidth = '800px';
        previewSheet.style.minHeight = '1000px';
    }
    
    // Set current date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportDateEl = document.getElementById('preview-report-date');
    if (reportDateEl) reportDateEl.textContent = formattedDate;
    
    // Get title value
    const titleVal = printTitleInput.value.trim() || 'Student Details Report';
    const reportTitleEl = document.getElementById('preview-report-title');
    if (reportTitleEl) reportTitleEl.textContent = titleVal;
    
    // Determine which columns are checked
    const selectedColumns = [];
    Object.keys(printColumnsMap).forEach(colId => {
        const cb = document.getElementById(`col-${colId}`);
        if (cb && cb.checked) {
            selectedColumns.push({ id: colId, label: printColumnsMap[colId] });
        }
    });
    
    // Load student data from Dexie
    let students = [];
    try {
        students = await db.students.toArray();
    } catch (err) {
        console.error('Error loading students for preview:', err);
    }
    
    // Render preview table header
    const previewTableHead = document.getElementById('preview-table-head');
    const previewTableBody = document.getElementById('preview-table-body');
    if (!previewTableHead || !previewTableBody) return;
    
    if (selectedColumns.length === 0) {
        previewTableHead.innerHTML = `<tr><th class="py-2 px-3 border border-gray-300 text-center">No columns selected</th></tr>`;
        previewTableBody.innerHTML = `
            <tr>
                <td class="py-10 text-center text-gray-400 font-medium">
                    Please select at least one column from the settings on the left.
                </td>
            </tr>`;
        return;
    }
    
    let headHtml = '<tr>';
    selectedColumns.forEach(col => {
        headHtml += `<th class="py-2 px-3 border border-gray-300 font-semibold text-gray-700 bg-gray-50 uppercase tracking-wider text-[10px]">${col.label}</th>`;
    });
    headHtml += '</tr>';
    previewTableHead.innerHTML = headHtml;
    
    // Render preview table body
    if (students.length === 0) {
        previewTableBody.innerHTML = `
            <tr>
                <td colspan="${selectedColumns.length}" class="py-16 text-center text-gray-400 font-medium">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-folder-open text-4xl mb-3 text-gray-300"></i>
                        <p>No student records in the database.</p>
                        <p class="text-xs mt-1 text-gray-400">Go to "Import Data" or "Students" tab to add records.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    const genderFilter = printGenderFilter ? printGenderFilter.value : 'all';
    
    // Helpers to determine gender
    const isMale = (s) => s.gender === 'Male' || s.gender === 'ස්ත්රී / පුරුෂ භාවය Male' || (s.gender && s.gender.toLowerCase().includes('male') && !s.gender.toLowerCase().includes('female'));
    const isFemale = (s) => s.gender === 'Female' || (s.gender && s.gender.toLowerCase().includes('female'));
    
    function renderStudentRow(student, cols) {
        let rowHtml = '<tr class="hover:bg-gray-50 transition-colors">';
        cols.forEach(col => {
            let val = student[col.id] || '-';
            if (col.id === 'birthday' && val && val !== '-') {
                val = val.replace(/-/g, ' / ');
            }
            rowHtml += `<td class="py-2 px-3 border border-gray-200 truncate max-w-[150px]" title="${val}">${val}</td>`;
        });
        rowHtml += '</tr>';
        return rowHtml;
    }
    
    let bodyHtml = '';
    
    if (genderFilter === 'male') {
        const filteredStudents = students.filter(isMale);
        if (filteredStudents.length === 0) {
            bodyHtml = `<tr><td colspan="${selectedColumns.length}" class="py-8 text-center text-gray-400">No male students found.</td></tr>`;
        } else {
            filteredStudents.forEach(student => {
                bodyHtml += renderStudentRow(student, selectedColumns);
            });
        }
    } else if (genderFilter === 'female') {
        const filteredStudents = students.filter(isFemale);
        if (filteredStudents.length === 0) {
            bodyHtml = `<tr><td colspan="${selectedColumns.length}" class="py-8 text-center text-gray-400">No female students found.</td></tr>`;
        } else {
            filteredStudents.forEach(student => {
                bodyHtml += renderStudentRow(student, selectedColumns);
            });
        }
    } else if (genderFilter === 'split') {
        const males = students.filter(isMale);
        const females = students.filter(isFemale);
        const others = students.filter(s => !isMale(s) && !isFemale(s));
        
        if (males.length > 0) {
            bodyHtml += `<tr class="bg-sky-50 font-bold"><td colspan="${selectedColumns.length}" class="py-2 px-3 border border-gray-300 text-sky-800 text-xs uppercase">Male Students (${males.length})</td></tr>`;
            males.forEach(student => {
                bodyHtml += renderStudentRow(student, selectedColumns);
            });
        }
        if (females.length > 0) {
            bodyHtml += `<tr class="bg-pink-50 font-bold"><td colspan="${selectedColumns.length}" class="py-2 px-3 border border-gray-300 text-pink-800 text-xs uppercase">Female Students (${females.length})</td></tr>`;
            females.forEach(student => {
                bodyHtml += renderStudentRow(student, selectedColumns);
            });
        }
        if (others.length > 0) {
            bodyHtml += `<tr class="bg-gray-100 font-bold"><td colspan="${selectedColumns.length}" class="py-2 px-3 border border-gray-300 text-gray-700 text-xs uppercase">Unspecified/Other (${others.length})</td></tr>`;
            others.forEach(student => {
                bodyHtml += renderStudentRow(student, selectedColumns);
            });
        }
        if (males.length === 0 && females.length === 0 && others.length === 0) {
            bodyHtml = `<tr><td colspan="${selectedColumns.length}" class="py-8 text-center text-gray-400">No student records found.</td></tr>`;
        }
    } else {
        // all
        students.forEach(student => {
            bodyHtml += renderStudentRow(student, selectedColumns);
        });
    }
    
    previewTableBody.innerHTML = bodyHtml;
}

async function generateReportPDF() {
    const printTitleInput = document.getElementById('print-title');
    const printOrientationSelect = document.getElementById('print-orientation');
    const printGenderFilter = document.getElementById('print-gender-filter');
    
    if (!printTitleInput || !printOrientationSelect) return;
    
    const titleVal = printTitleInput.value.trim() || 'Student Details Report';
    const orientation = printOrientationSelect.value;
    const genderFilter = printGenderFilter ? printGenderFilter.value : 'all';
    
    // Determine which columns are checked
    const selectedColumns = [];
    Object.keys(printColumnsMap).forEach(colId => {
        const cb = document.getElementById(`col-${colId}`);
        if (cb && cb.checked) {
            selectedColumns.push({ id: colId, label: printColumnsMap[colId] });
        }
    });
    
    if (selectedColumns.length === 0) {
        alert('Please select at least one column to print.');
        return;
    }
    
    let students = [];
    try {
        students = await db.students.toArray();
    } catch (err) {
        console.error('Error fetching students for printing:', err);
        alert('Failed to fetch student data.');
        return;
    }
    
    if (students.length === 0) {
        alert('No student records found to print.');
        return;
    }
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Helpers to determine gender
    const isMale = (s) => s.gender === 'Male' || s.gender === 'ස්ත්රී / පුරුෂ භාවය Male' || (s.gender && s.gender.toLowerCase().includes('male') && !s.gender.toLowerCase().includes('female'));
    const isFemale = (s) => s.gender === 'Female' || (s.gender && s.gender.toLowerCase().includes('female'));
    
    function renderPrintRow(student, cols) {
        return `
            <tr>
                ${cols.map(col => {
                    let val = student[col.id] || '-';
                    if (col.id === 'birthday' && val && val !== '-') {
                        val = val.replace(/-/g, ' / ');
                    }
                    return `<td>${val}</td>`;
                }).join('')}
            </tr>
        `;
    }
    
    let tableBodyHtml = '';
    
    if (genderFilter === 'male') {
        const filteredStudents = students.filter(isMale);
        if (filteredStudents.length === 0) {
            tableBodyHtml = `<tr><td colspan="${selectedColumns.length}" style="text-align: center; color: #94a3b8; padding: 20px;">No male students found.</td></tr>`;
        } else {
            tableBodyHtml = filteredStudents.map(student => renderPrintRow(student, selectedColumns)).join('');
        }
    } else if (genderFilter === 'female') {
        const filteredStudents = students.filter(isFemale);
        if (filteredStudents.length === 0) {
            tableBodyHtml = `<tr><td colspan="${selectedColumns.length}" style="text-align: center; color: #94a3b8; padding: 20px;">No female students found.</td></tr>`;
        } else {
            tableBodyHtml = filteredStudents.map(student => renderPrintRow(student, selectedColumns)).join('');
        }
    } else if (genderFilter === 'split') {
        const males = students.filter(isMale);
        const females = students.filter(isFemale);
        const others = students.filter(s => !isMale(s) && !isFemale(s));
        
        if (males.length > 0) {
            tableBodyHtml += `
                <tr style="background-color: #e0f2fe; font-weight: bold;">
                    <td colspan="${selectedColumns.length}" style="padding: 8px 10px; font-size: 8.5pt; color: #0369a1; text-transform: uppercase; border: 1px solid #cbd5e1; font-weight: 700;">Male Students (${males.length})</td>
                </tr>
            `;
            tableBodyHtml += males.map(student => renderPrintRow(student, selectedColumns)).join('');
        }
        if (females.length > 0) {
            tableBodyHtml += `
                <tr style="background-color: #fce7f3; font-weight: bold;">
                    <td colspan="${selectedColumns.length}" style="padding: 8px 10px; font-size: 8.5pt; color: #be185d; text-transform: uppercase; border: 1px solid #cbd5e1; font-weight: 700;">Female Students (${females.length})</td>
                </tr>
            `;
            tableBodyHtml += females.map(student => renderPrintRow(student, selectedColumns)).join('');
        }
        if (others.length > 0) {
            tableBodyHtml += `
                <tr style="background-color: #f1f5f9; font-weight: bold;">
                    <td colspan="${selectedColumns.length}" style="padding: 8px 10px; font-size: 8.5pt; color: #475569; text-transform: uppercase; border: 1px solid #cbd5e1; font-weight: 700;">Unspecified/Other (${others.length})</td>
                </tr>
            `;
            tableBodyHtml += others.map(student => renderPrintRow(student, selectedColumns)).join('');
        }
        if (males.length === 0 && females.length === 0 && others.length === 0) {
            tableBodyHtml = `<tr><td colspan="${selectedColumns.length}" style="text-align: center; color: #94a3b8; padding: 20px;">No student records found.</td></tr>`;
        }
    } else {
        // all
        tableBodyHtml = students.map(student => renderPrintRow(student, selectedColumns)).join('');
    }
    
    let printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${titleVal}</title>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            @page {
                size: A4 ${orientation};
                margin: 15mm;
            }
            
            body {
                font-family: 'Inter', sans-serif;
                color: #1e293b;
                margin: 0;
                padding: 0;
                font-size: 9pt;
                line-height: 1.4;
            }
            
            .header {
                text-align: center;
                border-bottom: 2px solid #082f49;
                padding-bottom: 12px;
                margin-bottom: 25px;
            }
            
            .header h1 {
                font-size: 18pt;
                font-weight: 700;
                color: #082f49;
                margin: 0 0 6px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .header p {
                font-size: 10pt;
                color: #64748b;
                margin: 0;
                font-weight: 500;
            }
            
            .header .date {
                font-size: 8pt;
                color: #94a3b8;
                margin-top: 4px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                page-break-inside: auto;
            }
            
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            
            th {
                background-color: #f8fafc;
                color: #334155;
                font-weight: 600;
                border: 1px solid #cbd5e1;
                padding: 8px 10px;
                font-size: 8pt;
                text-align: left;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            td {
                border: 1px solid #e2e8f0;
                padding: 8px 10px;
                font-size: 8pt;
                color: #334155;
                word-break: break-word;
                vertical-align: top;
            }
            
            tr:nth-child(even) {
                background-color: #f8fafc;
            }
            
            .footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 7.5pt;
                color: #94a3b8;
                border-top: 1px solid #f1f5f9;
                padding-top: 8px;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${titleVal}</h1>
            <p>SLIATE Anuradhapura • HNDA Department</p>
            ${genderFilter !== 'all' ? `<p style="font-weight: 600; color: #082f49; margin-top: 4px; text-transform: capitalize;">Filter: ${genderFilter === 'split' ? 'Split by Gender' : genderFilter + 's only'}</p>` : ''}
            <p class="date">Report Generated: ${formattedDate}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    ${selectedColumns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableBodyHtml}
            </tbody>
        </table>
        
        <div class="footer">
            HNDA Student Information Management System • Report Details
        </div>
    </body>
    </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up blocker is enabled. Please allow pop-ups to generate the report PDF.');
        return;
    }
    
    printWindow.document.write(printHtml);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
}

function initPrintViewListeners() {
    const printTitleInput = document.getElementById('print-title');
    const printOrientationSelect = document.getElementById('print-orientation');
    const printGenderFilter = document.getElementById('print-gender-filter');
    const printGenerateBtn = document.getElementById('print-generate-btn');
    
    if (printTitleInput) {
        printTitleInput.addEventListener('input', loadPrintPreview);
    }
    if (printOrientationSelect) {
        printOrientationSelect.addEventListener('change', loadPrintPreview);
    }
    if (printGenderFilter) {
        printGenderFilter.addEventListener('change', loadPrintPreview);
    }
    if (printGenerateBtn) {
        printGenerateBtn.addEventListener('click', generateReportPDF);
    }
    
    Object.keys(printColumnsMap).forEach(colId => {
        const cb = document.getElementById(`col-${colId}`);
        if (cb) {
            cb.addEventListener('change', loadPrintPreview);
        }
    });
}
