import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Initialize Firebase Admin
let app;

try {
  // Parse the service account JSON from environment variable
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.')
    console.warn('Firebase Admin SDK initialization skipped.')
  } else {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    
    // Initialize the Firebase app
    app = initializeApp({
      credential: cert(serviceAccount)
    })
    
    console.log('Firebase Admin SDK initialized successfully')
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error)
  if (process.env.ENVIRONMENT === 'production') {
    // In production, we want to fail fast if Firebase can't initialize
    process.exit(1)
  }
}

// Export Firebase services
// These will be undefined if Firebase failed to initialize
export const db = app ? getFirestore(app) : undefined
export const auth = app ? getAuth(app) : undefined
export const storage = app ? getStorage(app) : undefined

export default app
