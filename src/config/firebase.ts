import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Initialize Firebase Admin
let app;

try {
  // Use separated service account environment variables
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || !process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID) {
    console.warn('Firebase service account environment variables are not set.')
    console.warn('Firebase Admin SDK initialization skipped.')
  } else {
    // Construct service account object from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE || '',
      project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID || '',
      private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
      private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
      client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
      client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID || '',
      auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI || '',
      token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI || '',
      auth_provider_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || '',
      client_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL || '',
      universe_domain: process.env.FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || 'googleapis.com'
    } as ServiceAccount
    
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
