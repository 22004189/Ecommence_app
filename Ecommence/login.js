// Firebase initialization (ES module)
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// DOM: grab inputs and wire events
document.addEventListener('DOMContentLoaded', () => {
    const email = document.getElementById('username');
    const password = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const googleBtn = document.getElementById('googleLoginBtn');
    const form = document.getElementById('loginForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userEmail = email?.value.trim() || '';
            const userPassword = password?.value || '';

            if (!userEmail || !userPassword) {
                alert('❌ Please enter email and password');
                return;
            }

            // Disable button and show loading state
            loginBtn.disabled = true;
            const originalText = loginBtn.textContent;
            loginBtn.textContent = 'Logging in...';

            console.log('Login attempt for:', userEmail);
            try {
                signInWithEmailAndPassword(auth, userEmail, userPassword)
                    .then(async (userCredential) => {
                        const user = userCredential.user;
                        console.log('User logged in:', user);
                        const userDocRef = doc(db, "User", user.uid);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            if (userData.role === 'admin') {
                                alert('✅ Admin Login successful!');
                                window.location.href = 'admin-dashboard.html';
                            } else {
                                alert('✅ Login successful!');
                                window.location.href = 'dashboard.html';
                            }
                        } else {
                            // Document doesn't exist, create it for the user.
                            console.warn("User document not found, creating one for:", user.uid);
                            await setDoc(userDocRef, {
                                Fullname: user.email, // Best default we have
                                email: user.email,
                                phoneNo: '',
                                role: "user",
                                isActive: true
                            });
                            alert('✅ Welcome! Your profile has been set up.');
                            window.location.href = 'dashboard.html';
                        }
                    })
                    .catch((error) => {
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        console.error('Error:', errorCode, errorMessage);

                        // Provide user-friendly error messages
                        let userMessage = '❌ Login failed. ';
                        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                            userMessage += 'Incorrect email or password.';
                        } else if (errorCode === 'auth/invalid-email') {
                            userMessage += 'Invalid email format.';
                        } else if (errorCode === 'auth/too-many-requests') {
                            userMessage += 'Too many failed login attempts. Try again later.';
                        } else {
                            userMessage += errorMessage;
                        }
                        alert(userMessage);

                        // Re-enable button
                        loginBtn.disabled = false;
                        loginBtn.textContent = originalText;
                    });
            } catch (err) {
                console.error(err);
                alert('❌ Login error: ' + err.message);
                loginBtn.disabled = false;
                loginBtn.textContent = originalText;
            }
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider).then(async (result) => {
                const user = result.user;
                console.log('Google User logged in:', user);
                const userDocRef = doc(db, "User", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    // User exists, check role and redirect
                    const userData = userDocSnap.data();
                    if (userData.role === 'admin') {
                        alert('✅ Admin Login successful!');
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        alert('✅ Welcome back!');
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // First-time Google login, create the user document
                    console.log('New Google user, creating Firestore document...');
                    await setDoc(userDocRef, {
                        Fullname: user.displayName || 'New User',
                        email: user.email,
                        phoneNo: user.phoneNumber || '',
                        role: "user",
                        isActive: true
                    });
                    alert('✅ Welcome! Your account has been created.');
                    window.location.href = 'dashboard.html';
                }
            })
                .catch((error) => {
                    console.error('Error:', error.code, error.message);
                    alert('❌ Google Login failed: ' + error.message);
                });
        });
    }
});
