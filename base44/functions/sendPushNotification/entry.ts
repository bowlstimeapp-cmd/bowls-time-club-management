import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as jose from 'npm:jose@5.9.3';

// ── helpers ────────────────────────────────────────────────────────────────

function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJwt(audience, email, privateKeyB64url) {
  // Import the raw 32-byte private key as a P-256 JWK
  const rawPriv = base64urlDecode(privateKeyB64url);
  const pubKeyB64 = Deno.env.get('VAPID_PUBLIC_KEY');
  const rawPub = base64urlDecode(pubKeyB64);
  // rawPub is 65-byte uncompressed point: 0x04 | x (32) | y (32)
  const x = base64urlEncode(rawPub.slice(1, 33));
  const y = base64urlEncode(rawPub.slice(33, 65));
  const d = base64urlEncode(rawPriv);

  const jwk = { kty: 'EC', crv: 'P-256', x, y, d };
  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new jose.SignJWT({ sub: email })
    .setProtectedHeader({ alg: 'ES256' })
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 12 * 3600)
    .sign(privateKey);

  return jwt;
}

// RFC 8291 aes128gcm content encoding
async function encryptPayload(p256dhB64, authB64, plaintext) {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const receiverPub = await crypto.subtle.importKey(
    'raw', base64urlDecode(p256dhB64),
    { name: 'ECDH', namedCurve: 'P-256' }, true, []
  );

  // Generate ephemeral sender key pair
  const senderKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeys.publicKey));

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPub }, senderKeys.privateKey, 256
  ));

  const authBytes = base64urlDecode(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF-SHA256 PRK = HMAC-SHA256(auth, sharedSecret)
  const ikm = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', ikm, authBytes));

  // Expand PRK for the key info
  const keyInfoStr = 'WebPush: info\x00';
  const keyInfo = new Uint8Array([
    ...encoder.encode(keyInfoStr),
    ...new Uint8Array(await crypto.subtle.exportKey('raw', receiverPub)),
    ...senderPubRaw,
  ]);
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ikmExpanded = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, new Uint8Array([...keyInfo, 0x01])));

  // HKDF using salt
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const saltPrk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikmExpanded));

  const saltPrkKey = await crypto.subtle.importKey('raw', saltPrk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = encoder.encode('Content-Encoding: nonce\x00');

  const cek = (await crypto.subtle.sign('HMAC', saltPrkKey, new Uint8Array([...cekInfo, 0x01]))).slice(0, 16);
  const nonce = (await crypto.subtle.sign('HMAC', saltPrkKey, new Uint8Array([...nonceInfo, 0x01]))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);

  // Padding: add 0x02 delimiter + 0 bytes padding
  const paddedPlaintext = new Uint8Array([...plaintextBytes, 0x02]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext));

  // Build RFC 8291 header: salt(16) + rs(4) + keyid_len(1) + sender_pub(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + senderPubRaw.length);
  header.set(salt, 0);
  const view = new DataView(header.buffer);
  view.setUint32(16, rs, false);
  header[20] = senderPubRaw.length;
  header.set(senderPubRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);
  return body;
}

// ── main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow service-role calls (from other backend functions) and authenticated users
    let user = null;
    try { user = await base44.auth.me(); } catch { /* service-role call */ }

    const body = await req.json();
    const { userEmail, title, message, url } = body;

    if (!userEmail || !title) {
      return Response.json({ error: 'Missing userEmail or title' }, { status: 400 });
    }

    const privateKeyB64 = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidEmail = Deno.env.get('VAPID_EMAIL');
    if (!privateKeyB64 || !vapidEmail) {
      return Response.json({ error: 'VAPID secrets not configured' }, { status: 500 });
    }

    // Find subscriptions for the user
    const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: userEmail });
    if (!subs.length) {
      return Response.json({ success: false, reason: 'No push subscription found for user' });
    }

    const payload = JSON.stringify({ title, body: message || '', url: url || 'https://app.bowls-time.com' });
    const results = [];

    for (const sub of subs) {
      try {
        const parsedUrl = new URL(sub.endpoint);
        const audience = `${parsedUrl.protocol}//${parsedUrl.host}`;
        // Apple requires sub to be in mailto: format
        const subEmail = vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`;
        const jwt = await buildVapidJwt(audience, subEmail, privateKeyB64);
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

        let body;
        let contentEncoding = 'aes128gcm';
        if (sub.p256dh && sub.auth) {
          body = await encryptPayload(sub.p256dh, sub.auth, payload);
        } else {
          body = new TextEncoder().encode(payload);
          contentEncoding = 'plaintext';
        }

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': contentEncoding,
            'TTL': '86400',
          },
          body,
        });

        if (response.status === 410 || response.status === 404) {
          // Subscription expired — clean up
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
          results.push({ endpoint: sub.endpoint, status: 'expired_removed' });
        } else if (response.ok || response.status === 201) {
          results.push({ endpoint: sub.endpoint, status: 'sent' });
        } else {
          const errText = await response.text();
          results.push({ endpoint: sub.endpoint, status: 'failed', code: response.status, error: errText });
        }
      } catch (err) {
        results.push({ endpoint: sub.endpoint, status: 'error', error: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});