// src/utils/payment.ts
// ═══════════════════════════════════════════════════════════════
// ✅ PayPal Integration with Auto Currency Conversion
// ═══════════════════════════════════════════════════════════════
// - Auto-fetch EGP→USD exchange rate from 3 APIs
// - Fallback to static rate if all APIs fail
// - 1-hour cache to reduce API calls
// - Handles PayPal's EGP limitation (converts to USD)
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';

// ═══════════════════════════════════════════════════════════════
// ✅ إعدادات PayPal
// ═══════════════════════════════════════════════════════════════

const PAYPAL_API_URL =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// ═══════════════════════════════════════════════════════════════
// ✅ الحصول على Access Token
// ═══════════════════════════════════════════════════════════════

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${PAYPAL_API_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    }
  );

  return response.data.access_token;
}

// ═══════════════════════════════════════════════════════════════
// ✅ جلب سعر الصرف EGP → USD (تلقائي + fallback)
// ═══════════════════════════════════════════════════════════════

let _cachedRate: { rate: number; timestamp: number } | null = null;
const RATE_CACHE_DURATION = 60 * 60 * 1000; // ساعة واحدة

/**
 * جلب سعر الصرف من عدة APIs (مع fallback تلقائي)
 * 
 * APIs المستخدمة بالترتيب:
 * 1. exchangerate-api.com (مجاني: 1500 طلب/شهر)
 * 2. open.er-api.com (مجاني: بلا حدود)
 * 3. frankfurter.app (من البنك الأوروبي)
 */
async function getEGPtoUSD(): Promise<number> {
  // ✅ 1. استخدم الـ cache لو لسه صالح
  if (
    _cachedRate &&
    Date.now() - _cachedRate.timestamp < RATE_CACHE_DURATION
  ) {
    console.log(
      `💱 سعر الصرف (cache): 1 USD = ${_cachedRate.rate.toFixed(2)} EGP`
    );
    return _cachedRate.rate;
  }

  const FALLBACK_RATE = parseFloat(
    process.env.EGP_USD_RATE || '53'
  );

  // ✅ 2. جرب عدة APIs بالترتيب
  const apis = [
    {
      name: 'exchangerate-api.com',
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      extract: (data: any) => parseFloat(data?.rates?.EGP),
    },
    {
      name: 'open.er-api.com',
      url: 'https://open.er-api.com/v6/latest/USD',
      extract: (data: any) => parseFloat(data?.rates?.EGP),
    },
    {
      name: 'frankfurter.app',
      url: 'https://api.frankfurter.app/latest?from=USD&to=EGP',
      extract: (data: any) => parseFloat(data?.rates?.EGP),
    },
  ];

  for (const api of apis) {
    try {
      console.log(`🔄 محاولة جلب السعر من: ${api.name}`);

      const res = await axios.get(api.url, { timeout: 5000 });
      const liveRate = api.extract(res.data);

      // ✅ تحقق من صحة السعر
      if (liveRate && liveRate > 20 && liveRate < 200) {
        // ✅ حفظ في cache
        _cachedRate = { rate: liveRate, timestamp: Date.now() };

        console.log(
          `✅ سعر الصرف (live) من ${api.name}: ` +
          `1 USD = ${liveRate.toFixed(2)} EGP`
        );
        return liveRate;
      } else {
        console.log(`⚠️ سعر غير صالح من ${api.name}: ${liveRate}`);
      }
    } catch (e: any) {
      console.log(`⚠️ فشل ${api.name}: ${e.message}`);
      // ✅ جرب الـ API التالي
    }
  }

  // ✅ 3. Fallback ثابت
  console.log(
    `⚠️ كل APIs فشلت — استخدام السعر الثابت: ` +
    `1 USD = ${FALLBACK_RATE.toFixed(2)} EGP`
  );

  _cachedRate = { rate: FALLBACK_RATE, timestamp: Date.now() };
  return FALLBACK_RATE;
}

/**
 * إجبار تحديث سعر الصرف (تجاوز cache)
 * مفيد لو حصل تحديث كبير في السعر
 */
export function invalidateExchangeRate(): void {
  _cachedRate = null;
  console.log('🔄 تم إلغاء cache سعر الصرف');
}

/**
 * الحصول على سعر الصرف الحالي (للعرض)
 */
export async function getCurrentExchangeRate(): Promise<{
  rate: number;
  cached: boolean;
}> {
  const wasCached = !!_cachedRate &&
    (Date.now() - _cachedRate.timestamp < RATE_CACHE_DURATION);
  
  const rate = await getEGPtoUSD();
  
  return {
    rate,
    cached: wasCached,
  };
}

// ═══════════════════════════════════════════════════════════════
// ✅ تعريفات TypeScript
// ═══════════════════════════════════════════════════════════════

interface PaymentSessionParams {
  amount: number;
  currency: string;
  reference: number;
  description: string;
  callback_url: string;
  customer_email?: string;
  tenant_id?: number;
  plan?: string;
  months?: number;
}

interface PaymentSessionResult {
  payment_url: string;
  provider_reference: string;
  provider: string;
  amount_usd: number;
  exchange_rate: number;
  amount_original: number;
  currency_original: string;
}

