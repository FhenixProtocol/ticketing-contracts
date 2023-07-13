const express = require('express');
const fhevmjs = require('fhevmjs');
const ethers = require('ethers');
const _sodium = require('libsodium-wrappers');


const app = express();
const encryptionKey = 'Your 32-byte encryption key';
const challengeMap = {};
const nftSecretKey = 10;

let _instance;
let globalPk;
let globalSk;

const JSON_RPC = "https://fhenode.fhenix.io/new/evm";

const generateKey = async () => {
  await _sodium.ready;
  const sodium = _sodium;

  // Generate a new key pair
  const keypair = sodium.crypto_box_keypair();
  const privateKeyHex = toHexString(keypair.privateKey);
  const publicKeyHex = toHexString(keypair.publicKey);

  // Return the keys as hexadecimal strings
  return { privateKey: privateKeyHex, publicKey: publicKeyHex };
}

const getInstance = async () => {

  const provider = new ethers.JsonRpcProvider(JSON_RPC);

  // if you want to use a singleton pattern
  if (_instance) return _instance;

  // Get chain id
  const chainId = await provider.getNetwork()
  console.log(`what dis: ${chainId.chainId}`)

  // Get blockchain public key
  const publicKey = await provider.call({
    to: '0x0000000000000000000000000000000000000044'
  });

  // Create instance
  _instance = await fhevmjs.createInstance({ chainId, publicKey });
  return _instance;
};

// helper functions
const fromHexString = (hexString) => {
  const arr = hexString.replace(/^(0x)/, '').match(/.{1,2}/g);
  return new Uint8Array(arr ? arr.map((byte) => parseInt(byte, 16)) : []);
}

const toHexString = (byteArray) => {
  return Array.from(byteArray, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

app.get('/create', async function(req, res) {
  let challenge = Math.floor(Math.random() * Math.pow(2, 32));
  let instance = await getInstance();
  let cipherText = toHexString(await instance.encrypt32(challenge));
  console.log(`setting up challenge: ${challenge}`)
  challengeMap[challenge^nftSecretKey] = new Date().toISOString();
  console.log(`setting up response: ${challenge^nftSecretKey}`);
  res.status(200).send(cipherText);
});

app.get('/public_key', async function(req, res) {
  // let instance = await getInstance();
  res.status(200).send(globalPk)
});

app.get('/validate', async function(req, res) {
  let cipherText = req.query.response;

  let response;
  try {
    console.log(`ciphertext: ${cipherText}`);
    response = await decrypt(cipherText, globalSk);
    console.log(`response: ${response}`)

  } catch (err) {
    res.status(400).send("Invalid challenge");
    return;
  }

  let challengeTime = challengeMap[response];

  if (!challengeTime) {
    res.status(400).send("Challenge not found");
    return;
  }

  let currentTime = new Date();
  challengeTime = new Date(challengeTime);
  let difference = (currentTime - challengeTime) / 1000 / 60; // difference in minutes

  if (difference <= 5) {
    res.status(200).send("Valid challenge");
  } else {
    res.status(400).send("Challenge expired");
  }
});

app.listen(8080, async function () {
  console.log('Example app listening on port 8080!');

  const {publicKey, privateKey} = await generateKey();
  globalPk = "7bd51520fa677b420918ff991876681f561c38a05510606adaef413d9c23b80d";
  globalSk = "5893c0d183d2f863afbdc5c5c89bb582c7739addeb8b4996b0bdf5a9f7c3cbf7";

  console.log(`globalSk: ${globalSk}`)
  console.log(`globalPk: ${globalPk}`)

});

const decrypt = async (encryptedHex, secretKeyHex) => {
  await _sodium.ready;
  const sodium = _sodium;

  // Convert encrypted message and secret key from hex to bytes
  const encryptedBytes = fromHexString(encryptedHex);
  const secretKeyBytes = fromHexString(secretKeyHex);

  // Generate publicKey from secretKey
  const publicKeyBytes = sodium.crypto_scalarmult_base(secretKeyBytes);

  let plaintextBytes;
  try {
    plaintextBytes = sodium.crypto_box_seal_open(encryptedBytes, publicKeyBytes, secretKeyBytes);
  } catch (e) {
    // for example, if we want to return 0 as the default value
    console.error(e);
    return 0;
  }


  return bytesToInt(plaintextBytes);
}

function bytesToInt(bytes) {
  return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
}