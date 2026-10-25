const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Safaricom Daraja Credentials (Environment Variables)
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '174379'; // Test Sandbox Shortcode
const PASSKEY = process.env.PASSKEY;

// 1. Generate Safaricom Access Token
async function getAccessToken() {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: { Authorization: `Basic ${auth}` }
    });
    return res.data.access_token;
}

// 2. STK Push Endpoint
app.post('/stkpush', async (req, res) => {
    try {
        const { phone, amount } = req.body;
        const token = await getAccessToken();

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

        // Format phone number to 2547XXXXXXXX
        let formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone;

        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: "https://wifi-mtaani-backend.onrender.com/callback",
            AccountReference: "WifiMtaani",
            TransactionDesc: "Internet Subscription"
        };

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: "STK Push failed" });
    }
});

// 3. Callback Endpoint (Safaricom sends payment result here)
app.post('/callback', (req, res) => {
    console.log('M-Pesa Callback Response:', JSON.stringify(req.body));
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  
