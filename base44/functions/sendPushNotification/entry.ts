import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as jose from 'npm:jose@5.9.6';

function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr) {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJwt(endpoint, privateKeyB64, publicKeyB64, email) {
  const audience = new URL(endpoint).origin;
  const pubKeyRaw = base64urlToUint8Array(publicKeyB64);
  const x = uint8ArrayToBase64url(pubKeyRaw.slice(1, 33));
  const y = uint8ArrayToBase64url(pubKeyRaw.slice(33, 65));

  const privateKey = await jose.importJWK({ kty: 'EC', crv: 'P-256', d: privateKeyB64, x, y }, 'ES256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new jose.SignJWT({ aud: audience, exp: now + 43200, sub: `mailto:${email}` })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .sign(privateKey);

  return jwt;
}

async function encryptPayload(subscriptionKeys, payloadStr) {
  const enc = new TextEncoder();
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));

  const clientPublicKey = await crypto.subtle.importKey(
    'raw', base64urlToUint8Array(subscriptionKeys.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256));
  const authSecret = base64urlToUint8Array(subscriptionKeys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prkKeyMaterial = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);
  const keyInfo = new Uint8Array([
    ...enc.encode('WebPush: info\0'),
    ...base64urlToUint8Array(subscriptionKeys.p256dh),
    ...serverPublicKeyRaw
  ]);

  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo },
    prkKeyMaterial, 256
  );

  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm\0') }, ikmKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce\0') }, ikmKey, 96);

  const aesKey = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);
  const plaintext = enc.encode(payloadStr);
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;

  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(nonceBits) }, aesKey, padded));

  const header = new Uint8Array(16 + 4 + 1 + serverPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = serverPublicKeyRaw.length;
  header.set(serverPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);
  return body;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userEmail, user_id, title, message, body, url, unreadCount } = await req.json();

    let subscriptions = [];

    if (user_id) {
      subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_id });
    } else if (userEmail) {
      // Look up user_id by email via memberships or direct user lookup
      const allSubs = await base44.asServiceRole.entities.PushSubscription.list();
      // Fall back: find by matching user email through platform users
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users.length > 0) {
        subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: users[0].id });
      }
    }

    if (subscriptions.length === 0) return Response.json({ success: false, reason: 'no_subscription' });

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidEmail = Deno.env.get('VAPID_EMAIL');

    const results = [];
    for (const sub of subscriptions) {
      const jwt = await buildVapidJwt(sub.endpoint, vapidPrivateKey, vapidPublicKey, vapidEmail);
      const encryptedBody = await encryptPayload(sub.keys, JSON.stringify({ title, body: message || body || '', url: url || '/', unreadCount: unreadCount || 0 }));

      const response = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'TTL': '86400'
        },
        body: encryptedBody
      });

      if (response.status === 404 || response.status === 410) {
        await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
        results.push({ endpoint: sub.endpoint, status: 'expired' });
      } else if (response.status >= 400) {
        const text = await response.text();
        results.push({ endpoint: sub.endpoint, status: 'error', detail: text });
      } else {
        results.push({ endpoint: sub.endpoint, status: 'sent' });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});