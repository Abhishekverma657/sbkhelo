// utils/adminConfig.js
import conn from "../config/db_conn.js"; // adjust path as per your project

// 🧠 In-memory cache
let adminCommissionCache = null;
let lastFetchedAt = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// 🔹 Fetch from DB and refresh cache
export async function refreshAdminCommission() {
    const [admin] = await conn.query("SELECT admin_comm FROM admin_pool WHERE id=1");
    adminCommissionCache = admin[0].admin_comm;
    lastFetchedAt = Date.now();
    console.log("🔄 Admin commission refreshed:", adminCommissionCache);
    return adminCommissionCache;
}

// 🔹 Get commission (with auto refresh)
export async function getAdminCommission() {
    const now = Date.now();

    if (!adminCommissionCache || now - lastFetchedAt > CACHE_DURATION) {
        await refreshAdminCommission();
    }

    return adminCommissionCache;
}

export function reSetCommission(){
    adminCommissionCache = null;
}

// 🔹 Force update when admin manually changes value (optional endpoint hook)
export function setAdminCommission(newValue) {
    adminCommissionCache = newValue;
    lastFetchedAt = Date.now();
    console.log("⚙️ Admin commission manually updated in cache:", newValue);
}
