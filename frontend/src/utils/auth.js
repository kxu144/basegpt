/**
 * Cookie utility functions for authentication
 */

/**
 * Set a cookie with expiration
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Number of days until expiration
 */
export function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
export function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 */
export function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

import { API_BASE } from "./api";

/**
 * Check if user is authenticated by calling backend
 * Since we use HTTP-only cookies, we can't read them client-side
 * @returns {Promise<boolean>} - True if authenticated
 */
export async function isAuthenticated() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include", // Send cookies
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Set authentication cookies (24 hour expiration)
 * Note: The backend sets the HTTP-only session_token cookie
 * We only set the email cookie for frontend display
 * @param {string} email - Email
 * @param {string} token - Session token (not used, kept for compatibility)
 */
export function setAuthCookies(email, token) {
  // Backend sets HTTP-only session_token cookie
  // We only set email for frontend display
  setCookie("email", email, 1);
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies() {
  deleteCookie("session_token");
  deleteCookie("session_expiry");
  deleteCookie("email");
}

/**
 * Get current email from cookie
 * @returns {string|null} - Email or null
 */
export function getEmail() {
  return getCookie("email");
}

