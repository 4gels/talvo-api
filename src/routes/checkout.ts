// src/routes/checkout.ts
// ═══════════════════════════════════════════════════════════════
// ✅ صفحة الدفع الخاصة بـ Talvo
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';

const router = Router();

router.get('/pay/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ref, amount } = req.query;

    if (!orderId || !ref || !amount) {
      return res.status(400).send('Missing parameters');
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const callbackUrl = process.env.TALVO_API_URL;

    res.send(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إتمام الدفع - Talvo</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ✅ الشعار */
    .logo {
      width: 100px;
      height: 100px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f5ff;
      border-radius: 50%;
      padding: 14px;
      box-shadow: 0 8px 24px rgba(111, 66, 193, 0.2);
      border: 3px solid #6f42c1;
    }

    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 50%;
    }

    /* ✅ العنوان الرئيسي */
    body {
      font-family: 'Cairo', sans-serif;
      background: linear-gradient(135deg, #1a1a2e, #0d6efd);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 24px;
      padding: 50px 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 30px 80px rgba(0,0,0,0.3);
      text-align: center;
      position: relative;
    }

    /* ✅ اسم الشركة */
    .brand-name {
      font-size: 14px;
      color: #6f42c1;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    h1 {
      color: #1a1a2e;
      margin-bottom: 10px;
      font-size: 26px;
      font-weight: 800;
    }

    p {
      color: #6c757d;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .amount {
      background: #f8f5ff;
      border: 2px solid #6f42c1;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .amount-label {
      color: #6c757d;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .amount-value {
      font-size: 38px;
      font-weight: 800;
      color: #6f42c1;
    }

    .amount-currency {
      font-size: 14px;
      color: #adb5bd;
      margin-top: 3px;
    }

    #paypal-button-container {
      margin-top: 20px;
      min-height: 100px;
    }

    .secure {
      margin-top: 24px;
      color: #adb5bd;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .loading {
      text-align: center;
      padding: 30px;
      color: #6c757d;
      font-size: 14px;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #6f42c1;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #dc3545;
      padding: 20px;
      background: #f8d7da;
      border-radius: 10px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ✅ الشعار -->
    <div class="logo">
      <img 
        src="https://avatars.githubusercontent.com/u/337130551?s=190&v=4" 
        alt="Talvo Logo"
      />
    </div>

    <!-- ✅ اسم الشركة -->
    <div class="brand-name">TALVO</div>

    <!-- ✅ العنوان -->
    <h1>إتمام الدفع</h1>
    <p>يمكنك الدفع بحساب PayPal أو ببطاقة الائتمان مباشرة</p>

    <!-- ✅ المبلغ -->
    <div class="amount">
      <div class="amount-label">المبلغ المطلوب</div>
      <div class="amount-value">$${amount}</div>
      <div class="amount-currency">USD</div>
    </div>

    <!-- ✅ زر PayPal -->
    <div id="paypal-button-container">
      <div class="loading">
        <div class="spinner"></div>
        جاري تحميل خيارات الدفع...
      </div>
    </div>

    <div class="secure">
      🔐 دفع آمن عبر PayPal
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      var attempts = 0;
      var maxAttempts = 50;

      function tryRender() {
        if (typeof paypal !== 'undefined') {
          renderButtons();
          return;
        }

        attempts++;
        if (attempts > maxAttempts) {
          document.getElementById('paypal-button-container').innerHTML =
            '<div class="error">❌ فشل تحميل PayPal. الرجاء تحديث الصفحة.</div>';
          return;
        }

        setTimeout(tryRender, 100);
      }

      function renderButtons() {
        try {
          document.getElementById('paypal-button-container').innerHTML = '';

          paypal.Buttons({
            style: {
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'paypal',
              height: 50,
            },
            createOrder: async () => {
              return '${orderId}';
            },
            onApprove: async (data, actions) => {
              window.location.href = '${callbackUrl}/api/v1/shop-subscription/success?ref=${ref}&token=' + data.orderID;
            },
            onCancel: () => {
              window.location.href = '${callbackUrl}/api/v1/shop-subscription/cancel?ref=${ref}';
            },
            onError: (err) => {
              console.error('PayPal error:', err);
              alert('حدث خطأ في الدفع. الرجاء المحاولة مرة أخرى.');
            }
          }).render('#paypal-button-container');
        } catch (e) {
          console.error('Render error:', e);
          document.getElementById('paypal-button-container').innerHTML =
            '<div class="error">❌ فشل عرض خيارات الدفع.</div>';
        }
      }

      tryRender();
    });
  </script>
</body>
</html>
    `);
  } catch (error: any) {
    console.error('Checkout page error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>خطأ</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 40px;
            text-align: center;
            background: #f5f7fa;
          }
          h1 { color: #dc3545; }
        </style>
      </head>
      <body>
        <h1>❌ حدث خطأ</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

export default router;