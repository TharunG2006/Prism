/**
 * Prism E2EE Crypto Module
 * Uses Web Crypto API for secure encryption, decryption, and key management.
 */

const RSA_PARAMS = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

/**
 * Generate a new RSA Key Pair for E2EE
 */
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    RSA_PARAMS,
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a public key to PEM format for sharing with the server
 */
export async function exportPublicKey(key) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const body = btoa(String.fromCharCode(...new Uint8Array(exported)));
  return `-----BEGIN PUBLIC KEY-----\n${body.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
}

/**
 * Derives a Master Key from a password using PBKDF2
 */
export async function deriveMasterKey(password, salt) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt the private key with the master key for secure storage on server
 */
export async function encryptPrivateKey(privateKey, masterKey) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    exported
  );

  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt the private key using the master key
 */
export async function decryptPrivateKey(encryptedData, iv, masterKey) {
  const data = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const ivData = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivData },
    masterKey,
    data
  );

  return await window.crypto.subtle.importKey(
    "pkcs8",
    decrypted,
    RSA_PARAMS,
    true,
    ["decrypt"]
  );
}

/**
 * Encrypt a message using AES-GCM and encrypt the AES key with both Recipient's and Sender's RSA Public Keys
 */
export async function encryptMessage(text, recipientPublicKey, senderPublicKey) {
  const enc = new TextEncoder();
  
  // 1. Generate random AES-256 key for the message
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt text with AES key
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    enc.encode(text)
  );

  // 3. Export AES key to encrypt it for recipients
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 4. Encrypt AES key for Recipient
  const encryptedKeyRecipient = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exportedAesKey
  );

  // 5. Encrypt AES key for Sender (for history/multi-device)
  const encryptedKeySender = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    exportedAesKey
  );

  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKeyRecipient))),
    senderEncryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKeySender))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Import a Public Key from PEM format
 */
export async function importPublicKey(pem) {
  if (!pem) return null;
  // Clean all whitespace, newlines, and labels
  const body = pem
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');
  
  try {
    const data = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      "spki",
      data,
      RSA_PARAMS,
      true,
      ["encrypt"]
    );
  } catch (err) {
    console.error("Public key import failed:", err);
    return null;
  }
}

/**
 * Decrypt a message
 */
export async function decryptMessage(payload, myPrivateKey, isSender = false) {
  const dec = new TextDecoder();
  
  if (!payload.encryptedContent || !payload.iv) {
    throw new Error("Payload missing required encryption data");
  }

  const encryptedContent = Uint8Array.from(atob(payload.encryptedContent), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));

  // Pick the right key (either the primary encryptedKey or the senderEncryptedKey)
  let targetKeyBase64 = isSender ? payload.senderEncryptedKey : payload.encryptedKey;
  
  // High-reliability fallback: if I'm the sender but senderEncryptedKey is missing, try recipient's slot 
  // (In case the client was broken during sending and only generated one key)
  if (!targetKeyBase64 && payload.encryptedKey) {
     targetKeyBase64 = payload.encryptedKey;
  }
  
  if (!targetKeyBase64) {
    throw new Error("Missing encrypted key for decryption in any slot");
  }

  // 3. Decrypt the key using my private key
  let decryptedSymmetricKeyData;
  try {
    const keyData = Uint8Array.from(atob(targetKeyBase64), (c) => c.charCodeAt(0));
    decryptedSymmetricKeyData = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      myPrivateKey,
      keyData
    );
  } catch (err) {
    console.warn("[CRYPTO] RSA Decryption failed (Wrong key?):", err);
    throw new Error("RSA_DECRYPT_FAILED");
  }

  // 4. Import the key for AES-GCM
  let aesKey;
  try {
    aesKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedSymmetricKeyData,
      "AES-GCM",
      true,
      ["decrypt"]
    );
  } catch (err) {
      console.warn("[CRYPTO] AES Key import failed:", err);
      throw new Error("AES_IMPORT_FAILED");
  }

  // 5. Decrypt content
  try {
    const contentData = Uint8Array.from(atob(payload.encryptedContent), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      contentData
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn("[CRYPTO] AES Content decryption failed:", err);
    throw new Error("AES_DECRYPT_FAILED");
  }
}

/**
 * Encrypt the AES session key with an RSA Public Key (for Multicast)
 */
export async function encryptSessionKey(sessionKeyBuffer, publicKeyPem) {
  const publicKey = await importPublicKey(publicKeyPem);
  if (!publicKey) throw new Error("Could not import public key for session key encryption");
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    sessionKeyBuffer
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/**
 * Encrypt a message using AES-GCM and return the session key for multicast distribution
 */
export async function encryptMessageForGroup(text, myPrivateKey) {
  const enc = new TextEncoder();
  const aesKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, enc.encode(text));
  const sessionKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // For groups, we should sign the message or hash it, but for now we focus on keys.
  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    iv: btoa(String.fromCharCode(...iv)),
    sessionKey,
    signature: 'v1-encrypted'
  };
}

/**
 * Encrypt a binary file ArrayBuffer for Group (Multicast) or 1-to-1
 */
export async function encryptFile(arrayBuffer, recipientPublicKey, senderPublicKey, isGroup = false) {
  const aesKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedFileData = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, arrayBuffer);
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  if (isGroup) {
     return {
        encryptedBlob: new Blob([encryptedFileData]),
        iv: btoa(String.fromCharCode(...iv)),
        sessionKey: exportedAesKey
     };
  }

  // 1-on-1 Logic (Backward compatible)
  // Ensure the keys are imported if they are PEM strings
  const rKey = typeof recipientPublicKey === 'string' ? await importPublicKey(recipientPublicKey) : recipientPublicKey;
  const sKey = typeof senderPublicKey === 'string' ? await importPublicKey(senderPublicKey) : senderPublicKey;

  const encKeyR = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, rKey, exportedAesKey);
  const encKeyS = sKey ? await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, sKey, exportedAesKey) : null;
  
  return {
    encryptedBlob: new Blob([encryptedFileData]),
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encKeyR))),
    senderEncryptedKey: encKeyS ? btoa(String.fromCharCode(...new Uint8Array(encKeyS))) : null,
    iv: btoa(String.fromCharCode(...iv)),
    sessionKey: exportedAesKey // Return this too for manual handling
  };
}

/**
 * Decrypt a binary file ArrayBuffer using AES-GCM and the encrypted AES key
 */
export async function decryptFile(encryptedArrayBuffer, encryptedKeyBase64, ivBase64, myPrivateKey) {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const encryptedKey = Uint8Array.from(atob(encryptedKeyBase64), (c) => c.charCodeAt(0));

  const aesKeyData = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    myPrivateKey,
    encryptedKey
  );

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyData,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );

  return await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedArrayBuffer
  );
}
