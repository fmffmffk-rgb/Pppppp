// حالة التطبيق
let currentUser = null;
let allPosts = [];
let allUsers = [];

// عناصر DOM
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const postsSection = document.getElementById('postsSection');
const newPostSection = document.getElementById('newPostSection');
const adminSection = document.getElementById('adminSection');

// الروابط
const homeLink = document.getElementById('homeLink');
const postsLink = document.getElementById('postsLink');
const newPostLink = document.getElementById('newPostLink');
const adminLink = document.getElementById('adminLink');

// أزرار المصادقة
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

// النماذج
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const newPostForm = document.getElementById('newPostForm');

// حاويات المحتوى
const postsContainer = document.getElementById('postsContainer');
const adminPostsContainer = document.getElementById('adminPostsContainer');
const usersTable = document.querySelector('#usersTable tbody');

// عناصر القائمة
const authButtons = document.getElementById('authButtons');
const userMenu = document.getElementById('userMenu');
const usernameDisplay = document.getElementById('usernameDisplay');

// إحصائيات المدير
const totalUsersEl = document.getElementById('totalUsers');
const totalPostsEl = document.getElementById('totalPosts');

// التنبيهات
const notification = document.getElementById('notification');

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadPosts();
    setupEventListeners();
    showSection('posts');
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // الروابط
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('posts');
    });
    
    postsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('posts');
    });
    
    newPostLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            showSection('newPost');
        } else {
            showSection('login');
        }
    });
    
    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser && currentUser.isAdmin) {
            showSection('admin');
            loadAdminData();
        } else {
            showNotification('غير مصرح بالوصول إلى لوحة التحكم', 'error');
        }
    });
    
    // أزرار المصادقة
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('login');
    });
    
    registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('register');
    });
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('register');
    });
    
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('login');
    });
    
    // النماذج
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    newPostForm.addEventListener('submit', handleNewPost);
    
    // علامات تبويب لوحة التحكم
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

// التحقق من حالة الجلسة
async function checkSession() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.isLoggedIn) {
            currentUser = data.user;
            updateUIForLoggedInUser();
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('خطأ في التحقق من الجلسة:', error);
    }
}

// تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUIForLoggedInUser();
            showSection('posts');
            showNotification('تم تسجيل الدخول بنجاح', 'success');
            loadPosts();
        } else {
            showNotification(data.error || 'خطأ في تسجيل الدخول', 'error');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// تسجيل مستخدم جديد
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // التحقق من صحة المدخلات
    if (username.length < 3 || username.length > 20) {
        showNotification('اسم المستخدم يجب أن يكون بين 3 و20 حرفاً', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('كلمتا المرور غير متطابقتين', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول', 'success');
            showSection('login');
            // تنظيف الحقول
            document.getElementById('registerForm').reset();
        } else {
            showNotification(data.error || 'خطأ في إنشاء الحساب', 'error');
        }
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// تسجيل الخروج
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        updateUIForLoggedOutUser();
        showSection('posts');
        showNotification('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
}

// نشر منشور جديد
async function handleNewPost(e) {
    e.preventDefault();
    
    const content = document.getElementById('postContent').value;
    
    if (!content.trim()) {
        showNotification('الرجاء إدخال محتوى للمنشور', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('تم نشر المنشور بنجاح', 'success');
            document.getElementById('postContent').value = '';
            showSection('posts');
            loadPosts();
        } else {
            showNotification(data.error || 'خطأ في نشر المنشور', 'error');
        }
    } catch (error) {
        console.error('خطأ في نشر المنشور:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// تحميل المنشورات
async function loadPosts() {
    const loadingEl = document.getElementById('loadingPosts');
    const noPostsEl = document.getElementById('noPosts');
    
    loadingEl.classList.remove('hidden');
    noPostsEl.classList.add('hidden');
    
    try {
        const response = await fetch('/api/posts');
        allPosts = await response.json();
        
        displayPosts(allPosts);
        
        if (allPosts.length === 0) {
            noPostsEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('خطأ في تحميل المنشورات:', error);
        showNotification('خطأ في تحميل المنشورات', 'error');
    } finally {
        loadingEl.classList.add('hidden');
    }
}

// عرض المنشورات
function displayPosts(posts) {
    postsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash"></i>
                <h3>لا توجد منشورات بعد</h3>
                <p>كن أول من يشارك منشوراً!</p>
            </div>
        `;
        return;
    }
    
    posts.forEach(post => {
        const postDate = new Date(post.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-meta">
                <span class="post-author">
                    <i class="fas fa-user"></i> ${escapeHtml(post.username)}
                </span>
                <span class="post-date">
                    <i class="far fa-clock"></i> ${postDate}
                </span>
            </div>
        `;
        
        postsContainer.appendChild(postElement);
    });
}

// تحميل بيانات لوحة التحكم
async function loadAdminData() {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
        // تحميل المستخدمين
        const usersResponse = await fetch('/api/admin/users');
        allUsers = await usersResponse.json();
        displayUsers(allUsers);
        totalUsersEl.textContent = allUsers.length;
        
        // تحميل المنشورات للإدارة
        const postsResponse = await fetch('/api/posts');
        const posts = await postsResponse.json();
        displayAdminPosts(posts);
        totalPostsEl.textContent = posts.length;
    } catch (error) {
        console.error('خطأ في تحميل بيانات المدير:', error);
        showNotification('خطأ في تحميل بيانات المدير', 'error');
    }
}

// عرض المستخدمين في لوحة التحكم
function displayUsers(users) {
    usersTable.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const userDate = new Date(user.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.is_admin ? '<span class="badge">مدير</span>' : '<span class="badge">مستخدم</span>'}</td>
            <td>${userDate}</td>
        `;
        
        usersTable.appendChild(row);
    });
}

// عرض المنشورات في لوحة التحكم
function displayAdminPosts(posts) {
    adminPostsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        adminPostsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash"></i>
                <h3>لا توجد منشورات</h3>
            </div>
        `;
        return;
    }
    
    posts.forEach(post => {
        const postDate = new Date(post.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const postElement = document.createElement('div');
        postElement.className = 'post-card admin-post';
        postElement.innerHTML = `
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-meta">
                <div>
                    <span class="post-author">
                        <i class="fas fa-user"></i> ${escapeHtml(post.username)}
                    </span>
                    <span class="post-date">
                        <i class="far fa-clock"></i> ${postDate}
                    </span>
                </div>
                <button class="btn btn-danger delete-post-btn" data-id="${post.id}">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        `;
        
        adminPostsContainer.appendChild(postElement);
    });
    
    // إضافة مستمعي الأحداث لأزرار الحذف
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const postId = e.target.closest('.delete-post-btn').getAttribute('data-id');
            if (confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
                await deletePost(postId);
            }
        });
    });
}

