import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { Entity, EntityType, Attribute } from './types/entity';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // New variable
const resendApiKey = process.env.RESEND_API_KEY;
const resendEmailFrom = process.env.YOUR_RESEND_EMAIL_FROM; // New variable

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not set in .env file.');
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error('Supabase Service Role Key is not set in .env file.');
  process.exit(1);
}

if (!resendApiKey) {
  console.error('Resend API Key is not set in .env file.');
  process.exit(1);
}

if (!resendEmailFrom) {
  console.error('YOUR_RESEND_EMAIL_FROM is not set in .env file.');
  process.exit(1);
}

// Global Supabase client for auth operations (doesn't need user context)
const supabaseAuth: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
// Global Supabase client with service role key (bypasses RLS)
const supabaseServiceRole: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

const resend = new Resend(resendApiKey);

// Temporary in-memory OTP store (moved to global scope)
const otpStore: Record<string, { otp: string; expiresAt: Date }> = {};

app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Utility to wrap async route handlers for error handling
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Extend Request type to include supabase and user
declare global {
  namespace Express {
    interface Request {
      supabase: SupabaseClient; // This will be the request-specific client
      user: User;
    }
  }
}

// Middleware to protect routes and get user ID
const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided.' });
  }

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = user; // Attach user to request object
  // Create a new Supabase client for this request with the user's access token
  req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  console.log('DEBUG: Authenticated user ID from token:', user.id); // ADDED LOG
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.send('Central Ring API is running!');
});

// Basic in-memory storage for demonstration (will be replaced by Supabase later)
const entityTypes: EntityType[] = [
  {
    id: 'car',
    name: 'Car',
    description: 'Details about a car',
    predefinedAttributes: [
      { name: 'make', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'model', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'year', type: 'number', required: true, isUserDefined: false, notApplicable: false },
      { name: 'color', type: 'string', required: false, isUserDefined: false, notApplicable: false },
      { name: 'vin', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'mileage', type: 'number', required: false, isUserDefined: false, notApplicable: false },
      { name: 'transmission', type: 'string', required: false, isUserDefined: false, notApplicable: false }
    ]
  },
  {
    id: 'property',
    name: 'Property',
    description: 'Details about about a property (house, apartment, etc.)',
    predefinedAttributes: [
      { name: 'type', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'address', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'bedrooms', type: 'number', required: true, isUserDefined: false, notApplicable: false },
      { name: 'bathrooms', type: 'number', required: true, isUserDefined: false, notApplicable: false },
      { name: 'squareFootage', type: 'number', required: false, isUserDefined: false, notApplicable: false },
      { name: 'yearBuilt', type: 'number', required: false, isUserDefined: false, notApplicable: false },
      { name: 'lotSize', type: 'number', required: false, isUserDefined: false, notApplicable: false },
      { name: 'hasGarage', type: 'boolean', required: false, isUserDefined: false, notApplicable: false }
    ]
  },
  {
    id: 'book',
    name: 'Book',
    description: 'Details about a book',
    predefinedAttributes: [
      { name: 'title', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'author', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'isbn', type: 'string', required: false, isUserDefined: false, notApplicable: false },
      { name: 'publicationYear', type: 'number', required: false, isUserDefined: false, notApplicable: false },
      { name: 'genre', type: 'string', required: false, isUserDefined: false, notApplicable: false }
    ]
  },
  {
    id: 'software',
    name: 'Software',
    description: 'Details about a software application',
    predefinedAttributes: [
      { name: 'name', type: 'string', required: true, isUserDefined: false, notApplicable: false },
      { name: 'version', type: 'string', required: false, isUserDefined: false, notApplicable: false },
      { name: 'developer', type: 'string', required: false, isUserDefined: false, notApplicable: false },
      { name: 'licenseType', type: 'string', required: false, isUserDefined: false, notApplicable: false },
      { name: 'platform', type: 'string', required: false, isUserDefined: false, notApplicable: false }
    ]
  }
];
const entities: Entity[] = [];

