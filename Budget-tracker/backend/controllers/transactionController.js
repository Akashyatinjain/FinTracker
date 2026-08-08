import pool from "../config/db.js";
import { addTransaction, getTransactions, deleteTransaction, updateTransaction, deleteAllTransactions, deleteMultipleTransactions } from "../models/transactionModel.js";
import { checkBudgetsAndNotify } from "../utils/budgetNotifications.js";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

export const addTransactionController = async (req, res, next) => {
  try {
    const { merchant, amount, category_id, transaction_date, description, currency, type } = req.body;
    const userId = req.user?.id ?? req.user?.user_id;

    if (!merchant || !amount || !category_id || !transaction_date) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const newTransaction = await addTransaction(
      userId,
      merchant,
      amount,
      category_id,
      type || "expense",
      transaction_date,
      description,
      currency || "INR"
    );

    try {
      const title = `New transaction: ${merchant || description || "Transaction"}`;
      const message = `You spent ₹${Number(amount).toLocaleString("en-IN")} on ${merchant || description || "an item"}`;
      const notifRes = await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, priority, action_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
        [userId, title, message, 'transaction', 'low', '/transactions']
      );
      console.log("Inserted txn notification:", notifRes.rows[0]);
    } catch (notifErr) {
      console.warn("Failed to insert transaction notification:", notifErr?.message || notifErr);
    }

    try {
      await checkBudgetsAndNotify(userId, newTransaction);
      console.log("checkBudgetsAndNotify ran for user:", userId);
    } catch (budgetErr) {
      console.warn("Budget notification failed:", budgetErr?.message || budgetErr);
    }

    res.status(201).json(newTransaction);
  } catch (error) {
    next(error);
  }
};

export const getTransactionsController = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    const transactions = await getTransactions(userId);
    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
};

export const deleteTransactionController = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const transactionId = Number.isFinite(Number(rawId)) ? parseInt(rawId, 10) : null;
    if (!transactionId) {
      return res.status(400).json({ message: "Invalid transaction id" });
    }

    const userId = req.user?.id ?? req.user?.user_id ?? null;

    const deleted = await deleteTransaction(transactionId, userId);

    if (!deleted) {
      const existsRes = await pool.query(
        "SELECT user_id FROM transactions WHERE transaction_id = $1",
        [transactionId]
      );

      if (existsRes.rowCount === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      } else {
        return res.status(403).json({ message: "Not authorized to delete this transaction" });
      }
    }

    return res.status(200).json({ message: "Transaction deleted successfully", transaction: deleted });
  } catch (error) {
    next(error);
  }
};

export const deleteAllTransactionsController = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    if (!userId) {
      console.error("[DELETE_ALL_CONTROLLER] No userId in request", { user: req.user });
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("[DELETE_ALL_CONTROLLER] Deleting all transactions for userId:", userId);
    const deleted = await deleteAllTransactions(userId);
    console.log("[DELETE_ALL_CONTROLLER] Deleted transactions count:", deleted.length);
    return res.status(200).json({ message: "All transactions deleted successfully", count: deleted.length });
  } catch (error) {
    console.error("[DELETE_ALL_CONTROLLER] Error:", error.message, error.stack);
    next(error);
  }
};

export const deleteMultipleTransactionsController = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid transaction ids" });
    }
    const deleted = await deleteMultipleTransactions(ids, userId);
    return res.status(200).json({ message: `${deleted.length} transactions deleted successfully`, deleted });
  } catch (error) {
    next(error);
  }
};

// ======================= HELPER FUNCTIONS FOR FILE PARSING =======================

export function convertExcelSerialDate(serial) {
  if (typeof serial === "number" && serial > 35000 && serial < 60000) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split("T")[0];
  }
  return null;
}

export function normalizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];

  if (typeof dateStr === "number" || (!isNaN(Number(dateStr)) && Number(dateStr) > 35000 && Number(dateStr) < 60000)) {
    const excelConverted = convertExcelSerialDate(Number(dateStr));
    if (excelConverted) return excelConverted;
  }

  const str = String(dateStr).trim();
  if (!str) return new Date().toISOString().split("T")[0];

  // 1. Check DD-MMM-YYYY or DD/MMM/YYYY or DD MMM YYYY (e.g. 01-JUL-2026, 1 Jul 2026)
  const dMonthNameMatch = str.match(/^(\d{1,2})[\/\-\.\s]+([a-zA-Z]{3,9})[\/\-\.\s]+(\d{2,4})$/);
  if (dMonthNameMatch) {
    let day = parseInt(dMonthNameMatch[1], 10);
    let monthStr = dMonthNameMatch[2].toLowerCase();
    let year = parseInt(dMonthNameMatch[3], 10);
    if (year < 100) year += 2000;

    const monthMap = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      january: 1, february: 2, march: 3, april: 4, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };

    let month = monthMap[monthStr];
    if (month && day >= 1 && day <= 31) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // 2. Check DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // 3. Check YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    let month = parseInt(ymdMatch[2], 10);
    let day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // 4. Fallback to JS Date constructor
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

export function normalizeImportHeader(header) {
  return String(header || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isDateLike(value) {
  if (value === null || value === undefined) return false;
  if (value instanceof Date && !isNaN(value.getTime())) return true;
  const str = String(value).trim();
  return (
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str) ||
    /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(str) ||
    /^\d{1,2}[\/\-\.\s]+[a-zA-Z]{3,9}[\/\-\.\s]+\d{2,4}$/.test(str)
  );
}

export function parseImportNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;

  const str = String(value).trim();
  if (!str || str === "-") return null;

  const negative = /^\(.*\)$/.test(str) || /\bdr\b/i.test(str) || str.startsWith("-");
  const clean = str
    .replace(/,/g, "")
    .replace(/[()]/g, "")
    .replace(/\b(?:cr|dr)\b/gi, "")
    .replace(/[^0-9.\-]/g, "");

  if (!clean || clean === "-" || clean === ".") return null;
  const parsed = parseFloat(clean);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return Math.abs(negative ? -parsed : parsed);
}

