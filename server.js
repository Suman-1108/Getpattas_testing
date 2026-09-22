require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const Product = require('./models/Product');
const Order = require('./models/Order');
const SiteConfig = require('./models/SiteConfig');
const User = require('./models/User');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/get_pattasu';

// Ensure uploads folder exists (safely guarded for read-only / serverless environments)
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Notice: Could not create uploads directory (read-only filesystem):', err.message);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

const rootDir = process.cwd();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(rootDir, {
  setHeaders: (res, filePath) => {
    if (/\.(js|css|html)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));
app.use('/uploads', express.static(uploadsDir));

// Reliable static asset resolver for Serverless & local environments
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const cleanPath = req.path.replace(/^\//, '');
  if (!cleanPath || cleanPath.startsWith('api/')) return next();

  const candidateDirs = [__dirname, process.cwd()];
  for (const dir of candidateDirs) {
    try {
      const target = path.join(dir, cleanPath);
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        if (/\.(js|css|html)$/i.test(target)) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
        return res.sendFile(target);
      }
    } catch (e) {}
  }
  next();
});

// Route Handlers for Main Site and Storefronts
const serveIndex = (req, res) => res.sendFile(path.join(__dirname, 'index.html'));
const serveShop1 = (req, res) => res.sendFile(path.join(__dirname, 'shopno001', 'index.html'));
const serveShop2 = (req, res) => res.sendFile(path.join(__dirname, 'shopno002', 'index.html'));
const serveShop3 = (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'index.html'));
const serveShop4 = (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'index.html'));
const serveShop3Products = (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'products.html'));
const serveShop4Products = (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'products.html'));

// Clean URL Routes
app.get('/', serveIndex);
app.get(['/admin', '/admin.html'], (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get(['/invoice', '/invoice.html', '/invoice/:bookingNo'], (req, res) => res.sendFile(path.join(__dirname, 'invoice.html')));
app.get('/shopno001', (req, res) => res.redirect(301, '/shopno001/'));
app.get('/shopno001/', serveShop1);
app.get('/shopno002', (req, res) => res.redirect(301, '/shopno002/'));
app.get('/shopno002/', serveShop2);
app.get('/shopno003', (req, res) => res.redirect(301, '/shopno003/'));
app.get('/shopno003/', serveShop3);
app.get('/shopno004', (req, res) => res.redirect(301, '/shopno004/'));
app.get('/shopno004/', serveShop4);
app.get(['/shopno003/products', '/shopno003/products.html'], serveShop3Products);
app.get(['/shopno004/products', '/shopno004/products.html'], serveShop4Products);

// Explicit Static Asset Routes (guarantees bundling by @vercel/node)
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/catalogData.js', (req, res) => res.sendFile(path.join(__dirname, 'catalogData.js')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/admin.css', (req, res) => res.sendFile(path.join(__dirname, 'admin.css')));
app.get('/admin.js', (req, res) => res.sendFile(path.join(__dirname, 'admin.js')));
app.get('/html2pdf.bundle.min.js', (req, res) => res.sendFile(path.join(__dirname, 'html2pdf.bundle.min.js')));

app.get('/shopno003/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'styles.css')));
app.get('/shopno003/catalogData.js', (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'catalogData.js')));
app.get('/shopno003/app.js', (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'app.js')));
app.get('/shopno003/gp-logo.jpg', (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'gp-logo.jpg')));
app.get('/shopno003/html2pdf.bundle.min.js', (req, res) => res.sendFile(path.join(__dirname, 'shopno003', 'html2pdf.bundle.min.js')));

app.get('/shopno004/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'styles.css')));
app.get('/shopno004/catalogData.js', (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'catalogData.js')));
app.get('/shopno004/app.js', (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'app.js')));
app.get('/shopno004/gp-logo.jpg', (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'gp-logo.jpg')));
app.get('/shopno004/html2pdf.bundle.min.js', (req, res) => res.sendFile(path.join(__dirname, 'shopno004', 'html2pdf.bundle.min.js')));

app.get('/assets/:file', (req, res) => {
  const filePath = path.join(__dirname, 'assets', req.params.file);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).send('Asset not found');
});
app.get('/shopno003/assets/:file', (req, res) => {
  const filePath = path.join(__dirname, 'shopno003', 'assets', req.params.file);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).send('Asset not found');
});
app.get('/shopno004/assets/:file', (req, res) => {
  const filePath = path.join(__dirname, 'shopno004', 'assets', req.params.file);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).send('Asset not found');
});