// Routes for EntityType management
app.post('/entity-types', protect, asyncHandler(async (req: Request, res: Response) => {
  const newEntityType: EntityType = req.body;
  console.log('Received new entity type:', newEntityType.name);
  const { data, error } = await req.supabase
    .from('gemini_cli_entity_types')
    .insert([{
      id: newEntityType.id,
      name: newEntityType.name,
      description: newEntityType.description,
      predefined_attributes: newEntityType.predefinedAttributes
    }])
    .select();

  if (error) {
    console.error('Error inserting entity type:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
}));

app.get('/entity-types', asyncHandler(async (req: Request, res: Response) => {
  console.log('Fetching all entity types.');
  const { data, error } = await supabaseAuth
    .from('gemini_cli_entity_types')
    .select('id, name, description, predefined_attributes');

  if (error) {
    console.error('Error fetching entity types:', error);
    return res.status(500).json({ error: error.message });
  }

  // Transform snake_case to camelCase for frontend compatibility
  const transformedData = data.map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    predefinedAttributes: item.predefined_attributes,
  }));

  res.status(200).json(transformedData);
}));

// Routes for Entity management
app.post('/entities', protect, asyncHandler(async (req: Request, res: Response) => {
  const newEntity: Entity = req.body;
  const ownerId = req.user.id; // Get ownerId from authenticated user
  console.log('DEBUG: ownerId from authenticated user:', ownerId); // ADDED LOG
  console.log('DEBUG: ownerId being inserted:', ownerId); // NEW LOG
  console.log('Received new entity:', newEntity.name, 'for owner:', ownerId);

  // Ensure createdAt and updatedAt are Date objects before calling toISOString()
  const createdAt = new Date(newEntity.createdAt);
  const updatedAt = new Date(newEntity.updatedAt);

  // Use supabaseServiceRole to bypass RLS for testing
  const { data, error } = await supabaseServiceRole
    .from('gemini_cli_entities')
    .insert([{
      id: newEntity.id,
      type_id: newEntity.typeId,
      name: newEntity.name,
      attributes: newEntity.attributes,
      owner_id: ownerId,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      missing_info_attributes: newEntity.missingInfoAttributes,
      requested_by_users: newEntity.requestedByUsers
    }])
    .select();

  if (error) {
    console.error('Error inserting entity:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
}));

app.get('/entities', protect, asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user.id; // Get ownerId from authenticated user
  console.log('Fetching entities for owner:', ownerId);
  const { data, error } = await req.supabase
    .from('gemini_cli_entities')
    .select('*')
    .eq('owner_id', ownerId); // Filter by owner_id

  if (error) {
    console.error('Error fetching entities:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
}));

// Auth Endpoints
app.options('/auth/send-otp', cors()); // Preflight for send-otp
app.post('/auth/send-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
  otpStore[email] = { otp, expiresAt };

  try {
    await resend.emails.send({
      from: resendEmailFrom, // Use the new environment variable here
      to: email,
      subject: 'Your OTP for Central Ring',
      html: `<p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p><p>This OTP is valid for 5 minutes.</p>`,
    });
    return res.status(200).json({ message: 'OTP sent to email.' });
  } catch (error: any) {
    console.error('Error sending OTP via Resend:', error);
    return res.status(500).json({ error: 'Failed to send OTP email.' });
  }
}));

app.options('/auth/verify-otp', cors()); // Preflight for verify-otp
app.post('/auth/verify-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: 'Email and token are required.' });
  }

  const storedOtp = otpStore[email];

  if (!storedOtp || storedOtp.otp !== token || storedOtp.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }

  delete otpStore[email]; // OTP consumed

  let userSession: Session | null = null;
  let user: User | null = null;

  try {
    const { data: verifyOtpData, error: verifyOtpError } = await supabaseAuth.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyOtpError) throw verifyOtpError;
    userSession = verifyOtpData.session;
    user = verifyOtpData.user;

    if (!userSession || !user) {
      throw new Error('Failed to create user session after OTP verification.');
    }

    return res.status(200).json({ message: 'OTP verified. User session created.', session: userSession });
  } catch (error: any) {
    console.error('Error during Supabase authentication:', error.message);
    return res.status(500).json({ error: error.message });
  }
}));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
