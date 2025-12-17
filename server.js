const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// إعداد الجلسات
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
  }
}));

// الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// إنشاء الجداول إذا لم تكن موجودة
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // إنشاء حساب المدير الافتراضي إذا لم يكن موجوداً
    const adminExists = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (username, email, password, is_admin) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin@example.com', hashedPassword, true]
      );
      console.log('تم إنشاء حساب المدير الافتراضي');
    }
    
    console.log('تم إنشاء الجداول بنجاح');
  } catch (err) {
    console.error('خطأ في إنشاء الجداول:', err);
  }
}

// مسارات API

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // التحقق من البيانات
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // حفظ المستخدم في قاعدة البيانات
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    res.status(201).json({ 
      message: 'تم إنشاء الحساب بنجاح', 
      user: result.rows[0] 
    });
  } catch (err) {
    if (err.code === '23505') { // خطأ في القيم المكررة
      res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقاً' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // البحث عن المستخدم
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    const user = result.rows[0];
    
    // التحقق من كلمة المرور
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    // حفظ بيانات المستخدم في الجلسة
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isAdmin = user.is_admin;
    
    res.json({ 
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// تسجيل الخروج
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// الحصول على بيانات الجلسة
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({
      isLoggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        isAdmin: req.session.isAdmin
      }
    });
  } else {
    res.json({ isLoggedIn: false });
  }
});

// نشر منشور جديد
app.post('/api/posts', async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'المحتوى لا يمكن أن يكون فارغاً' });
    }
    
    const result = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id, content, created_at',
      [userId, content]
    );
    
    res.status(201).json({ 
      message: 'تم نشر المنشور بنجاح', 
      post: result.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// الحصول على المنشورات
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, users.username 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      ORDER BY posts.created_at DESC
      LIMIT 50
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// الحصول على جميع المستخدمين (للمدير فقط)
app.get('/api/admin/users', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'غير مصرح بالوصول' });
    }
    
    const result = await pool.query('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// حذف منشور (للمدير فقط)
app.delete('/api/admin/posts/:id', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'غير مصرح بالوصول' });
    }
    
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف المنشور بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// مسار لجميع طلبات الصفحات (للتطبيق ذي الصفحة الواحدة)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// بدء الخادم
app.listen(PORT, async () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
  await createTables();
});