// حذف منشور
async function deletePost(postId) {
    try {
        const response = await fetch(`/api/admin/posts/${postId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('تم حذف المنشور بنجاح', 'success');
            loadAdminData(); // إعادة تحميل البيانات
            loadPosts(); // تحديث المنشورات في الصفحة الرئيسية
        } else {
            const data = await response.json();
            showNotification(data.error || 'خطأ في حذف المنشور', 'error');
        }
    } catch (error) {
        console.error('خطأ في حذف المنشور:', error);
        showNotification('خطأ في الاتصال بالخادم', 'error');
    }
}

// تبديل علامات التبويب
function switchTab(tabId) {
    // تحديث أزرار التبويب
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });
    
    // تحديث محتوى التبويب
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });
}

// عرض قسم معين
function showSection(sectionName) {
    // إخفاء جميع الأقسام
    loginSection.classList.add('hidden');
    registerSection.classList.add('hidden');
    postsSection.classList.add('hidden');
    newPostSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    
    // إزالة النشاط من جميع الروابط
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.classList.remove('active');
    });
    
    // عرض القسم المطلوب
    switch (sectionName) {
        case 'login':
            loginSection.classList.remove('hidden');
            break;
        case 'register':
            registerSection.classList.remove('hidden');
            break;
        case 'posts':
            postsSection.classList.remove('hidden');
            postsLink.classList.add('active');
            break;
        case 'newPost':
            newPostSection.classList.remove('hidden');
            newPostLink.classList.add('active');
            break;
        case 'admin':
            adminSection.classList.remove('hidden');
            adminLink.classList.add('active');
            break;
    }
}

// تحديث واجهة المستخدم بعد تسجيل الدخول
function updateUIForLoggedInUser() {
    authButtons.classList.add('hidden');
    userMenu.classList.remove('hidden');
    newPostLink.classList.remove('hidden');
    
    if (currentUser.isAdmin) {
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }
    
    usernameDisplay.innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(currentUser.username)}`;
}

// تحديث واجهة المستخدم بعد تسجيل الخروج
function updateUIForLoggedOutUser() {
    authButtons.classList.remove('hidden');
    userMenu.classList.add('hidden');
    newPostLink.classList.add('hidden');
    adminLink.classList.add('hidden');
}

// عرض التنبيهات
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// تهريب النصوص لمنع هجمات XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// تحديث تنسيقات CSS لبعض العناصر الإضافية
const style = document.createElement('style');
style.textContent = `
    .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .badge.admin {
        background-color: var(--warning-color);
        color: white;
    }
    
    .badge.user {
        background-color: var(--gray-color);
        color: white;
    }
    
    .admin-post .post-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .delete-post-btn {
        padding: 5px 10px;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);
