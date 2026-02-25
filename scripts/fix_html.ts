import fs from 'fs';
import path from 'path';

const serverFile = path.resolve(__dirname, '../src/server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// Section 1: PROFILE_MISSING HTML
content = content.replace(/(return res\.send\(`)[\s\S]*?(<\/html>\s*`\);)/, `return res.send(\`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Registration Required - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', sans-serif;
            background: #020617;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 24px;
        }
        .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px 24px;
            border-radius: 24px;
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .icon-wrap {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            width: 80px;
            height: 80px;
            border-radius: 40px;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 24px;
        }
        .icon-wrap ion-icon { font-size: 38px; color: #10B981; }
        h1 { color: #fff; margin: 0 0 12px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        p { color: #8899aa; margin: 0 0 32px 0; line-height: 1.6; font-size: 15px; }
        .btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px 24px;
            border-radius: 16px;
            background: #fff;
            color: #000;
            text-decoration: none;
            font-weight: 700;
            font-size: 15px;
            transition: all 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255, 255, 255, 0.1); }
        .footer { margin-top: 24px; color: #334455; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap">
            <ion-icon name="qr-code-outline"></ion-icon>
        </div>
        <h1>Almost Ready!</h1>
        <p>Tag <b>\${tagId}</b> exists but hasn't been set up yet. If you are the owner, please register it using the Connect360 app.</p>
        <a href="https://carcard.app/scan/\${tagId}" class="btn-primary">
            Open in App
            <ion-icon name="arrow-forward"></ion-icon>
        </a>
        <div class="footer">Connect360 Secure Tag</div>
    </div>
</body>
</html>
\`);`);

// Section 2: 404 Tag Not Found HTML
content = content.replace(/(res\.status\(404\)\.send\(`)[\s\S]*?(<\/html>\s*`\);)/, `res.status(404).send(\`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tag Not Found</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0F172A, #1E293B, #334155);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 24px;
        }
        .card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.07);
            padding: 48px 32px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            text-align: center;
            max-width: 360px;
            width: 100%;
        }
        .icon-wrap {
            background: rgba(239, 68, 68, 0.10);
            border: 1px solid rgba(239, 68, 68, 0.28);
            width: 90px;
            height: 90px;
            border-radius: 45px;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 24px;
        }
        .icon-wrap ion-icon { font-size: 44px; color: #EF4444; }
        h1 { color: #F0F4FA; margin: 0 0 12px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
        p { color: #8499B0; margin: 0; line-height: 1.6; font-size: 15px; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap">
            <ion-icon name="alert-circle-outline"></ion-icon>
        </div>
        <h1>Tag Not Found</h1>
        <p>This tag may be inactive or does not exist in our system. Contact support for assistance.</p>
    </div>
</body>
</html>
\`);`);

// Section 3: /message 400 HTML
content = content.replace(/(if \(!ownerId\) \{\s*return res\.status\(400\)\.send\(`)[\s\S]*?(<\/html>\s*`\);\s*\})/, `if (!ownerId) {
        return res.status(400).send(\`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invalid Request - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'DM Sans', sans-serif; background: #020617; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
        .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 24px; max-width: 400px; }
        h1 { font-size: 24px; margin-bottom: 16px; color: #EF4444; }
        p { color: #8899aa; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Link Invalid</h1>
        <p>This messaging link is missing required information. Please scan the QR code again.</p>
    </div>
</body>
</html>
        \`);
    }`);

// Section 4: /message 404 HTML
content = content.replace(/(if \(!owner\) \{\s*return res\.status\(404\)\.send\(`)[\s\S]*?(<\/html>\s*`\);\s*\})/, `if (!owner) {
        return res.status(404).send(\`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Owner Not Found - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'DM Sans', sans-serif; background: #020617; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
        .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 24px; max-width: 400px; }
        h1 { font-size: 24px; margin-bottom: 16px; color: #FACC15; }
        p { color: #8899aa; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Owner Not Found</h1>
        <p>The owner of this tag could not be located. Please contact support if you believe this is an error.</p>
    </div>
</body>
</html>
        \`);
    }`);

// Section 5: /message send HTML
content = content.replace(/(res\.send\(`)[\s\S]*?(<\/html>\s*`\);\s*\}\);)/, `res.send(\`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Message Owner - Connect360</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #FACC15;
            --bg: #020617;
            --card: #0f172a;
            --input: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            font-family: 'DM Sans', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { max-width: 400px; width: 100%; }
        .card {
            background: var(--card);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 28px;
            padding: 32px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
        .header { margin-bottom: 24px; text-align: center; }
        .header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 8px; }
        .header p { color: var(--text-muted); font-size: 14px; }
        
        .contact-methods { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .btn-call {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: #22c55e;
            color: #fff;
            text-decoration: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 700;
            transition: all 0.2s;
        }
        .btn-call:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(34, 197, 94, 0.2); }
        .divider { display: flex; align-items: center; text-align: center; color: var(--text-muted); font-size: 12px; text-transform: uppercase; font-weight: 600; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1); margin: 0 10px; }

        form { display: flex; flex-direction: column; gap: 20px; }
        .field { display: flex; flex-direction: column; gap: 8px; }
        label { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        input, textarea {
            background: var(--input);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 14px 16px;
            color: var(--text);
            font-family: inherit;
            font-size: 15px;
            transition: all 0.2s;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.1);
        }
        textarea { height: 120px; resize: none; }
        
        button {
            background: var(--primary);
            color: #000;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(250, 204, 21, 0.2); }
        button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        
        .success-message {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .success-message ion-icon { font-size: 48px; color: #22C55E; margin-bottom: 16px; }
        .success-message h2 { margin-bottom: 8px; }
        .success-message p { color: var(--text-muted); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    </style>
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
</head>
<body>
    <div class="container fade-in">
        <div class="card" id="formCard">
            <div class="header">
                <h1>Contact Owner</h1>
                <p>Get in touch with the vehicle owner.</p>
            </div>

            <div class="contact-methods">
                \${owner.phoneNumber ? \`
                <a href="tel:\${owner.phoneNumber}" class="btn-call">
                    <ion-icon name="call-outline"></ion-icon>
                    Call Owner
                </a>
                <div class="divider">Or Send Message</div>
                \` : ''}
            </div>

            <form id="messageForm">
                <div class="field">
                    <label for="senderName">Your Name</label>
                    <input type="text" id="senderName" placeholder="e.g. John Doe" required>
                </div>

                <div class="field">
                    <label for="message">Message</label>
                    <textarea id="message" placeholder="Write your message here..." required></textarea>
                </div>

                <button type="submit" id="sendBtn">Send Message</button>
            </form>
        </div>

        <div class="card success-message" id="successCard">
            <ion-icon name="checkmark-circle"></ion-icon>
            <h2>Message Sent!</h2>
            <p>The owner has been notified via push notification.</p>
        </div>
    </div>

    <script>
        const form = document.getElementById('messageForm');
        const sendBtn = document.getElementById('sendBtn');
        const formCard = document.getElementById('formCard');
        const successCard = document.getElementById('successCard');

        form.onsubmit = async (e) => {
            e.preventDefault();

            const senderName = document.getElementById('senderName').value;
            const message = document.getElementById('message').value;
            const urlParams = new URLSearchParams(window.location.search);
            const ownerId = urlParams.get('ownerId');

            if (!senderName || !message || !ownerId) return;

            sendBtn.disabled = true;
            sendBtn.innerText = 'Sending...';

            try {
                const response = await fetch('/api/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ownerId, senderName, message })
                });

                if (response.ok) {
                    formCard.style.display = 'none';
                    successCard.style.display = 'block';
                    successCard.classList.add('fade-in');
                } else {
                    alert('Failed to send message. Please try again.');
                    sendBtn.disabled = false;
                    sendBtn.innerText = 'Send Message';
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please check your connection.');
                sendBtn.disabled = false;
                sendBtn.innerText = 'Send Message';
            }
        };
    </script>
</body>
</html>
    \`);
});`);

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Successfully updated HTML in server.ts.');