// ═══════════════════════════════════════════════════════════════
// ✅ إنشاء جلسة دفع PayPal
// ═══════════════════════════════════════════════════════════════

export async function createPaymentSession(
  params: PaymentSessionParams
): Promise<PaymentSessionResult> {
  const accessToken = await getPayPalAccessToken();

  // ═══════════════════════════════════════════════════════════
  // ✅ ✅ ✅ تحويل العملة
  // ═══════════════════════════════════════════════════════════
  // PayPal لا يدعم EGP في Orders API
  // لازم نبعت USD دائماً
  // ═══════════════════════════════════════════════════════════

  const originalCurrency = params.currency.toUpperCase();
  let currency = 'USD';
  let amount = params.amount;
  let exchangeRate = 1;

  if (originalCurrency === 'EGP') {
    exchangeRate = await getEGPtoUSD();
    amount = params.amount / exchangeRate;
  } else if (originalCurrency !== 'USD') {
    // ⚠️ عملات أخرى غير مدعومة
    throw new Error(
      `⚠️ العملة ${originalCurrency} غير مدعومة. استخدم EGP أو USD فقط.`
    );
  }

  // ✅ ضمان الدقة (رقمين عشريين)
  amount = Math.max(0.01, Math.round(amount * 100) / 100);

  console.log(
    `💱 تحويل الدفع: ${params.amount.toFixed(2)} ${originalCurrency} ` +
    `→ ${amount.toFixed(2)} ${currency} ` +
    `(rate: ${exchangeRate.toFixed(2)})`
  );

  // ═══════════════════════════════════════════════════════════
  // ✅ وصف الفاتورة
  // ═══════════════════════════════════════════════════════════

  const description = (
    `${params.description} — ` +
    `${params.amount.toFixed(2)} ج.م ` +
    `(= $${amount.toFixed(2)} USD)`
  ).substring(0, 127); // ✅ الحد الأقصى لـ PayPal 127 حرف

  // ═══════════════════════════════════════════════════════════
  // ✅ بناء الطلب
  // ═══════════════════════════════════════════════════════════

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `sub-${params.reference}`,
        description: description,
        custom_id: `${params.tenant_id}|${params.plan}|${params.months}`,
        amount: {
          currency_code: currency, // ✅ USD دائماً
          value: amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: 'Talvo Shop',
      locale: 'ar-EG',
      landing_page: 'LOGIN',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: `${params.callback_url}/success?ref=${params.reference}`,
      cancel_url: `${params.callback_url}/cancel?ref=${params.reference}`,
    },
  };

  console.log(
    '📤 PayPal Payload:',
    JSON.stringify(
      {
        currency: orderPayload.purchase_units[0].amount.currency_code,
        value: orderPayload.purchase_units[0].amount.value,
        description: orderPayload.purchase_units[0].description,
      },
      null,
      2
    )
  );

  // ═══════════════════════════════════════════════════════════
  // ✅ إرسال لـ PayPal
  // ═══════════════════════════════════════════════════════════

  try {
    const orderResp = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      orderPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const order = orderResp.data;

    const approveLink = order.links?.find(
      (link: any) => link.rel === 'approve'
    );

    if (!approveLink) {
      throw new Error('لم يتم استلام رابط الموافقة من PayPal');
    }

    console.log(`✅ تم إنشاء PayPal Order: ${order.id}`);
    console.log(`💰 المبلغ النهائي: $${amount.toFixed(2)} USD`);

    return {
      payment_url: approveLink.href,
      provider_reference: order.id,
      provider: 'paypal',
      amount_usd: amount,
      exchange_rate: exchangeRate,
      amount_original: params.amount,
      currency_original: originalCurrency,
    };
  } catch (error: any) {
    const errData = error.response?.data;

    console.error('❌ PayPal createPaymentSession error:', {
      status: error.response?.status,
      issue: errData?.details?.[0]?.issue,
      description: errData?.details?.[0]?.description,
      debug_id: errData?.debug_id,
      message: error.message,
    });

    // ✅ رفع الخطأ برسالة واضحة
    const issue = errData?.details?.[0]?.issue || '';
    const desc = errData?.details?.[0]?.description || error.message;

    throw new Error(
      `فشل إنشاء جلسة الدفع: ${issue ? `${issue} — ` : ''}${desc}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ✅ Capture PayPal Order
// ═══════════════════════════════════════════════════════════════

export async function capturePayPalOrder(orderId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();

  try {
    const captureResp = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return captureResp.data;
  } catch (error: any) {
    console.error('❌ PayPal capture error:', {
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// ✅ التحقق من الـ Webhook (اختياري — للأمان)
// ═══════════════════════════════════════════════════════════════

export async function verifyPayPalWebhook(
  headers: any,
  body: any
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();

    const verificationPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    };

    const resp = await axios.post(
      `${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
      verificationPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return resp.data.verification_status === 'SUCCESS';
  } catch (error: any) {
    console.error(
      '⚠️ Webhook verify error:',
      error.response?.data || error.message
    );
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// ✅ تصدير الدوال
// ═══════════════════════════════════════════════════════════════

export default {
  createPaymentSession,
  capturePayPalOrder,
  verifyPayPalWebhook,
  invalidateExchangeRate,
  getCurrentExchangeRate,
};