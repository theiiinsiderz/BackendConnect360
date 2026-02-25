import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
// Configure axios to not throw on error status
const api = axios.create({
    validateStatus: () => true
});

const PHONE = '9999999999';
const HOST = 'http://localhost:5000';

async function main() {
    console.log('🧪 Starting Admin Flow Test...');

    // 0. Ensure user exists and is NOT admin initially
    let user = await prisma.user.findUnique({ where: { phoneNumber: PHONE } });
    if (!user) {
        user = await prisma.user.create({ data: { phoneNumber: PHONE, role: 'user' } });
        console.log('Created test user');
    } else {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'user' } });
        console.log('Reset test user to role "user"');
    }

    // 1. Login to get Token
    // First send OTP (mock)
    await api.post(`${HOST}/api/auth/send-otp`, { phoneNumber: PHONE });
    // Verify OTP (mock is known from controller/store logic? Controller stores in memory variable otpStore)
    // Wait... authController stores OTP in memory variable `otpStore`. 
    // And `sendOtp` generates a random one. I can't know it without looking at server logs.
    // However, I can manually inject the OTP into the running server? No.
    // I should modify authController to use a fixed OTP for a specific test number or just look at logs?
    // OR, I can use the existing token generation logic if I can mock it?
    // Actually, for this test, I can cheat and generate a valid token myself since I have the secret.
    // BUT, that requires knowing the secret used by the server (default 'your-secret-key').

    // Alternative: Just rely on unit-test style where I import app? No, e2e is better.
    // Let's use the default secret 'your-secret-key' and sign a token locally.

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { id: user.id, role: 'user' },
        'your-secret-key',
        { expiresIn: '1h' }
    );
    console.log('🔑 Generated test token');

    // 2. Try Admin Action (Should Fail)
    console.log('👉 Attempting Admin Action as User...');
    let res = await api.post(`${HOST}/api/admin/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 403) {
        console.log('✅ Correctly denied access (403)');
    } else {
        console.error(`❌ Unexpected status: ${res.status}`);
    }

    // 3. Promote to Admin
    console.log('👑 Promoting user to Admin...');
    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin' }
    });

    // 4. Try Admin Action (Should Succeed)
    console.log('👉 Attempting Admin Action as Admin...');
    res = await api.post(`${HOST}/api/admin/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 200) {
        console.log('✅ Admin access granted (200)');
        // Check content type
        if (res.headers['content-type'] === 'application/pdf') {
            console.log('✅ Received PDF content');
        } else {
            console.error('❌ Did not receive PDF');
        }
    } else {
        console.error(`❌ Unexpected status: ${res.status}`);
        console.log(res.data);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