// Initial Seed Data (Fallback & Seed with 80% Direct Wholesale Prices)
const INITIAL_PRODUCTS = [
  // 1. Sparklers (Kambi Mathappu)
  {
    id: 'spk-01',
    name: '10 cm Electric Sparklers (Kambi Mathappu)',
    category: 'sparklers',
    mrp: 250,
    price: 50,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_sparklers.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.8
  },
  {
    id: 'spk-02',
    name: '10 cm Color Sparklers (Vanna Mathappu)',
    category: 'sparklers',
    mrp: 300,
    price: 60,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_sparklers_color.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.9
  },
  {
    id: 'spk-03',
    name: '15 cm Mega Green & Get pattas Sparklers',
    category: 'sparklers',
    mrp: 450,
    price: 90,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_sparklers_color.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.9
  },
  {
    id: 'spk-04',
    name: '30 cm Giant Royal Sparklers',
    category: 'sparklers',
    mrp: 700,
    price: 140,
    pack: 'Box of 5 Pcs',
    image: 'assets/product_sparklers_giant.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 5.0
  },

  // 2. Flower Pots (Poo Thotti)
  {
    id: 'flp-01',
    name: 'Flower Pots Special (Poo Thotti Special)',
    category: 'flowerpots',
    mrp: 400,
    price: 80,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_flowerpots.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.7
  },
  {
    id: 'flp-02',
    name: 'Flower Pots Asoka (Poo Thotti Asoka)',
    category: 'flowerpots',
    mrp: 500,
    price: 100,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_flowerpots_asoka.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.8
  },
  {
    id: 'flp-03',
    name: 'Flower Pots Giant Deluxe (Big Poo Thotti)',
    category: 'flowerpots',
    mrp: 750,
    price: 150,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_flowerpots_giant.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.9
  },
  {
    id: 'flp-04',
    name: 'Mayil Thogai Peacock Color Fountain',
    category: 'flowerpots',
    mrp: 850,
    price: 170,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_peacock.jpg',
    tag: 'BESTSELLER',
    eco: true,
    rating: 5.0
  },

  // 3. Ground Chakkars (Zamin Chakra)
  {
    id: 'chk-01',
    name: 'Zamin Chakra Big (Ground Spinner)',
    category: 'chakkars',
    mrp: 350,
    price: 70,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_chakkars.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.6
  },
  {
    id: 'chk-02',
    name: 'Zamin Chakra Special (Whirling Wheel)',
    category: 'chakkars',
    mrp: 450,
    price: 90,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_chakkars_deluxe.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.8
  },
  {
    id: 'chk-03',
    name: 'Zamin Chakra Deluxe Wheel Spinner',
    category: 'chakkars',
    mrp: 600,
    price: 120,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_chakkars_deluxe.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.9
  },

  // 4. Sky Shots & Aerial Fireworks
  {
    id: 'sky-01',
    name: '12 Deluxe Aerial Multi-Shots',
    category: 'skyshots',
    mrp: 1800,
    price: 360,
    pack: 'Single Box (12 Shots)',
    image: 'assets/product_skyshots.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.9
  },
  {
    id: 'sky-02',
    name: '30 Multi-Color Crackling Sky Shells',
    category: 'skyshots',
    mrp: 3500,
    price: 700,
    pack: 'Single Box (30 Shots)',
    image: 'assets/product_skyshots_box.jpg',
    tag: 'TOP RATED',
    eco: true,
    rating: 5.0
  },
  {
    id: 'sky-03',
    name: '60 Mega Aerial Night Sky Shells',
    category: 'skyshots',
    mrp: 6500,
    price: 1300,
    pack: 'Single Box (60 Shots)',
    image: 'assets/product_skyshots_mega.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 5.0
  },
  {
    id: 'sky-04',
    name: '120 Royal Grand Sky Shells',
    category: 'skyshots',
    mrp: 12000,
    price: 2400,
    pack: 'Single Box (120 Shots)',
    image: 'assets/product_skyshots_mega.jpg',
    tag: 'MEGA HIT',
    eco: true,
    rating: 5.0
  },

  // 5. Sound Bombs & Rockets
  {
    id: 'bmb-01',
    name: 'Get pattas Bijli Crackers (100 Strips Pack)',
    category: 'bombs',
    mrp: 300,
    price: 60,
    pack: '1 Packet',
    image: 'assets/product_bombs.jpg',
    tag: '80% OFF',
    eco: false,
    rating: 4.5
  },
  {
    id: 'bmb-02',
    name: 'Diwali Sky Rockets Deluxe Pack',
    category: 'bombs',
    mrp: 550,
    price: 110,
    pack: 'Box of 10 Rockets',
    image: 'assets/product_rockets.jpg',
    tag: '80% OFF',
    eco: false,
    rating: 4.8
  },
  {
    id: 'bmb-03',
    name: '2 Sound Mega Hydro Bomb',
    category: 'bombs',
    mrp: 400,
    price: 80,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_bomb_hydro.jpg',
    tag: '80% OFF',
    eco: false,
    rating: 4.7
  },
  {
    id: 'bmb-04',
    name: 'Green Hydro Thunder Bomb',
    category: 'bombs',
    mrp: 500,
    price: 100,
    pack: 'Box of 10 Pcs',
    image: 'assets/product_bomb_hydro.jpg',
    tag: '80% OFF',
    eco: true,
    rating: 4.8
  },

  // 6. Diwali Gift Combos
  {
    id: 'combo-1',
    name: 'Get Pattas Grand Family Festival Dhamaka Pack',
    category: 'combos',
    mrp: 9000,
    price: 1799,
    pack: '45 Assorted Items Box',
    image: 'assets/product_grand_combo.jpg',
    tag: 'MEGA SAVINGS',
    eco: true,
    rating: 5.0
  },
  {
    id: 'combo-2',
    name: 'Get Pattas Kids Super Safe Sparkler Hamper',
    category: 'combos',
    mrp: 3500,
    price: 699,
    pack: '30 Kid-Safe Light Items',
    image: 'assets/product_combopack.jpg',
    tag: 'KIDS SPECIAL',
    eco: true,
    rating: 4.9
  },
  {
    id: 'combo-3',
    name: 'Get Pattas Sivakasi VIP Mega Bumper Box',
    category: 'combos',
    mrp: 14000,
    price: 2799,
    pack: '65 Premium Assorted Items Box',
    image: 'assets/product_grand_combo.jpg',
    tag: 'VIP BUMPER',
    eco: true,
    rating: 5.0
  }
];

