const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create admin user if not exists
    // const User = require('../models/User');
    // const adminExists = await User.findOne({ email: 'admin@rentright.com' });

    // if (!adminExists) {
    //   await User.create({
    //     firstName: 'Admin',
    //     lastName: 'RentRight',
    //     company: 'RentRight',
    //     email: 'admin@rentright.com',
    //     phone: 9876543210,
    //     password: 'admin123',
    //     role: 'admin'
    //   });
    //   console.log('✅ Admin user created');
    // }

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;