export function looksLikeNumericCell(value) {
  if (typeof value === "number") return Number.isFinite(value);
  const str = String(value ?? "").trim();
  if (!str || str === "-") return false;
  const withoutCurrency = str.replace(/\b(?:rs|inr|usd|eur|gbp|cr|dr)\b/gi, "");
  const remainder = withoutCurrency.replace(/[$,.\s()\-+]/g, "");
  return /^\d+$/.test(remainder);
}

export function looksLikeBankStatementHeader(rowValues) {
  const normalized = rowValues.map(normalizeImportHeader).filter(Boolean);
  const joined = normalized.join(" ");
  const hasDate = normalized.some(h => ["transactiondate", "valuedate", "date", "txndate", "postingdate"].includes(h));
  const hasMoney = normalized.some(h => ["debit", "credit", "withdrawal", "deposit", "amount", "balance"].includes(h));
  const hasDesc = normalized.some(h => ["description", "narration", "particulars", "details", "remarks"].includes(h));
  return (hasDate && hasMoney) || (hasDate && hasDesc) || joined.includes("serialno transactiondate");
}

export function rowsFromWorksheet(worksheet) {
  const rawRows = [];
  worksheet.eachRow((row) => {
    rawRows.push(row.values.slice(1));
  });

  if (rawRows.length === 0) return [];

  const headerIndex = rawRows.findIndex(looksLikeBankStatementHeader);
  if (headerIndex === -1) {
    return rawRows.map(normalizeArrayRow).filter(Boolean);
  }

  const headers = rawRows[headerIndex].map(v => String(v || "").trim());
  const objectRows = [];
  const arrayRows = [];

  for (const rowValues of rawRows.slice(headerIndex + 1)) {
    const rowObj = {};
    rowValues.forEach((val, idx) => {
      if (headers[idx]) rowObj[headers[idx]] = val;
    });
    objectRows.push(rowObj);
    arrayRows.push(rowValues);
  }

  const parsedObjectRows = objectRows.map(normalizeRow).filter(Boolean);
  if (parsedObjectRows.length > 0) return parsedObjectRows;

  return arrayRows.map(normalizeArrayRow).filter(Boolean);
}

