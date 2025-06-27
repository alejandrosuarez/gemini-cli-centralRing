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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\n/g, '').trim(); // New variable
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
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ... (rest of your imports)

const CLERK_JWKS_URL = process.env.CLERK_JWKS_URL; // You MUST set this in Vercel env vars

// ... (rest of your code)

const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('DEBUG: Protect middleware received token:', token ? token.substring(0, 30) + '...' : 'No token');

  if (!token) {
    console.warn('DEBUG: Protect middleware - No authorization token provided.');
    return res.status(401).json({ error: 'No authorization token provided.' });
  }

  let user: User | null = null;
  let authError: any = null;

  // Try Supabase validation first
  try {
    const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAuth.auth.getUser(token);
    if (supabaseUser && supabaseUser.id) {
      user = supabaseUser;
      req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });
      console.log('DEBUG: Authenticated via Supabase. User ID:', user.id);
    } else {
      authError = supabaseError || new Error('Supabase user or user ID is undefined.');
      console.warn('DEBUG: Supabase validation failed:', authError?.message);
    }
  } catch (e: any) {
    authError = e;
    console.error('DEBUG: Supabase validation threw an error:', e);
  }

  // If Supabase validation failed, try Clerk validation
  if (!user && CLERK_JWKS_URL) {
    try {
      const client = jwksClient({
        jwksUri: CLERK_JWKS_URL,
      });

      const decodedToken: any = jwt.decode(token, { complete: true });
      if (!decodedToken || !decodedToken.header.kid) {
        throw new Error('Invalid token header or missing kid.');
      }

      const key = await client.getSigningKey(decodedToken.header.kid);
      const publicKey = key.getPublicKey();

      const verifiedToken: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

      // Assuming Clerk JWT has user ID in 'sub' claim
      if (verifiedToken.sub) {
        // Create a dummy Supabase user object for consistency
        user = { id: verifiedToken.sub, email: verifiedToken.email || 'clerk_user@example.com' } as User;
        req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: { Authorization: `Bearer ${token}` }, // Still pass the original token
          },
        });
        console.log('DEBUG: Authenticated via Clerk. User ID:', user.id);
      } else {
        throw new Error('Clerk token missing user ID (sub claim).');
      }
    } catch (e: any) {
      console.error('DEBUG: Clerk validation failed:', e.message);
      authError = e;
    }
  }

  if (!user) {
    console.error('DEBUG: Authentication failed for both Supabase and Clerk.');
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = user; // Attach user to request object
  console.log('DEBUG: Protect middleware - Final req.user.id:', req.user.id);
  next();
});

const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (user) {
      req.user = user;
      req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });
      console.log('DEBUG: Optional auth - Authenticated user ID from token:', user.id);
    } else if (error) {
      console.warn('DEBUG: Optional auth - Invalid or expired token, proceeding as unauthenticated.', error.message);
    }
  }
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
  console.log('DEBUG: Fetching entities for owner:', ownerId);
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

app.get('/entities/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Fetching entity ${id} (optional auth).`);

  const { data: entity, error: entityError } = await supabaseServiceRole
    .from('gemini_cli_entities')
    .select('*')
    .eq('id', id)
    .single();

  if (entityError) {
    console.error(`Error fetching entity ${id}:`, entityError);
    return res.status(500).json({ error: entityError.message });
  }

  if (!entity) {
    return res.status(404).json({ error: 'Entity not found.' });
  }

  // Fetch the associated EntityType
  const { data: entityType, error: entityTypeError } = await supabaseServiceRole
    .from('gemini_cli_entity_types')
    .select('*')
    .eq('id', entity.type_id) // Assuming type_id is the foreign key
    .single();

  if (entityTypeError) {
    console.error(`Error fetching entity type for ${entity.type_id}:`, entityTypeError);
    return res.status(500).json({ error: entityTypeError.message });
  }

  // Combine entity and entityType data
  const responseData = {
    ...entity,
    entityType: entityType // Add the full entity type object
  };

  res.status(200).json(responseData);
}));

