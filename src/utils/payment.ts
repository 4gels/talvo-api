import axios from 'axios';

const PAYPAL_API_URL =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

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
}

export async function createPaymentSession(
  params: PaymentSessionParams
): Promise<PaymentSessionResult> {
  const accessToken = await getPayPalAccessToken();

  // ✅ PayPal LIVE — نستخدم العملة الحقيقية مباشرة
  const currency = params.currency.toUpperCase();
  const amount = params.amount;
  
  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `sub-${params.reference}`,
        description: params.description,
        custom_id: `${params.tenant_id}|${params.plan}|${params.months}`,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: 'Talvo',
      locale: 'ar-EG',
      logo_url: 'https://avatars.githubusercontent.com/u/337130551?v=4&s=190',
      landing_page: 'LOGIN',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: `${params.callback_url}/success?ref=${params.reference}`,
      cancel_url: `${params.callback_url}/cancel?ref=${params.reference}`,
    },
  };

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

  const approveLink = order.links.find(
    (link: any) => link.rel === 'approve'
  );

  if (!approveLink) {
    throw new Error('No approve link from PayPal');
  }

  return {
    payment_url: approveLink.href,
    provider_reference: order.id,
    provider: 'paypal',
  };
}

export async function capturePayPalOrder(orderId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();

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
}