export function extractMerchantAndDescription(rawDesc) {
  if (!rawDesc) return { merchant: "Bank Transaction", description: "" };

  const str = String(rawDesc).trim();
  let merchant = "";

  if (str.toUpperCase().includes("UPI/")) {
    const parts = str.split("/");
    const vpaPart = parts.find(p => p.includes("@"));
    if (vpaPart) {
      const vpaIdx = parts.indexOf(vpaPart);
      if (vpaIdx < parts.length - 1 && parts[vpaIdx + 1] && parts[vpaIdx + 1].length >= 2 && !parts[vpaIdx + 1].match(/^UPI$/i)) {
        merchant = parts[vpaIdx + 1].trim();
      }
      if (!merchant) {
        const handle = vpaPart.split("@")[0].trim();
        if (handle.toLowerCase().includes("paytm")) merchant = "Paytm";
        else if (handle.toLowerCase().includes("gpay")) merchant = "Google Pay";
        else if (handle.toLowerCase().includes("phonepe")) merchant = "PhonePe";
        else if (handle.toLowerCase().includes("amazon")) merchant = "Amazon";
        else if (handle.toLowerCase().startsWith("q") && handle.length > 5) merchant = `UPI Merchant (${handle})`;
        else merchant = handle;
      }
    } else {
      const cleanParts = parts.filter(p => !p.match(/^UPI$/i) && !p.match(/^\d+$/) && !p.match(/^\d{2}:\d{2}:\d{2}$/) && p.length >= 2);
      if (cleanParts.length > 0) {
        merchant = cleanParts[cleanParts.length - 1].trim();
      }
    }
  }

  if (!merchant) {
    if (str.toLowerCase().includes("sms charges")) merchant = "SMS Charges";
    else if (str.toLowerCase().includes("atm withdrawal")) merchant = "ATM Cash Withdrawal";
    else if (str.toLowerCase().includes("interest")) merchant = "Bank Interest";
    else merchant = str.substring(0, 50).replace(/[\/\-\|\:\@]+/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!merchant || merchant.length < 2) merchant = "Bank Transaction";

  return {
    merchant: merchant.substring(0, 100),
    description: str.substring(0, 255)
  };
}

const CATEGORY_IDS = {
  FOOD: 1,
  SHOPPING: 2,
  TRANSPORT: 3,
  ENTERTAINMENT: 4,
  BILLS: 5,
  HEALTHCARE: 6,
  SALARY: 7,
  INVESTMENT: 8,
};

const CATEGORY_KEYWORDS = [
  {
    id: CATEGORY_IDS.FOOD,
    words: [
      "food", "dining", "restaurant", "restro", "cafe", "coffee", "tea", "chai", "snack",
      "swiggy", "zomato", "eatclub", "dominos", "pizza", "burger", "mcdonald", "kfc",
      "bakery", "sweet", "sweets", "kitchen", "hotel", "dhaba", "juice", "icecream"
    ],
  },
  {
    id: CATEGORY_IDS.SHOPPING,
    words: [
      "shop", "shopping", "store", "retail", "mart", "market", "mall", "bazaar", "kirana",
      "general store", "supermarket", "grocery", "dmart", "jiomart", "reliance", "smart bazaar",
      "amazon", "flipkart", "myntra", "meesho", "ajio", "nykaa", "snapdeal", "bigbasket",
      "fashion", "cloth", "clothes", "apparel", "footwear", "shoes", "bata", "zara",
      "electronics", "mobile", "stationery"
    ],
  },
  {
    id: CATEGORY_IDS.TRANSPORT,
    words: [
      "transport", "travel", "uber", "ola", "rapido", "cab", "taxi", "auto", "rickshaw",
      "metro", "railway", "train", "irctc", "bus", "flight", "airline", "fuel", "petrol",
      "diesel", "cng", "hpcl", "bpcl", "indianoil", "shell", "parking", "toll", "fastag"
    ],
  },
  {
    id: CATEGORY_IDS.ENTERTAINMENT,
    words: [
      "entertainment", "movie", "cinema", "pvr", "inox", "cinepolis", "bookmyshow", "bms",
      "netflix", "spotify", "prime video", "hotstar", "disney", "jiocinema", "zee5", "sonyliv",
      "youtube premium", "gaming", "game", "steam", "playstation", "xbox", "arcade", "event",
      "concert", "show", "club", "fun"
    ],
  },
  {
    id: CATEGORY_IDS.BILLS,
    words: [
      "bill", "utility", "electric", "electricity", "power", "water", "gas", "recharge",
      "mobile recharge", "postpaid", "prepaid", "broadband", "wifi", "internet", "airtel",
      "jio", "vodafone", "vi ", "bsnl", "tata play", "dth", "rent", "maintenance", "emi",
      "loan", "insurance", "sms charges", "bank charges", "charge", "fee"
    ],
  },
  {
    id: CATEGORY_IDS.HEALTHCARE,
    words: [
      "health", "healthcare", "pharmacy", "chemist", "medical", "medicine", "medplus",
      "apollo", "netmeds", "1mg", "pharmeasy", "doctor", "hospital", "clinic", "diagnostic",
      "lab", "pathology", "dental", "eye care"
    ],
  },
  {
    id: CATEGORY_IDS.SALARY,
    words: [
      "salary", "payroll", "wage", "wages", "income", "stipend", "bonus", "freelance",
      "cashback", "refund", "reversal", "interest credit", "credit interest"
    ],
  },
  {
    id: CATEGORY_IDS.INVESTMENT,
    words: [
      "investment", "invest", "stock", "stocks", "share", "mutual fund", "sip", "zerodha",
      "groww", "angel", "upstox", "coin", "crypto", "dividend", "nps", "pf", "epfo"
    ],
  },
];

export function inferCategoryFromText(merchant = "", description = "") {
  const combined = `${merchant} ${description}`
    .toLowerCase()
    .replace(/[\/_\-.@]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const scores = new Map();

  for (const group of CATEGORY_KEYWORDS) {
    let score = 0;
    for (const word of group.words) {
      if (combined.includes(word)) {
        score += word.length >= 6 ? 3 : 2;
      }
    }
    if (score > 0) scores.set(group.id, score);
  }

  if (scores.size > 0) {
    return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  const looksLikeUpiShopPayment =
    combined.includes("upi") ||
    combined.includes("paytmqr") ||
    combined.includes("bharatpe") ||
    combined.includes("phonepe") ||
    combined.includes("gpay") ||
    combined.includes("google pay") ||
    /\bq\d{5,}\b/.test(combined);

  if (looksLikeUpiShopPayment) return CATEGORY_IDS.SHOPPING;

  return CATEGORY_IDS.BILLS;
}

export function resolveCategoryId(catInput, merchant = "", description = "") {
  if (catInput !== undefined && catInput !== null && String(catInput).trim() !== "") {
    const num = parseInt(catInput, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) return num;
    const str = String(catInput).toLowerCase();
    const inferred = inferCategoryFromText(str, "");
    if (inferred) return inferred;
  }

  return inferCategoryFromText(merchant, description);
}

export function normalizeRow(row) {
  if (!row) return null;
  if (Array.isArray(row)) return normalizeArrayRow(row);
  if (typeof row !== "object") return null;

  const keys = Object.keys(row);
  const getVal = (...candidates) => {
    for (const c of candidates) {
      const target = c.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === target);
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
        const str = String(row[matchKey]).trim();
        if (str !== "" && str !== "-") return row[matchKey];
      }
    }
    return null;
  };

  const rawDate = getVal("transactiondate", "date", "txndate", "valuedate", "postingdate", "dt", "createdat");
  const rawDesc = getVal("description", "narration", "particulars", "memo", "details", "notes", "remarks") || "";
  const rawMerchant = getVal("merchant", "payee", "vendor", "store", "name", "counterparty", "title", "party") || "";
  const rawCategory = getVal("categoryid", "category", "cat", "tag");
  const rawCurrency = getVal("currency", "curr") || "INR";

  const debitRaw = getVal("debit", "debitamount", "dr", "withdrawal", "withdrawalamountinr", "outflow");
  const creditRaw = getVal("credit", "creditamount", "cr", "deposit", "depositamountinr", "inflow");
  const rawAmount = getVal("amount", "price", "cost", "total", "sum", "value", "amt", "rupees", "rs", "money");
  const rawType = getVal("type", "transactiontype", "kind", "direction", "drcr", "cr/dr");

  const debitVal = parseImportNumber(debitRaw);
  const creditVal = parseImportNumber(creditRaw);

  const descLower = String(rawDesc).toLowerCase();
  if (descLower.includes("opening balance") || descLower.includes("closing balance") || descLower.includes("total balance") || descLower.includes("brought forward")) {
    if (debitVal === null && creditVal === null) {
      return null;
    }
  }

  let amount = 0;
  let type = "expense";

  if (debitVal !== null && creditVal === null) {
    amount = debitVal;
    type = "expense";
  } else if (creditVal !== null && debitVal === null) {
    amount = creditVal;
    type = "income";
  } else if (debitVal !== null && creditVal !== null) {
    amount = debitVal;
    type = "expense";
  } else if (rawAmount !== null) {
    const parsed = parseImportNumber(rawAmount);
    if (parsed !== null) {
      amount = parsed;
      if (String(rawAmount).trim().startsWith("-") || /^\(.*\)$/.test(String(rawAmount).trim())) type = "expense";
    }
  }

  if (rawType) {
    const tStr = String(rawType).toLowerCase();
    if (tStr.includes("inc") || tStr.includes("cr") || tStr.includes("deposit") || tStr.includes("credit")) type = "income";
    else if (tStr.includes("exp") || tStr.includes("dr") || tStr.includes("withdrawal") || tStr.includes("debit")) type = "expense";
  }

  if (amount <= 0) return null;

  const { merchant: extractedMerchant, description: extractedDesc } = extractMerchantAndDescription(rawMerchant || rawDesc);
  const merchantName = rawMerchant ? String(rawMerchant).trim().substring(0, 100) : extractedMerchant;
  const category_id = resolveCategoryId(rawCategory, merchantName, String(rawDesc || extractedDesc));
  const transaction_date = normalizeDate(rawDate);

  return {
    merchant: merchantName || "Imported Item",
    amount,
    category_id,
    type,
    transaction_date,
    description: String(rawDesc || extractedDesc).trim().substring(0, 255),
    currency: String(rawCurrency).toUpperCase().substring(0, 5) || "INR",
  };
}

export function normalizeArrayRow(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const cells = arr.map(a => String(a ?? "").trim());
  const joinText = cells.join(" ");
  if (joinText.toLowerCase().includes("opening balance") || joinText.toLowerCase().includes("serial no")) {
    return null;
  }

  let dateVal = null;
  let textIndex = -1;
  let textVal = "";
  const numbers = [];

  for (let i = 0; i < cells.length; i++) {
    const str = cells[i];
    if (!str) continue;

    if (isDateLike(str)) {
      if (!dateVal) {
        dateVal = str;
      }
      continue;
    }

    const parsedNum = parseImportNumber(str);
    if (parsedNum !== null && looksLikeNumericCell(str)) {
      if (parsedNum >= 1995 && parsedNum <= 2035 && Number.isInteger(parsedNum)) continue;
      if (i < 2 && parsedNum < 500 && Number.isInteger(parsedNum)) continue;
      numbers.push({ index: i, val: parsedNum, raw: str, hasDecimal: /\.\d{1,2}/.test(str) });
      continue;
    }

    if (str !== "-" && str.length > 1 && !textVal && !str.match(/^\d+$/)) {
      textIndex = i;
      textVal = str;
    }
  }

  if (numbers.length === 0) return null;

  let amount = 0;
  let type = "expense";

  const explicitDebitCredit = numbers.find(n => {
    const prev = cells[n.index - 1] || "";
    const next = cells[n.index + 1] || "";
    return prev === "-" || next === "-";
  });

  if (explicitDebitCredit) {
    amount = explicitDebitCredit.val;
    const prev = cells[explicitDebitCredit.index - 1] || "";
    const next = cells[explicitDebitCredit.index + 1] || "";
    type = prev === "-" && next !== "-" ? "income" : "expense";
  } else if (textIndex !== -1) {
    const afterDescription = numbers.filter(n => n.index > textIndex);
    if (afterDescription.length >= 2) {
      const txnAmountObj = afterDescription[afterDescription.length - 2];
      amount = txnAmountObj.val;
    } else if (afterDescription.length === 1) {
      amount = afterDescription[0].val;
    }
  } else if (numbers.length >= 2) {
    const txnAmountObj = numbers[numbers.length - 2];
    amount = txnAmountObj.val;
  } else if (numbers.length === 1) {
    amount = numbers[0].val;
  }

  if (amount <= 0) return null;

  const { merchant: extractedMerchant, description: extractedDesc } = extractMerchantAndDescription(textVal);

  return {
    merchant: extractedMerchant,
    amount,
    category_id: resolveCategoryId("", extractedMerchant, textVal),
    type,
    transaction_date: normalizeDate(dateVal),
    description: extractedDesc || textVal || "Imported Transaction",
    currency: "INR"
  };
}

export function rawPdfTextExtractor(buffer) {
  try {
    const raw = buffer.toString("binary");
    const extracted = [];

    const parenMatches = raw.match(/\(([^()]{2,})\)/g);
    if (parenMatches && parenMatches.length > 0) {
      for (const m of parenMatches) {
        const cleaned = m.slice(1, -1).replace(/\\([()\\])/g, "$1").trim();
        if (cleaned.length > 1) {
          extracted.push(cleaned);
        }
      }
    }

    let fullText = extracted.join(" ");

    if (fullText.length < 50) {
      const latin1 = buffer.toString("latin1");
      const printableLines = latin1
        .replace(/[^\x20-\x7E\r\n\t]/g, " ")
        .split(/\r?\n/)
        .map(l => l.replace(/\s+/g, " ").trim())
        .filter(l => l.length > 5);
      fullText = printableLines.join("\n");
    }

    return fullText;
  } catch (err) {
    console.warn("rawPdfTextExtractor warning:", err.message);
    return "";
  }
}

export async function extractPdfText(buffer) {
  if (typeof pdfParseModule === "function") {
    const pdfData = await pdfParseModule(buffer);
    return pdfData?.text || "";
  }

  if (pdfParseModule?.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const result = await parser.getText({
        cellSeparator: " ",
        lineEnforce: true,
        pageJoiner: "\n"
      });
      return result?.text || "";
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Unsupported pdf-parse package API");
}

export async function parseContentWithGemini(textOrBase64, isImage = false, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") return null;

  try {
    const prompt = `You are a financial statement and receipt parser.
Extract all individual financial transactions from the provided document content.
Return ONLY a valid JSON array of objects without markdown formatting or code blocks.
Each object must have these exact fields:
- merchant: string (name of store, vendor, sender/receiver, or description)
- amount: positive number
- category_id: number from 1 to 8 (1: Food & Dining, 2: Shopping, 3: Transportation, 4: Entertainment, 5: Bills & Utilities, 6: Healthcare, 7: Salary, 8: Investment)
- type: string ("expense" or "income")
- transaction_date: string ("YYYY-MM-DD")
- description: string (extra context or blank)
- currency: string (e.g. "INR", "USD")`;

    const contents = [];
    if (isImage) {
      contents.push({
        role: "user",
        parts: [
          { inlineData: { mimeType, data: textOrBase64 } },
          { text: prompt }
        ]
      });
    } else {
      contents.push({
        role: "user",
        parts: [
          { text: `${prompt}\n\nDocument Text:\n${textOrBase64.substring(0, 20000)}` }
        ]
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
      console.warn("Gemini parse failed status:", response.status);
      return null;
    }

    const data = await response.json();
    let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    replyText = replyText.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(replyText);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeRow).filter(Boolean);
    }
  } catch (err) {
    console.warn("Gemini AI file parsing warning:", err.message);
  }
  return null;
}

export function parsePdfTextLines(text) {
  if (!text || text.trim().length === 0) return [];

  const lines = text.split(/\r?\n/);
  const rows = [];

  const dateRegex = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b)/i;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.length < 5) continue;

    const lower = line.toLowerCase();
    if (lower.includes("opening balance") || lower.includes("account statement") || lower.includes("page ") || lower.startsWith("account ") || lower.includes("serial no")) {
      continue;
    }

    const dateMatches = line.match(new RegExp(dateRegex, "gi"));
    if (!dateMatches || dateMatches.length === 0) continue;

    const txnDate = dateMatches[0];

    const numMatches = [...line.matchAll(/(?:\b|\s)([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]{2,}\.[0-9]{2})\b/g)];
    
    const validNums = [];
    for (const m of numMatches) {
      const valStr = m[1].replace(/,/g, "");
      const val = parseFloat(valStr);
      if (isNaN(val)) continue;

      if (m.index < 5 && val < 200 && Number.isInteger(val)) continue;
      if (val >= 1995 && val <= 2035 && Number.isInteger(val)) continue;
      if (val <= 31 && Number.isInteger(val)) continue;

      validNums.push({ str: m[1], val, index: m.index });
    }

    if (validNums.length === 0) continue;

    let amount = 0;
    let type = "expense";

    if (validNums.length === 1) {
      amount = validNums[0].val;
    } else {
      let txnNum = null;

      const creditMatch = line.match(/[\-\s]+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s+(?:[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
      if (creditMatch) {
        const creditAmt = parseFloat(creditMatch[1].replace(/,/g, ""));
        if (!isNaN(creditAmt) && creditAmt > 0) {
          amount = creditAmt;
          type = "income";
          txnNum = creditAmt;
        }
      }

      if (!txnNum) {
        const sorted = [...validNums].sort((a, b) => a.val - b.val);
        txnNum = sorted[0];
        amount = txnNum.val;

        const textBefore = line.substring(0, txnNum.index);
        const textAfter = line.substring(txnNum.index + txnNum.str.length);
        if (textBefore.trim().endsWith("-") || (textAfter.trim().startsWith("-") && line.toLowerCase().includes("cr")) || line.toLowerCase().includes("credit")) {
          type = "income";
        } else {
          type = "expense";
        }
      }
    }

    if (amount <= 0) continue;

    let desc = line;
    desc = desc.replace(/^\d+\s+/, "");
    dateMatches.forEach(d => { desc = desc.replace(d, ""); });
    validNums.forEach(n => { desc = desc.replace(n.str, ""); });
    desc = desc.replace(/[\-\|\,\:\@\.]+/g, " ").replace(/\s+/g, " ").trim();

    const { merchant, description } = extractMerchantAndDescription(desc || line);

    rows.push({
      merchant,
      amount,
      type,
      transaction_date: normalizeDate(txnDate),
      description,
      category_id: resolveCategoryId("", merchant, description),
      currency: "INR"
    });
  }

  return rows;
}

export function parsePdfTextStream(text) {
  if (!text || text.trim().length === 0) return [];

  const lineRows = parsePdfTextLines(text);
  if (lineRows.length > 0) {
    return lineRows;
  }

  const lines = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  const rows = [];

  let pending = null;

  const pushPending = () => {
    if (!pending || !pending.date || pending.amounts.length === 0) return;

    const valid = pending.amounts.filter(val => !(val >= 1995 && val <= 2035 && Number.isInteger(val)));
    if (valid.length === 0) return;

    let amount = 0;
    if ((pending.dashBeforeAmount || pending.dashAfterAmount) && valid.length >= 1) {
      amount = valid[0];
    } else if (valid.length === 1) {
      amount = valid[0];
    } else {
      const sorted = [...valid].sort((a, b) => a - b);
      amount = sorted[0];
    }

    if (amount <= 0) return;

    let rawText = pending.desc.join(" ").trim();
    let type = pending.isCredit || pending.dashBeforeAmount ? "income" : "expense";
    const { merchant, description } = extractMerchantAndDescription(rawText);

    rows.push({
      merchant,
      amount,
      type,
      transaction_date: normalizeDate(pending.date),
      description,
      category_id: resolveCategoryId("", merchant, description),
      currency: "INR"
    });
  };

  const datePattern = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.toLowerCase().includes("opening balance")) {
      pending = null;
      continue;
    }

    if (line.toLowerCase().includes("account statement") || line.toLowerCase().includes("page ")) {
      continue;
    }

    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      if (pending && pending.amounts.length > 0) {
        pushPending();
        pending = null;
      }
      if (!pending) {
        pending = { date: dateMatch[0], desc: [], amounts: [], isCredit: false, dashBeforeAmount: false, dashAfterAmount: false };
      } else if (!pending.date) {
        pending.date = dateMatch[0];
      }
      continue;
    }

    if (!pending) continue;

    if (line === "-" || line.toLowerCase() === "cr" || line.toLowerCase().includes("credit")) {
      if (line === "-") {
        if (pending.amounts.length === 0) pending.dashBeforeAmount = true;
        else pending.dashAfterAmount = true;
      }
      if (line.toLowerCase() === "cr" || line.toLowerCase().includes("credit")) {
        pending.isCredit = true;
      }
      continue;
    }

    const cleanNum = line.replace(/,/g, "");
    const parsedNum = parseFloat(cleanNum);
    if (!isNaN(parsedNum) && looksLikeNumericCell(line)) {
      const nextLine = lines[i + 1] || "";
      if (pending.amounts.length > 0 && Number.isInteger(parsedNum) && parsedNum < 500 && datePattern.test(nextLine)) {
        continue;
      }
      pending.amounts.push(parsedNum);
      continue;
    }

    if (line.length > 1) {
      pending.desc.push(line);
    }
  }

  pushPending();

  return rows;
}