// Memory Store Fallback if MongoDB is connecting / offline
let isDbConnected = false;
let memoryProducts = [...INITIAL_PRODUCTS];
let memoryOrders = [];
let memoryUsers = [];
let memoryConfig = {
  key: 'main_config',
  heroTitle: 'DIRECT SIVAKASI FACTORY FIREWORKS',
  heroSubtitle: 'Buy genuine 100% Green Certified Crackers online at direct wholesale prices with flat 80% discount and doorstep delivery.',
  heroBadge: '💥 SIVAKASI DIRECT WHOLESALE STORE',
  heroImage: 'assets/hero_banner.jpg',
  storePhone: '+91 86104 51118',
  storeEmail: 'sales@getpattas.com',
  storeAddress: '12/4B Sivakasi Main Road, Near Factory Zone, Sivakasi, Tamil Nadu - 626123'
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000
}).then(async () => {
  isDbConnected = true;
  console.log('✅ Connected to MongoDB successfully.');

  // Seed Products if DB empty or needs refresh
  const count = await Product.countDocuments();
  if (count < INITIAL_PRODUCTS.length) {
    await Product.deleteMany({});
    await Product.insertMany(INITIAL_PRODUCTS);
    console.log('🌱 Seeded 22 initial Sivakasi products into MongoDB.');
  }

  // Seed Config if DB empty
  const configCount = await SiteConfig.countDocuments();
  if (configCount === 0) {
    await SiteConfig.create(memoryConfig);
  }
}).catch(err => {
  console.warn('⚠️ MongoDB connection warning (Running with fast in-memory persistence):', err.message);
  isDbConnected = false;
});

// ==========================================
// REST API ROUTES
// ==========================================

