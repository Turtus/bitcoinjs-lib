const bitcoin = require('..');
const axios = require('axios/index');

// outputs could be got from here https://api.vergecurrency.network/node/api/XVG/mainnet/address/DL5LtSf7wztH45VuYunL8oaQHtJbKLCHyw/txs/?unspent=true
const TEST_OUTPUT = 'abcda88bdb3968c5e444694ce3914cdec34f3afab73627bf201d34493d5e3aae';
const TEST_KEY = 'Q...';
const TEST_ADDRESS = 'D...';
const TEST_ADDRESS_TO = 'D9DkHCQUULXNCni4s9qcv34W4C447PdBme';


const NETWORK = {
  messagePrefix: '\x18VERGE Signed Message:\n',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x21,
  wif: 0x9e,
};

const PUSH_URL = 'https://api.vergecurrency.network/node/api/XVG/mainnet/tx/send';

async function main() {
  let time = Math.round(new Date().getTime() / 1000);

  let keyPair = bitcoin.ECPair.fromWIF(TEST_KEY, NETWORK);
  let address = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: NETWORK }).address;
  if (address !== TEST_ADDRESS) {
    throw new Error('not valid signing address ' + TEST_ADDRESS + ' != ' + address);
  }

  let txb = new bitcoin.TransactionBuilder(NETWORK);
  txb.setVersion(1);
  txb.addInput(TEST_OUTPUT, 0, 4294967294);
  txb.addOutput(TEST_ADDRESS_TO, 950000);
  txb.addOutput(TEST_ADDRESS, 93821000);
  txb.sign(0, keyPair, null, null, null, null, time);


  let hex = txb.build().toHex();

  time = time.toString(16);
  let tmp = '';
  for (let i = time.length - 2; i >= 0; i = i - 2) {
    tmp += time[i] + time[i + 1];
  }
  time = tmp;
  while (time.length < 8) {
    time = time + '0';
  }
  hex = '01000000' + time + hex.substr(8);
  console.log(hex);

  let res
  try {
    res = await axios.post(PUSH_URL, {'rawTx' : hex});
  } catch (e) {
    if (e.response.data) {
      if (typeof e.response.data.error !== 'undefined') {
        e.message = JSON.stringify(e.response.data.error)
      } else {
        e.message = JSON.stringify(e.response.data)
      }
    }
    throw e
  }
  console.log(res)
}

main()