export function parseBalanceFirstBankStatementPDF(pdfText) {
  if (!pdfText || pdfText.trim().length === 0) return [];

  const rawLines = pdfText.split(/\r?\n/).map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const rowStartRegex = /^[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}\s+\d+\s+\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/;
  const skipRegex = /^(?:account statement|account name|account number|account type|customer address|branch name|ifsc code|micr code|branch address|account details|serial|no|transaction|date|value|description|number|debit credit balance|this is a computer-generated|maintained in the bank|page \d+ of|note:)/i;
  const rows = [];
  let currentLine = "";

  const flushCurrent = () => {
    if (currentLine) rows.push(currentLine.trim());
    currentLine = "";
  };

  for (const line of rawLines) {
    if (rowStartRegex.test(line)) {
      flushCurrent();
      currentLine = line;
      continue;
    }

    if (skipRegex.test(line)) {
      flushCurrent();
      continue;
    }

    if (currentLine) {
      currentLine += " " + line;
    }
  }
  flushCurrent();

  const parsedRows = [];

  for (const line of rows) {
    const match = line.match(/^([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\s+(\d+)\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})(?:\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}))?\s+(.+)$/);
    if (!match) continue;

    const balanceVal = parseImportNumber(match[1]);
    const txnDate = match[3];
    const rest = match[5].trim();
    const lower = rest.toLowerCase();

    if (lower.includes("opening balance") || lower.includes("closing balance") || lower.includes("brought forward")) {
      continue;
    }

    const amountMatch = rest.match(/^(.*?)\s+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s+-\s*$/);
    const creditMatch = rest.match(/^(.*?)\s+-\s+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*$/);

    let amount = 0;
    let type = "expense";
    let descRaw = "";

    if (creditMatch) {
      descRaw = creditMatch[1];
      amount = parseImportNumber(creditMatch[2]) || 0;
      type = "income";
    } else if (amountMatch) {
      descRaw = amountMatch[1];
      amount = parseImportNumber(amountMatch[2]) || 0;
      type = "expense";
    }

    if (amount <= 0 || amount === balanceVal) continue;

    descRaw = descRaw.replace(/\bU\s+PI\b/gi, "UPI").replace(/-\s+/g, "-").replace(/\s+/g, " ").trim();
    const { merchant, description } = extractMerchantAndDescription(descRaw);

    parsedRows.push({
      merchant,
      amount,
      type,
      transaction_date: normalizeDate(txnDate),
      description,
      category_id: resolveCategoryId("", merchant, description),
      currency: "INR"
    });
  }

  return parsedRows;
}