// Customer Sign Up
app.post('/api/customer/signup', async (req, res) => {
  try {
    const { username, password, fullName, phone, address } = req.body;
    if (!username || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const userId = 'usr-' + Date.now();
    const defaultAddress = {
      id: 'addr-' + Date.now(),
      label: 'Home',
      addressLine: address || 'Sivakasi Direct Delivery',
      city: 'Default City',
      pincode: '',
      isDefault: true
    };

    const newUser = {
      userId,
      username: username.toLowerCase().trim(),
      password,
      fullName,
      phone,
      addresses: [defaultAddress]
    };

    if (isDbConnected) {
      const existing = await User.findOne({ username: newUser.username });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username already registered. Please login.' });
      }
      const created = await User.create(newUser);
      return res.status(201).json({ success: true, token: created.userId, user: created });
    } else {
      const existing = memoryUsers.find(u => u.username === newUser.username);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username already registered. Please login.' });
      }
      memoryUsers.unshift(newUser);
      return res.status(201).json({ success: true, token: newUser.userId, user: newUser });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Customer Login
app.post('/api/customer/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const uname = (username || '').toLowerCase().trim();

    if (isDbConnected) {
      const user = await User.findOne({ username: uname, password });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid Username or Password' });
      }
      return res.json({ success: true, token: user.userId, user });
    } else {
      const user = memoryUsers.find(u => u.username === uname && u.password === password);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid Username or Password' });
      }
      return res.json({ success: true, token: user.userId, user });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Customer Profile
app.get('/api/customer/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (isDbConnected) {
      const user = await User.findOne({ userId });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, user });
    } else {
      const user = memoryUsers.find(u => u.userId === userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, user });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add New Address
app.post('/api/customer/address', async (req, res) => {
  try {
    const { userId, label, addressLine, city, pincode, isDefault } = req.body;
    const newAddress = {
      id: 'addr-' + Date.now(),
      label: label || 'Home',
      addressLine: addressLine || '',
      city: city || '',
      pincode: pincode || '',
      isDefault: Boolean(isDefault)
    };

    if (isDbConnected) {
      const user = await User.findOne({ userId });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      if (newAddress.isDefault) {
        user.addresses.forEach(a => a.isDefault = false);
      }
      user.addresses.push(newAddress);
      await user.save();
      return res.json({ success: true, user });
    } else {
      const user = memoryUsers.find(u => u.userId === userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      if (newAddress.isDefault) {
        user.addresses.forEach(a => a.isDefault = false);
      }
      user.addresses.push(newAddress);
      return res.json({ success: true, user });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Edit Address
app.put('/api/customer/address/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;
    const { userId, label, addressLine, city, pincode, isDefault } = req.body;

    if (isDbConnected) {
      const user = await User.findOne({ userId });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const addr = user.addresses.id(addressId) || user.addresses.find(a => a.id === addressId);
      if (addr) {
        if (label) addr.label = label;
        if (addressLine) addr.addressLine = addressLine;
        if (city) addr.city = city;
        if (pincode !== undefined) addr.pincode = pincode;
        if (isDefault) {
          user.addresses.forEach(a => a.isDefault = false);
          addr.isDefault = true;
        }
      }
      await user.save();
      return res.json({ success: true, user });
    } else {
      const user = memoryUsers.find(u => u.userId === userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const addr = user.addresses.find(a => a.id === addressId);
      if (addr) {
        if (label) addr.label = label;
        if (addressLine) addr.addressLine = addressLine;
        if (city) addr.city = city;
        if (pincode !== undefined) addr.pincode = pincode;
        if (isDefault) {
          user.addresses.forEach(a => a.isDefault = false);
          addr.isDefault = true;
        }
      }
      return res.json({ success: true, user });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Address
app.delete('/api/customer/address/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;
    const { userId } = req.query;

    if (isDbConnected) {
      const user = await User.findOne({ userId });
      if (user) {
        user.addresses = user.addresses.filter(a => a.id !== addressId && a._id?.toString() !== addressId);
        await user.save();
        return res.json({ success: true, user });
      }
    } else {
      const user = memoryUsers.find(u => u.userId === userId);
      if (user) {
        user.addresses = user.addresses.filter(a => a.id !== addressId);
        return res.json({ success: true, user });
      }
    }
    return res.status(404).json({ success: false, message: 'Address not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET All Registered Customers (Admin)
app.get('/api/admin/customers', async (req, res) => {
  try {
    if (isDbConnected) {
      const customers = await User.find().sort({ createdAt: -1 });
      return res.json(customers);
    }
    return res.json(memoryUsers);
  } catch (error) {
    return res.json(memoryUsers);
  }
});

// Admin Authentication
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'adgetmin' && password === 'adgetmin321') {
    return res.json({ success: true, token: 'authenticated-admin-session-token', message: 'Login successful' });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
});

// Upload File Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = 'uploads/' + req.file.filename;
  return res.json({ success: true, url: fileUrl });
});

// GET Products
app.get('/api/products', async (req, res) => {
  try {
    if (isDbConnected) {
      const products = await Product.find().sort({ createdAt: -1 });
      return res.json(products);
    }
    return res.json(memoryProducts);
  } catch (error) {
    return res.json(memoryProducts);
  }
});

// POST Add Product (Admin)
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, mrp, price, pack, image, tag, eco } = req.body;
    const id = 'prod-' + Date.now();
    const newProduct = {
      id,
      name: name || 'New Firecracker Item',
      category: category || 'sparklers',
      mrp: Number(mrp) || 100,
      price: Number(price) || 20,
      pack: pack || '1 Box',
      image: image || 'assets/product_sparklers.jpg',
      tag: tag || '80% OFF',
      eco: eco !== undefined ? eco : true,
      rating: 4.8
    };

    if (isDbConnected) {
      const created = await Product.create(newProduct);
      return res.status(201).json({ success: true, product: created });
    } else {
      memoryProducts.unshift(newProduct);
      return res.status(201).json({ success: true, product: newProduct });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Edit Product (Admin)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (isDbConnected) {
      const updated = await Product.findOneAndUpdate({ id }, updateData, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
      return res.json({ success: true, product: updated });
    } else {
      const idx = memoryProducts.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found' });
      memoryProducts[idx] = { ...memoryProducts[idx], ...updateData };
      return res.json({ success: true, product: memoryProducts[idx] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE Product (Admin)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDbConnected) {
      await Product.findOneAndDelete({ id });
    }
    memoryProducts = memoryProducts.filter(p => p.id !== id);
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SMTP EMAIL NOTIFICATION SERVICE
// ==========================================
async function getEmailTransporter() {
  let host = process.env.SMTP_HOST || 'smtp.gmail.com';
  let port = Number(process.env.SMTP_PORT) || 587;
  let secure = process.env.SMTP_SECURE === 'true' || port === 465;
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';
  let from = process.env.SMTP_FROM || '"Get Pattas Kadai" <sales@getpattas.com>';

  // Check if SiteConfig has overrides in DB
  try {
    if (isDbConnected) {
      const config = await SiteConfig.findOne({ key: 'main_config' });
      if (config) {
        if (config.smtpHost) host = config.smtpHost;
        if (config.smtpPort) port = Number(config.smtpPort);
        if (config.smtpSecure !== undefined) secure = config.smtpSecure;
        if (config.smtpUser) user = config.smtpUser;
        if (config.smtpPass) pass = config.smtpPass;
        if (config.smtpFrom) from = config.smtpFrom;
      }
    }
  } catch (e) { }

  if (!user || !pass) {
    return { configured: false, host, port, user, from };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  return { configured: true, transporter, from, host, port, user };
}

// Generate Branded HTML Email Template for Order Status Updates
function generateOrderStatusEmailHtml(order, newStatus, previousStatus) {
  const brandName = order.brandName || 'Get Pattas Kadai - Sivakasi Direct';
  const orderId = order.orderId || order.bookingNumber || 'ORD-UNKNOWN';
  const customerName = order.customerName || 'Valued Customer';
  const totalAmount = Number(order.totalAmount || 0).toLocaleString('en-IN');
  const items = order.items || [];
  const phone = order.phone || '';
  const address = order.address || 'Standard Delivery';

  const statusConfig = {
    Pending: {
      color: '#d97706',
      bg: '#fef3c7',
      border: '#f59e0b',
      icon: '⏳',
      title: 'Order Status: Pending Verification',
      badge: 'PENDING',
      message: 'Thank you for placing your order with us! Your order has been recorded and is currently <strong>Pending review & payment verification</strong>. Our wholesale desk will confirm and schedule your Sivakasi crackers package shortly.'
    },
    Processing: {
      color: '#2563eb',
      bg: '#dbeafe',
      border: '#3b82f6',
      icon: '⚙️',
      title: 'Great News! Order is in Processing',
      badge: 'PROCESSING',
      message: 'Your order is now <strong>Confirmed & Processing</strong>! Our Sivakasi factory packing team is carefully inspecting, safety-cushioning, and packaging your crackers box for safe courier/parcel dispatch.'
    },
    Completed: {
      color: '#059669',
      bg: '#d1fae5',
      border: '#10b981',
      icon: '🎉',
      title: 'Hooray! Order Completed / Dispatched',
      badge: 'COMPLETED',
      message: 'Your crackers order has been <strong>Successfully Completed / Dispatched</strong>! Thank you for choosing us for your festive celebration. We wish you, your family, and friends a sparkling, safe, and joyous Diwali!'
    },
    Delivered: {
      color: '#059669',
      bg: '#d1fae5',
      border: '#10b981',
      icon: '📦',
      title: 'Delivered & Completed',
      badge: 'COMPLETED',
      message: 'Your crackers order has been marked as <strong>Delivered & Completed</strong>! Thank you for shopping with Get Pattas Kadai. Have a wonderful and safe celebration!'
    },
    Cancelled: {
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#ef4444',
      icon: '❌',
      title: 'Order Cancelled Notice',
      badge: 'CANCELLED',
      message: 'Your order has been <strong>Cancelled</strong>. If you did not request this cancellation or have already transferred payment, please contact our Sivakasi WhatsApp helpline immediately with your order reference.'
    }
  };

  const statusInfo = statusConfig[newStatus] || {
    color: '#475569',
    bg: '#f1f5f9',
    border: '#94a3b8',
    icon: 'ℹ️',
    title: `Order Status Updated: ${newStatus}`,
    badge: newStatus.toUpperCase(),
    message: `The status of your order #${orderId} has been updated to <strong>${newStatus}</strong>.`
  };

  const itemsRows = items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-size: 13px; color: #334155;">${idx + 1}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 600;">
        ${item.name || 'Crackers Item'}
        ${item.tamilName ? `<br><small style="color: #64748b; font-weight: normal;">${item.tamilName}</small>` : ''}
        ${item.pack ? `<span style="display:inline-block; margin-left:6px; font-size:11px; padding:2px 6px; background:#f1f5f9; border-radius:4px; color:#475569;">${item.pack}</span>` : ''}
      </td>
      <td style="padding: 10px 12px; font-size: 13px; color: #334155; text-align: center;">${item.qty || 1}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #334155; text-align: right;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">₹${((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Order Status Update - ${orderId}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .email-header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #b91c1c 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .brand-title { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: #fef08a; }
      .brand-sub { font-size: 12px; color: #e2e8f0; margin-top: 6px; letter-spacing: 1px; text-transform: uppercase; }
      .email-body { padding: 28px 24px; }
      .status-box { background: ${statusInfo.bg}; border: 2px solid ${statusInfo.border}; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; }
      .status-badge { display: inline-block; background: ${statusInfo.color}; color: #ffffff; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px; }
      .status-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
      .status-desc { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .info-item { font-size: 13px; line-height: 1.4; }
      .info-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px; }
      .info-val { color: #0f172a; font-weight: 700; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .items-table th { background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 10px 12px; text-align: left; }
      .btn-cta { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 8px; text-align: center; }
      .btn-wa { display: inline-block; background: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 8px; text-align: center; margin-left: 10px; }
      .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <div style="font-size: 32px; margin-bottom: 8px;">🧨💥</div>
        <h1 class="brand-title">${brandName}</h1>
        <div class="brand-sub">Sivakasi Direct Online Fireworks & Crackers Booking</div>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p style="font-size: 15px; color: #0f172a; margin-top: 0;">Dear <strong>${customerName}</strong>,</p>

        <!-- Status Box -->
        <div class="status-box">
          <div class="status-badge">${statusInfo.icon} ${statusInfo.badge}</div>
          <h2 class="status-title">${statusInfo.title}</h2>
          <p class="status-desc">${statusInfo.message}</p>
        </div>

        <!-- Order Summary Details -->
        <table style="width:100%; margin-bottom:20px; border-collapse:collapse; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:12px 16px; width:50%; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
              <span style="display:block; font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Order Reference</span>
              <strong style="font-size:14px; color:#2563eb; font-family:monospace;">${orderId}</strong>
            </td>
            <td style="padding:12px 16px; width:50%; border-bottom:1px solid #e2e8f0;">
              <span style="display:block; font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Total Bill Amount</span>
              <strong style="font-size:16px; color:#059669;">₹${totalAmount}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px; width:50%; border-right:1px solid #e2e8f0;">
              <span style="display:block; font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Delivery Contact</span>
              <strong style="font-size:13px; color:#0f172a;">${phone}</strong>
            </td>
            <td style="padding:12px 16px; width:50%;">
              <span style="display:block; font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Delivery Address</span>
              <span style="font-size:12px; color:#334155;">${address}</span>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        ${items.length > 0 ? `
          <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ordered Crackers Items (${items.length})</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Item Description</th>
                <th style="text-align: center; width: 45px;">Qty</th>
                <th style="text-align: right; width: 70px;">Rate</th>
                <th style="text-align: right; width: 85px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1;">
                <td colspan="4" style="padding: 12px; text-align: right; color: #0f172a;">Grand Total Payable:</td>
                <td style="padding: 12px; text-align: right; color: #059669; font-size: 15px;">₹${totalAmount}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        <!-- Actions -->
        <div style="text-align: center; margin: 28px 0 12px 0;">
          <a href="https://wa.me/918610451118?text=Hello%20Get%20Pattas,%20enquiring%20about%20Order%20${orderId}" class="btn-wa" target="_blank">
            💬 WhatsApp Support
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Get Pattas Kadai — Sivakasi Direct Factory Fireworks</p>
        <p style="margin: 0 0 6px 0;">100% Genuine Certified Green Crackers | Safe Doorstep Dispatch</p>
        <p style="margin: 0; color: #94a3b8;">Helpline: +91 86104 51118 | Email: sales@getpattas.com</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Send Status Email Helper
async function sendOrderStatusEmail(order, newStatus, previousStatus) {
  if (!order || !order.email || !order.email.trim()) {
    console.log(`ℹ️ [Email Skipped] Order #${order?.orderId} has no customer email address.`);
    return { sent: false, reason: 'Customer email address not provided on order' };
  }

  try {
    const smtp = await getEmailTransporter();
    if (!smtp.configured) {
      console.log(`⚠️ [Email Skipped] SMTP credentials not configured (Set SMTP_USER & SMTP_PASS in .env or Admin UI).`);
      return { sent: false, reason: 'SMTP not configured (Add SMTP_USER and SMTP_PASS in .env)' };
    }

    const htmlContent = generateOrderStatusEmailHtml(order, newStatus, previousStatus);
    const orderRef = order.orderId || order.bookingNumber || 'Crackers Order';
    const brandTitle = order.brandName || 'Get Pattas Kadai';

    const mailOptions = {
      from: smtp.from,
      to: order.email.trim(),
      subject: `Order Update [${newStatus.toUpperCase()}]: #${orderRef} - ${brandTitle}`,
      html: htmlContent
    };

    const info = await smtp.transporter.sendMail(mailOptions);
    console.log(`✅ [Email Sent] Order #${orderRef} status "${newStatus}" sent to ${order.email} (MsgId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId, recipient: order.email };
  } catch (err) {
    console.error(`❌ [Email Error] Failed to send email for Order #${order?.orderId}:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ==========================================
// 30-DAY DRAFT ORDER AUTO-CLEANUP MECHANISM
// ==========================================
async function cleanupExpiredDraftOrders() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    if (isDbConnected) {
      const result = await Order.deleteMany({
        isDraftDeleted: true,
        deletedAt: { $lte: thirtyDaysAgo }
      });
      if (result.deletedCount > 0) {
        console.log(`🧹 [Auto-Cleanup] Purged ${result.deletedCount} draft-deleted orders older than 30 days.`);
      }
    }
    // Clean memory orders as well
    const beforeCount = memoryOrders.length;
    memoryOrders = memoryOrders.filter(o => {
      if (o.isDraftDeleted && o.deletedAt) {
        return new Date(o.deletedAt) > thirtyDaysAgo;
      }
      return true;
    });
    const purgedMemory = beforeCount - memoryOrders.length;
    if (purgedMemory > 0) {
      console.log(`🧹 [Auto-Cleanup] Purged ${purgedMemory} memory draft-deleted orders.`);
    }
  } catch (err) {
    console.error('⚠️ [Auto-Cleanup Error]:', err.message);
  }
}

// Run cleanup immediately on server start and every 6 hours
setTimeout(cleanupExpiredDraftOrders, 5000);
setInterval(cleanupExpiredDraftOrders, 6 * 60 * 60 * 1000);

// ==========================================
// ORDER MANAGEMENT REST APIS
// ==========================================

// GET Orders (Admin) - Supports draft filter & triggers 30-day cleanup
app.get('/api/orders', async (req, res) => {
  try {
    await cleanupExpiredDraftOrders();

    let allOrders = [];
    if (isDbConnected) {
      allOrders = await Order.find().sort({ createdAt: -1 });
    } else {
      allOrders = memoryOrders;
    }

    const filtered = allOrders.filter(o => 
      !permanentlyDeletedOrderIds.has(String(o.orderId)) && 
      !permanentlyDeletedOrderIds.has(String(o.bookingNumber)) &&
      !permanentlyDeletedOrderIds.has(String(o._id))
    );
    return res.json(filtered);
  } catch (error) {
    const filtered = memoryOrders.filter(o => 
      !permanentlyDeletedOrderIds.has(String(o.orderId)) && 
      !permanentlyDeletedOrderIds.has(String(o.bookingNumber)) &&
      !permanentlyDeletedOrderIds.has(String(o._id))
    );
    return res.json(filtered);
  }
});

// GET Single Order by ID or Booking Number (for Invoice & Customer Tracking)
app.get(['/api/orders/:id', '/api/orders/booking/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    if (permanentlyDeletedOrderIds.has(String(id))) {
      return res.status(404).json({ success: false, message: `Order #${id} was permanently deleted` });
    }
    let order = null;
    if (isDbConnected) {
      order = await Order.findOne({ $or: [{ orderId: id }, { bookingNumber: id }] });
    }
    if (!order) {
      order = memoryOrders.find(o => o.orderId === id || o.bookingNumber === id);
    }
    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${id} not found` });
    }
    return res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Place New Order (Storefront Customer & WhatsApp Checkout)
app.post('/api/orders', async (req, res) => {
  try {
    const {
      orderId: clientOrderId,
      bookingNumber,
      brand,
      brandName,
      customerName,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      items,
      totalAmount,
      totalItems,
      totalBoxes,
      paymentMethod,
      utrRef,
      status,
      createdAt
    } = req.body;

    const checkId = clientOrderId || bookingNumber;
    if (checkId && (permanentlyDeletedOrderIds.has(String(checkId)) || (clientOrderId && permanentlyDeletedOrderIds.has(String(clientOrderId))) || (bookingNumber && permanentlyDeletedOrderIds.has(String(bookingNumber))))) {
      return res.json({ success: true, message: 'Order was permanently deleted and not resurrected.' });
    }

    const orderId = clientOrderId || bookingNumber || ('ORD-' + Math.floor(100000 + Math.random() * 900000));

    const newOrder = {
      orderId,
      bookingNumber: bookingNumber || orderId,
      brand: brand || 'getpattasu',
      brandName: brandName || 'Get Pattas Kadai',
      customerName: customerName || 'Valued Customer',
      phone: phone || '8610451118',
      email: (email || '').trim(),
      address: address || 'Store Pickup / WhatsApp Order',
      city: city || '',
      state: state || 'Tamil Nadu',
      pincode: pincode || '',
      items: items || [],
      totalAmount: Number(totalAmount) || 0,
      totalItems: Number(totalItems) || (items ? items.length : 0),
      totalBoxes: Number(totalBoxes) || 0,
      paymentMethod: paymentMethod || 'WhatsApp Direct',
      utrRef: utrRef || '',
      status: status || 'Pending',
      isDraftDeleted: false,
      deletedAt: null,
      createdAt: createdAt ? new Date(createdAt) : new Date()
    };

    let createdOrder = newOrder;

    if (isDbConnected) {
      try {
        createdOrder = await Order.create(newOrder);
      } catch (dbErr) {
        // Fallback or update if already exists
        const existing = await Order.findOne({ orderId });
        if (existing) {
          createdOrder = existing;
        } else {
          memoryOrders.unshift(newOrder);
        }
      }
    } else {
      memoryOrders.unshift(newOrder);
    }

    // Trigger confirmation email if email is provided and configured
    if (newOrder.email) {
      sendOrderStatusEmail(newOrder, newOrder.status, 'New Booking').catch(() => {});
    }

    return res.status(201).json({ success: true, order: createdOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Update Order Status (Admin) - Updates status and triggers automated SMTP email
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    let { status, order: clientOrder } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    // Normalize status names
    const statusMap = {
      'pending': 'Pending',
      'processing': 'Processing',
      'complete': 'Completed',
      'completed': 'Completed',
      'delivered': 'Completed',
      'cancelling': 'Cancelled',
      'cancelled': 'Cancelled'
    };
    const normalizedStatus = statusMap[status.toLowerCase()] || status;

    let targetOrder = null;
    let previousStatus = '';

    if (isDbConnected) {
      const existing = await Order.findOne({ $or: [{ orderId: id }, { bookingNumber: id }] });
      if (existing) {
        previousStatus = existing.status;
        existing.status = normalizedStatus;
        targetOrder = await existing.save();
      }
    }

    // Memory fallback or sync
    const memOrder = memoryOrders.find(o => o.orderId === id || o.bookingNumber === id);
    if (memOrder) {
      if (!previousStatus) previousStatus = memOrder.status;
      memOrder.status = normalizedStatus;
      if (!targetOrder) targetOrder = memOrder;
    }

    // Auto-upsert if order was created locally in localStorage and not yet on server
    if (!targetOrder) {
      const fallback = clientOrder || req.body || {};
      const newOrder = {
        orderId: id,
        bookingNumber: fallback.bookingNumber || id,
        brand: fallback.brand || 'getpattasu',
        brandName: fallback.brandName || 'Get Pattas Kadai',
        customerName: fallback.customerName || 'Valued Customer',
        phone: fallback.phone || '8610451118',
        email: (fallback.email || '').trim(),
        address: fallback.address || 'Direct Sivakasi Transport / Store Order',
        items: fallback.items || [],
        totalAmount: Number(fallback.totalAmount) || 0,
        totalItems: Number(fallback.totalItems) || (fallback.items ? fallback.items.length : 0),
        totalBoxes: Number(fallback.totalBoxes) || 0,
        paymentMethod: fallback.paymentMethod || 'WhatsApp Direct / UPI',
        utrRef: fallback.utrRef || '',
        status: normalizedStatus,
        isDraftDeleted: Boolean(fallback.isDraftDeleted),
        deletedAt: fallback.deletedAt ? new Date(fallback.deletedAt) : null,
        createdAt: fallback.createdAt ? new Date(fallback.createdAt) : new Date()
      };

      if (isDbConnected) {
        try {
          targetOrder = await Order.create(newOrder);
        } catch (dbErr) {
          memoryOrders.unshift(newOrder);
          targetOrder = newOrder;
        }
      } else {
        memoryOrders.unshift(newOrder);
        targetOrder = newOrder;
      }
    }

    // Trigger automated SMTP notification email asynchronously
    const emailResult = await sendOrderStatusEmail(targetOrder, normalizedStatus, previousStatus);

    return res.json({
      success: true,
      order: targetOrder,
      newStatus: normalizedStatus,
      emailSent: emailResult.sent,
      emailDetails: emailResult
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Draft Delete (Soft Delete with 30-day retention)
app.post('/api/orders/:id/draft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    let updatedOrder = null;

    if (isDbConnected) {
      updatedOrder = await Order.findOneAndUpdate(
        { $or: [{ orderId: id }, { bookingNumber: id }] },
        { isDraftDeleted: true, deletedAt: now },
        { new: true }
      );
    }

    const memOrder = memoryOrders.find(o => o.orderId === id || o.bookingNumber === id);
    if (memOrder) {
      memOrder.isDraftDeleted = true;
      memOrder.deletedAt = now;
      if (!updatedOrder) updatedOrder = memOrder;
    }

    // Auto-upsert into draft trash if not previously saved on server
    if (!updatedOrder) {
      const fallback = req.body?.order || {};
      const newOrder = {
        orderId: id,
        bookingNumber: fallback.bookingNumber || id,
        brand: fallback.brand || 'getpattasu',
        brandName: fallback.brandName || 'Get Pattas Kadai',
        customerName: fallback.customerName || 'Valued Customer',
        phone: fallback.phone || '8610451118',
        email: (fallback.email || '').trim(),
        address: fallback.address || 'Store Pickup / WhatsApp Order',
        items: fallback.items || [],
        totalAmount: Number(fallback.totalAmount) || 0,
        status: fallback.status || 'Pending',
        isDraftDeleted: true,
        deletedAt: now,
        createdAt: fallback.createdAt ? new Date(fallback.createdAt) : now
      };
      if (isDbConnected) {
        try {
          updatedOrder = await Order.create(newOrder);
        } catch (e) {
          memoryOrders.unshift(newOrder);
          updatedOrder = newOrder;
        }
      } else {
        memoryOrders.unshift(newOrder);
        updatedOrder = newOrder;
      }
    }

    return res.json({
      success: true,
      message: 'Order moved to Draft Trash (will automatically delete after 30 days)',
      order: updatedOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Restore Draft Deleted Order
app.post('/api/orders/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    let updatedOrder = null;

    if (isDbConnected) {
      updatedOrder = await Order.findOneAndUpdate(
        { $or: [{ orderId: id }, { bookingNumber: id }] },
        { isDraftDeleted: false, deletedAt: null },
        { new: true }
      );
    }

    const memOrder = memoryOrders.find(o => o.orderId === id || o.bookingNumber === id);
    if (memOrder) {
      memOrder.isDraftDeleted = false;
      memOrder.deletedAt = null;
      if (!updatedOrder) updatedOrder = memOrder;
    }

    if (!updatedOrder) {
      const fallback = req.body?.order || {};
      const newOrder = {
        orderId: id,
        bookingNumber: fallback.bookingNumber || id,
        brand: fallback.brand || 'getpattasu',
        brandName: fallback.brandName || 'Get Pattas Kadai',
        customerName: fallback.customerName || 'Valued Customer',
        phone: fallback.phone || '8610451118',
        email: (fallback.email || '').trim(),
        address: fallback.address || 'Store Pickup / WhatsApp Order',
        items: fallback.items || [],
        totalAmount: Number(fallback.totalAmount) || 0,
        status: fallback.status || 'Pending',
        isDraftDeleted: false,
        deletedAt: null,
        createdAt: fallback.createdAt ? new Date(fallback.createdAt) : new Date()
      };
      if (isDbConnected) {
        try {
          updatedOrder = await Order.create(newOrder);
        } catch (e) {
          memoryOrders.unshift(newOrder);
          updatedOrder = newOrder;
        }
      } else {
        memoryOrders.unshift(newOrder);
        updatedOrder = newOrder;
      }
    }

    return res.json({
      success: true,
      message: 'Order restored to active orders list',
      order: updatedOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Set of permanently deleted order IDs to prevent resurrection
const permanentlyDeletedOrderIds = new Set();

// DELETE Permanently Delete Order (Admin)
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Order ID is required' });

    permanentlyDeletedOrderIds.add(String(id));

    if (isDbConnected) {
      const conditions = [{ orderId: id }, { bookingNumber: id }];
      if (mongoose.isValidObjectId(id)) {
        conditions.push({ _id: id });
      }
      await Order.deleteMany({ $or: conditions });
    }
    memoryOrders = memoryOrders.filter(o => o.orderId !== id && o.bookingNumber !== id && String(o._id) !== id);

    return res.json({ success: true, message: `Order #${id} permanently deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE Empty All Draft Deleted Orders (Admin)
app.delete('/api/orders/drafts/empty', async (req, res) => {
  try {
    let deletedCount = 0;
    if (isDbConnected) {
      const resDb = await Order.deleteMany({ isDraftDeleted: true });
      deletedCount = resDb.deletedCount || 0;
    }
    const before = memoryOrders.length;
    memoryOrders = memoryOrders.filter(o => !o.isDraftDeleted);
    deletedCount += (before - memoryOrders.length);

    return res.json({
      success: true,
      message: `Draft trash emptied (${deletedCount} orders deleted permanently)`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/smtp-config (Admin view SMTP settings without exposing full password)
app.get('/api/admin/smtp-config', async (req, res) => {
  try {
    const smtp = await getEmailTransporter();
    let config = null;
    if (isDbConnected) {
      config = await SiteConfig.findOne({ key: 'main_config' });
    }
    return res.json({
      configured: smtp.configured,
      host: smtp.host,
      port: smtp.port,
      user: smtp.user,
      from: smtp.from,
      hasPassword: Boolean(process.env.SMTP_PASS || config?.smtpPass)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/smtp-config (Admin save SMTP settings)
app.put('/api/admin/smtp-config', async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, smtpEnabled } = req.body;
    const updateObj = {};
    if (smtpHost !== undefined) updateObj.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateObj.smtpPort = Number(smtpPort);
    if (smtpSecure !== undefined) updateObj.smtpSecure = Boolean(smtpSecure);
    if (smtpUser !== undefined) updateObj.smtpUser = smtpUser;
    if (smtpPass) updateObj.smtpPass = smtpPass; // Only update if non-empty
    if (smtpFrom !== undefined) updateObj.smtpFrom = smtpFrom;
    if (smtpEnabled !== undefined) updateObj.smtpEnabled = Boolean(smtpEnabled);

    if (isDbConnected) {
      await SiteConfig.findOneAndUpdate(
        { key: 'main_config' },
        updateObj,
        { upsert: true, new: true }
      );
    }
    return res.json({ success: true, message: 'SMTP Configuration saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/test-smtp (Admin send test email to verify credentials)
app.post('/api/admin/test-smtp', async (req, res) => {
  try {
    const { testEmail } = req.body;
    if (!testEmail || !testEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid test recipient email is required' });
    }

    const smtp = await getEmailTransporter();
    if (!smtp.configured) {
      return res.status(400).json({
        success: false,
        message: 'SMTP is not configured yet. Please enter your SMTP username and password in .env or SMTP Settings.'
      });
    }

    const testMail = {
      from: smtp.from,
      to: testEmail.trim(),
      subject: '✅ Get Pattas Kadai - SMTP Configuration Test Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669; margin-top: 0;">🎉 SMTP Email Connection Verified!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            This is a test notification confirming that your SMTP email service is actively working on <strong>${smtp.host}:${smtp.port}</strong>.
          </p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px; color: #475569;">
            <strong>Sender:</strong> ${smtp.from}<br>
            <strong>Time:</strong> ${new Date().toLocaleString('en-IN')}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Order status updates (Pending, Processing, Completed, Cancelled) will now automatically trigger email updates to your customers!
          </p>
        </div>
      `
    };

    const info = await smtp.transporter.sendMail(testMail);
    return res.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}!`,
      messageId: info.messageId
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `SMTP test failed: ${err.message}`
    });
  }
});


// GET Site Config (Hero & Contact Info)
app.get('/api/config', async (req, res) => {
  try {
    if (isDbConnected) {
      let config = await SiteConfig.findOne({ key: 'main_config' });
      if (!config) config = await SiteConfig.create(memoryConfig);
      return res.json(config);
    }
    return res.json(memoryConfig);
  } catch (error) {
    return res.json(memoryConfig);
  }
});

// PUT Site Config (Admin Update Hero/Contact Details)
app.put('/api/config', async (req, res) => {
  try {
    const updateData = req.body;
    if (isDbConnected) {
      const updated = await SiteConfig.findOneAndUpdate(
        { key: 'main_config' },
        updateData,
        { new: true, upsert: true }
      );
      return res.json({ success: true, config: updated });
    } else {
      memoryConfig = { ...memoryConfig, ...updateData };
      return res.json({ success: true, config: memoryConfig });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Export Express app for Vercel / serverless runtime
module.exports = app;

// Start Express Server only when run directly in local Node.js environment
if (require.main === module && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Get Pattas Kadai Server is running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is already running an active server instance.`);
      process.exit(0);
    }
  });
}
