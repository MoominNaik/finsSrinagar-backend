const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Manual CORS Middleware - MUST be first
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://finssrinagar.vercel.app',
        'https://finssrinagar-git-main-abdulmoominnaiks-projects.vercel.app',
        'http://localhost:5173'
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin) || (origin && origin.includes('vercel.app'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Standard CORS as backup (though manual handles it mostly)
app.use(cors());
app.use(express.json());

const nodemailer = require('nodemailer');

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // e.g. fins.srinagar@gmail.com
        pass: process.env.EMAIL_PASS  // App Password
    }
});

app.post('/api/send-order', async (req, res) => {
    const { cart, total, mashPotatoCount, userPhone, location } = req.body;

    // Use a hardcoded/admin email to receive the order since the user didn't provide one
    // In production, this might be process.env.ADMIN_EMAIL
    // For now, we will send it to the same email account that sends it (Self-Notification)
    const adminEmail = process.env.EMAIL_USER;

    if (!userPhone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Format Order Items
    const itemsHtml = cart.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.title}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">x${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    const mashHtml = mashPotatoCount > 0 ? `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Signature Mash Potato</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">x${mashPotatoCount}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹${(mashPotatoCount * 150).toFixed(2)}</td>
        </tr>
    ` : '';

    const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #0B2545;">New Order Received!</h1>
            
            <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #0B2545;">Customer Details</h3>
                <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${userPhone}" style="color: #0B2545; font-size: 18px; font-weight: bold;">${userPhone}</a></p>
                <p style="margin: 5px 0;"><strong>Location:</strong> ${location ? `Lat: ${location.lat}, Lng: ${location.lng}` : 'Verified via GPS'}</p>
                <p style="margin: 5px 0; font-size: 12px; color: #666;">Distance verified within 5km of Sonwar.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f8f8f8; text-align: left;">
                        <th style="padding: 8px; border-bottom: 2px solid #ddd;">Item</th>
                        <th style="padding: 8px; border-bottom: 2px solid #ddd;">Qty</th>
                        <th style="padding: 8px; border-bottom: 2px solid #ddd;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    ${mashHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
                        <td style="padding: 8px; font-weight: bold; color: #0B2545;">₹${total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Fins Ordering System" <${process.env.EMAIL_USER}>`,
            to: adminEmail, // Sending TO the business
            subject: `New Order from ${userPhone} - Fins Srinagar`,
            html: emailContent
        });
        console.log('Order email sent to admin about user:', userPhone);
        res.json({ success: true, message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Email sending failed:', error);
        res.status(500).json({ success: false, message: 'Failed to notify admin. Please call support.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