export function parseBankStatementPDF(pdfText) {
  if (!pdfText || pdfText.trim().length === 0) return [];

  const balanceFirstRows = parseBalanceFirstBankStatementPDF(pdfText);
  if (balanceFirstRows.length > 0) {
    return balanceFirstRows;
  }

  const rawLines = pdfText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const lines = [];
  let currentLine = "";

  for (const line of rawLines) {
    const isNewRow = /^(?:\d+\s+)?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line);
    if (isNewRow) {
      if (currentLine) lines.push(currentLine);
      currentLine = line;
    } else {
      if (currentLine) {
        currentLine += " " + line;
      } else {
        lines.push(line);
      }
    }
  }
  if (currentLine) lines.push(currentLine);

  const rows = [];
  let runningBalance = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("account statement") || lower.includes("page ") || lower.includes("serial no") || lower.includes("transaction date")) {
      continue;
    }

    if (lower.includes("opening balance") || lower.includes("brought forward") || lower.includes("b/f")) {
      const balMatch = line.match(/([0-9,]+\.[0-9]{2})/);
      if (balMatch) {
        runningBalance = parseFloat(balMatch[1].replace(/,/g, ""));
      }
      continue;
    }

    const rowMatch = line.match(/^(?:(\d+)\s+)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})(?:\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}))?\s+(.+)$/);
    if (!rowMatch) continue;

    const txnDate = rowMatch[2];
    const rest = rowMatch[4];

    const threeTokenMatch = rest.match(/(.*?)\s+([0-9,]+(?:\.[0-9]{2})?|-)\s+([0-9,]+(?:\.[0-9]{2})?|-)\s+([0-9,]+\.[0-9]{2})$/);
    
    if (threeTokenMatch) {
      const descRaw = threeTokenMatch[1];
      const debitStr = threeTokenMatch[2];
      const creditStr = threeTokenMatch[3];
      const balStr = threeTokenMatch[4];

      const debitVal = (debitStr !== "-" && debitStr !== "") ? parseFloat(debitStr.replace(/,/g, "")) : null;
      const creditVal = (creditStr !== "-" && creditStr !== "") ? parseFloat(creditStr.replace(/,/g, "")) : null;
      const balanceVal = parseFloat(balStr.replace(/,/g, ""));

      let amount = 0;
      let type = "expense";

      if (debitVal !== null && !isNaN(debitVal) && debitVal > 0) {
        amount = debitVal;
        type = "expense";
      } else if (creditVal !== null && !isNaN(creditVal) && creditVal > 0) {
        amount = creditVal;
        type = "income";
      } else if (runningBalance !== null && !isNaN(balanceVal)) {
        const diff = Math.round(Math.abs(balanceVal - runningBalance) * 100) / 100;
        if (diff > 0) {
          amount = diff;
          type = balanceVal > runningBalance ? "income" : "expense";
        }
      }

      if (!isNaN(balanceVal)) {
        runningBalance = balanceVal;
      }

      if (amount > 0) {
        const { merchant, description } = extractMerchantAndDescription(descRaw);
        rows.push({
          merchant,
          amount,
          type,
          transaction_date: normalizeDate(txnDate),
          description,
          category_id: resolveCategoryId("", merchant, description),
          currency: "INR"
        });
        continue;
      }
    }

    const twoTokenMatch = rest.match(/(.*?)\s+([0-9,]+\.[0-9]{2})\s+([0-9,]+\.[0-9]{2})$/);
    if (twoTokenMatch) {
      const descRaw = twoTokenMatch[1];
      const amtStr = twoTokenMatch[2];
      const balStr = twoTokenMatch[3];

      const parsedAmt = parseFloat(amtStr.replace(/,/g, ""));
      const parsedBal = parseFloat(balStr.replace(/,/g, ""));

      let amount = parsedAmt;
      let type = "expense";

      if (rest.toLowerCase().includes("cr") || rest.toLowerCase().includes("credit") || rest.toLowerCase().includes("deposit")) {
        type = "income";
      } else if (runningBalance !== null && !isNaN(parsedBal)) {
        if (parsedBal > runningBalance) type = "income";
        else type = "expense";
      }

      if (!isNaN(parsedBal)) runningBalance = parsedBal;

      if (amount > 0) {
        const { merchant, description } = extractMerchantAndDescription(descRaw);
        rows.push({
          merchant,
          amount,
          type,
          transaction_date: normalizeDate(txnDate),
          description,
          category_id: resolveCategoryId("", merchant, description),
          currency: "INR"
        });
        continue;
      }
    }
  }

  return rows;
}

