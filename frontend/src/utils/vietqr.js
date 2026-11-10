export function formatLocalYMD(dateObj = new Date()) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDisplayDate(ymdStr) {
  if (!ymdStr || !/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) return ymdStr || '';
  const [y, m, d] = ymdStr.split('-');
  return `${d}/${m}/${y}`;
}

export function getStoredToken() {
  return (
    localStorage.getItem('sportsbooking_token') ||
    sessionStorage.getItem('sportsbooking_token') ||
    ''
  );
}

const BANK_CODE_MAP = [
  { keywords: ['vietcombank', 'vcb'], code: 'VCB' },
  { keywords: ['techcombank', 'tcb'], code: 'TCB' },
  { keywords: ['mbbank', 'mb bank', 'quan doi', 'mb'], code: 'MB' },
  { keywords: ['bidv'], code: 'BIDV' },
  { keywords: ['vietinbank', 'vietin', 'ctg'], code: 'ICB' },
  { keywords: ['agribank', 'vba'], code: 'VBA' },
  { keywords: ['acb', 'a chau'], code: 'ACB' },
  { keywords: ['vpbank', 'vp bank'], code: 'VPB' },
  { keywords: ['tpbank', 'tp bank', 'tien phong'], code: 'TPB' },
  { keywords: ['sacombank', 'stb'], code: 'STB' },
  { keywords: ['hdbank', 'hd bank'], code: 'HDB' },
  { keywords: ['vib'], code: 'VIB' },
  { keywords: ['ocb', 'phuong dong'], code: 'OCB' },
  { keywords: ['msb', 'hang hai'], code: 'MSB' },
  { keywords: ['shb'], code: 'SHB' },
  { keywords: ['seabank'], code: 'SEAB' },
  { keywords: ['eximbank', 'eib'], code: 'EIB' },
  { keywords: ['ocb'], code: 'OCB' }
];

export function resolveBankCode(bankName) {
  if (!bankName) return '';
  const normalized = String(bankName).toLowerCase().trim();
  const match = BANK_CODE_MAP.find((entry) =>
    entry.keywords.some((kw) => normalized.includes(kw))
  );
  if (match) return match.code;
  return normalized.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export function buildVietQrUrl({ bankName, bankAccountNo, bankAccountName, amount, addInfo }) {
  const code = resolveBankCode(bankName);
  const accountNo = String(bankAccountNo || '').replace(/\s+/g, '');
  if (!code || !accountNo) return null;

  const params = new URLSearchParams();
  if (Number(amount) > 0) {
    params.set('amount', String(Math.round(Number(amount))));
  }
  if (addInfo) {
    params.set('addInfo', String(addInfo).slice(0, 50));
  }
  if (bankAccountName) {
    params.set('accountName', String(bankAccountName).trim());
  }

  return `https://img.vietqr.io/image/${encodeURIComponent(code)}-${encodeURIComponent(accountNo)}-compact2.png?${params.toString()}`;
}