app.post('/entities/:id/request-info', protect, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requestingUserId = req.user.id;
  const { message, attributeNames } = req.body; // Optional message and attributeNames array

  console.log(`User ${requestingUserId} requesting info for entity ${id}. Attributes: ${attributeNames ? attributeNames.join(', ') : 'None specified'}`);

  // Fetch the current entity to update its arrays
  const { data: entity, error: fetchError } = await supabaseServiceRole
    .from('gemini_cli_entities')
    .select('requested_by_users, interaction_log')
    .eq('id', id)
    .single();

  if (fetchError || !entity) {
    console.error(`Error fetching entity ${id} for request-info:`, fetchError);
    return res.status(404).json({ error: 'Entity not found or error fetching.' });
  }

  // Update requested_by_users
  let updatedRequestedByUsers = Array.isArray(entity.requested_by_users) ? entity.requested_by_users : [];
  if (!updatedRequestedByUsers.includes(requestingUserId)) {
    updatedRequestedByUsers.push(requestingUserId);
  }

  // Add to interaction_log
  let updatedInteractionLog = Array.isArray(entity.interaction_log) ? entity.interaction_log : [];
  updatedInteractionLog.push({
    timestamp: new Date().toISOString(),
    userId: requestingUserId,
    action: 'attribute_requested',
    details: {
      message: message || 'No specific message provided.',
      attributeNames: attributeNames || [],
    },
  });

  // Update the entity in Supabase
  const { data, error: updateError } = await supabaseServiceRole
    .from('gemini_cli_entities')
    .update({
      requested_by_users: updatedRequestedByUsers,
      interaction_log: updatedInteractionLog,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select();

  if (updateError) {
    console.error(`Error updating entity ${id} with request info:`, updateError);
    return res.status(500).json({ error: 'Failed to record request.' });
  }

  res.status(200).json({ message: 'Information request recorded successfully.', entity: data[0] });
}));

// Auth Endpoints
app.options('/auth/send-otp', cors()); // Preflight for send-otp
app.post('/auth/send-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 60 * 1000); // OTP valid for 1 minute (60 seconds)

  try {
    console.log(`DEBUG: Attempting to store OTP for ${email} in Supabase.`);
    // Store OTP in Supabase table
    const { error: insertError } = await supabaseServiceRole
      .from('otps')
      .upsert({ email, otp, expires_at: expiresAt.toISOString() }, { onConflict: 'email' });

    if (insertError) {
      console.error('DEBUG: Error storing OTP in Supabase:', insertError);
      return res.status(500).json({ error: 'Failed to store OTP.' });
    }
    console.log(`DEBUG: OTP for ${email} stored successfully. Attempting to send email via Resend.`);

    await resend.emails.send({
      from: resendEmailFrom, // Use the new environment variable here
      to: email,
      subject: 'Your OTP for Central Ring',
      html: `<p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p><p>This OTP is valid for 1 minute.</p>`,
    });
    console.log(`DEBUG: OTP email sent to ${email} successfully.`);
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

  // Retrieve OTP from Supabase table
  const { data: storedOtpData, error: fetchError } = await supabaseServiceRole
    .from('otps')
    .select('otp, expires_at')
    .eq('email', email)
    .single();

  if (fetchError || !storedOtpData) {
    console.error('Error fetching OTP from Supabase or OTP not found:', fetchError);
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }

  const storedOtp = storedOtpData.otp;
  const expiresAt = new Date(storedOtpData.expires_at);

  if (storedOtp !== token || expiresAt < new Date()) {
    // Optionally delete expired/invalid OTPs here
    await supabaseServiceRole.from('otps').delete().eq('email', email);
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }

  // OTP is valid, delete it from the table
  const { error: deleteError } = await supabaseServiceRole.from('otps').delete().eq('email', email);
  if (deleteError) {
    console.error('Error deleting OTP from Supabase:', deleteError);
    // Continue, as the main goal is verification
  }

  let userSession: Session | null = null;
  let user: User | null = null;

  try {
    const dummyPassword = 'a_strong_dummy_password_123'; // This should be consistent

    // Attempt to sign in with password
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password: dummyPassword,
    });

    if (signInData.session) {
      userSession = signInData.session;
      user = signInData.user;
    } else if (signInError && signInError.message.includes('Invalid login credentials')) {
      // User does not exist, try to sign up with a dummy password
      console.log('User not found via signInWithPassword, attempting to sign up.');
      const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
        email,
        password: dummyPassword,
      });
      if (signUpError) throw signUpError;
      userSession = signUpData.session;
      user = signUpData.user;
    } else if (signInError) {
      throw signInError;
    }

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
