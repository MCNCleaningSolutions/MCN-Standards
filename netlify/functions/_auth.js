const crypto=require('crypto');
const key=()=>process.env.SESSION_SECRET;
function valid(event){if(!key())return false;const cookie=(event.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('angorfa_session='));if(!cookie)return false;const parts=decodeURIComponent(cookie.split('=')[1]).split('.');if(parts.length!==2)return false;const [payload,sig]=parts;const expected=crypto.createHmac('sha256',key()).update(payload).digest('hex');if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;const expiry=Number(Buffer.from(payload,'base64url').toString());return Number.isFinite(expiry)&&expiry>Date.now()}
function session(){const expiry=Buffer.from(String(Date.now()+8*60*60*1000)).toString('base64url');return `${expiry}.${crypto.createHmac('sha256',key()).update(expiry).digest('hex')}`}
module.exports={valid,session};
