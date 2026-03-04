// Firebase initialization (ES module)
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// DOM: grab inputs and wire events
document.addEventListener('DOMContentLoaded', () => {
    const fullname = document.getElementById('fullname');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirm-password');
    const registerBtn = document.getElementById('registerBtn');
    const googleBtn = document.getElementById('googleRegisterBtn');
    const form = document.getElementById('registerForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                fullname: fullname?.value.trim() || '',
                email: email?.value.trim() || '',
                phone: phone?.value.trim() || '',
                password: password?.value || '',
                confirm: confirm?.value || ''
            };
            if (!data.fullname || !data.email || !data.phone || !data.password) {
                alert('❌ Please fill all fields');
                return;
            }
            if (data.password !== data.confirm) {
                alert('❌ Passwords do not match');
                return;
            }
            if (!/^\d+$/.test(data.phone)) {
                alert('❌ Phone number must contain only digits.');
                return;
            }

            // Disable button and show loading state
            registerBtn.disabled = true;
            const originalText = registerBtn.textContent;
            registerBtn.textContent = 'Creating account...';

            console.log('Register data', data);
            try {
                createUserWithEmailAndPassword(auth, data.email, data.password)
                    .then(async (userCredential) => {
                        // Signed up
                        const user = userCredential.user;
                        console.log('User registered:', user);

                        // Add a new document in collection "User"
                        await setDoc(doc(db, "User", user.uid), {
                            Fullname: data.fullname,
                            email: data.email,
                            phoneNo: data.phone,
                            role: "user",
                            isActive: true
                        });

                        alert('✅ Account created successfully!\nRedirecting to welcome page...');
                        setTimeout(() => {
                            window.location.href = 'welcome.html';
                        }, 1500);
                    })
                    .catch((error) => {
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        console.error('Error:', errorCode, errorMessage);

                        // Provide user-friendly error messages
                        let userMessage = '❌ Registration failed:\n';
                        if (errorCode === 'auth/email-already-in-use') {
                            userMessage += 'This email is already registered. Please log in or use another email.';
                        } else if (errorCode === 'auth/weak-password') {
                            userMessage += 'Password is too weak. Use at least 6 characters.';
                        } else if (errorCode === 'auth/invalid-email') {
                            userMessage += 'Invalid email address.';
                        } else {
                            userMessage += errorMessage;
                        }
                        alert(userMessage);

                        // Re-enable button
                        registerBtn.disabled = false;
                        registerBtn.textContent = originalText;
                    });
            } catch (err) {
                console.error(err);
                alert('❌ Registration error: ' + err.message);
                registerBtn.disabled = false;
                registerBtn.textContent = originalText;
            }
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider).then(async (result) => {
                const user = result.user;

                // Check if user exists in Firestore, if not, create them
                const userDocRef = doc(db, "User", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    console.log('New Google user, creating Firestore document...');
                    await setDoc(userDocRef, {
                        Fullname: user.displayName,
                        email: user.email,
                        phoneNo: user.phoneNumber || '', // Google may provide this
                        role: "user",
                        isActive: true
                    });
                    alert('✅ Account created with Google!');
                } else {
                    alert('✅ Welcome back!');
                }
                window.location.href = 'welcome.html';
            })
                .catch((error) => {
                    console.error('Error:', error.code, error.message);
                    alert('❌ Google Registration failed: ' + error.message);
                });
        });
    }
});