// ======================= CONTROLLER IMPLEMENTATION =======================

export const importTransactionsController = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id ?? null;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    let parsedRows = [];

    // 1. Check if JSON rows array was provided directly in request body
    if (req.body && req.body.rows && Array.isArray(req.body.rows) && req.body.rows.length > 0) {
      parsedRows = req.body.rows.map(normalizeRow).filter(Boolean);
    } 
    // 2. Check if a file binary was uploaded via multipart/form-data
    else if (req.file) {
      const file = req.file;
      const mime = (file.mimetype || "").toLowerCase();
      const filename = (file.originalname || "").toLowerCase();
      console.log(`[IMPORT] Processing file upload for user=${userId}: filename="${filename}", mime="${mime}", size=${file.size} bytes`);

      // A) PDF Document Statement
      if (mime.includes("pdf") || filename.endsWith(".pdf")) {
        let pdfText = "";
        try {
          pdfText = await extractPdfText(file.buffer);
          console.log(`[IMPORT] pdfParse extracted ${pdfText.length} characters of text.`);
        } catch (pdfErr) {
          console.warn("[IMPORT] pdfParse failed, falling back to rawPdfTextExtractor:", pdfErr?.message || pdfErr);
          pdfText = rawPdfTextExtractor(file.buffer);
          console.log(`[IMPORT] rawPdfTextExtractor extracted ${pdfText.length} characters.`);
        }

        // Try Gemini AI parsing first if configured
        const aiParsed = await parseContentWithGemini(pdfText, false);
        if (aiParsed && aiParsed.length > 0) {
          console.log(`[IMPORT] Gemini AI parsed ${aiParsed.length} transactions from PDF.`);
          parsedRows = aiParsed;
        } else {
          // Dedicated Indian Bank Statement Parser (Bank of Baroda, SBI, HDFC, ICICI, etc.)
          parsedRows = parseBankStatementPDF(pdfText);
          if (parsedRows.length === 0) {
            parsedRows = parsePdfTextStream(pdfText);
          }
          console.log(`[IMPORT] Bank Statement PDF parser extracted ${parsedRows.length} transactions.`);
        }
      }
      // B) Excel Spreadsheet (.xlsx, .xls)
      else if (mime.includes("sheet") || mime.includes("excel") || filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(file.buffer);
          const worksheet = workbook.worksheets[0];
          if (worksheet) {
            parsedRows = rowsFromWorksheet(worksheet);
          }
        } catch (excelErr) {
          console.error("Excel Parsing error:", excelErr);
          return res.status(400).json({ message: "Failed to parse Excel file." });
        }
      }
      // C) Image Receipt / Screenshot (PNG, JPG, WEBP)
      else if (mime.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(filename)) {
        try {
          const base64Img = file.buffer.toString("base64");
          const aiParsed = await parseContentWithGemini(base64Img, true, file.mimetype);
          if (aiParsed && aiParsed.length > 0) {
            parsedRows = aiParsed;
          } else {
            return res.status(400).json({
              message: "Failed to parse receipt image. Please ensure GEMINI_API_KEY is added to backend .env for Image OCR parsing."
            });
          }
        } catch (imgErr) {
          console.error("Image Parsing error:", imgErr);
          return res.status(400).json({ message: "Failed to process image file." });
        }
      }
      // D) CSV, Text, or JSON File
      else {
        const textContent = file.buffer.toString("utf-8");

        if (textContent.trim().startsWith("[") || textContent.trim().startsWith("{")) {
          try {
            const jsonParsed = JSON.parse(textContent);
            const items = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
            parsedRows = items.map(normalizeRow).filter(Boolean);
          } catch {
            // Fall back to CSV parsing
          }
        }

        if (parsedRows.length === 0) {
          const result = Papa.parse(textContent, { header: true, skipEmptyLines: true });
          if (result.data && result.data.length > 0) {
            parsedRows = result.data.map(normalizeRow).filter(Boolean);
          }
          if (parsedRows.length === 0) {
            // Try headerless CSV parse
            const rawResult = Papa.parse(textContent, { header: false, skipEmptyLines: true });
            if (rawResult.data && rawResult.data.length > 0) {
              parsedRows = rawResult.data.map(normalizeArrayRow).filter(Boolean);
            }
          }
        }
      }
    }

    console.log(`[IMPORT] Final extracted valid rows count: ${parsedRows.length}`);

    if (!parsedRows || parsedRows.length === 0) {
      return res.status(400).json({
        message: "Could not extract valid transactions from this file. Please make sure the file contains transaction rows with dates and amounts."
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertSql = `INSERT INTO transactions 
        (user_id, category_id, type, amount, currency, description, merchant, transaction_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`;

      let inserted = 0;
      const insertedTxns = [];

      for (const row of parsedRows) {
        const resInsert = await client.query(insertSql, [
          userId,
          row.category_id || 5,
          row.type || "expense",
          row.amount || 0,
          row.currency || "INR",
          row.description || null,
          row.merchant || "Imported Item",
          row.transaction_date || new Date().toISOString().split("T")[0],
        ]);
        if (resInsert.rows[0]) {
          insertedTxns.push(resInsert.rows[0]);
          inserted++;
        }
      }

      await client.query("COMMIT");

      try {
        const title = `Imported ${inserted} Transactions`;
        const message = `Successfully imported ${inserted} transaction(s) directly into your budget.`;
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, priority, action_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [userId, title, message, 'transaction', 'low', '/transactions']
        );
      } catch (notifErr) {
        console.warn("Failed to insert import notification:", notifErr?.message || notifErr);
      }

      if (insertedTxns.length > 0) {
        for (const txn of insertedTxns.slice(0, 5)) {
          try {
            await checkBudgetsAndNotify(userId, txn);
          } catch (bErr) {
            console.warn("Budget check failed for imported txn:", bErr?.message);
          }
        }
      }

      return res.status(200).json({
        message: `Successfully imported ${inserted} transaction(s)!`,
        inserted,
        transactions: insertedTxns
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    next(error);
  }
};

export const updateTransactionController = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const transactionId = Number.isFinite(Number(rawId)) ? parseInt(rawId, 10) : null;
    if (!transactionId) return res.status(400).json({ message: "Invalid transaction id" });

    const allowed = ["merchant","category_id","type","amount","currency","transaction_date","description"];
    const payload = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) payload[k] = req.body[k];
    }
    if (Object.keys(payload).length === 0) return res.status(400).json({ message: "No valid fields provided to update" });

    const userId = req.user?.id ?? req.user?.user_id ?? null;

    console.info(`[UPDATE handler] called for id=${transactionId} by user=${userId} payload=`, payload);

    const updated = await updateTransaction(transactionId, payload, userId);

    if (!updated) {
      const existsRes = await pool.query("SELECT user_id FROM transactions WHERE transaction_id = $1", [transactionId]);
      if (existsRes.rowCount === 0) {
        console.warn(`[UPDATE] transaction not found: ${transactionId}`);
        return res.status(404).json({ message: "Transaction not found" });
      } else {
        console.warn(`[UPDATE] not authorized: user=${userId} on transaction=${transactionId}`);
        return res.status(403).json({ message: "Not authorized to update this transaction" });
      }
    }

    console.info(`[UPDATE] success transactionId=${transactionId}`);
    return res.status(200).json({ message: "Transaction updated successfully", transaction: updated });
  } catch (error) {
    next(error);
  }
};
