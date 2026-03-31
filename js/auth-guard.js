import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

export function initAuthGuard(auth, redirectOnLoggedOut = "Authentication.html") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = redirectOnLoggedOut;
    } else {
      if (window.initPage) {
        window.initPage(user);
      }
    }
  });
}

export async function handleSignOut(auth) {
  try {
    await signOut(auth);
    window.location.href = "Authentication.html";
  } catch (error) {
    console.error("Error signing out:", error);
  }
}
