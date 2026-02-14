// 简单的测试脚本，用于测试Google Vision API调用逻辑
import { createPrivateKey, createSign } from 'crypto';
import fetch from 'node-fetch';

// 模拟环境变量
const env = {
  GOOGLE_CLIENT_EMAIL: "vision-access-864@tonal-plateau-437106-u3.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCeQD5taZgQNl2y
crxb2K1lS5CkAsk/GmP2MQ9feN7ZsNxuDtOlOVWEtz3GHy2NOJmYrom+593rz/08
issE577ObtEKioQRxtY3z5WYjgNgR0s+KfmhAPIYXlhNsPnUbI3p1eyVJUTWAeog
VYB6juF8YgjvJcDg3vERqt1MKjNKeVxIPGsM3GBzcNNAgecZGyw+wNvxuWnpli0l
zAzQf74Cf3otUV4+z8WtyDIuDght4EBKgcIdgWQEzGQppzR6TwDGewlJHuUkWbWZ
5DcLMPBqQS2QimcXGNODhNoRZfixiIksZJm4GH+6m3SM4XX/SuQ2gNCTKz6bpB1N
1/kmsQ5PAgMBAAECggEAHIoDeCHh7ZKQZT0x4PJ7mtf81sc12e59dom0dwhKUEII
DsUXwCVN2ehd+Jvo0B4T/SgE6WvRZtSUm9V/9XuBuqLbiiYe2UHdoiUKmn+J9lQF
KsnRHgsYnfJtxF0VQQzuruwIhYE6H8oqmfgxemjIG3FmoRJS7XrnSMNis3is1VIz
CbS5R+iQ7KQUS+gF8mRrzBK16/GKICyO7XlXAxnSiV43LUpSGRYv9vEjwrPr+3E4
RLO20URHqzEUGNDvUqJ3HwdstcgQOgBW0BfGuqtTlNUbZF1Ey7ijk1x/+DQSWb+s
RL4nAuolOiwXcKiCjKFQzGvs5Ok0Bz5lAyZmIsf38QKBgQDMnefq6IOPRjyaBgIH
FnuKIDSvCnQNlhopS0XRDV6yb7g76Kk7sdC2/GnQAekvedJSjwuyyu9SJXCdRueS
RZT0V96XmImcEBAhM94Bg17TsFuKaV/Avv8yVuSHjRDcNSCMlIYdI5OQA8F0Uzbl
FLSyoL4gz55exI47cMYlrWmohwKBgQDF/aPGzhQM0uc5NQjFCNT/3/t8iH+PRteB
Pi0oJny9cQQCbqUSjoy2gxQ0TMVVYeNZ7QUMVXiOQYFv/OnH8nOdiys7lBrn9EiF
ua8pSHE4r5JqIjEwCYec4rh3UuG3W+/yRiiGpo8G4jVDVV7cGGaN0bMmRP0THxiQ
BSdI9DKF+QKBgF421vJy3SC7VmwVGBnrYDbZXWi7h3Q6CRG6dwsq/M9sYYg0OLgj
x9Z5or8EIjqZ/R3Gf7xzdH5+frvsSfQv1cYsL3Hd6n7RZpvjJfXMZ31RVtUEb/Jv
/1FOcSt46Kp8S+BvAtGn7+n/0LOfHUedoRYerWyuLF22Y0c7RgFTN7NBAoGBAMXa
EFbzyt+BxqTJVakoiUnltzecY/R2s5ao3pFX3KGnFX2kufrQTtd4J7GX4j7PolVT
4Q6RPvbRiRqzH5+6rkSKNTrFZxnSaMKRavQTO2mNMgAziPnbHBTwD6zWO09zZVWz
PH5KZXVYiiduYWwKSjmAi8k7ebcpBO+u5rIlrXNpAoGBAKGBuK70JF00cGYVwGX7
/aCgirEaXymdmRxt679BFlQ19Oe1mOu+GWd9qet3UEHhSDWyj4z8CHgn4DNHRP56
ULImZe8BNPdv4Za9jecYOysv0kNuHDVVNroGPbJQwnqCSrLv/gY0j/kQfHaw/CBx
eQz628nAwgQP/ZIaQDGTkllj
-----END PRIVATE KEY-----`
};

// 测试Google Vision API调用
async function testVisionAPI() {
  console.log('[VISION] client_email exists:', !!env.GOOGLE_CLIENT_EMAIL);
  console.log('[VISION] private_key length:', env.GOOGLE_PRIVATE_KEY?.length);
  
  // 检查私钥是否有效
  if (!env.GOOGLE_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY.length < 1000) {
    throw new Error('Invalid private key');
  }
  
  if (!env.GOOGLE_CLIENT_EMAIL) {
    throw new Error('Missing client email');
  }
  
  // 1. 生成 JWT Token
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  // 处理私钥，替换 \n 为实际换行符
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  
  // 2. 生成 JWT 签名
  async function signJwt(payload, privateKey) {
    // Base64URL 编码函数
    function base64UrlEncode(str) {
      return Buffer.from(str).toString('base64url');
    }
    
    // 生成 header 和 payload
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    
    // 解析私钥
    const key = createPrivateKey({
      key: privateKey,
      format: 'pem'
    });
    
    // 签名
    const sign = createSign('RSA-SHA256');
    sign.write(unsignedToken);
    sign.end();
    const signature = sign.sign(key);
    
    // 组合 JWT
    const encodedSignature = base64UrlEncode(signature);
    return `${unsignedToken}.${encodedSignature}`;
  }
  
  const jwt = await signJwt(payload, privateKey);
  console.log('[VISION] Generated JWT:', jwt.slice(0, 50) + '...');
  
  // 3. 获取 OAuth Token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.json().catch(() => ({}));
    throw new Error(`Failed to get OAuth token: ${tokenResponse.status} ${JSON.stringify(tokenError)}`);
  }
  
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  console.log('[VISION] Got access token:', accessToken.slice(0, 50) + '...');
  
  // 4. 下载测试图片
  const testImageUrl = 'https://via.placeholder.com/150';
  const imageResponse = await fetch(testImageUrl, {
    redirect: 'follow'
  });
  
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  
  // 5. 将图片转换为 Base64
  const imageBuffer = await imageResponse.buffer();
  const imageBase64 = imageBuffer.toString('base64');
  console.log('[VISION] Image base64 length:', imageBase64.length);
  
  // 6. 调用 Google Vision API
  const visionResponse = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: imageBase64
          },
          features: [
            {
              type: 'TEXT_DETECTION'
            }
          ]
        }
      ]
    })
  });
  
  if (!visionResponse.ok) {
    const visionError = await visionResponse.json().catch(() => ({}));
    throw new Error(`Failed to call Vision API: ${visionResponse.status} ${JSON.stringify(visionError)}`);
  }
  
  const visionData = await visionResponse.json();
  console.log('[VISION] API call successful!');
  console.log('[VISION] Response:', JSON.stringify(visionData, null, 2));
  
  return visionData;
}

// 运行测试
testVisionAPI()
  .then(result => {
    console.log('[VISION] Test completed successfully!');
  })
  .catch(error => {
    console.error('[VISION] Test failed:', error.message);
    console.error('[VISION] Error stack:', error.stack);
  });
