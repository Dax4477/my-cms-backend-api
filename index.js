// index.js - This is your backend server code

// These lines import necessary libraries for your server.
const express = require('express'); // 'express' helps build web servers easily.
const cors = require('cors');       // 'cors' allows your frontend to talk to this backend.
const admin = require('firebase-admin'); // 'firebase-admin' allows this server to access your Firebase project.

// ------------------------------------------------------------------------------------------
// IMPORTANT SECURITY STEP: Retrieving Firebase Service Account Key details from Environment Variables.
// This is critical for security! You will set these values on Render later, NOT directly in this code.
// Never expose your raw service account key in public code (like on GitHub).
// ------------------------------------------------------------------------------------------
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  // The private key from Firebase JSON might have '\n' characters.
  // We replace them with actual newline characters here for Node.js to interpret correctly.
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Check if essential service account details are available.
// If they're not, the server won't start, preventing errors later.
if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  console.error("ERROR: Firebase service account environment variables are not properly set.");
  console.error("Please ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set.");
  process.exit(1); // Stop the application if credentials are missing
}

// Initialize Firebase Admin SDK with the service account credentials.
// This gives your backend server privileged access to your Firebase project,
// allowing it to read and write to Firestore as an administrator.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get a reference to your Firestore database.
const db = admin.firestore();

// IMPORTANT: This 'appId' variable MUST match the 'appId' string used in your frontend's Firestore paths.
// For local development, this is 'default-app-id'. For Canvas deployment, it would use __app_id.
const appId = 'default-app-id'; // <--- NEWLY DEFINED APPID FOR BACKEND FIRESTORE PATHS

const app = express(); // Create an Express application instance.
const port = process.env.PORT || 3000; // Define the port your server will listen on.
                                     // Use Render's assigned port (process.env.PORT) or 3000 locally.

// Enable Cross-Origin Resource Sharing (CORS) for all routes.
// This is necessary for your frontend (React app) to communicate with your backend,
// as they will likely be hosted on different web addresses.
app.use(cors());
// Enable Express to parse incoming JSON data from request bodies.
// This allows your server to understand the JSON sent from your React app.
app.use(express.json());

// ------------------------------------------------------------------------------------------
// API Endpoint: /api/upload-media
// This is the specific address your frontend will send requests to for media uploads.
// ------------------------------------------------------------------------------------------
app.post('/api/upload-media', async (req, res) => {
  try {
    // Extract data sent from the frontend in the request body.
    const { userId, type, videoLength } = req.body;

    // Basic validation: Check if user ID and media type are provided.
    if (!userId || !type) {
      // If not, send a 400 Bad Request error back to the frontend.
      return res.status(400).json({ error: 'User ID and media type are required.' });
    }

    // Prepare the new media object to be saved to Firestore.
    let newMedia = {
      userId,
      type,
      // Placeholder URL for the media.
      // In a real application, you would upload the actual image/video file to a storage service
      // (like Google Cloud Storage or AWS S3) and store the generated URL here.
      url: `https://placehold.co/400x300/cccccc/000000?text=${type}+${Date.now()}`,
      date: new Date().toLocaleDateString(), // Current date
      processed: false, // Flag to indicate if media has been processed (e.g., video resizing)
      processingStatus: 'queued' // Initial processing status
    };

    // Simulate video processing logic.
    if (type === 'video' && videoLength && videoLength !== 'none') {
      newMedia.processingStatus = `processing for ${videoLength}`;
      
      // Add the media item to Firestore immediately with a "processing" status.
      // The `add()` method generates a unique ID for the new document.
      // Uses the defined 'appId' variable here.
      const mediaCollectionRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('media');
      const mediaDocRef = await mediaCollectionRef.add(newMedia);
      
      console.log(`Video for user ${userId} queued for processing. Media ID: ${mediaDocRef.id}`);

      // Simulate a time-consuming video processing task (e.g., resizing, transcoding).
      // In a real app, this would involve calling external video processing services.
      setTimeout(async () => {
        // After the simulated processing, update the media item in Firestore.
        await mediaDocRef.update({ // Use `update` to change specific fields of an existing document.
            processed: true,
            processingStatus: 'complete',
            // In a real app, you would update the 'url' here to the processed video's URL
            // For now, we just mark it as complete.
        });
        console.log(`Video for user ${userId} (ID: ${mediaDocRef.id}) processed and updated in Firestore.`);
      }, 5000); // 5-second simulated delay for processing
    } else {
      // If it's an image or a video without specific length, save it directly as complete.
      // Uses the defined 'appId' variable here.
      const mediaCollectionRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('media');
      await mediaCollectionRef.add({
        ...newMedia,
        processed: true,
        processingStatus: 'complete'
      });
      console.log(`Media for user ${userId} saved to Firestore.`);
    }

    // Send a success response back to the client immediately.
    // The frontend doesn't need to wait for the simulated video processing to finish.
    res.status(200).json({ message: 'Media upload request received and being processed.' });

  } catch (error) {
    // If any error occurs during the process, log it and send a 500 Internal Server Error.
    console.error('Error handling media upload:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ------------------------------------------------------------------------------------------
// Root Endpoint: /
// A simple endpoint to check if the server is alive and responding.
// ------------------------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.send('OBS CMS Backend API is running!');
});

// ------------------------------------------------------------------------------------------
// Start the Server
// ------------------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
